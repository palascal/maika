# Instructions — ce que vous devez faire (Maika + Supabase)

Ce fichier regroupe **les étapes concrètes** pour utiliser l’application avec une base **Supabase** (édition en ligne depuis le site, y compris hébergement statique type GitHub Pages).

Si vous ne configurez **pas** Supabase, vous n’avez pas à suivre ce guide : gardez les fichiers JSON dans `public/data/`, lancez `npm run dev` pour sauvegarder, et utilisez les comptes démo `admin` / `admin` ou `user` / `user` sur l’écran de connexion.

---

## Checklist rapide

1. [ ] Créer un projet Supabase et récupérer l’URL + la clé **anon**.
2. [ ] Exécuter le script SQL du dépôt dans Supabase.
3. [ ] Activer la connexion par e-mail et créer un utilisateur **admin** (`app_metadata.role`).
4. [ ] Créer `.env.local` avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
5. [ ] `npm run dev` → se connecter avec l’e-mail Supabase (pas `admin`/`admin`).
6. [ ] (Optionnel) Importer joueurs / parties / config ; ou saisir depuis l’app.
7. [ ] Pour GitHub Pages : injecter les mêmes variables au **build** (secrets du dépôt).

Les détails sont ci-dessous.

---

## 1. Créer le projet Supabase

