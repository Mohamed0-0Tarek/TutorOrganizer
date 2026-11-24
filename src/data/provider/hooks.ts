"use client";

import { useContext, useMemo } from "react";
import {
  TutorDataContext,
  type TutorData,
} from "@/data/provider/TutorDataProvider";
import { needsReminder } from "@/domain/balanceCalculator";
import { computeGroupStatus } from "@/domain/groupPosition";
import { todayKey } from "@/domain/dateKey";
import type { GroupStatus, StudentBalance } from "@/domain/types";

export function useTutorData(): TutorData {
  const ctx = useContext(TutorDataContext);
  if (!ctx) {
    throw new Error("useTutorData must be used inside <TutorDataProvider>");
  }
  return ctx;
}

export function useStudentBalance(
  studentId: string | undefined,
): StudentBalance | undefined {
  const { balances } = useTutorData();
  return studentId ? balances.get(studentId) : undefined;
}

export function useGroupStatus(groupId: string | undefined): GroupStatus {
  const { students, balances } = useTutorData();
  return useMemo(() => {
    if (!groupId) return { position: 0, outliers: [], activeCount: 0 };
    return computeGroupStatus(
      students.filter((student) => student.groupId === groupId),
      balances,
    );
  }, [groupId, students, balances]);
}

export function useDueStudents() {
  const { students, balances, settings } = useTutorData();
  return useMemo(() => {
    const rows = students
      .filter((student) => student.active)
      .map((student) => ({
        student,
        balance: balances.get(student.id),
      }))
      .filter(
        (row): row is { student: (typeof students)[number]; balance: StudentBalance } =>
          Boolean(row.balance),
      );

    const due = rows
      .filter((row) => row.balance.state === "DUE")
      .sort(
        (a, b) =>
          b.balance.amountDue - a.balance.amountDue ||
          a.student.name.localeCompare(b.student.name, "ar"),
      );

    const almostDue = rows.filter(
      (row) =>
        row.balance.state === "IN_PROGRESS" &&
        row.balance.balance === settings.cycleLength - 1,
    );

    return {
      due,
      almostDue,
      total: due.reduce((sum, row) => sum + row.balance.amountDue, 0),
    };
  }, [students, balances, settings.cycleLength]);
}

export function useTodaySessions() {
  const { sessions } = useTutorData();
  return useMemo(() => {
    const key = todayKey();
    return sessions
      .filter((session) => session.dateKey === key)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [sessions]);
}

/** Everything the Today screen needs, computed once from hydrated state. */
export function useToday() {
  const { settings, balances } = useTutorData();
  const sessions = useTodaySessions();
  const { due, total } = useDueStudents();

  const reminder = useMemo(
    () =>
      [...balances.entries()]
        .filter(([, balance]) => needsReminder(balance, settings.cycleLength))
        .map(([studentId, balance]) => ({ studentId, balance })),
    [balances, settings.cycleLength],
  );

  return { sessions, reminder, dueCount: due.length, dueTotal: total };
}
