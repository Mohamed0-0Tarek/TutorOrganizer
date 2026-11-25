# Manual test checklist

Run on a phone, in the installed PWA where possible. Tick per stage; add the
date and device.

## Stage 0 — foundation

- [ ] App opens: Arabic RTL, Cairo font, warm background, frosted cards.
- [ ] Sign up with a new email → onboarding → Today.
- [ ] Sign out from Settings → back to sign-in. Sign in again.
- [ ] Kill and reopen: still signed in.
- [ ] Airplane mode + reload after a prior visit: app opens, offline bar shows.
- [ ] Bottom bar navigates all four tabs; More opens Groups, Dues, Settings.
- [ ] Language toggle in Settings switches to English LTR and back.
- [ ] No horizontal overflow at 360 px width; labels not clipped in Arabic.
- [ ] `/dev` tools visible in development only.

## Stage 10 — PWA install + release

- [ ] `npm run build` (webpack) generates `public/sw.js`; `/manifest.webmanifest` has the Arabic name and 192/512/maskable icons.
- [ ] Install from Chrome Android and Safari iOS; standalone launch has no browser chrome and respects safe areas.
- [ ] Offline launch after one online visit: shell opens, `/offline` fallback shows for uncached navigations.
- [ ] Deploy a second build → the "نسخة جديدة" toast appears → refresh runs the new build.
- [ ] Install prompt appears only after the first saved lesson, and stays dismissed after "بعدين".
- [ ] Lighthouse mobile: installable, performance ≥ 90, no console errors in production.
- [ ] Settings shows the backup note; real-week trial (7 days) tracked in `docs/release-checklist.md`.

## Stage 9 — AI assistant

- [ ] With a real `GEMINI_API_KEY`: ask "مين عليه دفعات؟" → the answer matches Dues exactly.
- [ ] Ask "قدّ إيه المحصّل الشهر ده؟" → matches Stats.
- [ ] Two students with the same name → the assistant asks "أي أحمد؟" with candidate chips, no guess.
- [ ] Request an action → a proposal card appears; nothing is saved until **تنفيذ** is tapped.
- [ ] Confirm an attendance/payment proposal → the normal result sheet appears and counters update.
- [ ] Duplicate the story of a student's phone number: no phone digits appear in the assistant payload or answer.
- [ ] Caps: 1000-char question and 2 MB audio are rejected; the daily limit returns the calm limit message.
- [ ] Voice: Android Chrome (`audio/webm;codecs=opus`) and iOS Safari (`audio/mp4`) — fill `docs/spikes.md`; the text fallback works where audio is rejected.
- [ ] Offline: mic and send are disabled with the offline copy; 401/429/model errors render their own messages.
- [ ] `AI_ENABLED=false` removes the assistant button (and the route still rejects unauthenticated calls).

## Stage 8 — statistics

- [ ] Month stepper moves through Cairo months; months with no data show the honest empty state.
- [ ] Collected = sum of that month's payments; Outstanding = Dues total (both match a hand ledger).
- [ ] Expected = Σ `price × cycleLength` for active students (capacity, not cash collected).
- [ ] Attendance rate = present / attendance docs of completed lessons in the month.
- [ ] Six-month income chart and per-group attendance chart render at 360 px with Latin digits, Arabic month names and flat colours.
- [ ] Top absences / slowest payers / top groups lists match the seeded dataset.

## Stage 7 — Today dashboard, groups, settings

- [ ] Today greeting + Cairo date, lesson cards with group position badge, due card and quick actions.
- [ ] Reminder card lists only students whose next counted session is the 4th; paid-ahead and due students never appear.
- [ ] Due count and total on Today match the Dues screen exactly.
- [ ] Group list badge shows the modal position; outliers show `name 2/4`; group detail links straight to "add student" with the group preselected.
- [ ] Settings: toggle "absence counts" → confirm → everyone is recomputed; change cycle length (2–8) → confirm → balances and badges update.
- [ ] Currency label, week start and language persist after reload; language flips `dir` to LTR/RTL.

## Stage 6 — payments, student detail, dues

