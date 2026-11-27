"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Users,
  Wallet,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader, SectionHeader } from "@/components/ui/Headers";
import { NumberText } from "@/components/ui/NumberText";
import { useDueStudents, useTutorData } from "@/data/provider/hooks";
import { todayKey } from "@/domain/dateKey";
import { formatMoney } from "@/domain/money";
import {
  attendanceByGroup,
  attendanceRate,
  collectedInMonth,
  expectedForMonth,
  incomeByMonth,
  monthKeyOf,
  shiftMonthKey,
  slowestPayers,
  topAbsences,
  topGroupsByIncome,
} from "@/domain/stats";
import { formatArabicDate } from "@/domain/dateKey";
import { useI18n } from "@/i18n/I18nProvider";

function monthLabel(
  key: string,
  long: boolean,
  locale: "ar" | "en" = "ar",
): string {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
    timeZone: "UTC",
    month: long ? "long" : "short",
    ...(long ? { year: "numeric" } : {}),
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export default function StatsPage() {
  const { t, locale } = useI18n();
  const { students, groups, payments, attendance, sessionsById, balances, settings } =
    useTutorData();
  const currency = settings.currencyLabel || t.common.currency;
  const { total: outstanding } = useDueStudents();

  const [monthKey, setMonthKey] = useState(() => monthKeyOf(todayKey()));

  const stats = useMemo(() => {
    return {
      collected: collectedInMonth(payments, monthKey),
      expected: expectedForMonth(students, settings),
      rate: attendanceRate(attendance, sessionsById, monthKey),
      income: incomeByMonth(payments, monthKey, 6).map((row) => ({
        ...row,
        label: monthLabel(row.monthKey, false, locale),
      })),
      byGroup: attendanceByGroup(attendance, sessionsById, groups, monthKey),
      absences: topAbsences(attendance, sessionsById, students, monthKey),
      slow: slowestPayers(students, balances, payments),
      topGroups: topGroupsByIncome(payments, students, groups, monthKey),
    };
  }, [
    monthKey,
    payments,
    students,
    settings,
    attendance,
    sessionsById,
    groups,
    balances,
    locale,
  ]);

  const hasData =
    stats.collected > 0 ||
    stats.byGroup.some((row) => row.total > 0) ||
    stats.absences.length > 0;

  const tick = { fontSize: 10, fill: "#7a7468" };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t.stats.title} subtitle={monthLabel(monthKey, true, locale)} />

      <div className="glass-card flex items-center justify-between gap-2 p-2">
        <button
          type="button"
          aria-label={t.stats.prevMonth}
          onClick={() => setMonthKey(shiftMonthKey(monthKey, -1))}
          className="press flex h-11 w-11 items-center justify-center rounded-btn text-muted hover:bg-white/60"
        >
          <ChevronRight size={20} className="rtl:rotate-180" aria-hidden />
        </button>
        <p className="text-[15px] font-semibold">{monthLabel(monthKey, true, locale)}</p>
        <button
          type="button"
          aria-label={t.stats.nextMonth}
          onClick={() => setMonthKey(shiftMonthKey(monthKey, 1))}
          className="press flex h-11 w-11 items-center justify-center rounded-btn text-muted hover:bg-white/60"
        >
          <ChevronLeft size={20} className="rtl:rotate-180" aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="flex flex-col gap-1 p-4">
          <span className="flex items-center gap-1.5 text-[12px] text-muted">
            <Wallet size={14} aria-hidden /> {t.stats.collected}
          </span>
          <span className="text-[19px] font-bold">
            <NumberText>
              {formatMoney(stats.collected, currency)}
            </NumberText>
          </span>
        </GlassCard>
        <GlassCard className="flex flex-col gap-1 p-4">
          <span className="flex items-center gap-1.5 text-[12px] text-muted">
            <BarChart3 size={14} aria-hidden /> {t.stats.outstanding}
          </span>
          <span className="text-[19px] font-bold">
            <NumberText>{formatMoney(outstanding, currency)}</NumberText>
          </span>
        </GlassCard>
        <GlassCard className="flex flex-col gap-1 p-4">
          <span className="flex items-center gap-1.5 text-[12px] text-muted">
            <Users size={14} aria-hidden /> {t.stats.expected}
          </span>
          <span className="text-[19px] font-bold">
            <NumberText>
              {formatMoney(stats.expected, currency)}
            </NumberText>
          </span>
        </GlassCard>
        <GlassCard className="flex flex-col gap-1 p-4">
          <span className="flex items-center gap-1.5 text-[12px] text-muted">
            <CalendarCheck2 size={14} aria-hidden /> {t.stats.attendanceRate}
          </span>
          <span className="text-[19px] font-bold">
            <NumberText>{stats.rate}</NumberText>%
          </span>
        </GlassCard>
      </div>

      {!hasData ? (
        <EmptyState
          icon={<BarChart3 size={22} aria-hidden />}
          title={t.stats.noData}
        />
      ) : (
        <>
          <section>
            <SectionHeader title={t.stats.incomeChart} />
            <GlassCard className="p-3">
              <div className="h-[180px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.income} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6DBC9" />
                    <XAxis dataKey="label" reversed tick={tick} axisLine={false} tickLine={false} />
                    <YAxis tick={tick} axisLine={false} tickLine={false} width={48} />
                    <Tooltip
                      formatter={(value) => [
                        `${Number(value)} ${currency}`,
                        t.stats.collected,
                      ]}
                    />
                    <Bar dataKey="amount" fill="#6B8F7B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </section>

          <section>
            <SectionHeader title={t.stats.attendanceByGroup} />
            <GlassCard className="p-3">
              <div className="h-[170px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.byGroup}
                    layout="vertical"
                    margin={{ top: 8, right: 12, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E6DBC9" />
                    <XAxis type="number" domain={[0, 100]} tick={tick} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="groupName"
                      reversed
                      tick={tick}
                      axisLine={false}
                      tickLine={false}
                      width={82}
                    />
                    <Tooltip
                      formatter={(value) => [
                        `${Number(value)}%`,
                        t.stats.attendanceRate,
                      ]}
                    />
                    <Bar dataKey="rate" fill="#C58B6D" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </section>

          <section>
            <SectionHeader title={t.stats.topAbsences} />
            {stats.absences.length === 0 ? (
              <EmptyState icon={<BarChart3 size={22} aria-hidden />} title={t.stats.noData} />
            ) : (
              <ul className="flex flex-col gap-2">
                {stats.absences.map((row) => (
                  <li
                    key={row.studentId}
                    className="glass-card flex items-center justify-between px-3.5 py-3"
                  >
                    <span className="text-[14px]">{row.name}</span>
                    <span className="text-[13px] text-muted">
                      <NumberText>{row.absences}</NumberText> {t.attendance.absent}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionHeader title={t.stats.slowPayers} />
            {stats.slow.length === 0 ? (
              <EmptyState icon={<Wallet size={22} aria-hidden />} title={t.stats.noData} />
            ) : (
              <ul className="flex flex-col gap-2">
                {stats.slow.map((row) => (
                  <li
                    key={row.studentId}
                    className="glass-card flex items-center justify-between gap-2 px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium">{row.name}</p>
                      <p className="text-[12px] text-muted">
                        {row.lastPaymentKey
                          ? formatArabicDate(
                              row.lastPaymentKey,
                              { day: "numeric", month: "short" },
                              locale,
                            )
                          : t.stats.neverPaid}
                      </p>
                    </div>
                    <span className="text-[13px] font-semibold">
                      <NumberText>
                        {formatMoney(row.amountDue, currency)}
                      </NumberText>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionHeader title={t.stats.topGroups} />
            {stats.topGroups.length === 0 ? (
              <EmptyState icon={<BarChart3 size={22} aria-hidden />} title={t.stats.noData} />
            ) : (
              <ul className="flex flex-col gap-2">
                {stats.topGroups.map((row) => (
                  <li
                    key={row.groupId}
                    className="glass-card flex items-center justify-between px-3.5 py-3"
                  >
                    <span className="text-[14px]">{row.groupName}</span>
                    <span className="text-[13px] font-semibold">
                      <NumberText>
                        {formatMoney(row.amount, currency)}
                      </NumberText>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

    </div>
  );
}
