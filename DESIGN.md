# DESIGN.md — Kao (ก้าว)

The brand contract for Kao screens. Code is the source of truth: tokens live in `src/index.css`, primitives in `src/components/ui.tsx`. This file describes them so new screens (or design tools such as OpenDesign that read `DESIGN.md`) look like the rest of the app.

## Product

- A personal running + strength + nutrition planner for one Thai runner (20 y/o, 10K → half → marathon, lean athletic physique).
- Thai first, English second. Phone only: a centered column `max-w-lg`, 16 px side padding, fixed 5-tab bottom nav (Home · Plan · Runs · Food · Log).
- Tone: a calm coach. It says what to do today, then why, citing research. No hype, no streak shaming, no emoji.

## Principles

1. **Today first.** The top of every tab answers "what do I do now?" with one primary action. Reading material goes behind a `Disclosure`.
2. **One primary button per screen.** Red pill (`bg-accent-fill`, white text). Everything else is `soft` or a text link.
3. **Numbers are the hero.** Large, `tabular-nums`, bold; labels small and muted under or beside them.
4. **Explain, don't decorate.** No gradients on surfaces, no glassmorphism on scrolling bars, no stock illustrations. Icons only where they carry meaning.
5. **Evidence is visible.** Coaching text names its source (e.g. "Taddei 2020"); the Sources page lists it.

## Color

Semantic tokens only — never raw Tailwind palette colors. Dark mode redefines the same tokens; it is designed, not inverted.

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#eef1f6` | `#0b0e13` | page background (cool blue-gray, chosen 2026-11-28 so white cards stand out) |
| `card` | `#ffffff` | `#141921` | cards, sheets |
| `raised` | `#f6f8fb` | `#1b212b` | inner panels, soft buttons, stat tiles |
| `ink` | `#0f1217` | `#eef0f3` | primary text |
| `muted` | `#646b78` | `#9aa2ae` | secondary text, labels |
| `line` | `#dde3ec` | `#252d39` | 1 px rings and dividers |
| `accent` | `#d01544` | `#fb3b64` | brand red: text/icons on light/dark surfaces |
| `accent-fill` | `#d01544` | `#e11d48` | filled red (primary button, hero card) with white text |
| `accent-soft` | `#ffe4e9` | `#3b1420` | selected row, current set |
| `run` | `#1d4ed8` | `#60a5fa` | running: text, links, run-related icons |
| `run-fill` | `#1d4ed8` | `#2563eb` | filled blue with white text |
| `good` / `good-fill` | `#047857` | `#34d399` / `#047857` | done, on track, finish |
| `warn` | `#9a4508` | `#fbbf24` | caution (heat, caps, pain guard) |
| `bad` / `bad-fill` | `#b91c1c` / `#dc2626` | `#f87171` / `#dc2626` | stop, delete, high pain |
| `body` / `body-line` | `#e3e6eb` / `#cdd2da` | `#262b33` / `#353b45` | body-map silhouette |

Rules:
- Strength = red (`accent`), running = blue (`run`). Keep that split in icons, chips and charts.
- Tinted panels use the token at 10–15% (`bg-warn/10`, `bg-good/15`) with full-strength text of the same token.
- White text only on `*-fill` tokens (dark mode's bright `accent`/`run` are for text, not fills). Contrast is checked by axe in `e2e/a11y.e2e.ts`.

## Type

- Font: **Noto Sans Thai** 400/600/700 (Google Fonts), falling back to system sans. Exercise names stay in English, with the Thai description in `muted` below.
- Scale (Tailwind): `text-xs` labels/badges · `text-sm` body in cards · `text-base` default · `text-lg`/`text-xl` card titles and key numbers · `text-3xl`+ hero numbers.
- Weights: 700 for titles and numbers, 600 for buttons and row titles, 400 for body.
- Thai copy separates clauses with a space, never " — ". Keep lines short; Thai has no word spaces, so avoid long unbroken strings in narrow columns.

## Shape & space

- Radius: cards `rounded-2xl`, inner panels `rounded-xl`, buttons/badges/segmented controls `rounded-full`.
- Cards: `bg-card p-3.5 shadow-sm ring-1 ring-line`. No heavy shadows.
- Spacing: 4 px grid; cards stack with `gap-3`/`gap-4`; rows inside lists use `divide-y divide-line` and `py-2.5`.
- Touch targets ≥ 44 px (icon buttons `size-10`/`size-11`).

## Components (in `src/components/ui.tsx`)

- **Button** — variants `primary` (accent-fill), `soft` (raised + ring), `success`, `danger`; sizes `sm`/`md`/`lg`; always a pill.
- **Card** — titled section; an icon placed first in the title gets a tinted tile (`.card-title`).
- **Disclosure / Collapse** — long reading sections, mounted on first open.
- **Badge** — tones `accent`, `run`, `good`, `muted`; small pill, 12 px semibold.
- **Segmented** — pill switcher, `aria-pressed`, never wraps; drops icons under 400 px when ≥4 options.
- **Stat / Meter** — number + label tile; thin progress bar.
- **Sheet** — bottom sheet with drag-to-close, rendered through `Portal`.
- Forms: `TextInput`, `NumberInput` (unit suffix, optional stepper), `SelectInput`, `DateInput` from `Form.tsx`.

## Page structure

- Each screen reads top-down: today's action → tools → progress/summary. Groups are separated by `SectionLabel` (small muted uppercase heading) instead of more cards.

## Lists of exercises

- Row: number bubble · English name (600) + Thai description (muted, truncated) · `sets×reps` right-aligned, tabular; a per-side suffix (`/ ข้าง`) drops to a small second line so names don't wrap.
- Runner strength days group rows under small muted section headers: Jumps → Main lifts → Extra upper body (superset) → Calves, hips, core.

## Motion

- Short fades/slides (`animate-fade-up`, `animate-sheet-up`), press-scale on buttons, `stagger` on every tab's cards (on `<main>`), ring fill + count-up numbers on home, `animate-nav-pop` when a tab is selected, `skeleton` shimmer for loading placeholders (no pulsing). Everything off under `prefers-reduced-motion`.

## Iconography & imagery

- `lucide-react` icons, 16–20 px, stroke style. Bottom-nav icons are custom duotone (`NavIcons.tsx`); the logo is a tilted running shoe (`LogoMark`). The launcher icon uses a tonal red diagonal gradient (#F3385F → #C4103C) with a soft shadow under the shoe (`scripts/make-icons.py`, adaptive background `drawable/ic_launcher_bg.xml`).
- Exercise demos: real start/end photos (free-exercise-db) or two-pose stick figures; no stock lifestyle photos.

## Don't

- Purple/pink gradients, neon glows, glass blur on sticky bars (janks Android WebView), emoji, celebrity names, more than one filled button in view, raw palette classes (`bg-gray-100`), white text on bright dark-mode `accent`/`run`.
