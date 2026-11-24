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

- [ ] `npm test` → 65 passing.
- [ ] `npm run typecheck` → no errors.
- [ ] `npm run test:emulator` → 14 passing (4 rules + 3 CRUD + 3 sessions + 4 attendance).

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
