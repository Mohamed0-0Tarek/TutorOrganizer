import type {
  Attendance,
  Counters,
  Payment,
  Session,
  Student,
  TutorSettings,
} from "./types";

export interface ComputeCountersInput {
  students: readonly Student[];
  sessionsById: ReadonlyMap<string, Session>;
  attendance: readonly Attendance[];
  payments: readonly Payment[];
  settings: Pick<TutorSettings, "absenceCounts" | "cycleLength">;
  /** Optional subset of student ids to compute. */
  studentIds?: Iterable<string>;
}

/**
 * The single derivation of a student's counters.
 *
 * `counted = initialCounted + sum(attendance) where`
 *   - the parent session is `completed` (scheduled/cancelled never count),
 *   - `session.dateKey >= student.startedAtKey`,
 *   - attendance is present, or absent and `settings.absenceCounts`.
 * `paid = initialPaid + sum(payment.sessionsCovered)`.
 *
 * Pure and deterministic: no cached state is trusted.
 */
export function computeCounters(
  input: ComputeCountersInput,
): Map<string, Counters> {
  const { students, sessionsById, attendance, payments, settings } = input;
  const studentsById = new Map(students.map((student) => [student.id, student]));
  const targets = input.studentIds ? new Set(input.studentIds) : null;

  const result = new Map<string, Counters>();
  for (const student of students) {
    if (targets && !targets.has(student.id)) continue;
    result.set(student.id, {
      counted: student.initialCounted,
      paid: student.initialPaid,
    });
  }

  const seen = new Set<string>();
  for (const row of attendance) {
    if (!result.has(row.studentId)) continue;
    const student = studentsById.get(row.studentId);
    if (!student) continue;

    const session = sessionsById.get(row.sessionId);
    if (!session || session.status !== "completed") continue;
    if (session.dateKey < student.startedAtKey) continue;

    // Defensive: deterministic ids make duplicates impossible, but a money
    // counter must never double count malformed data either.
    const dedupeKey = `${row.sessionId}::${row.studentId}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const counts =
      row.status === "present" ||
      (row.status === "absent" && settings.absenceCounts);
    if (counts) {
      const counters = result.get(row.studentId);
      if (counters) counters.counted += 1;
    }
  }

  for (const payment of payments) {
    const counters = result.get(payment.studentId);
    if (!counters) continue;
    counters.paid += payment.sessionsCovered;
  }

  return result;
}

/** Convenience for a single student (used by detail screens and tests). */
export function countersForStudent(
  studentId: string,
  input: Omit<ComputeCountersInput, "studentIds">,
): Counters {
  const all = computeCounters({ ...input, studentIds: [studentId] });
  return all.get(studentId) ?? { counted: 0, paid: 0 };
}
