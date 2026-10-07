-- Доступ исследователя (администратора) к сводной статистике по анкетам.
-- profiles уже читаемы всеми (см. 0001_init.sql), поэтому отдельная политика
-- на чтение профилей не нужна — не хватает только чтения ЧУЖИХ entry/exit_surveys.

alter table public.profiles add column is_admin boolean not null default false;

create policy "admins read all entry surveys"
  on public.entry_surveys for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

create policy "admins read all exit surveys"
  on public.exit_surveys for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Аккаунт автора исследования получает права администратора автоматически,
-- если/когда зарегистрируется с этим email. Если уже зарегистрирован — сработает сразу.
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'perizat0396@gmail.com');

create or replace function public.grant_admin_by_email()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email = 'perizat0396@gmail.com' then
    update public.profiles set is_admin = true where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created_grant_admin
  after insert on auth.users
  for each row execute procedure public.grant_admin_by_email();
