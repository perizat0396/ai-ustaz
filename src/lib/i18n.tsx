import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Difficulty, EducationLevel, Lang, MaterialType } from '@/types'

/* --------------------------------------------------------------------------
 *  Локализация интерфейса: русский (по умолчанию) и казахский.
 *  Значения данных (subject, grade и т.п.) хранятся канонически по-русски —
 *  переводится только отображение через t*-хелперы.
 * ----------------------------------------------------------------------- */

export type UILang = 'ru' | 'kk'
const KEY = 'ai-ustaz:uilang'

type Dict = Record<string, string>

const ru: Dict = {
  /* nav / common */
  'nav.generate': 'Генератор',
  'nav.community': 'Сообщество',
  'nav.library': 'Библиотека',
  'nav.profile': 'Профиль',
  'nav.create': 'Создать',
  'nav.toggleTheme': 'Переключить тему',
  'nav.uiLang': 'Язык интерфейса',
  'common.back': 'Назад',
  'common.next': 'Далее',
  'common.publish': 'Опубликовать',
  'common.generate': 'Сгенерировать',
  'common.retry': 'Повторить',
  'common.toParams': 'К параметрам',
  'common.open': 'Открыть',
  'common.collapse': 'Свернуть',
  'common.send': 'Отправить',
  'common.createMaterial': 'Создать материал',
  'common.openCommunity': 'Открыть сообщество',
  'common.toCommunity': 'В сообщество',
  'common.home': 'На главную',

  /* footer */
  'footer.text':
    'AI Ustaz — прототип платформы для ИИ-генерации учебных материалов. Данные хранятся локально в браузере.',

  /* home */
  'home.badge': 'ИИ для преподавателей',
  'home.title': 'Учебные материалы за минуты, а не за вечер',
  'home.subtitle':
    'Генерируйте задания, тесты, флешкарты и игры на основе своих файлов и данных. Делитесь с коллегами и улучшайте материалы вместе.',
  'home.ctaCreate': 'Создать материал',
  'home.ctaBrowse': 'Смотреть сообщество',
  'home.how': 'Как это работает',
  'home.popular': 'Популярное в сообществе',
  'home.allWorks': 'Все работы',
  'home.step1t': 'Добавьте контекст',
  'home.step1x': 'Загрузите файл (TXT, PDF, DOCX) или введите свои тезисы — ИИ учтёт их при генерации.',
  'home.step2t': 'Найдите данные в чате',
  'home.step2x': 'Не хватает материала? Спросите в чате, проверьте найденное и добавьте в источники.',
  'home.step3t': 'Сгенерируйте материал',
  'home.step3x': 'Тест, задание, флешкарты, игру или план урока — с нужным классом и уровнем сложности.',
  'home.step4t': 'Поделитесь и дополняйте',
  'home.step4x': 'Опубликуйте работу в сообществе. Коллеги могут комментировать и добавлять своё.',

  /* generate */
  'gen.title': 'Генератор материалов',
  'gen.subtitle': 'Добавьте свои данные, выберите тип — и получите готовый материал.',
  'gen.step.context': 'Контекст',
  'gen.step.what': 'Что генерируем',
  'gen.step.result': 'Результат',
  'gen.noSourcesNote': 'Можно продолжить и без источников — ИИ сгенерирует по теме.',
  'gen.materialType': 'Тип материала',
  'gen.topic': 'Тема материала',
  'gen.topicHint': 'Например: «Фотосинтез», «Квадратные уравнения»',
  'gen.topicPlaceholder': 'Введите тему',
  'gen.institution': 'Тип заведения',
  'gen.subject': 'Предмет',
  'gen.grade': 'Класс',
  'gen.course': 'Курс',
  'gen.difficulty': 'Сложность',
  'gen.language': 'Язык',
  'gen.cardFormat': 'Формат карточек',
  'gen.cardFormat.term': 'Термин → Определение',
  'gen.cardFormat.qa': 'Вопрос → Ответ',
  'gen.count': 'Количество элементов: {n}',
  'gen.notes': 'Дополнительные пожелания',
  'gen.notesHint': 'Необязательно',
  'gen.notesPlaceholder': 'Напр.: больше практики, добавить примеры из жизни, избегать формул…',
  'gen.generateOllama': 'Сгенерировать через Ollama',
  'gen.thinking': 'Модель «{model}» анализирует материал…',
  'gen.starting': 'Запускаю…',
  'gen.startingDemo': 'Запускаю демо-генератор…',
  'gen.slowNote':
    'Локальная модель может думать 20–120 секунд, особенно с большим документом — это нормально.',
  'gen.errorTitle': 'Ошибка генерации через Ollama',
  'gen.demoFallback': 'Сделать демо-генератором',
  'gen.published': 'Опубликовано в сообществе',
  'gen.changeParams': 'Изменить параметры',
  'gen.saveDraft': 'Сохранить черновик',
  'gen.inDrafts': 'В черновиках',
  'typeHint.flashcards': 'Термин ↔ определение или вопрос ↔ ответ. Через Ollama.',
  'typeHint.quiz': 'Реальные вопросы по вашему материалу. Через Ollama.',
  'typeHint.assignment': 'Рабочий лист с заданиями и баллами',
  'typeHint.game': 'Игра «найди пару» для разминки на уроке',
  'typeHint.lesson': 'Поэтапный план урока с таймингом',
  'typeHint.summary': 'Краткий конспект с ключевыми тезисами',

  /* ollama panel */
  'ollama.toggle': 'Генерировать через Ollama (локальный ИИ)',
  'ollama.desc':
    'Реальная генерация на вашем компьютере по содержимому источников. Поддержаны флешкарты и тесты — остальные типы делает демо-генератор.',
  'ollama.checking': 'Проверяю подключение…',
  'ollama.online': 'Ollama на связи · моделей: {n}',
  'ollama.offline': 'Нет подключения: {err}',
  'ollama.recheck': 'Проверить',
  'ollama.modelFor': 'Модель для языка «{lang}»',
  'ollama.notInstalled': 'Модель не найдена среди установленных. Выполните:',
  'ollama.showAddr': '+ Адрес сервера',
  'ollama.hideAddr': '− Скрыть',
  'ollama.serverAddr': 'Адрес Ollama',
  'ollama.demoNote': 'Для этого типа Ollama пока не подключена — генерация пойдёт через демо-генератор.',

  /* community */
  'community.title': 'Сообщество',
  'community.subtitle': '{n} материалов от преподавателей. Сохраняйте, комментируйте, дополняйте.',
  'community.searchPlaceholder': 'Поиск по названию, тегам, автору…',
  'community.allTypes': 'Все типы',
  'community.all': 'Все',
  'community.sortNew': 'Сначала новые',
  'community.sortPopular': 'Популярные',
  'community.sortDiscussed': 'Обсуждаемые',
  'community.nothing': 'Ничего не найдено',
  'community.nothingDesc': 'Попробуйте изменить фильтры или поисковый запрос.',
  'community.resetFilters': 'Сбросить фильтры',

  /* work detail */
  'work.notFound': 'Материал не найден',
  'work.notFoundDesc': 'Возможно, он был удалён или ссылка неверна.',
  'work.backToCommunity': 'Вернуться в сообщество',
  'work.forkedFrom': 'Дополнение к',
  'work.difficultyPrefix': 'Сложность',
  'work.saved': 'Сохранено',
  'work.save': 'Сохранить',
  'work.contribute': 'Дополнить',
  'work.views': '{n} просмотров',
  'work.comments': '{n} комментариев',
  'work.contributions': '{n} дополнений',
  'work.sources': 'Источники',
  'work.contribTitle': 'Дополнения сообщества',
  'work.noContrib': 'Пока никто не дополнял. Будьте первым — нажмите «Дополнить».',
  'work.merged': 'принято',
  'work.pending': 'на рассмотрении',
  'work.plusItems': '+{n} элементов',
  'work.commentsTitle': 'Комментарии',
  'work.commentPlaceholder': 'Поделитесь мнением или предложите улучшение…',
  'work.noComments': 'Комментариев пока нет.',

  /* contribute */
  'contribute.backToMaterial': 'Назад к материалу',
  'contribute.title': 'Дополнить материал',
  'contribute.subtitle': 'Вы дополняете «{title}» ({type}, {subject}, {grade}).',
  'contribute.origAuthor': 'Автор оригинала: {name}',
  'contribute.newData': 'Новые данные для дополнения',
  'contribute.whatAdding': 'Что вы добавляете',
  'contribute.whatAddingHint': 'Опишите, чем полезно ваше дополнение',
  'contribute.whatAddingPlaceholder': 'Напр.: добавил 4 вопроса про исключения и типичные ошибки',
  'contribute.howMany': 'Сколько новых элементов сгенерировать: {n}',
  'contribute.genAddition': 'Сгенерировать дополнение',
  'contribute.previewOf': 'Предпросмотр дополнения ({n} элементов)',
  'contribute.sendToAuthor': 'Отправить дополнение автору',
  'contribute.publishSeparate': 'Опубликовать как отдельную работу',
  'contribute.needNote': 'Добавьте описание дополнения, чтобы отправить его автору.',
  'contribute.doneTitle': 'Дополнение отправлено',
  'contribute.doneDesc':
    'Автор «{name}» увидит ваше предложение на странице материала со статусом «на рассмотрении».',
  'contribute.openMaterial': 'Открыть материал',
  'contribute.localNote': 'В прототипе дополнение сохраняется локально.',
  'contribute.typeUnsupported':
    'Дополнение через ИИ пока доступно только для флешкарт и тестов.',

  /* library */
  'library.title': 'Библиотека',
  'library.subtitle': 'Сохранённые работы сообщества и ваши черновики.',
  'library.savedTab': 'Сохранённые',
  'library.draftsTab': 'Черновики',
  'library.noSaved': 'Нет сохранённых материалов',
  'library.noSavedDesc': 'Нажмите на закладку в карточке любого материала, чтобы сохранить его сюда.',
  'library.noDrafts': 'Черновиков пока нет',
  'library.noDraftsDesc': 'Сгенерируйте материал и сохраните его как черновик, чтобы вернуться позже.',
  'library.createdAgo': 'создан {ago}',

  /* profile */
  'profile.memberOf': 'Участник сообщества AI Ustaz',
  'profile.newMaterial': 'Новый материал',
  'profile.stat.pubs': 'Публикаций',
  'profile.stat.likes': 'лайков',
  'profile.stat.views': 'просмотров',
  'profile.stat.contribs': 'дополнений',
  'profile.myPublications': 'Мои публикации',
  'profile.drafts': 'Черновики',
  'profile.nothing': 'Вы ещё ничего не опубликовали',
  'profile.nothingDesc': 'Сгенерируйте материал и поделитесь им с сообществом.',
  'profile.demoTitle': 'Демо-данные',
  'profile.demoDesc':
    'Прототип хранит всё в localStorage браузера. Можно вернуть исходный набор примеров.',
  'profile.resetDemo': 'Сбросить демо-данные',
  'profile.confirmReset': 'Сбросить все локальные данные к исходным примерам?',

  /* material renderer */
  'mat.quiz.check': 'Проверить ответы',
  'mat.quiz.result': 'Результат: {a} / {b}',
  'mat.quiz.retry': 'Пройти заново',
  'mat.flash.term': 'Термин',
  'mat.flash.definition': 'Определение',
  'mat.flash.question': 'Вопрос',
  'mat.flash.answer': 'Ответ',
  'mat.flash.tapToSee': 'нажмите, чтобы увидеть ответ',
  'mat.flash.backToTerm': 'вернуться к термину',
  'mat.flash.backToQuestion': 'вернуться к вопросу',
  'mat.flash.shuffle': 'перемешать',
  'mat.assign.points': 'балл.',
  'mat.assign.hint': 'Подсказка',
  'mat.assign.showAnswer': 'Показать ответ',
  'mat.assign.hideAnswer': 'Скрыть ответ',
  'mat.assign.total': 'Итого: {n} балл.',
  'mat.game.terms': 'Понятия',
  'mat.game.defs': 'Описания',
  'mat.game.allFound': '🎉 Все пары найдены!',
  'mat.game.found': 'Найдено пар: {a} / {b}',
  'mat.lesson.objectives': 'Цели урока',
  'mat.lesson.min': '{n} мин',
  'mat.lesson.total': 'Всего: {n} мин',
  'mat.summary.keyPoints': 'Ключевые тезисы',

  /* context builder */
  'ctx.findInChat': 'Найти данные в чате',
  'ctx.ownInfo': 'Своя информация',
  'ctx.ownInfoPlaceholder': 'Вставьте текст, тезисы, условие задачи, требования к материалу…',
  'ctx.add': 'Добавить',
  'ctx.dropFiles': 'Перетащите файлы или нажмите',
  'ctx.dropHint':
    'TXT, MD, PDF, DOCX — текст распознаётся автоматически. Другие форматы — вставьте текст вручную.',
  'ctx.sourcesFor': 'Источники для генерации ({n})',
  'ctx.sourcesEmpty': 'Пока пусто. Добавьте файл, заметку или найдите данные в чате выше.',
  'ctx.search': 'Искать',
  'ctx.searching': 'Ищу подходящие данные…',
  'ctx.toSources': 'В источники',
  'ctx.added': 'Добавлено',
  'ctx.searchPlaceholder': 'Напр.: фотосинтез, квадратные уравнения, причины Второй мировой…',
  'ctx.note': 'Заметка',

  /* not found */
  'nf.title': 'Страница не найдена',
  'nf.desc': 'Возможно, ссылка устарела или материал был удалён.',

  /* engine */
  'engine.demo': 'Демо-генератор',

  /* time */
  'time.now': 'только что',
  'time.min': '{n} мин назад',
  'time.hour': '{n} ч назад',
  'time.day': '{n} дн назад',

  /* enums */
  'type.quiz': 'Тест',
  'type.flashcards': 'Флешкарты',
  'type.assignment': 'Задание',
  'type.game': 'Игра',
  'type.lesson': 'План урока',
  'type.summary': 'Конспект',
  'diff.easy': 'Лёгкий',
  'diff.medium': 'Средний',
  'diff.hard': 'Сложный',
  'inst.school': 'Школа',
  'inst.college': 'Колледж',
  'inst.university': 'ВУЗ',
  'lang.kk': 'Қазақша',
  'lang.ru': 'Русский',
  'subject.Математика': 'Математика',
  'subject.Физика': 'Физика',
  'subject.Химия': 'Химия',
  'subject.Биология': 'Биология',
  'subject.История': 'История',
  'subject.География': 'География',
  'subject.Информатика': 'Информатика',
  'subject.Русский язык': 'Русский язык',
  'subject.Казахский язык': 'Казахский язык',
  'subject.Английский язык': 'Английский язык',
  'subject.Литература': 'Литература',
  'subject.Обществознание': 'Обществознание',
  'count.quiz': '{n} вопросов',
  'count.flashcards': '{n} карт',
  'count.assignment': '{n} заданий',
  'count.game': '{n} пар',
  'count.lesson': '{n} этапов',
  'count.summary': '{n} тезисов',

  /* generator v2: модуль → источник → результат */
  'gen.step.module': 'Модуль',
  'gen.step.data': 'Данные',
  'gen.step.params': 'Параметры',
  'gen.pickModule': 'Выберите, что сгенерировать',
  'gen.comingSoon': 'скоро',
  'gen.dataIntro': 'Дайте ИИ материал: загрузите файл или найдите информацию через чат.',
  'src.tab.file': 'Свой файл',
  'src.tab.chat': 'Поиск в чате (ИИ)',
  'src.file.hint': 'Загрузите файл с информацией по теме — ИИ прочитает его содержимое.',
  'src.file.extracted': 'Текст прочитан: {n} символов',
  'src.file.noText': 'Не удалось извлечь текст. Вставьте содержимое вручную ниже.',
  'src.paste': 'Или вставьте текст вручную',
  'src.chat.intro':
    'Спросите ИИ про тему — он соберёт материал, как ChatGPT. Понравится ответ — нажмите «Использовать эти данные». Можно уточнять в чате.',
  'src.chat.placeholder': 'Напр.: собери материал про фотосинтез для 6 класса',
  'src.chat.thinking': 'ИИ думает…',
  'src.chat.use': 'Использовать эти данные',
  'src.chat.used': 'Добавлено в источники',
  'src.chat.needAi': 'Для чата нужен подключённый локальный ИИ (Ollama). Включите его в настройках ниже.',
  'src.chat.send': 'Спросить',
  'src.added': 'В источниках: {n}',
  'ai.online': 'Локальный ИИ (Ollama) подключён',
  'ai.offline': 'Локальный ИИ (Ollama) не найден. Запустите «ollama serve».',
  'ai.checking': 'Проверяю локальный ИИ…',
  'gen.needAi':
    'Генерация работает только через локальный ИИ. Запустите Ollama (и разрешите доступ: OLLAMA_ORIGINS=*), затем нажмите «Проверить снова».',
  'ai.settings': 'Настройки ИИ (модель, адрес)',
  'ai.recheck': 'Проверить снова',
  'ai.modelMissing':
    'Модель «{model}» не установлена. Выберите одну из установленных ниже, или скачайте нужную: ollama pull {model}',
  'ai.oneModel': '🔗 Одна модель для обоих языков',
}

