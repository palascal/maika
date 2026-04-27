# Maïka

Application web de **classement** et de **gestion de parties** (double, points saison, Maïka), stack **React + TypeScript + Vite**.

## Documentation

| Document | Public | Contenu |
|----------|--------|---------|
| [**Guide utilisateur**](docs/GUIDE_UTILISATEUR.md) | Joueurs, orgas, admins | Rôles, écrans, règles métiers, usage quotidien |
| [**Spécification technique**](docs/TECH_SPEC.md) | Développeurs / IA | Architecture, routes, auth, données, pièges, évolution |
| [**Spécifications domaine**](docs/SPECS_MAIKA.md) | Développeurs | Types, barème détaillé, scoring incrémental, fichiers JSON |
| [**Instructions Supabase & déploiement**](docs/INSTRUCTIONS.md) | Ops / admin projet | Projet Supabase, RLS, Auth, Edge Function, GitHub Pages |

## Démarrage rapide

```bash
cd classement-tennis
npm install
npm run dev
```

Puis ouvrir l’URL affichée (souvent `http://localhost:5173`). Sans Supabase, les sauvegardes en dev écrivent sous `public/data/`.

## Build

```bash
npm run build
npm run bump:build   # avant une release : incrémente BUILD_NUMBER (affiché dans l’UI)
```

Dépôt GitHub : [palascal/maika](https://github.com/palascal/maika).
