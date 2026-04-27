# Guide utilisateur — Maïka

Maïka sert à suivre une **saison** de **parties en double** (pelote / main nue au sens large), avec **classements** par **poste** (avant au filet, arrière au fond) et **points saison** évolutifs. Ce guide décrit l’usage courant, les **rôles**, et les **règles métiers** essentielles.

Pour l’installation technique (Supabase, déploiement), voir [`INSTRUCTIONS.md`](./INSTRUCTIONS.md).

---

## 1. Connexion

### Mode démonstration (sans Supabase)

Sur l’écran **Connexion**, des comptes de test peuvent être proposés :

| Identifiant | Mot de passe | Rôle |
|-------------|--------------|------|
| `admin` | `admin` | Administrateur |
| `orga` | `orga` | Organisateur |
| `user` | `user` | Lecture seule |

*(Les identifiants exacts peuvent varier selon votre déploiement ; en mode Supabase, on se connecte avec un **e-mail** et un **mot de passe** créés dans le projet.)*

### Mode Supabase

Connexion par **e-mail** et **mot de passe**. Votre **rôle** (`lecture`, `orga` ou `admin`) est défini par l’administrateur du projet dans Supabase (`app_metadata.role` sur votre compte).

---

## 2. Les trois rôles

| Rôle | Ce que vous voyez | Ce que vous pouvez faire |
|------|-------------------|---------------------------|
| **Lecture** (`user`) | **Classement**, **Parties** (vos infos : parties prévues et historique récent), **Profil** | Consulter les classements et les parties ; pas de création ni de modification des données de ligue. |
| **Organisateur** (`orga`) | Idem + menus **Joueurs** (liste) et **Administration des joueurs** ; gestion des **parties** (liste complète pour la ligue) | Créer / modifier / supprimer des **parties** ; créer / modifier des **joueurs** (fiches, e-mail, activation). **Pas** d’accès à **Config** (barème, nouvelle saison). |
| **Administrateur** (`admin`) | Tout ce qu’un orga voit + menu **Config** | Tout l’orga + modifier le **barème de points**, lancer un **rejeu complet** des points, préparer une **nouvelle saison**, attribuer les rôles **orga** / **admin** sur les fiches joueurs (liées aux comptes par e-mail). |

Les **règles de sécurité** côté serveur (Supabase) doivent correspondre à ces rôles : ne vous fiez pas seulement à l’interface.

---

## 3. Écran d’accueil — Classement

- **Maïka [nom de saison]** : titre ; un numéro de **build** peut s’afficher (version déployée).
- Icône **?** : ouvre une fenêtre **Calcul des points Maïka** (barème de victoire / défaite / bonus). Fermez avec la **croix**, la touche **Échap**, ou un clic **à l’extérieur** du cadre.
- **Classement global** : deux colonnes **Avants** et **Arrières**. Dans chaque poste, les joueurs sont regroupés en zones (demi-finalistes, barragistes, etc.) selon le **rang** et les règles d’affichage du club.
- **Mon classement** (compte **lecture** lié à une fiche joueur **active**) : votre rang, points, nombre de parties jouées, poste.

### Affichage des noms

Dans les classements et les listes de **parties**, les joueurs sont affichés en **Nom + initiale du prénom** (ex. `Dupont T` et `Dupont V` pour distinguer des fratries).

### Poste (avant / arrière)

Chaque joueur a un **poste** : il n’apparaît que dans le **classement de son poste**. Deux classements distincts.

### Points et Maïka

- **Points saison** : nombre entier qui augmente ou diminue selon les parties **jouées** et le barème.
- **Maïka** (affiché ailleurs, ex. liste joueurs) : niveau dérivé des points — en pratique **partie entière des points divisés par 10** (ex. 16 points → Maïka 1).

Le **détail du barème** (victoire selon l’écart de Maïka entre équipes, défaite, bonus sur le score en 40) est dans la fenêtre d’aide **?** et dans la documentation technique [`SPECS_MAIKA.md`](./SPECS_MAIKA.md).

