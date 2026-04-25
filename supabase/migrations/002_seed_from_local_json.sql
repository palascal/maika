-- Maika — import initial depuis public/data/*.json vers Supabase.
-- A exécuter APRES 001_maika_schema.sql.

begin;

insert into public.seasons (id, season_label, players_updated_at, matches_updated_at)
values ('2026', 'Saison 2026', '2026-04-21', '2026-04-21')
on conflict (id) do update
set
  season_label = excluded.season_label,
  players_updated_at = excluded.players_updated_at,
  matches_updated_at = excluded.matches_updated_at;

delete from public.players where season_id = '2026';

insert into public.players (season_id, player_id, last_name, first_name, poste, season_points)
values
  ('2026', 'alice-martin', 'Martin', 'Alice', 'avant', 10),
  ('2026', 'bob-leroy', 'Leroy', 'Bob', 'arriere', 10),
  ('2026', 'chloe-bernard', 'Bernard', 'Chloé', 'avant', 23),
  ('2026', 'david-nguyen', 'Nguyen', 'David', 'arriere', 10),
  ('2026', 'pascal-marestin', 'marestin', 'pascal', 'arriere', 10),
  ('2026', 'pingouin-alfred', 'VRT', 'pingouin', 'avant', 10);

delete from public.matches where season_id = '2026';

insert into public.matches (season_id, match_id, payload)
values
  (
    '2026',
    'm-001',
    $${
      "id": "m-001",
      "seasonId": "2026",
      "status": "played",
      "date": "2026-04-12",
      "time": "10",
      "venue": "Trinquet — Pau",
      "teamA": ["alice-martin", "bob-leroy"],
      "teamB": ["chloe-bernard", "david-nguyen"],
      "scoreTeamA": 40,
      "scoreTeamB": 25
    }$$::jsonb
  ),
  (
    '2026',
    'm-002',
    $${
      "id": "m-002",
      "seasonId": "2026",
      "date": "2026-04-26",
      "venue": "La Cancha",
      "status": "played",
      "teamA": ["alice-martin", "pingouin-alfred"],
      "teamB": ["bob-leroy", "david-nguyen"],
      "time": "14",
      "scoreTeamA": 40,
      "scoreTeamB": 21
    }$$::jsonb
  ),
  (
    '2026',
    'match-1776779159397',
    $${
      "id": "match-1776779159397",
      "seasonId": "2026",
      "date": "2026-04-21",
      "venue": "Toulouse",
      "status": "scheduled",
      "teamA": ["pascal-marestin", "pascal-marestin"],
      "teamB": ["chloe-bernard", "bob-leroy"]
    }$$::jsonb
  ),
  (
    '2026',
    'match-1776779742545',
    $${
      "id": "match-1776779742545",
      "seasonId": "2026",
      "date": "2026-04-21",
      "venue": "",
      "status": "played",
      "teamA": ["chloe-bernard", "bob-leroy"],
      "teamB": ["pascal-marestin", "alice-martin"],
      "scoreTeamA": 40,
      "scoreTeamB": 12
    }$$::jsonb
  ),
  (
    '2026',
    'match-1776780404838',
    $${
      "id": "match-1776780404838",
      "seasonId": "2026",
      "date": "2026-04-21",
      "venue": "",
      "status": "scheduled",
      "teamA": ["pingouin-alfred", "pascal-marestin"],
      "teamB": ["chloe-bernard", "bob-leroy"]
    }$$::jsonb
  ),
  (
    '2026',
    'match-1776780799093',
    $${
      "id": "match-1776780799093",
      "seasonId": "2026",
      "date": "2026-04-21",
      "venue": "La Cancha2",
      "status": "scheduled",
      "teamA": ["pingouin-alfred", "chloe-bernard"],
      "teamB": ["bob-leroy", "pascal-marestin"]
    }$$::jsonb
  );

insert into public.scoring_config (season_id, payload)
values (
  '2026',
  $${
    "startingSeasonPoints": 10,
    "victoryOpponentMinusWinnerGte2": 5,
    "victoryOpponentMinusWinnerGte1": 4,
    "victoryOpponentMinusWinnerEq0": 3,
    "victoryOpponentMinusWinnerLt0": 2,
    "defeatWinnerMinusLoserGt0": -1,
    "defeatWinnerMinusLoserEq0": -2,
    "defeatWinnerMinusLoserEqMinus1": -3,
    "defeatWinnerMinusLoserLteMinus2": -4,
    "offensiveBonusMarginGt": 29,
    "offensiveBonusPoints": 1,
    "defensiveBonusMarginLt": 36,
    "defensiveBonusPoints": 1
  }$$::jsonb
)
on conflict (season_id) do update set payload = excluded.payload;

commit;
