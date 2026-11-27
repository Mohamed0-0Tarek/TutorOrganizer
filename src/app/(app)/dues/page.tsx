"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, MessageCircle, Wallet } from "lucide-react";
import { PaymentSheet } from "@/components/features/PaymentSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader, SectionHeader } from "@/components/ui/Headers";
import { NumberText } from "@/components/ui/NumberText";
import { StatusChip } from "@/components/ui/StatusChip";
import { useDueStudents, useTutorData } from "@/data/provider/hooks";
import { formatMoney } from "@/domain/money";
import type { Student, StudentBalance } from "@/domain/types";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";

type PayTarget = { student: Student; balance: StudentBalance };

export default function DuesPage() {
  const { t } = useI18n();
  const { groups, settings } = useTutorData();
  const { due, almostDue, total } = useDueStudents();
  const currency = settings.currencyLabel || t.common.currency;

  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const groupName = (groupId: string) =>
    groups.find((group) => group.id === groupId)?.name ?? "—";

  function reminder(target: PayTarget) {
    const text = format(t.dues.reminderMessage, {
      name: target.student.name,
      amount: formatMoney(target.balance.amountDue, currency),
    });
    void navigator.clipboard?.writeText(text).catch(() => {});
    setNotice(t.dues.copied);
    const phone = target.student.phone?.replace(/[^\d]/g, "") ?? "";
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noreferrer",
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t.dues.title} />

      <GlassCard className="flex items-center gap-3 p-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger/10 text-danger">
          <Wallet size={18} aria-hidden />
        </span>
        <div>
          <p className="text-[12.5px] text-muted">{t.dues.total}</p>
          <p className="text-[20px] font-bold">
            <NumberText>{formatMoney(total, currency)}</NumberText>
          </p>
        </div>
      </GlassCard>

      {notice ? (
        <p role="status" className="text-[12.5px] text-primary-dark">
          {notice}
        </p>
      ) : null}

      {due.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={22} aria-hidden />}
          title={t.dues.noDues}
          body={t.dues.noDuesBody}
        />
      ) : (
        <section>
          <SectionHeader title={t.dues.title} />
          <ul className="flex flex-col gap-2">
            {due.map((target) => (
              <li key={target.student.id}>
                <GlassCard className="flex flex-col gap-2 p-3.5">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/students/${target.student.id}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate text-[14.5px] font-semibold">
                        {target.student.name}
                      </p>
                      <p className="text-[12px] text-muted">
                        {groupName(target.student.groupId)}
                        <span className="mx-1" aria-hidden>
                          ·
                        </span>
                        <NumberText>{target.balance.balance}</NumberText>{" "}
                        {t.dues.sessionsSincePayment}
                      </p>
                    </Link>
                    <StatusChip tone="danger">
                      <NumberText>
                        {formatMoney(target.balance.amountDue, currency)}
                      </NumberText>
                    </StatusChip>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPayTarget(target)}
                      className="press flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-btn bg-primary text-[12.5px] font-semibold text-white"
                    >
                      <Wallet size={14} aria-hidden />
                      {t.dues.record}
                    </button>
                    <button
                      type="button"
                      onClick={() => reminder(target)}
                      className="press flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-btn border border-white/70 bg-white/60 text-[12.5px] font-medium"
                    >
                      <MessageCircle size={14} className="text-primary" aria-hidden />
                      {t.dues.whatsapp}
                    </button>
                  </div>
                </GlassCard>
              </li>
            ))}
          </ul>
        </section>
      )}

      {almostDue.length > 0 ? (
        <section>
          <SectionHeader title={t.dues.almostDue} />
          <ul className="flex flex-col gap-2">
            {almostDue.map((target) => (
              <li key={target.student.id}>
                <GlassCard className="flex items-center gap-3 p-3.5">
                  <Link
                    href={`/students/${target.student.id}`}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate text-[14px] font-medium">
                      {target.student.name}
                    </p>
                    <p className="text-[12px] text-muted">
                      {groupName(target.student.groupId)}
                    </p>
                  </Link>
                  <StatusChip tone="warning">
                    <NumberText>{target.balance.balance}</NumberText>/
                    <NumberText>{settings.cycleLength}</NumberText>
                  </StatusChip>
                  <button
                    type="button"
                    onClick={() => setPayTarget(target)}
                    aria-label={t.dues.record}
                    className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white"
                  >
                    <Wallet size={16} aria-hidden />
                  </button>
                </GlassCard>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {payTarget ? (
        <PaymentSheet
          key={payTarget.student.id}
          open
          onClose={() => setPayTarget(null)}
          student={payTarget.student}
        />
      ) : null}
    </div>
  );
}
