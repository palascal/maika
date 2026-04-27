# Spécification technique — Maïka (reprise projet / IA)

Document **orientée développeur** : architecture, points d’extension, pièges. Le détail **métier des points** et des types reste complété par [`SPECS_MAIKA.md`](./SPECS_MAIKA.md). Les **étapes Supabase** opérationnelles : [`INSTRUCTIONS.md`](./INSTRUCTIONS.md).

**Dépôt** : application dans le dossier `classement-tennis/` (racine Git).

---

## 1. Objectif produit (rappel)

PWA **React 19 + TypeScript + Vite 6** : saison de **double** (4 joueurs par partie), **classement** par **poste** (avant / arrière), **parties** (prévue / jouée / annulée), **points saison** + barème configurable, notion **Maïka** (`floor(seasonPoints / 10)`).

---

## 2. Arborescence utile

```
classement-tennis/
├── src/
│   ├── App.tsx                 # Routes React Router
│   ├── main.tsx
│   ├── index.css
│   ├── buildInfo.ts            # BUILD_NUMBER (incrément : npm run bump:build)
│   ├── auth/                   # Session, login JSON / Supabase
│   ├── layout/ProtectedShell.tsx  # Header, nav, modale aide Maïka
│   ├── pages/                  # Écrans (voir §6)
│   ├── components/             # UI réutilisable (ex. MaikaPointsHelpDialog, IconActionButton)
│   ├── domain/                 # Logique pure : types, scoring, ranking, maika…
│   ├── data/                   # Chargement / sauvegarde (JSON, Supabase)
│   ├── season/SeasonDataContext.tsx  # État global saison + save*
│   ├── navigation/
│   └── lib/                    # accessRoles, supabaseClient, supabaseConfig…
├── public/data/                # JSON source (dev / statique)
├── supabase/migrations/        # SQL ordonné 001, 002, …
├── vite-plugins/               # savePlayersJson (API dev)
├── docs/                       # Cette doc + SPECS + INSTRUCTIONS
└── package.json
```

---

## 3. Scripts npm

| Script | Rôle |
|--------|------|
| `npm run dev` | Vite + (si pas Supabase) middleware sauvegarde → `public/data/*.json` |
| `npm run build` | `prebuild` (sync logo/PWA) puis `vite build` → `dist/` |
| `npm run preview` | Sert `dist/` ; sauvegardes vers `dist/data/` si API active |
| `npm run bump:build` | Incrémente `src/buildInfo.ts` → `BUILD_NUMBER` |
| `npm run deploy:admin-sync-player-emails` | Edge Function Supabase (sync e-mails joueurs → Auth) |

**Vérification TypeScript** (recommandé en CI, car `vite build` ne lance pas toujours `tsc`) :

```bash
npx tsc --noEmit
```

---

## 4. Variables d’environnement (Vite)

Préfixe **`VITE_`** obligatoire pour exposition au client.

| Variable | Rôle |
|----------|------|
| `VITE_SUPABASE_URL` | Si définie avec la clé anon → mode Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé publique anon |
| `VITE_SUPABASE_SEASON_ID` | Id de ligne `seasons.id` (défaut code souvent `2026`) |

Détection : `src/lib/supabaseConfig.ts` (`isSupabaseConfigured()`).

---

## 5. Authentification et autorisation UI

### 5.1 Fichiers clés

- `src/auth/AuthContext.tsx` : `AuthProvider`, `useAuth()`
- `src/auth/authCredentials.ts` : mode **sans Supabase** — `tryLogin`, session `localStorage`
- `src/auth/mapSupabaseSession.ts` : mode **Supabase** — rôle depuis `user.app_metadata.role`
- `src/lib/accessRoles.ts` : `AppRole`, `canManageLeague`, `canAccessConfig`, `canAssignElevatedRoles`

### 5.2 Rôles applicatifs (`AppRole`)

