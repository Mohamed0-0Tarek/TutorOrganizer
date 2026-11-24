"use client";

import { Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";

/** Present from Stage 0, enabled in Stage 9 when the assistant ships. */
export function FloatingAiButton() {
  const { t } = useI18n();
  const pathname = usePathname();

  // The attendance save bar owns this spot while a lesson is being recorded.
  if (pathname.startsWith("/attendance/")) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 mx-auto flex max-w-md justify-end px-4">
      <button
        type="button"
        disabled
        aria-disabled
        title={t.common.soon}
        className="press pointer-events-none flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 text-white opacity-60 shadow-[0_8px_20px_rgba(107,143,123,0.3)]"
      >
        <Sparkles size={20} aria-hidden />
        <span className="sr-only">{t.common.soon}</span>
      </button>
    </div>
  );
}
