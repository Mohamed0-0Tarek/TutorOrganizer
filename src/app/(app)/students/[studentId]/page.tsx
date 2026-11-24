"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Phone,
  UserRound,
  Wallet,
} from "lucide-react";
import { BalanceChip } from "@/components/features/BalanceChip";
import { CounterRing } from "@/components/ui/CounterRing";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader, SectionHeader } from "@/components/ui/Headers";
import { NumberText } from "@/components/ui/NumberText";
import { StatusChip } from "@/components/ui/StatusChip";
import { useTutorData } from "@/data/provider/hooks";
import { formatArabicDate } from "@/domain/dateKey";
import { formatMoney } from "@/domain/money";
import { useI18n } from "@/i18n/I18nProvider";

export default function StudentDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const raw = params.studentId;
  const studentId = Array.isArray(raw) ? raw[0] : raw;

  const { students, groups, payments, attendance, sessionsById, balances, settings } =
    useTutorData();

  const student = students.find((item) => item.id === studentId);
  const group = groups.find((item) => item.id === student?.groupId);
  const balance = student ? balances.get(student.id) : undefined;

  if (!student) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/students"
          className="flex min-h-11 items-center gap-2 text-[13px] text-muted"
        >
          <ArrowRight size={16} aria-hidden />
          {t.students.title}
        </Link>
        <EmptyState
          icon={<UserRound size={22} aria-hidden />}
          title={t.common.empty}
        />
      </div>
    );
  }

  const studentPayments = payments
    .filter((payment) => payment.studentId === student.id)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const studentAttendance = attendance
    .filter((row) => row.studentId === student.id)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const phoneDigits = student.phone?.replace(/[^\d+]/g, "") ?? "";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/students"
          className="mb-2 flex min-h-8 items-center gap-1 text-[13px] text-muted"
        >
          <ArrowRight size={15} aria-hidden />
          {t.students.title}
        </Link>
        <PageHeader
          title={student.name}
          subtitle={group?.name}
          action={
            balance ? (
              <BalanceChip
                balance={balance}
                t={t}
                cycleLength={settings.cycleLength}
              />
            ) : undefined
          }
        />
      </div>

      <GlassCard className="flex items-center gap-4 p-4">
        <CounterRing
          position={balance?.cyclePosition ?? 0}
          length={settings.cycleLength}
          size={64}
        />
        <div className="flex flex-1 flex-col gap-1 text-[13px]">
          <span className="text-muted">
            {t.students.price}:{" "}
            <NumberText className="font-semibold text-ink">
              {formatMoney(student.pricePerSession, t.common.currency)}
            </NumberText>
          </span>
          <span className="text-muted">
            {t.students.startDate}:{" "}
            <NumberText className="font-semibold text-ink">
              {formatArabicDate(student.startedAtKey, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </NumberText>
          </span>
          {balance ? (
            <span className="text-muted">
              {t.students.sessionOf
                .replace("{position}", String(balance.cyclePosition))
                .replace("{length}", String(settings.cycleLength))}
            </span>
          ) : null}
        </div>
      </GlassCard>

      {student.phone ? (
        <div className="grid grid-cols-2 gap-3">
          <a
            href={`tel:${phoneDigits}`}
            className="press flex min-h-12 items-center justify-center gap-2 rounded-btn border border-white/70 bg-white/60 text-[14px] font-medium"
          >
            <Phone size={16} className="text-primary" aria-hidden />
            {t.students.phone}
          </a>
          <a
            href={`https://wa.me/${phoneDigits.replace(/^\+/, "")}`}
            target="_blank"
            rel="noreferrer"
            className="press flex min-h-12 items-center justify-center gap-2 rounded-btn border border-white/70 bg-white/60 text-[14px] font-medium"
          >
            <Wallet size={16} className="text-primary" aria-hidden />
            {t.dues.whatsapp}
          </a>
        </div>
      ) : null}

      <section>
        <SectionHeader title={t.students.attendanceHistory} />
        {studentAttendance.length === 0 ? (
          <EmptyState
            icon={<CalendarDays size={20} aria-hidden />}
            title={t.students.noHistory}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {studentAttendance.slice(0, 12).map((row) => {
              const session = sessionsById.get(row.sessionId);
              return (
                <li
                  key={row.id}
                  className="glass-card flex items-center justify-between gap-2 px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium">
                      {session?.groupName ?? "—"}
                    </p>
                    <p className="text-[12px] text-muted">
                      <NumberText>
                        {formatArabicDate(row.dateKey, {
                          day: "numeric",
                          month: "short",
                        })}
                      </NumberText>
                    </p>
                  </div>
                  <StatusChip
                    tone={row.status === "present" ? "success" : "danger"}
                  >
                    {row.status === "present"
                      ? t.attendance.present
                      : t.attendance.absent}
                  </StatusChip>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <SectionHeader title={t.students.paymentsHistory} />
        {studentPayments.length === 0 ? (
          <EmptyState
            icon={<Wallet size={20} aria-hidden />}
            title={t.students.noHistory}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {studentPayments.map((payment) => (
              <li
                key={payment.id}
                className="glass-card flex items-center justify-between gap-2 px-3.5 py-3"
              >
                <div>
                  <p className="text-[14px] font-semibold">
                    <NumberText>
                      {formatMoney(payment.amount, t.common.currency)}
                    </NumberText>
                  </p>
                  <p className="text-[12px] text-muted">
                    <NumberText>
                      {formatArabicDate(payment.dateKey, {
                        day: "numeric",
                        month: "short",
                      })}
                    </NumberText>{" "}
                    · <NumberText>{payment.sessionsCovered}</NumberText>{" "}
                    {t.today.sessionsToday}
                  </p>
                </div>
                <StatusChip tone="success">{t.common.saved}</StatusChip>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
