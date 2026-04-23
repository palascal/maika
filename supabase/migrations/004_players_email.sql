-- E-mail optionnel par joueur (gestion club, pas d’intégration Auth automatique).
alter table public.players add column if not exists email text;

comment on column public.players.email is 'Contact / rattachement admin (optionnel).';
