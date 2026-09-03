import type {
  ContextSource,
  Flashcard,
  GenerationParams,
  Lang,
  OllamaSettings,
  QuizQuestion,
} from '@/types'
import { uid } from './utils'

/* --------------------------------------------------------------------------
 *  Клиент локального Ollama (http://localhost:11434).
 *
 *  Через Ollama генерируются ФЛЕШКАРТЫ и ТЕСТЫ (по содержимому источников).
 *  Остальные типы пока делает демо-генератор (src/lib/generator.ts).
 *  Новый тип добавляется по аналогии: buildXxxPrompt() + generateXxx().
 * ----------------------------------------------------------------------- */

export const DEFAULT_OLLAMA_SETTINGS: OllamaSettings = {
  enabled: false,
  baseUrl: 'http://localhost:11434',
  models: {
    // Одна модель на оба языка — Ollama не перезагружает её при переключении.
    // gemma3:4b — компактная, быстрая на CPU, приемлемый казахский.
    // Любую другую установленную модель можно выбрать одной кнопкой
    // в настройках генератора (шаг «Данные»).
    kk: 'gemma3:4b',
    ru: 'gemma3:4b',
  },
}

const LEVEL_WORDS: Record<Lang, Record<GenerationParams['institution'], string>> = {
  kk: { school: 'мектеп', college: 'колледж', university: 'жоғары оқу орны (ЖОО)' },
  ru: { school: 'школа', college: 'колледж', university: 'вуз' },
}

export interface OllamaStatus {
  ok: boolean
  models: string[]
  error?: string
}

/** Проверка доступности Ollama и список установленных моделей. */
export async function pingOllama(baseUrl: string): Promise<OllamaStatus> {
  try {
    const res = await fetch(`${trim(baseUrl)}/api/tags`, { method: 'GET' })
    if (!res.ok) return { ok: false, models: [], error: `HTTP ${res.status}` }
    const data = (await res.json()) as { models?: Array<{ name: string }> }
    return { ok: true, models: (data.models ?? []).map((m) => m.name) }
  } catch (e) {
    return {
      ok: false,
      models: [],
      error:
        e instanceof TypeError
          ? 'Не удалось подключиться. Запущен ли «ollama serve» и разрешён ли CORS (OLLAMA_ORIGINS=*)?'
          : String(e),
    }
  }
}

function trim(url: string): string {
  return url.replace(/\/+$/, '')
}

/**
 * Промпт для флешкарт. НЕ используем жёсткую JSON-схему в поле `format`
 * (маленькие локальные модели на ней часто выдают заглушки вместо контента) —
 * вместо этого просим валидный JSON текстом + даём образец с реальным содержанием.
 */
