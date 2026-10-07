import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type {
  AssignmentStyle,
  ContextSource,
  Difficulty,
  EducationLevel,
  GameFormat,
  GenerationParams,
  Material,
  MaterialType,
  StyleOption,
  SummaryAudience,
  SummaryStyle,
  WorkFormat,
} from '@/types'
import { cx, GRADES_BY_INSTITUTION, SUBJECTS } from '@/lib/utils'
import { buildMaterial, type GenProgress } from '@/lib/generator'
import {
  generateAssignment,
  generateCourse,
  generateFlashcards,
  generateGame,
  generateKsp,
  generateLesson,
  generateQuiz,
  generateSummary,
  suggestAssignmentStyles,
  suggestGameStyles,
  suggestSummaryStyles,
} from '@/lib/ai'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { SourcePicker } from '@/components/SourcePicker'
import { MaterialRenderer } from '@/components/MaterialRenderer'
import { TypeIconChip } from '@/components/TypeIcon'
import { Badge, Button, Field, Spinner } from '@/components/ui'
import { IconArrowLeft, IconArrowRight, IconCheck, IconSpark } from '@/components/Icon'

const MODULES: MaterialType[] = ['flashcards', 'quiz', 'assignment', 'game', 'lesson', 'ksp', 'course', 'summary']
const AVAILABLE: MaterialType[] = ['flashcards', 'quiz', 'assignment', 'summary', 'game', 'lesson', 'ksp', 'course']
const INSTITUTIONS: EducationLevel[] = ['school', 'college', 'university']
/** Языки для примеров и практики курса («без кода» — пустая строка). */
const CODE_LANGUAGES = ['Python', 'JavaScript', 'HTML/CSS', 'SQL', 'Java', 'C++', 'C#', 'Pascal']
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const WORK_FORMATS: WorkFormat[] = ['individual', 'pair', 'group']
const AUDIENCES: SummaryAudience[] = ['schooler', 'student', 'teacher', 'self']
/** Тест: минимум 10 вопросов. */
const MIN_QUIZ = 10
const DEFAULT_COUNT: Record<string, number> = { quiz: 12, assignment: 6, summary: 8, game: 6, lesson: 45, ksp: 45, course: 8 }
/** Модули с выбором стиля от ИИ (двухфазная генерация). */
const TWO_PHASE: MaterialType[] = ['assignment', 'summary', 'game']

/**
 * Длительность урока/занятия по казахстанской практике: школьный урок —
 * 45 мин (35 мин для 1 класса), «пара» в колледже/вузе — 90 мин (2×45 с
 * перерывом). Пользователь может скорректировать вручную.
 */
const LESSON_DURATION_DEFAULT: Record<EducationLevel, number> = {
  school: 45,
  college: 90,
  university: 90,
}
function defaultLessonMinutes(institution: EducationLevel, grade: string): number {
  if (institution === 'school' && grade === '1 класс') return 35
  return LESSON_DURATION_DEFAULT[institution]
}
const LESSON_DURATION_RANGE: Record<EducationLevel, { min: number; max: number; step: number }> = {
  school: { min: 30, max: 90, step: 5 },
  college: { min: 45, max: 180, step: 15 },
  university: { min: 45, max: 180, step: 15 },
}

