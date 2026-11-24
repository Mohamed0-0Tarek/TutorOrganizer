# Tutor Manager (مدير المدرس)

Mobile-first, offline-first PWA for **one** private tutor (≈9–15 students, 4–7 groups): weekly schedule, fast attendance, per-student session counters, cash payments, dues, statistics and an AI assistant (text + voice).

- **Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · Firebase Auth + Firestore · Vercel · Gemini
- **Status:** Stages 0–7 complete (Stage 2's shell/auth/provider work shipped with Stage 0; Stage 3 CRUD; Stage 4 schedule; Stage 5 attendance; Stage 6 payments; Stage 7 Today/settings). See `~/.opencode/plan/tutor-manager-pwa-stages.md` for the full staged plan.
- **Spec:** `masterPlan.md` (current), `Tutor Manager (مدير المدرس) — Complete Build Plan.md` (superseded Flutter spec, kept for screen details).

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the Firebase web config
npm run dev                  # http://localhost:3000
```

### Firebase project (one-time)

1. Create a Firebase project, add a **Web app**, copy the config into `.env.local`.
2. Authentication → Sign-in method → enable **Email/Password** (only provider in v1).
3. Authentication → Settings → Authorized domains → add `localhost` and your Vercel domain.
4. Firestore → create the database (production mode).
5. Deploy rules + indexes:

```bash
firebase use --add           # select your project
firebase deploy --only firestore:rules,firestore:indexes
```

### Local emulators

Needs **JDK 21+** (firebase-tools refuses older Java):

```bash
npm run emulators            # Auth :9099, Firestore :8080, UI :4000
# in .env.local: NEXT_PUBLIC_USE_EMULATORS=1
npm run dev
```

`npm run test:emulator` boots the emulators and runs the Firestore rules tests
against `firestore.rules`.

`NEXT_PUBLIC_USE_EMULATORS=1` also disables IndexedDB persistence (emulator data is ephemeral, and stale cache there causes confusing bugs). Offline behaviour is verified against a real project, not the emulator.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build (Turbopack) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Domain unit tests (Vitest) |
| `npm run test:watch` | Domain tests in watch mode |
| `npm run emulators` | Auth + Firestore emulators |
| `npm run test:emulator` | Firestore rules tests against the emulator |

## Architecture (short version)

```
src/
  app/            routes: (auth) sign-in/onboarding, (app) today/schedule/students/
                  groups/attendance/dues/stats/settings/dev, api/ai (Stage 9)
  components/     ui/ design-system kit, features/ cross-screen pieces
  domain/         PURE TypeScript: dateKey, sessionId, money, counters,
                  balanceCalculator, groupPosition  ← Stage 1
  data/           firebase client, auth, TutorDataProvider, mappers, services
  i18n/           ar (source of truth) + en, typed, RTL provider
```

Rules that must not break:

1. `domain/` imports nothing from React, Next, Firebase or the UI.
2. Screens never touch `firebase/firestore`; only `TutorDataProvider` reads and `data/services/*` writes.
3. `counterService` is the **only** writer of `sessionsCounted` / `sessionsPaid`.
4. Writes use `writeBatch` (offline-safe). **Never** `runTransaction` (requires network).
5. Dates are `yyyy-MM-dd` keys in `Africa/Cairo`. Never `toISOString().slice(0, 10)`.
6. Money is whole integers; digits are Latin (`123`) with `tabular-nums`.
7. All user-facing copy lives in `src/i18n`.

### Offline model

`TutorDataProvider` subscribes to six tiny collections (settings, groups, students, sessions, attendance, payments). Firestore's IndexedDB cache hydrates the app on reload and queues batched writes while offline; the UI renders computed balances (not cached counters), so it is correct instantly. Cached counters are reconciled on ready/reconnect.

### Next 16 note

Next 16 builds with Turbopack by default, while `@serwist/next` injects a webpack config. The PWA service worker wiring is therefore scheduled for Stage 10 with `next build --webpack` (or a hand-rolled service worker). No service worker is active yet.

## Docs

- `docs/versions.md` — pinned versions, environment notes (JDK 21 for emulators)
- `docs/spikes.md` — offline + Gemini-audio verification checklists
- `docs/manual-tests.md` — device test checklist
- `scripts/gemini-audio-probe.mjs` — one-shot MIME probe for Spike B
- `/dev` and `/dev/style` — development-only seed tools and the design gallery
