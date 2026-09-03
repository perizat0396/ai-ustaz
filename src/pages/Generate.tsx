import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ContextSource, EducationLevel, GenerationParams, Lang, Material, MaterialType } from '@/types'
import { cx, GRADES_BY_INSTITUTION, SUBJECTS } from '@/lib/utils'
import { buildMaterial, type GenProgress } from '@/lib/generator'
import { generateFlashcards, pingOllama } from '@/lib/ollama'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { SourcePicker } from '@/components/SourcePicker'
import { MaterialRenderer } from '@/components/MaterialRenderer'
import { TypeIconChip } from '@/components/TypeIcon'
import { Badge, Button, Field, Spinner } from '@/components/ui'
import { IconArrowLeft, IconArrowRight, IconCheck, IconSpark } from '@/components/Icon'

/* Пока доступны только флешкарты. Остальные модули — «скоро». */
const MODULES: MaterialType[] = ['flashcards', 'quiz', 'assignment', 'game', 'lesson', 'summary']
const AVAILABLE: MaterialType[] = ['flashcards']
const INSTITUTIONS: EducationLevel[] = ['school', 'college', 'university']
const LANGS: Lang[] = ['kk', 'ru']

export function Generate() {
  const navigate = useNavigate()
  const { addDraft, publish, ollama, setOllama } = useStore()
  const { t, tType, tDiff, tInst, tLang, tSubject, tGrade } = useI18n()

  const [step, setStep] = useState(0)
  const [sources, setSources] = useState<ContextSource[]>([])
  const [params, setParams] = useState<GenerationParams>({
    topic: '',
    type: 'flashcards',
    subject: SUBJECTS[0],
    institution: 'school',
    grade: GRADES_BY_INSTITUTION.school[5],
    difficulty: 'medium',
    language: 'kk',
    count: 8,
    cardStyle: 'term',
    notes: '',
  })

  const [progress, setProgress] = useState<GenProgress | null>(null)
  const [result, setResult] = useState<Material | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [saved, setSaved] = useState<'draft' | 'published' | null>(null)

  const set = <K extends keyof GenerationParams>(k: K, v: GenerationParams[K]) =>
    setParams((p) => ({ ...p, [k]: v }))

  /* ---- Автоопределение локального ИИ ---- */
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null)
  const [installed, setInstalled] = useState<string[]>([])
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false)
  const recheck = () => {
    setOllamaOk(null)
    void pingOllama(ollama.baseUrl).then((s) => {
      setOllamaOk(s.ok)
      setInstalled(s.models.filter((m) => !m.includes('cloud')))
    })
  }
  useEffect(() => {
    recheck()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ollama.baseUrl])

  const modelMissing =
    ollamaOk === true && installed.length > 0 && !installed.includes(ollama.models[params.language])

  const runGeneration = async () => {
    setStep(3)
    setResult(null)
    setGenError(null)
    setSaved(null)
    setProgress({ percent: 0, label: t('gen.thinking', { model: ollama.models[params.language] }) })
    try {
      const { cards, model, title } = await generateFlashcards(params, sources, ollama)
      setResult(
        buildMaterial(params, sources, { kind: 'flashcards', cards }, {
          engine: `Ollama · ${model}`,
          title,
        }),
      )
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
          {/* статус ИИ */}
          <div className="card p-3 text-xs">
            <div className="flex items-center gap-2">
              {ollamaOk === null && <span className="text-slate-400">{t('ai.checking')}</span>}
              {ollamaOk === true && (
                <span className="flex items-center gap-1 font-medium text-emerald-600">
                  <IconCheck width={13} height={13} /> {t('ai.online')} · {installed.length}
                </span>
              )}
              {ollamaOk === false && <span className="text-amber-600">{t('ai.offline')}</span>}
              <button
                onClick={recheck}
                className="ml-auto font-semibold text-brand-600 hover:underline dark:text-brand-400"
              >
                {t('ai.recheck')}
              </button>
            </div>

            {modelMissing && (
              <div className="mt-2 rounded-lg bg-amber-50 p-2 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <p>{t('ai.modelMissing', { model: ollama.models[params.language] })}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {installed.map((mm) => (
                    <button
                      key={mm}
                      onClick={() =>
                        setOllama({ models: { ...ollama.models, [params.language]: mm } })
                      }
                      className="rounded-md bg-white/70 px-2 py-0.5 font-mono font-semibold text-amber-800 hover:bg-white dark:bg-slate-800 dark:text-amber-200"
                    >
                      {mm}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setAiSettingsOpen((o) => !o)}
              className="mt-1.5 font-semibold text-slate-400 hover:text-slate-600"
            >
              {aiSettingsOpen ? '−' : '+'} {t('ai.settings')}
            </button>
            {aiSettingsOpen && (
              <div className="mt-2 space-y-3">
                {ollama.models.kk !== ollama.models.ru && (
                  <button
                    onClick={() =>
                      setOllama({ models: { kk: ollama.models[params.language], ru: ollama.models[params.language] } })
                    }
                    className="rounded-md bg-brand-50 px-2 py-1 font-semibold text-brand-700 hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300"
                  >
                    {t('ai.oneModel')}
                  </button>
                )}
                {LANGS.map((l) => (
                  <div key={l}>
                    <span className="mb-1 block text-slate-500">
                      {t('ollama.modelFor', { lang: tLang(l) })}
                    </span>
                    <input
                      className="input-base font-mono text-xs"
                      value={ollama.models[l]}
                      spellCheck={false}
                      onChange={(e) => setOllama({ models: { ...ollama.models, [l]: e.target.value } })}
                    />
                    {installed.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {installed.map((mm) => (
                          <button
                            key={mm}
                            onClick={() => setOllama({ models: { ...ollama.models, [l]: mm } })}
                            className={cx(
                              'rounded-md px-2 py-0.5 font-mono transition',
                              ollama.models[l] === mm
                                ? 'bg-brand-600 text-white'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
                            )}
                          >
                            {mm}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div>
                  <span className="mb-1 block text-slate-500">{t('ollama.serverAddr')}</span>
                  <input
                    className="input-base font-mono text-xs"
                    value={ollama.baseUrl}
                    spellCheck={false}
                    onChange={(e) => setOllama({ baseUrl: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <SourcePicker
            sources={sources}
            onChange={setSources}
            ollama={ollama}
            ollamaOk={ollamaOk}
            lang={params.language}
          />

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

      {/* Step 2 — параметры */}
      {step === 2 && (
        <div className="space-y-6 animate-fade-in-up">
          <Field label={t('gen.topic')} hint={t('gen.topicHint')}>
            <input
              className="input-base"
              value={params.topic}
              onChange={(e) => set('topic', e.target.value)}
              placeholder={t('gen.topicPlaceholder')}
            />
          </Field>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('gen.institution')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {INSTITUTIONS.map((inst) => (
                <button
                  key={inst}
                  onClick={() =>
                    setParams((p) => ({ ...p, institution: inst, grade: GRADES_BY_INSTITUTION[inst][0] }))
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
            <Field label={params.institution === 'school' ? t('gen.grade') : t('gen.course')}>
              <select
                className="input-base appearance-none"
                value={params.grade}
                onChange={(e) => set('grade', e.target.value)}
              >
                {GRADES_BY_INSTITUTION[params.institution].map((g) => (
                  <option key={g} value={g}>
                    {tGrade(g)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('gen.difficulty')}>
              <select
                className="input-base appearance-none"
                value={params.difficulty}
                onChange={(e) => set('difficulty', e.target.value as GenerationParams['difficulty'])}
              >
                {(['easy', 'medium', 'hard'] as const).map((d) => (
                  <option key={d} value={d}>
                    {tDiff(d)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('gen.language')}>
              <select
                className="input-base appearance-none"
                value={params.language}
                onChange={(e) => set('language', e.target.value as Lang)}
              >
                {LANGS.map((l) => (
                  <option key={l} value={l}>
                    {tLang(l)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('gen.cardFormat')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(['term', 'qa'] as const).map((val) => (
                <button
                  key={val}
                  onClick={() => set('cardStyle', val)}
                  className={cx(
                    'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                    params.cardStyle === val
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700',
                  )}
                >
                  {t(`gen.cardFormat.${val}`)}
                </button>
              ))}
            </div>
          </div>

          <Field label={t('gen.count', { n: params.count })}>
            <input
              type="range"
              min={3}
              max={20}
              value={params.count}
              onChange={(e) => set('count', Number(e.target.value))}
              className="w-full accent-brand-600"
            />
          </Field>

          <Field label={t('gen.notes')} hint={t('gen.notesHint')}>
            <textarea
              className="input-base resize-none"
              rows={2}
              value={params.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder={t('gen.notesPlaceholder')}
            />
          </Field>

          {ollamaOk === false && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              {t('gen.needAi')}
            </p>
          )}

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>
              <IconArrowLeft width={15} height={15} /> {t('common.back')}
            </Button>
            <Button onClick={runGeneration} disabled={ollamaOk === false}>
              <IconSpark width={15} height={15} />
              {t('gen.generateOllama')}
            </Button>
          </div>
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
              <div className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{result.title}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{result.summary}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge>{tInst(result.institution)}</Badge>
                      <Badge>{tGrade(result.grade)}</Badge>
                      <Badge>{tLang(result.language)}</Badge>
                      <Badge
                        className={
                          result.engine.startsWith('Ollama')
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : undefined
                        }
                      >
                        {result.engine}
                      </Badge>
                    </div>
                  </div>
                  <TypeIconChip type={result.type} />
                </div>
              </div>

              <MaterialRenderer material={result} />

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
                        disabled={saved === 'draft'}
                        onClick={() => {
                          addDraft(result)
                          setSaved('draft')
                        }}
                      >
                        {saved === 'draft' ? t('gen.inDrafts') : t('gen.saveDraft')}
                      </Button>
                      <Button
                        onClick={() => {
                          publish(result)
                          setSaved('published')
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
