# Spécifications — application « Maika » (classement pelote / doubles)

Document destiné à un humain ou à une IA pour reprendre le projet sans parcourir tout le code. Dernière rédaction alignée sur le code du dossier `maika/`.

---

## 1. Objectif produit

Application web **React + TypeScript + Vite** pour gérer une **saison** de **double** (4 joueurs par partie), afficher un **Dashboard / classement** par **poste** (avant / arrière), enregistrer des **parties** (prévues, jouées, annulées) et appliquer un **barème de points saison** configurable, avec notion de **Maika** (niveau affiché dérivé des points).

---

## 2. Stack technique

| Élément | Détail |
|--------|--------|
| Build | Vite 6, React, React Router |
| Données | Par défaut : JSON sous `public/data/`. Option : **Supabase** (Postgres) si `VITE_SUPABASE_*` au build (voir §15) |
| Persistance en dev | Sans Supabase : plugin Vite `savePlayersJson.ts` (`POST` disque). Avec Supabase : client JS vers l’API hébergée |
| Auth | Sans Supabase : session fictive `localStorage` (§7). Avec Supabase : **Supabase Auth** + `app_metadata.role` pour l’admin |

---

## 3. Fichiers de données

| Fichier (servi en prod) | URL HTTP | Rôle |
|-------------------------|----------|------|
| `public/data/players.json` | `/data/players.json` | Liste des joueurs, `seasonId`, libellé saison, `updatedAt` |
| `public/data/matches.json` | `/data/matches.json` | Liste des parties |
| `public/data/scoring-config.json` | `/data/scoring-config.json` | Nombres : points de départ + règles de barème (objet plat). Si 404 ou invalide : valeurs par défaut dans le code |

Le chargement est implémenté dans `src/data/loadSeasonData.ts`. Un `seasonId` différent entre joueurs et parties déclenche seulement un `console.warn`.

**Important déploiement (ex. GitHub Pages)** : sans Supabase, le site ne sert que des **fichiers statiques** et les `POST /api/save-*` **n’existent pas** ; les changements passent par le dev local ou l’édition des JSON + commit. **Avec Supabase**, le front statique peut enregistrer en ligne si le build inclut l’URL et la clé `anon`.

---

## 4. Modèle métier (types)

Source principale : `src/domain/types.ts`.

### 4.1 Joueur (`Player`)

- `id` : chaîne stable (slug), ex. `marie-dupont`
- `lastName`, `firstName`
- `poste` : `"avant"` | `"arriere"` — **deux classements distincts**
- `seasonPoints` : nombre entier (points cumulés **saison** ; le barème y ajoute ou retire)

### 4.2 Maika

- **Définition code** : `maikaFromSeasonPoints(p) = floor(seasonPoints / 10)` (`src/domain/maika.ts`).
- Exemple : 10 points saison → Maika **1** ; 16 → Maika **1** ; 20 → Maika **2**.

### 4.3 Partie (`Match`)

- `id`, `seasonId`, `status` : `"scheduled"` | `"played"` | `"cancelled"`
- `date` : ISO `YYYY-MM-DD`
- `time`, `venue`, `notes` : optionnels
- `teamA`, `teamB` : chacun un couple `[PlayerId, PlayerId]` (exactement 2 joueurs)
- Si `status === "played"` : `scoreTeamA`, `scoreTeamB` — scores de la partie en **40 points** (entiers)
- `appliedSeasonPointDeltas` : optionnel, `Record<PlayerId, number>` — **mémo des deltas** appliqués lors de la dernière sauvegarde de cette partie (pour annulation incrémentale si la partie change ou disparaît)

### 4.4 Fichiers enveloppes

- `PlayersFile` : `seasonId`, `seasonLabel`, `updatedAt`, `players[]`
- `MatchesFile` : `seasonId`, `updatedAt`, `matches[]`

---

## 5. Calcul des points après une partie jouée

Implémentation : `src/domain/matchPointScoring.ts`.

