import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { collection, doc, getDoc, getDocs, setDoc, type Firestore } from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { getFirebase } from "@/data/firebase/client";
import {
  attendanceDocPath,
  attendancePath,
  paymentsPath,
  sessionDocPath,
  sessionsPath,
  studentDocPath,
  studentsPath,
} from "@/data/paths";
import {
  mapAttendance,
  mapPayment,
  mapSession,
  mapStudent,
} from "@/data/mappers";
import { createGroup } from "@/data/services/groupService";
import { createStudent } from "@/data/services/studentService";
import { addExtraSession, cancelSession } from "@/data/services/sessionService";
import {
  saveLesson,
  setAttendanceStatus,
} from "@/data/services/attendanceService";
import {
  reconcileCounters,
  type CounterSource,
} from "@/data/services/counterService";
import { corruptCounters } from "@/data/services/devSeedService";
import { todayKey, weekdayOfKey } from "@/domain/dateKey";
import { attendanceId, regularSessionId } from "@/domain/sessionId";
import { DEFAULT_SETTINGS, type TutorSettings } from "@/domain/types";

describe("attendance + counters (Firestore emulator)", () => {
  let testEnv: RulesTestEnvironment;
  let db: Firestore;
  let uid = "";
  let groupId = "";
  const today = todayKey();

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
      `attendance-${Date.now()}@example.com`,
      "password123",
    );
    uid = credentials.user.uid;
    groupId = await createGroup(uid, {
      name: "رياضيات",
      slots: [{ weekday: weekdayOfKey(today), time: "17:00", durationMin: 60 }],
    });
  }, 30_000);

  afterAll(async () => {
    await signOut(getFirebase().auth);
    await testEnv.cleanup();
  });

  async function readSource(settings: TutorSettings = DEFAULT_SETTINGS): Promise<CounterSource> {
    const [studentSnap, sessionSnap, attendanceSnap, paymentSnap] =
      await Promise.all([
        getDocs(collection(db, studentsPath(uid))),
        getDocs(collection(db, sessionsPath(uid))),
        getDocs(collection(db, attendancePath(uid))),
        getDocs(collection(db, paymentsPath(uid))),
      ]);
    return {
      students: studentSnap.docs.map((item) => mapStudent(item.id, item.data())),
      sessionsById: new Map(
        sessionSnap.docs.map((item) => {
          const session = mapSession(item.id, item.data());
          return [session.id, session];
        }),
      ),
      attendance: attendanceSnap.docs.map((item) =>
        mapAttendance(item.id, item.data()),
      ),
      payments: paymentSnap.docs.map((item) => mapPayment(item.id, item.data())),
      settings,
    };
  }

  async function newStudent(name: string, initialCounted = 0): Promise<string> {
    return createStudent(uid, {
      name,
      groupId,
      pricePerSession: 50,
      startedAtKey: today,
      initialCounted,
      initialPaid: 0,
    });
  }

  async function newExtra(time: string): Promise<string> {
    return addExtraSession(uid, {
      groupId,
      groupName: "رياضيات",
      dateKey: today,
      time,
      existingIds: (await readSource()).sessionsById.keys(),
    });
  }

  it("saves all attendance, completion and counters in one batch", async () => {
    const a = await newStudent("حاضر");
    const b = await newStudent("غايب");
    const sessionId = regularSessionId(groupId, today);
    await setDoc(doc(db, sessionDocPath(uid, sessionId)), {
      id: sessionId,
      groupId,
      groupName: "رياضيات",
      dateKey: today,
      time: "17:00",
      type: "regular",
      status: "scheduled",
    });
    const result = await saveLesson(uid, {
      sessionId,
      absentIds: [b],
      note: "حصة اختبار",
      source: await readSource(),
    });

    expect(result).toEqual({ countedStudents: 2, newlyDue: [] });
    expect((await getDoc(doc(db, sessionDocPath(uid, sessionId)))).data()).toMatchObject({
      status: "completed",
      note: "حصة اختبار",
    });
    expect(
      (await getDoc(doc(db, attendanceDocPath(uid, attendanceId(sessionId, a))))).data()?.status,
    ).toBe("present");
    expect(
      (await getDoc(doc(db, attendanceDocPath(uid, attendanceId(sessionId, b))))).data()?.status,
    ).toBe("absent");
    for (const id of [a, b]) {
      // One completed lesson; absence counts by default.
      expect((await getDoc(doc(db, studentDocPath(uid, id)))).data()?.sessionsCounted).toBe(1);
    }
  }, 20_000);

  it("reports students who became due in this lesson", async () => {
    const almostDue = await newStudent("قرب يتحق", 3);
    const sessionId = await newExtra("19:00");

    const result = await saveLesson(uid, {
      sessionId,
      absentIds: [],
      source: await readSource(),
    });

    expect(result.newlyDue).toContain(almostDue);
    expect((await getDoc(doc(db, studentDocPath(uid, almostDue)))).data()?.sessionsCounted).toBe(4);
  }, 20_000);

  it("recomputes on status edit and drops counters on cancellation", async () => {
    const present = await newStudent("تعديل حاضر");
    const absentStudent = await newStudent("تعديل غايب");
    const sessionId = await newExtra("20:00");
    const noAbsenceCounts = {
      ...DEFAULT_SETTINGS,
      absenceCounts: false,
    };

    await saveLesson(uid, {
      sessionId,
      absentIds: [absentStudent],
      source: await readSource(noAbsenceCounts),
    });
    expect(
      (await getDoc(doc(db, studentDocPath(uid, present)))).data()?.sessionsCounted,
    ).toBe(1);
    expect(
      (await getDoc(doc(db, studentDocPath(uid, absentStudent)))).data()?.sessionsCounted,
    ).toBe(0);

    await setAttendanceStatus(uid, {
      attendanceId: attendanceId(sessionId, absentStudent),
      sessionId,
      studentId: absentStudent,
      groupId,
      dateKey: today,
      status: "present",
      source: await readSource(noAbsenceCounts),
    });
    expect(
      (await getDoc(doc(db, studentDocPath(uid, absentStudent)))).data()?.sessionsCounted,
    ).toBe(1);

    await cancelSession(uid, sessionId, "ملغية", await readSource(noAbsenceCounts));
    expect((await getDoc(doc(db, sessionDocPath(uid, sessionId)))).data()?.status).toBe(
      "cancelled",
    );
    for (const id of [present, absentStudent]) {
      expect((await getDoc(doc(db, studentDocPath(uid, id)))).data()?.sessionsCounted).toBe(0);
    }
  }, 20_000);

  it("heals a deliberately corrupted cached counter", async () => {
    const studentId = await newStudent("تصحيح عداد");
    const sessionId = await newExtra("21:00");
    await saveLesson(uid, {
      sessionId,
      absentIds: [],
      source: await readSource(),
    });
    await corruptCounters(uid, studentId);
    expect(
      (await getDoc(doc(db, studentDocPath(uid, studentId)))).data()?.sessionsCounted,
    ).toBe(999);

    const changed = await reconcileCounters(uid, await readSource());
    expect(changed).toBeGreaterThan(0);
    expect(
      (await getDoc(doc(db, studentDocPath(uid, studentId)))).data()?.sessionsCounted,
    ).toBe(1);
  }, 20_000);
});
