"use client";

import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  Clock,
  Users,
  Wallet,
} from "lucide-react";
import { BalanceChip } from "@/components/features/BalanceChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader, SectionHeader } from "@/components/ui/Headers";
import { NumberText } from "@/components/ui/NumberText";
import { StatusChip } from "@/components/ui/StatusChip";
import { useTutorData, useDueStudents, useTodaySessions } from "@/data/provider/hooks";
import { formatArabicDate, formatTime, todayKey } from "@/domain/dateKey";
import { formatMoney } from "@/domain/money";
import { useI18n } from "@/i18n/I18nProvider";
import { useMounted } from "@/lib/useMounted";

export default function TodayPage() {
  const { t, locale } = useI18n();
  const { students, groups, settings, balances } = useTutorData();
  const todaysSessions = useTodaySessions();
  const { due, total } = useDueStudents();

  const mounted = useMounted();
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t.today.greetingMorning
      : hour < 18
        ? t.today.greetingAfternoon
        : t.today.greetingEvening;

  // Clock-dependent copy is only rendered after hydration (no mismatch, no
  // setState inside an effect).
  const header = mounted
    ? { greeting, date: formatArabicDate(todayKey()) }
    : { greeting: t.today.title, date: "" };

  const activeStudents = students.filter((student) => student.active);
  const reminder = students.filter((student) => {
    if (!student.active) return false;
    const balance = balances.get(student.id);
    if (!balance || balance.counted === 0) return false;
    if (balance.state === "PAID_AHEAD") return false;
    return balance.counted % settings.cycleLength === settings.cycleLength - 1;
  });

  const groupName = (groupId: string) =>
    groups.find((group) => group.id === groupId)?.name ?? "—";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={header?.greeting ?? t.today.title}
        subtitle={header?.date}
      />

      {activeStudents.length === 0 ? (
        <EmptyState
          icon={<Users size={22} aria-hidden />}
          title={t.today.firstRunTitle}
          body={t.today.firstRunBody}
          action={
            <Link
              href="/groups"
              className="press flex min-h-12 items-center justify-center rounded-btn bg-primary px-4 text-[15px] font-semibold text-white"
            >
              {t.today.goToGroups}
            </Link>
          }
        />
      ) : (
        <>
          <section>
            <SectionHeader
              title={t.today.lessonsTitle}
              action={
                <Link
                  href="/schedule"
                  className="text-[13px] font-medium text-primary-dark"
                >
                  {t.nav.schedule}
                </Link>
              }
            />
            {todaysSessions.length === 0 ? (
              <EmptyState
                icon={<CalendarDays size={22} aria-hidden />}
                title={t.today.noLessons}
                body={t.today.noLessonsBody}
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {todaysSessions.map((session) => {
                  const count = students.filter(
                    (student) =>
                      student.active && student.groupId === session.groupId,
                  ).length;
                  const tone =
                    session.status === "completed"
                      ? "success"
                      : session.status === "cancelled"
                        ? "danger"
                        : "neutral";
                  const label =
                    session.status === "completed"
                      ? t.schedule.completed
                      : session.status === "cancelled"
                        ? t.schedule.cancelled
                        : t.schedule.scheduled;

                  return (
                    <li key={session.id}>
                      <Link
                        href={`/attendance/${session.id}`}
                        className="press block"
                      >
                        <GlassCard className="flex items-center gap-3 p-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Clock size={18} aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold">
                              {session.groupName}
                            </p>
                            <p className="mt-0.5 flex items-center gap-2 text-[12.5px] text-muted">
                              <NumberText>
                                {formatTime(session.time, locale)}
                              </NumberText>
                              <span aria-hidden>·</span>
                              <span>
                                <NumberText>{count}</NumberText>{" "}
                                {t.today.studentsCount}
                              </span>
                            </p>
                          </div>
                          <StatusChip tone={tone}>{label}</StatusChip>
                          <ChevronLeft
                            size={16}
                            className="text-muted rtl:rotate-0 ltr:rotate-180"
                            aria-hidden
                          />
                        </GlassCard>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {reminder.length > 0 ? (
            <section>
              <SectionHeader title={t.today.reminderTitle} />
              <GlassCard className="flex flex-col gap-3 p-4">
                <p className="text-[12.5px] text-muted">{t.today.reminderBody}</p>
                <ul className="flex flex-col gap-2">
                  {reminder.map((student) => {
                    const balance = balances.get(student.id);
                    if (!balance) return null;
                    return (
                      <li
                        key={student.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <Link
                          href={`/students/${student.id}`}
                          className="min-w-0 truncate text-[14px] font-medium"
                        >
                          {student.name}
                          <span className="ms-2 text-[12px] text-muted">
                            {groupName(student.groupId)}
                          </span>
                        </Link>
                        <BalanceChip
                          balance={balance}
                          t={t}
                          cycleLength={settings.cycleLength}
                        />
                      </li>
                    );
                  })}
                </ul>
              </GlassCard>
            </section>
          ) : null}

          <section>
            <SectionHeader title={t.today.dueTitle} />
            <Link href="/dues" className="press block">
              <GlassCard className="flex items-center gap-3 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-danger/10 text-danger">
                  <Wallet size={18} aria-hidden />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold">
                    <NumberText>{due.length}</NumberText> {t.today.dueBody}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {t.today.dueAmount}:{" "}
                    <NumberText>
                      {formatMoney(total, t.common.currency)}
                    </NumberText>
                  </p>
                </div>
                <ChevronLeft
                  size={16}
                  className="text-muted rtl:rotate-0 ltr:rotate-180"
                  aria-hidden
                />
              </GlassCard>
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