### 5.1 Partie prise en compte

Une partie compte pour le calcul **uniquement** si :

- `status === "played"` **et**
- `scoreTeamA` / `scoreTeamB` sont des nombres finis **et**
- les scores sont **distincts** (égalité des scores → **aucun** delta pour les quatre joueurs)

### 5.2 Maika d’équipe (au moment du calcul)

Pour chaque équipe : somme des Maika individuels **avant** cette partie :

`teamMaika = maikaFromSeasonPoints(p1) + maikaFromSeasonPoints(p2)`

où les `seasonPoints` utilisés sont ceux **après toutes les parties jouées antérieures** (ordre chronologique, voir §6).

On déduit vainqueur / perdant au **score** (40), puis :

- `opponentMinusWinner` = Maika(perdant) − Maika(vainqueur) — sert aux **points de victoire**
- `winnerMinusLoser` = Maika(vainqueur) − Maika(perdant) — sert aux **points de défaite**

### 5.3 Barème victoire (valeurs configurables)

Ordre de test dans le code (du plus fort écart « adversaire au-dessus » au plus faible) :

| Condition | Clé config | Défaut |
|-----------|------------|--------|
| `opponentMinusWinner >= 2` | `victoryOpponentMinusWinnerGte2` | 5 |
| `>= 1` | `victoryOpponentMinusWinnerGte1` | 4 |
| `=== 0` | `victoryOpponentMinusWinnerEq0` | 3 |
| sinon (négatif) | `victoryOpponentMinusWinnerLt0` | 2 |

Chaque joueur de l’**équipe gagnante** reçoit cette valeur (une fois par joueur).

### 5.4 Barème défaite

| Condition (`winnerMinusLoser`) | Clé config | Défaut |
|--------------------------------|------------|--------|
| `> 0` | `defeatWinnerMinusLoserGt0` | -1 |
| `=== 0` | `defeatWinnerMinusLoserEq0` | -2 |
| `=== -1` | `defeatWinnerMinusLoserEqMinus1` | -3 |
| `<= -2` | `defeatWinnerMinusLoserLteMinus2` | -4 |

Chaque joueur de l’**équipe perdante** reçoit cette valeur.

### 5.5 Bonus liés au score de l’équipe perdante (40)

Soit `loserScore = min(scoreTeamA, scoreTeamB)` (sur une partie validée à 40).

- **Bonus offensif** (vainqueurs) : si `loserScore < offensiveBonusMarginGt`, chaque joueur vainqueur reçoit `offensiveBonusPoints`. Défaut : score perdant < 29 → +1 chacun.
- **Bonus défensif** (perdants) : si `loserScore >= defensiveBonusMarginLt`, chaque joueur perdant reçoit `defensiveBonusPoints`. Défaut : score perdant >= 36 → +1 chacun.

Les clés et libellés UI sont listées dans `MATCH_POINT_SCORING_RULE_KEYS` et `MATCH_POINT_SCORING_RULE_LABELS`.

### 5.6 Configuration persistée

- Fichier : `scoring-config.json` — **objet plat** : `startingSeasonPoints` + toutes les clés numériques des règles.
- Parse / défauts : `src/data/seasonScoringConfigStorage.ts` (`parseSeasonScoringFromUnknown`, `sanitizeSeasonScoringConfig`, `flattenSeasonScoringForJson`).
- Règles par défaut : `DEFAULT_MATCH_POINT_SCORING_RULES` dans `matchPointScoring.ts`.

### 5.7 Points de départ

- `startingSeasonPoints` : base pour **nouveau joueur** et pour le **rejeu complet** (tous les joueurs repartent de cette valeur avant d’appliquer les parties dans l’ordre).

---

## 6. Mise à jour des points : incrémental vs rejeu complet

### 6.1 À l’enregistrement des parties (`saveMatchesFile`)

`src/season/SeasonDataContext.tsx` appelle `applyMatchScoringBetweenSnapshots` (`src/domain/matchSavePointsUpdate.ts`) avec :

