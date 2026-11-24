import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getFirebase } from "@/data/firebase/client";
import { userPath } from "@/data/paths";
import { DEFAULT_SETTINGS, type TutorSettings } from "@/domain/types";

/** Creates the settings document only when it does not exist yet. */
export async function createDefaults(uid: string): Promise<boolean> {
  const { db } = getFirebase();
  const ref = doc(db, userPath(uid));
  const snapshot = await getDoc(ref);
  const data = snapshot.data() as { settings?: unknown } | undefined;
  if (data?.settings) return false;

  await setDoc(
    ref,
    {
      settings: DEFAULT_SETTINGS,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return true;
}

export async function saveSettings(
  uid: string,
  settings: TutorSettings,
): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, userPath(uid)), {
    settings,
    updatedAt: serverTimestamp(),
  });
}
