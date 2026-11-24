"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/Headers";
import { NumberText } from "@/components/ui/NumberText";
import { StatusChip } from "@/components/ui/StatusChip";
import { useTutorData } from "@/data/provider/hooks";
import { addDaysKey, formatArabicDate, formatTime, todayKey } from "@/domain/dateKey";
import type { Session } from "@/domain/types";
import { useI18n } from "@/i18n/I18nProvider";

export default function SchedulePage() {
  const { t, locale } = useI18n();
  const { sessions } = useTutorData();

  const days = useMemo(() => {
    const start = todayKey();
    const end = addDaysKey(start, 13);
    const inRange = sessions
      .filter((session) => session.dateKey >= start && session.dateKey <= end)
      .sort(
        (a, b) =>
          a.dateKey.localeCompare(b.dateKey) || a.time.localeCompare(b.time),
      );

    const grouped = new Map<string, Session[]>();
    for (const session of inRange) {
      const list = grouped.get(session.dateKey) ?? [];
      list.push(session);
      grouped.set(session.dateKey, list);
    }
    return [...grouped.entries()];
  }, [sessions]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t.schedule.title} subtitle={t.schedule.upcoming} />

      {days.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={22} aria-hidden />}
          title={t.schedule.noLessons}
        />
      ) : (
        days.map(([dateKey, daySessions]) => (
          <section key={dateKey}>
            <h2 className="mb-2 px-1 text-[14px] font-semibold">
              {formatArabicDate(dateKey, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h2>
            <ul className="flex flex-col gap-2">
              {daySessions.map((session) => {
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
                      <GlassCard className="flex items-center gap-3 p-3.5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Clock size={16} aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14.5px] font-semibold">
                            {session.groupName}
                          </p>
                          <p className="text-[12px] text-muted">
                            <NumberText>
                              {formatTime(session.time, locale)}
                            </NumberText>
                            {session.type === "extra"
                              ? ` · ${t.schedule.extra}`
                              : ""}
                          </p>
                        </div>
                        <StatusChip tone={tone}>{label}</StatusChip>
                      </GlassCard>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
