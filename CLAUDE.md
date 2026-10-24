# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal, Thai-language workout + nutrition planner (Vite + React 19 + TypeScript + Tailwind CSS v4, no router, `lucide-react` icons, Leaflet/OpenStreetMap for run maps). It's a static SPA deployed to Vercel (`vercel.json`, output `dist/`). Auth and cross-device sync use Supabase (Google + email/password); the app is login-gated.

Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local` (see `.env.example`) and in Vercel project env vars. `src/lib/supabase.ts` throws at startup if missing.

The owner: male, 20 y/o, 165 cm, 64.5 kg, currently jogs 2.5–5 km 2–3×/week, lives in Thailand, goal is a lean athletic "Tom Holland" physique, trains at a gym or a public park. These are the defaults in `src/lib/calc.ts`.

## Commands

- `npm run dev` — dev server
- `npm run build` — `tsc -b` type-check then `vite build` (use this to verify changes; there are no tests)
- `npm run lint` — oxlint

## Architecture

- `src/data/*.ts` holds **all content** (exercises, weekly schedules, foods, YouTube channels, references). Components only render it. Content edits go here, not in components.
  - `workouts.ts`: `gymWeek` and `parkWeek` are parallel 7-day `Day[]` arrays (shared run/rest days). `phases` describes the 12-week periodization (week 9 = deload, handled specially in `Plan.tsx`). Each exercise's `video` field is a YouTube *search query*, turned into a link via `yt()`.
  - `nutrition.ts`: approximate kcal/protein values (USDA / labels / commonly published Thai single-dish values).
  - `sources.ts`: YouTube channels and research references shown on the Sources tab.
- `src/lib/calc.ts`: Mifflin-St Jeor BMR × activity → TDEE, plus goal delta → macro targets (protein 2.0 g/kg, or 1.8 on lean bulk; fat 0.9 g/kg; carbs fill the rest). Shared by Overview and Nutrition tabs via the `profile` state in `App.tsx`.
- `src/data/muscles.ts`: maps exercise **name** (must match `workouts.ts` exactly) → primary/secondary muscles; drives `BodyMap` (hand-drawn SVG, left half mirrored) and weekly set counts. Renaming an exercise requires updating this map.
- `src/lib/storage.ts`: `usePersisted(key, initial)` — a `useSyncExternalStore`-backed store over localStorage, shared across all components using the same key (so multiple day cards writing `sessions` don't clobber each other). Prefer functional updates `set(prev => ...)`. Keys: `tab`, `profile`, `mode`, `week`, `done` (`${mode}-w${week}-${day.key}`), `sessions`, `runs`, `log`. Changing a data shape or a `Day.key` silently orphans stored data.
- Auth/sync: `AuthGate` (wraps `App`) shows `Login` until there's a session, then awaits `startSync` before rendering. `src/lib/sync.ts` mirrors the `SYNCED_KEYS` of the persisted store into table `public.user_data` (one jsonb row per user+key, RLS own-rows-only; schema in `supabase/migrations/`). Writes are debounced upserts; on login/refocus the server copy replaces local (server is source of truth). Only the first login on a device with no `owner` key merges pre-existing local data up. Logout flushes then clears synced keys. Adding a new persisted key that should sync = add it to `SYNCED_KEYS`.
- `src/lib/log.ts`: `Session` (logged sets per exercise) and `Run` types + formatters; `lastSetsFor` shows previous numbers for progressive overload.
- Browsers stop GPS when the screen locks/app backgrounds; that limitation is stated in the UI. Geolocation needs HTTPS (fine on Vercel and localhost).
- `src/lib/date.ts`: local-time date strings (`YYYY-MM-DD`) and Monday-based `weekStart`; don't use `toISOString()` for dates (UTC shifts the day in Thailand).
- Tabs are deep-linkable via hash (`/#plan`, `/#runs`, ...), handy for headless screenshots: `google-chrome-stable --headless=new --window-size=390,1500 --screenshot=out.png http://localhost:4173/#runs` after `npx vite preview` (the app is login-gated, so screenshots of inner tabs need a temporary bypass of `AuthGate`).
- Styling: Tailwind v4 via `@tailwindcss/vite` (no config file). Colors are semantic tokens (`bg-card`, `text-muted`, `bg-accent`, `ring-line`, `text-run`, …) defined as CSS vars in `src/index.css` and mapped with `@theme inline`; dark mode only redefines the vars — never use raw palette colors like `bg-gray-100`. Shared primitives (`Card`, `Button`, `Stat`, `Badge`, `Segmented`, `Meter`, `Field`) live in `src/components/ui.tsx`; `cx` in `src/lib/cx.ts`. Layout is a centered phone-width column (`max-w-lg`) with a fixed 5-tab bottom nav on all screen sizes; Sources is reached from the avatar menu.
- Runs: `useRunTracker` in `src/lib/gps.ts` (Kalman-smoothed GPS, auto-pause, per-km splits, in-progress run persisted to localStorage key `activeRun` and restored as paused). `RunMap` (Leaflet) is lazy-loaded so the map library is a separate chunk.

## Content rules

- Keep training/nutrition claims evidence-based and realistic; cite new claims in `sources.ts`. Never invent specific YouTube video URLs/IDs — use channel URLs that are known to exist or `yt()` search links.
- UI text is Thai; exercise names stay in English with a Thai description.
- Icons come from `lucide-react`; no emoji in the UI.
