create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid()
$$;

revoke all on function private.current_user_role() from public;
grant execute on function private.current_user_role() to authenticated;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.current_user_role()) = 'admin');

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles for update to authenticated
using ((select private.current_user_role()) = 'admin')
with check ((select private.current_user_role()) = 'admin');

drop policy if exists "Editors can read comic lettering" on public.comic_lettering;
create policy "Editors can read comic lettering"
on public.comic_lettering for select to authenticated
using (owner_id = (select auth.uid()) and (select private.current_user_role()) in ('editor','admin'));

drop policy if exists "Editors can insert comic lettering" on public.comic_lettering;
create policy "Editors can insert comic lettering"
on public.comic_lettering for insert to authenticated
with check (owner_id = (select auth.uid()) and (select private.current_user_role()) in ('editor','admin'));

drop policy if exists "Editors can update comic lettering" on public.comic_lettering;
create policy "Editors can update comic lettering"
on public.comic_lettering for update to authenticated
using (owner_id = (select auth.uid()) and (select private.current_user_role()) in ('editor','admin'))
with check (owner_id = (select auth.uid()) and (select private.current_user_role()) in ('editor','admin'));

drop function if exists public.current_user_role();
revoke all on function public.handle_new_user() from public, anon, authenticated;
