-- Сид «официальных» материалов платформы AI Ustaz (2-3 примера, чтобы сообщество
-- не выглядело пустым для первых посетителей). Публикуются от системного аккаунта.
--
-- ПЕРЕД ЗАПУСКОМ:
-- 1. В Supabase Dashboard → Authentication → Users → Add user создайте пользователя
--    с email, например, platform@ai-ustaz.kz (пароль любой, никто им не логинится).
-- 2. Скопируйте его UUID и подставьте вместо '00000000-0000-0000-0000-000000000001' ниже
--    (в обоих местах: profiles.id и works.author_id).
-- 3. Выполните этот файл в Supabase SQL Editor (или supabase db push / psql).

insert into public.profiles (id, name, role, avatar_color)
values ('00000000-0000-0000-0000-000000000001', 'AI Ustaz', 'Платформа', '#4f46e5')
on conflict (id) do nothing;

insert into public.works (author_id, material, published_at)
values
  (
    '00000000-0000-0000-0000-000000000001',
    jsonb_build_object(
      'id', 'mat_seed_quad',
      'type', 'quiz',
      'title', 'Тест: Квадратные уравнения',
      'titleKk', 'Тест: Квадрат теңдеулер',
      'subject', 'Математика',
      'institution', 'school',
      'grade', '8 класс',
      'difficulty', 'hard',
      'language', 'ru',
      'engine', 'AI Ustaz',
      'summary', 'Тест из 10 вопросов по квадратным уравнениям: дискриминант, теорема Виета, разложение на множители.',
      'summaryKk', 'Квадрат теңдеулер бойынша 10 сұрақтан тұратын тест: дискриминант, Виет теоремасы, көбейткіштерге жіктеу.',
      'tags', jsonb_build_array('математика', 'алгебра', 'дискриминант', 'виета'),
      'createdAt', extract(epoch from now()) * 1000,
      'sources', jsonb_build_array(),
      'content', jsonb_build_object(
        'kind', 'quiz',
        'questions', jsonb_build_array(
          jsonb_build_object(
            'id', 'q1', 'kind', 'mcq',
            'prompt', 'Сколько корней имеет уравнение, если дискриминант D < 0?',
            'options', jsonb_build_array('Ни одного действительного', 'Один', 'Два', 'Бесконечно много'),
            'correctIndex', 0, 'explanation', 'При D < 0 действительных корней нет.'
          ),
          jsonb_build_object(
            'id', 'q2', 'kind', 'mcq',
            'prompt', 'Формула дискриминанта для ax² + bx + c = 0:',
            'options', jsonb_build_array('b² − 4ac', '2a / b', 'b² + 4ac', '4ac − b²'),
            'correctIndex', 0, 'explanation', 'D = b² − 4ac.'
          )
        )
      )
    ),
    now() - interval '5 days'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    jsonb_build_object(
      'id', 'mat_seed_photo',
      'type', 'flashcards',
      'title', 'Флешкарты: Фотосинтез',
      'titleKk', 'Флешкарталар: Фотосинтез',
      'subject', 'Биология',
      'institution', 'school',
      'grade', '6 класс',
      'difficulty', 'medium',
      'language', 'ru',
      'engine', 'AI Ustaz',
      'summary', 'Набор флешкарт по теме «Фотосинтез»: световая и темновая фазы, хлоропласт, факторы среды.',
      'summaryKk', '«Фотосинтез» тақырыбына арналған флешкарталар жинағы: жарық және қараңғы фазалар, хлоропласт, орта факторлары.',
      'tags', jsonb_build_array('биология', 'фотосинтез', 'хлоропласт', 'клетка'),
      'createdAt', extract(epoch from now()) * 1000,
      'sources', jsonb_build_array(),
      'content', jsonb_build_object(
        'kind', 'flashcards',
        'cards', jsonb_build_array(
          jsonb_build_object('id', 'c1', 'front', 'Фотосинтез', 'back', 'Процесс образования органических веществ из CO₂ и воды на свету с выделением кислорода.'),
          jsonb_build_object('id', 'c2', 'front', 'Хлоропласт', 'back', 'Органоид растительной клетки, где происходит фотосинтез; содержит хлорофилл.')
        )
      )
    ),
    now() - interval '2 days'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    jsonb_build_object(
      'id', 'mat_seed_ww2',
      'type', 'lesson',
      'title', 'План урока: Начало Второй мировой войны',
      'titleKk', 'Сабақ жоспары: Екінші дүниежүзілік соғыстың басталуы',
      'subject', 'История',
      'institution', 'school',
      'grade', '10 класс',
      'difficulty', 'medium',
      'language', 'ru',
      'engine', 'AI Ustaz',
      'summary', 'План урока на 45 минут: причины, хронология 1939–1941, работа с картой и источниками.',
      'summaryKk', '45 минутқа арналған сабақ жоспары: себептері, 1939–1941 жж. хронологиясы, картамен және дереккөздермен жұмыс.',
      'tags', jsonb_build_array('история', 'вторая мировая война', '1939', 'хронология'),
      'createdAt', extract(epoch from now()) * 1000,
      'sources', jsonb_build_array(),
      'content', jsonb_build_object(
        'kind', 'lesson',
        'objectives', jsonb_build_array(
          'Понять причины начала Второй мировой войны',
          'Запомнить ключевые даты 1939–1941 гг.'
        ),
        'sections', jsonb_build_array(
          jsonb_build_object('id', 's1', 'heading', 'Введение и проверка знаний', 'body', 'Повторение итогов Первой мировой войны и Версальской системы.', 'minutes', 7),
          jsonb_build_object('id', 's2', 'heading', 'Причины войны', 'body', 'Экономический кризис, реваншизм, агрессивная внешняя политика.', 'minutes', 15)
        )
      )
    ),
    now() - interval '8 days'
  );
