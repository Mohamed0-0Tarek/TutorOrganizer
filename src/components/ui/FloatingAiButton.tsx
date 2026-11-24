"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useAiEnabled } from "@/components/features/AiConfig";
import { AiSheet } from "@/components/features/AiSheet";
import { useI18n } from "@/i18n/I18nProvider";

export function FloatingAiButton() {
  const { t } = useI18n();
  const enabled = useAiEnabled();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // The attendance save bar owns this spot while a lesson is being recorded.
  if (!enabled || pathname.startsWith("/attendance/")) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-32 z-30 mx-auto flex max-w-md justify-end px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.ai.title}
          className="press pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_20px_rgba(107,143,123,0.3)]"
        >
          <Sparkles size={20} aria-hidden />
        </button>
      </div>
      <AiSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
