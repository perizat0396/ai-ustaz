/* ------------------------------------------------------------------ *
 *  Доменная модель платформы AI Ustaz                                *
 * ------------------------------------------------------------------ */

export type MaterialType =
  | 'quiz' // тест с вариантами ответов
  | 'flashcards' // флешкарты
  | 'assignment' // задание / рабочий лист
  | 'game' // учебная игра
  | 'lesson' // план урока
  | 'summary' // конспект / краткое изложение
  | 'ksp' // краткосрочный план урока по форме школ Казахстана
  | 'course' // электронный микрокурс: карточки теории, вопросы, практика с проверкой ИИ

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

/** Тип вопроса теста. Отсутствие поля у старых материалов = 'mcq'. */
export type QuizQuestionKind = 'mcq' | 'truefalse' | 'fill'

export interface QuizQuestion {
  id: string
  kind?: QuizQuestionKind
  prompt: string
  /** mcq — 3–4 варианта; truefalse — 2 (локализованные); fill — []. */
  options: string[]
  /** Индекс верного варианта (mcq/truefalse). Для fill не используется. */
  correctIndex: number
  /** Ожидаемый ответ для типа 'fill'. */
  answerText?: string
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

/** Стиль задания, который ИИ подбирает под содержание материала. */
export type AssignmentStyle =
  | 'openq'
  | 'match'
  | 'cloze'
  | 'truefalse'
  | 'problems'
  | 'case'
  | 'errorhunt'
  | 'miniproject'
  | 'ordering'

export interface AssignmentStyleOption {
  id: AssignmentStyle
  /** Локализованное название стиля. */
  title: string
  /** Пояснение ИИ, почему стиль подходит этому материалу. */
  reason: string
  /** ИИ выделил этот стиль как подходящий данному материалу. */
  recommended?: boolean
}

/** Формат работы над заданием. */
export type WorkFormat = 'individual' | 'pair' | 'group'

/** Стиль конспекта, который ИИ подбирает под тему и аудиторию. */
export type SummaryStyle = 'academic' | 'simple' | 'school' | 'cheatsheet' | 'exam'

/** Для кого делается конспект. */
export type SummaryAudience = 'schooler' | 'student' | 'teacher' | 'self'

/** Универсальный вариант стиля (для задания, конспекта, игры). */
export interface StyleOption {
  id: string
  title: string
  reason: string
  recommended?: boolean
}

/** Шаг для стиля «Восстанови последовательность» (в правильном порядке). */
export interface OrderingStep {
  id: string
  text: string
}

/** Формат мини-игры. Отсутствие поля у старого контента = 'match'. */
export type GameFormat =
  | 'match'
  | 'memory'
  | 'quizshow'
  | 'oddone'
  | 'blast'
  | 'speedmatch'

/** Раунд игры «Что лишнее». */
export interface OddOneRound {
  id: string
  items: string[]
  /** Индекс лишнего элемента. */
  oddIndex: number
  why: string
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
  | { kind: 'ordering'; instructions: string; steps: OrderingStep[] }
  | {
      kind: 'game'
      /** undefined трактуется как 'match' (обратная совместимость). */
      format?: GameFormat
      gameTitle: string
      rules: string
      /** match / memory */
      pairs?: MatchPair[]
      /** quizshow */
      questions?: QuizQuestion[]
      /** oddone */
      rounds?: OddOneRound[]
    }
  | { kind: 'lesson'; objectives: string[]; sections: LessonSection[] }
  | { kind: 'summary'; keyPoints: string[]; body: string }
  | {
      kind: 'ksp'
      /** Раздел учебной программы. */
      section: string
      /** Цели обучения в соответствии с учебной программой (с кодами, если ИИ уверен). */
      learningObjectives: string[]
      /** Цели урока. */
      lessonObjectives: string[]
      criteria: string[]
      /** Языковые цели: учащиеся смогут / ключевые слова / термины / полезные фразы. */
      languageGoals: { students: string; keywords: string; terms: string; phrases: string }
      crossCurricular: string
      values: string
      thinkingLevels: string
      prerequisites: string
      extraInfo: string
      /** План урока: начало / середина / конец (виды заданий, дескрипторы, оценивание, ресурсы). */
      plan: { start: KspBlock; middle: KspBlock; end: KspBlock }
      /** Рефлексия по итогам урока (приём). */
      lessonReflection: string
      homework: string
      differentiation: { support: string; advanced: string }
    }

  | { kind: 'course'; intro: string; steps: CourseStep[] }

/** Шаг микрокурса: короткая карточка теории, вопрос на пройденное или практика. */
export type CourseStep =
  | {
      id: string
      kind: 'theory'
      title: string
      emoji: string
      /** Короткий текст: **жирное** и `код` в обратных кавычках. */
      body: string
      tone?: 'tip' | 'fact' | 'warning' | 'example'
      callout?: string
      /** Код показывается отдельным блоком, не смешивается с текстом. */
      code?: { language: string; code: string; caption?: string }
    }
  | { id: string; kind: 'quiz'; question: QuizQuestion }
  | {
      id: string
      kind: 'practice'
      title: string
      task: string
      /** Язык кода («python», «javascript»…) или «text» для письменного ответа. */
      language: string
      starterCode?: string
      hint?: string
      /** Эталонное решение — показывается после верного ответа или по кнопке. */
      solution: string
      explanation: string
    }
/** Блок плана КСП. ctivities — многострочный текст; **жирное** выделяется звёздочками. */
export interface KspBlock {
  minutes: number
  activities: string
  resources: string
}
export interface Material {
  id: string
  type: MaterialType
  title: string
  /** Заголовок на казахском для карточек сообщества (если материал изначально на русском). */
  titleKk?: string
  subject: string
  /** Тип заведения: школа / колледж / ВУЗ. */
  institution: EducationLevel
  /** Класс или курс (значение зависит от institution). */
  grade: string
  difficulty: Difficulty
  language: Lang
  summary: string
  /** Описание на казахском для карточек сообщества (если материал изначально на русском). */
  summaryKk?: string
  tags: string[]
  content: MaterialContent
  sources: ContextSource[]
  /** Чем сгенерировано, напр. «AI Ustaz». */
  engine: string
  createdAt: number
}

/* ---------- Пользователи и сообщество ---------- */

/** Кто пользователь на платформе — выбирается при регистрации. */
export type UserRole =
  | 'school_teacher'
  | 'college_teacher'
  | 'university_teacher'
  | 'student'
  | 'other'

export interface UserRef {
  id: string
  name: string
  /** Канонический ключ роли (UserRole) либо произвольный текст для системных/старых записей. */
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
  /** Только для задания: формат работы. */
  format?: WorkFormat
  /** Только для конспекта: для кого он. */
  audience?: SummaryAudience
  notes: string
  /** Только для курса: язык программирования для примеров и практики (пусто — без кода). */
  codeLanguage?: string
}

