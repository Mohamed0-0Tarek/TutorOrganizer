# Release checklist (v1.0)

## 1. Firebase project (do this before any real sign-in)

- [ ] **Enable the Cloud Firestore API** for the project. The service-account
      check failed with `PERMISSION_DENIED: Cloud Firestore API has not been used
      in project … before or it is disabled`. Open
      <https://console.cloud.google.com/apis/library/firestore.googleapis.com?project=tutororganizer>
      (or Firebase Console → Firestore Database → Create database) and enable it.
- [ ] Firestore database created in production mode; `firestore.rules` and
      `firestore.indexes.json` deployed:
      `firebase deploy --only firestore:rules,firestore:indexes`.
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
