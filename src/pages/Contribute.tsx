import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { ContextSource, GenerationParams, Material } from '@/types'
import { buildMaterial, type GenProgress } from '@/lib/generator'
import { generateFlashcards, generateQuiz, pingOllama } from '@/lib/ollama'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { SourcePicker } from '@/components/SourcePicker'
import { MaterialRenderer } from '@/components/MaterialRenderer'
import { Avatar, Button, EmptyState, Field, Spinner } from '@/components/ui'
import { IconCheck, IconFork, IconSpark } from '@/components/Icon'

function countItems(m: Material): number {
  const c = m.content
  switch (c.kind) {
    case 'quiz':
      return c.questions.length
    case 'flashcards':
      return c.cards.length
    case 'assignment':
      return c.tasks.length
    case 'game':
      return c.pairs.length
    case 'lesson':
      return c.sections.length
    case 'summary':
      return c.keyPoints.length
  }
}

export function Contribute() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { getWork, addContribution, publish, ollama } = useStore()
  const { t, tType, tSubject, tGrade } = useI18n()
  const work = getWork(id)

  const [sources, setSources] = useState<ContextSource[]>([])
  const [note, setNote] = useState('')
  const [count, setCount] = useState(4)
  const [progress, setProgress] = useState<GenProgress | null>(null)
  const [addition, setAddition] = useState<Material | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null)
  useEffect(() => {
    void pingOllama(ollama.baseUrl).then((s) => setOllamaOk(s.ok))
  }, [ollama.baseUrl])

  const baseParams = useMemo<GenerationParams | null>(() => {
    if (!work) return null
    const m = work.material
    const qa = m.content.kind === 'flashcards' && !!m.content.cards[0]?.front.trim().endsWith('?')
    return {
      topic: m.title.replace(/^[^:]+:\s*/, ''),
      type: m.type,
      subject: m.subject,
      institution: m.institution,
      grade: m.grade,
      difficulty: m.difficulty,
      language: m.language,
      count,
      cardStyle: qa ? 'qa' : 'term',
      notes: note,
    }
  }, [work, count, note])

  if (!work || !baseParams) {
    return (
      <EmptyState
        title={t('work.notFound')}
        action={<Button onClick={() => navigate('/community')}>{t('common.toCommunity')}</Button>}
      />
    )
  }

  const m = work.material
  const supported = m.type === 'flashcards' || m.type === 'quiz'

  const runGeneration = async () => {
    setAddition(null)
    setGenError(null)
    setProgress({ percent: 0, label: t('gen.thinking', { model: ollama.models[baseParams.language] }) })
    try {
      let res: Material
      if (baseParams.type === 'quiz') {
        const { questions, model, title } = await generateQuiz(baseParams, sources, ollama)
        res = buildMaterial(baseParams, sources, { kind: 'quiz', questions }, {
          engine: `Ollama · ${model}`,
          title,
        })
      } else {
        const { cards, model, title } = await generateFlashcards(baseParams, sources, ollama)
        res = buildMaterial(baseParams, sources, { kind: 'flashcards', cards }, {
          engine: `Ollama · ${model}`,
          title,
        })
      }
      res.title = `${t('work.contribute')}: ${baseParams.topic}`
      setAddition(res)
    } catch (e) {
      setGenError(e instanceof Error ? e.message : String(e))
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to={`/work/${work.id}`}
        className="text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400"
      >
        ← {t('contribute.backToMaterial')}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('contribute.title')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('contribute.subtitle', {
            title: m.title,
            type: tType(m.type),
            subject: tSubject(m.subject),
            grade: tGrade(m.grade),
          })}
        </p>
      </div>

      <div className="card flex items-center gap-3 p-4">
        <Avatar name={work.author.name} color={work.author.avatarColor} size={36} />
        <div className="text-sm">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {t('contribute.origAuthor', { name: work.author.name })}
          </p>
          <p className="text-xs text-slate-400">{m.summary}</p>
        </div>
      </div>

      {!supported && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          {t('contribute.typeUnsupported')}
        </p>
      )}
      {supported && ollamaOk === false && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          {t('gen.needAi')}
        </p>
      )}

      {!done && supported && (
        <>
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('contribute.newData')}
            </p>
            <SourcePicker
              sources={sources}
              onChange={setSources}
              ollama={ollama}
              ollamaOk={ollamaOk}
              lang={baseParams.language}
            />
          </div>

          <Field label={t('contribute.whatAdding')} hint={t('contribute.whatAddingHint')}>
            <textarea
              className="input-base resize-none"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('contribute.whatAddingPlaceholder')}
            />
          </Field>

          <Field label={t('contribute.howMany', { n: count })}>
            <input
              type="range"
              min={2}
              max={10}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
          </Field>

          <Button onClick={runGeneration} disabled={!!progress || ollamaOk === false}>
            <IconSpark width={15} height={15} /> {t('contribute.genAddition')}
          </Button>

          {progress && (
            <div className="card p-6 text-center">
              <Spinner className="mx-auto text-brand-600" />
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{progress.label}</p>
              <p className="mt-2 text-xs text-slate-400">{t('gen.slowNote')}</p>
            </div>
          )}

          {genError && (
            <pre className="whitespace-pre-wrap rounded-xl bg-rose-50 p-3 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
              {genError}
            </pre>
          )}

          {addition && (
            <div className="space-y-4">
              <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                {t('contribute.previewOf', { n: countItems(addition) })}
              </div>
              <MaterialRenderer material={addition} />

              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={!note.trim()}
                  onClick={() => {
                    addContribution(work.id, note.trim(), countItems(addition))
                    setDone(true)
                  }}
                >
                  <IconFork width={15} height={15} /> {t('contribute.sendToAuthor')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    publish(addition, work)
                    navigate('/community')
                  }}
                >
                  {t('contribute.publishSeparate')}
                </Button>
              </div>
              {!note.trim() && <p className="text-xs text-amber-600">{t('contribute.needNote')}</p>}
            </div>
          )}
        </>
      )}

      {done && (
        <EmptyState
          icon={<IconCheck />}
          title={t('contribute.doneTitle')}
          description={t('contribute.doneDesc', { name: work.author.name })}
          action={
            <div className="flex gap-2">
              <Button onClick={() => navigate(`/work/${work.id}`)}>
                {t('contribute.openMaterial')}
              </Button>
              <Button variant="secondary" onClick={() => navigate('/community')}>
                {t('common.toCommunity')}
              </Button>
            </div>
          }
        />
      )}

      <p className="text-xs text-slate-400">{t('contribute.localNote')}</p>
    </div>
  )
}
