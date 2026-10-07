import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type {
  Flashcard,
  Material,
  MaterialContent,
  MatchPair,
  OddOneRound,
  QuizQuestion,
} from '@/types'
import { cx } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { Badge, Button } from './ui'
import { KspView } from './KspView'
import { CoursePlayer } from './CoursePlayer'
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
    case 'ordering':
      return <OrderingView content={c} />
    case 'game':
      return <GameView content={c} />
    case 'lesson':
      return <LessonView content={c} />
    case 'summary':
      return <SummaryView content={c} />
    case 'ksp':
      return <KspView material={material} content={c} />
    case 'course':
      return <CoursePlayer material={material} content={c} />
    default:
      return null
  }
}

/* ------------------------------ Quiz ------------------------------ */

const normAnswer = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .replace(/^[«"'(]+|[.,;:!?»"')]+$/g, '')

function QuizView({ content }: { content: Extract<MaterialContent, { kind: 'quiz' }> }) {
  const { t } = useI18n()
  const qs = content.questions
  const [choice, setChoice] = useState<Record<string, number>>({})
  const [typed, setTyped] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)

  const kindOf = (q: (typeof qs)[number]) => q.kind ?? 'mcq'
  const isFill = (q: (typeof qs)[number]) => kindOf(q) === 'fill'
  const isAnswered = (q: (typeof qs)[number]) =>
    isFill(q) ? !!(typed[q.id] ?? '').trim() : choice[q.id] != null
  const isRight = (q: (typeof qs)[number]) =>
    isFill(q)
      ? normAnswer(typed[q.id] ?? '') !== '' &&
        normAnswer(typed[q.id] ?? '') === normAnswer(q.answerText ?? '')
      : choice[q.id] === q.correctIndex

  const allAnswered = qs.every(isAnswered)
  const score = qs.reduce((acc, q) => acc + (isRight(q) ? 1 : 0), 0)

  const reset = () => {
    setChecked(false)
    setChoice({})
    setTyped({})
  }

  return (
    <div className="space-y-5">
      {qs.map((q, qi) => {
        const k = kindOf(q)
        const right = isRight(q)
        return (
          <div key={q.id} className="card p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="font-semibold text-slate-900 dark:text-white">
                {qi + 1}. {q.prompt}
              </p>
              <Badge className="shrink-0 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {t(`mat.quiz.kind.${k}`)}
              </Badge>
            </div>

            {isFill(q) ? (
              <div>
                <input
                  type="text"
                  disabled={checked}
                  value={typed[q.id] ?? ''}
                  onChange={(e) => setTyped((m) => ({ ...m, [q.id]: e.target.value }))}
                  placeholder={t('mat.quiz.fillPlaceholder')}
                  className={cx(
                    'input-base',
                    checked && (right ? 'border-emerald-500' : 'border-rose-500'),
                  )}
                />
                {checked && !right && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {t('mat.quiz.correctAnswer')}:{' '}
                    <b className="text-emerald-600 dark:text-emerald-400">{q.answerText}</b>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const selected = choice[q.id] === oi
                  const isCorrect = oi === q.correctIndex
                  const showState = checked && (selected || isCorrect)
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => !checked && setChoice((a) => ({ ...a, [q.id]: oi }))}
                      className={cx(
                        'flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition',
                        !checked &&
                          (selected
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'),
                        showState && isCorrect && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
                        showState &&
                          selected &&
                          !isCorrect &&
                          'border-rose-500 bg-rose-50 dark:bg-rose-950/40',
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
                      {showState && isCorrect && (
                        <IconCheck className="text-emerald-600" width={16} height={16} />
                      )}
                      {showState && selected && !isCorrect && (
                        <IconX className="text-rose-600" width={16} height={16} />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {checked && q.explanation && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                💡 {q.explanation}
              </p>
            )}
          </div>
        )
      })}

      {!checked ? (
        <Button onClick={() => setChecked(true)} disabled={!allAnswered}>
          {t('mat.quiz.check')}
        </Button>
      ) : (
        <div className="card space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {t('mat.quiz.result', { a: score, b: qs.length })}
            </Badge>
            <Button variant="secondary" onClick={reset}>
              {t('mat.quiz.retry')}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {qs.map((q, qi) => (
              <span
                key={q.id}
                title={q.prompt}
                className={cx(
                  'grid size-7 place-items-center rounded-lg text-xs font-bold',
                  isRight(q)
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
                )}
              >
                {qi + 1}
              </span>
            ))}
          </div>
        </div>
      )}
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

/* --------------------------- Ordering ---------------------------- */

function OrderingView({
  content,
}: {
  content: Extract<MaterialContent, { kind: 'ordering' }>
}) {
  const { t } = useI18n()
  const shuffle = () => {
    if (content.steps.length < 2) return [...content.steps]
    let a = shuffled(content.steps)
    // не показывать сразу правильный порядок
    if (a.every((s, i) => s.id === content.steps[i].id)) a = shuffled(a)
    return a
  }
  const [order, setOrder] = useState(shuffle)
  const [checked, setChecked] = useState(false)

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (checked || j < 0 || j >= order.length) return
    setOrder((o) => {
      const n = [...o]
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })
  }
  const rightAt = (i: number) => order[i].id === content.steps[i].id
  const score = order.reduce((acc, _, i) => acc + (rightAt(i) ? 1 : 0), 0)
  const allRight = score === order.length

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        {content.instructions}
      </p>

      <ol className="space-y-2">
        {order.map((s, i) => (
          <li
            key={s.id}
            className={cx(
              'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition',
              !checked && 'border-slate-200 dark:border-slate-700',
              checked && rightAt(i) && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
              checked && !rightAt(i) && 'border-rose-500 bg-rose-50 dark:bg-rose-950/40',
            )}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {i + 1}
            </span>
            <span className="flex-1">{s.text}</span>
            {!checked && (
              <span className="flex shrink-0 flex-col">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="px-1.5 text-slate-400 transition hover:text-brand-600 disabled:opacity-30"
                  aria-label="вверх"
                >
                  ▲
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === order.length - 1}
                  className="px-1.5 text-slate-400 transition hover:text-brand-600 disabled:opacity-30"
                  aria-label="вниз"
                >
                  ▼
                </button>
              </span>
            )}
            {checked && (
              <span className="shrink-0">
                {rightAt(i) ? (
                  <IconCheck className="text-emerald-600" width={16} height={16} />
                ) : (
                  <IconX className="text-rose-600" width={16} height={16} />
                )}
              </span>
            )}
          </li>
        ))}
      </ol>

      {!checked ? (
        <Button onClick={() => setChecked(true)}>{t('mat.ordering.check')}</Button>
      ) : (
        <div className="card space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {t('mat.ordering.result', { a: score, b: order.length })}
            </Badge>
            <Button
              variant="secondary"
              onClick={() => {
                setChecked(false)
                setOrder(shuffle())
              }}
            >
              {t('mat.quiz.retry')}
            </Button>
          </div>
          {!allRight && (
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t('mat.ordering.correctOrder')}
              </p>
              <ol className="list-decimal space-y-0.5 pl-5 text-sm text-slate-600 dark:text-slate-300">
                {content.steps.map((s) => (
                  <li key={s.id}>{s.text}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------ Game ----------------------------- */

function GameShell({
  title,
  rules,
  children,
}: {
  title: string
  rules: string
  children: ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-xs">{rules}</p>
      </div>
      {children}
    </div>
  )
}

function GameView({ content }: { content: Extract<MaterialContent, { kind: 'game' }> }) {
  const fmt = content.format ?? 'match'
  const shell = (c: ReactNode) => (
    <GameShell title={content.gameTitle} rules={content.rules}>
      {c}
    </GameShell>
  )
  if (fmt === 'quizshow') return shell(<QuizShowGame questions={content.questions ?? []} />)
  if (fmt === 'blast') return shell(<BlastGame questions={content.questions ?? []} />)
  if (fmt === 'oddone') return shell(<OddOneGame rounds={content.rounds ?? []} />)
  if (fmt === 'memory') return shell(<MemoryGame pairs={content.pairs ?? []} />)
  if (fmt === 'speedmatch')
    return shell(<MatchGame pairs={content.pairs ?? []} timed storageKey={content.gameTitle} />)
  return shell(<MatchGame pairs={content.pairs ?? []} />)
}

/* --- Найти пару (+ вариант «на время») --- */
function readBest(key: string): number | null {
  try {
    const v = localStorage.getItem('ai-ustaz:speed:' + key)
    return v ? Number(v) : null
  } catch {
    return null
  }
}
function MatchGame({
  pairs,
  timed = false,
  storageKey = '',
}: {
  pairs: MatchPair[]
  timed?: boolean
  storageKey?: string
}) {
  const { t } = useI18n()
  const shuffledDefs = useMemo(() => [...pairs].sort(() => Math.random() - 0.5), [pairs])
  const [pickTerm, setPickTerm] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [wrong, setWrong] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const done = matched.size === pairs.length

  useEffect(() => {
    if (!timed || !running || done) return
    const id = setInterval(() => setElapsed((e) => e + 0.1), 100)
    return () => clearInterval(id)
  }, [timed, running, done])

  const [best, setBest] = useState<number | null>(() => (timed ? readBest(storageKey) : null))
  const [isNewBest, setIsNewBest] = useState(false)
  useEffect(() => {
    if (!timed || !done) return
    setRunning(false)
    const secs = Math.round(elapsed * 10) / 10
    if (best == null || secs < best) {
      setBest(secs)
      setIsNewBest(true)
      try {
        localStorage.setItem('ai-ustaz:speed:' + storageKey, String(secs))
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  const tryMatch = (defId: string) => {
    if (!pickTerm) return
    if (timed && !running && !done) setRunning(true)
    if (pickTerm === defId) {
      setMatched((m) => new Set(m).add(defId))
      setPickTerm(null)
    } else {
      if (timed) setElapsed((e) => e + 2) // штраф 2 сек
      setWrong(defId)
      setTimeout(() => setWrong(null), 500)
    }
  }

  return (
    <>
      {timed && (
        <div className="flex items-center justify-between text-sm font-semibold">
          <span className="text-brand-600 dark:text-brand-400">
            ⏱ {(Math.round(elapsed * 10) / 10).toFixed(1)} {t('mat.game.sec')}
          </span>
          {best != null && (
            <span className="text-slate-500 dark:text-slate-400">
              {t('mat.game.best')}: {best.toFixed(1)} {t('mat.game.sec')}
            </span>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-400">{t('mat.game.terms')}</p>
          {pairs.map((p) => (
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
          ? timed
            ? isNewBest
              ? t('mat.game.newBest', { n: (Math.round(elapsed * 10) / 10).toFixed(1) })
              : t('mat.game.speedDone', { n: (Math.round(elapsed * 10) / 10).toFixed(1) })
            : t('mat.game.allFound')
          : t('mat.game.found', { a: matched.size, b: pairs.length })}
      </p>
    </>
  )
}

/* --- Мемори --- */
interface MemoCard {
  id: string
  pairId: string
  text: string
}
function MemoryGame({ pairs }: { pairs: MatchPair[] }) {
  const { t } = useI18n()
  const deck = useMemo<MemoCard[]>(() => {
    const cards: MemoCard[] = []
    pairs.forEach((p) => {
      cards.push({ id: `${p.id}-t`, pairId: p.id, text: p.term })
      cards.push({ id: `${p.id}-d`, pairId: p.id, text: p.def })
    })
    return shuffled(cards)
  }, [pairs])

  const [open, setOpen] = useState<string[]>([])
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [moves, setMoves] = useState(0)

  const flip = (id: string) => {
    if (open.length === 2 || open.includes(id) || matched.has(id.split('-')[0])) return
    const next = [...open, id]
    setOpen(next)
    if (next.length === 2) {
      setMoves((m) => m + 1)
      const [a, b] = next
      if (a.split('-')[0] === b.split('-')[0]) {
        setMatched((m) => new Set(m).add(a.split('-')[0]))
        setOpen([])
      } else {
        setTimeout(() => setOpen([]), 800)
      }
    }
  }
  const done = matched.size === pairs.length

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {deck.map((c) => {
          const isOpen = open.includes(c.id) || matched.has(c.pairId)
          return (
            <button
              key={c.id}
              onClick={() => flip(c.id)}
              className={cx(
                'flex min-h-[4.5rem] items-center justify-center rounded-xl border p-2 text-center text-xs font-medium transition',
                matched.has(c.pairId)
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                  : isOpen
                    ? 'border-brand-500 bg-brand-50 text-slate-800 dark:bg-brand-950 dark:text-slate-100'
                    : 'border-slate-200 bg-slate-100 text-transparent hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800',
              )}
            >
              {isOpen ? c.text : '?'}
            </button>
          )
        })}
      </div>
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
        {done
          ? t('mat.game.memoryDone', { n: moves })
          : t('mat.game.found', { a: matched.size, b: pairs.length })}
      </p>
    </>
  )
}

/* --- Квиз-шоу --- */
const OPT_TINTS = [
  'border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/40',
  'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40',
  'border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40',
  'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40',
]
function QuizShowGame({ questions }: { questions: QuizQuestion[] }) {
  const { t } = useI18n()
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<'right' | 'wrong' | null>(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const q = questions[idx]

  if (!q) return <p className="text-sm text-slate-400">—</p>
  const isFill = (q.kind ?? 'mcq') === 'fill'

  const score1 = (right: boolean) => {
    if (right) {
      setScore((s) => s + 10 + streak * 2)
      setStreak((s) => s + 1)
    } else {
      setStreak(0)
    }
  }
  const pick = (oi: number) => {
    if (result != null) return
    setPicked(oi)
    const right = oi === q.correctIndex
    setResult(right ? 'right' : 'wrong')
    score1(right)
  }
  const submitFill = () => {
    if (result != null || !typed.trim()) return
    const right =
      normAnswer(typed) !== '' && normAnswer(typed) === normAnswer(q.answerText ?? '')
    setResult(right ? 'right' : 'wrong')
    score1(right)
  }
  const last = idx === questions.length - 1
  const next = () => {
    if (last) {
      setIdx(0)
      setScore(0)
      setStreak(0)
    } else {
      setIdx((i) => i + 1)
    }
    setPicked(null)
    setTyped('')
    setResult(null)
  }

  return (
    <>
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>
          {idx + 1} / {questions.length}
        </span>
        <span className="flex gap-3">
          {streak > 1 && <span className="text-amber-600">🔥 {streak}</span>}
          <span className="text-brand-600 dark:text-brand-400">{t('mat.game.score', { n: score })}</span>
        </span>
      </div>
      <p className="text-base font-semibold text-slate-900 dark:text-white">{q.prompt}</p>

      {isFill ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={typed}
            disabled={result != null}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitFill()}
            placeholder={t('mat.quiz.fillPlaceholder')}
            className={cx(
              'input-base',
              result === 'right' && 'border-emerald-500',
              result === 'wrong' && 'border-rose-500',
            )}
          />
          <Button onClick={submitFill} disabled={result != null || !typed.trim()}>
            {t('mat.quiz.check')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {q.options.map((opt, oi) => {
            const isCorrect = oi === q.correctIndex
            const show = result != null
            return (
              <button
                key={oi}
                disabled={show}
                onClick={() => pick(oi)}
                className={cx(
                  'rounded-xl border px-4 py-3 text-left text-sm font-medium transition',
                  !show && (OPT_TINTS[oi % 4] + ' hover:brightness-95'),
                  show && isCorrect && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
                  show && picked === oi && !isCorrect && 'border-rose-500 bg-rose-50 dark:bg-rose-950/40',
                  show && !isCorrect && picked !== oi && 'border-slate-200 opacity-50 dark:border-slate-700',
                )}
              >
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {result != null && (
        <>
          {isFill && result === 'wrong' && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('mat.quiz.correctAnswer')}:{' '}
              <b className="text-emerald-600 dark:text-emerald-400">{q.answerText}</b>
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            {q.explanation ? (
              <p className="flex-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                💡 {q.explanation}
              </p>
            ) : (
              <span />
            )}
            <Button onClick={next}>{last ? t('mat.game.again') : t('common.next')}</Button>
          </div>
        </>
      )}
    </>
  )
}

/* --- Blast: на время выбить правильные ответы --- */
const BLAST_SECONDS = 45
function BlastGame({ questions }: { questions: QuizQuestion[] }) {
  const { t } = useI18n()
  const playable = useMemo(
    () => questions.filter((q) => (q.kind ?? 'mcq') !== 'fill' && q.options.length >= 2),
    [questions],
  )
  const [qi, setQi] = useState(0)
  const [left, setLeft] = useState(BLAST_SECONDS)
  const [score, setScore] = useState(0)
  const [right, setRight] = useState(0)
  const [hit, setHit] = useState<{ oi: number; ok: boolean } | null>(null)
  const q = playable[qi % Math.max(1, playable.length)]
  const over = left <= 0 || playable.length === 0

  useEffect(() => {
    if (over) return
    const id = setInterval(() => setLeft((s) => Math.max(0, Math.round((s - 0.1) * 10) / 10)), 100)
    return () => clearInterval(id)
  }, [over])

  const shoot = (oi: number) => {
    if (over || hit) return
    const ok = oi === q.correctIndex
    setHit({ oi, ok })
    if (ok) {
      setScore((s) => s + 10 + Math.round(left))
      setRight((r) => r + 1)
    } else {
      setLeft((s) => Math.max(0, s - 3))
    }
    setTimeout(() => {
      setHit(null)
      setQi((i) => i + 1)
    }, 450)
  }
  const restart = () => {
    setQi(0)
    setLeft(BLAST_SECONDS)
    setScore(0)
    setRight(0)
    setHit(null)
  }

  if (playable.length === 0) return <p className="text-sm text-slate-400">—</p>

  if (over) {
    return (
      <div className="card space-y-3 p-6 text-center">
        <p className="text-2xl">🚀</p>
        <p className="font-semibold text-slate-900 dark:text-white">
          {t('mat.game.blastOver', { s: score, n: right })}
        </p>
        <Button onClick={restart}>{t('mat.game.again')}</Button>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className={cx(left <= 10 ? 'text-rose-600' : 'text-slate-500 dark:text-slate-400')}>
          ⏱ {left.toFixed(1)} {t('mat.game.sec')}
        </span>
        <span className="text-brand-600 dark:text-brand-400">{t('mat.game.score', { n: score })}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-100 ease-linear"
          style={{ width: `${(left / BLAST_SECONDS) * 100}%` }}
        />
      </div>
      <p className="text-base font-semibold text-slate-900 dark:text-white">{q.prompt}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {q.options.map((opt, oi) => {
          const flash = hit?.oi === oi
          return (
            <button
              key={oi}
              onClick={() => shoot(oi)}
              disabled={!!hit}
              className={cx(
                'rounded-2xl border-2 px-4 py-4 text-center text-sm font-semibold transition',
                !hit && OPT_TINTS[oi % 4] + ' hover:scale-[1.02]',
                flash && hit?.ok && 'scale-110 border-emerald-500 bg-emerald-100 dark:bg-emerald-900/50',
                flash && !hit?.ok && 'border-rose-500 bg-rose-100 dark:bg-rose-900/50',
                hit && !flash && 'opacity-40',
              )}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </>
  )
}

/* --- Что лишнее --- */
function OddOneGame({ rounds }: { rounds: OddOneRound[] }) {
  const { t } = useI18n()
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const r = rounds[idx]
  if (!r) return <p className="text-sm text-slate-400">—</p>

  const pick = (i: number) => {
    if (picked != null) return
    setPicked(i)
    if (i === r.oddIndex) setScore((s) => s + 10)
  }
  const last = idx === rounds.length - 1
  const next = () => {
    if (last) {
      setIdx(0)
      setScore(0)
    } else setIdx((i) => i + 1)
    setPicked(null)
  }

  return (
    <>
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>
          {idx + 1} / {rounds.length}
        </span>
        <span className="text-brand-600 dark:text-brand-400">{t('mat.game.score', { n: score })}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {r.items.map((it, i) => {
          const show = picked != null
          const isOdd = i === r.oddIndex
          return (
            <button
              key={i}
              disabled={show}
              onClick={() => pick(i)}
              className={cx(
                'rounded-xl border px-4 py-3 text-sm font-medium transition',
                !show && 'border-slate-200 hover:border-brand-300 dark:border-slate-700',
                show && isOdd && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
                show && picked === i && !isOdd && 'border-rose-500 bg-rose-50 dark:bg-rose-950/40',
                show && !isOdd && picked !== i && 'opacity-50',
              )}
            >
              {it}
            </button>
          )
        })}
      </div>
      {picked != null && (
        <div className="flex items-center justify-between gap-3">
          <p className="flex-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            💡 {r.why}
          </p>
          <Button onClick={next}>{last ? t('mat.game.again') : t('common.next')}</Button>
        </div>
      )}
    </>
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
  const paragraphs = content.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  return (
    <div className="space-y-4">
      {content.keyPoints.length > 0 && (
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
      )}
      <div className="space-y-3">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {p}
          </p>
        ))}
      </div>
    </div>
  )
}
