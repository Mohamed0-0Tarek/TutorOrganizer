# Pinned versions

Recorded after scaffolding. Do not chase upgrades mid-build.

| Package | Version |
| --- | --- |
| next | 16.4.6 |
| react / react-dom | 19.3.0 |
| typescript | 5.x (create-next-app pin) |
| tailwindcss | 4.3.3 |
| @tailwindcss/turbopack | 4.3.3 |
| firebase | 13.4.0 |
| firebase-admin | 14.5.1 |
| @firebase/rules-unit-testing | 6.0.0 |
| @google/genai | 3.6.1 |
| @serwist/next / serwist | 9.5.15 (not wired yet — Stage 10) |
| recharts | 3.11.1 (Stage 8) |
| lucide-react | 1.79.0 |
| zod | 4.6.7 (Stage 9) |
| vitest | 5.1.1 |
| @types/node | 24.x |

Runtime: Node 24 (local), Next requires ≥ 20.9.

## Notes

- `@types/node` was raised from 20 to 24 to satisfy Vitest 5's peer range.
- Next 16 uses Turbopack for `dev`, but `build` uses **webpack** so `@serwist/next` can generate `public/sw.js`. `postcss.config.mjs` + `@tailwindcss/postcss` provide Tailwind v4 for the webpack build.
- `next.config.ts` deliberately omits `cacheComponents` / `partialPrefetching`: the authenticated app is client-rendered and must not be prerendered with stale data.
- `GEMINI_MODEL=gemini-3.5-flash` is the working model for the current key; `gemini-2.5-flash` returned 404 and `gemini-flash-latest` returned 503.
- `tsconfig.target` is **ES2020** (raised from the scaffold's ES2017) because `sessionId.ts` uses named regex capture groups.
- **Firestore emulator requires JDK 21+.** `firebase-tools` rejects Java 17 with
  "no longer supports Java version before 21". Verified with Temurin 21 JRE
  (`/tmp/opencode/jre21/...` locally); run
  `JAVA_HOME=<jre21> npm run test:emulator` if the system JDK is older.
- `firebase emulators` writes `firestore-debug.log` / `.firebase/` — both are git-ignored.
