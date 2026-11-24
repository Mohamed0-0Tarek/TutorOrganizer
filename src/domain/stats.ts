import { expectedCycleAmount } from "./money";
import type {
  Attendance,
  Group,
  Payment,
  Session,
  Student,
  StudentBalance,
  TutorSettings,
} from "./types";

/**
 * Pure statistics. Everything is derived from source documents (or the live
 * balance map) — cached counters are never an input.
 *
 * Month keys are `yyyy-MM` in Africa/Cairo; all digit rendering uses Latin
 * numerals at the UI layer.
 */

export function monthKeyOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function collectedInMonth(
  payments: readonly Payment[],
  monthKey: string,
): number {
  return payments
    .filter((payment) => payment.dateKey.startsWith(monthKey))
    .reduce((sum, payment) => sum + payment.amount, 0);
}

export function outstandingNow(
  balances: ReadonlyMap<string, StudentBalance>,
): number {
  return [...balances.values()].reduce(
    (sum, balance) => sum + Math.max(0, balance.amountDue),
    0,
  );
}

/**
 * Expected income for one cycle per ACTIVE student:
 *   Σ expectedCycleAmount(pricePerSession, cycleLength)
 * It is a capacity figure, not a claim that every student paid this month.
 */
export function expectedForMonth(
  students: readonly Student[],
  settings: Pick<TutorSettings, "cycleLength">,
): number {
  return students
    .filter((student) => student.active)
    .reduce(
      (sum, student) =>
        sum + expectedCycleAmount(student.pricePerSession, settings.cycleLength),
      0,
    );
}

function completedSessionsInMonth(
  sessionsById: ReadonlyMap<string, Session>,
  monthKey: string,
): ReadonlyMap<string, Session> {
  return new Map(
    [...sessionsById.values()]
      .filter(
        (session) =>
          session.status === "completed" &&
          session.dateKey.startsWith(monthKey),
      )
      .map((session) => [session.id, session]),
  );
}

/** present / all attendance docs of completed lessons in the month. */
export function attendanceRate(
  attendance: readonly Attendance[],
  sessionsById: ReadonlyMap<string, Session>,
  monthKey: string,
): number {
  const sessions = completedSessionsInMonth(sessionsById, monthKey);
  const rows = attendance.filter((row) => sessions.has(row.sessionId));
  if (rows.length === 0) return 0;
  return Math.round((rows.filter((row) => row.status === "present").length / rows.length) * 100);
}

export interface MonthIncome {
  monthKey: string;
  amount: number;
}

export function incomeByMonth(
  payments: readonly Payment[],
  monthKey: string,
  months = 6,
): MonthIncome[] {
  return Array.from({ length: months }, (_, index) => {
    const key = shiftMonthKey(monthKey, index - (months - 1));
    return { monthKey: key, amount: collectedInMonth(payments, key) };
  });
}

export interface GroupAttendance {
  groupId: string;
  groupName: string;
  present: number;
  total: number;
  rate: number;
}

export function attendanceByGroup(
  attendance: readonly Attendance[],
  sessionsById: ReadonlyMap<string, Session>,
  groups: readonly Group[],
  monthKey: string,
): GroupAttendance[] {
  const sessions = completedSessionsInMonth(sessionsById, monthKey);
  return groups
    .filter((group) => group.active)
    .map((group) => {
      const rows = attendance.filter(
        (row) => sessions.has(row.sessionId) && row.groupId === group.id,
      );
      const present = rows.filter((row) => row.status === "present").length;
      return {
        groupId: group.id,
        groupName: group.name,
        present,
        total: rows.length,
        rate: rows.length === 0 ? 0 : Math.round((present / rows.length) * 100),
      };
    });
}

export interface AbsenceRow {
  studentId: string;
  name: string;
  absences: number;
}

export function topAbsences(
  attendance: readonly Attendance[],
  sessionsById: ReadonlyMap<string, Session>,
  students: readonly Student[],
  monthKey: string,
  limit = 5,
): AbsenceRow[] {
  const sessions = completedSessionsInMonth(sessionsById, monthKey);
  return students
    .map((student) => ({
      studentId: student.id,
      name: student.name,
      absences: attendance.filter(
        (row) =>
          row.studentId === student.id &&
          row.status === "absent" &&
          sessions.has(row.sessionId),
      ).length,
    }))
    .filter((row) => row.absences > 0)
    .sort((a, b) => b.absences - a.absences || a.name.localeCompare(b.name, "ar"))
    .slice(0, limit);
}

export interface SlowPayer {
  studentId: string;
  name: string;
  amountDue: number;
  lastPaymentKey: string | null;
}

export function slowestPayers(
  students: readonly Student[],
  balances: ReadonlyMap<string, StudentBalance>,
  payments: readonly Payment[],
  limit = 5,
): SlowPayer[] {
  return students
    .filter((student) => student.active)
    .map((student) => {
      const last = payments
        .filter((payment) => payment.studentId === student.id)
        .map((payment) => payment.dateKey)
        .sort((a, b) => b.localeCompare(a))[0];
      return {
        studentId: student.id,
        name: student.name,
        amountDue: balances.get(student.id)?.amountDue ?? 0,
        lastPaymentKey: last ?? null,
      };
    })
    .filter((row) => row.amountDue > 0)
    // No payment ever → oldest possible date → first in the list.
    .sort(
      (a, b) =>
        (a.lastPaymentKey ?? "").localeCompare(b.lastPaymentKey ?? "") ||
        b.amountDue - a.amountDue,
    )
    .slice(0, limit);
}

export interface GroupIncome {
  groupId: string;
  groupName: string;
  amount: number;
}

export function topGroupsByIncome(
  payments: readonly Payment[],
  students: readonly Student[],
  groups: readonly Group[],
  monthKey: string,
  limit = 5,
): GroupIncome[] {
  const groupByStudent = new Map(students.map((student) => [student.id, student.groupId]));
  const totals = new Map<string, number>();
  for (const payment of payments) {
    if (!payment.dateKey.startsWith(monthKey)) continue;
    const groupId = groupByStudent.get(payment.studentId);
    if (!groupId) continue;
    totals.set(groupId, (totals.get(groupId) ?? 0) + payment.amount);
  }
  return groups
    .map((group) => ({
      groupId: group.id,
      groupName: group.name,
      amount: totals.get(group.id) ?? 0,
    }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}
