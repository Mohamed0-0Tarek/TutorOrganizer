import { describe, expect, it } from "vitest";
import {
  attendanceByGroup,
  attendanceRate,
  collectedInMonth,
  expectedForMonth,
  incomeByMonth,
  outstandingNow,
  shiftMonthKey,
  slowestPayers,
  topAbsences,
  topGroupsByIncome,
} from "@/domain/stats";
import { calculateBalance } from "@/domain/balanceCalculator";
import type {
  Attendance,
  Group,
  Payment,
  Session,
  Student,
  StudentBalance,
} from "@/domain/types";

const NOV = "2026-11";
const OCT = "2026-10";

const groups: Group[] = [
  { id: "g1", name: "رياضيات", slots: [], active: true },
  { id: "g2", name: "إنجليزي", slots: [], active: true },
  { id: "g3", name: "مؤرشفة", slots: [], active: false },
];

const students: Student[] = [
  {
    id: "s1",
    name: "أحمد",
    groupId: "g1",
    pricePerSession: 50,
    startedAtKey: "2026-01-01",
    active: true,
    initialCounted: 0,
    initialPaid: 0,
    sessionsCounted: 0,
    sessionsPaid: 0,
  },
  {
    id: "s2",
    name: "محمد",
    groupId: "g1",
    pricePerSession: 40,
    startedAtKey: "2026-01-01",
    active: true,
    initialCounted: 0,
    initialPaid: 0,
    sessionsCounted: 0,
    sessionsPaid: 0,
  },
  {
    id: "s3",
    name: "سامي",
    groupId: "g2",
    pricePerSession: 60,
    startedAtKey: "2026-01-01",
    active: true,
    initialCounted: 0,
    initialPaid: 0,
    sessionsCounted: 0,
    sessionsPaid: 0,
  },
];

const sessions: Session[] = [
  {
    id: "g1_20261102",
    groupId: "g1",
    groupName: "رياضيات",
    dateKey: "2026-11-02",
    time: "17:00",
    type: "regular",
    status: "completed",
  },
  {
    id: "g1_20261109",
    groupId: "g1",
    groupName: "رياضيات",
    dateKey: "2026-11-09",
    time: "17:00",
    type: "regular",
    status: "completed",
  },
  {
    id: "g2_20261103",
    groupId: "g2",
    groupName: "إنجليزي",
    dateKey: "2026-11-03",
    time: "18:00",
    type: "regular",
    status: "cancelled",
  },
  {
    id: "g1_20261005",
    groupId: "g1",
    groupName: "رياضيات",
    dateKey: "2026-10-05",
    time: "17:00",
    type: "regular",
    status: "completed",
  },
];
const sessionsById = new Map(sessions.map((session) => [session.id, session]));

const attendance: Attendance[] = [
  {
    id: "a1",
    sessionId: "g1_20261102",
    studentId: "s1",
    groupId: "g1",
    dateKey: "2026-11-02",
    status: "present",
  },
  {
    id: "a2",
    sessionId: "g1_20261102",
    studentId: "s2",
    groupId: "g1",
    dateKey: "2026-11-02",
    status: "present",
  },
  {
    id: "a3",
    sessionId: "g1_20261109",
    studentId: "s1",
    groupId: "g1",
    dateKey: "2026-11-09",
    status: "absent",
  },
  {
    id: "a4",
    sessionId: "g2_20261103",
    studentId: "s3",
    groupId: "g2",
    dateKey: "2026-11-03",
    status: "present",
  },
  {
    id: "a5",
    sessionId: "g1_20261005",
    studentId: "s1",
    groupId: "g1",
    dateKey: "2026-10-05",
    status: "present",
  },
];

const payments: Payment[] = [
  { id: "p1", studentId: "s1", dateKey: "2026-11-04", amount: 200, sessionsCovered: 4 },
  { id: "p2", studentId: "s2", dateKey: "2026-11-11", amount: 160, sessionsCovered: 4 },
  { id: "p3", studentId: "s1", dateKey: "2026-10-04", amount: 400, sessionsCovered: 8 },
];

const balances = new Map<string, StudentBalance>([
  ["s1", calculateBalance({ counted: 8, paid: 4, pricePerSession: 50, cycleLength: 4 })],
  ["s2", calculateBalance({ counted: 4, paid: 4, pricePerSession: 40, cycleLength: 4 })],
  ["s3", calculateBalance({ counted: 2, paid: 0, pricePerSession: 60, cycleLength: 4 })],
]);

describe("stats", () => {
  it("shifts month keys across year boundaries", () => {
    expect(shiftMonthKey(NOV, -1)).toBe(OCT);
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
  });

  it("collected matches the payment list for that month", () => {
    expect(collectedInMonth(payments, NOV)).toBe(360);
    expect(collectedInMonth(payments, OCT)).toBe(400);
    expect(collectedInMonth(payments, "2026-09")).toBe(0);
  });

  it("outstanding is the sum of live amountDue", () => {
    expect(outstandingNow(balances)).toBe(200);
  });

  it("expected is one cycle per active student", () => {
    expect(expectedForMonth(students, { cycleLength: 4 })).toBe(200 + 160 + 240);
  });

  it("attendance rate ignores cancelled lessons and other months", () => {
    // 2 present / 3 docs of completed November lessons.
    expect(attendanceRate(attendance, sessionsById, NOV)).toBe(67);
    expect(attendanceRate(attendance, sessionsById, OCT)).toBe(100);
  });

  it("six-month income ends at the selected month", () => {
    const series = incomeByMonth(payments, NOV, 6);
    expect(series).toHaveLength(6);
    expect(series[5]).toEqual({ monthKey: NOV, amount: 360 });
    expect(series[4]).toEqual({ monthKey: OCT, amount: 400 });
  });

  it("attendance by group, top absences and slowest payers", () => {
    const byGroup = attendanceByGroup(attendance, sessionsById, groups, NOV);
    expect(byGroup.find((row) => row.groupId === "g1")).toMatchObject({
      present: 2,
      total: 3,
      rate: 67,
    });
    expect(byGroup.find((row) => row.groupId === "g2")?.rate).toBe(0);
    expect(byGroup.find((row) => row.groupId === "g3")).toBeUndefined();

    expect(topAbsences(attendance, sessionsById, students, NOV)).toEqual([
      { studentId: "s1", name: "أحمد", absences: 1 },
    ]);

    expect(slowestPayers(students, balances, payments)).toEqual([
      {
        studentId: "s1",
        name: "أحمد",
        amountDue: 200,
        lastPaymentKey: "2026-11-04",
      },
    ]);
  });

  it("top groups by income adds only the month's payments", () => {
    expect(topGroupsByIncome(payments, students, groups, NOV)).toEqual([
      { groupId: "g1", groupName: "رياضيات", amount: 360 },
    ]);
  });
});
