"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { Backdrop } from "@/components/ui/Backdrop";
import { BottomBar } from "@/components/ui/BottomBar";
import { ErrorState } from "@/components/ui/ErrorState";
import { FloatingAiButton } from "@/components/ui/FloatingAiButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { OfflineBar } from "@/components/ui/OfflineBar";
import { SkeletonList } from "@/components/ui/Skeleton";
import { useAuth } from "@/data/auth/AuthProvider";
import { useTutorData } from "@/data/provider/hooks";
import { TutorDataProvider } from "@/data/provider/TutorDataProvider";
import { useI18n } from "@/i18n/I18nProvider";

function BootScreen({ label }: { label?: string }) {
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-5">
      <Backdrop />
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-card bg-primary text-white">
          <BookOpen size={26} aria-hidden />
        </div>
        <p className="text-[13px] text-muted">{label}</p>
      </div>
      <SkeletonList rows={2} />
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const data = useTutorData();

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <Backdrop />
      <main className="safe-top flex-1 px-4 pt-4 pb-28">
        <OfflineBar offline={!data.online} />
        {data.status === "loading" ? (
          <SkeletonList rows={4} />
        ) : data.status === "error" ? (
          <ErrorState
            title={t.errors.loadFailed}
            body={t.errors.loadFailedHint}
            retryLabel={t.common.retry}
            onRetry={() => window.location.reload()}
          />
        ) : (
          children
        )}
      </main>
      <FloatingAiButton />
      <BottomBar />
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { user, loading, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && configured && !user) {
      router.replace("/sign-in");
    }
  }, [loading, configured, user, router]);

  if (!configured) {
    return (
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5">
        <Backdrop />
        <GlassCard className="p-5">
          <h1 className="text-[20px] font-bold">{t.auth.missingConfigTitle}</h1>
          <p className="mt-2 text-[13.5px] leading-6 text-muted">
            {t.auth.missingConfigBody}
          </p>
        </GlassCard>
      </div>
    );
  }

  if (loading || !user) {
    return <BootScreen label={t.common.loading} />;
  }

  return (
    <TutorDataProvider key={user.uid}>
      <Shell>{children}</Shell>
    </TutorDataProvider>
  );
}
