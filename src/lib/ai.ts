import type {
  AssignmentStyle,
  AssignmentStyleOption,
  ContextSource,
  Flashcard,
  GameFormat,
  GenerationParams,
  Lang,
  MaterialContent,
  QuizQuestion,
  StyleOption,
  SummaryStyle,
} from '@/types'
import { supabase } from './supabase'

/* --------------------------------------------------------------------------
 *  Клиент реальной генерации через Supabase Edge Function `generate`,
 *  которая обращается к Google Gemini. Ключ Gemini хранится только
 *  на сервере — браузер сюда напрямую не стучится.
 * ----------------------------------------------------------------------- */

async function invoke<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('generate', {
    body: { action, ...payload },
  })
  if (error) {
    // Ошибка от самой функции (не-2xx): достаём её сообщение, чтобы не прятать реальную причину.
    const ctx = (error as { context?: unknown }).context
    if (ctx instanceof Response) {
      const body = (await ctx.json().catch(() => null)) as { error?: string } | null
      if (body?.error) throw new Error(body.error)
    }
    throw new Error(
      'Не удалось связаться с ИИ. Проверьте подключение к интернету и попробуйте ещё раз.',
    )
  }
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: string }).error))
  }
  return data as T
}

export interface AiGenResult {
  cards: Flashcard[]
  model: string
  title: string
}

export function generateFlashcards(
  params: GenerationParams,
  sources: ContextSource[],
): Promise<AiGenResult> {
  return invoke('flashcards', { params, sources })
}

export interface QuizGenResult {
  questions: QuizQuestion[]
  model: string
  title: string
}

export function generateQuiz(
  params: GenerationParams,
  sources: ContextSource[],
): Promise<QuizGenResult> {
  return invoke('quiz', { params, sources })
}

export function suggestAssignmentStyles(
  params: GenerationParams,
  sources: ContextSource[],
): Promise<AssignmentStyleOption[]> {
  return invoke('suggestAssignmentStyles', { params, sources })
}

export interface AssignmentGenResult {
  content: MaterialContent
  model: string
  title: string
}

export function generateAssignment(
  params: GenerationParams,
  sources: ContextSource[],
  style: AssignmentStyle,
): Promise<AssignmentGenResult> {
  return invoke('assignment', { params, sources, style })
}

export function suggestSummaryStyles(
  params: GenerationParams,
  sources: ContextSource[],
): Promise<StyleOption[]> {
  return invoke('suggestSummaryStyles', { params, sources })
}

export interface SummaryGenResult {
  content: MaterialContent
  model: string
  title: string
}

export function generateSummary(
  params: GenerationParams,
  sources: ContextSource[],
  style: SummaryStyle,
): Promise<SummaryGenResult> {
  return invoke('summary', { params, sources, style })
}

export function suggestGameStyles(
  params: GenerationParams,
  sources: ContextSource[],
): Promise<StyleOption[]> {
  return invoke('suggestGameStyles', { params, sources })
}

export interface GameGenResult {
  content: MaterialContent
  model: string
  title: string
}

export function generateGame(
  params: GenerationParams,
  sources: ContextSource[],
  format: GameFormat,
): Promise<GameGenResult> {
  return invoke('game', { params, sources, style: format })
}

export interface LessonGenResult {
  content: MaterialContent
  model: string
  title: string
}

export function generateLesson(
  params: GenerationParams,
  sources: ContextSource[],
): Promise<LessonGenResult> {
  return invoke('lesson', { params, sources })
}

export function generateKsp(
  params: GenerationParams,
  sources: ContextSource[],
): Promise<LessonGenResult> {
  return invoke('ksp', { params, sources })
}

export function generateCourse(
  params: GenerationParams,
  sources: ContextSource[],
): Promise<LessonGenResult> {
  return invoke('course', { params, sources })
}

export interface PracticeCheck {
  correct: boolean
  /** Если верно — короткая похвала/пояснение; если нет — подсказка, где ошибка (без готового решения). */
  feedback: string
}

/** Проверка ответа/кода ученика на практическое задание курса (код не выполняется, разбирает ИИ). */
export function checkPractice(payload: {
  lang: Lang
  language: string
  task: string
  solution: string
  answer: string
}): Promise<PracticeCheck> {
  return invoke('checkPractice', payload)
}

export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

export async function chatComplete(history: ChatMsg[], lang: Lang): Promise<string> {
  const { reply } = await invoke<{ reply: string }>('chat', { history, lang })
  return reply
}
