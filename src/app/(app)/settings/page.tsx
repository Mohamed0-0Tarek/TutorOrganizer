"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Settings2 } from "lucide-react";
import { BigPrimaryButton } from "@/components/ui/BigPrimaryButton";
import { ConfirmCard } from "@/components/ui/ConfirmCard";
import { Field, inputClass } from "@/components/ui/Field";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/Headers";
import { NumberText } from "@/components/ui/NumberText";
import { Sheet } from "@/components/ui/Sheet";
import { useAuth } from "@/data/auth/AuthProvider";
import { reconcileCounters } from "@/data/services/counterService";
import { saveSettings } from "@/data/services/settingsService";
import { useTutorData } from "@/data/provider/hooks";
import { normalizeCount } from "@/domain/validation";
import type { Weekday } from "@/domain/types";
import { useI18n } from "@/i18n/I18nProvider";
import type { Locale } from "@/i18n";
import { weekdayOptions } from "@/lib/weekdays";

type Pending =
  | { type: "absence"; value: boolean }
  | { type: "cycle"; value: number }
  | null;

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { settings, uid, students, sessionsById, attendance, payments } =
    useTutorData();
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [cycleDraft, setCycleDraft] = useState(String(settings.cycleLength));
  const [currencyDraft, setCurrencyDraft] = useState(settings.currencyLabel);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const source = { students, sessionsById, attendance, payments, settings };

  async function persist(next: typeof settings, reconcile = false) {
    if (!uid) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await saveSettings(uid, next);
      if (reconcile) {
        await reconcileCounters(uid, { ...source, settings: next });
      }
      setNotice(t.settings.saved);
    } catch {
      setError(t.forms.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  async function changeLanguage(next: Locale) {
    setLocale(next);
    await persist({ ...settings, language: next });
  }

  function requestCycle() {
    const parsed = normalizeCount(cycleDraft);
    if (!parsed.ok || parsed.value < 2 || parsed.value > 8) {
      setError(t.settings.invalidCycleLength);
      return;
    }
    setError(null);
    setPending({ type: "cycle", value: parsed.value });
  }

  async function confirmPending() {
    if (!pending) return;
    if (pending.type === "absence") {
      await persist({ ...settings, absenceCounts: pending.value }, true);
    } else {
      await persist({ ...settings, cycleLength: pending.value }, true);
      setCycleDraft(String(pending.value));
    }
    setPending(null);
  }

  async function handleSignOut() {
    if (!window.confirm(t.auth.signOutConfirm)) return;
    setSigningOut(true);
    await signOut();
    router.replace("/sign-in");
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t.settings.title} />

      {notice ? (
        <p role="status" className="text-[12.5px] text-primary-dark">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-[12.5px] text-danger">
          {error}
        </p>
      ) : null}

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

      <GlassCard className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-medium">{t.settings.absenceCounts}</p>
            <p className="mt-0.5 text-[12px] leading-5 text-muted">
              {t.settings.absenceCountsHint}
            </p>
          </div>
          <input
            type="checkbox"
            role="switch"
            checked={settings.absenceCounts}
            onChange={(event) =>
              setPending({ type: "absence", value: event.target.checked })
            }
            className="h-6 w-6 shrink-0 accent-[#6B8F7B]"
            aria-label={t.settings.absenceCounts}
          />
        </div>
      </GlassCard>

      <GlassCard className="flex flex-col gap-3 p-4">
        <Field label={t.settings.cycleLength} hint={t.settings.cycleLengthHint}>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="numeric"
              dir="ltr"
              min={2}
              max={8}
              step={1}
              className={`${inputClass} tabular-nums`}
              value={cycleDraft}
              onChange={(event) => setCycleDraft(event.target.value)}
            />
            <button
              type="button"
              onClick={requestCycle}
              disabled={busy || cycleDraft === String(settings.cycleLength)}
              className="press shrink-0 rounded-btn bg-primary px-4 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {t.common.save}
            </button>
          </div>
        </Field>
        <p className="text-[12px] leading-5 text-muted">
          <NumberText>{settings.cycleLength}</NumberText>
          {" · "}
          {t.settings.cycleHistoryWarning}
        </p>
      </GlassCard>

      <GlassCard className="flex flex-col gap-3 p-4">
        <Field label={t.settings.currencyLabel}>
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={currencyDraft}
              onChange={(event) => setCurrencyDraft(event.target.value)}
              maxLength={8}
            />
            <button
              type="button"
              onClick={() =>
                void persist({ ...settings, currencyLabel: currencyDraft.trim() })
              }
              disabled={busy || !currencyDraft.trim() || currencyDraft.trim() === settings.currencyLabel}
              className="press shrink-0 rounded-btn bg-primary px-4 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {t.common.save}
            </button>
          </div>
        </Field>

        <Field label={t.settings.weekStartsOn}>
          <select
            className={inputClass}
            value={String(settings.weekStartsOn)}
            onChange={(event) =>
              void persist({
                ...settings,
                weekStartsOn: Number(event.target.value) as Weekday,
              })
            }
          >
            {weekdayOptions(t).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
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

      <Sheet
        open={pending !== null}
        onClose={() => setPending(null)}
        title={t.settings.recomputeConfirmTitle}
      >
        <ConfirmCard
          title={t.settings.recomputeConfirmTitle}
          body={
            pending?.type === "cycle"
              ? `${t.settings.cycleHistoryWarning} ${t.settings.recomputeConfirmBody}`
              : t.settings.recomputeConfirmBody
          }
          confirmLabel={t.common.confirm}
          cancelLabel={t.common.cancel}
          tone="primary"
          busy={busy}
          onCancel={() => setPending(null)}
          onConfirm={() => void confirmPending()}
        />
      </Sheet>
    </div>
  );
}
