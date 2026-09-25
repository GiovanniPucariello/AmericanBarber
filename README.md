# American Barber Tattoo

Mobile-first booking PWA for American Barber Tattoo, built multi-tenant/SaaS-ready
from day one. See [DESIGN.md](./DESIGN.md) for the full technical design
(architecture, database schema, RLS strategy, booking/recurrence engine,
UX flows, and phased roadmap) and [firstPrompt.md](./firstPrompt.md) for the
original product spec.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Supabase (PostgreSQL, Auth, RLS)
- PWA (installable, offline-aware)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase credentials once Phase 2 is set up
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Status

Phase 1 (project setup) — scaffolded. See DESIGN.md section N for the full
phase-by-phase roadmap; Supabase project, database migrations, and RLS
policies land in Phases 2-4.
