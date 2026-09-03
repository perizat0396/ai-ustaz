/* ------------------------------------------------------------------ *
 *  Доменная модель платформы AI Ustaz (только фронтенд, mock-данные) *
 * ------------------------------------------------------------------ */

export type MaterialType =
  | 'quiz' // тест с вариантами ответов
  | 'flashcards' // флешкарты
  | 'assignment' // задание / рабочий лист
  | 'game' // учебная игра
  | 'lesson' // план урока
  | 'summary' // конспект / краткое изложение

export type Difficulty = 'easy' | 'medium' | 'hard'

/** Казахский — основной язык платформы, русский — вторичный. */
export type Lang = 'kk' | 'ru'

/** Тип учебного заведения, для которого создаётся материал. */
export type EducationLevel = 'school' | 'college' | 'university'

/* ---------- Источники контекста для генерации ---------- */

export type SourceKind = 'file' | 'note' | 'search'

export interface ContextSource {
  id: string
  kind: SourceKind
  /** Отображаемое имя: имя файла / «Заметка» / поисковый запрос */
  title: string
  /** Доп. описание: размер и тип файла, дата и т.п. */
  detail: string
  /** Текст, который реально уходит «в ИИ» */
  excerpt: string
  addedAt: number
}

/* ---------- Наполнение материалов ---------- */

export interface QuizQuestion {
  id: string
  prompt: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface Flashcard {
  id: string
  front: string
  back: string
}

export interface AssignmentTask {
  id: string
  prompt: string
  hint?: string
  answer?: string
  points: number
}

export interface LessonSection {
  id: string
  heading: string
  body: string
  minutes: number
}

export interface MatchPair {
  id: string
  term: string
  def: string
}

export type MaterialContent =
  | { kind: 'quiz'; questions: QuizQuestion[] }
  | { kind: 'flashcards'; cards: Flashcard[] }
  | { kind: 'assignment'; instructions: string; tasks: AssignmentTask[] }
  | { kind: 'game'; gameTitle: string; rules: string; pairs: MatchPair[] }
  | { kind: 'lesson'; objectives: string[]; sections: LessonSection[] }
  | { kind: 'summary'; keyPoints: string[]; body: string }

export interface Material {
  id: string
  type: MaterialType
  title: string
  subject: string
  /** Тип заведения: школа / колледж / ВУЗ. */
  institution: EducationLevel
  /** Класс или курс (значение зависит от institution). */
  grade: string
  difficulty: Difficulty
  language: Lang
  summary: string
  tags: string[]
  content: MaterialContent
  sources: ContextSource[]
  /** Чем сгенерировано: «Демо-генератор» или, напр., «Ollama · qwen2.5:7b». */
  engine: string
  createdAt: number
}

/* ---------- Пользователи и сообщество ---------- */

export interface UserRef {
  id: string
  name: string
  role: string
  avatarColor: string
}

export interface Comment {
  id: string
  author: UserRef
  body: string
  createdAt: number
}

export interface Contribution {
  id: string
  author: UserRef
  note: string
  addedItems: number
  status: 'merged' | 'pending'
  createdAt: number
}

export interface Work {
  id: string
  material: Material
  author: UserRef
  publishedAt: number
  likes: number
  likedByMe: boolean
  savedByMe: boolean
  views: number
  comments: Comment[]
  contributions: Contribution[]
  forkedFrom?: { id: string; title: string; author: string }
}

/* ---------- Параметры запроса генерации ---------- */

/** Формат флешкарт: «термин → определение» или «вопрос → ответ». */
export type CardStyle = 'term' | 'qa'

export interface GenerationParams {
  topic: string
  type: MaterialType
  subject: string
  institution: EducationLevel
  grade: string
  difficulty: Difficulty
  language: Lang
  count: number
  /** Только для флешкарт. */
  cardStyle: CardStyle
  notes: string
}

/* ---------- Настройки локального ИИ (Ollama) ---------- */

export interface OllamaSettings {
  /** Включить реальную генерацию через Ollama (иначе — демо-генератор). */
  enabled: boolean
  /** Адрес Ollama, по умолчанию http://localhost:11434 */
  baseUrl: string
  /** Своя модель под каждый язык. */
  models: Record<Lang, string>
}
