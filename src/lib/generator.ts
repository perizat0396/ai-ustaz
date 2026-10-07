import type { ContextSource, GenerationParams, Material, MaterialContent } from '@/types'
import { extractKeywords, uid } from './utils'

/* --------------------------------------------------------------------------
 *  Сборка объекта Material из содержимого, полученного от ИИ (src/lib/ai.ts).
 * ----------------------------------------------------------------------- */

export interface GenProgress {
  percent: number
  label: string
}

function corpusFrom(params: GenerationParams, sources: ContextSource[]): string {
  return [params.topic, params.notes, ...sources.map((s) => s.excerpt)].join('\n')
}

/** Запасной заголовок, если модель не прислала свой. */
function fallbackTitle(params: GenerationParams, keywords: string[]): string {
  const kk = params.language === 'kk'
  const topic = params.topic?.trim() || keywords[0] || (kk ? 'Жаңа тақырып' : 'Новая тема')
  if (params.type === 'quiz') return kk ? `${topic}: тест` : `Тест: ${topic}`
  return kk ? `${topic}: флешкарталар` : `${topic}: флешкарты`
}

export function buildMaterial(
  params: GenerationParams,
  sources: ContextSource[],
  content: MaterialContent,
  opts: { engine: string; title?: string; keywords?: string[] },
): Material {
  const { engine, keywords } = opts
  const kk = params.language === 'kk'
  const kw = keywords ?? extractKeywords(corpusFrom(params, sources), 12)
  const tags = Array.from(new Set([params.subject, ...kw.slice(0, 4)].filter(Boolean))).map((t) =>
    t.toLowerCase(),
  )
  const title = opts.title?.trim() || fallbackTitle(params, kw)
  // Тема для текста описания: своя, если указана, иначе — тема, которую по содержанию
  // определил сам ИИ (title ответа), и только в крайнем случае — общая заглушка.
  const topic = params.topic?.trim() || title || (kk ? 'Жаңа тақырып' : 'Новая тема')
  const keyList = kw.slice(0, 5).join(', ') || '—'

  const summary = kk
    ? `«${topic}» тақырыбы бойынша ${sources.length} дереккөз негізінде ЖИ жасады. Негізгі ұғымдар: ${keyList}.`
    : `По теме «${topic}» — сгенерировано ИИ на основе ${sources.length} ${
        sources.length === 1 ? 'источника' : 'источников'
      }. Ключевые понятия: ${keyList}.`

  return {
    id: uid('mat'),
    type: params.type,
    title,
    subject: params.subject,
    institution: params.institution,
    grade: params.grade,
    difficulty: params.difficulty,
    language: params.language,
    summary,
    tags,
    content,
    sources,
    engine,
    createdAt: Date.now(),
  }
}
