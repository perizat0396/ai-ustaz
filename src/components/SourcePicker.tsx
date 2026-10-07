import { useRef, useState, type ReactNode } from 'react'
import type { ContextSource, Lang } from '@/types'
import { cx, formatBytes, uid } from '@/lib/utils'
import { chatComplete, type ChatMsg } from '@/lib/ai'
import { useI18n } from '@/lib/i18n'
import { Button, Spinner } from './ui'
import { IconCheck, IconFile, IconPlus, IconSpark, IconTrash, IconUpload } from './Icon'

const TEXT_LIKE = /\.(txt|md|csv|json|rtf|html?|xml|tex|srt|vtt|log)$/i

async function readFile(file: File): Promise<{ text: string; ok: boolean }> {
  const name = file.name.toLowerCase()
  try {
    if (TEXT_LIKE.test(name) || file.type.startsWith('text/')) {
      const t = (await file.text()).slice(0, 12_000)
      return { text: t, ok: t.trim().length > 10 }
    }
    if (name.endsWith('.pdf') || file.type === 'application/pdf') {
      const { extractPdf } = await import('@/lib/extract')
      const t = await extractPdf(file)
      return { text: t, ok: t.trim().length > 20 }
    }
    if (name.endsWith('.docx')) {
      const { extractDocx } = await import('@/lib/extract')
      const t = await extractDocx(file)
      return { text: t, ok: t.trim().length > 20 }
    }
  } catch {
    /* fall through */
  }
  return { text: '', ok: false }
}

export function SourcePicker({
  sources,
  onChange,
  lang,
}: {
  sources: ContextSource[]
  onChange: (next: ContextSource[]) => void
  lang: Lang
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState<'chat' | 'file'>('chat')
  const add = (s: ContextSource) => onChange([...sources, s])
  const remove = (id: string) => onChange(sources.filter((s) => s.id !== id))

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">{t('gen.dataIntro')}</p>

      <div className="grid grid-cols-2 gap-2">
        {(['chat', 'file'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cx(
              'rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
              tab === k
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700',
            )}
          >
            {k === 'file' ? '📄 ' : '💬 '}
            {t(`src.tab.${k}`)}
          </button>
        ))}
      </div>

      {tab === 'chat' && <ChatPanel add={add} lang={lang} />}
      {tab === 'file' && <FilePanel add={add} />}

      {sources.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t('src.added', { n: sources.length })}
          </p>
          <ul className="space-y-2">
            {sources.map((s) => (
              <li
                key={s.id}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="mt-0.5 text-slate-400">
                  {s.kind === 'file' ? (
                    <IconFile width={16} height={16} />
                  ) : s.kind === 'search' ? (
                    <IconSpark width={16} height={16} />
                  ) : (
                    <IconPlus width={16} height={16} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                    {s.title}
                  </p>
                  <p className="truncate text-xs text-slate-400">{s.detail}</p>
                  <p className="mt-1 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">
                    {s.excerpt}
                  </p>
                </div>
                <button
                  onClick={() => remove(s.id)}
                  className="rounded-lg p-1.5 text-slate-300 hover:text-rose-500"
                  aria-label="×"
                >
                  <IconTrash width={16} height={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function FilePanel({ add }: { add: (s: ContextSource) => void }) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState('')

  const handle = async (files: File[]) => {
    setBusy(true)
    for (const f of files) {
      const { text: extracted, ok } = await readFile(f)
      add({
        id: uid('src'),
        kind: 'file',
        title: f.name,
        detail: ok ? t('src.file.extracted', { n: extracted.length }) : t('src.file.noText'),
        excerpt: ok ? extracted : `[${f.name}, ${formatBytes(f.size)}]`,
        addedAt: Date.now(),
      })
    }
    setBusy(false)
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          void handle(Array.from(e.dataTransfer.files))
        }}
        onClick={() => inputRef.current?.click()}
        className={cx(
          'flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition',
          drag
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950'
            : 'border-slate-300 hover:border-brand-400 dark:border-slate-700',
        )}
      >
        <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
          {busy ? <Spinner /> : <IconUpload width={20} height={20} />}
        </span>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('ctx.dropFiles')}</p>
        <p className="text-xs text-slate-400">{t('src.file.hint')} · TXT, MD, PDF, DOCX</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handle(Array.from(e.target.files))
            e.target.value = ''
          }}
        />
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">{t('src.paste')}</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={t('ctx.ownInfoPlaceholder')}
          className="input-base resize-none"
        />
        <Button
          size="sm"
          variant="secondary"
          className="mt-2"
          disabled={!text.trim()}
          onClick={() => {
            add({
              id: uid('src'),
              kind: 'note',
              title: t('ctx.note'),
              detail: '—',
              excerpt: text.trim(),
              addedAt: Date.now(),
            })
            setText('')
          }}
        >
          <IconPlus width={14} height={14} /> {t('ctx.add')}
        </Button>
      </div>
    </div>
  )
}

/** Что включить в материал — чекбоксы в форме-опроснике. */
const INCLUDE_KEYS = ['definitions', 'facts', 'examples', 'dates', 'formulas', 'terms', 'questions', 'misconceptions'] as const
/** Объём ответа. */
const VOLUME_KEYS = ['short', 'detailed', 'max'] as const
/** Готовые уточнения после ответа — педагогу не нужно придумывать формулировку. */
const FOLLOWUP_KEYS = ['more', 'examples', 'simpler', 'deeper', 'questions', 'table'] as const

/**
 * Собирает из ответов формы подробный запрос к ИИ: учителю не нужно уметь
 * писать промты — достаточно ответить на вопросы.
 */
function buildGuidedPrompt(
  f: { topic: string; audience: string; goal: string; include: Set<string>; volume: string; extra: string },
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const lines = [t('src.q.prompt.topic', { v: f.topic.trim() })]
  if (f.audience.trim()) lines.push(t('src.q.prompt.audience', { v: f.audience.trim() }))
  if (f.goal.trim()) lines.push(t('src.q.prompt.goal', { v: f.goal.trim() }))
  if (f.include.size) {
    lines.push(
      t('src.q.prompt.include', {
        v: INCLUDE_KEYS.filter((k) => f.include.has(k)).map((k) => t(`src.q.inc.${k}`)).join(', '),
      }),
    )
  }
  lines.push(t(`src.q.prompt.volume.${f.volume}`))
  if (f.extra.trim()) lines.push(t('src.q.prompt.extra', { v: f.extra.trim() }))
  return lines.join('\n')
}

/** **жирный** и *курсив* внутри строки. */
function inlineMd(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={i} className="font-semibold text-slate-900 dark:text-white">
        {part.slice(2, -2)}
      </strong>
    ) : part.startsWith('*') && part.endsWith('*') && part.length > 2 ? (
      <em key={i}>{part.slice(1, -1)}</em>
    ) : (
      part
    ),
  )
}

