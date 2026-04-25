alter table public.players add column if not exists auth_role text;

alter table public.players
  drop constraint if exists players_auth_role_check;

alter table public.players
  add constraint players_auth_role_check
  check (auth_role is null or auth_role in ('user', 'orga', 'admin'));

comment on column public.players.auth_role is 'Role applicatif cible (app_metadata.role) pour le compte auth lié à email.';