- liste des parties **avant** sauvegarde,
- liste **après**,
- fichier joueurs courant,
- `rules` + `startingSeasonPoints` issus du bundle chargé.

**Principe** :

1. Détecter les `matchId` dont le « paquet scoring » a changé (`matchScoringPayload` : statut, scores, compositions d’équipes).
2. Pour les anciennes versions **jouées** : **soustraire** les deltas précédemment appliqués. Les deltas sont lus depuis `appliedSeasonPointDeltas` si présents et non vides ; sinon ils sont **recalculés** comme au moment de l’ancienne logique (compatibilité données anciennes). Ordre d’annulation : **inverse** chronologique (date puis id).
3. Pour les nouvelles versions **jouées** : recalculer les deltas avec les `seasonPoints` **courants** en mémoire après annulations, puis **ajouter** aux joueurs. Ordre d’application : **chronologique**.
4. Mettre à jour sur chaque partie concernée le champ `appliedSeasonPointDeltas` (ou le retirer si la partie n’est plus jouée avec scores).
5. `touched` : `true` seulement si au moins un `seasonPoints` a **réellement** changé → évite d’écrire `players.json` inutilement (ex. suppression d’une partie non jouée).

Ensuite : `saveMatchesToDisk` avec les matches annotés ; si `touched`, `savePlayersToDisk` avec les joueurs mis à jour.

### 6.2 Rejeu complet (maintenance)

- Fonction : `replaySeasonPointsFromMatches` dans `matchPointScoring.ts` : filtre les parties jouées valides, trie par `(date, id)`, initialise **tous** les joueurs à `startingSeasonPoints`, rejoue dans l’ordre.
- Exposé dans l’UI admin **Configuration** : bouton type « Rejeu complet » (`AdminConfigPage.tsx`) qui recalcule et appelle `savePlayersFile`. **Ne met pas à jour** `appliedSeasonPointDeltas` sur les matches (usage : resynchroniser les points après changement manuel des JSON ou incohérence).

---

## 7. Authentification et rôles

**Mode JSON (sans variables Supabase)** :

- Fichier : `src/auth/authCredentials.ts`
- Login : `tryLogin(username, password)` — comparaisons insensibles à la casse sur le nom d’utilisateur.
- Comptes de démo : **`admin` / `admin`**, **`user` / `user`**
- Session stockée : `localStorage` (`readStoredSession` / `writeStoredSession`).

**Mode Supabase** : `AuthContext` utilise `signInWithPassword` (e-mail + mot de passe) et `mapSupabaseSession.ts` : **admin** si `app_metadata.role === "admin"` (défini dans le dashboard Supabase), sinon **user**.

Dans les deux modes : **Admin** → page Config et écritures ; **User** → consultation (voir `ProtectedShell`).

**Sécurité** : en mode JSON, les comptes sont factices. En mode Supabase, la sécurité des données repose sur les **RLS** Supabase ; l’UI reflète le rôle mais ne suffit pas seule.

---

## 8. Routes principales

Définies dans `src/App.tsx` (toutes derrière `RequireAuth` sauf `/connexion`) :

| Chemin | Page |
|--------|------|
| `/` | Dashboard (`HomePage`) |
| `/parties` | Liste des parties + actions |
| `/parties/ajout`, `/parties/:matchId/modifier` | Formulaire partie (`MatchFormPage`) — souvent ouvert dans un nouvel onglet depuis la liste |
| `/joueurs` | Liste joueurs |
| `/joueurs/ajout`, `/joueurs/:playerId/modifier` | Formulaire joueur |
| `/config` | Configuration barème + rejeu (`AdminConfigPage`) — réservé admin |

---

## 9. Classement

`src/domain/ranking.ts` :

- Filtrer par `poste`
- Trier par `seasonPoints` décroissant, puis nom / prénom (locale `fr`)
- **Rang dense** : ex-aequo sur les mêmes points → même rang, rang suivant sans « trou » (1, 1, 2…)