export function Generate() {
  const navigate = useNavigate()
  const { addDraft, publish } = useStore()
  const { session } = useAuth()
  const { t, tType, tLang, tInst, tSubject, tGrade, lang } = useI18n()

  const [step, setStep] = useState(0)
  const [sources, setSources] = useState<ContextSource[]>([])
  const [params, setParams] = useState<GenerationParams>({
    topic: '',
    type: 'flashcards',
    // Для флешкарт эти поля пользователю не показываем — держим нейтральными.
    subject: '',
    institution: 'school',
    grade: '',
    difficulty: 'medium',
    language: lang,
    count: 8,
    cardStyle: 'term',
    format: 'individual',
    audience: 'student',
    notes: '',
  })

  // Язык генерации всегда совпадает с языком интерфейса (переключатель ҚАЗ/РУС).
  useEffect(() => {
    setParams((p) => ({ ...p, language: lang }))
  }, [lang])

  const minCount = params.type === 'quiz' ? MIN_QUIZ : params.type === 'course' ? 5 : 3

  /* ---- Двухфазные модули (задание, конспект): подбор стиля от ИИ ---- */
  const [stylePhase, setStylePhase] = useState<'params' | 'styles'>('params')
  const [styleOptions, setStyleOptions] = useState<StyleOption[] | null>(null)
  const [chosenStyle, setChosenStyle] = useState<string | null>(null)
  const [stylesBusy, setStylesBusy] = useState(false)
  const [stylesError, setStylesError] = useState<string | null>(null)

  // Смена модуля: сбрасываем подстатус стиля и подставляем разумное количество,
  // а для задания и урока — реальные предмет/класс (для урока — и длительность).
  useEffect(() => {
    setStylePhase('params')
    setStyleOptions(null)
    setChosenStyle(null)
    setStylesError(null)
    setParams((p) => {
      const needsSubjectGrade = p.type === 'assignment' || p.type === 'lesson' || p.type === 'ksp'
      // КСП — документ школьного учителя: заведение всегда «школа».
      const institution = p.type === 'ksp' ? 'school' : p.institution
      const grade = needsSubjectGrade
        ? (institution === p.institution ? p.grade : '') || GRADES_BY_INSTITUTION[institution][0]
        : ''
      return {
        ...p,
        institution,
        count:
          p.type === 'lesson' || p.type === 'ksp'
            ? defaultLessonMinutes(institution, grade)
            : DEFAULT_COUNT[p.type] ?? 8,
        subject: needsSubjectGrade ? p.subject || SUBJECTS[0] : '',
        grade,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.type])

  const [progress, setProgress] = useState<GenProgress | null>(null)
  const [result, setResult] = useState<Material | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [saved, setSaved] = useState<'draft' | 'published' | null>(null)

  const set = <K extends keyof GenerationParams>(k: K, v: GenerationParams[K]) =>
    setParams((p) => ({ ...p, [k]: v }))

  // Фаза 1: попросить ИИ подобрать стили под тему/материал.
  const loadStyles = async () => {
    setStylesBusy(true)
    setStylesError(null)
    try {
      const opts =
        params.type === 'summary'
          ? await suggestSummaryStyles(params, sources)
          : params.type === 'game'
            ? await suggestGameStyles(params, sources)
            : await suggestAssignmentStyles(params, sources)
      setStyleOptions(opts)
      setChosenStyle(null)
      setStylePhase('styles')
    } catch (e) {
      setStylesError(e instanceof Error ? e.message : String(e))
    } finally {
      setStylesBusy(false)
    }
  }

  const runGeneration = async () => {
    setStep(3)
    setResult(null)
    setGenError(null)
    setSaved(null)
    setProgress({ percent: 0, label: t('gen.thinking', { module: tType(params.type).toLowerCase() }) })
    try {
      if (params.type === 'quiz') {
        const { questions, title } = await generateQuiz(params, sources)
        setResult(
          buildMaterial(params, sources, { kind: 'quiz', questions }, {
            engine: t('gen.aiEngine'),
            title,
          }),
        )
      } else if (params.type === 'assignment' && chosenStyle) {
        const { content, title } = await generateAssignment(
          params,
          sources,
          chosenStyle as AssignmentStyle,
        )
        setResult(buildMaterial(params, sources, content, { engine: t('gen.aiEngine'), title }))
      } else if (params.type === 'summary' && chosenStyle) {
        const { content, title } = await generateSummary(
          params,
          sources,
          chosenStyle as SummaryStyle,
        )
        setResult(buildMaterial(params, sources, content, { engine: t('gen.aiEngine'), title }))
      } else if (params.type === 'game' && chosenStyle) {
        const { content, title } = await generateGame(
          params,
          sources,
          chosenStyle as GameFormat,
        )
        setResult(buildMaterial(params, sources, content, { engine: t('gen.aiEngine'), title }))
      } else if (params.type === 'lesson') {
        const { content, title } = await generateLesson(params, sources)
        setResult(buildMaterial(params, sources, content, { engine: t('gen.aiEngine'), title }))
      } else if (params.type === 'course') {
        const { content, title } = await generateCourse(params, sources)
        setResult(buildMaterial(params, sources, content, { engine: t('gen.aiEngine'), title }))
      } else if (params.type === 'ksp') {
        const { content, title } = await generateKsp(params, sources)
        setResult(buildMaterial(params, sources, content, { engine: t('gen.aiEngine'), title }))
      } else {
        const { cards, title } = await generateFlashcards(params, sources)
        setResult(
          buildMaterial(params, sources, { kind: 'flashcards', cards }, {
            engine: t('gen.aiEngine'),
            title,
          }),
        )
      }
    } catch (e) {
      setGenError(e instanceof Error ? e.message : String(e))
    } finally {
      setProgress(null)
    }
  }

  const STEPS = [
    t('gen.step.module'),
    t('gen.step.data'),
    t('gen.step.params'),
    t('gen.step.result'),
  ]

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('gen.title')}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('gen.subtitle')}</p>

      {/* Stepper */}
      <ol className="my-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cx(
                'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition',
                i === step
                  ? 'bg-brand-600 text-white'
                  : i < step
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800',
              )}
            >
              <span className="grid size-5 place-items-center rounded-full bg-white/20 text-xs">
                {i < step ? <IconCheck width={12} height={12} /> : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />}
          </li>
        ))}
      </ol>

      {/* Step 0 — модуль */}
      {step === 0 && (
        <div className="space-y-5 animate-fade-in-up">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('gen.pickModule')}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {MODULES.map((m) => {
              const available = AVAILABLE.includes(m)
              const active = params.type === m && available
              return (
                <button
                  key={m}
                  disabled={!available}
                  onClick={() => set('type', m)}
                  className={cx(
                    'relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition',
                    active
                      ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-950'
                      : available
                        ? 'border-slate-200 hover:border-brand-300 hover:shadow-sm dark:border-slate-700'
                        : 'cursor-not-allowed border-slate-100 opacity-55 dark:border-slate-800',
                  )}
                >
                  <TypeIconChip type={m} className="size-12" />
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {tType(m)}
                    </div>
                    {!available && (
                      <span className="mt-1 inline-block rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                        {t('gen.comingSoon')}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep(1)}>
              {t('common.next')} <IconArrowRight width={15} height={15} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 1 — данные (файл / чат) */}
      {step === 1 && (
        <div className="space-y-5 animate-fade-in-up">
          <SourcePicker sources={sources} onChange={setSources} lang={params.language} />

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(0)}>
              <IconArrowLeft width={15} height={15} /> {t('common.back')}
            </Button>
            <Button onClick={() => setStep(2)}>
              {t('common.next')} <IconArrowRight width={15} height={15} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 — параметры (для задания: параметры → стиль от ИИ) */}
      {step === 2 && (
        <div className="space-y-6 animate-fade-in-up">
          {(() => {
            const isAssign = params.type === 'assignment'
            const isSummary = params.type === 'summary'
            const isGame = params.type === 'game'
            const isLesson = params.type === 'lesson'
            const isKsp = params.type === 'ksp'
            const isCourse = params.type === 'course'
            const timed = isLesson || isKsp
            const isTwoPhase = TWO_PHASE.includes(params.type)
            const countKey =
              params.type === 'quiz'
                ? 'gen.countQuiz'
                : isAssign
                  ? 'gen.countAssign'
                  : isSummary
                    ? 'gen.countSummary'
                    : isGame
                      ? 'gen.countGame'
                      : timed
                        ? 'gen.countLesson'
                        : isCourse
                          ? 'gen.countCourse'
                          : 'gen.count'
            const suggestKey = isSummary
              ? 'gen.summary.suggest'
              : isGame
                ? 'gen.game.suggest'
                : 'gen.assign.suggest'
            const thinkingKey = isSummary
              ? 'gen.summary.thinking'
              : isGame
                ? 'gen.game.thinking'
                : 'gen.assign.thinking'
            const canProceed = !!params.topic.trim() || sources.length > 0

            /* ---- Фаза «стили» (задание и конспект) ---- */
            if (isTwoPhase && stylePhase === 'styles') {
              return (
                <>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {t('gen.assign.pick')}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {t('gen.assign.pickHint')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {(styleOptions ?? []).map((o, i) => {
                      const prev = (styleOptions ?? [])[i - 1]
                      const showDivider = prev?.recommended && !o.recommended
                      return (
                        <div key={o.id}>
                          {showDivider && (
                            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              {t('gen.assign.otherStyles')}
                            </p>
                          )}
                          <button
                            onClick={() => setChosenStyle(o.id)}
                            className={cx(
                              'flex w-full gap-3 rounded-xl border p-4 text-left transition',
                              chosenStyle === o.id
                                ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-950'
                                : 'border-slate-200 hover:border-brand-300 dark:border-slate-700',
                            )}
                          >
                            <span
                              className={cx(
                                'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border',
                                chosenStyle === o.id
                                  ? 'border-brand-500 bg-brand-500'
                                  : 'border-slate-300 dark:border-slate-600',
                              )}
                            >
                              {chosenStyle === o.id && (
                                <IconCheck width={10} height={10} className="text-white" />
                              )}
                            </span>
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {o.title}
                                </span>
                                {o.recommended && (
                                  <Badge className="bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                                    {t('gen.assign.recommended')}
                                  </Badge>
                                )}
                              </span>
                              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                                {o.reason}
                              </span>
                            </span>
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex justify-between">
                    <Button variant="secondary" onClick={() => setStylePhase('params')}>
                      <IconArrowLeft width={15} height={15} /> {t('gen.assign.editData')}
                    </Button>
                    <Button onClick={runGeneration} disabled={!chosenStyle}>
                      <IconSpark width={15} height={15} />
                      {t('gen.generateOllama')}
                    </Button>
                  </div>
                </>
              )
            }

            /* ---- Фаза «параметры» ---- */
            return (
              <>
                <Field label={t('gen.topic')} hint={t('gen.topicHint')}>
                  <input
                    className="input-base"
                    value={params.topic}
                    onChange={(e) => set('topic', e.target.value)}
                    placeholder={t('gen.topicPlaceholder')}
                  />
                </Field>

                {(isAssign || isGame || isLesson || isKsp || isCourse) && (
                  <>
                    {!isKsp && (
                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t('gen.institution')}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {INSTITUTIONS.map((inst) => (
                          <button
                            key={inst}
                            onClick={() =>
                              setParams((p) => {
                                const grade = GRADES_BY_INSTITUTION[inst][0]
                                return {
                                  ...p,
                                  institution: inst,
                                  grade,
                                  count: isLesson ? defaultLessonMinutes(inst, grade) : p.count,
                                }
                              })
                            }
                            className={cx(
                              'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                              params.institution === inst
                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950'
                                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700',
                            )}
                          >
                            {tInst(inst)}
                          </button>
                        ))}
                      </div>
                    </div>
                    )}

                    {(isAssign || isLesson || isKsp) && (
                      <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={t('gen.subject')}>
                        <select
                          className="input-base appearance-none"
                          value={params.subject}
                          onChange={(e) => set('subject', e.target.value)}
                        >
                          {SUBJECTS.map((s) => (
                            <option key={s} value={s}>
                              {tSubject(s)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field
                        label={params.institution === 'school' ? t('gen.grade') : t('gen.course')}
                      >
                        <select
                          className="input-base appearance-none"
                          value={params.grade}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              grade: e.target.value,
                              count: timed ? defaultLessonMinutes(p.institution, e.target.value) : p.count,
                            }))
                          }
                        >
                          {GRADES_BY_INSTITUTION[params.institution].map((g) => (
                            <option key={g} value={g}>
                              {tGrade(g)}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    {isAssign && (
                      <div>
                        <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                          {t('gen.assign.format')}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {WORK_FORMATS.map((f) => (
                            <button
                              key={f}
                              onClick={() => set('format', f)}
                              className={cx(
                                'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                                (params.format ?? 'individual') === f
                                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950'
                                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700',
                              )}
                            >
                              {t(`gen.assign.format.${f}`)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                      </>
                    )}
                  </>
                )}

                {isCourse && (
                  <>
                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">{t('gen.difficulty')}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {DIFFICULTIES.map((d) => (
                          <button
                            key={d}
                            onClick={() => set('difficulty', d)}
                            className={cx(
                              'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                              params.difficulty === d
                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950'
                                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700',
                            )}
                          >
                            {t(`diff.${d}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Field label={t('gen.course.codeLang')} hint={t('gen.course.codeLangHint')}>
                      <select
                        className="input-base appearance-none"
                        value={params.codeLanguage ?? ''}
                        onChange={(e) => set('codeLanguage', e.target.value)}
                      >
                        <option value="">{t('gen.course.noCode')}</option>
                        {CODE_LANGUAGES.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </>
                )}

                {isSummary && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t('gen.summary.audience')}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {AUDIENCES.map((a) => (
                        <button
                          key={a}
                          onClick={() => set('audience', a)}
                          className={cx(
                            'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                            (params.audience ?? 'student') === a
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-950'
                              : 'border-slate-200 hover:border-slate-300 dark:border-slate-700',
                          )}
                        >
                          {t(`gen.summary.audience.${a}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {timed ? (
                  <Field label={t(countKey, { n: params.count })} hint={t('gen.lesson.durationHint')}>
                    <input
                      type="range"
                      min={LESSON_DURATION_RANGE[params.institution].min}
                      max={LESSON_DURATION_RANGE[params.institution].max}
                      step={LESSON_DURATION_RANGE[params.institution].step}
                      value={params.count}
                      onChange={(e) => set('count', Number(e.target.value))}
                      className="w-full accent-brand-600"
                    />
                  </Field>
                ) : (
                  <Field label={t(countKey, { n: params.count })}>
                    <input
                      type="range"
                      min={minCount}
                      max={
                        params.type === 'quiz' ? 25 : isCourse ? 14 : isAssign || isGame ? 12 : isSummary ? 15 : 20
                      }
                      value={params.count}
                      onChange={(e) => set('count', Number(e.target.value))}
                      className="w-full accent-brand-600"
                    />
                  </Field>
                )}

                <Field label={t('gen.notes')} hint={t('gen.notesHint')}>
                  <textarea
                    className="input-base resize-none"
                    rows={2}
                    value={params.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    placeholder={t('gen.notesPlaceholder')}
                  />
                </Field>

                {stylesError && (
                  <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                    {stylesError}
                  </p>
                )}

                <div className="flex justify-between">
                  <Button variant="secondary" onClick={() => setStep(1)}>
                    <IconArrowLeft width={15} height={15} /> {t('common.back')}
                  </Button>
                  {isTwoPhase ? (
                    <Button onClick={loadStyles} disabled={stylesBusy || !canProceed}>
                      {stylesBusy ? (
                        <>
                          <Spinner /> {t(thinkingKey)}
                        </>
                      ) : (
                        <>
                          <IconSpark width={15} height={15} /> {t(suggestKey)}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button onClick={runGeneration}>
                      <IconSpark width={15} height={15} />
                      {t('gen.generateOllama')}
                    </Button>
                  )}
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* Step 3 — результат */}
      {step === 3 && (
        <div className="space-y-6 animate-fade-in-up">
          {progress && (
            <div className="card p-8 text-center">
              <Spinner className="mx-auto text-brand-600" />
              <p className="mt-3 font-medium text-slate-700 dark:text-slate-300">{progress.label}</p>
              {progress.percent > 0 && (
                <div className="mx-auto mt-4 h-2 w-full max-w-sm overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all duration-500"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              )}
              <p className="mt-3 text-xs text-slate-400">{t('gen.slowNote')}</p>
            </div>
          )}

          {genError && (
            <div className="card border-rose-200 p-5 dark:border-rose-900/50">
              <p className="font-semibold text-rose-600">{t('gen.errorTitle')}</p>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-rose-50 p-3 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                {genError}
              </pre>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setStep(2)}>
                  <IconArrowLeft width={15} height={15} /> {t('common.toParams')}
                </Button>
                <Button onClick={runGeneration}>{t('common.retry')}</Button>
              </div>
            </div>
          )}

          {result && (
            <>
              {/* У курса название и вступление уже на обложке — дублирующую шапку не показываем. */}
              {result.type !== 'course' && (
              <div className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{result.title}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{result.summary}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge>{tLang(result.language)}</Badge>
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                        {result.engine}
                      </Badge>
                    </div>
                  </div>
                  <TypeIconChip type={result.type} />
                </div>
              </div>
              )}

              <MaterialRenderer material={result} />

              {!session && (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  {t('auth.requiredDesc')}{' '}
                  <button
                    onClick={() => navigate('/login')}
                    className="font-semibold underline underline-offset-2"
                  >
                    {t('auth.toSignIn')}
                  </button>
                </p>
              )}

              <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
                {saved === 'published' ? (
                  <>
                    <span className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                      <IconCheck width={16} height={16} /> {t('gen.published')}
                    </span>
                    <Button variant="secondary" className="ml-auto" onClick={() => navigate('/community')}>
                      {t('common.openCommunity')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setStep(2)
                        setResult(null)
                      }}
                    >
                      <IconArrowLeft width={15} height={15} /> {t('gen.changeParams')}
                    </Button>
                    <div className="ml-auto flex gap-2">
                      <Button
                        variant="secondary"
                        disabled={saved === 'draft' || !session}
                        onClick={() => {
                          addDraft(result)
                            .then(() => setSaved('draft'))
                            .catch((e) => setGenError(e instanceof Error ? e.message : String(e)))
                        }}
                      >
                        {saved === 'draft' ? t('gen.inDrafts') : t('gen.saveDraft')}
                      </Button>
                      <Button
                        disabled={!session}
                        onClick={() => {
                          publish(result)
                            .then(() => setSaved('published'))
                            .catch((e) => setGenError(e instanceof Error ? e.message : String(e)))
                        }}
                      >
                        {t('common.publish')}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