- [ ] Dues total equals the sum of the rows; due list sorted by amount then name.
- [ ] Payment sheet prefills `L × price`; changing the amount shows the non-blocking mismatch warning and a live balance preview.
- [ ] Paid at session 3 → PAID_AHEAD; at 4 → SETTLED; at 8 with one payment → 200 ج.م due.
- [ ] Edit amount → counters and balance unchanged; delete → due again immediately.
- [ ] A payment covering 2 cycles settles both; deleting it restores the older balance.
- [ ] Student detail shows cycles on attendance rows and edit/delete on every payment.
- [ ] WhatsApp button copies the reminder text and opens `wa.me` (no phone → still copies).
- [ ] Offline: record payment → preview correct, write queued, one sync on reconnect.

## Stage 5 — attendance + counter engine

- [ ] Open a lesson: all students default to present; tapping a row toggles to "غايب" (tint + icon + haptic where supported).
- [ ] Save a lesson with one absence: result sheet shows the count and links newly-due students; counters update instantly.
- [ ] Edit a saved lesson: toggle a row, save → "اتحدّث الحضور والعدادات", counters recompute.
- [ ] Leave with unsaved changes → confirmation sheet; reload → browser warning.
- [ ] Cancel a lesson that had attendance → counters drop back to their prior values.
- [ ] `/dev` → **Corrupt counters** → the provider's self-heal restores them on the next snapshot; the manual **Recompute** button then reports `0` because there is nothing left to fix.
- [ ] Offline matrix: save with 2 absences → kill tab → reopen offline → data there → reconnect → one sync, no duplicates.

## Stage 4 — session generation + schedule

- [ ] Add a group with real slots → 14-day schedule appears (day view + week view).
- [ ] Run `/dev` → **Generate lessons** three times → each run reports `0` writes; no duplicates.
- [ ] Edit a slot's time → future scheduled lesson moves to the new time; today's lesson and cancelled lessons stay untouched.
- [ ] Add two extras on one day → labelled `_2`, `_3` (UI shows "إضافية"); generator leaves them alone.
- [ ] Cancel a lesson → struck through, shown as "ملغية" everywhere; it stays cancelled after a reload and a regeneration.
- [ ] Date stepper: previous/next day and "today" shortcut use Cairo dates.
- [ ] Week view shows all 14 days including empty ones with honest empty copy.
- [ ] Cancel a lesson that had attendance → computed counters drop immediately.

## Stage 3 — groups & students CRUD

- [ ] Create 5 groups / 12 students; reload → all still there.
- [ ] Student form advanced section keeps `initialCounted` / `initialPaid`; the detail screen shows the computed `حصة N من M`.
- [ ] Slots editor: add/remove slots, weekday chips + `HH:mm` + minutes; validation messages are Arabic.
- [ ] Move a student to another group → list/detail show the new group; attendance history and counters unchanged.
- [ ] Archive a student/group → gone from active lists, still reachable via the Archived filter and direct URL.
- [ ] Restore → back in active lists, counters unchanged.
- [ ] Search by name; all four student filters work.
- [ ] Phone actions open dialer / WhatsApp.
- [ ] Bottom-sheet confirmations: Escape, backdrop and cancel all close them; focus stays inside.
- [ ] Create a student offline → queued write visible immediately, one sync on reconnect.

## Stage 1 — domain core (no UI)

- [ ] `npm test` → 88 passing.
- [ ] `npm run typecheck` → no errors.
- [ ] `npm run test:emulator` → 20 passing (4 rules + 3 CRUD + 3 sessions + 4 attendance + 3 payments + 3 AI route).

## Offline matrix (repeat at Stages 2, 5, 6, 10)

1. [ ] Warm cache: Today, Schedule, Students, Dues.
2. [ ] Airplane mode; reload → all render from cache.
3. [ ] Save a lesson with 2 absences → instant UI update, result sheet correct.
4. [ ] Record a payment offline → preview correct.
5. [ ] Kill tab, reopen offline → both writes visible.
6. [ ] Reconnect → one sync, no duplicates, counters match computed.
7. [ ] Second device/browser sees the same data after sync.

## Regression checks per stage

- [ ] Counters match a hand calculation for a seeded student.
- [ ] No `runTransaction` in the codebase.
- [ ] No screen imports `firebase/firestore`.
- [ ] No user-facing string outside `src/i18n`.
