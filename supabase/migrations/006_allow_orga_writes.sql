-- Autorise les comptes `orga` (et `admin`) à gérer joueurs + parties.
-- Les écritures de configuration restent réservées aux admins.

drop policy if exists "seasons_admin_write" on public.seasons;
drop policy if exists "players_admin_write" on public.players;
drop policy if exists "matches_admin_write" on public.matches;

-- Saison: update (timestamps/libellé) autorisé aux gestionnaires de ligue.
create policy "seasons_league_update" on public.seasons for update to authenticated using (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'orga')
) with check (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'orga')
);

-- Joueurs: écriture autorisée aux gestionnaires (orga + admin).
create policy "players_league_write" on public.players for all to authenticated using (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'orga')
) with check (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'orga')
);

-- Parties: écriture autorisée aux gestionnaires (orga + admin).
create policy "matches_league_write" on public.matches for all to authenticated using (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'orga')
) with check (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'orga')
);

-- Conserver la création/suppression de saisons aux admins uniquement.
create policy "seasons_admin_insert" on public.seasons for insert to authenticated with check (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
);

create policy "seasons_admin_delete" on public.seasons for delete to authenticated using (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
);
