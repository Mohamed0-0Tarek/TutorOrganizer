"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getFirebase, isFirebaseConfigured } from "@/data/firebase/client";

export type AuthErrorKey =
  | "wrongPassword"
  | "invalidEmail"
  | "weakPassword"
  | "emailInUse"
  | "tooManyAttempts"
  | "networkError"
  | "genericError";

type SignInResult = { ok: true } | { ok: false; errorKey: AuthErrorKey };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapAuthError(error: unknown): AuthErrorKey {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "wrongPassword";
    case "auth/invalid-email":
      return "invalidEmail";
    case "auth/weak-password":
      return "weakPassword";
    case "auth/email-already-in-use":
      return "emailInUse";
    case "auth/too-many-requests":
      return "tooManyAttempts";
    case "auth/network-request-failed":
      return "networkError";
    default:
      return "genericError";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  // Without a Firebase config there is no listener to wait for.
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) return;

    const { auth } = getFirebase();
    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser);
        setLoading(false);
      },
      () => setLoading(false),
    );

    return unsubscribe;
  }, [configured]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { auth } = getFirebase();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return { ok: true } as const;
    } catch (error) {
      return { ok: false, errorKey: mapAuthError(error) } as const;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const { auth } = getFirebase();
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      return { ok: true } as const;
    } catch (error) {
      return { ok: false, errorKey: mapAuthError(error) } as const;
    }
  }, []);

  const signOut = useCallback(async () => {
    const { auth } = getFirebase();
    await firebaseSignOut(auth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, configured, signIn, signUp, signOut }),
    [user, loading, configured, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
