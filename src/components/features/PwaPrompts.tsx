"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { BigPrimaryButton } from "@/components/ui/BigPrimaryButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Sheet } from "@/components/ui/Sheet";
import { useI18n } from "@/i18n/I18nProvider";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

const DISMISSED_KEY = "tm.install.dismissed";

export function PwaPrompts() {
  const { t } = useI18n();
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onLessonSaved = () => {
      try {
        if (localStorage.getItem(DISMISSED_KEY) === "1") return;
      } catch {
        // Private mode: just show the prompt.
      }
      setInstallOpen(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("tm:lesson-saved", onLessonSaved);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.ready
        .then((registration) => {
          registration.addEventListener("updatefound", () => {
            const installing = registration.installing;
            installing?.addEventListener("statechange", () => {
              if (
                installing.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setUpdateReady(true);
              }
            });
          });
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("tm:lesson-saved", onLessonSaved);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Ignore storage failures.
    }
    setInstallOpen(false);
  }

  return (
    <>
      <Sheet
        open={installOpen && installEvent !== null}
        onClose={dismiss}
        title={t.pwa.installTitle}
      >
        <div className="flex flex-col gap-3">
          <p className="text-[13.5px] leading-6 text-muted">{t.pwa.installBody}</p>
          <BigPrimaryButton
            onClick={() => {
              void installEvent?.prompt().finally(dismiss);
            }}
          >
            <Download size={16} aria-hidden />
            {t.pwa.install}
          </BigPrimaryButton>
          <BigPrimaryButton variant="ghost" onClick={dismiss}>
            {t.pwa.later}
          </BigPrimaryButton>
        </div>
      </Sheet>

      {updateReady ? (
        <div className="fixed inset-x-0 top-3 z-40 mx-auto w-full max-w-md px-4">
          <GlassCard className="flex items-center gap-3 p-3">
            <RefreshCw size={17} className="shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold">{t.pwa.updateTitle}</p>
              <p className="text-[12px] text-muted">{t.pwa.updateBody}</p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="press shrink-0 rounded-full bg-primary px-3 py-2 text-[12px] font-semibold text-white"
            >
              {t.pwa.update}
            </button>
          </GlassCard>
        </div>
      ) : null}
    </>
  );
}
