# Tutor Manager (مدير المدرس)

Mobile-first, offline-first PWA for **one** private tutor (≈9–15 students, 4–7 groups): weekly schedule, fast attendance, per-student session counters, cash payments, dues, statistics and an AI assistant (text + voice).

- **Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · Firebase Auth + Firestore · Vercel · Gemini
- **Status:** Stages 0–10 implemented; awaiting Firebase Firestore API enablement, Vercel deploy and the real-week phone trial before tagging `v1.0`. See `~/.opencode/plan/tutor-manager-pwa-stages.md` for the full staged plan.
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

### AI assistant (Stage 9)

Server-only keys in `.env.local`:

```bash
FIREBASE_SERVICE_ACCOUNT=<base64 service-account JSON>
GEMINI_API_KEY=<key>
GEMINI_MODEL=gemini-3.5-flash-lite   # fast free model (larger free quota)
AI_DAILY_LIMIT=100
AI_ENABLED=true              # false hides the assistant button

# Optional text-only fallback — leave empty to disable
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
```

The route is `POST /api/ai/assistant`. It verifies a Firebase ID token, enforces
a per-tutor daily cap, answers only from read tools, and returns **proposals**
that the UI applies only after you confirm. Voice uses direct inline audio where
Gemini accepts the MIME type, and falls back to `ar-EG` Web Speech → text
otherwise; see `docs/spikes.md` for the Spike B verdict table. Provider ladder:
Gemini primary → the other Gemini model → Groq (text only, when `GROQ_API_KEY`
is set). The hydrated Firestore state is loaded once per request and shared by
all tool calls.

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

### Next 16 + PWA note

Next 16 builds with Turbopack by default, but `@serwist/next` needs webpack.
`npm run build` therefore uses `next build --webpack`, and `postcss.config.mjs`
keeps Tailwind v4 working in webpack builds. The service worker is generated at
`public/sw.js`, precaches the app shell and `/offline`, and keeps `/api/*` and
Firebase endpoints network-only. Dev stays on Turbopack with Serwist disabled.

## Docs

- `docs/PROJECT_GUIDE.md` — **الدليل الشامل**: كل طبقة وكل ملف وإزاي بيشتغل
- `docs/versions.md` — pinned versions, environment notes (JDK 21 for emulators)
- `docs/spikes.md` — offline + Gemini-audio verification checklists
- `docs/manual-tests.md` — device test checklist
- `docs/release-checklist.md` — Firebase/Vercel deploy + real-week trial steps
- `scripts/gemini-audio-probe.mjs` — one-shot MIME probe for Spike B
- `/dev` and `/dev/style` — development-only seed tools and the design gallery
