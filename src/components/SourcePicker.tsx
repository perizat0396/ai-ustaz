import { useRef, useState } from 'react'
import type { ContextSource, Lang, OllamaSettings } from '@/types'
import { cx, formatBytes, uid } from '@/lib/utils'
import { chatComplete, type ChatMsg } from '@/lib/ollama'
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
  ollama,
  ollamaOk,
  lang,
}: {
  sources: ContextSource[]
  onChange: (next: ContextSource[]) => void
  ollama: OllamaSettings
  ollamaOk: boolean | null
  lang: Lang
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState<'file' | 'chat'>('file')
  const add = (s: ContextSource) => onChange([...sources, s])
  const remove = (id: string) => onChange(sources.filter((s) => s.id !== id))

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">{t('gen.dataIntro')}</p>

      <div className="grid grid-cols-2 gap-2">
        {(['file', 'chat'] as const).map((k) => (
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

      {tab === 'file' && <FilePanel add={add} />}
      {tab === 'chat' && <ChatPanel add={add} ollama={ollama} ollamaOk={ollamaOk} lang={lang} />}

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

function ChatPanel({
  add,
  ollama,
  ollamaOk,
  lang,
}: {
  add: (s: ContextSource) => void
  ollama: OllamaSettings
  ollamaOk: boolean | null
  lang: Lang
}) {
  const { t } = useI18n()
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [used, setUsed] = useState<Set<number>>(new Set())

  const send = async () => {
    const q = input.trim()
    if (!q || busy) return
    setErr(null)
    const next: ChatMsg[] = [...msgs, { role: 'user', content: q }]
    setMsgs(next)
    setInput('')
    setBusy(true)
    try {
      const reply = await chatComplete(next, ollama, lang)
      setMsgs([...next, { role: 'assistant', content: reply }])
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('src.chat.intro')}</p>

      {ollamaOk === false && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          {t('src.chat.needAi')}
        </p>
      )}

      {msgs.length > 0 && (
        <div className="mb-3 max-h-96 space-y-3 overflow-y-auto pr-1">
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
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
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
                      detail: ollama.models[lang],
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

      {err && (
        <pre className="mb-2 whitespace-pre-wrap rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {err}
        </pre>
      )}

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
  )
}
