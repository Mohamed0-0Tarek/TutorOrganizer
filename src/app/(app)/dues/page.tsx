"use client";

import Link from "next/link";
import { CheckCircle2, Wallet } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader, SectionHeader } from "@/components/ui/Headers";
import { NumberText } from "@/components/ui/NumberText";
import { StatusChip } from "@/components/ui/StatusChip";
import { useDueStudents, useTutorData } from "@/data/provider/hooks";
import { formatMoney } from "@/domain/money";
import { useI18n } from "@/i18n/I18nProvider";

export default function DuesPage() {
  const { t } = useI18n();
  const { groups, settings } = useTutorData();
  const { due, almostDue, total } = useDueStudents();

  const groupName = (groupId: string) =>
    groups.find((group) => group.id === groupId)?.name ?? "—";

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
            <NumberText>{formatMoney(total, t.common.currency)}</NumberText>
          </p>
        </div>
      </GlassCard>

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
            {due.map(({ student, balance }) => (
              <li key={student.id}>
                <Link href={`/students/${student.id}`} className="press block">
                  <GlassCard className="flex items-center gap-3 p-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-semibold">
                        {student.name}
                      </p>
                      <p className="text-[12px] text-muted">
                        {groupName(student.groupId)}
                        <span className="mx-1" aria-hidden>
                          ·
                        </span>
                        <NumberText>{balance.balance}</NumberText>{" "}
                        {t.dues.sessionsSincePayment}
                      </p>
                    </div>
                    <StatusChip tone="danger">
                      <NumberText>
                        {formatMoney(balance.amountDue, t.common.currency)}
                      </NumberText>
                    </StatusChip>
                  </GlassCard>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {almostDue.length > 0 ? (
        <section>
          <SectionHeader title={t.dues.almostDue} />
          <ul className="flex flex-col gap-2">
            {almostDue.map(({ student, balance }) => (
              <li key={student.id}>
                <Link href={`/students/${student.id}`} className="press block">
                  <GlassCard className="flex items-center gap-3 p-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">
                        {student.name}
                      </p>
                      <p className="text-[12px] text-muted">
                        {groupName(student.groupId)}
                      </p>
                    </div>
                    <StatusChip tone="warning">
                      <NumberText>{balance.balance}</NumberText>/
                      <NumberText>{settings.cycleLength}</NumberText>
                    </StatusChip>
                  </GlassCard>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
