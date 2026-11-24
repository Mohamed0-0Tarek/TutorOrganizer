"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, CalendarDays, Info } from "lucide-react";
import { BalanceChip } from "@/components/features/BalanceChip";
import { CounterRing } from "@/components/ui/CounterRing";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/Headers";
import { NumberText } from "@/components/ui/NumberText";
import { StatusChip } from "@/components/ui/StatusChip";
import { useTutorData } from "@/data/provider/hooks";
import { formatArabicDate, formatTime } from "@/domain/dateKey";
import { useI18n } from "@/i18n/I18nProvider";

export default function AttendancePage() {
  const { t } = useI18n();
  const params = useParams();
  const raw = params.sessionId;
  const sessionId = Array.isArray(raw) ? raw[0] : raw;

  const { sessions, students, balances, settings } = useTutorData();
  const session = sessions.find((item) => item.id === sessionId);

  if (!session) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/schedule"
          className="flex min-h-11 items-center gap-2 text-[13px] text-muted"
        >
          <ArrowRight size={16} aria-hidden />
          {t.schedule.title}
        </Link>
        <EmptyState
          icon={<CalendarDays size={22} aria-hidden />}
          title={t.common.empty}
        />
      </div>
    );
  }

  const roster = students
    .filter(
      (student) =>
        student.groupId === session.groupId &&
        student.active &&
        student.startedAtKey <= session.dateKey,
    )
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/schedule"
          className="mb-2 flex min-h-8 items-center gap-1 text-[13px] text-muted"
        >
          <ArrowRight size={15} aria-hidden />
          {t.schedule.title}
        </Link>
        <PageHeader
          title={session.groupName}
          subtitle={`${formatArabicDate(session.dateKey, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })} · ${formatTime(session.time)}`}
        />
      </div>

      <GlassCard className="flex items-center gap-2 p-3 text-[12.5px] text-muted">
        <Info size={15} className="shrink-0 text-info" aria-hidden />
        {t.attendance.alreadyCompleted}
      </GlassCard>

      {session.status === "cancelled" ? (
        <StatusChip tone="danger">{t.schedule.cancelled}</StatusChip>
      ) : null}

      {roster.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={22} aria-hidden />}
          title={t.attendance.noStudents}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {roster.map((student) => {
            const balance = balances.get(student.id);
            return (
              <li key={student.id}>
                <GlassCard className="flex items-center gap-3 px-3.5 py-3">
                  <CounterRing
                    position={balance?.cyclePosition ?? 0}
                    length={settings.cycleLength}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-medium">
                      {student.name}
                    </p>
                    <p className="text-[12px] text-muted">
                      <NumberText>{balance?.cyclePosition ?? 0}</NumberText>/
                      <NumberText>{settings.cycleLength}</NumberText>
                    </p>
                  </div>
                  {balance ? (
                    <BalanceChip
                      balance={balance}
                      t={t}
                      cycleLength={settings.cycleLength}
                    />
                  ) : null}
                  <StatusChip tone="success">{t.attendance.present}</StatusChip>
                </GlassCard>
              </li>
            );
          })}
        </ul>
      )}

      <GlassCard className="flex items-center justify-between p-4">
        <div>
          <p className="text-[13px] font-medium">{t.attendance.saveLesson}</p>
          <p className="text-[12px] text-muted">{t.common.soon}</p>
        </div>
        <StatusChip tone="neutral">
          <NumberText>{roster.length}</NumberText> {t.today.studentsCount}
        </StatusChip>
      </GlassCard>
    </div>
  );
}
