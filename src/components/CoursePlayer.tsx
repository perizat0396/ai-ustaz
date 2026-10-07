import { useMemo, useState, type ReactNode } from 'react'
import type { CourseStep, Lang, Material, MaterialContent, QuizQuestion } from '@/types'
import { checkPractice } from '@/lib/ai'
import { useI18n } from '@/lib/i18n'
import { cx } from '@/lib/utils'
import { Button, Spinner } from './ui'
import { IconArrowLeft, IconArrowRight, IconCheck, IconX } from './Icon'

type Course = Extract<MaterialContent, { kind: 'course' }>
type TheoryStep = Extract<CourseStep, { kind: 'theory' }>
type PracticeStep = Extract<CourseStep, { kind: 'practice' }>

/* ---------------------------- Подсветка кода ---------------------------- */

const KEYWORDS: Record<string, string[]> = {
  python: 'def return if elif else for while in not and or is import from as class try except finally with lambda pass break continue raise yield global True False None print range len input int str float list dict set'.split(' '),
  javascript: 'function return if else for while do switch case break continue const let var new class extends import from export default async await try catch finally throw typeof instanceof true false null undefined this console'.split(' '),
  sql: 'select from where group by order having join inner left right outer on insert into values update set delete create table alter drop and or not null as distinct limit like in is count sum avg min max'.split(' '),
  java: 'public private protected static void class interface extends implements return if else for while do switch case break continue new try catch finally throw throws int long double float boolean char String true false null this import package final'.split(' '),
  cpp: 'int long double float bool char void string include using namespace std return if else for while do switch case break continue new delete class struct public private const true false nullptr cout cin endl'.split(' '),
  pascal: 'program var begin end if then else for to downto do while repeat until function procedure integer real string boolean true false readln writeln read write array of const type'.split(' '),
}

const ALIASES: Record<string, string> = {
  py: 'python', python3: 'python',
  js: 'javascript', ts: 'javascript', typescript: 'javascript', jsx: 'javascript', node: 'javascript',
  'c++': 'cpp', c: 'cpp', 'c#': 'java', csharp: 'java', cs: 'java', kotlin: 'java',
  'html/css': 'html', css: 'html', html: 'html',
}

const FILE_NAMES: Record<string, string> = {
  python: 'main.py', javascript: 'script.js', html: 'index.html', sql: 'query.sql',
  java: 'Main.java', cpp: 'main.cpp', pascal: 'program.pas',
}

