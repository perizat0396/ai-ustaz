# AI Ustaz

Платформа для ИИ-генерации учебных материалов и обмена ими в сообществе преподавателей.

Сайт: **https://ai-ustaz.vku.edu.kz** · Код: **https://github.com/perizat0396/ai-ustaz2**

> Ключи и секреты в репозиторий не входят: Supabase-ключи — в `.env.local` (шаблон
> `.env.local.example`), ключ Gemini — в секретах Supabase (`supabase secrets set`).

Фронтенд — статика (React + Vite), без своего сервера. Данные и авторизация — **Supabase**
(Postgres + Auth), генерация материалов — **Google Gemini** через Supabase Edge Function,
которая держит секретный ключ на сервере и никогда не отдаёт его в браузер.

## Стек

- **React 19** + **TypeScript**, **Vite 6**, **Tailwind CSS v4**, **React Router v7**
- **Supabase**: Postgres (БД сообщества), Auth (email + пароль), Edge Functions (Deno)
- **Gemini API**: генерация материалов (платный ключ; по умолчанию быстрая `gemini-3.6-flash`)

## Настройка (один раз)

1. Создайте проект на [supabase.com](https://supabase.com) (бесплатно). В Project Settings → API
   возьмите **Project URL** и **anon public key**.
2. Скопируйте `.env.local.example` → `.env.local` и вставьте эти значения:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
3. Примените схему БД — в Supabase SQL Editor выполните файл
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) (или через
   `supabase db push`, если используете Supabase CLI).
4. (Необязательно) Засейдите 2–3 «официальных» материала платформы — см. инструкцию в начале
   [`supabase/seed.sql`](supabase/seed.sql).
5. Получите API key в [Google AI Studio](https://aistudio.google.com/apikey).
6. Задеплойте edge function и добавьте туда секрет:
   ```bash
   supabase functions deploy generate
   supabase secrets set GEMINI_API_KEY=ваш_ключ
   # (необязательно) другая модель: supabase secrets set GEMINI_MODEL=<другая модель>
   ```

## Запуск

```bash
npm install
npm run dev
```

Откроется `http://localhost:5173`. Если ключи Supabase не заданы, приложение покажет экран
с инструкцией вместо белого экрана.

Сборка продакшена: `npm run build`, предпросмотр сборки: `npm run preview`.

## Структура

```
src/
  components/      UI-примитивы, Navbar, WorkCard, SourcePicker, MaterialRenderer, иконки
  hooks/           useTheme (светлая/тёмная тема)
  lib/
    supabase.ts    клиент Supabase (env VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
    auth.tsx       AuthProvider/useAuth — вход/регистрация, профиль пользователя
    store.tsx       данные сообщества (works/drafts/likes/saves/comments) через Supabase
    ai.ts          клиент генерации — вызывает edge function `generate`
    generator.ts   buildMaterial() — сборка объекта Material из ответа ИИ
    utils.ts       форматирование, справочники предметов/классов/заведений
  pages/           экраны приложения (в т.ч. Auth.tsx — вход/регистрация)
  types.ts         доменная модель

supabase/
  migrations/      схема БД (profiles, works, drafts, comments, contributions, likes, saves)
  seed.sql         2-3 официальных материала платформы
  functions/generate/  edge function: промпты + вызов Gemini API
```

## Языки и уровни

- Языки материала: **қазақша** и **русский**.
- Тип заведения: **Школа / Колледж / ВУЗ** — от него зависит список классов/курсов.

## Генерация

Все типы материалов (флешкарты, тест, задание, конспект, игра, план урока) генерируются через edge function
`supabase/functions/generate` → Gemini. Экономия токенов: дешёвая модель по умолчанию, отключённые
«размышления», потолок ответа (`MAX_JSON_TOKENS`), лимиты на размер входа (`sanitizeInput`: до 6 источников
по 8000 символов, заметки/тема, количество элементов, история чата). Модель меняется секретом `GEMINI_MODEL`.
