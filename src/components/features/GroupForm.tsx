"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { BigPrimaryButton } from "@/components/ui/BigPrimaryButton";
import { Field, inputClass } from "@/components/ui/Field";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/Headers";
import { Segmented } from "@/components/ui/Segmented";
import { createGroup, updateGroup } from "@/data/services/groupService";
import { useTutorData } from "@/data/provider/hooks";
import type { Group } from "@/domain/types";
import {
  normalizeName,
  normalizeSlot,
  type ValidationErrorKey,
} from "@/domain/validation";
import { useI18n } from "@/i18n/I18nProvider";
import { weekdayOptions } from "@/lib/weekdays";

type SlotDraft = { weekday: string; time: string; durationMin: string };
type ErrorKey = ValidationErrorKey | "saveFailed";

const emptySlot = (): SlotDraft => ({
  weekday: "6",
  time: "17:00",
  durationMin: "60",
});

export function GroupForm({ group }: { group?: Group }) {
  const { t } = useI18n();
  const router = useRouter();
  const { uid } = useTutorData();

  const [name, setName] = useState(group?.name ?? "");
  const [subject, setSubject] = useState(group?.subject ?? "");
  const [slots, setSlots] = useState<SlotDraft[]>(
    group?.slots.length
      ? group.slots.map((slot) => ({
          weekday: String(slot.weekday),
          time: slot.time,
          durationMin: String(slot.durationMin),
        }))
      : [emptySlot()],
  );
  const [error, setError] = useState<ErrorKey | null>(null);
  const [busy, setBusy] = useState(false);

  const weekdays = weekdayOptions(t).map((option) => ({
    value: String(option.value),
    label: option.label,
  }));

  function updateSlot(index: number, patch: Partial<SlotDraft>) {
    setSlots((current) =>
      current.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uid || busy) return;
    setError(null);

    const title = normalizeName(name);
    if (!title.ok) return setError(title.error);
    if (slots.length === 0) return setError("noSlots");

    const normalized = [];
    for (const slot of slots) {
      const result = normalizeSlot({
        weekday: Number(slot.weekday),
        time: slot.time,
        durationMin: slot.durationMin,
      });
      if (!result.ok) return setError(result.error);
      normalized.push(result.value);
    }

    setBusy(true);
    try {
      let id: string;
      if (group) {
        await updateGroup(uid, group.id, {
          name: title.value,
          subject: subject.trim() || undefined,
          slots: normalized,
        });
        id = group.id;
      } else {
        id = await createGroup(uid, {
          name: title.value,
          subject: subject.trim() || undefined,
          slots: normalized,
        });
      }
      router.push(`/groups/${id}`);
    } catch {
      setError("saveFailed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <PageHeader
        title={group ? t.forms.editGroup : t.forms.newGroup}
        subtitle={t.forms.noSlotsHint}
      />

      <GlassCard className="flex flex-col gap-4 p-4">
        <Field
          label={t.groups.name}
          error={error === "nameRequired" || error === "nameTooShort" ? t.forms[error] : undefined}
        >
          <input
            id="group-name"
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>

        <Field label={t.groups.subject} hint={t.common.optional}>
          <input
            id="group-subject"
            className={inputClass}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </Field>
      </GlassCard>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-[17px] font-semibold">{t.groups.slots}</h2>

        {slots.map((slot, index) => (
          <GlassCard key={index} className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-medium text-muted">
                {t.groups.slotNumber.replace("{n}", String(index + 1))}
              </p>
              <button
                type="button"
                onClick={() => setSlots((current) => current.filter((_, i) => i !== index))}
                aria-label={t.forms.removeSlot}
                className="press rounded-full p-2 text-muted hover:text-danger"
              >
                <Trash2 size={17} aria-hidden />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-muted">
                {t.groups.weekday}
              </span>
              <Segmented
                label={t.groups.weekday}
                value={slot.weekday}
                options={weekdays}
                onChange={(value) => updateSlot(index, { weekday: value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t.groups.time}>
                <input
                  type="time"
                  dir="ltr"
                  className={inputClass}
                  value={slot.time}
                  onChange={(event) => updateSlot(index, { time: event.target.value })}
                  required
                />
              </Field>
              <Field label={t.groups.duration}>
                <input
                  type="number"
                  inputMode="numeric"
                  dir="ltr"
                  min={15}
                  max={180}
                  step={5}
                  className={`${inputClass} tabular-nums`}
                  value={slot.durationMin}
                  onChange={(event) =>
                    updateSlot(index, { durationMin: event.target.value })
                  }
                  required
                />
              </Field>
            </div>
          </GlassCard>
        ))}

        <button
          type="button"
          onClick={() => setSlots((current) => [...current, emptySlot()])}
          className="press flex min-h-12 items-center justify-center gap-2 rounded-btn border border-white/70 bg-white/50 text-[14px] font-medium"
        >
          <Plus size={17} aria-hidden />
          {t.groups.addSlot}
        </button>
      </section>

      {error && error !== "nameRequired" && error !== "nameTooShort" ? (
        <p role="alert" className="rounded-btn bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {t.forms[error]}
        </p>
      ) : null}

      <div className="flex gap-2">
        <div className="flex-1">
          <BigPrimaryButton variant="ghost" onClick={() => router.back()}>
            {t.common.cancel}
          </BigPrimaryButton>
        </div>
        <div className="flex-[2]">
          <BigPrimaryButton type="submit" disabled={busy || !uid}>
            {busy ? <Loader2 size={17} className="animate-spin" aria-hidden /> : null}
            {busy ? t.forms.saving : t.common.save}
          </BigPrimaryButton>
        </div>
      </div>
    </form>
  );
}
