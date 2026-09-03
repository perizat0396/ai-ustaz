import { useEffect, useMemo, useState } from 'react'
import type { Flashcard, Material, MaterialContent } from '@/types'
import { cx } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { Badge, Button } from './ui'
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconRotate,
  IconShuffle,
  IconX,
} from './Icon'

export function MaterialRenderer({ material }: { material: Material }) {
  const c = material.content
  switch (c.kind) {
    case 'quiz':
      return <QuizView content={c} />
    case 'flashcards':
      return <FlashcardsView content={c} />
    case 'assignment':
      return <AssignmentView content={c} />
    case 'game':
      return <GameView content={c} />
    case 'lesson':
      return <LessonView content={c} />
    case 'summary':
      return <SummaryView content={c} />
    default:
      return null
  }
}

/* ------------------------------ Quiz ------------------------------ */

function QuizView({ content }: { content: Extract<MaterialContent, { kind: 'quiz' }> }) {
  const { t } = useI18n()
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [checked, setChecked] = useState(false)

  const score = content.questions.reduce(
    (acc, q) => acc + (answers[q.id] === q.correctIndex ? 1 : 0),
    0,
  )

  return (
    <div className="space-y-5">
      {content.questions.map((q, qi) => (
        <div key={q.id} className="card p-5">
          <p className="mb-3 font-semibold text-slate-900 dark:text-white">
            {qi + 1}. {q.prompt}
          </p>
          <div className="space-y-2">
            {q.options.map((opt, oi) => {
              const selected = answers[q.id] === oi
              const isCorrect = oi === q.correctIndex
              const showState = checked && (selected || isCorrect)
              return (
                <button
                  key={oi}
                  type="button"
                  onClick={() => !checked && setAnswers((a) => ({ ...a, [q.id]: oi }))}
                  className={cx(
                    'flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition',
                    !checked &&
                      (selected
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-950'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'),
                    showState && isCorrect && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
                    showState && selected && !isCorrect && 'border-rose-500 bg-rose-50 dark:bg-rose-950/40',
                    checked && !showState && 'border-slate-200 opacity-60 dark:border-slate-700',
                  )}
                >
                  <span
                    className={cx(
                      'grid size-5 shrink-0 place-items-center rounded-full border text-[11px] font-bold',
                      selected
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-slate-300 text-slate-400 dark:border-slate-600',
                    )}
                  >
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {showState && isCorrect && <IconCheck className="text-emerald-600" width={16} height={16} />}
                  {showState && selected && !isCorrect && <IconX className="text-rose-600" width={16} height={16} />}
                </button>
              )
            })}
          </div>
          {checked && (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              💡 {q.explanation}
            </p>
          )}
        </div>
      ))}

      <div className="flex items-center gap-4">
        {!checked ? (
          <Button
            onClick={() => setChecked(true)}
            disabled={Object.keys(answers).length !== content.questions.length}
          >
            {t('mat.quiz.check')}
          </Button>
        ) : (
          <>
            <Badge className="bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {t('mat.quiz.result', { a: score, b: content.questions.length })}
            </Badge>
            <Button variant="secondary" onClick={() => { setChecked(false); setAnswers({}) }}>
              {t('mat.quiz.retry')}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

/* --------------------------- Flashcards --------------------------- */

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function FlashcardsView({
  content,
}: {
  content: Extract<MaterialContent, { kind: 'flashcards' }>
}) {
  const { t } = useI18n()
  const [deck, setDeck] = useState<Flashcard[]>(content.cards)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    setDeck(content.cards)
    setIndex(0)
    setFlipped(false)
  }, [content.cards])

  const total = deck.length
  const card = deck[index]

  const go = (dir: 1 | -1) => {
    setFlipped(false)
    setIndex((i) => (i + dir + total) % total)
  }
  const reshuffle = () => {
    setFlipped(false)
    setIndex(0)
    setDeck((d) => shuffled(d))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped((f) => !f)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  if (!card) return <p className="text-sm text-slate-400">—</p>

  const isQuestion = /[?？]\s*$/.test(card.front.trim())
  const frontLabel = isQuestion ? t('mat.flash.question') : t('mat.flash.term')
  const backLabel = isQuestion ? t('mat.flash.answer') : t('mat.flash.definition')
  const backHint = isQuestion ? t('mat.flash.backToQuestion') : t('mat.flash.backToTerm')

  return (
    <div className="mx-auto max-w-xl">
      {/* Прогресс */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
        <span className="font-display text-sm font-semibold text-slate-500 dark:text-slate-400">
          {index + 1} / {total}
        </span>
      </div>

      {/* Карта: термин / вопрос → определение / ответ */}
      <div className="perspective">
        <div
          className={cx(
            'preserve-3d relative min-h-[16rem] w-full transition-transform duration-500 ease-out sm:min-h-[18rem]',
            flipped && 'rotate-y-180',
          )}
        >
          {/* Лицо */}
          <div className="backface-hidden absolute inset-0 flex flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_14px_44px_-18px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-900">
            <span className="self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {frontLabel}
            </span>
            <div className="flex flex-1 items-center justify-center py-4">
              <p className="font-display text-center text-3xl font-semibold leading-snug break-words text-slate-900 sm:text-4xl dark:text-white">
                {card.front}
              </p>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400">
              <IconRotate width={13} height={13} /> {t('mat.flash.tapToSee')}
            </div>
            <button
              type="button"
              onClick={() => setFlipped(true)}
              aria-label="Показать ответ"
              className={cx(
                'absolute inset-0 rounded-3xl transition hover:bg-brand-500/[0.03]',
                flipped && 'pointer-events-none',
              )}
            />
          </div>

          {/* Оборот */}
          <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col rounded-3xl border-2 border-brand-500 bg-white p-7 shadow-[0_14px_44px_-18px_rgba(79,70,229,0.4)] dark:bg-slate-900">
            <span className="self-start rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
              {backLabel}
            </span>
            <div className="flex flex-1 items-center overflow-y-auto py-3">
              <p className="text-[1.05rem] leading-relaxed text-slate-700 dark:text-slate-200">
                {card.back}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFlipped(false)}
              className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-brand-600"
            >
              <IconRotate width={13} height={13} /> {backHint}
            </button>
          </div>
        </div>
      </div>

      {/* Навигация */}
      <div className="mt-4 flex items-center justify-between">
        <Button variant="secondary" size="sm" onClick={() => go(-1)}>
          <IconArrowLeft width={15} height={15} /> {t('common.back')}
        </Button>
        <button
          onClick={reshuffle}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
        >
          <IconShuffle width={15} height={15} /> {t('mat.flash.shuffle')}
        </button>
        <Button variant="secondary" size="sm" onClick={() => go(1)}>
          {t('common.next')} <IconArrowRight width={15} height={15} />
        </Button>
      </div>
    </div>
  )
}

/* --------------------------- Assignment -------------------------- */

function AssignmentView({
  content,
}: {
  content: Extract<MaterialContent, { kind: 'assignment' }>
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const total = content.tasks.reduce((a, task) => a + task.points, 0)

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        {content.instructions}
      </p>
      <ol className="space-y-3">
        {content.tasks.map((task, i) => (
          <li key={task.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-slate-900 dark:text-white">
                {i + 1}. {task.prompt}
              </p>
              <Badge>
                {task.points} {t('mat.assign.points')}
              </Badge>
            </div>
            {task.hint && (
              <p className="mt-2 text-xs text-slate-500">
                {t('mat.assign.hint')}: {task.hint}
              </p>
            )}
            {task.answer && (
              <div className="mt-2">
                <button
                  className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                  onClick={() => setOpen((o) => ({ ...o, [task.id]: !o[task.id] }))}
                >
                  {open[task.id] ? t('mat.assign.hideAnswer') : t('mat.assign.showAnswer')}
                </button>
                {open[task.id] && (
                  <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {task.answer}
                  </p>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
      <p className="text-right text-sm font-semibold text-slate-600 dark:text-slate-300">
        {t('mat.assign.total', { n: total })}
      </p>
    </div>
  )
}

/* ------------------------------ Game ----------------------------- */

function GameView({ content }: { content: Extract<MaterialContent, { kind: 'game' }> }) {
  const { t } = useI18n()
  const shuffledDefs = useMemo(
    () => [...content.pairs].sort(() => Math.random() - 0.5),
    [content.pairs],
  )
  const [pickTerm, setPickTerm] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [wrong, setWrong] = useState<string | null>(null)

  const tryMatch = (defId: string) => {
    if (!pickTerm) return
    if (pickTerm === defId) {
      setMatched((m) => new Set(m).add(defId))
      setPickTerm(null)
    } else {
      setWrong(defId)
      setTimeout(() => setWrong(null), 500)
    }
  }

  const done = matched.size === content.pairs.length

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
        <p className="font-semibold">{content.gameTitle}</p>
        <p className="mt-0.5 text-xs">{content.rules}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-400">{t('mat.game.terms')}</p>
          {content.pairs.map((p) => (
            <button
              key={p.id}
              disabled={matched.has(p.id)}
              onClick={() => setPickTerm(p.id)}
              className={cx(
                'w-full rounded-lg border px-3 py-2 text-left text-sm font-medium transition',
                matched.has(p.id)
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700 line-through dark:bg-emerald-950/40'
                  : pickTerm === p.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700',
              )}
            >
              {p.term}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-400">{t('mat.game.defs')}</p>
          {shuffledDefs.map((p) => (
            <button
              key={p.id}
              disabled={matched.has(p.id)}
              onClick={() => tryMatch(p.id)}
              className={cx(
                'w-full rounded-lg border px-3 py-2 text-left text-sm transition',
                matched.has(p.id)
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                  : wrong === p.id
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700',
              )}
            >
              {p.def}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
        {done
          ? t('mat.game.allFound')
          : t('mat.game.found', { a: matched.size, b: content.pairs.length })}
      </p>
    </div>
  )
}

/* ----------------------------- Lesson ---------------------------- */

function LessonView({ content }: { content: Extract<MaterialContent, { kind: 'lesson' }> }) {
  const { t } = useI18n()
  const total = content.sections.reduce((a, s) => a + s.minutes, 0)
  return (
    <div className="space-y-5">
      <div className="card p-5">
        <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
          {t('mat.lesson.objectives')}
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
          {content.objectives.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
      </div>
      <div className="relative space-y-3 border-l-2 border-slate-200 pl-6 dark:border-slate-700">
        {content.sections.map((s) => (
          <div key={s.id} className="relative">
            <span className="absolute -left-[31px] top-1.5 grid size-4 place-items-center rounded-full bg-brand-500 ring-4 ring-white dark:ring-slate-950" />
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900 dark:text-white">{s.heading}</p>
                <Badge>{t('mat.lesson.min', { n: s.minutes })}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-right text-sm font-semibold text-slate-600 dark:text-slate-300">
        {t('mat.lesson.total', { n: total })}
      </p>
    </div>
  )
}

/* ----------------------------- Summary --------------------------- */

function SummaryView({ content }: { content: Extract<MaterialContent, { kind: 'summary' }> }) {
  const { t } = useI18n()
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
          {t('mat.summary.keyPoints')}
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
          {content.keyPoints.map((k, i) => (
            <li key={i}>{k}</li>
          ))}
        </ul>
      </div>
      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{content.body}</p>
    </div>
  )
}