const kk: Dict = {
  'nav.generate': 'Генератор',
  'nav.community': 'Қауымдастық',
  'nav.library': 'Кітапхана',
  'nav.profile': 'Профиль',
  'nav.create': 'Жасау',
  'nav.toggleTheme': 'Теманы ауыстыру',
  'nav.uiLang': 'Интерфейс тілі',
  'common.back': 'Артқа',
  'common.next': 'Әрі қарай',
  'common.publish': 'Жариялау',
  'common.generate': 'Жасау',
  'common.retry': 'Қайталау',
  'common.toParams': 'Параметрлерге',
  'common.open': 'Ашу',
  'common.collapse': 'Жию',
  'common.send': 'Жіберу',
  'common.createMaterial': 'Материал жасау',
  'common.openCommunity': 'Қауымдастықты ашу',
  'common.toCommunity': 'Қауымдастыққа',
  'common.home': 'Басты бетке',

  'footer.text':
    'AI Ustaz — оқу материалдарын ЖИ-мен жасауға арналған платформаның прототипі. Деректер браузерде жергілікті сақталады.',

  'home.badge': 'Мұғалімдерге арналған ЖИ',
  'home.title': 'Оқу материалдары бір кеште емес, бірнеше минутта',
  'home.subtitle':
    'Өз файлдарыңыз бен деректеріңіз негізінде тапсырмалар, тесттер, флешкарталар мен ойындар жасаңыз. Әріптестермен бөлісіп, материалдарды бірге жетілдіріңіз.',
  'home.ctaCreate': 'Материал жасау',
  'home.ctaBrowse': 'Қауымдастықты қарау',
  'home.how': 'Бұл қалай жұмыс істейді',
  'home.popular': 'Қауымдастықта танымал',
  'home.allWorks': 'Барлық жұмыстар',
  'home.step1t': 'Контекст қосыңыз',
  'home.step1x': 'Файл жүктеңіз (TXT, PDF, DOCX) немесе өз тезистеріңізді енгізіңіз — ЖИ оларды ескереді.',
  'home.step2t': 'Чаттан дерек табыңыз',
  'home.step2x': 'Материал жетіспей ме? Чаттан сұраңыз, табылғанды тексеріп, дереккөздерге қосыңыз.',
  'home.step3t': 'Материал жасаңыз',
  'home.step3x': 'Тест, тапсырма, флешкарта, ойын немесе сабақ жоспары — қажет сынып пен күрделілік деңгейінде.',
  'home.step4t': 'Бөлісіп, толықтырыңыз',
  'home.step4x': 'Жұмысты қауымдастыққа жариялаңыз. Әріптестер пікір жазып, өз үлесін қоса алады.',

  'gen.title': 'Материал генераторы',
  'gen.subtitle': 'Деректеріңізді қосыңыз, түрін таңдаңыз — дайын материал алыңыз.',
  'gen.step.context': 'Контекст',
  'gen.step.what': 'Не жасаймыз',
  'gen.step.result': 'Нәтиже',
  'gen.noSourcesNote': 'Дереккөзсіз де жалғастыруға болады — ЖИ тақырып бойынша жасайды.',
  'gen.materialType': 'Материал түрі',
  'gen.topic': 'Материал тақырыбы',
  'gen.topicHint': 'Мысалы: «Фотосинтез», «Квадрат теңдеулер»',
  'gen.topicPlaceholder': 'Тақырыпты енгізіңіз',
  'gen.institution': 'Оқу орнының түрі',
  'gen.subject': 'Пән',
  'gen.grade': 'Сынып',
  'gen.course': 'Курс',
  'gen.difficulty': 'Күрделілік',
  'gen.language': 'Тіл',
  'gen.cardFormat': 'Карта пішімі',
  'gen.cardFormat.term': 'Термин → Анықтама',
  'gen.cardFormat.qa': 'Сұрақ → Жауап',
  'gen.count': 'Элемент саны: {n}',
  'gen.notes': 'Қосымша тілектер',
  'gen.notesHint': 'Міндетті емес',
  'gen.notesPlaceholder': 'Мыс.: көбірек практика, өмірден мысалдар қосу, формулаларды азайту…',
  'gen.generateOllama': 'Ollama арқылы жасау',
  'gen.thinking': '«{model}» моделі материалды талдап жатыр…',
  'gen.starting': 'Іске қосудамын…',
  'gen.startingDemo': 'Демо-генераторды іске қосудамын…',
  'gen.slowNote':
    'Жергілікті модель 20–120 секунд ойлануы мүмкін, әсіресе үлкен құжатпен — бұл қалыпты жағдай.',
  'gen.errorTitle': 'Ollama арқылы жасау қатесі',
  'gen.demoFallback': 'Демо-генератормен жасау',
  'gen.published': 'Қауымдастыққа жарияланды',
  'gen.changeParams': 'Параметрлерді өзгерту',
  'gen.saveDraft': 'Жобаны сақтау',
  'gen.inDrafts': 'Жобаларда',
  'typeHint.flashcards': 'Термин ↔ анықтама немесе сұрақ ↔ жауап. Ollama арқылы.',
  'typeHint.quiz': 'Материалыңыз бойынша нақты сұрақтар. Ollama арқылы.',
  'typeHint.assignment': 'Тапсырмалар мен балдары бар жұмыс парағы',
  'typeHint.game': 'Сабақ басындағы жаттығуға «жұбын тап» ойыны',
  'typeHint.lesson': 'Уақыты көрсетілген кезең-кезеңдік сабақ жоспары',
  'typeHint.summary': 'Негізгі тезистері бар қысқаша конспект',

  'ollama.toggle': 'Ollama арқылы жасау (жергілікті ЖИ)',
  'ollama.desc':
    'Дереккөздер мазмұны бойынша компьютеріңізде нақты генерация. Флешкарталар мен тесттер қолдау табады — қалған түрлерін демо-генератор жасайды.',
  'ollama.checking': 'Байланысты тексерудемін…',
  'ollama.online': 'Ollama байланыста · модельдер: {n}',
  'ollama.offline': 'Байланыс жоқ: {err}',
  'ollama.recheck': 'Тексеру',
  'ollama.modelFor': '«{lang}» тіліне арналған модель',
  'ollama.notInstalled': 'Орнатылғандар арасында модель табылмады. Орындаңыз:',
  'ollama.showAddr': '+ Сервер мекенжайы',
  'ollama.hideAddr': '− Жасыру',
  'ollama.serverAddr': 'Ollama мекенжайы',
  'ollama.demoNote': 'Бұл түрге Ollama әзірге қосылмаған — генерация демо-генератор арқылы жүреді.',

  'community.title': 'Қауымдастық',
  'community.subtitle': 'Мұғалімдерден {n} материал. Сақтаңыз, пікір жазыңыз, толықтырыңыз.',
  'community.searchPlaceholder': 'Атауы, тегтері, авторы бойынша іздеу…',
  'community.allTypes': 'Барлық түрлер',
  'community.all': 'Барлығы',
  'community.sortNew': 'Алдымен жаңалары',
  'community.sortPopular': 'Танымалдары',
  'community.sortDiscussed': 'Талқыланғандары',
  'community.nothing': 'Ештеңе табылмады',
  'community.nothingDesc': 'Сүзгілерді немесе іздеу сұранысын өзгертіп көріңіз.',
  'community.resetFilters': 'Сүзгілерді тазалау',

  'work.notFound': 'Материал табылмады',
  'work.notFoundDesc': 'Ол жойылған болуы мүмкін немесе сілтеме қате.',
  'work.backToCommunity': 'Қауымдастыққа оралу',
  'work.forkedFrom': 'Толықтыру:',
  'work.difficultyPrefix': 'Күрделілік',
  'work.saved': 'Сақталды',
  'work.save': 'Сақтау',
  'work.contribute': 'Толықтыру',
  'work.views': '{n} қаралым',
  'work.comments': '{n} пікір',
  'work.contributions': '{n} толықтыру',
  'work.sources': 'Дереккөздер',
  'work.contribTitle': 'Қауымдастық толықтырулары',
  'work.noContrib': 'Әзірге ешкім толықтырмаған. Бірінші болыңыз — «Толықтыру» түймесін басыңыз.',
  'work.merged': 'қабылданды',
  'work.pending': 'қаралуда',
  'work.plusItems': '+{n} элемент',
  'work.commentsTitle': 'Пікірлер',
  'work.commentPlaceholder': 'Пікіріңізбен бөлісіңіз немесе жақсарту ұсыныңыз…',
  'work.noComments': 'Әзірге пікір жоқ.',

  'contribute.backToMaterial': 'Материалға оралу',
  'contribute.title': 'Материалды толықтыру',
  'contribute.subtitle': 'Сіз «{title}» материалын толықтырудасыз ({type}, {subject}, {grade}).',
  'contribute.origAuthor': 'Түпнұсқа авторы: {name}',
  'contribute.newData': 'Толықтыруға жаңа деректер',
  'contribute.whatAdding': 'Не қосасыз',
  'contribute.whatAddingHint': 'Толықтыруыңыз немен пайдалы екенін сипаттаңыз',
  'contribute.whatAddingPlaceholder': 'Мыс.: ерекшеліктер мен қате пікірлер туралы 4 сұрақ қостым',
  'contribute.howMany': 'Қанша жаңа элемент жасау керек: {n}',
  'contribute.genAddition': 'Толықтыруды жасау',
  'contribute.previewOf': 'Толықтыру алдын ала қарауы ({n} элемент)',
  'contribute.sendToAuthor': 'Толықтыруды авторға жіберу',
  'contribute.publishSeparate': 'Бөлек жұмыс ретінде жариялау',
  'contribute.needNote': 'Авторға жіберу үшін толықтыру сипаттамасын қосыңыз.',
  'contribute.doneTitle': 'Толықтыру жіберілді',
  'contribute.doneDesc':
    '«{name}» авторы сіздің ұсынысыңызды материал бетінде «қаралуда» күйінде көреді.',
  'contribute.openMaterial': 'Материалды ашу',
  'contribute.localNote': 'Прототипте толықтыру жергілікті сақталады.',
  'contribute.typeUnsupported':
    'ЖИ арқылы толықтыру әзірге тек флешкарталар мен тесттерге қолжетімді.',

  'library.title': 'Кітапхана',
  'library.subtitle': 'Қауымдастықтың сақталған жұмыстары мен жобаларыңыз.',
  'library.savedTab': 'Сақталған',
  'library.draftsTab': 'Жобалар',
  'library.noSaved': 'Сақталған материал жоқ',
  'library.noSavedDesc': 'Кез келген материал картасындағы бетбелгіні басып, оны осында сақтаңыз.',
  'library.noDrafts': 'Әзірге жоба жоқ',
  'library.noDraftsDesc': 'Материал жасап, оны жоба ретінде сақтаңыз — кейін қайта ораласыз.',
  'library.createdAgo': 'жасалды: {ago}',

  'profile.memberOf': 'AI Ustaz қауымдастығының мүшесі',
  'profile.newMaterial': 'Жаңа материал',
  'profile.stat.pubs': 'Жарияланым',
  'profile.stat.likes': 'ұнатым',
  'profile.stat.views': 'қаралым',
  'profile.stat.contribs': 'толықтыру',
  'profile.myPublications': 'Менің жарияланымдарым',
  'profile.drafts': 'Жобалар',
  'profile.nothing': 'Сіз әлі ештеңе жарияламадыңыз',
  'profile.nothingDesc': 'Материал жасап, оны қауымдастықпен бөлісіңіз.',
  'profile.demoTitle': 'Демо-деректер',
  'profile.demoDesc':
    'Прототип барлығын браузердің localStorage-інде сақтайды. Бастапқы мысалдар жинағын қайтаруға болады.',
  'profile.resetDemo': 'Демо-деректерді қалпына келтіру',
  'profile.confirmReset': 'Барлық жергілікті деректерді бастапқы мысалдарға қайтарасыз ба?',

  'mat.quiz.check': 'Жауаптарды тексеру',
  'mat.quiz.result': 'Нәтиже: {a} / {b}',
  'mat.quiz.retry': 'Қайта өту',
  'mat.flash.term': 'Термин',
  'mat.flash.definition': 'Анықтама',
  'mat.flash.question': 'Сұрақ',
  'mat.flash.answer': 'Жауап',
  'mat.flash.tapToSee': 'жауапты көру үшін басыңыз',
  'mat.flash.backToTerm': 'терминге оралу',
  'mat.flash.backToQuestion': 'сұраққа оралу',
  'mat.flash.shuffle': 'араластыру',
  'mat.assign.points': 'балл',
  'mat.assign.hint': 'Кеңес',
  'mat.assign.showAnswer': 'Жауапты көрсету',
  'mat.assign.hideAnswer': 'Жауапты жасыру',
  'mat.assign.total': 'Барлығы: {n} балл',
  'mat.game.terms': 'Ұғымдар',
  'mat.game.defs': 'Сипаттамалар',
  'mat.game.allFound': '🎉 Барлық жұп табылды!',
  'mat.game.found': 'Табылған жұп: {a} / {b}',
  'mat.lesson.objectives': 'Сабақ мақсаттары',
  'mat.lesson.min': '{n} мин',
  'mat.lesson.total': 'Барлығы: {n} мин',
  'mat.summary.keyPoints': 'Негізгі тезистер',

  'ctx.findInChat': 'Чаттан дерек іздеу',
  'ctx.ownInfo': 'Өз ақпаратыңыз',
  'ctx.ownInfoPlaceholder': 'Мәтінді, тезистерді, есеп шартын, материалға қойылатын талаптарды енгізіңіз…',
  'ctx.add': 'Қосу',
  'ctx.dropFiles': 'Файлдарды әкеліңіз немесе басыңыз',
  'ctx.dropHint':
    'TXT, MD, PDF, DOCX — мәтін автоматты танылады. Басқа пішімдер — мәтінді қолмен енгізіңіз.',
  'ctx.sourcesFor': 'Генерацияға арналған дереккөздер ({n})',
  'ctx.sourcesEmpty': 'Әзірге бос. Файл, жазба қосыңыз немесе жоғарыдан чаттан дерек табыңыз.',
  'ctx.search': 'Іздеу',
  'ctx.searching': 'Қолайлы деректерді іздеудемін…',
  'ctx.toSources': 'Дереккөздерге',
  'ctx.added': 'Қосылды',
  'ctx.searchPlaceholder': 'Мыс.: фотосинтез, квадрат теңдеулер, Екінші дүниежүзілік соғыс себептері…',
  'ctx.note': 'Жазба',

  'nf.title': 'Бет табылмады',
  'nf.desc': 'Сілтеме ескірген болуы мүмкін немесе материал жойылған.',

  'engine.demo': 'Демо-генератор',

  'time.now': 'жаңа ғана',
  'time.min': '{n} мин бұрын',
  'time.hour': '{n} сағ бұрын',
  'time.day': '{n} күн бұрын',

  'type.quiz': 'Тест',
  'type.flashcards': 'Флешкарталар',
  'type.assignment': 'Тапсырма',
  'type.game': 'Ойын',
  'type.lesson': 'Сабақ жоспары',
  'type.summary': 'Конспект',
  'diff.easy': 'Оңай',
  'diff.medium': 'Орташа',
  'diff.hard': 'Күрделі',
  'inst.school': 'Мектеп',
  'inst.college': 'Колледж',
  'inst.university': 'ЖОО',
  'lang.kk': 'Қазақша',
  'lang.ru': 'Русский',
  'subject.Математика': 'Математика',
  'subject.Физика': 'Физика',
  'subject.Химия': 'Химия',
  'subject.Биология': 'Биология',
  'subject.История': 'Тарих',
  'subject.География': 'География',
  'subject.Информатика': 'Информатика',
  'subject.Русский язык': 'Орыс тілі',
  'subject.Казахский язык': 'Қазақ тілі',
  'subject.Английский язык': 'Ағылшын тілі',
  'subject.Литература': 'Әдебиет',
  'subject.Обществознание': 'Қоғамтану',
  'count.quiz': '{n} сұрақ',
  'count.flashcards': '{n} карта',
  'count.assignment': '{n} тапсырма',
  'count.game': '{n} жұп',
  'count.lesson': '{n} кезең',
  'count.summary': '{n} тезис',

  'gen.step.module': 'Модуль',
  'gen.step.data': 'Деректер',
  'gen.step.params': 'Параметрлер',
  'gen.pickModule': 'Не жасау керегін таңдаңыз',
  'gen.comingSoon': 'жақында',
  'gen.dataIntro': 'ЖИ-ге материал беріңіз: файл жүктеңіз немесе чат арқылы ақпарат табыңыз.',
  'src.tab.file': 'Өз файлым',
  'src.tab.chat': 'Чаттан іздеу (ЖИ)',
  'src.file.hint': 'Тақырып бойынша ақпараты бар файл жүктеңіз — ЖИ оның мазмұнын оқиды.',
  'src.file.extracted': 'Мәтін оқылды: {n} таңба',
  'src.file.noText': 'Мәтінді алу мүмкін болмады. Төменде мазмұнды қолмен енгізіңіз.',
  'src.paste': 'Немесе мәтінді қолмен енгізіңіз',
  'src.chat.intro':
    'ЖИ-ден тақырып туралы сұраңыз — ол ChatGPT сияқты материал жинайды. Жауап ұнаса «Осы деректерді пайдалану» түймесін басыңыз. Чатта нақтылауға болады.',
  'src.chat.placeholder': 'Мыс.: 6-сыныпқа арналған фотосинтез туралы материал жина',
  'src.chat.thinking': 'ЖИ ойлануда…',
  'src.chat.use': 'Осы деректерді пайдалану',
  'src.chat.used': 'Дереккөздерге қосылды',
  'src.chat.needAi': 'Чат үшін қосылған жергілікті ЖИ (Ollama) қажет. Төмендегі параметрлерден қосыңыз.',
  'src.chat.send': 'Сұрау',
  'src.added': 'Дереккөздерде: {n}',
  'ai.online': 'Жергілікті ЖИ (Ollama) қосылған',
  'ai.offline': 'Жергілікті ЖИ (Ollama) табылмады. «ollama serve» іске қосыңыз.',
  'ai.checking': 'Жергілікті ЖИ тексерілуде…',
  'gen.needAi':
    'Генерация тек жергілікті ЖИ арқылы жұмыс істейді. Ollama-ны іске қосыңыз (қатынасқа рұқсат: OLLAMA_ORIGINS=*), содан соң «Қайта тексеру» түймесін басыңыз.',
  'ai.settings': 'ЖИ параметрлері (модель, мекенжай)',
  'ai.recheck': 'Қайта тексеру',
  'ai.modelMissing':
    '«{model}» моделі орнатылмаған. Төмендегі орнатылғандардың бірін таңдаңыз немесе жүктеп алыңыз: ollama pull {model}',
  'ai.oneModel': '🔗 Екі тілге бір модель',
}