/**
 * Ответ ИИ приходит в Markdown (заголовки, списки, **жирный**) — показываем
 * его оформленным, а не со значками. В источники уходит исходный текст.
 */
function ChatAnswer({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 leading-relaxed">
      {text.split('\n').map((raw, i) => {
        const line = raw.trimEnd()
        if (!line.trim()) return <div key={i} className="h-1" />
        const h = line.match(/^#{1,6}\s+(.*)$/)
        if (h) {
          return (
            <p key={i} className="pt-2 font-bold text-slate-900 dark:text-white">
              {inlineMd(h[1])}
            </p>
          )
        }
        if (/^\s*([-*_]\s*){3,}$/.test(line)) return <hr key={i} className="border-slate-200 dark:border-slate-700" />
        const li = line.match(/^(\s*)([-*•]|\d+[.)])\s+(.*)$/)
        if (li) {
          const indent = Math.min(3, Math.floor(li[1].length / 2))
          const marker = /\d/.test(li[2]) ? li[2] : '•'
          return (
            <div key={i} className="flex gap-2" style={{ paddingLeft: `${indent * 1.25}rem` }}>
              <span className="shrink-0 text-slate-400">{marker}</span>
              <span>{inlineMd(li[3])}</span>
            </div>
          )
        }
        return <p key={i}>{inlineMd(line)}</p>
      })}
    </div>
  )
}

const chipCls = (active: boolean) =>
  cx(
    'rounded-full border px-3 py-1 text-xs font-medium transition',
    active
      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200'
      : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300',
  )

