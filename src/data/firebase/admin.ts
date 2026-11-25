import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let cached: { app: App; db: Firestore } | null = null;

/**
 * Server-only singleton for Firestore. We deliberately do NOT import
 * `firebase-admin/auth`: on Vercel it pulls `jwks-rsa` → `jose` (ESM) through a
 * CommonJS require and crashes the whole route at module load. ID tokens are
 * verified with `jose` via dynamic import instead (see verifyTutorToken).
 */
export function getAdmin(): { app: App; db: Firestore } {
  if (cached) return cached;

  const app = getApps().length > 0 ? getApp() : initializeAdmin();
  cached = { app, db: getFirestore(app) };
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

/** Project id used both for the Admin app and for token verification. */
export function adminProjectId(): string {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      const decoded = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as {
        project_id?: string;
      };
      if (decoded.project_id) return decoded.project_id;
    } catch {
      // Fall through to the public project id.
    }
  }
  return (
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    "demo-tutor-manager"
  );
}

/**
 * Verify a Firebase ID token without `firebase-admin/auth`.
 * `jose` is ESM-only, so it is loaded with a dynamic import (safe on Node 18–26).
 */
export async function verifyTutorToken(token: string): Promise<{ uid: string }> {
  const projectId = adminProjectId();

  // Emulator tokens are unsigned; the audience still identifies the project.
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) throw new Error("INVALID_TOKEN");
    const payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8"),
    ) as { user_id?: string; sub?: string; aud?: string };
    const uid = payload.user_id ?? payload.sub;
    if (!uid || (payload.aud && payload.aud !== projectId)) {
      throw new Error("INVALID_TOKEN");
    }
    return { uid };
  }

  const { createRemoteJWKSet, jwtVerify } = await import("jose");
  const jwks = createRemoteJWKSet(
    new URL(
      "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
    ),
  );
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ["RS256"],
  });

  const uid = String(payload.user_id ?? payload.sub ?? "");
  if (!uid) throw new Error("INVALID_TOKEN");
  return { uid };
}
