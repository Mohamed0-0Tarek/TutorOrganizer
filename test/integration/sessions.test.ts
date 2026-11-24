import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  type Firestore,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { getFirebase } from "@/data/firebase/client";
import { groupsPath, sessionDocPath, sessionsPath } from "@/data/paths";
import { mapGroup, mapSession } from "@/data/mappers";
import { createGroup, updateGroup } from "@/data/services/groupService";
import { ensureGenerated } from "@/data/services/sessionGenerator";
import {
  addExtraSession,
  cancelSession,
} from "@/data/services/sessionService";
import { addDaysKey, todayKey, weekdayOfKey } from "@/domain/dateKey";
import { extraSessionId, regularSessionId } from "@/domain/sessionId";
import type { Group, Session, Weekday } from "@/domain/types";

describe("session generation (Firestore emulator)", () => {
  let testEnv: RulesTestEnvironment;
  let db: Firestore;
  let uid = "";
  let groupId = "";
  let weekday: Weekday = 0;
  let today = "";
  let todaySessionId = "";

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "demo-tutor-manager",
      firestore: {
        rules: readFileSync("firestore.rules", "utf8"),
        host: "127.0.0.1",
        port: 8080,
      },
    });
    await testEnv.clearFirestore();

    const firebase = getFirebase();
    db = firebase.db;
    const credentials = await createUserWithEmailAndPassword(
      firebase.auth,
      `sessions-${Date.now()}@example.com`,
      "password123",
    );
    uid = credentials.user.uid;
    today = todayKey();
    weekday = weekdayOfKey(today);
  }, 30_000);

  afterAll(async () => {
    await signOut(getFirebase().auth);
    await testEnv.cleanup();
  });

  async function readGroups(): Promise<Group[]> {
    const snapshot = await getDocs(collection(db, groupsPath(uid)));
    return snapshot.docs.map((item) => mapGroup(item.id, item.data()));
  }

  async function readSessions(): Promise<Session[]> {
    const snapshot = await getDocs(collection(db, sessionsPath(uid)));
    return snapshot.docs.map((item) => mapSession(item.id, item.data()));
  }

  it("generates the horizon once and is idempotent on a second run", async () => {
    groupId = await createGroup(uid, {
      name: "رياضيات",
      slots: [{ weekday, time: "17:00", durationMin: 60 }],
    });

    const firstWrites = await ensureGenerated(uid, {
      groups: await readGroups(),
      sessions: await readSessions(),
      today,
    });
    expect(firstWrites).toBeGreaterThan(1);

    const sessions = await readSessions();
    todaySessionId = regularSessionId(groupId, today);
    expect(sessions.some((session) => session.id === todaySessionId)).toBe(true);
    expect(sessions.every((session) => session.status === "scheduled")).toBe(true);

    const secondWrites = await ensureGenerated(uid, {
      groups: await readGroups(),
      sessions,
      today,
    });
    expect(secondWrites).toBe(0);
    expect((await readSessions()).length).toBe(sessions.length);
  }, 20_000);

  it("never resurrects a cancelled lesson or duplicates extras", async () => {
    await cancelSession(uid, todaySessionId, "اختبار");

    const sessions = await readSessions();
    await addExtraSession(uid, {
      groupId,
      groupName: "رياضيات",
      dateKey: today,
      time: "19:00",
      existingIds: sessions.map((session) => session.id),
    });
    await addExtraSession(uid, {
      groupId,
      groupName: "رياضيات",
      dateKey: today,
      time: "20:00",
      existingIds: (await readSessions()).map((session) => session.id),
    });

    const withExtras = await readSessions();
    expect(withExtras.some((session) => session.id === extraSessionId(groupId, today, 2))).toBe(true);
    expect(withExtras.some((session) => session.id === extraSessionId(groupId, today, 3))).toBe(true);

    expect(
      await ensureGenerated(uid, {
        groups: await readGroups(),
        sessions: withExtras,
        today,
      }),
    ).toBe(0);

    const after = await readSessions();
    expect((await getDoc(doc(db, sessionDocPath(uid, todaySessionId)))).data()?.status).toBe(
      "cancelled",
    );
    expect(after.filter((session) => session.type === "extra").length).toBe(2);
  }, 20_000);

  it("updates a future scheduled lesson when the slot time changes", async () => {
    const futureKey = addDaysKey(today, 7);
    await updateGroup(uid, groupId, {
      slots: [{ weekday, time: "18:30", durationMin: 60 }],
    });

    const writes = await ensureGenerated(uid, {
      groups: await readGroups(),
      sessions: await readSessions(),
      today,
    });
    expect(writes).toBeGreaterThan(0);

    const future = await getDoc(
      doc(db, sessionDocPath(uid, regularSessionId(groupId, futureKey))),
    );
    expect(future.data()?.time).toBe("18:30");

    // Today's cancelled lesson keeps its original time and status.
    const cancelled = await getDoc(
      doc(db, sessionDocPath(uid, todaySessionId)),
    );
    expect(cancelled.data()).toMatchObject({ status: "cancelled", time: "17:00" });
  }, 20_000);
});