function ChatPanel({ add, lang }: { add: (s: ContextSource) => void; lang: Lang }) {
  const { t } = useI18n()
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [used, setUsed] = useState<Set<number>>(new Set())

  // Форма-опросник
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [goal, setGoal] = useState('')
  const [include, setInclude] = useState<Set<string>>(new Set(['definitions', 'facts', 'examples']))
  const [volume, setVolume] = useState<string>('detailed')
  const [extra, setExtra] = useState('')

  const ask = async (q: string) => {
    if (!q.trim() || busy) return
    setErr(null)
    const next: ChatMsg[] = [...msgs, { role: 'user', content: q.trim() }]
    setMsgs(next)
    setBusy(true)
    try {
      const reply = await chatComplete(next, lang)
      setMsgs([...next, { role: 'assistant', content: reply }])
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const send = () => {
    const q = input.trim()
    if (!q) return
    setInput('')
    void ask(q)
  }

  const toggleInclude = (k: string) =>
    setInclude((prev) => {
      const n = new Set(prev)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })

  const lastIsAssistant = msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant'
  const labelCls = 'mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300'

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{t('src.chat.intro')}</p>

      {/* Опросник: заполняется вместо написания промта */}
      <form
        className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/40"
        onSubmit={(e) => {
          e.preventDefault()
          void ask(buildGuidedPrompt({ topic, audience, goal, include, volume, extra }, t))
        }}
      >
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('src.q.title')}</p>

        <label className="block">
          <span className={labelCls}>{t('src.q.topic')} *</span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t('src.q.topicPh')}
            className="input-base"
            required
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>{t('src.q.audience')}</span>
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder={t('src.q.audiencePh')}
              className="input-base"
            />
          </label>
          <label className="block">
            <span className={labelCls}>{t('src.q.goal')}</span>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={t('src.q.goalPh')}
              className="input-base"
            />
          </label>
        </div>

        <div>
          <span className={labelCls}>{t('src.q.include')}</span>
          <div className="flex flex-wrap gap-2">
            {INCLUDE_KEYS.map((k) => (
              <button key={k} type="button" onClick={() => toggleInclude(k)} className={chipCls(include.has(k))}>
                {include.has(k) && '✓ '}
                {t(`src.q.inc.${k}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={labelCls}>{t('src.q.volume')}</span>
          <div className="flex flex-wrap gap-2">
            {VOLUME_KEYS.map((k) => (
              <button key={k} type="button" onClick={() => setVolume(k)} className={chipCls(volume === k)}>
                {t(`src.q.vol.${k}`)}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className={labelCls}>{t('src.q.extra')}</span>
          <textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            rows={2}
            placeholder={t('src.q.extraPh')}
            className="input-base resize-none"
          />
        </label>

        <Button type="submit" disabled={busy || !topic.trim()}>
          {busy ? <Spinner /> : <IconSpark width={15} height={15} />} {t('src.q.submit')}
        </Button>
      </form>

      {msgs.length > 0 && (
        <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
          {msgs.map((m, i) => (
            <div
              key={i}
              className={cx(
                'rounded-xl p-3 text-sm',
                m.role === 'user'
                  ? 'bg-brand-50 text-slate-800 dark:bg-brand-500/10 dark:text-slate-100'
                  : 'bg-slate-50 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
              )}
            >
              {m.role === 'assistant' ? (
                <ChatAnswer text={m.content} />
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              )}
              {m.role === 'assistant' && (
                <Button
                  size="sm"
                  variant={used.has(i) ? 'ghost' : 'primary'}
                  className="mt-2"
                  disabled={used.has(i)}
                  onClick={() => {
                    add({
                      id: uid('src'),
                      kind: 'search',
                      title: t('src.tab.chat'),
                      detail: 'AI Ustaz',
                      excerpt: m.content,
                      addedAt: Date.now(),
                    })
                    setUsed((s) => new Set(s).add(i))
                  }}
                >
                  {used.has(i) ? (
                    <>
                      <IconCheck width={14} height={14} /> {t('src.chat.used')}
                    </>
                  ) : (
                    t('src.chat.use')
                  )}
                </Button>
              )}
            </div>
          ))}
          {busy && <p className="text-xs text-slate-400">{t('src.chat.thinking')}</p>}
        </div>
      )}

      {/* Быстрые уточнения к последнему ответу */}
      {lastIsAssistant && !busy && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">{t('src.fu.title')}</p>
          <div className="flex flex-wrap gap-2">
            {FOLLOWUP_KEYS.map((k) => (
              <button key={k} type="button" onClick={() => void ask(t(`src.fu.${k}.prompt`))} className={chipCls(false)}>
                {t(`src.fu.${k}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {err && (
        <pre className="whitespace-pre-wrap rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {err}
        </pre>
      )}

      <div>
        <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">{t('src.chat.free')}</p>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={t('src.chat.placeholder')}
            className="input-base"
            disabled={busy}
          />
          <Button onClick={send} disabled={busy || !input.trim()}>
            {busy ? <Spinner /> : t('src.chat.send')}
          </Button>
        </div>
      </div>
    </div>
  )
}
