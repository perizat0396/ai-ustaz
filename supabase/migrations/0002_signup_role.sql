-- Регистрация теперь спрашивает «кто вы» (учитель школы/колледжа/вуза, студент, другое) —
-- сохраняем это в profiles.role вместо пустой строки по умолчанию.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'other')
  );
  return new;
end;
$$;
