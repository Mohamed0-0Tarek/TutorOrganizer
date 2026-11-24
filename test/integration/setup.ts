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
