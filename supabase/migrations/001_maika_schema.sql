-- Maika — schéma minimal (joueurs, parties, config barème) + RLS.
-- Exécuter dans Supabase : SQL Editor → coller → Run.
-- Ensuite : Authentication → Users → créer un utilisateur admin ;
-- User Management → utilisateur → App metadata (raw) : { "role": "admin" }

create table if not exists public.seasons (
  id text primary key,
  season_label text not null default '',
  players_updated_at text,
  matches_updated_at text
);

create table if not exists public.players (
  season_id text not null references public.seasons (id) on delete cascade,
  player_id text not null,
  last_name text not null,
  first_name text not null,
  poste text not null check (poste in ('avant', 'arriere')),
  season_points integer not null default 10,
  primary key (season_id, player_id)
);

create table if not exists public.matches (
  season_id text not null references public.seasons (id) on delete cascade,
  match_id text not null,
  payload jsonb not null,
  primary key (season_id, match_id)
);

create table if not exists public.scoring_config (
  season_id text primary key references public.seasons (id) on delete cascade,
  payload jsonb not null
);

alter table public.seasons enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.scoring_config enable row level security;

-- Lecture publique (classement consultable sans compte).
create policy "seasons_select_anon" on public.seasons for select to anon using (true);
create policy "seasons_select_auth" on public.seasons for select to authenticated using (true);
create policy "players_select_anon" on public.players for select to anon using (true);
create policy "players_select_auth" on public.players for select to authenticated using (true);
create policy "matches_select_anon" on public.matches for select to anon using (true);
create policy "matches_select_auth" on public.matches for select to authenticated using (true);
create policy "scoring_select_anon" on public.scoring_config for select to anon using (true);
create policy "scoring_select_auth" on public.scoring_config for select to authenticated using (true);

-- Écriture réservée aux comptes dont app_metadata.role = 'admin' (défini dans le dashboard Supabase).
create policy "seasons_admin_write" on public.seasons for all to authenticated using (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
) with check (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
);

create policy "players_admin_write" on public.players for all to authenticated using (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
) with check (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
);

create policy "matches_admin_write" on public.matches for all to authenticated using (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
) with check (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
);

create policy "scoring_admin_write" on public.scoring_config for all to authenticated using (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
) with check (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
);

-- Saison par défaut (adapter l’id si besoin, cohérent avec VITE_SUPABASE_SEASON_ID côté app).
insert into public.seasons (id, season_label, players_updated_at, matches_updated_at)
values ('2026', 'Saison 2026', null, null)
on conflict (id) do nothing;
