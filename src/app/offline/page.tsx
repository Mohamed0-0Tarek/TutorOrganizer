import { CloudOff } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { dictionaries } from "@/i18n";

/** Shown by the service worker when a navigation can't reach the network. */
export default function OfflinePage() {
  const t = dictionaries.ar;
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md items-center justify-center px-5">
      <GlassCard className="flex flex-col items-center gap-3 p-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/15 text-warning">
          <CloudOff size={26} aria-hidden />
        </span>
        <h1 className="text-[18px] font-bold">{t.common.offline}</h1>
        <p className="text-[13.5px] leading-6 text-muted">
          {t.errors.loadFailedHint}
        </p>
      </GlassCard>
    </div>
  );
}
