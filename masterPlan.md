You are building "Tutor Manager (مدير المدرس)", a mobile-first Offline-First Web PWA for ONE private tutor (approx. 9–15 students, 4–7 groups) using Next.js (App Router, TypeScript), Tailwind CSS, Firebase (Auth + Firestore), and Vercel.

Read all rules below carefully and follow them strictly without adding out-of-scope features.

### 1. Core Tech Stack & Architecture
- Framework: Next.js (App Router) + TypeScript + Tailwind CSS.
- PWA: Configured with web manifest (`display: standalone`, Arabic name, icons) and service worker (`@serwist/next`) for offline shell loading.
- Database & Auth: Firebase Web SDK (`firebase/auth` with Google + Email/Password; `firebase/firestore` initialized with `persistentLocalCache` and `persistentMultipleTabManager` for offline persistence).
- Testing: Vitest for unit tests. Use Firebase Local Emulators for integration testing — do NOT build separate in-memory fake repositories.
- Charts & Icons: `recharts` + `lucide-react`.
- Fonts & i18n: `Cairo` via `next/font/google` with `tabular-nums` for all money/counters. Arabic RTL (`dir="rtl"`) is default; English LTR toggle in Settings. Zero hardcoded user-facing strings in components; keep all copy in `src/i18n/ar.ts` and `src/i18n/en.ts`.
- Strict Layering: UI components NEVER import `firebase/firestore` directly. All reads/writes go through `src/data/repositories/` and `src/data/services/`.

### 2. Core Business Logic (Source of Truth — Pure TypeScript)
Implement in `src/domain/balanceCalculator.ts` (zero React/Firebase imports) with full Vitest unit tests BEFORE building any UI:
1. Default cycle length `L = 4` (configurable in Settings). Money is stored as integers (whole EGP).
2. Counters belong to the student, not the group (late joiners start at 0; moving groups preserves counters).
3. `initialCounted` and `initialPaid` are stored on each student for migrating existing mid-cycle students. Never recompute from 0 without adding them.
4. Counted sessions = `initialCounted` + count of attendance docs where:
   - the parent session has `status === 'completed'` (cancelled/scheduled sessions NEVER count),
   - `session.dateKey >= student.startedAtKey`,
   - attendance is `'present'`, OR (`'absent'` AND `settings.absenceCounts === true`).
5. Paid sessions = `initialPaid` + sum of `payment.sessionsCovered` (default 4 per payment).
6. `balance = sessionsCounted - sessionsPaid`:
   - `balance >= L` → DUE (`dueCycles = Math.floor(balance / L)`, `amountDue = dueCycles * L * pricePerSession`)
   - `0 < balance < L` → IN_PROGRESS
   - `balance === 0` → SETTLED
   - `balance < 0` → PAID_AHEAD (`abs(balance)` sessions; must NEVER appear as unpaid at session 4)
7. `cyclePosition = sessionsCounted === 0 ? 0 : ((sessionsCounted - 1) % L) + 1` (e.g., "3 of 4", based on counted sessions, not payments).
8. `groupPosition` = mode of `cyclePosition` among active students in the group with `sessionsCounted > 0` (tie → higher). Flag students whose position differs (e.g., "أحمد 2/4").
9. Single Write Path: ONLY `src/data/services/counterService.ts` is allowed to write cached `sessionsCounted` and `sessionsPaid` on student docs (using `writeBatch`). Every mutation affecting attendance, sessions, payments, or settings calls `CounterService.recompute(studentIds)`.
10. Date Handling: Every session, attendance, and payment document stores a local `dateKey` string (`"yyyy-MM-dd"`). All grouping, deterministic session IDs (`{groupId}_{yyyyMMdd}` / `_{n}` for extras), and range filters use `dateKey` to prevent Egypt DST / UTC midnight bugs.

### 3. Data Model (Firestore under `users/{uid}`)
- `users/{uid}`: `{ settings: { absenceCounts: true, cycleLength: 4, language: 'ar', currency: 'EGP', weekStartsOn: 6 } }`
- `users/{uid}/groups/{groupId}`: `{ name, subject?, slots: [{ weekday: 0-6, time: 'HH:mm', durationMin }], active, createdAt }`
- `users/{uid}/students/{studentId}`: `{ name, phone?, groupId, pricePerSession, startedAtKey, active, note?, initialCounted, initialPaid, sessionsCounted, sessionsPaid }`
- `users/{uid}/sessions/{groupId_yyyyMMdd[_n]}`: `{ groupId, groupName, dateKey, time, type: 'regular'|'extra', status: 'scheduled'|'completed'|'cancelled', note? }`
- `users/{uid}/attendance/{sessionId_studentId}`: `{ sessionId, studentId, groupId, dateKey, status: 'present'|'absent' }`
- `users/{uid}/payments/{paymentId}`: `{ studentId, dateKey, amount, sessionsCovered, note? }`
Security rules: allow read/write ONLY when `request.auth != null && request.auth.uid == uid`.