const normLang = (l: string) => {
  const k = l.toLowerCase().trim()
  return ALIASES[k] ?? k
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Лёгкий подсветчик без внешних библиотек: комментарии, строки, числа, ключевые слова, вызовы, теги. */
function highlight(code: string, langRaw: string): ReactNode[] {
  const lang = normLang(langRaw)
  const isHtml = lang === 'html'
  const comment =
    lang === 'python' ? '#[^\\n]*'
    : lang === 'sql' ? '--[^\\n]*|/\\*[\\s\\S]*?\\*/'
    : lang === 'pascal' ? '//[^\\n]*|\\{[\\s\\S]*?\\}|\\(\\*[\\s\\S]*?\\*\\)'
    : isHtml ? '<!--[\\s\\S]*?-->|/\\*[\\s\\S]*?\\*/'
    : '//[^\\n]*|/\\*[\\s\\S]*?\\*/'
  const string = '"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'' + (lang === 'javascript' ? '|`(?:\\\\.|[^`\\\\])*`' : '')
  const kws = KEYWORDS[lang]
  const kw = kws ? `\\b(?:${kws.map(esc).join('|')})\\b` : '(?!)'
  const tag = isHtml ? '</?[A-Za-z][\\w-]*|/?>' : '(?!)'
  const re = new RegExp(
    `(${comment})|(${string})|(${tag})|(\\b\\d+(?:\\.\\d+)?\\b)|(${kw})|(\\b[A-Za-z_]\\w*(?=\\())`,
    lang === 'sql' || lang === 'pascal' ? 'gi' : 'g',
  )
  const cls = [
    'italic text-slate-500', // комментарий
    'text-emerald-300', // строка
    'text-rose-300', // тег
    'text-amber-300', // число
    'font-medium text-violet-300', // ключевое слово
    'text-sky-300', // вызов функции
  ]
  const out: ReactNode[] = []
  let last = 0
  for (const m of code.matchAll(re)) {
    const i = m.index ?? 0
    if (i > last) out.push(code.slice(last, i))
    const g = m.slice(1).findIndex((x) => x !== undefined)
    out.push(
      <span key={i} className={cls[g]}>
        {m[0]}
      </span>,
    )
    last = i + m[0].length
  }
  if (last < code.length) out.push(code.slice(last))
  return out
}

/* ------------------------------ Текст и код ----------------------------- */

/** **жирное** и `код` в строке; переносы строк сохраняются. */
function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cx('space-y-2.5', className)}>
      {text.split('\n').map((line, i) => (
        <p key={i}>
          {line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
              return (
                <strong key={j} className="font-semibold text-slate-900 dark:text-white">
                  {part.slice(2, -2)}
                </strong>
              )
            if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
              return (
                <code
                  key={j}
                  className="rounded-md bg-brand-500/10 px-1.5 py-0.5 font-mono text-[0.85em] font-medium text-brand-700 dark:text-brand-300"
                >
                  {part.slice(1, -1)}
                </code>
              )
            return part
          })}
        </p>
      ))}
    </div>
  )
}

/** «Окно редактора» — тёмная панель с точками, именем файла и (опционально) действием справа. */
function EditorFrame({
  fileName,
  right,
  children,
}: {
  fileName: string
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0b1020] shadow-lg shadow-black/20">
      <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.03] px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-rose-400/80" />
        <span className="size-2.5 rounded-full bg-amber-400/80" />
        <span className="size-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-2 font-mono text-[11px] text-slate-400">{fileName}</span>
        <span className="ml-auto">{right}</span>
      </div>
      {children}
    </div>
  )
}

/** Код всегда в отдельном тёмном блоке (моноширинный шрифт, номера строк, подсветка) — не смешивается с текстом. */
function CodeBlock({ code, language, caption }: { code: string; language: string; caption?: string }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const lines = code.split('\n')
  const lang = normLang(language)
  const nodes = useMemo(() => highlight(code, language), [code, language])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* буфер обмена недоступен — молча пропускаем */
    }
  }
  return (
    <figure>
      <EditorFrame
        fileName={FILE_NAMES[lang] ?? language ?? 'code'}
        right={
          <button
            onClick={copy}
            className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            {copied ? `✓ ${t('course.copied')}` : t('course.copy')}
          </button>
        }
      >
        <div className="flex overflow-x-auto">
          <div
            aria-hidden
            className="select-none border-r border-white/5 py-4 pl-4 pr-3 text-right font-mono text-[13px] leading-6 text-slate-600"
          >
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <pre className="flex-1 py-4 pl-4 pr-5 font-mono text-[13px] leading-6 text-slate-200">
            <code>{nodes}</code>
          </pre>
        </div>
      </EditorFrame>
      {caption && <figcaption className="mt-2 px-1 text-xs text-slate-500 dark:text-slate-400">{caption}</figcaption>}
    </figure>
  )
}

const TONES: Record<NonNullable<TheoryStep['tone']>, { emoji: string; key: string; box: string; label: string }> = {
  tip: {
    emoji: '💡', key: 'course.tip',
    box: 'border-amber-400 bg-amber-50 dark:bg-amber-400/[0.07]',
    label: 'text-amber-700 dark:text-amber-300',
  },
  fact: {
    emoji: '🤯', key: 'course.fact',
    box: 'border-sky-400 bg-sky-50 dark:bg-sky-400/[0.07]',
    label: 'text-sky-700 dark:text-sky-300',
  },
  warning: {
    emoji: '⚠️', key: 'course.warning',
    box: 'border-rose-400 bg-rose-50 dark:bg-rose-400/[0.07]',
    label: 'text-rose-700 dark:text-rose-300',
  },
  example: {
    emoji: '🧪', key: 'course.example',
    box: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-400/[0.07]',
    label: 'text-emerald-700 dark:text-emerald-300',
  },
}

/** Карточка шага: мягкая тень, скруглённые углы, цветное «свечение» в углу. */
function Card({ glow = 'bg-brand-500/10', children }: { glow?: string; children: ReactNode }) {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-brand-500/[0.06] dark:border-slate-800 dark:bg-slate-900 sm:p-8">
      <div className={cx('pointer-events-none absolute -right-20 -top-20 size-64 rounded-full blur-3xl', glow)} />
      <div className="relative space-y-5">{children}</div>
    </article>
  )
}

function KindChip({ emoji, label, tone }: { emoji: string; label: string; tone: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest', tone)}>
      <span className="text-sm normal-case">{emoji}</span> {label}
    </span>
  )
}

/* -------------------------------- Теория -------------------------------- */

function TheoryCard({ step }: { step: TheoryStep }) {
  const { t } = useI18n()
  const tone = step.tone ? TONES[step.tone] : null
  return (
    <Card>
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-violet-500/20 text-4xl ring-1 ring-brand-500/25">
          {step.emoji}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
            {t('course.theory')}
          </p>
          <h3 className="font-display text-2xl font-bold leading-tight text-slate-900 dark:text-white">
            {step.title}
          </h3>
        </div>
      </div>

      <RichText text={step.body} className="text-[17px] leading-8 text-slate-600 dark:text-slate-300" />

      {step.code && <CodeBlock {...step.code} />}

      {step.callout && (
        <div className={cx('flex gap-3 rounded-2xl border-l-4 p-4', tone?.box ?? TONES.tip.box)}>
          <span className="text-2xl leading-none">{tone?.emoji ?? '💡'}</span>
          <div className="text-sm leading-6 text-slate-700 dark:text-slate-200">
            <p className={cx('text-[11px] font-bold uppercase tracking-widest', tone?.label ?? TONES.tip.label)}>
              {t(tone?.key ?? 'course.tip')}
            </p>
            <RichText text={step.callout} className="mt-1" />
          </div>
        </div>
      )}
    </Card>
  )
}

/* -------------------------------- Вопрос -------------------------------- */

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .replace(/^[«"'(]+|[.,;:!?»"')]+$/g, '')

function ResultBanner({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <div
      className={cx(
        'flex gap-3 rounded-2xl border p-4 text-sm leading-6',
        ok
          ? 'border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-400/[0.08] dark:text-emerald-100'
          : 'border-rose-300/70 bg-rose-50 text-rose-900 dark:border-rose-400/30 dark:bg-rose-400/[0.08] dark:text-rose-100',
      )}
    >
      <span
        className={cx(
          'grid size-8 shrink-0 place-items-center rounded-full text-white',
          ok ? 'bg-emerald-500' : 'bg-rose-500',
        )}
      >
        {ok ? <IconCheck width={16} height={16} /> : <IconX width={16} height={16} />}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function QuizCard({ q, onDone }: { q: QuizQuestion; onDone: (firstTry: boolean) => void }) {
  const { t } = useI18n()
  const isFill = q.kind === 'fill'
  const [selected, setSelected] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [checked, setChecked] = useState(false)
  const [ok, setOk] = useState(false)

  const canCheck = !checked && (isFill ? text.trim().length > 0 : selected !== null)
  const check = () => {
    const good = isFill ? norm(text) === norm(q.answerText ?? '') : selected === q.correctIndex
    setOk(good)
    setChecked(true)
    onDone(good)
  }

  return (
    <Card glow="bg-teal-400/10">
      <KindChip
        emoji="🎯"
        label={t('course.question')}
        tone="bg-teal-500/10 text-teal-700 dark:text-teal-300"
      />
      <p className="font-display text-xl font-semibold leading-snug text-slate-900 dark:text-white">{q.prompt}</p>

      {isFill ? (
        <input
          className="input-base !rounded-2xl !py-3.5 !text-base"
          value={text}
          disabled={checked}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canCheck && check()}
          placeholder={t('course.fillPlaceholder')}
        />
      ) : (
        <div className="space-y-2.5">
          {q.options.map((o, i) => {
            const isRight = checked && i === q.correctIndex
            const isWrong = checked && selected === i && i !== q.correctIndex
            return (
              <button
                key={i}
                disabled={checked}
                onClick={() => setSelected(i)}
                className={cx(
                  'group flex w-full items-center gap-3.5 rounded-2xl border-2 p-3.5 text-left transition duration-150',
                  isRight && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-400/10',
                  isWrong && 'border-rose-500 bg-rose-50 dark:bg-rose-400/10',
                  !checked && selected === i && 'border-brand-500 bg-brand-500/[0.06] shadow-md shadow-brand-500/10',
                  !checked && selected !== i && 'border-slate-200 hover:-translate-y-px hover:border-brand-300 hover:shadow-sm dark:border-slate-700 dark:hover:border-brand-500/60',
                  checked && !isRight && !isWrong && 'border-slate-200 opacity-50 dark:border-slate-800',
                )}
              >
                <span
                  className={cx(
                    'grid size-8 shrink-0 place-items-center rounded-xl text-sm font-bold transition',
                    isRight
                      ? 'bg-emerald-500 text-white'
                      : isWrong
                        ? 'bg-rose-500 text-white'
                        : !checked && selected === i
                          ? 'bg-brand-500 text-white'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-brand-500/10 group-hover:text-brand-600 dark:bg-slate-800 dark:text-slate-400',
                  )}
                >
                  {isRight ? <IconCheck width={15} height={15} /> : isWrong ? <IconX width={15} height={15} /> : String.fromCharCode(65 + i)}
                </span>
                <span className="text-[15px] leading-snug text-slate-800 dark:text-slate-200">{o}</span>
              </button>
            )
          })}
        </div>
      )}

      {checked && (
        <ResultBanner ok={ok}>
          <p className="font-bold">{ok ? t('course.correct') : t('course.wrong')}</p>
          {!ok && (
            <p className="mt-0.5">
              <b>{t('course.correctAnswer')}:</b> {isFill ? q.answerText : q.options[q.correctIndex]}
            </p>
          )}
          {q.explanation && <p className="mt-1 opacity-90">{q.explanation}</p>}
        </ResultBanner>
      )}

      {!checked && (
        <Button size="lg" onClick={check} disabled={!canCheck}>
          {t('course.check')}
        </Button>
      )}
    </Card>
  )
}

/* -------------------------------- Практика ------------------------------- */

function PracticeCard({
  step,
  courseLang,
  onDone,
}: {
  step: PracticeStep
  courseLang: Lang
  onDone: (firstTry: boolean) => void
}) {
  const { t } = useI18n()
  const isCode = step.language !== 'text'
  const [code, setCode] = useState(step.starterCode ?? '')
  const [attempts, setAttempts] = useState(0)
  const [status, setStatus] = useState<'idle' | 'checking' | 'wrong' | 'correct' | 'revealed'>('idle')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const finished = status === 'correct' || status === 'revealed'
  const lang = normLang(step.language)

  const submit = async () => {
    if (!code.trim()) {
      setError(t('course.needAnswer'))
      return
    }
    setError('')
    setStatus('checking')
    try {
      const res = await checkPractice({
        lang: courseLang,
        language: step.language,
        task: step.task,
        solution: step.solution,
        answer: code,
      })
      setFeedback(res.feedback)
      if (res.correct) {
        setStatus('correct')
        onDone(attempts === 0)
      } else {
        setAttempts((a) => a + 1)
        setStatus('wrong')
      }
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t('course.checkFailed'))
      setStatus('idle')
    }
  }

  const reveal = () => {
    setStatus('revealed')
    onDone(false)
  }

  return (
    <Card glow="bg-violet-500/10">
      <KindChip emoji="🛠️" label={t('course.practice')} tone="bg-violet-500/10 text-violet-700 dark:text-violet-300" />
      <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">{step.title}</h3>
      <RichText text={step.task} className="text-[16px] leading-7 text-slate-600 dark:text-slate-300" />

      {isCode ? (
        <EditorFrame fileName={FILE_NAMES[lang] ?? step.language}>
          <textarea
            value={code}
            disabled={finished}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            rows={Math.min(16, Math.max(7, code.split('\n').length + 1))}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Tab') return
              e.preventDefault()
              const el = e.currentTarget
              const s = el.selectionStart
              setCode(el.value.slice(0, s) + '  ' + el.value.slice(el.selectionEnd))
              requestAnimationFrame(() => {
                el.selectionStart = el.selectionEnd = s + 2
              })
            }}
            placeholder={t('course.codePlaceholder')}
            className="block w-full resize-y bg-transparent p-4 font-mono text-[13px] leading-6 text-slate-100 outline-none placeholder:text-slate-600 disabled:opacity-70"
          />
        </EditorFrame>
      ) : (
        <textarea
          value={code}
          disabled={finished}
          rows={4}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t('course.textPlaceholder')}
          className="input-base !rounded-2xl resize-y !text-base"
        />
      )}

      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      {status === 'wrong' && (
        <ResultBanner ok={false}>
          <p className="font-bold">{t('course.wrong')}</p>
          <RichText text={feedback} className="mt-1" />
          {step.hint && attempts >= 1 && (
            <p className="mt-2.5 rounded-xl bg-white/70 px-3 py-2 text-[13px] dark:bg-white/[0.06]">
              💡 <b>{t('course.hint')}:</b> {step.hint}
            </p>
          )}
        </ResultBanner>
      )}

      {status === 'correct' && (
        <ResultBanner ok>
          <p className="font-bold">{t('course.correct')}</p>
          <RichText text={feedback} className="mt-1" />
        </ResultBanner>
      )}

      {finished && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {t('course.solution')}
          </p>
          {isCode ? (
            <CodeBlock code={step.solution} language={step.language} />
          ) : (
            <RichText
              text={step.solution}
              className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 dark:bg-slate-800/60"
            />
          )}
          {step.explanation && (
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              <b>{t('course.whyExplain')}:</b> {step.explanation}
            </p>
          )}
        </div>
      )}

      {!finished && (
        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={submit} disabled={status === 'checking'}>
            {status === 'checking' ? (
              <>
                <Spinner /> {t('course.checking')}
              </>
            ) : status === 'wrong' ? (
              t('course.retry')
            ) : (
              t('course.check')
            )}
          </Button>
          {attempts >= 2 && (
            <Button size="lg" variant="secondary" onClick={reveal} disabled={status === 'checking'}>
              {t('course.showSolution')}
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

/* -------------------------------- Плеер --------------------------------- */

const SEG_DONE: Record<CourseStep['kind'], string> = {
  theory: 'bg-brand-500',
  quiz: 'bg-teal-400',
  practice: 'bg-violet-400',
}

function Stat({ emoji, children }: { emoji: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/15 backdrop-blur">
      <span>{emoji}</span>
      {children}
    </span>
  )
}

/** Кольцо результата (SVG) для финального экрана. */
function ScoreRing({ value, total }: { value: number; total: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  const pct = total > 0 ? value / total : 1
  return (
    <div className="relative mx-auto size-36">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-slate-200 dark:stroke-slate-800" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke="url(#ring)"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-none">
          <span className="font-display text-4xl font-extrabold text-slate-900 dark:text-white">{value}</span>
          <span className="text-lg font-semibold text-slate-400"> / {total}</span>
        </div>
      </div>
    </div>
  )
}

export function CoursePlayer({ material, content }: { material: Material; content: Course }) {
  const { t, tTitle } = useI18n()
  const steps = content.steps
  const [index, setIndex] = useState(-1) // -1 — обложка, steps.length — финиш
  const [solved, setSolved] = useState<Record<string, boolean>>({})
  const [firstTry, setFirstTry] = useState<Record<string, boolean>>({})

  const interactive = steps.filter((s) => s.kind !== 'theory')
  const nTheory = steps.length - interactive.length
  const nQuiz = steps.filter((s) => s.kind === 'quiz').length
  const nPractice = steps.filter((s) => s.kind === 'practice').length
  const minutes = Math.max(3, Math.round(nTheory * 1 + nQuiz * 0.5 + nPractice * 3))
  const score = interactive.filter((s) => firstTry[s.id]).length
  const current = index >= 0 && index < steps.length ? steps[index] : null
  const canNext = !current || current.kind === 'theory' || solved[current.id]

  const done = (id: string) => (ok: boolean) => {
    setSolved((s) => ({ ...s, [id]: true }))
    setFirstTry((f) => (id in f ? f : { ...f, [id]: ok }))
  }

  if (index === -1) {
    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-brand-500/10 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-[#0f0a3c] px-6 py-12 text-center sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-violet-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -right-16 size-80 rounded-full bg-sky-400/20 blur-3xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="relative">
            <span className="mx-auto grid size-20 place-items-center rounded-3xl bg-white/10 text-5xl ring-1 ring-white/20 backdrop-blur">
              🎓
            </span>
            <h2 className="font-display mx-auto mt-5 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
              {tTitle(material)}
            </h2>
            {content.intro && (
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-indigo-100/90">{content.intro}</p>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Stat emoji="📖">{t('course.stat.cards', { n: nTheory })}</Stat>
              {nQuiz > 0 && <Stat emoji="🎯">{t('course.stat.questions', { n: nQuiz })}</Stat>}
              {nPractice > 0 && <Stat emoji="🛠️">{t('course.stat.practice', { n: nPractice })}</Stat>}
              <Stat emoji="⏱️">{t('course.stat.minutes', { n: minutes })}</Stat>
            </div>
          </div>
        </div>
        <div className="flex justify-center p-6">
          <Button size="lg" className="min-w-52" onClick={() => setIndex(0)}>
            {t('course.start')} <IconArrowRight width={16} height={16} />
          </Button>
        </div>
      </div>
    )
  }

  if (index >= steps.length) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-brand-500/10 dark:border-slate-800 dark:bg-slate-900 sm:p-12">
        <div className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="relative">
          <div className="text-5xl">🏆</div>
          <h2 className="font-display mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
            {t('course.finishTitle')}
          </h2>
          {interactive.length > 0 && (
            <div className="mt-6">
              <ScoreRing value={score} total={interactive.length} />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                {t('course.finishScore', { a: score, b: interactive.length })}
              </p>
            </div>
          )}
          <Button
            className="mt-7"
            size="lg"
            variant="secondary"
            onClick={() => {
              setSolved({})
              setFirstTry({})
              setIndex(-1)
            }}
          >
            {t('course.restart')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2.5 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="truncate pr-3">{tTitle(material)}</span>
          <span className="shrink-0 tabular-nums">{t('course.step', { a: index + 1, b: steps.length })}</span>
        </div>
        <div className="flex gap-1">
          {steps.map((s, i) => (
            <span
              key={s.id}
              className={cx(
                'h-1.5 flex-1 rounded-full transition-all duration-300',
                i < index
                  ? SEG_DONE[s.kind]
                  : i === index
                    ? 'bg-brand-400 shadow-[0_0_10px_rgba(129,140,248,0.7)]'
                    : 'bg-slate-200 dark:bg-slate-700/60',
              )}
            />
          ))}
        </div>
      </div>

      {/* Все шаги смонтированы, видим только текущий — ответы не теряются при возврате назад. */}
      {steps.map((s, i) => (
        <div key={s.id} hidden={i !== index} className={i === index ? 'animate-fade-in-up' : undefined}>
          {s.kind === 'theory' && <TheoryCard step={s} />}
          {s.kind === 'quiz' && <QuizCard q={s.question} onDone={done(s.id)} />}
          {s.kind === 'practice' && (
            <PracticeCard step={s} courseLang={material.language} onDone={done(s.id)} />
          )}
        </div>
      ))}

      <div className="flex items-center justify-between gap-3">
        <Button size="lg" variant="secondary" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          <IconArrowLeft width={15} height={15} /> {t('course.back')}
        </Button>
        <Button size="lg" disabled={!canNext} onClick={() => setIndex((i) => i + 1)}>
          {t('course.next')} <IconArrowRight width={15} height={15} />
        </Button>
      </div>
    </div>
  )
}
