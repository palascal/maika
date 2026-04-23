# Repartition GitHub / Supabase

Ce projet est maintenant organise en mode "code sur GitHub, donnees sur Supabase".

## Ce qui reste dans GitHub

- Code applicatif React/Vite (`src/`, `index.html`, `vite.config.ts`).
- Assets statiques et styles.
- Scripts SQL de schema et de migration (`supabase/migrations/*.sql`).
- Documentation (`docs/`).
- Fichier modele `.env.example` (sans secret).

## Ce qui va dans Supabase

- Tables: `seasons`, `players`, `matches`, `scoring_config`.
- Donnees metier (joueurs, parties, configuration de points).
- Authentification (utilisateurs e-mail/mot de passe).
- Autorisations (RLS policies, role admin via `app_metadata.role`).

## Ce qui ne doit PAS etre commit

- `.env.local` (contient `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`).
- Toute cle privee/service role.

## Procedure de migration recommandee

1. Executer `supabase/migrations/001_maika_schema.sql` dans SQL Editor.
2. Executer `supabase/migrations/002_seed_from_local_json.sql` pour importer les donnees JSON actuelles.
3. Creer un utilisateur admin dans Supabase Auth et definir:
   - `{ "role": "admin" }` dans `app_metadata`.
4. Lancer l'app avec `.env.local` configure.
5. Verifier qu'une modification dans l'UI se retrouve dans Supabase (et non plus dans `public/data/*.json`).

## Workflow quotidien

- Dev local: `.env.local` active le mode Supabase.
- CI/CD GitHub Pages: injecter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les secrets Actions au build.
- Evolution BDD: ajouter une nouvelle migration SQL dans `supabase/migrations/` puis l'appliquer sur Supabase.