### 4. Design System (Strict — Warm Minimalist Glassmorphism)
- Mood: Calm, warm stationery aesthetic. Mobile-first (`max-w-md mx-auto` shell on desktop, full viewport on mobile).
- HARD RULES: NO CSS gradients, NO purple/blue AI glow, NO neon, NO glowing orbs.
- Background: flat `#F3EDE3` with 2–3 fixed solid blurred circles (`#E6DBC9`, `#CFDCD3`, `#EBD5C7` at 45–55% opacity, `blur-3xl`, `pointer-events-none`) behind the page so frosted cards have depth.
- Glass Cards: `bg-white/55 backdrop-blur-[18px] border border-white/70 rounded-[20px] shadow-[0_8px_24px_rgba(60,50,40,0.08)]`.
- Tokens:
  - Text: `#2E2B27` | Muted: `#7A7468`
  - Primary (Sage): `#6B8F7B` | Primary Dark: `#4F7261` | Accent (Clay): `#C58B6D`
  - Success: `#6B8F7B` | Warning (Almost due): `#D8A24A` | Danger (Absent/Due): `#C45B52` | Info (Paid ahead): `#6F8FA6`
  - Status chips: 15% opacity tint fill + full-color text + icon (never rely on color alone).
- Touch targets: min `48px` height. Motion: `200ms ease-out`, subtle `active:scale-[0.98]`.
- Every list screen MUST ship with Loading, Empty, and Error states from day one.

### 5. Screens & UX Rules
Navigation: Sticky bottom bar with 4 tabs (`Today`, `Schedule`, `Students`, `Stats`) + `More` drawer/menu (`Groups`, `Dues`, `Settings`), plus a floating subtle sage AI button.
- Attendance screen (`/attendance/[sessionId]`): Everyone is PRESENT by default. Single tap toggles ABSENT (soft red tint + icon). Show cycle position (`2/4`) and payment chip per student. Recording a full lesson must take under 30 seconds.
- Today dashboard (`/`): Greeting + Arabic date, Today's lessons (with group position badge), "Reaching session 4 today" reminder card (excluding paid-ahead students), "Due now" summary card, quick actions.
- Payments bottom sheet: Prefills expected amount (`dueCycles * L * pricePerSession` or 1 cycle), shows live "after this payment" balance preview from `BalanceCalculator`, warns (never blocks) if amount differs.
- WhatsApp reminders: Draft polite Arabic text and open `https://wa.me/...` — NEVER send messages automatically.

### 6. AI Assistant (`/api/ai/assistant` on Vercel — Free Tier)
- Backend: Next.js Route Handler calling Gemini API (`@google/genai`, model from `GEMINI_MODEL` env var, key in `GEMINI_API_KEY` server-only).
- Auth: Verify Firebase ID Token via `firebase-admin` on every request; scope all Firestore reads strictly to `decodedToken.uid`. Strip phone numbers before sending context to Gemini.
- Tool Architecture: Gemini understands Egyptian Arabic text AND audio blobs (recorded via browser `MediaRecorder` and sent as multipart/base64).
  - Read tools (`get_dues`, `get_almost_due`, `get_absences`, `get_income`, `get_group_status`, `get_student_summary`, `get_today_overview`) query Firestore via Admin SDK and return exact JSON — the model NEVER does arithmetic from memory.
  - Action tools (`propose_attendance`, `propose_payment`, `propose_cancel_session`, `draft_parent_reminder`) NEVER write to Firestore. They return a structured proposal; the UI renders a `ConfirmCard` (Confirm / Edit / Cancel) and executes writes through normal client repositories only after the tutor taps Confirm.
  - Ambiguity: If a name matches multiple students (e.g., two "Ahmed"s), return `needs_clarification` with candidate chips. Never guess.

### 7. Working Rules for This Session
- Work strictly ONE stage at a time.
- After finishing each stage, stop and give me: (1) what was built, (2) exact commands to run tests/dev server, and (3) a short manual test checklist on mobile/browser before moving to the next stage.
- Do NOT add parent accounts, online payments, homework/grades, multi-tutor features, or dark mode in v1.