const DICTS: Record<UILang, Dict> = { ru, kk }

type Vars = Record<string, string | number>

interface I18nValue {
  lang: UILang
  setLang: (l: UILang) => void
  t: (key: string, vars?: Vars) => string
  tType: (v: MaterialType) => string
  tDiff: (v: Difficulty) => string
  tInst: (v: EducationLevel) => string
  tLang: (v: Lang) => string
  tSubject: (v: string) => string
  tGrade: (v: string) => string
}

const I18nContext = createContext<I18nValue | null>(null)

function getInitial(): UILang {
  try {
    const s = localStorage.getItem(KEY)
    if (s === 'ru' || s === 'kk') return s
  } catch {
    /* ignore */
  }
  return 'ru'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<UILang>(getInitial)

  const setLang = useCallback((l: UILang) => {
    setLangState(l)
    try {
      localStorage.setItem(KEY, l)
    } catch {
      /* ignore */
    }
    document.documentElement.lang = l
  }, [])

  const t = useCallback(
    (key: string, vars?: Vars) => {
      let s = DICTS[lang][key] ?? DICTS.ru[key] ?? key
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
      return s
    },
    [lang],
  )

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t,
      tType: (v) => t(`type.${v}`),
      tDiff: (v) => t(`diff.${v}`),
      tInst: (v) => t(`inst.${v}`),
      tLang: (v) => t(`lang.${v}`),
      tSubject: (v) => t(`subject.${v}`),
      tGrade: (v) => (lang === 'kk' ? v.replace(/класс/g, 'сынып') : v),
    }),
    [lang, setLang, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>')
  return ctx
}
