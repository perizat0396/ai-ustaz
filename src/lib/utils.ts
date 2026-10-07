import type { Difficulty, EducationLevel, Lang, MaterialType } from '@/types'

/** Простой генератор id без внешних зависимостей. */
export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`
}

/** Объединение классов (мини-clsx). */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function classForType(type: MaterialType): string {
  const map: Record<MaterialType, string> = {
    quiz: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    flashcards: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    assignment: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    game: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    lesson: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    summary: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
    ksp: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    course: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  }
  return map[type]
}

export const TYPE_LABELS: Record<MaterialType, string> = {
  quiz: 'Тест',
  flashcards: 'Флешкарты',
  assignment: 'Задание',
  game: 'Игра',
  lesson: 'План урока',
  summary: 'Конспект',
  ksp: 'КСП',
  course: 'Курс',
}

export const TYPE_ICONS: Record<MaterialType, string> = {
  quiz: '🧩',
  flashcards: '🃏',
  assignment: '📝',
  game: '🎮',
  lesson: '📚',
  summary: '📄',
  ksp: '🗂️',
  course: '🎓',
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Лёгкий',
  medium: 'Средний',
  hard: 'Сложный',
}

export const LANG_LABELS: Record<Lang, string> = {
  kk: 'Қазақша',
  ru: 'Русский',
}

export const INSTITUTION_LABELS: Record<EducationLevel, string> = {
  school: 'Школа',
  college: 'Колледж',
  university: 'ВУЗ',
}

/** Классы / курсы в зависимости от типа заведения. */
export const GRADES_BY_INSTITUTION: Record<EducationLevel, readonly string[]> = {
  school: [
    '1 класс',
    '2 класс',
    '3 класс',
    '4 класс',
    '5 класс',
    '6 класс',
    '7 класс',
    '8 класс',
    '9 класс',
    '10 класс',
    '11 класс',
  ],
  college: ['1 курс', '2 курс', '3 курс', '4 курс'],
  university: [
    'Бакалавриат, 1 курс',
    'Бакалавриат, 2 курс',
    'Бакалавриат, 3 курс',
    'Бакалавриат, 4 курс',
    'Магистратура',
    'Докторантура (PhD)',
  ],
}

export const SUBJECTS = [
  'Математика',
  'Физика',
  'Химия',
  'Биология',
  'История',
  'География',
  'Информатика',
  'Русский язык',
  'Казахский язык',
  'Английский язык',
  'Литература',
  'Обществознание',
] as const


type Loc = 'ru' | 'kk'

export function formatDate(ts: number, lang: Loc = 'ru'): string {
  return new Intl.DateTimeFormat(lang === 'kk' ? 'kk-KZ' : 'ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(ts)
}

export function timeAgo(ts: number, lang: Loc = 'ru'): string {
  const diff = Date.now() - ts
  const min = Math.round(diff / 60_000)
  const kk = lang === 'kk'
  if (min < 1) return kk ? 'жаңа ғана' : 'только что'
  if (min < 60) return kk ? `${min} мин бұрын` : `${min} мин назад`
  const h = Math.round(min / 60)
  if (h < 24) return kk ? `${h} сағ бұрын` : `${h} ч назад`
  const d = Math.round(h / 24)
  if (d < 30) return kk ? `${d} күн бұрын` : `${d} дн назад`
  return formatDate(ts, lang)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

export function pluralize(n: number, forms: [string, string, string]): string {
  const n10 = n % 10
  const n100 = n % 100
  if (n10 === 1 && n100 !== 11) return forms[0]
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1]
  return forms[2]
}

const AVATAR_COLORS = [
  '#4f46e5',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
]

export function pickAvatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Извлечение «ключевых слов» из произвольного текста для правдоподобной генерации. */
const STOP_WORDS = new Set(
  `и в во не что он на я с со как а то все она так его но да ты к у же вы за бы по только ее мне было вот от меня еще нет о из ему теперь когда даже ну вдруг ли если уже или ни быть был него до вас нибудь опять уж вам ведь там потом себя ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб без будто чего раз тоже себе под будет ж тогда кто этот того потому этого какой совсем ним здесь этом один почти мой тем чтобы нее сейчас были куда зачем всех никогда можно при наконец два об другой хоть после над больше тот через эти нас про всего них какая много разве три эту моя впрочем хорошо свою этой перед иногда лучше чуть том нельзя такой им более всегда конечно всю между the a an of to is are and or for with on in at by`.split(
      ' ',
    ),
)

export function extractKeywords(text: string, limit = 10): string[] {
  const counts = new Map<string, number>()
  const words = text
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w))
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w[0].toUpperCase() + w.slice(1))
}