---

## 4. Parties

### Compte lecture

- **Parties prévues** : matchs à venir vous concernant.
- **Dernières parties** : historique ; bouton pour voir plus si besoin.

### Compte orga ou admin

- Liste de **toutes** les parties de la saison (date, heure, lieu, composition des équipes, scores si jouées).
- **Ajouter une partie** : ouvre une **fenêtre modale** (même principe que la création d’un joueur). Renseignez date, heure, lieu, statut, les **quatre joueurs** (deux par équipe), et si la partie est **jouée**, les scores en **40 points**.
- **Lieu** : une option « tiret long » permet de laisser le lieu vide.
- **Modifier** / **Supprimer** : actions sur chaque ligne (la modification peut ouvrir un **nouvel onglet** selon le navigateur).

**Important** : modifier ou supprimer une partie **déjà jouée** peut **recalculer les points** de tous les joueurs concernés (et l’ordre chronologique des matchs compte). En cas de grosse correction de données, un administrateur peut utiliser le **rejeu complet** dans **Config**.

---

## 5. Joueurs (menu)

- Tableau des joueurs **actifs** : nom, prénom, poste, rang, points, Maïka.
- Section **joueurs désactivés** : restent pour l’historique mais n’apparaissent plus dans les classements ni dans les sélections pour **nouvelles** parties.

Le lien vers **Administration des joueurs** (création, édition, e-mail, rôle, activation) est réservé aux **orga** et **admin**.

---

## 6. Administration des joueurs (orga / admin)

- Recherche, filtres, tri.
- **Modifier** (crayon) : fiche (nom, prénom, poste, points saison, e-mail optionnel, actif / inactif ; les **admin** peuvent aussi choisir le **rôle applicatif** du compte lié à l’e-mail).
- **Créer** un joueur : même type de **fenêtre modale** que pour une nouvelle partie.

Après enregistrement d’un e-mail (mode Supabase avec fonction Edge déployée), le système peut **aligner** le compte Supabase Auth (invitation ou mise à jour). Voir [`INSTRUCTIONS.md`](./INSTRUCTIONS.md).

---

## 7. Configuration (admin uniquement)

- **Barème** : nombres (points de victoire / défaite selon l’écart de Maïka entre équipes, bonus offensif / défensif sur le score du perdant en 40, points de départ pour un **nouveau** joueur ou pour un **rejeu complet**).
- **Rejeu complet** : recalcule **tous** les points saison à partir des parties jouées et du barème actuel — à utiliser après correction massive des données ou en cas d’incohérence.
- **Nouvelle saison** : flux guidé (conservation des joueurs, reset des parties, etc.) — détail dans l’écran **Config**.

---

## 8. Profil et déconnexion

- **Profil** : compte et mot de passe (selon configuration Supabase ou mode démo).
- **Déconnexion** : termine la session sur cet appareil.

---

## 9. Règles métiers résumées

1. Une **partie** comporte **deux équipes de deux joueurs**.
2. Seules les parties **jouées** avec **scores différents** (pas d’égalité en 40) font **évoluer les points saison**.
3. Le barème dépend des **Maïka d’équipe** au moment du match (somme des Maïka des deux joueurs de l’équipe, calculés à partir des points **déjà** acquis avant ce match).
4. Les **bonus** récompensent des écarts de score du **perdant** (seuils configurables).
5. Les joueurs **désactivés** ne sont plus classés ni sélectionnables pour de **nouvelles** parties, mais restent dans l’historique.

Pour le détail mathématique et les clés de configuration, ouvrir l’aide **?** dans l’application ou lire [`SPECS_MAIKA.md`](./SPECS_MAIKA.md) section 5.

---

*Questions techniques d’hébergement ou de base de données : [`INSTRUCTIONS.md`](./INSTRUCTIONS.md). Reprise du code : [`TECH_SPEC.md`](./TECH_SPEC.md).*
