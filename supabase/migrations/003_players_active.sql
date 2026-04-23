-- Joueurs actifs / désactivés (historique des parties inchangé).
alter table public.players add column if not exists active boolean not null default true;

comment on column public.players.active is 'false = exclu des classements et des sélections pour nouvelles parties ; les matchs existants conservent les ids.';
