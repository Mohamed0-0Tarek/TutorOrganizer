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

## Stage 1 — domain core (no UI)

- [ ] `npm test` → 51 passing.
- [ ] `npm run typecheck` → no errors.

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
