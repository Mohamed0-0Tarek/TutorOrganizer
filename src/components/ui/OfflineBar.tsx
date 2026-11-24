"use client";

import { CloudOff } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

export function OfflineBar({ offline }: { offline: boolean }) {
  const { t } = useI18n();
  if (!offline) return null;

  return (
    <div
      role="status"
      className="mx-auto mb-2 flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-warning/15 px-3 py-1.5 text-[12.5px] text-warning"
    >
      <CloudOff size={14} aria-hidden />
      <span>{t.common.offline}</span>
    </div>
  );
}
