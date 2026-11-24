"use client";

import { useMemo } from "react";
import { BarChart3, CalendarCheck2, Users, Wallet } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader, SectionHeader } from "@/components/ui/Headers";
import { NumberText } from "@/components/ui/NumberText";
import { useDueStudents, useTutorData } from "@/data/provider/hooks";
import { expectedCycleAmount, formatMoney } from "@/domain/money";
import { todayKey } from "@/domain/dateKey";
import { useI18n } from "@/i18n/I18nProvider";

export default function StatsPage() {
  const { t } = useI18n();
  const { students, payments, attendance, sessionsById, sessions, settings } =
    useTutorData();
  const { total: outstanding } = useDueStudents();

  const monthKey = todayKey().slice(0, 7);

  const stats = useMemo(() => {
    const activeStudents = students.filter((student) => student.active);

    const collected = payments
      .filter((payment) => payment.dateKey.startsWith(monthKey))
      .reduce((sum, payment) => sum + payment.amount, 0);

    const expected = activeStudents.reduce(
      (sum, student) =>
        sum + expectedCycleAmount(student.pricePerSession, settings.cycleLength),
      0,
    );

    const monthAttendance = attendance.filter((row) => {
      const session = sessionsById.get(row.sessionId);
      return (
        row.dateKey.startsWith(monthKey) && session?.status === "completed"
      );
    });
    const present = monthAttendance.filter(
      (row) => row.status === "present",
    ).length;
    const attendanceRate =
      monthAttendance.length === 0
        ? 0
        : Math.round((present / monthAttendance.length) * 100);

    return {
      activeStudents: activeStudents.length,
      collected,
      expected,
      attendanceRate,
      lessonsThisMonth: sessions.filter(
        (session) => session.dateKey.startsWith(monthKey),
      ).length,
    };
  }, [
    students,
    payments,
    attendance,
    sessionsById,
    sessions,
    settings.cycleLength,
    monthKey,
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t.stats.title}
        subtitle={new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
          month: "long",
          year: "numeric",
        }).format(new Date())}
      />

      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="flex flex-col gap-1 p-4">
          <span className="flex items-center gap-1.5 text-[12px] text-muted">
            <Wallet size={14} aria-hidden /> {t.stats.collected}
          </span>
          <span className="text-[19px] font-bold">
            <NumberText>
              {formatMoney(stats.collected, t.common.currency)}
            </NumberText>
          </span>
        </GlassCard>
        <GlassCard className="flex flex-col gap-1 p-4">
          <span className="flex items-center gap-1.5 text-[12px] text-muted">
            <BarChart3 size={14} aria-hidden /> {t.stats.outstanding}
          </span>
          <span className="text-[19px] font-bold">
            <NumberText>
              {formatMoney(outstanding, t.common.currency)}
            </NumberText>
          </span>
        </GlassCard>
        <GlassCard className="flex flex-col gap-1 p-4">
          <span className="flex items-center gap-1.5 text-[12px] text-muted">
            <Users size={14} aria-hidden /> {t.stats.expected}
          </span>
          <span className="text-[19px] font-bold">
            <NumberText>
              {formatMoney(stats.expected, t.common.currency)}
            </NumberText>
          </span>
        </GlassCard>
        <GlassCard className="flex flex-col gap-1 p-4">
          <span className="flex items-center gap-1.5 text-[12px] text-muted">
            <CalendarCheck2 size={14} aria-hidden /> {t.stats.attendanceRate}
          </span>
          <span className="text-[19px] font-bold">
            <NumberText>{stats.attendanceRate}</NumberText>%
          </span>
        </GlassCard>
      </div>

      <section>
        <SectionHeader title={t.today.lessonsTitle} />
        <GlassCard className="flex items-center justify-between p-4">
          <span className="text-[13px] text-muted">
            {t.students.active}: <NumberText>{stats.activeStudents}</NumberText>
          </span>
          <span className="text-[13px] text-muted">
            {t.schedule.title}:{" "}
            <NumberText>{stats.lessonsThisMonth}</NumberText>
          </span>
        </GlassCard>
      </section>

      <section>
        <SectionHeader title={t.stats.topAbsences} />
        {attendance.length === 0 ? (
          <EmptyState icon={<BarChart3 size={22} aria-hidden />} title={t.stats.noData} />
        ) : (
          <ul className="flex flex-col gap-2">
            {students
              .map((student) => ({
                student,
                absences: attendance.filter(
                  (row) =>
                    row.studentId === student.id &&
                    row.status === "absent" &&
                    row.dateKey.startsWith(monthKey),
                ).length,
              }))
              .filter((row) => row.absences > 0)
              .sort((a, b) => b.absences - a.absences)
              .slice(0, 5)
              .map(({ student, absences }) => (
                <li
                  key={student.id}
                  className="glass-card flex items-center justify-between px-3.5 py-3"
                >
                  <span className="text-[14px]">{student.name}</span>
                  <span className="text-[13px] text-muted">
                    <NumberText>{absences}</NumberText> {t.attendance.absent}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
