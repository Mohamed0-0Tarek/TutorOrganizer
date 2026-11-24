"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { BigPrimaryButton } from "@/components/ui/BigPrimaryButton";
import { Field, inputClass } from "@/components/ui/Field";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/Headers";
import {
  enrollStudent,
  updateStudentAndReconcile,
} from "@/data/services/enrollmentService";
import { useTutorData } from "@/data/provider/hooks";
import { todayKey } from "@/domain/dateKey";
import type { Student } from "@/domain/types";
import {
  normalizeCount,
  normalizeDateKey,
  normalizeName,
  normalizePhone,
  normalizePrice,
  type ValidationErrorKey,
} from "@/domain/validation";
import { useI18n } from "@/i18n/I18nProvider";

type ErrorKey = ValidationErrorKey | "groupRequired" | "saveFailed";

export function StudentForm({ student }: { student?: Student }) {
  const { t } = useI18n();
  const router = useRouter();
  const { uid, groups, students, sessionsById, attendance, payments, settings } =
    useTutorData();

  const [name, setName] = useState(student?.name ?? "");
  const [groupId, setGroupId] = useState(student?.groupId ?? "");
  const [price, setPrice] = useState(String(student?.pricePerSession ?? 50));
  const [startedAtKey, setStartedAtKey] = useState(student?.startedAtKey ?? todayKey());
  const [phone, setPhone] = useState(student?.phone ?? "");
  const [note, setNote] = useState(student?.note ?? "");
  const [initialCounted, setInitialCounted] = useState(
    String(student?.initialCounted ?? 0),
  );
  const [initialPaid, setInitialPaid] = useState(String(student?.initialPaid ?? 0));
  const [error, setError] = useState<ErrorKey | null>(null);
  const [busy, setBusy] = useState(false);

  // An archived student's group may itself be archived: keep it selectable so
  // editing does not silently move them to another group.
  const groupOptions = groups.filter(
    (group) => group.active || group.id === student?.groupId,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uid || busy) return;
    setError(null);

    const title = normalizeName(name);
    if (!title.ok) return setError(title.error);
    if (!groupId) return setError("groupRequired");

    const fee = normalizePrice(price);
    if (!fee.ok) return setError(fee.error);
    const start = normalizeDateKey(startedAtKey);
    if (!start.ok) return setError(start.error);
    const parentPhone = normalizePhone(phone);
    if (!parentPhone.ok) return setError(parentPhone.error);
    const carriedCounted = normalizeCount(initialCounted);
    if (!carriedCounted.ok) return setError(carriedCounted.error);
    const carriedPaid = normalizeCount(initialPaid);
    if (!carriedPaid.ok) return setError(carriedPaid.error);

    const source = { students, sessionsById, attendance, payments, settings };
    const values = {
      name: title.value,
      groupId,
      pricePerSession: fee.value,
      startedAtKey: start.value,
      phone: parentPhone.value,
      note: note.trim() || undefined,
      initialCounted: carriedCounted.value,
      initialPaid: carriedPaid.value,
    };

    setBusy(true);
    try {
      let id: string;
      if (student) {
        await updateStudentAndReconcile(uid, student.id, values, source);
        id = student.id;
      } else {
        id = await enrollStudent(uid, values, source);
      }
      router.push(`/students/${id}`);
    } catch {
      setError("saveFailed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <PageHeader title={student ? t.forms.editStudent : t.forms.newStudent} />

      <GlassCard className="flex flex-col gap-4 p-4">
        <Field
          label={t.students.title}
          error={error === "nameRequired" || error === "nameTooShort" ? t.forms[error] : undefined}
        >
          <input
            id="student-name"
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>

        <Field
          label={t.students.group}
          error={error === "groupRequired" ? t.forms.groupRequired : undefined}
        >
          <select
            id="student-group"
            className={inputClass}
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
            required
          >
            <option value="">{t.forms.selectGroup}</option>
            {groupOptions.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </Field>

        {groupOptions.length === 0 ? (
          <p className="text-[12.5px] text-warning">{t.forms.noActiveGroups}</p>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Field
            label={t.students.price}
            error={error === "invalidPrice" ? t.forms.invalidPrice : undefined}
          >
            <input
              type="number"
              inputMode="numeric"
              dir="ltr"
              min={0}
              step={1}
              className={`${inputClass} tabular-nums`}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              required
            />
          </Field>

          <Field
            label={t.students.startDate}
            error={error === "invalidDate" ? t.forms.invalidDate : undefined}
          >
            <input
              type="date"
              dir="ltr"
              className={`${inputClass} tabular-nums`}
              value={startedAtKey}
              onChange={(event) => setStartedAtKey(event.target.value)}
              required
            />
          </Field>
        </div>

        <Field
          label={t.students.phone}
          hint={t.common.optional}
          error={error === "invalidPhone" ? t.forms.invalidPhone : undefined}
        >
          <input
            type="tel"
            dir="ltr"
            inputMode="tel"
            className={`${inputClass} tabular-nums`}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>

        <Field label={t.students.note} hint={t.common.optional}>
          <textarea
            rows={3}
            className={`${inputClass} min-h-20 py-2`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
      </GlassCard>

      <details className="glass-card group p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-semibold">
          {t.forms.advanced}
          <ChevronDown
            size={18}
            className="text-muted transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <p className="mt-1 text-[12px] leading-5 text-muted">
          {t.forms.advancedHint}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field
            label={t.students.initialCounted}
            error={error === "invalidCount" ? t.forms.invalidCount : undefined}
          >
            <input
              type="number"
              inputMode="numeric"
              dir="ltr"
              min={0}
              step={1}
              className={`${inputClass} tabular-nums`}
              value={initialCounted}
              onChange={(event) => setInitialCounted(event.target.value)}
            />
          </Field>
          <Field
            label={t.students.initialPaid}
            error={error === "invalidCount" ? t.forms.invalidCount : undefined}
          >
            <input
              type="number"
              inputMode="numeric"
              dir="ltr"
              min={0}
              step={1}
              className={`${inputClass} tabular-nums`}
              value={initialPaid}
              onChange={(event) => setInitialPaid(event.target.value)}
            />
          </Field>
        </div>
      </details>

      {error === "saveFailed" ? (
        <p role="alert" className="rounded-btn bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {t.forms.saveFailed}
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
