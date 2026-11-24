import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getFirebase } from "@/data/firebase/client";
import { groupDocPath, groupsPath } from "@/data/paths";
import type { Slot } from "@/domain/types";

export interface CreateGroupInput {
  name: string;
  subject?: string;
  slots: Slot[];
}

export async function createGroup(
  uid: string,
  input: CreateGroupInput,
): Promise<string> {
  const { db } = getFirebase();
  const ref = await addDoc(collection(db, groupsPath(uid)), {
    name: input.name.trim(),
    ...(input.subject?.trim() ? { subject: input.subject.trim() } : {}),
    slots: input.slots,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateGroup(
  uid: string,
  groupId: string,
  patch: Partial<Pick<CreateGroupInput, "name" | "subject" | "slots">> & {
    active?: boolean;
  },
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, groupDocPath(uid, groupId)), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function setGroupActive(
  uid: string,
  groupId: string,
  active: boolean,
): Promise<void> {
  await updateGroup(uid, groupId, { active });
}
