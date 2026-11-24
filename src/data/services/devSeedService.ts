import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getFirebase } from "@/data/firebase/client";
import {
  attendanceDocPath,
  attendancePath,
  groupsPath,
  paymentsPath,
  sessionDocPath,
  sessionsPath,
  studentDocPath,
  studentsPath,
} from "@/data/paths";
import { todayKey, weekdayOfKey } from "@/domain/dateKey";
import { attendanceId, regularSessionId } from "@/domain/sessionId";
import type { AttendanceStatus } from "@/domain/types";

/**
 * Dev-only fixtures for the offline spike (Stage 0). Never imported by app
 * screens outside `/dev`, which is excluded from production builds.
 */
export async function seedDemoData(
  uid: string,
): Promise<{ groupId: string; sessionId: string }> {
  const { db } = getFirebase();
  const batch = writeBatch(db);

  const groupRef = doc(collection(db, groupsPath(uid)));
  const firstStudentRef = doc(collection(db, studentsPath(uid)));
  const secondStudentRef = doc(collection(db, studentsPath(uid)));

  const dateKey = todayKey();
  const sessionId = regularSessionId(groupRef.id, dateKey);
  const sessionRef = doc(db, sessionDocPath(uid, sessionId));

  batch.set(groupRef, {
    name: "مجموعة تجريبية",
    slots: [{ weekday: weekdayOfKey(dateKey), time: "17:00", durationMin: 60 }],
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const studentSeeds = [
    { ref: firstStudentRef, name: "أحمد (تجريبي)" },
    { ref: secondStudentRef, name: "محمود (تجريبي)" },
  ];

  for (const { ref, name } of studentSeeds) {
    batch.set(ref, {
      name,
      groupId: groupRef.id,
      pricePerSession: 50,
      startedAtKey: dateKey,
      active: true,
      initialCounted: 0,
      initialPaid: 0,
      // The seeded lesson is completed and both are present.
      sessionsCounted: 1,
      sessionsPaid: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const id = attendanceId(sessionId, ref.id);
    batch.set(doc(db, attendanceDocPath(uid, id)), {
      sessionId,
      studentId: ref.id,
      groupId: groupRef.id,
      dateKey,
      status: "present",
      updatedAt: serverTimestamp(),
    });
  }

  batch.set(sessionRef, {
    groupId: groupRef.id,
    groupName: "مجموعة تجريبية",
    dateKey,
    time: "17:00",
    type: "regular",
    status: "completed",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return { groupId: groupRef.id, sessionId };
}

/** Deliberately break a cached counter so "Recompute counters" can be tested. */
export async function corruptCounters(
  uid: string,
  studentId: string,
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, studentDocPath(uid, studentId)), {
    sessionsCounted: 999,
    sessionsPaid: 999,
    updatedAt: serverTimestamp(),
  });
}

export async function setAttendanceStatus(input: {
  uid: string;
  attendanceId: string;
  sessionId: string;
  studentId: string;
  groupId: string;
  dateKey: string;
  status: AttendanceStatus;
}): Promise<void> {
  const { db } = getFirebase();
  await setDoc(
    doc(db, attendanceDocPath(input.uid, input.attendanceId)),
    {
      sessionId: input.sessionId,
      studentId: input.studentId,
      groupId: input.groupId,
      dateKey: input.dateKey,
      status: input.status,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export interface ClearDemoInput {
  groupIds: string[];
  studentIds: string[];
  sessionIds: string[];
  attendanceIds: string[];
  paymentIds: string[];
}

export async function clearDemoData(
  uid: string,
  input: ClearDemoInput,
): Promise<void> {
  const { db } = getFirebase();
  const batch = writeBatch(db);

  for (const id of input.groupIds) batch.delete(doc(db, `${groupsPath(uid)}/${id}`));
  for (const id of input.studentIds) batch.delete(doc(db, studentDocPath(uid, id)));
  for (const id of input.sessionIds) batch.delete(doc(db, `${sessionsPath(uid)}/${id}`));
  for (const id of input.attendanceIds) batch.delete(doc(db, `${attendancePath(uid)}/${id}`));
  for (const id of input.paymentIds) batch.delete(doc(db, `${paymentsPath(uid)}/${id}`));

  await batch.commit();
}
