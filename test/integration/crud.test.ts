import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
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
import {
  enrollStudent,
  moveStudentAndReconcile,
  setStudentActiveAndReconcile,
} from "@/data/services/enrollmentService";
import type { CounterSource } from "@/data/services/counterService";
import { attendanceId, regularSessionId } from "@/domain/sessionId";
import { DEFAULT_SETTINGS } from "@/domain/types";

const DATE_KEY = "2026-11-24";

describe("groups + students CRUD (Firestore emulator)", () => {
  let testEnv: RulesTestEnvironment;
  let db: Firestore;
  let uid = "";
  let groupId = "";
  let secondGroupId = "";
  let studentId = "";

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
      `tutor-${Date.now()}@example.com`,
      "password123",
    );
    uid = credentials.user.uid;
  }, 30_000);

  afterAll(async () => {
    const firebase = getFirebase();
    await signOut(firebase.auth);
    await testEnv.cleanup();
  });

  async function readSource(): Promise<CounterSource> {
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
      settings: DEFAULT_SETTINGS,
    };
  }

  it("creates a group and a student with carried-over counters", async () => {
    groupId = await createGroup(uid, {
      name: "رياضيات",
      slots: [{ weekday: 6, time: "17:00", durationMin: 60 }],
    });
    studentId = await enrollStudent(
      uid,
      {
        name: "أحمد",
        groupId,
        pricePerSession: 50,
        startedAtKey: "2026-01-01",
        initialCounted: 3,
        initialPaid: 2,
      },
      {
        students: [],
        sessionsById: new Map(),
        attendance: [],
        payments: [],
        settings: DEFAULT_SETTINGS,
      },
    );

    const snapshot = await getDoc(doc(db, studentDocPath(uid, studentId)));
    expect(snapshot.exists()).toBe(true);
    expect(snapshot.data()).toMatchObject({
      name: "أحمد",
      groupId,
      pricePerSession: 50,
      initialCounted: 3,
      initialPaid: 2,
      sessionsCounted: 3,
      sessionsPaid: 2,
    });
  }, 20_000);

  it("moves a student without rewriting attendance group history", async () => {
    secondGroupId = await createGroup(uid, { name: "إنجليزي", slots: [] });

    const sessionId = regularSessionId(groupId, DATE_KEY);
    await setDoc(doc(db, sessionDocPath(uid, sessionId)), {
      groupId,
      groupName: "رياضيات",
      dateKey: DATE_KEY,
      time: "17:00",
      type: "regular",
      status: "completed",
    });
    await setDoc(
      doc(db, attendanceDocPath(uid, attendanceId(sessionId, studentId))),
      {
        sessionId,
        studentId,
        groupId,
        dateKey: DATE_KEY,
        status: "present",
      },
    );

    await moveStudentAndReconcile(
      uid,
      studentId,
      secondGroupId,
      await readSource(),
    );

    const student = await getDoc(doc(db, studentDocPath(uid, studentId)));
    expect(student.data()?.groupId).toBe(secondGroupId);
    // 3 carried over + 1 completed lesson.
    expect(student.data()?.sessionsCounted).toBe(4);
    expect(student.data()?.sessionsPaid).toBe(2);

    const attendance = await getDoc(
      doc(db, attendanceDocPath(uid, attendanceId(sessionId, studentId))),
    );
    expect(attendance.data()?.groupId).toBe(groupId);
  }, 20_000);

  it("archives a student but keeps the document and counters", async () => {
    await setStudentActiveAndReconcile(
      uid,
      studentId,
      false,
      await readSource(),
    );

    const snapshot = await getDoc(doc(db, studentDocPath(uid, studentId)));
    expect(snapshot.exists()).toBe(true);
    expect(snapshot.data()).toMatchObject({
      active: false,
      sessionsCounted: 4,
      sessionsPaid: 2,
    });
  }, 20_000);
});
