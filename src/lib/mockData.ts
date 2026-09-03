import type { UserRef, Work } from '@/types'
import { uid } from './utils'

const DAY = 86_400_000

export const CURRENT_USER: UserRef = {
  id: 'user_me',
  name: 'Перизат А.',
  role: 'Учитель биологии',
  avatarColor: '#4f46e5',
}

const authors: UserRef[] = [
  { id: 'u_aigerim', name: 'Айгерим К.', role: 'Учитель математики', avatarColor: '#0ea5e9' },
  { id: 'u_daniyar', name: 'Данияр Т.', role: 'Учитель истории', avatarColor: '#f59e0b' },
  { id: 'u_saltanat', name: 'Салтанат М.', role: 'Учитель химии', avatarColor: '#10b981' },
  { id: 'u_ruslan', name: 'Руслан Ж.', role: 'Методист', avatarColor: '#8b5cf6' },
]

export function seedWorks(): Work[] {
  const now = Date.now()

  return [
    {
      id: 'work_photo',
      author: CURRENT_USER,
      publishedAt: now - 2 * DAY,
      likes: 34,
      likedByMe: false,
      savedByMe: true,
      views: 412,
      forkedFrom: undefined,
      comments: [
        {
          id: uid('cm'),
          author: authors[3],
          body: 'Отличная база для открытого урока. Добавил бы ещё вопрос про роль хлорофилла.',
          createdAt: now - 1 * DAY,
        },
        {
          id: uid('cm'),
          author: authors[2],
          body: 'Использовала в 6 классе — зашло. Спасибо, что поделились!',
          createdAt: now - 12 * 3600_000,
        },
      ],
      contributions: [
        {
          id: uid('co'),
          author: authors[2],
          note: 'Добавила 3 карточки про факторы, влияющие на скорость фотосинтеза.',
          addedItems: 3,
          status: 'merged',
          createdAt: now - 20 * 3600_000,
        },
      ],
      material: {
        id: uid('mat'),
        type: 'flashcards',
        title: 'Флешкарты: Фотосинтез',
        subject: 'Биология',
        institution: 'school',
        grade: '6 класс',
        difficulty: 'medium',
        language: 'ru',
        engine: 'Ollama · qwen2.5:7b',
        summary:
          'Набор флешкарт по теме «Фотосинтез»: световая и темновая фазы, хлоропласт, факторы среды. Собран из школьного учебника и методички.',
        tags: ['биология', 'фотосинтез', 'хлоропласт', 'клетка'],
        createdAt: now - 2 * DAY,
        sources: [
          {
            id: uid('src'),
            kind: 'file',
            title: 'photosynthesis_notes.txt',
            detail: 'text/plain · 4.2 КБ',
            excerpt:
              'Световая фаза протекает в тилакоидах, темновая — в строме. Продукты: глюкоза и кислород.',
            addedAt: now - 2 * DAY,
          },
          {
            id: uid('src'),
            kind: 'search',
            title: 'факторы фотосинтеза',
            detail: 'Найдено в базе знаний',
            excerpt: 'Освещённость, концентрация CO₂, температура влияют на скорость процесса.',
            addedAt: now - 2 * DAY,
          },
        ],
        content: {
          kind: 'flashcards',
          cards: [
            { id: uid('c'), front: 'Фотосинтез', back: 'Процесс образования органических веществ из CO₂ и воды на свету с выделением кислорода.' },
            { id: uid('c'), front: 'Хлоропласт', back: 'Органоид растительной клетки, где происходит фотосинтез; содержит хлорофилл.' },
            { id: uid('c'), front: 'Световая фаза', back: 'Идёт в тилакоидах: свет расщепляет воду, образуются АТФ и НАДФН, выделяется O₂.' },
            { id: uid('c'), front: 'Темновая фаза', back: 'Цикл Кальвина в строме: CO₂ превращается в глюкозу за счёт энергии АТФ и НАДФН.' },
            { id: uid('c'), front: 'Хлорофилл', back: 'Зелёный пигмент, поглощающий энергию света для фотосинтеза.' },
            { id: uid('c'), front: 'Факторы среды', back: 'Освещённость, концентрация CO₂ и температура определяют скорость фотосинтеза.' },
          ],
        },
      },
    },
    {
      id: 'work_quad',
      author: authors[0],
      publishedAt: now - 5 * DAY,
      likes: 51,
      likedByMe: true,
      savedByMe: false,
      views: 730,
      comments: [
        {
          id: uid('cm'),
          author: CURRENT_USER,
          body: 'Взяла для подготовки к СОР, вопросы хорошо ранжированы по сложности.',
          createdAt: now - 3 * DAY,
        },
      ],
      contributions: [],
      material: {
        id: uid('mat'),
        type: 'quiz',
        title: 'Тест: Квадратные уравнения',
        subject: 'Математика',
        institution: 'school',
        grade: '8 класс',
        difficulty: 'hard',
        language: 'ru',
        engine: 'Демо-генератор',
        summary:
          'Тест из 10 вопросов по квадратным уравнениям: дискриминант, теорема Виета, разложение на множители.',
        tags: ['математика', 'алгебра', 'дискриминант', 'виета'],
        createdAt: now - 5 * DAY,
        sources: [
          {
            id: uid('src'),
            kind: 'note',
            title: 'Заметка',
            detail: 'Введено вручную',
            excerpt: 'Нужен тест на дискриминант и теорему Виета для 8 класса, средне-сложный.',
            addedAt: now - 5 * DAY,
          },
        ],
        content: {
          kind: 'quiz',
          questions: [
            {
              id: uid('q'),
              prompt: 'Сколько корней имеет уравнение, если дискриминант D < 0?',
              options: ['Ни одного действительного', 'Один', 'Два', 'Бесконечно много'],
              correctIndex: 0,
              explanation: 'При D < 0 действительных корней нет.',
            },
            {
              id: uid('q'),
              prompt: 'Чему равна сумма корней приведённого уравнения x² + px + q = 0?',
              options: ['−p', 'p', 'q', '−q'],
              correctIndex: 0,
              explanation: 'По теореме Виета сумма корней равна −p.',
            },
            {
              id: uid('q'),
              prompt: 'Формула дискриминанта для ax² + bx + c = 0:',
              options: ['b² − 4ac', '2a / b', 'b² + 4ac', '4ac − b²'],
              correctIndex: 0,
              explanation: 'D = b² − 4ac.',
            },
            {
              id: uid('q'),
              prompt: 'Если D = 0, то уравнение имеет...',
              options: ['Один корень (кратный)', 'Два разных корня', 'Ни одного', 'Три корня'],
              correctIndex: 0,
              explanation: 'При D = 0 корень один, x = −b / 2a.',
            },
          ],
        },
      },
    },
    {
      id: 'work_ww2',
      author: authors[1],
      publishedAt: now - 8 * DAY,
      likes: 27,
      likedByMe: false,
      savedByMe: false,
      views: 305,
      comments: [],
      contributions: [
        {
          id: uid('co'),
          author: authors[3],
          note: 'Предложил разбить раздел «Причины» на экономические и политические.',
          addedItems: 2,
          status: 'pending',
          createdAt: now - 4 * DAY,
        },
      ],
      material: {
        id: uid('mat'),
        type: 'lesson',
        title: 'План урока: Начало Второй мировой войны',
        subject: 'История',
        institution: 'school',
        grade: '10 класс',
        difficulty: 'medium',
        language: 'ru',
        engine: 'Демо-генератор',
        summary:
          'План урока на 45 минут: причины, хронология 1939–1941, работа с картой и источниками.',
        tags: ['история', 'вторая мировая война', '1939', 'хронология'],
        createdAt: now - 8 * DAY,
        sources: [
          {
            id: uid('src'),
            kind: 'search',
            title: 'причины второй мировой войны',
            detail: 'Найдено в базе знаний',
            excerpt: 'Версальский договор, экономический кризис, политика стран Оси.',
            addedAt: now - 8 * DAY,
          },
        ],
        content: {
          kind: 'lesson',
          objectives: [
            'Понять причины начала Второй мировой войны',
            'Запомнить ключевые даты 1939–1941 гг.',
            'Научиться работать с исторической картой и источником',
          ],
          sections: [
            { id: uid('s'), heading: 'Введение и проверка знаний', body: 'Повторение итогов Первой мировой войны и Версальской системы.', minutes: 7 },
            { id: uid('s'), heading: 'Причины войны', body: 'Экономический кризис, реваншизм, агрессивная внешняя политика. Схема на доске.', minutes: 15 },
            { id: uid('s'), heading: 'Хронология 1939–1941', body: 'Работа с лентой времени: 1 сентября 1939, 22 июня 1941.', minutes: 15 },
            { id: uid('s'), heading: 'Итог и рефлексия', body: 'Обсуждение: можно ли было предотвратить войну? Домашнее задание.', minutes: 8 },
          ],
        },
      },
    },
    {
      id: 'work_valence',
      author: authors[2],
      publishedAt: now - 11 * DAY,
      likes: 19,
      likedByMe: false,
      savedByMe: true,
      views: 244,
      comments: [],
      contributions: [],
      material: {
        id: uid('mat'),
        type: 'game',
        title: 'Ойын «Жұбын тап»: Химиялық элементтер',
        subject: 'Химия',
        institution: 'college',
        grade: '1 курс',
        difficulty: 'easy',
        language: 'kk',
        engine: 'Демо-генератор',
        summary: 'Мемори-игра: элемент ↔ его характеристика. Для разминки в начале урока.',
        tags: ['химия', 'элементы', 'валентность', 'игра'],
        createdAt: now - 11 * DAY,
        sources: [
          {
            id: uid('src'),
            kind: 'note',
            title: 'Заметка',
            detail: 'Введено вручную',
            excerpt: 'Разминочная игра на знание символов и характеристик первых 20 элементов.',
            addedAt: now - 11 * DAY,
          },
        ],
        content: {
          kind: 'game',
          gameTitle: 'Найди пару: Химические элементы',
          rules: 'Соедините символ элемента с верной характеристикой. За каждую правильную пару — 1 балл.',
          pairs: [
            { id: uid('p'), term: 'H', def: 'Самый лёгкий элемент, valence 1' },
            { id: uid('p'), term: 'O', def: 'Газ, поддерживает горение, valence 2' },
            { id: uid('p'), term: 'Na', def: 'Щелочной металл, бурно реагирует с водой' },
            { id: uid('p'), term: 'Cl', def: 'Галоген, жёлто-зелёный газ' },
            { id: uid('p'), term: 'Fe', def: 'Металл, основа стали, магнитен' },
            { id: uid('p'), term: 'C', def: 'Основа органических соединений' },
          ],
        },
      },
    },
  ]
}