function buildFlashcardsPrompt(
  params: GenerationParams,
  sources: ContextSource[],
): { system: string; user: string } {
  const level = LEVEL_WORDS[params.language][params.institution]
  const ctx = sources
    .map((s, i) => `[Источник ${i + 1}: ${s.title}]\n${s.excerpt}`)
    .join('\n\n')
    .slice(0, 6000)

  const qa = params.cardStyle === 'qa'

  if (params.language === 'kk') {
    return {
      system:
        'Сен — тәжірибелі мұғалім-әдіскерсің. Тек ҚАЗАҚ тілінде жауап бересің. ' +
        'Жауап — тек жарамды JSON, markdown жоқ. Пішімі: ' +
        (qa
          ? '{"title":"тақырып атауы","cards":[{"front":"сұрақ","back":"жауап"}]}. ' +
            '«front» — тақырып бойынша қысқа сұрақ; «back» — нақты жауап (1–2 сөйлем). '
          : '{"title":"тақырып атауы","cards":[{"front":"термин","back":"анықтама"}]}. ' +
            '«front» — қысқа ұғым; «back» — нақты, мазмұнды анықтама (1–2 сөйлем). ') +
        '«title» — мазмұнды талдап шыққан қысқа атау (3–6 сөз). ' +
        'Толтырғыш мәтін жазба — әр карта тақырып бойынша нақты болсын.',
      user:
        `Тақырып: «${params.topic}». Пән: ${params.subject}. Деңгей: ${level}, ${params.grade}. ` +
        `Дәл ${params.count} флешкарта жаса. ` +
        `${params.notes ? `Қосымша талап: ${params.notes}. ` : ''}` +
        (ctx
          ? `Мына материалға сүйен:\n${ctx}\n\n`
          : 'Материал берілмеген — тақырып бойынша өзің құрастыр. ') +
        (qa
          ? 'Мысал: {"title":"Фотосинтез туралы сұрақтар","cards":[{"front":"Фотосинтез қай органоидта жүреді?","back":"Хлоропластта, оның ішінде хлорофилл пигменті қатысады."}]}'
          : 'Мысал: {"title":"Фотосинтез: негізгі ұғымдар","cards":[{"front":"Фотосинтез","back":"Жасыл өсімдіктердің жарық энергиясын пайдаланып көмірқышқыл газы мен судан органикалық зат түзу процесі."}]}'),
    }
  }

  return {
    system:
      'Ты — опытный учитель-методист. Отвечаешь только на РУССКОМ языке. ' +
      'Ответ — только валидный JSON, без markdown. Формат: ' +
      (qa
        ? '{"title":"название набора","cards":[{"front":"вопрос","back":"ответ"}]}. ' +
          '«front» — короткий вопрос по теме; «back» — точный ответ (1–2 предложения). '
        : '{"title":"название набора","cards":[{"front":"термин","back":"определение"}]}. ' +
          '«front» — короткий термин; «back» — точное, содержательное определение (1–2 предложения). ') +
      '«title» — короткое название, выведенное из содержания (3–6 слов). ' +
      'Не пиши текст-заглушку — каждая карта должна быть конкретной по теме.',
    user:
      `Тема: «${params.topic}». Предмет: ${params.subject}. Уровень: ${level}, ${params.grade}. ` +
      `Сделай ровно ${params.count} флешкарт. ` +
      `${params.notes ? `Доп. требование: ${params.notes}. ` : ''}` +
      (ctx ? `Опирайся на материал:\n${ctx}\n\n` : 'Материал не приложен — составь по теме сам. ') +
      (qa
        ? 'Пример: {"title":"Вопросы по квадратным уравнениям","cards":[{"front":"Как по дискриминанту определить число корней?","back":"D>0 — два корня, D=0 — один, D<0 — действительных корней нет."}]}'
        : 'Пример: {"title":"Квадратные уравнения: опорные понятия","cards":[{"front":"Дискриминант","back":"Выражение D = b² − 4ac для уравнения ax² + bx + c = 0; по его знаку определяют число корней."}]}'),
  }
}

/* ---------- Общий вызов Ollama с разбором JSON-ответа ---------- */

const asStr = (v: unknown): string =>
  typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : ''

