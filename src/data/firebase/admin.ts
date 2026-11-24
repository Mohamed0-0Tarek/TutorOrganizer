import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let cached: { app: App; auth: Auth; db: Firestore } | null = null;

/**
 * Server-only singleton. Uses a service account in production; in local dev /
 * emulator tests it falls back to the Firebase env vars
 * (FIREBASE_AUTH_EMULATOR_HOST / FIRESTORE_EMULATOR_HOST + project id).
 */
export function getAdmin(): { app: App; auth: Auth; db: Firestore } {
  if (cached) return cached;

  const app = getApps().length > 0 ? getApp() : initializeAdmin();
  cached = { app, auth: getAuth(app), db: getFirestore(app) };
  return cached;
}

function initializeAdmin(): App {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const serviceAccount = JSON.parse(
      Buffer.from(raw, "base64").toString("utf8"),
    ) as { project_id?: string };
    return initializeApp({
      credential: cert(serviceAccount as ServiceAccount),
      projectId: serviceAccount.project_id,
    });
  }

  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    "demo-tutor-manager";
  return initializeApp({ projectId });
}
