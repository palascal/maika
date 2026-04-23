# Checklist Supabase + GitHub Pages

## 1) Secrets GitHub

Dans le repo GitHub : **Settings -> Secrets and variables -> Actions -> New repository secret**

- [ ] `VITE_SUPABASE_URL` = `https://knanvpbqejulymkwxkza.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY` = ta cle anon publique
- [ ] `VITE_SUPABASE_SEASON_ID` = `2026` (optionnel)

## 2) Activer GitHub Pages

Dans le repo GitHub : **Settings -> Pages**

- [ ] Source = `GitHub Actions`

## 3) Initialiser la base Supabase

Dans Supabase : **SQL Editor**

- [ ] Executer `supabase/migrations/001_maika_schema.sql`
- [ ] Executer `supabase/migrations/002_seed_from_local_json.sql`

## 4) Verifier l'admin Supabase

Dans Supabase : **Authentication -> Users -> (ton user) -> App metadata**

- [ ] Ajouter `{"role":"admin"}`

## 5) Deployer

Dans ton projet local :

- [ ] Commit + push sur `main`
- [ ] Attendre le workflow `.github/workflows/deploy-pages.yml`
- [ ] Ouvrir l'URL GitHub Pages du repo

## 6) Validation rapide

- [ ] Connexion avec ton email/mot de passe Supabase
- [ ] Ajout/modification d'un joueur dans l'app
- [ ] Verification dans Supabase (`players`) que la donnee est bien ecrite
