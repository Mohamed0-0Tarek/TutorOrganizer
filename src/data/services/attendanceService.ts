import { doc, serverTimestamp, writeBatch, type Firestore } from "firebase/firestore";
import { getFirebase } from "@/data/firebase/client";
import {
  attendanceDocPath,
  sessionDocPath,
  studentDocPath,
} from "@/data/paths";
import { computeStudentBalance } from "@/domain/balanceCalculator";
import { computeCounters } from "@/domain/counters";
import { attendanceId } from "@/domain/sessionId";
import type {
  Attendance,
  AttendanceStatus,
  SessionStatus,
} from "@/domain/types";
import type { CounterSource } from "./counterService";

/** What the counters would be once a lesson's attendance is written. */
function withLesson(
  source: CounterSource,
  sessionId: string,
  rows: readonly Attendance[],
  status: SessionStatus,
): CounterSource {
  const sessionsById = new Map(source.sessionsById);
  const session = sessionsById.get(sessionId);
  if (session) sessionsById.set(sessionId, { ...session, status });

  return {
    ...source,
    sessionsById,
    attendance: [
      ...source.attendance.filter((row) => row.sessionId !== sessionId),
      ...rows,
    ],
  };
}

function persistCounters(
  batch: ReturnType<typeof writeBatch>,
  db: Firestore,
  uid: string,
  students: CounterSource["students"],
  counters: ReturnType<typeof computeCounters>,
): void {
  for (const student of students) {
    const next = counters.get(student.id);
    if (!next) continue;
    batch.update(doc(db, studentDocPath(uid, student.id)), {
      sessionsCounted: next.counted,
      sessionsPaid: next.paid,
      updatedAt: serverTimestamp(),
    });
  }
}

export interface SaveLessonInput {
  sessionId: string;
  absentIds: readonly string[];
  note?: string;
  source: CounterSource;
}

export interface LessonResult {
  countedStudents: number;
  newlyDue: string[];
}

/**
 * The heart of the app: attendance docs, session completion and cached
 * counters in ONE offline-safe batch. No transactions (they need network).
 */
export async function saveLesson(
  uid: string,
  input: SaveLessonInput,
): Promise<LessonResult> {
  const session = input.source.sessionsById.get(input.sessionId);
  if (!session) throw new Error("SESSION_NOT_FOUND");

  const absent = new Set(input.absentIds);
  const roster = input.source.students.filter(
    (student) =>
      student.active &&
      student.groupId === session.groupId &&
      student.startedAtKey <= session.dateKey,
  );

  const rows: Attendance[] = roster.map((student) => ({
    id: attendanceId(session.id, student.id),
    sessionId: session.id,
    studentId: student.id,
    groupId: session.groupId,
    dateKey: session.dateKey,
    status: absent.has(student.id) ? "absent" : "present",
  }));

  const before = computeCounters(input.source);
  const after = computeCounters(
    withLesson(input.source, session.id, rows, "completed"),
  );

  const newlyDue = roster
    .filter((student) => {
      const prior = computeStudentBalance(
        student,
        before.get(student.id) ?? { counted: 0, paid: 0 },
        input.source.settings,
      );
      const next = computeStudentBalance(
        student,
        after.get(student.id) ?? { counted: 0, paid: 0 },
        input.source.settings,
      );
      return prior.state !== "DUE" && next.state === "DUE";
    })
    .map((student) => student.id);

  const { db } = getFirebase();
  const batch = writeBatch(db);

  for (const row of rows) {
    batch.set(doc(db, attendanceDocPath(uid, row.id)), {
      ...row,
      updatedAt: serverTimestamp(),
    });
  }
  batch.update(doc(db, sessionDocPath(uid, session.id)), {
    status: "completed",
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    updatedAt: serverTimestamp(),
  });
  persistCounters(batch, db, uid, input.source.students, after);

  await batch.commit();
  return { countedStudents: roster.length, newlyDue };
}

export interface SetStatusInput {
  attendanceId: string;
  sessionId: string;
  studentId: string;
  groupId: string;
  dateKey: string;
  status: AttendanceStatus;
  source: CounterSource;
}

/** Edit one row of an already completed lesson, then recompute the counters. */
export async function setAttendanceStatus(
  uid: string,
  input: SetStatusInput,
): Promise<void> {
  const { db } = getFirebase();
  const updated: Attendance = {
    id: input.attendanceId,
    sessionId: input.sessionId,
    studentId: input.studentId,
    groupId: input.groupId,
    dateKey: input.dateKey,
    status: input.status,
  };
  const rows = [
    ...input.source.attendance.filter((row) => row.id !== input.attendanceId),
    updated,
  ];
  const counters = computeCounters(
    withLesson(input.source, input.sessionId, rows, "completed"),
  );

  const batch = writeBatch(db);
  batch.set(doc(db, attendanceDocPath(uid, input.attendanceId)), {
    ...updated,
    updatedAt: serverTimestamp(),
  });
  persistCounters(batch, db, uid, input.source.students, counters);
  await batch.commit();
}
