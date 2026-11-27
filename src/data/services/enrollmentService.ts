import { todayKey } from "@/domain/dateKey";
import type { Student } from "@/domain/types";
import {
  reconcileStudent,
  reconcileStudents,
  type CounterSource,
} from "./counterService";
import {
  createStudent,
  createStudentsBatch,
  moveStudentToGroup,
  setStudentActive,
  updateStudent,
  type CreateStudentInput,
} from "./studentService";

/**
 * Student writes plus the counter reconciliation they require.
 *
 * `counterService` remains the only writer of the cached counters; these
 * helpers pass it the hydrated source (plus the pending change) so the cache
 * is never trusted as an input.
 */

type StudentPatch = Partial<CreateStudentInput> & { active?: boolean };

function withPendingStudent(
  source: CounterSource,
  studentId: string,
  patch: StudentPatch,
): CounterSource {
  return {
    ...source,
    students: source.students.map((student) =>
      student.id === studentId ? { ...student, ...patch } : student,
    ),
  };
}

export async function enrollStudent(
  uid: string,
  input: CreateStudentInput,
  source: CounterSource,
): Promise<string> {
  const id = await createStudent(uid, input);
  const created: Student = {
    id,
    name: input.name.trim(),
    groupId: input.groupId,
    pricePerSession: input.pricePerSession,
    startedAtKey: input.startedAtKey ?? todayKey(),
    active: true,
    initialCounted: input.initialCounted ?? 0,
    initialPaid: input.initialPaid ?? 0,
    sessionsCounted: 0,
    sessionsPaid: 0,
  };
  await reconcileStudent(uid, id, {
    ...source,
    students: [...source.students, created],
  });
  return id;
}

/**
 * Bulk onboarding from a paper notebook: one batch creates all students, then
 * counterService persists carried-over counters in a separate batch (skipping
 * students whose values are still zero).
 */
export async function bulkEnrollStudents(
  uid: string,
  inputs: readonly CreateStudentInput[],
  source: CounterSource,
): Promise<string[]> {
  if (inputs.length === 0) return [];

  const { ids, created } = await createStudentsBatch(uid, inputs);
  await reconcileStudents(uid, ids, {
    ...source,
    students: [...source.students, ...created],
  });
  return ids;
}

export async function updateStudentAndReconcile(
  uid: string,
  studentId: string,
  patch: StudentPatch,
  source: CounterSource,
): Promise<void> {
  await updateStudent(uid, studentId, patch);
  await reconcileStudent(
    uid,
    studentId,
    withPendingStudent(source, studentId, patch),
  );
}

/**
 * Moving does NOT touch attendance documents: they keep the group they were
 * recorded under, so historical group statistics stay truthful.
 */
export async function moveStudentAndReconcile(
  uid: string,
  studentId: string,
  groupId: string,
  source: CounterSource,
): Promise<void> {
  await moveStudentToGroup(uid, studentId, groupId);
  await reconcileStudent(
    uid,
    studentId,
    withPendingStudent(source, studentId, { groupId }),
  );
}

export async function setStudentActiveAndReconcile(
  uid: string,
  studentId: string,
  active: boolean,
  source: CounterSource,
): Promise<void> {
  await setStudentActive(uid, studentId, active);
  await reconcileStudent(
    uid,
    studentId,
    withPendingStudent(source, studentId, { active }),
  );
}
