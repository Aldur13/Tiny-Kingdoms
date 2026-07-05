# Chrome Game — Kingdom Builder

A lightweight, browser-based kingdom-builder strategy game. Join one of many
servers, build your kingdom, train troops, and climb the per-server
leaderboard.

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS (`apps/web`)
- **Backend**: Supabase (Postgres + Auth + Row Level Security + RPC functions
  + `pg_cron` for timer resolution)
- **Shared balance constants**: `packages/game-balance`

## Getting started

```bash
npm install

# Start local Supabase (requires Docker)
npx supabase start
npx supabase db reset   # applies migrations + seed data

# Copy the printed local API URL / anon key into apps/web/.env.local
npm run dev
```

## Project layout

```
apps/web/            React frontend
packages/game-balance/  Shared tunable game-balance constants
supabase/             Migrations, seed data, and RPC functions
```

See `supabase/migrations` for the schema and `packages/game-balance` for
building/troop cost and duration curves.
