-- TAKAKO WORLD roles: user / vip / editor / admin
-- Run once in Supabase SQL Editor.

do $$ begin
  create type public.user_role as enum ('user','vip','editor','admin');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'user',
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing users:
-- If there is currently exactly one Auth user, that account becomes admin.
-- If there are multiple users, they are kept as normal users for safety.
insert into public.profiles (id, role)
select
  u.id,
  case
    when (select count(*) from auth.users) = 1 then 'admin'::public.user_role
    else 'user'::public.user_role
  end
from auth.users u
on conflict (id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

-- Tighten comic lettering: only editor/admin accounts may use CMS data.
drop policy if exists "Users can read own comic lettering" on public.comic_lettering;
drop policy if exists "Users can insert own comic lettering" on public.comic_lettering;
drop policy if exists "Users can update own comic lettering" on public.comic_lettering;

create policy "Editors can read comic lettering"
on public.comic_lettering
for select
to authenticated
using (
  owner_id = auth.uid()
  and public.current_user_role() in ('editor','admin')
);

create policy "Editors can insert comic lettering"
on public.comic_lettering
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and public.current_user_role() in ('editor','admin')
);

create policy "Editors can update comic lettering"
on public.comic_lettering
for update
to authenticated
using (
  owner_id = auth.uid()
  and public.current_user_role() in ('editor','admin')
)
with check (
  owner_id = auth.uid()
  and public.current_user_role() in ('editor','admin')
);
