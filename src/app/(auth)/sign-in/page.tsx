"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Eye, EyeOff, Loader2 } from "lucide-react";
import { BigPrimaryButton } from "@/components/ui/BigPrimaryButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth, type AuthErrorKey } from "@/data/auth/AuthProvider";
import { useI18n } from "@/i18n/I18nProvider";

export default function SignInPage() {
  const { t } = useI18n();
  const { user, loading, configured, signIn, signUp } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  if (!configured) {
    return (
      <GlassCard className="p-5">
        <h1 className="text-[20px] font-bold">{t.auth.missingConfigTitle}</h1>
        <p className="mt-2 text-[13.5px] leading-6 text-muted">
          {t.auth.missingConfigBody}
        </p>
      </GlassCard>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrorKey(null);
    const result =
      mode === "signin"
        ? await signIn(email, password)
        : await signUp(email, password);
    setBusy(false);
    if (!result.ok) {
      setErrorKey(result.errorKey);
      return;
    }
    router.replace("/");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-card bg-primary text-white shadow-lg">
          <BookOpen size={26} aria-hidden />
        </div>
        <h1 className="text-[24px] font-bold">{t.common.appName}</h1>
        <p className="text-[13px] text-muted">{t.auth.signInSubtitle}</p>
      </div>

      <GlassCard className="p-5">
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">
              {t.auth.email}
            </span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              dir="ltr"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-12 rounded-btn border border-white/80 bg-white/70 px-3 text-[15px] outline-none focus:border-primary/60"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">
              {t.auth.password}
            </span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                required
                minLength={6}
                dir="ltr"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-h-12 w-full rounded-btn border border-white/80 bg-white/70 px-3 pe-11 text-[15px] outline-none focus:border-primary/60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={t.auth.password}
                className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-muted"
              >
                {showPassword ? (
                  <EyeOff size={18} aria-hidden />
                ) : (
                  <Eye size={18} aria-hidden />
                )}
              </button>
            </div>
          </label>

          {errorKey ? (
            <p role="alert" className="rounded-btn bg-danger/10 px-3 py-2 text-[13px] text-danger">
              {t.auth[errorKey]}
            </p>
          ) : null}

          <BigPrimaryButton type="submit" disabled={busy || loading}>
            {busy ? (
              <Loader2 size={18} className="animate-spin" aria-hidden />
            ) : null}
            {mode === "signin" ? t.auth.signIn : t.auth.signUp}
          </BigPrimaryButton>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setErrorKey(null);
          }}
          className="mt-4 w-full text-center text-[13px] text-primary-dark underline-offset-4 hover:underline"
        >
          {mode === "signin" ? t.auth.createAccount : t.auth.haveAccount}
        </button>
      </GlassCard>
    </div>
  );
}
