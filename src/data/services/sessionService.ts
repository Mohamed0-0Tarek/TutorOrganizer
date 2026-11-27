import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getFirebase } from "@/data/firebase/client";
import { sessionDocPath } from "@/data/paths";
import { computeCounters } from "@/domain/counters";
import {
  extraSessionId,
  nextExtraSessionNumber,
} from "@/domain/sessionId";
import type { DateKey } from "@/domain/types";
import {
  appendCounterUpdates,
  type CounterSource,
} from "./counterService";

/**
 * Cancelling a lesson must drop the counters it contributed. With a hydrated
 * source it also persists that change in the same batch as the status.
 */
export async function cancelSession(
  uid: string,
  sessionId: string,
  note?: string,
  source?: CounterSource,
): Promise<void> {
  const { db } = getFirebase();
  const batch = writeBatch(db);

  batch.update(doc(db, sessionDocPath(uid, sessionId)), {
    status: "cancelled",
    ...(note?.trim() ? { note: note.trim() } : {}),
    updatedAt: serverTimestamp(),
  });

  if (source) {
    const sessionsById = new Map(source.sessionsById);
    const session = sessionsById.get(sessionId);
    if (session) sessionsById.set(sessionId, { ...session, status: "cancelled" });
    const counters = computeCounters({ ...source, sessionsById });
    appendCounterUpdates(batch, db, uid, source.students, counters);
  }

  await batch.commit();
}

export async function updateSessionNote(
  uid: string,
  sessionId: string,
  note: string,
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, sessionDocPath(uid, sessionId)), {
    note: note.trim() || null,
    updatedAt: serverTimestamp(),
  });
}

export async function updateSessionTime(
  uid: string,
  sessionId: string,
  time: string,
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, sessionDocPath(uid, sessionId)), {
    time,
    updatedAt: serverTimestamp(),
  });
}

/** Deterministic id + smallest-free number => re-adds never duplicate. */
export async function addExtraSession(
  uid: string,
  input: {
    groupId: string;
    groupName: string;
    dateKey: DateKey;
    time: string;
    existingIds: Iterable<string>;
  },
): Promise<string> {
  const { db } = getFirebase();
  const id = extraSessionId(
    input.groupId,
    input.dateKey,
    nextExtraSessionNumber(input.groupId, input.dateKey, input.existingIds),
  );

  await setDoc(doc(db, sessionDocPath(uid, id)), {
    id,
    groupId: input.groupId,
    groupName: input.groupName,
    dateKey: input.dateKey,
    time: input.time,
    type: "extra",
    status: "scheduled",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

/** Only extra lessons may be deleted; regular ones are cancelled instead. */
export async function deleteExtraSession(
  uid: string,
  sessionId: string,
): Promise<void> {
  const { db } = getFirebase();
  await deleteDoc(doc(db, sessionDocPath(uid, sessionId)));
}