| Rôle | Source JWT (Supabase) | Démo JSON (`authCredentials`) |
|------|------------------------|--------------------------------|
| `admin` | `app_metadata.role === "admin"` | `admin` / `admin` |
| `orga` | `app_metadata.role === "orga"` | `orga` / `orga` |
| `user` | autre / absent | `user` / `user` |

### 5.3 Capacités (UI)

- **`canManageLeague`** (`orga` \| `admin`) : menu **Joueurs**, **Parties** (liste admin), création partie modale, édition lien, suppression partie, **Administration des joueurs** (`/admin/joueurs`).
- **`canAccessConfig`** (`admin` seul) : menu **Config**, rejeu complet, nouvelle saison, etc.
- **`canAssignElevatedRoles`** (`admin`) : liste déroulante rôle applicatif dans la fiche joueur (prop `authRole` sur `Player` — alignement Auth via Edge Function documentée dans `INSTRUCTIONS.md`).

**Note** : le champ `Player.authRole` dans les données représente l’intention pour le compte lié à l’e-mail ; le **JWT effectif** vient de Supabase Auth `app_metadata` pour l’utilisateur connecté.

---

## 6. Routes (`src/App.tsx`)

Toutes sous `RequireAuth` sauf `/connexion`. Shell : `ProtectedShell` + `SeasonDataProvider`.

| Chemin | Composant | Remarques |
|--------|-----------|-----------|
| `/` | `HomePage` | Classement global + bloc « Mon classement » si `user` lié |
| `/parties` | `MatchesPage` | Liste ; création **modale** ; `?nouveau=1` ouvre la modale |
| `/parties/ajout` | `Navigate` → `/parties?nouveau=1` | Compat liens anciens |
| `/parties/:matchId/modifier` | `MatchFormPage` | Édition **page** (souvent nouvel onglet) |
| `/joueurs` | `PlayersPage` | Lecture + lien admin |
| `/joueurs/ajout`, `/joueurs/:id/modifier` | `Navigate` vers `/admin/joueurs?…` | |
| `/admin/joueurs` | `AdminPlayersManagementPage` | Modales création / édition joueur |
| `/config` | `AdminConfigPage` | Admin uniquement |
| `/profil` | `ProfilePage` | |
| `/reglement` | `Navigate` → `/` | Ancienne route ; l’aide barème est une **modale** (header) |

Wildcard `*` → `/`.

---

## 7. Couche données

### 7.1 Contexte React

`src/season/SeasonDataContext.tsx` :

- Charge le bundle via `loadSeasonBundle` / `seasonRepository.ts`
- Rafraîchit au `visibilitychange` de l’onglet
- Expose : `data` (`{ players, matches, scoring }`), `loading`, `error`, `savePlayersFile`, `saveMatchesFile`, `saveScoringConfig`, `refresh`

### 7.2 Façade persistance

`src/data/seasonRepository.ts` : branche **fichiers** (`loadSeasonData`, API `save*`) vs **Supabase** (`supabaseSeasonRepository.ts`) selon config.

### 7.3 Fichiers JSON (mode statique / dev)

Chemins HTTP typiques : `/data/players.json`, `/data/matches.json`, `/data/scoring-config.json`.  
Schémas : `PlayersFile`, `MatchesFile`, scoring — voir `src/domain/types.ts` et `SPECS_MAIKA.md` §3–4.

### 7.4 Mise à jour des points après sauvegarde des parties

`saveMatchesFile` dans le contexte déclenche `applyMatchScoringBetweenSnapshots` (`src/domain/matchSavePointsUpdate.ts`). Détail algorithme : `SPECS_MAIKA.md` §5–6.

---

## 8. Supabase

### 8.1 Schéma

Migrations dans `supabase/migrations/` — appliquer dans l’ordre sur un projet vide ou via CLI `supabase db push`.

