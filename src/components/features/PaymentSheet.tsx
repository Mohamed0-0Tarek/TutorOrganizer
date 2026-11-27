"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { BalanceChip } from "@/components/features/BalanceChip";
import { BigPrimaryButton } from "@/components/ui/BigPrimaryButton";
import { ConfirmCard } from "@/components/ui/ConfirmCard";
import { Field, inputClass } from "@/components/ui/Field";
import { GlassCard } from "@/components/ui/GlassCard";
import { Sheet } from "@/components/ui/Sheet";
import { useTutorData } from "@/data/provider/hooks";
import { recordPayment, removePayment, updatePayment } from "@/data/services/paymentService";
import { computeStudentBalance } from "@/domain/balanceCalculator";
import { todayKey } from "@/domain/dateKey";
import { expectedCycleAmount, formatMoney } from "@/domain/money";
import type { Payment, Student } from "@/domain/types";
import {
  normalizeCount,
  normalizeDateKey,
  normalizePrice,
} from "@/domain/validation";
import { useI18n } from "@/i18n/I18nProvider";

type ErrorKey = "invalidAmount" | "invalidCount" | "invalidDate" | "saveFailed";

export function PaymentSheet({
  open,
  onClose,
  student,
  payment,
  initialDelete = false,
}: {
  open: boolean;
  onClose: () => void;
  student: Student;
  payment?: Payment;
  initialDelete?: boolean;
}) {
  const { t } = useI18n();
  const { uid, balances, settings, students, sessionsById, attendance, payments } =
    useTutorData();
  const currency = settings.currencyLabel || t.common.currency;

  const [amount, setAmount] = useState(
    String(payment?.amount ?? expectedCycleAmount(student.pricePerSession, settings.cycleLength)),
  );
  const [covered, setCovered] = useState(
    String(payment?.sessionsCovered ?? settings.cycleLength),
  );
  const [dateKey, setDateKey] = useState(payment?.dateKey ?? todayKey());
  const [note, setNote] = useState(payment?.note ?? "");
  const [error, setError] = useState<ErrorKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(initialDelete);

  const current = balances.get(student.id);
  const rawCovered = Number(covered);
  const safeCovered =
    Number.isFinite(rawCovered) && rawCovered >= 1 ? Math.round(rawCovered) : 1;
  const extraCovered = safeCovered - (payment?.sessionsCovered ?? 0);
  const preview = computeStudentBalance(
    student,
    {
      counted: current?.counted ?? 0,
      paid: Math.max(0, (current?.paid ?? 0) + extraCovered),
    },
    settings,
  );

  const source = { students, sessionsById, attendance, payments, settings };

  async function handleSave() {
    if (!uid || busy) return;
    setError(null);

    const fee = normalizePrice(amount);
    if (!fee.ok || fee.value === 0) return setError("invalidAmount");
    const sessions = normalizeCount(covered);
    if (!sessions.ok || sessions.value === 0) return setError("invalidCount");
    const day = normalizeDateKey(dateKey);
    if (!day.ok) return setError("invalidDate");

    setBusy(true);
    try {
      if (payment) {
        await updatePayment(
          uid,
          payment.id,
          {
            amount: fee.value,
            sessionsCovered: sessions.value,
            dateKey: day.value,
            note: note.trim() || undefined,
          },
          source,
        );
      } else {
        await recordPayment(
          uid,
          {
            studentId: student.id,
            amount: fee.value,
            sessionsCovered: sessions.value,
            dateKey: day.value,
            note: note.trim() || undefined,
          },
          source,
        );
      }
      onClose();
    } catch {
      setError("saveFailed");
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!uid || !payment || busy) return;
    setBusy(true);
    try {
      await removePayment(uid, payment.id, source);
      onClose();
    } catch {
      setError("saveFailed");
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <Sheet
      open={open}
      onClose={() => (deleting ? setDeleting(false) : onClose())}
      title={payment ? `${t.common.edit} · ${t.dues.record}` : t.dues.record}
    >
      {deleting ? (
        <ConfirmCard
          title={t.forms.confirmDeletePaymentTitle}
          body={t.forms.confirmDeletePaymentBody}
          confirmLabel={t.common.delete}
          cancelLabel={t.common.cancel}
          tone="danger"
          busy={busy}
          onCancel={() => setDeleting(false)}
          onConfirm={() => void handleDelete()}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <GlassCard className="flex items-center justify-between gap-3 p-3">
            <div>
              <p className="text-[14px] font-semibold">{student.name}</p>
              <p className="text-[12px] text-muted">
                {t.students.price}: {formatMoney(student.pricePerSession, currency)}
              </p>
            </div>
            <BalanceChip
              balance={preview}
              t={t}
              cycleLength={settings.cycleLength}
              currencyLabel={currency}
            />
          </GlassCard>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t.dues.amountDue}
              error={error === "invalidAmount" ? t.forms.invalidAmount : undefined}
            >
              <input
                type="number"
                inputMode="numeric"
                dir="ltr"
                min={1}
                step={1}
                className={`${inputClass} tabular-nums`}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </Field>
            <Field
              label={t.students.paymentSessions}
              error={error === "invalidCount" ? t.forms.invalidCount : undefined}
            >
              <input
                type="number"
                inputMode="numeric"
                dir="ltr"
                min={1}
                step={1}
                className={`${inputClass} tabular-nums`}
                value={covered}
                onChange={(event) => setCovered(event.target.value)}
              />
            </Field>
          </div>

          <Field label={t.students.startDate} error={error === "invalidDate" ? t.forms.invalidDate : undefined}>
            <input
              type="date"
              dir="ltr"
              className={`${inputClass} tabular-nums`}
              value={dateKey}
              onChange={(event) => setDateKey(event.target.value)}
            />
          </Field>

          <Field label={t.students.note} hint={t.common.optional}>
            <input
              className={inputClass}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>

          {expectedCycleAmount(student.pricePerSession, safeCovered) !== Number(amount) ? (
            <p className="text-[12px] leading-5 text-warning">{t.forms.paymentMismatch}</p>
          ) : null}

          {error === "saveFailed" ? (
            <p role="alert" className="text-[12.5px] text-danger">
              {t.forms.saveFailed}
            </p>
          ) : null}

          <BigPrimaryButton onClick={() => void handleSave()} disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
            {t.common.save}
          </BigPrimaryButton>

          {payment ? (
            <button
              type="button"
              onClick={() => setDeleting(true)}
              className="press flex min-h-11 items-center justify-center gap-2 rounded-btn text-[13px] text-danger"
            >
              <Trash2 size={15} aria-hidden />
              {t.common.delete}
            </button>
          ) : null}
        </div>
      )}
    </Sheet>
  );
}
