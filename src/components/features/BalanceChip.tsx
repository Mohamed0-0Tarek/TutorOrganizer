"use client";

import { AlertCircle, CheckCircle2, Clock, Coins } from "lucide-react";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatMoney } from "@/domain/money";
import type { StudentBalance } from "@/domain/types";
import { format, type Dict } from "@/i18n";

export function BalanceChip({
  balance,
  t,
  cycleLength,
}: {
  balance: StudentBalance;
  t: Dict;
  cycleLength: number;
}) {
  switch (balance.state) {
    case "DUE":
      return (
        <StatusChip tone="danger" icon={<AlertCircle size={12} aria-hidden />}>
          {format(t.students.amountDueChip, {
            amount: formatMoney(balance.amountDue, t.common.currency),
          })}
        </StatusChip>
      );
    case "PAID_AHEAD":
      return (
        <StatusChip tone="info" icon={<Coins size={12} aria-hidden />}>
          {format(t.students.paidAhead, { n: balance.paidAheadBy })}
        </StatusChip>
      );
    case "IN_PROGRESS":
      return (
        <StatusChip tone="warning" icon={<Clock size={12} aria-hidden />}>
          {format(t.students.remainingSessions, {
            n: Math.max(cycleLength - balance.balance, 0),
          })}
        </StatusChip>
      );
    default:
      return (
        <StatusChip tone="success" icon={<CheckCircle2 size={12} aria-hidden />}>
          {t.students.settled}
        </StatusChip>
      );
  }
}