- **`001_maika_schema.sql`** : tables `seasons`, `players`, `matches`, `scoring_config`, RLS de base.
- **`002_seed_from_local_json.sql`** : import optionnel depuis JSON locaux.
- **`006_allow_orga_writes.sql`** : policies pour que **`orga`** et **`admin`** puissent **INSERT/UPDATE/DELETE** sur `players` et `matches`, et **UPDATE** sur `seasons` ; **INSERT/DELETE** saisons réservés **admin**. À jour avec l’UI « gestion de ligue ».

*(Numéros intermédiaires : voir le dossier `migrations/` dans le dépôt.)*

### 8.2 Edge Function

`admin-sync-player-emails` : synchronise les e-mails des fiches joueurs vers Supabase Auth (invitation / mise à jour). Voir `INSTRUCTIONS.md` §3.

---

## 9. UI — patterns récurrents

### 9.1 Modale « joueur » (référence look & feel)

`AdminPlayersManagementPage.tsx` : overlay fixe `rgba(15,23,42,0.4)`, panneau `maxWidth: 520`, `borderRadius: 16`, titre + bouton fermer (icône `X`), `stopPropagation` sur le panneau, clic overlay → fermer.

### 9.2 Modale « nouvelle partie »

`MatchesPage.tsx` : même principe visuel, `maxWidth: 720`, contenu = **`MatchForm`** exporté par `MatchFormPage.tsx` avec `embeddedInModal` (formulaire sans double carte).

### 9.3 Aide « Calcul des points Maïka »

`MaikaPointsHelpDialog.tsx` : `createPortal` vers `document.body`, z-index élevé, fermeture overlay / croix / Échap, scroll interne.

### 9.4 Affichage des noms

- Listes classement / parties : `playerCompactName` — `Nom` + initiale prénom (`src/domain/format.ts`).
- Admin liste joueurs : `playerLastFirstName` — nom puis prénom.
- `formatTeamLabel` utilise `playerCompactName` pour les équipes.

---

## 10. Domaine (fichiers à lire en priorité)

| Sujet | Fichiers |
|-------|----------|
| Types | `src/domain/types.ts` |
| Maika | `src/domain/maika.ts` |
| Barème, rejeu complet | `src/domain/matchPointScoring.ts` |
| Annulation / application incrémentale | `src/domain/matchSavePointsUpdate.ts` |
| Scores valides | `src/domain/matchScore.ts` |
| Classement dense | `src/domain/ranking.ts` |
| Joueur actif | `src/domain/playerActive.ts` |
| Format dates / heures | `src/domain/format.ts` |

---

## 11. Pièges et invariants

1. **Hooks React** : tout hook doit rester **avant** tout `return` conditionnel (ex. `useSearchParams` sur `MatchesPage`).
2. **Ordre des parties jouées** : tri `(date, id)` partout pour le scoring.
3. **Imports** : ne pas référencer des symboles non importés (erreur runtime silencieuse côté navigateur → page blanche).
4. **`seasonId`** : cohérence entre `PlayersFile` et `MatchesFile` ; nouvelle partie doit reprendre `data.matches.seasonId`.
5. **GitHub Pages sans backend** : pas d’écriture JSON depuis le navigateur ; Supabase ou workflow commit.

---

## 12. Faire évoluer le site (checklist IA / dev)

1. Lire **`GUIDE_UTILISATEUR.md`** pour l’intention produit côté utilisateur.
2. Lire **`SPECS_MAIKA.md`** pour toute modification du **barème** ou des **types**.
3. Identifier la couche : **UI** (`pages/`), **domain** (pur TS), **data** (`data/`, `seasonRepository`), **auth**, **SQL** (`migrations/`).
4. Après changement : `npx tsc --noEmit` + `npm run build`.
5. Avant publication : `npm run bump:build` si vous versionnez le numéro affiché dans le header.

---

*Document maintenu avec le code ; en cas de divergence, le code prévaut.*
