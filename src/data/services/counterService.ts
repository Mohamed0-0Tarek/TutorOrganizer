import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { getFirebase } from "@/data/firebase/client";
import { studentDocPath } from "@/data/paths";
import { computeCounters } from "@/domain/counters";
import type {
  Attendance,
  Counters,
  Payment,
  Session,
  Student,
  TutorSettings,
} from "@/domain/types";

export interface CounterSource {
  students: readonly Student[];
  sessionsById: ReadonlyMap<string, Session>;
  attendance: readonly Attendance[];
  payments: readonly Payment[];
  settings: Pick<TutorSettings, "absenceCounts" | "cycleLength">;
}

/**
 * The ONLY writer of `students.sessionsCounted` / `students.sessionsPaid`.
 *
 * Uses a batched write (offline-safe, queued in IndexedDB). Never transactions.
 */
export async function persistCounters(
  uid: string,
  students: readonly Student[],
  counters: ReadonlyMap<string, Counters>,
): Promise<number> {
  const { db } = getFirebase();
  const batch = writeBatch(db);
  let changed = 0;

  for (const student of students) {
    const next = counters.get(student.id);
    if (!next) continue;
    if (
      next.counted === student.sessionsCounted &&
      next.paid === student.sessionsPaid
    ) {
      continue;
    }
    batch.update(doc(db, studentDocPath(uid, student.id)), {
      sessionsCounted: next.counted,
      sessionsPaid: next.paid,
      updatedAt: serverTimestamp(),
    });
    changed += 1;
  }

  if (changed > 0) {
    await batch.commit();
  }
  return changed;
}

/** Recompute every student from source documents and persist the deltas. */
export async function reconcileCounters(
  uid: string,
  source: CounterSource,
): Promise<number> {
  const counters = computeCounters({
    students: source.students,
    sessionsById: source.sessionsById,
    attendance: source.attendance,
    payments: source.payments,
    settings: source.settings,
  });
  return persistCounters(uid, source.students, counters);
}

/** Recompute a single student (e.g. after a payment). */
export async function reconcileStudent(
  uid: string,
  studentId: string,
  source: CounterSource,
): Promise<number> {
  const counters = computeCounters({
    students: source.students,
    sessionsById: source.sessionsById,
    attendance: source.attendance,
    payments: source.payments,
    settings: source.settings,
    studentIds: [studentId],
  });
  return persistCounters(uid, source.students, counters);
}
