# Fantasy Draft Assistant

Draft advice grounded in NFL fantasy football history (2000–present), tailored to redraft vs.
dynasty leagues and your draft position. See `/Users/eliaslego/.claude/plans/joyful-squishing-salamander.md`
for the original design.

## Setup

1. **Create a Supabase project** (supabase.com) and note its URL, anon key, and service role key
   (Project Settings → API).
2. **Get an Anthropic API key** (console.anthropic.com).
3. Copy `.env.example` to `.env.local` and fill in the values.
4. Apply the schema: open the Supabase SQL editor and run `supabase/migrations/0001_init.sql`.
5. (Optional, for Google sign-in) Enable the Google provider under Supabase Auth → Providers.
6. Install dependencies and populate historical data:
   ```bash
   npm install
   npm run ingest:stats   # season stats + fantasy points, 2000–present, from nflverse
   npm run ingest:adp     # historical ADP by format, ~2010–present, from FantasyFootballCalculator
   ```
7. Run the app:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000, sign up, create a league profile, then use the Draft Assistant.

## Structure

- `supabase/migrations/` — Postgres schema (players, season_stats, adp_history, user_leagues)
- `scripts/` — one-off data ingestion scripts (`npm run ingest:stats` / `ingest:adp`)
- `src/lib/retrieval.ts` — query helpers over historical data
- `src/lib/tools.ts` — Claude tool definitions/dispatch wrapping retrieval
- `src/lib/strategy-prompt.ts` — redraft vs. dynasty strategy knowledge baked into the system prompt
- `src/app/api/chat/` — Claude tool-use loop that answers draft questions with cited historical examples
- `src/app/assistant/`, `src/app/leagues/`, `src/app/explorer/` — chat UI, league settings, historical browser
