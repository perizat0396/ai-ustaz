-- Анкеты для докторского исследования «Методика подготовки будущих учителей
-- информатики к реализации сетевого взаимодействия» (автор: Әнәфия Перизат).
--
-- Анкета 1 (entry_surveys) — обязательная, сразу после регистрации, до входа
-- в платформу. Роль/статус пользователя уже собраны в profiles.role при
-- регистрации, здесь не дублируются.
-- Анкета 2 (exit_surveys) — учитель сам открывает из профиля после того, как
-- пользовался платформой; можно пройти повторно (upsert), чтобы обновить отзыв.
--
-- Ответы хранятся как jsonb — так вопросы можно менять/добавлять без новых
-- миграций. RLS: каждый видит и пишет только свою анкету; исследователь
-- читает все ответы напрямую через Supabase Dashboard (service role).

create table public.entry_surveys (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  answers jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.entry_surveys enable row level security;

create policy "users manage their own entry survey"
  on public.entry_surveys for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create table public.exit_surveys (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  answers jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exit_surveys enable row level security;

create policy "users manage their own exit survey"
  on public.exit_surveys for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
