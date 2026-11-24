"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Settings2 } from "lucide-react";
import { BigPrimaryButton } from "@/components/ui/BigPrimaryButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/Headers";
import { NumberText } from "@/components/ui/NumberText";
import { useAuth } from "@/data/auth/AuthProvider";
import { saveSettings } from "@/data/services/settingsService";
import { useTutorData } from "@/data/provider/hooks";
import { useI18n } from "@/i18n/I18nProvider";
import { weekdayLabel } from "@/lib/weekdays";
import type { Locale } from "@/i18n";

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { settings, uid } = useTutorData();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function changeLanguage(next: Locale) {
    setLocale(next);
    if (!uid) return;
    try {
      await saveSettings(uid, { ...settings, language: next });
    } catch {
      // Offline: the language still applies locally and syncs on reconnect.
    }
  }

  async function handleSignOut() {
    if (!window.confirm(t.auth.signOutConfirm)) return;
    setSigningOut(true);
    await signOut();
    router.replace("/sign-in");
  }

  const rows = [
    {
      label: t.settings.cycleLength,
      value: <NumberText>{settings.cycleLength}</NumberText>,
      hint: t.settings.cycleLengthHint,
    },
    {
      label: t.settings.absenceCounts,
      value: settings.absenceCounts ? "✓" : "—",
      hint: t.settings.absenceCountsHint,
    },
    {
      label: t.settings.currencyLabel,
      value: settings.currencyLabel,
    },
    {
      label: t.settings.weekStartsOn,
      value: weekdayLabel(t, settings.weekStartsOn),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t.settings.title} />

      <GlassCard className="flex flex-col gap-3 p-4">
        <p className="flex items-center gap-2 text-[13px] font-medium text-muted">
          <Settings2 size={15} aria-hidden />
          {t.settings.language}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(["ar", "en"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => void changeLanguage(value)}
              className={
                locale === value
                  ? "press min-h-11 rounded-btn bg-primary text-[14px] font-semibold text-white"
                  : "press min-h-11 rounded-btn border border-white/70 bg-white/60 text-[14px]"
              }
            >
              {value === "ar" ? t.settings.arabic : t.settings.english}
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="flex flex-col divide-y divide-white/60 p-0">
        {rows.slice(0, 4).map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-[14px] font-medium">{row.label}</p>
              {row.hint ? (
                <p className="mt-0.5 text-[12px] leading-5 text-muted">{row.hint}</p>
              ) : null}
            </div>
            <span className="shrink-0 text-[14px] font-semibold">{row.value}</span>
          </div>
        ))}
      </GlassCard>

      <GlassCard className="flex flex-col gap-3 p-4">
        <p className="text-[13px] font-medium text-muted">{t.settings.account}</p>
        <p dir="ltr" className="truncate text-[14px]">
          {user?.email ?? "—"}
        </p>
        <BigPrimaryButton
          variant="ghost"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
        >
          <LogOut size={16} aria-hidden />
          {t.nav.signOut}
        </BigPrimaryButton>
      </GlassCard>

      <GlassCard className="p-4">
        <p className="text-[13px] font-medium">{t.settings.about}</p>
        <p className="mt-1 text-[12.5px] leading-5 text-muted">
          {t.settings.aboutBody}
        </p>
      </GlassCard>
    </div>
  );
}
