import { describe, expect, it } from "vitest";
import { computeAttendanceCycles, computeCounters } from "@/domain/counters";
import type { Attendance, Session } from "@/domain/types";
import {
  TEST_SETTINGS,
  makeAttendance,
  makePayment,
  makeSession,
  makeStudent,
  sessionsMap,
  weeklyDateKeys,
} from "./helpers";

function buildLessons(
  studentId: string,
  dateKeys: string[],
  overrides: Partial<Session> = {},
): { sessions: Session[]; attendance: Attendance[] } {
  const sessions = dateKeys.map((dateKey, index) =>
    makeSession({
      id: `lesson_${index + 1}`,
      dateKey,
      ...overrides,
    }),
  );
  const attendance = sessions.map((session) =>
    makeAttendance({ sessionId: session.id, studentId, dateKey: session.dateKey }),
  );
  return { sessions, attendance };
}

describe("computeCounters", () => {
  it("counts four present sessions", () => {
    const student = makeStudent({ id: "s1" });
    const keys = weeklyDateKeys("2026-01-05", 4);
    const { sessions, attendance } = buildLessons("s1", keys);

    const counters = computeCounters({
      students: [student],
      sessionsById: sessionsMap(...sessions),
      attendance,
      payments: [],
      settings: TEST_SETTINGS,
    });

    expect(counters.get("s1")).toEqual({ counted: 4, paid: 0 });
  });

  it("counts an absence when absenceCounts is true", () => {
    const student = makeStudent({ id: "s1" });
    const session = makeSession({ id: "g1_20260105" });
    const attendance = [
      makeAttendance({
        sessionId: session.id,
        studentId: "s1",
        status: "absent",
      }),
    ];

    const counters = computeCounters({
      students: [student],
      sessionsById: sessionsMap(session),
      attendance,
      payments: [],
      settings: { absenceCounts: true, cycleLength: 4 },
    });

    expect(counters.get("s1")?.counted).toBe(1);
  });

  it("does not count an absence when absenceCounts is false", () => {
    const student = makeStudent({ id: "s1" });
    const session = makeSession({ id: "g1_20260105" });
    const attendance = [
      makeAttendance({
        sessionId: session.id,
        studentId: "s1",
        status: "absent",
      }),
    ];

    const counters = computeCounters({
      students: [student],
      sessionsById: sessionsMap(session),
      attendance,
      payments: [],
      settings: { absenceCounts: false, cycleLength: 4 },
    });

    expect(counters.get("s1")?.counted).toBe(0);
  });

  it("never counts attendance of a cancelled session", () => {
    const student = makeStudent({ id: "s1" });
    const session = makeSession({ id: "g1_20260105", status: "cancelled" });
    const attendance = [
      makeAttendance({ sessionId: session.id, studentId: "s1" }),
    ];

    const counters = computeCounters({
      students: [student],
      sessionsById: sessionsMap(session),
      attendance,
      payments: [],
      settings: TEST_SETTINGS,
    });

    expect(counters.get("s1")?.counted).toBe(0);
  });

  it("never counts attendance of a scheduled (not completed) session", () => {
    const student = makeStudent({ id: "s1" });
    const session = makeSession({ id: "g1_20260105", status: "scheduled" });
    const attendance = [
      makeAttendance({ sessionId: session.id, studentId: "s1" }),
    ];

    const counters = computeCounters({
      students: [student],
      sessionsById: sessionsMap(session),
      attendance,
      payments: [],
      settings: TEST_SETTINGS,
    });

    expect(counters.get("s1")?.counted).toBe(0);
  });

  it("counts an extra session like a regular one", () => {
    const student = makeStudent({ id: "s1" });
    const session = makeSession({
      id: "g1_20260105_2",
      type: "extra",
      status: "completed",
    });
    const attendance = [
      makeAttendance({ sessionId: session.id, studentId: "s1" }),
    ];

    const counters = computeCounters({
      students: [student],
      sessionsById: sessionsMap(session),
      attendance,
      payments: [],
      settings: TEST_SETTINGS,
    });

    expect(counters.get("s1")?.counted).toBe(1);
  });

  it("recomputes upward when an old absence is edited to present", () => {
    const student = makeStudent({ id: "s1" });
    const session = makeSession({ id: "g1_20260105" });
    const absent: Attendance[] = [
      makeAttendance({
        sessionId: session.id,
        studentId: "s1",
        status: "absent",
      }),
    ];
    const present: Attendance[] = [
      makeAttendance({ sessionId: session.id, studentId: "s1" }),
    ];
    const base = {
      students: [student],
      sessionsById: sessionsMap(session),
      payments: [],
      settings: { absenceCounts: false, cycleLength: 4 },
    };

    expect(computeCounters({ ...base, attendance: absent }).get("s1")?.counted).toBe(0);
    expect(computeCounters({ ...base, attendance: present }).get("s1")?.counted).toBe(1);
  });

  it("keeps initialCounted when recomputing (imported history)", () => {
    const student = makeStudent({ id: "s1", initialCounted: 2 });
    const session = makeSession({ id: "g1_20260105" });
    const attendance = [
      makeAttendance({ sessionId: session.id, studentId: "s1" }),
    ];

    const counters = computeCounters({
      students: [student],
      sessionsById: sessionsMap(session),
      attendance,
      payments: [],
      settings: TEST_SETTINGS,
    });

    expect(counters.get("s1")).toEqual({ counted: 3, paid: 0 });
  });

  it("adds initialPaid to covered sessions", () => {
    const student = makeStudent({ id: "s1", initialPaid: 4 });
    const payment = makePayment({ id: "p1", studentId: "s1", sessionsCovered: 4 });

    const counters = computeCounters({
      students: [student],
      sessionsById: sessionsMap(),
      attendance: [],
      payments: [payment],
      settings: TEST_SETTINGS,
    });

    expect(counters.get("s1")?.paid).toBe(8);
  });

  it("keeps counters when a student moves to another group", () => {
    const dateKeys = weeklyDateKeys("2026-01-05", 3);
    const sessions = dateKeys.map((dateKey, index) =>
      makeSession({ id: `g1_lesson_${index + 1}`, dateKey }),
    );
    const attendance = sessions.map((session) =>
      makeAttendance({
        sessionId: session.id,
        studentId: "s1",
        groupId: "g1",
        dateKey: session.dateKey,
      }),
    );
    const newSession = makeSession({
      id: "g2_20260202",
      groupId: "g2",
      groupName: "Group 2",
      dateKey: "2026-02-02",
    });
    const newAttendance = makeAttendance({
      sessionId: newSession.id,
      studentId: "s1",
      groupId: "g2",
      dateKey: "2026-02-02",
    });

    const moved = makeStudent({ id: "s1", groupId: "g2" });
    const counters = computeCounters({
      students: [moved],
      sessionsById: sessionsMap(...sessions, newSession),
      attendance: [...attendance, newAttendance],
      payments: [],
      settings: TEST_SETTINGS,
    });

    expect(counters.get("s1")?.counted).toBe(4);
  });

  it("ignores attendance dated before the student started", () => {
    const student = makeStudent({ id: "s1", startedAtKey: "2026-01-12" });
    const session = makeSession({ id: "g1_20260105", dateKey: "2026-01-05" });
    const attendance = [
      makeAttendance({ sessionId: session.id, studentId: "s1" }),
    ];

    const counters = computeCounters({
      students: [student],
      sessionsById: sessionsMap(session),
      attendance,
      payments: [],
      settings: TEST_SETTINGS,
    });

    expect(counters.get("s1")?.counted).toBe(0);
  });

  it("counts a duplicate attendance doc only once", () => {
    const student = makeStudent({ id: "s1" });
    const session = makeSession({ id: "g1_20260105" });
    const row = makeAttendance({ sessionId: session.id, studentId: "s1" });

    const counters = computeCounters({
      students: [student],
      sessionsById: sessionsMap(session),
      attendance: [row, { ...row, id: "duplicate" }],
      payments: [],
      settings: TEST_SETTINGS,
    });

    expect(counters.get("s1")?.counted).toBe(1);
  });

  it("computes only the requested subset", () => {
    const s1 = makeStudent({ id: "s1" });
    const s2 = makeStudent({ id: "s2" });

    const counters = computeCounters({
      students: [s1, s2],
      sessionsById: sessionsMap(),
      attendance: [],
      payments: [makePayment({ id: "p1", studentId: "s1" })],
      settings: TEST_SETTINGS,
      studentIds: ["s1"],
    });

    expect(counters.has("s1")).toBe(true);
    expect(counters.has("s2")).toBe(false);
  });

  it("ignores attendance whose session document is missing", () => {
    const student = makeStudent({ id: "s1" });

    const counters = computeCounters({
      students: [student],
      sessionsById: sessionsMap(),
      attendance: [makeAttendance({ sessionId: "missing", studentId: "s1" })],
      payments: [],
      settings: TEST_SETTINGS,
    });

    expect(counters.get("s1")?.counted).toBe(0);
  });
});

