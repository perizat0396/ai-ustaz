-- AI Ustaz: схема БД сообщества (профили, публикации, черновики, комментарии,
-- дополнения, лайки/сохранения). Materials хранятся как jsonb — структура
-- полностью повторяет типы из src/types.ts (Material/MaterialContent), чтобы
-- фронтенду не нужно было переписывать модель данных.

create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default '',
  avatar_color text not null default '#4f46e5',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by everyone"
  on public.profiles for select
  using (true);

create policy "users manage their own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Автосоздание профиля при регистрации (имя берём из user_metadata.name, если передано).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- drafts (неопубликованные материалы пользователя) ----------
create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  material jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.drafts enable row level security;

create policy "users manage their own drafts"
  on public.drafts for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ---------- works (опубликованные материалы) ----------
create table public.works (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  material jsonb not null,
  published_at timestamptz not null default now(),
  views integer not null default 0,
  forked_from_id uuid references public.works(id) on delete set null,
  forked_from_title text,
  forked_from_author text
);

alter table public.works enable row level security;

create policy "works are readable by everyone"
  on public.works for select
  using (true);

create policy "authors create their own works"
  on public.works for insert
  with check (auth.uid() = author_id);

create policy "authors update their own works"
  on public.works for update
  using (auth.uid() = author_id);

create policy "authors delete their own works"
  on public.works for delete
  using (auth.uid() = author_id);

-- ---------- likes / saves ----------
create table public.likes (
  work_id uuid not null references public.works(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (work_id, user_id)
);

alter table public.likes enable row level security;

create policy "likes are readable by everyone"
  on public.likes for select using (true);

create policy "users manage their own likes"
  on public.likes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.saves (
  work_id uuid not null references public.works(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (work_id, user_id)
);

alter table public.saves enable row level security;

create policy "users read their own saves"
  on public.saves for select
  using (auth.uid() = user_id);

create policy "users manage their own saves"
  on public.saves for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- comments ----------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create policy "comments are readable by everyone"
  on public.comments for select using (true);

create policy "users create their own comments"
  on public.comments for insert
  with check (auth.uid() = author_id);

-- ---------- contributions (предложенные дополнения к чужой работе) ----------
create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  added_items integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'merged')),
  created_at timestamptz not null default now()
);

alter table public.contributions enable row level security;

create policy "contributions are readable by everyone"
  on public.contributions for select using (true);

create policy "users create their own contributions"
  on public.contributions for insert
  with check (auth.uid() = author_id);

create policy "work authors update contribution status"
  on public.contributions for update
  using (
    auth.uid() = author_id
    or auth.uid() = (select author_id from public.works where id = work_id)
  );

-- Инкремент просмотров разрешён любому (даже анониму), но только счётчика —
-- обычная UPDATE-политика на works открыта только автору, поэтому просмотр
-- идёт через отдельную SECURITY DEFINER функцию.
create function public.increment_work_views(work_id uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.works set views = views + 1 where id = work_id;
$$;

grant execute on function public.increment_work_views(uuid) to anon, authenticated;

-- ---------- индексы ----------
create index works_author_idx on public.works(author_id);
create index works_published_idx on public.works(published_at desc);
create index comments_work_idx on public.comments(work_id);
create index contributions_work_idx on public.contributions(work_id);
create index drafts_owner_idx on public.drafts(owner_id);