1. Allez sur [https://supabase.com](https://supabase.com) et créez un compte si besoin.
2. **New project** : choisissez organisation, nom, mot de passe base (à conserver), région.
3. Une fois le projet prêt, ouvrez **Settings** (icône engrenage) → **API**.
4. Notez :
   - **Project URL** (ex. `https://xxxxx.supabase.co`) ;
   - la clé **`anon` `public`** (longue chaîne commençant souvent par `eyJ...`).

Vous en aurez besoin à l’étape 4.

---

## 2. Créer les tables et les règles de sécurité (RLS)

1. Dans Supabase, menu **SQL Editor**.
2. **New query**.
3. Ouvrez dans votre dépôt le fichier **`supabase/migrations/001_maika_schema.sql`**, copiez **tout** le contenu, collez-le dans l’éditeur SQL Supabase.
4. Cliquez sur **Run** (ou exécutez la requête).
5. Si vous migrez les JSON existants du projet, exécutez ensuite **`supabase/migrations/002_seed_from_local_json.sql`**.

Résultat attendu : tables `seasons`, `players`, `matches`, `scoring_config`, et une ligne de saison avec l’id **`2026`** (défaut de l’application).

Si vous voulez un autre identifiant de saison, ajoutez une ligne dans `seasons` dans Supabase et définissez la variable **`VITE_SUPABASE_SEASON_ID`** (voir étape 4) avec **exactement** le même texte que `seasons.id`.

---

## 3. Comptes et droits administrateur

1. **Authentication** → **Providers** : assurez-vous que **Email** est activé.  
   Pour des tests rapides, vous pouvez désactiver la confirmation d’e-mail dans les paramètres du provider ; en production, gardez une confirmation raisonnable.
2. **Authentication** → **Users** → **Add user** : créez un utilisateur avec un **e-mail** et un **mot de passe** (ceux que vous utiliserez sur la page Connexion de Maika).
3. Ouvrez cet utilisateur → section **App metadata** (parfois « Raw App Meta Data ») et mettez le JSON suivant :

```json
{ "role": "admin" }
```

4. Enregistrez.

Sans ce `role: "admin"`, l’utilisateur est traité comme **simple lecteur** dans l’interface (pas de lien Config, pas d’écriture autorisée par les politiques RLS).

**Important** : la clé **anon** est incluse dans le site publié ; la protection des écritures repose sur **Supabase RLS** et sur le fait que seuls les comptes avec `app_metadata.role = admin` peuvent modifier les données.

---

## 4. Variables d’environnement sur votre machine

1. À la racine du projet **`classement-tennis`**, créez un fichier **`.env.local`** (il est ignoré par Git grâce à `*.local` dans `.gitignore`).
2. Ajoutez (en remplaçant par vos valeurs réelles) :

```env
VITE_SUPABASE_URL=https://VOTRE_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

3. Optionnel — si l’id de saison dans la table `seasons` n’est pas `2026` :

```env
VITE_SUPABASE_SEASON_ID=votre-id-saison
```

4. Redémarrez le serveur de dev après toute modification de `.env.local` (`Ctrl+C` puis `npm run dev`).

Vous pouvez vous inspirer de **`.env.example`** à la racine du projet (sans y mettre de secrets réels).

---

## 5. Lancer l’application et se connecter

1. Dans le dossier `classement-tennis` : `npm install` (une fois), puis `npm run dev`.
2. Ouvrez l’URL indiquée par Vite (souvent `http://localhost:5173`).
3. Page **Connexion** : utilisez l’**e-mail** et le **mot de passe** du compte Supabase créé à l’étape 3 (plus les identifiants `admin`/`admin` du mode JSON).

Si une erreur s’affiche au chargement des données, vérifiez que le SQL a bien été exécuté et qu’une ligne existe dans `seasons` pour l’id attendu (`2026` par défaut).

---

## 6. Remplir les données (joueurs, parties, config)

Choisissez une ou plusieurs options :

- **Saisie dans l’app** (recommandé au début) : connecté en admin, ajoutez joueurs, parties et barème comme en mode fichier.
- **Table Editor Supabase** : remplissez `players`, `matches` (colonne `payload` = objet JSON d’une partie, comme dans `matches.json`), `scoring_config` (`payload` = objet plat comme `scoring-config.json`).
- **Script SQL** : possible si vous convertissez vos JSON en `INSERT`.

Tant qu’aucune sauvegarde n’a été faite depuis l’app, les tables peuvent être vides : c’est normal.

---

## 7. Publier sur GitHub Pages (ou autre site statique)

Les variables `VITE_*` doivent être présentes **au moment où** la commande **`npm run build`** s’exécute (Vite les intègre dans le bundle JavaScript).

1. Dans votre dépôt GitHub : **Settings** → **Secrets and variables** → **Actions** (ou secrets du dépôt selon votre workflow).
2. Créez par exemple :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_SEASON_ID` (optionnel, sinon `2026` côté app)
3. Dans le workflow qui build le site, passez-les en variables d’environnement, par exemple :

```yaml
env:
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

4. Lancez `npm run build` dans ce job, puis déployez le contenu du dossier **`dist/`** (selon votre action GitHub Pages).

Sans ces secrets, le build produirait une version **sans** Supabase (retour au mode JSON statique uniquement).

Avec le workflow fourni dans `.github/workflows/deploy-pages.yml`, pensez aussi à régler :

- **Settings → Pages → Source** : `GitHub Actions`.

---

## 8. Dépannage

| Symptôme | Que faire |
|----------|-----------|
| Erreur du type « row-level security » / policy | Vous n’êtes pas connecté, ou le compte n’a pas `app_metadata.role = admin` pour une action d’écriture. |
| Message sur l’absence de saison | Vérifier la table `seasons` : une ligne doit exister avec l’id `2026` (ou la valeur de `VITE_SUPABASE_SEASON_ID`). |
| Liste vide | Tables non remplies ; saisir depuis l’app ou importer. |
| Connexion refusée | Vérifier e-mail / mot de passe Supabase ; provider Email activé. |

---

## Fichiers utiles dans le dépôt

| Fichier | Contenu |
|---------|---------|
| `supabase/migrations/001_maika_schema.sql` | Schéma + RLS + ligne saison par défaut |
| `supabase/migrations/002_seed_from_local_json.sql` | Import initial des JSON (`public/data/*.json`) vers Supabase |
| `.env.example` | Modèle des variables (sans secrets) |
| `docs/SPECS_MAIKA.md` | Spécifications fonctionnelles détaillées de l’app |

Pour toute évolution du schéma ou des politiques, modifiez le SQL dans le dépôt et réappliquez les changements dans le SQL Editor Supabase (ou migrez via l’outil migrations Supabase si vous l’utilisez en CLI).
