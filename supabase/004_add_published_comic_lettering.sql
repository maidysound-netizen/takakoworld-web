create table if not exists public.comic_lettering_published (
  series_slug text not null,
  episode_slug text not null,
  data jsonb not null default '[]'::jsonb,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz not null default now(),
  primary key (series_slug, episode_slug)
);

alter table public.comic_lettering_published enable row level security;

grant select on table public.comic_lettering_published to anon, authenticated;
grant insert, update on table public.comic_lettering_published to authenticated;

drop policy if exists "Public can read published comic lettering" on public.comic_lettering_published;
create policy "Public can read published comic lettering"
on public.comic_lettering_published
for select
to anon, authenticated
using (true);

drop policy if exists "Editors can publish comic lettering" on public.comic_lettering_published;
create policy "Editors can publish comic lettering"
on public.comic_lettering_published
for insert
to authenticated
with check (
  published_by = (select auth.uid())
  and (select private.current_user_role()) in ('editor','admin')
);

drop policy if exists "Editors can update published comic lettering" on public.comic_lettering_published;
create policy "Editors can update published comic lettering"
on public.comic_lettering_published
for update
to authenticated
using ((select private.current_user_role()) in ('editor','admin'))
with check (
  published_by = (select auth.uid())
  and (select private.current_user_role()) in ('editor','admin')
);
