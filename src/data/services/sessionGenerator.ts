import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { getFirebase } from "@/data/firebase/client";
import { sessionDocPath } from "@/data/paths";
import { todayKey } from "@/domain/dateKey";
import {
  planGeneration,
  type GenerationInput,
} from "@/domain/sessionGenerator";
import type { DateKey } from "@/domain/types";

/** At most one generation batch per tutor at a time (focus + snapshot triggers). */
const running = new Map<string, Promise<number>>();

export interface EnsureInput extends Omit<GenerationInput, "today"> {
  today?: DateKey;
}

export function ensureGenerated(uid: string, state: EnsureInput): Promise<number> {
  const inFlight = running.get(uid);
  if (inFlight) return inFlight;

  const task = run(uid, state).finally(() => running.delete(uid));
  running.set(uid, task);
  return task;
}

async function run(uid: string, state: EnsureInput): Promise<number> {
  const changes = planGeneration({
    groups: state.groups,
    sessions: state.sessions,
    today: state.today ?? todayKey(),
  });
  if (changes.length === 0) return 0;

  const { db } = getFirebase();
  const batch = writeBatch(db);

  for (const change of changes) {
    if (change.kind === "create") {
      batch.set(doc(db, sessionDocPath(uid, change.session.id)), {
        ...change.session,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.update(doc(db, sessionDocPath(uid, change.id)), {
        time: change.time,
        updatedAt: serverTimestamp(),
      });
    }
  }

  await batch.commit();
  return changes.length;
}
