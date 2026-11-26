# Release checklist (v1.0)

## Live verification — done 2026-11-25

- Cloud Firestore API enabled; `(default)` database created in **`me-central1`
  (Doha)** — the closest region to Egypt. Admin SDK reads succeed.
- Firebase Auth initialized, Email/Password enabled, web API key allows
  `localhost`. Real sign-up works, which also confirms the published Firestore
  rules allow an owner to write their own `users/{uid}` tree.
- Real end-to-end run on project `tutororganizer`: sign-up → group → student
  (6 carried sessions, 50/session) → Dues `200 ج.م` → assistant answered
  "مين عليه دفعات؟" with exactly that amount → assistant proposed a payment,
  **nothing was saved until "تنفيذ"** → after confirm, payment record appeared
  and Dues became `0 ج.م` on reload.
- All three temporary `verify-*` users and their Firestore trees were deleted;
  the project has 0 users.
- Gemini 3.x tool-loop fixes: function responses are sent with role `user`, and
  the model's raw function-call parts (including `thought_signature`) are
  replayed on the next round.
- Speed/quota pass (2026-11-26): `GEMINI_MODEL=gemini-3.5-flash-lite` is primary
  (~15 RPM / 500 RPD free vs 5/20 on Flash), alternate Gemini is fallback, and
  hydrated Firestore state is loaded **once per request**. A live question with
  a due student answered `200` in ~10 s (was 19–46 s). Groq is an optional
  text-only fallback: add `GROQ_API_KEY` + `GROQ_MODEL=openai/gpt-oss-120b` on
  Vercel to enable it (30 RPM / 1,000 RPD free).

## 1. Firebase project (do this before any real sign-in)

- [x] **Enable the Cloud Firestore API** for the project (done; see live verification above).
- [ ] Authentication → Sign-in method → **Email/Password** enabled.
- [ ] Authentication → Settings → Authorized domains: add your Vercel domain
      (and `localhost` for local testing).
- [ ] Web app config copied into `.env.local` (`NEXT_PUBLIC_FIREBASE_*`).
- [ ] Service account JSON base64 → `FIREBASE_SERVICE_ACCOUNT` (server only).

## 2. AI

- [ ] `GEMINI_API_KEY` set (rotated after being shared in chat).
- [ ] `GEMINI_MODEL=gemini-3.5-flash` — `gemini-2.5-flash` returned 404 for this
      API key; `gemini-flash-latest` returned 503.
- [ ] `AI_DAILY_LIMIT=100`, `AI_ENABLED=true`.

## 3. Build & local PWA check

- [ ] `npm run build` (webpack + Serwist) passes; `public/sw.js` is generated.
- [ ] `npm start`; `http://localhost:3000/manifest.webmanifest` returns Arabic
      name/icons; `/sw.js` returns 200; `/offline` renders.
- [ ] Chrome → Application → Manifest: "Installable"; service worker active.
- [ ] Lighthouse mobile: PWA installable pass, performance ≥ 90.

## 4. Vercel

`vercel` CLI is not installed on this machine — install it (`npm i -g vercel`)
and log in yourself, then:

```bash
vercel link
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production
vercel env add FIREBASE_SERVICE_ACCOUNT production
vercel env add GEMINI_API_KEY production
vercel env add GEMINI_MODEL production
vercel env add AI_DAILY_LIMIT production
vercel env add AI_ENABLED production
vercel --prod
```

- [ ] No `NEXT_PUBLIC_USE_EMULATORS=1` in production.
- [ ] Production sign-up → add a group → add a student → save a lesson → record
      a payment → ask the assistant one question.
- [ ] Install from Android Chrome and iOS Safari; standalone launch has no browser chrome.
- [ ] Verify the update toast after a second deploy.

## 5. Real-week trial

- [ ] 7 consecutive days: every lesson recorded in the app, notebook only as a cross-check.
- [ ] One unaided lesson recording by the tutor, timed (< 30 s).
- [ ] Offline matrix from `docs/manual-tests.md` passes on the phone.
- [ ] Tag `v1.0` when the trial is clean.

## 6. Backup note (shown in Settings / README)

Data lives in **your Firebase account under `users/{uid}`** — clearing the
browser or reinstalling the PWA does not delete it. Do not delete the Firebase
project or the auth user. A full JSON export is planned for v1.1.
