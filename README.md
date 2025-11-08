# PadelXP

Plateforme Next.js 15 + TypeScript + TailwindCSS pour la gestion de clubs de padel.

## Démarrage

```bash
npm install
npm run dev
# Ouvrir http://localhost:3000
```

## Structure

- `app/` — App Router (pages et layouts)
- `app/dashboard/` — Espace administrateur club
- `app/(protected)/` — Espace joueur protégé
- `lib/` — utilitaires et helpers Supabase

## Scripts

- `npm run dev` — serveur de développement
- `npm run build` — build production
- `npm run start` — serveur production