describe("computeAttendanceCycles", () => {
  function buildRows(count: number) {
    const keys = weeklyDateKeys("2026-01-05", count);
    const sessions = keys.map((dateKey, index) =>
      makeSession({ id: `lesson_${index + 1}`, dateKey }),
    );
    const attendance = sessions.map((session) =>
      makeAttendance({
        sessionId: session.id,
        studentId: "s1",
        dateKey: session.dateKey,
      }),
    );
    return { sessions, attendance };
  }

  it("numbers the first four counted lessons as cycle 1 and the fifth as cycle 2", () => {
    const student = makeStudent({ id: "s1" });
    const { sessions, attendance } = buildRows(5);

    const cycles = computeAttendanceCycles(
      student,
      attendance,
      sessionsMap(...sessions),
      TEST_SETTINGS,
    );

    expect([...cycles.values()]).toEqual([1, 1, 1, 1, 2]);
  });

  it("starts from initialCounted and stays chronological for shuffled input", () => {
    const student = makeStudent({ id: "s1", initialCounted: 3 });
    const { sessions, attendance } = buildRows(3);

    const cycles = computeAttendanceCycles(
      student,
      [...attendance].reverse(),
      sessionsMap(...sessions),
      TEST_SETTINGS,
    );

    expect([...cycles.values()]).toEqual([1, 2, 2]);
  });

  it("omits cancelled and scheduled sessions", () => {
    const student = makeStudent({ id: "s1" });
    const cancelled = makeSession({ id: "cancelled", status: "cancelled" });
    const scheduled = makeSession({ id: "scheduled", status: "scheduled" });
    const completed = makeSession({ id: "completed" });
    const attendance = [cancelled, scheduled, completed].map((session) =>
      makeAttendance({ sessionId: session.id, studentId: "s1" }),
    );

    const cycles = computeAttendanceCycles(
      student,
      attendance,
      sessionsMap(cancelled, scheduled, completed),
      TEST_SETTINGS,
    );

    expect([...cycles.keys()]).toEqual([attendance[2].id]);
    expect(cycles.get(attendance[2].id)).toBe(1);
  });

  it("omits lessons before startedAtKey", () => {
    const student = makeStudent({ id: "s1", startedAtKey: "2026-01-12" });
    const early = makeSession({ id: "early", dateKey: "2026-01-05" });
    const later = makeSession({ id: "later", dateKey: "2026-01-19" });
    const attendance = [early, later].map((session) =>
      makeAttendance({
        sessionId: session.id,
        studentId: "s1",
        dateKey: session.dateKey,
      }),
    );

    const cycles = computeAttendanceCycles(
      student,
      attendance,
      sessionsMap(early, later),
      TEST_SETTINGS,
    );

    expect([...cycles.keys()]).toEqual([attendance[1].id]);
  });

  it("omits absences when absenceCounts is false", () => {
    const student = makeStudent({ id: "s1" });
    const session = makeSession({ id: "g1_20260105" });
    const attendance = [
      makeAttendance({
        sessionId: session.id,
        studentId: "s1",
        status: "absent",
      }),
    ];

    const cycles = computeAttendanceCycles(
      student,
      attendance,
      sessionsMap(session),
      { absenceCounts: false, cycleLength: 4 },
    );

    expect(cycles.size).toBe(0);
  });

  it("deduplicates rows and ignores attendance of other students", () => {
    const student = makeStudent({ id: "s1" });
    const session = makeSession({ id: "g1_20260105" });
    const own = makeAttendance({ sessionId: session.id, studentId: "s1" });
    const other = makeAttendance({ sessionId: session.id, studentId: "s2" });

    const cycles = computeAttendanceCycles(
      student,
      [own, { ...own, id: "duplicate" }, other],
      sessionsMap(session),
      TEST_SETTINGS,
    );

    expect(cycles.size).toBe(1);
    expect([...cycles.values()]).toEqual([1]);
    expect(cycles.has(other.id)).toBe(false);
  });
});