---

## 10. Persistance

**Sans Supabase** — API de sauvegarde (dev / preview uniquement) :

| Méthode | Route | Corps | Cible disque (dev) |
|---------|-------|-------|-------------------|
| POST | `/api/save-players` | JSON `PlayersFile` | `public/data/players.json` |
| POST | `/api/save-matches` | JSON `MatchesFile` | `public/data/matches.json` |
| POST | `/api/save-scoring-config` | Objet à valeurs numériques uniquement | `public/data/scoring-config.json` |

En `npm run preview`, les chemins pointent vers `dist/data/…`. Clients : `savePlayersApi.ts`, `saveMatchesApi.ts`, `saveScoringConfigApi.ts`, appelés via `src/data/seasonRepository.ts`.

**Avec Supabase** : pas d’API disque ; lecture/écriture via `seasonRepository.ts` → `supabaseSeasonRepository.ts`.

---

## 11. Contexte données React

`src/season/SeasonDataContext.tsx` :

- `loadSeasonBundle()` (`seasonRepository`) au montage et au retour de visibilité de l’onglet (`visibilitychange`)
- Supprime d’anciennes clés `localStorage` liées à d’anciennes versions (players / règles) pour forcer l’usage des fichiers
- Expose : `data` (`{ players, matches, scoring }`), `loading`, `error`, `refresh`, `savePlayersFile`, `saveMatchesFile`, `saveScoringConfig`

---

## 12. Carte des fichiers utiles

| Sujet | Fichiers |
|-------|----------|
| Types | `src/domain/types.ts` |
| Maika | `src/domain/maika.ts` |
| Barème + rejeu complet | `src/domain/matchPointScoring.ts` |
| Sauvegarde incrémentale parties | `src/domain/matchSavePointsUpdate.ts` |
| Chargement | `src/data/loadSeasonData.ts`, `seasonScoringConfigStorage.ts` |
| Plugin écriture JSON | `vite-plugins/savePlayersJson.ts`, `vite.config.ts` |
| UI admin config | `src/pages/AdminConfigPage.tsx` |
| Liste / suppression parties | `src/pages/MatchesPage.tsx` |

---

## 13. Invariants et pièges connus

1. **Ordre des parties jouées** : toujours `date` puis `id` (ordre lexicographique).
2. **Modifier une partie ancienne** peut changer les Maika des suivantes : l’incrémental annule/réapplique les lignes modifiées ; en cas de doute historique, utiliser le **rejeu complet** après correction des données.
3. **`appliedSeasonPointDeltas`** doit rester cohérent avec les règles si on édite le JSON à la main ; sinon prévoir rejeu complet.
4. **GitHub Pages** : sans Supabase, pas d’écriture depuis le navigateur ; workflow local → commit. Avec Supabase, le build doit inclure `VITE_SUPABASE_*` (voir §15).

---

## 15. Mode Supabase (optionnel)

Si `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont définies au build :

- **Données** : tables `seasons`, `players`, `matches`, `scoring_config` (voir `supabase/migrations/001_maika_schema.sql`). Le code d’accès est dans `src/data/supabaseSeasonRepository.ts`, façade `src/data/seasonRepository.ts`.
- **Auth** : Supabase Auth (e-mail / mot de passe). Rôle admin : `app_metadata.role === "admin"` sur l’utilisateur (dashboard Supabase). Sinon rôle applicatif **user** (UI + RLS lecture seule côté écritures).
- **RLS** : lecture publique (anon) ; écritures réservées aux JWT admin.
- **Saison** : `VITE_SUPABASE_SEASON_ID` (défaut `2026`) = clé primaire dans `seasons`.
- **Instructions pas à pas** : `docs/INSTRUCTIONS.md`.

---

## 16. Commandes projet

```bash
npm install
npm run dev      # dev + API sauvegarde → public/data/
npm run build    # sortie dist/
npm run preview  # sert dist/ + API sauvegarde → dist/data/
```

---

*Fin du document.*
