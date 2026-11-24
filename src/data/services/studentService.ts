import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { definedFields } from "./cleanPatch";
import { getFirebase } from "@/data/firebase/client";
import { studentDocPath, studentsPath } from "@/data/paths";
import { todayKey } from "@/domain/dateKey";
import type { DateKey } from "@/domain/types";

export interface CreateStudentInput {
  name: string;
  groupId: string;
  pricePerSession: number;
  startedAtKey?: DateKey;
  phone?: string;
  note?: string;
  initialCounted?: number;
  initialPaid?: number;
}

export async function createStudent(
  uid: string,
  input: CreateStudentInput,
): Promise<string> {
  const { db } = getFirebase();
  const ref = await addDoc(collection(db, studentsPath(uid)), {
    name: input.name.trim(),
    groupId: input.groupId,
    pricePerSession: input.pricePerSession,
    startedAtKey: input.startedAtKey ?? todayKey(),
    active: true,
    ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    initialCounted: input.initialCounted ?? 0,
    initialPaid: input.initialPaid ?? 0,
    sessionsCounted: 0,
    sessionsPaid: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateStudent(
  uid: string,
  studentId: string,
  patch: Partial<CreateStudentInput> & { active?: boolean },
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, studentDocPath(uid, studentId)), {
    ...definedFields(patch as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });
}

export async function moveStudentToGroup(
  uid: string,
  studentId: string,
  groupId: string,
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, studentDocPath(uid, studentId)), {
    groupId,
    updatedAt: serverTimestamp(),
  });
}

export async function setStudentActive(
  uid: string,
  studentId: string,
  active: boolean,
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, studentDocPath(uid, studentId)), {
    active,
    updatedAt: serverTimestamp(),
  });
}
