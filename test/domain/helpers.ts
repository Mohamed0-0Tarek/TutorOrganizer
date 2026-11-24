import type {
  Attendance,
  DateKey,
  Payment,
  Session,
  Student,
  TutorSettings,
} from "@/domain/types";

export const TEST_SETTINGS: Pick<TutorSettings, "absenceCounts" | "cycleLength"> =
  { absenceCounts: true, cycleLength: 4 };

export function makeStudent(
  overrides: Partial<Student> & { id: string },
): Student {
  return {
    name: overrides.id,
    groupId: "g1",
    pricePerSession: 50,
    startedAtKey: "2026-01-01",
    active: true,
    initialCounted: 0,
    initialPaid: 0,
    sessionsCounted: 0,
    sessionsPaid: 0,
    ...overrides,
  };
}

export function makeSession(
  overrides: Partial<Session> & { id: string },
): Session {
  return {
    groupId: "g1",
    groupName: "Group 1",
    dateKey: "2026-01-05",
    time: "17:00",
    type: "regular",
    status: "completed",
    ...overrides,
  };
}

export function makeAttendance(
  overrides: Partial<Attendance> & { sessionId: string; studentId: string },
): Attendance {
  return {
    id: `${overrides.sessionId}_${overrides.studentId}`,
    groupId: "g1",
    dateKey: "2026-01-05",
    status: "present",
    ...overrides,
  };
}

export function makePayment(
  overrides: Partial<Payment> & { id: string; studentId: string },
): Payment {
  return {
    dateKey: "2026-01-05",
    amount: 200,
    sessionsCovered: 4,
    ...overrides,
  };
}

export function sessionsMap(...sessions: Session[]): Map<string, Session> {
  return new Map(sessions.map((session) => [session.id, session]));
}

/** Weekly sessions starting at `fromKey`, every 7 days. */
export function weeklyDateKeys(fromKey: DateKey, count: number): DateKey[] {
  const start = Date.parse(`${fromKey}T00:00:00Z`);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start + index * 7 * 86_400_000);
    return date.toISOString().slice(0, 10);
  });
}