const cleanTitle = (v: unknown): string =>
  asStr(v).replace(/^["'«»\s]+|["'«»\s]+$/g, '')

async function callOllamaJson(
  settings: OllamaSettings,
  model: string,
  system: string,
  user: string,
  temperature: number,
  rowKeys: string[],
  signal?: AbortSignal,
): Promise<{ root: Record<string, unknown>; rows: Record<string, unknown>[] }> {
  let res: Response
  try {
    res = await fetch(`${trim(settings.baseUrl)}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model,
        stream: false,
        format: 'json',
        keep_alive: '30m',
        // Страховка от «зацикливания» модели: JSON и так закрывается сам,
        // но предохранитель не даёт висеть минутами при повторах.
        options: { temperature, num_predict: 2048, repeat_penalty: 1.15 },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new Error(
      `Ollama недоступен по адресу ${settings.baseUrl}. Проверьте, что запущен «ollama serve», ` +
        'и что браузеру разрешён доступ (переменная окружения OLLAMA_ORIGINS=*).',
    )
  }

  if (res.status === 404) {
    throw new Error(`Модель «${model}» не установлена. Выполните в терминале:\n  ollama pull ${model}`)
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ollama вернул ошибку HTTP ${res.status}. ${text.slice(0, 200)}`)
  }

  const data = (await res.json()) as { message?: { content?: string } }
  const raw = (data.message?.content ?? '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    const m = raw.match(/[[{][\s\S]*[\]}]/)
    if (!m) throw new Error('Модель вернула ответ не в формате JSON. Попробуйте другую модель.')
    parsed = JSON.parse(m[0])
  }

  const root = (Array.isArray(parsed) ? {} : parsed) as Record<string, unknown>
  let rows: unknown[] = Array.isArray(parsed) ? parsed : []
  if (rows.length === 0) {
    for (const k of rowKeys) {
      if (Array.isArray(root[k])) {
        rows = root[k] as unknown[]
        break
      }
    }
  }
  return { root, rows: rows as Record<string, unknown>[] }
}

/* ------------------------------- Флешкарты ------------------------------ */

export interface OllamaGenResult {
  cards: Flashcard[]
  model: string
  /** Заголовок, придуманный моделью по содержанию (может быть пустым). */
  title: string
}

export async function generateFlashcards(
  params: GenerationParams,
  sources: ContextSource[],
  settings: OllamaSettings,
  signal?: AbortSignal,
): Promise<OllamaGenResult> {
  const model = settings.models[params.language]
  const { system, user } = buildFlashcardsPrompt(params, sources)
  const { root, rows } = await callOllamaJson(
    settings,
    model,
    system,
    user,
    0.3,
    ['cards', 'flashcards', 'items'],
    signal,
  )

  const cards: Flashcard[] = rows
    .map((r) => ({
      id: uid('c'),
      front: asStr(r.front ?? r.term ?? r.question ?? r.q ?? r.word ?? r.title),
      back: asStr(r.back ?? r.definition ?? r.answer ?? r.a ?? r.meaning ?? r.description),
    }))
    .filter((c) => c.front && c.back)

  if (cards.length === 0) {
    throw new Error(
      'Модель не вернула корректных флешкарт. Попробуйте другую модель ' +
        '(например, специализированную KazLLM для казахского) или переформулируйте тему.',
    )
  }

  return { cards, model, title: cleanTitle(root.title ?? root.name ?? root.heading) }
}

/* --------------------------------- Тест -------------------------------- */

export interface QuizGenResult {
  questions: QuizQuestion[]
  model: string
  title: string
}

function letterToIndex(s: string, options: string[]): number {
  const t = s.trim()
  const m = t.match(/^([а-гa-d])[).\s]*$/i)
  if (m) {
    const ch = m[1].toLowerCase()
    const lat = 'abcd'.indexOf(ch)
    if (lat >= 0) return lat
    const cyr = 'абвг'.indexOf(ch)
    if (cyr >= 0) return cyr
  }
  const byText = options.findIndex((o) => o.toLowerCase() === t.toLowerCase())
  if (byText >= 0) return byText
  const n = Number(t)
  return Number.isInteger(n) ? n : 0
}

function buildQuizPrompt(
  params: GenerationParams,
  sources: ContextSource[],
): { system: string; user: string } {
  const level = LEVEL_WORDS[params.language][params.institution]
  const diff = { easy: 'лёгкий', medium: 'средний', hard: 'сложный' }[params.difficulty]
  const ctx = sources
    .map((s) => `[${s.title}]\n${s.excerpt}`)
    .join('\n\n')
    .slice(0, 8000)
  const hasCtx = ctx.replace(/\s/g, '').length > 30

  if (params.language === 'kk') {
    return {
      system:
        'Сен — тест құрастыратын әдіскерсің. Тек ҚАЗАҚ тілінде жауап бересің. ' +
        'Жауап — тек жарамды JSON, markdown жоқ. Пішімі: ' +
        '{"title":"тест атауы","questions":[{"question":"сұрақ","options":["A","B","C","D"],"correct":0,"explanation":"неге дұрыс"}]}. ' +
        'Сұрақтар ӘРТҮРЛІ болсын: анықтамаға, қолдануға, салыстыруға, себеп-салдарға, «қайсысы ҚАТЕ / артық» түріне. ' +
        'Әр сұрақ материалды түсінуді тексереді, жай терминді қайталамайды. ' +
        'Дәл 4 нұсқа, біреуі ғана дұрыс, «correct» — оның индексі (0–3). Толтырғыш нұсқа жазба.',
      user:
        `Тақырып: «${params.topic}». Пән: ${params.subject}. Деңгей: ${level}, ${params.grade}. Қиындық: ${diff}. ` +
        `Дәл ${params.count} сұрақ жаса. ` +
        (hasCtx
          ? `Сұрақтарды ТЕК мына материал бойынша, оны түсінуді тексеретіндей құрастыр:\n"""\n${ctx}\n"""\n\n`
          : 'Материал берілмеген — тақырып бойынша өзің құрастыр, бірақ қарапайым емес. ') +
        (params.notes ? `Қосымша талап: ${params.notes}. ` : '') +
        'Мысал: {"title":"HTML тесті","questions":[{"question":"Бірінші деңгейлі тақырыпты қай тег белгілейді?","options":["<h1>","<head>","<title>","<p>"],"correct":0,"explanation":"<h1> — ең жоғары деңгейлі тақырып тегі."}]}',
    }
  }

  return {
    system:
      'Ты — методист, составляешь тестовые задания. Отвечаешь только на РУССКОМ. ' +
      'Ответ — только валидный JSON, без markdown. Формат: ' +
      '{"title":"название теста","questions":[{"question":"вопрос","options":["A","B","C","D"],"correct":0,"explanation":"почему верно"}]}. ' +
      'Вопросы должны быть РАЗНЫМИ по типу: на определение, на применение, на сравнение, на причину-следствие, ' +
      'на поиск ошибки или лишнего («что НЕ относится…»). ' +
      'Каждый вопрос проверяет понимание материала, а не просто повторяет термин. ' +
      'Ровно 4 варианта, один правильный, «correct» — его индекс (0–3). Не пиши варианты-заглушки.',
    user:
      `Тема: «${params.topic}». Предмет: ${params.subject}. Уровень: ${level}, ${params.grade}. Сложность: ${diff}. ` +
      `Сделай ровно ${params.count} вопросов. ` +
      (hasCtx
        ? `Составляй вопросы СТРОГО по этому материалу, проверяя его понимание:\n"""\n${ctx}\n"""\n\n`
        : 'Материал не приложен — составь по теме сам, но не примитивно. ') +
      (params.notes ? `Доп. требование: ${params.notes}. ` : '') +
      'Пример: {"title":"Тест по HTML","questions":[{"question":"Какой тег задаёт заголовок первого уровня?","options":["<h1>","<head>","<title>","<p>"],"correct":0,"explanation":"<h1> — заголовок высшего уровня; head и title относятся к метаданным."}]}',
  }
}

export async function generateQuiz(
  params: GenerationParams,
  sources: ContextSource[],
  settings: OllamaSettings,
  signal?: AbortSignal,
): Promise<QuizGenResult> {
  const model = settings.models[params.language]
  const { system, user } = buildQuizPrompt(params, sources)
  const { root, rows } = await callOllamaJson(
    settings,
    model,
    system,
    user,
    0.5,
    ['questions', 'items', 'quiz'],
    signal,
  )

  const questions: QuizQuestion[] = rows
    .map((r) => {
      const src = Array.isArray(r.options)
        ? r.options
        : Array.isArray(r.answers)
          ? r.answers
          : Array.isArray(r.variants)
            ? r.variants
            : []
      const rawOptions = (src as unknown[]).map(asStr).filter(Boolean).slice(0, 6)
      const rawCorrect = r.correct ?? r.correctIndex ?? r.answer ?? r.answerIndex ?? r.right ?? 0
      let ci =
        typeof rawCorrect === 'number'
          ? rawCorrect
          : typeof rawCorrect === 'string'
            ? letterToIndex(rawCorrect, rawOptions)
            : 0
      if (!Number.isInteger(ci) || ci < 0 || ci >= rawOptions.length) ci = 0

      // Убираем повторяющиеся варианты (мелкие модели иногда дублируют ответ)
      const correctText = rawOptions[ci]
      const options: string[] = []
      for (const o of rawOptions) {
        if (!options.some((x) => x.toLowerCase() === o.toLowerCase())) options.push(o)
      }
      const fixedCi = Math.max(
        0,
        options.findIndex((o) => o.toLowerCase() === (correctText ?? '').toLowerCase()),
      )

      return {
        id: uid('q'),
        prompt: asStr(r.question ?? r.prompt ?? r.q ?? r.text),
        options,
        correctIndex: fixedCi,
        explanation: asStr(r.explanation ?? r.rationale ?? r.reason ?? r.why),
      }
    })
    .filter((q) => q.prompt && q.options.length >= 3)

  if (questions.length === 0) {
    throw new Error(
      'Модель не вернула корректных вопросов. Попробуйте другую модель, ' +
        'уменьшите объём материала или переформулируйте тему.',
    )
  }

  return { questions, model, title: cleanTitle(root.title ?? root.name ?? root.heading) }
}

/* ----------------------- Чат по теме (как ChatGPT) -------------------- */

export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Свободный чат с локальной моделью: пользователь спрашивает про тему,
 * модель собирает учебный материал. Ответ используется как источник.
 */
export async function chatComplete(
  history: ChatMsg[],
  settings: OllamaSettings,
  lang: Lang,
  signal?: AbortSignal,
): Promise<string> {
  const model = settings.models[lang]
  const system =
    lang === 'kk'
      ? 'Сен — мұғалімге көмектесетін білікті ассистентсің. Пайдаланушы сұраған тақырып бойынша нақты, ' +
        'құрылымдалған оқу материалын бересің: қысқа анықтама, 4–6 негізгі факт, 1–2 мысал. ' +
        'Тек ҚАЗАҚ тілінде. Жауап 200 сөзден аспасын, суреттеме мәтінсіз, қайталамай. ' +
        'Ойдан шығарма, тек шынайы білім бер.'
      : 'Ты — знающий ассистент для учителя. По запросу пользователя выдаёшь конкретный, ' +
        'структурированный учебный материал по теме: короткое определение, 4–6 ключевых фактов, 1–2 примера. ' +
        'Отвечай на РУССКОМ, не более 200 слов, без воды и повторов. ' +
        'Не выдумывай, давай только достоверные знания.'

  let res: Response
  try {
    res = await fetch(`${trim(settings.baseUrl)}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model,
        stream: false,
        keep_alive: '30m',
        // num_predict ограничивает ответ — иначе мелкие модели (gemma3:4b и т.п.)
        // в свободном чате «расписываются» на тысячи токенов и висят минутами.
        options: { temperature: 0.6, num_predict: 700, repeat_penalty: 1.2 },
        messages: [{ role: 'system', content: system }, ...history.slice(-10)],
      }),
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new Error(
      `Ollama недоступен по адресу ${settings.baseUrl}. Запустите «ollama serve» и разрешите доступ (OLLAMA_ORIGINS=*).`,
    )
  }
  if (res.status === 404) {
    throw new Error(`Модель «${model}» не установлена. Выполните: ollama pull ${model}`)
  }
  if (!res.ok) {
    throw new Error(`Ollama вернул ошибку HTTP ${res.status}.`)
  }
  const data = (await res.json()) as { message?: { content?: string } }
  const out = (data.message?.content ?? '').trim()
  if (!out) throw new Error('Модель вернула пустой ответ. Попробуйте переформулировать вопрос.')
  return out
}
