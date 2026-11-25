/**
 * Emulator environment for the integration suite. Must run before any module
 * that imports `src/data/firebase/client.ts` (that module snapshots env vars at
 * import time).
 */
process.env.NEXT_PUBLIC_USE_EMULATORS = "1";
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "fake-api-key-for-emulator";
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN =
  "demo-tutor-manager.firebaseapp.com";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "demo-tutor-manager";
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "1:123456789:web:emulator";
// Server-side AI route talks to the same emulators without real credentials.
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.GEMINI_API_KEY = "fake-test-key";
process.env.GEMINI_MODEL = "gemini-3.5-flash";
process.env.AI_DAILY_LIMIT = "5";
