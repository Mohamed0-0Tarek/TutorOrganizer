import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { collection, doc, getDoc, getDocs, type Firestore } from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { getFirebase } from "@/data/firebase/client";
import {
  attendancePath,
  paymentsPath,
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
import {
  recordPayment,
  removePayment,
  updatePayment,
} from "@/data/services/paymentService";
import { computeStudentBalance } from "@/domain/balanceCalculator";
import { todayKey } from "@/domain/dateKey";
import { DEFAULT_SETTINGS, type TutorSettings } from "@/domain/types";
import type { CounterSource } from "@/data/services/counterService";

describe("payments (Firestore emulator)", () => {
  let testEnv: RulesTestEnvironment;
  let db: Firestore;
  let uid = "";
  let studentId = "";
  let firstPaymentId = "";

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
      `payments-${Date.now()}@example.com`,
      "password123",
    );
    uid = credentials.user.uid;
    const groupId = await createGroup(uid, { name: "رياضيات", slots: [] });
    studentId = await createStudent(uid, {
      name: "طالب الدفع",
      groupId,
      pricePerSession: 50,
      startedAtKey: todayKey(),
      initialCounted: 6,
      initialPaid: 0,
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
      attendance: attendanceSnap.docs.map((item) => mapAttendance(item.id, item.data())),
      payments: paymentSnap.docs.map((item) => mapPayment(item.id, item.data())),
      settings,
    };
  }

  async function cached() {
    const snapshot = await getDoc(doc(db, studentDocPath(uid, studentId)));
    return {
      counted: snapshot.data()?.sessionsCounted as number,
      paid: snapshot.data()?.sessionsPaid as number,
    };
  }

  it("records a discounted payment and persists the new paid counter", async () => {
    firstPaymentId = await recordPayment(
      uid,
      {
        studentId,
        dateKey: todayKey(),
        amount: 160,
        sessionsCovered: 4,
        note: "خصم",
      },
      await readSource(),
    );

    const payment = await getDoc(doc(db, `${paymentsPath(uid)}/${firstPaymentId}`));
    expect(payment.data()).toMatchObject({ amount: 160, sessionsCovered: 4, note: "خصم" });
    expect(await cached()).toEqual({ counted: 6, paid: 4 });

    const student = (await readSource()).students[0];
    expect(computeStudentBalance(student, await cached(), DEFAULT_SETTINGS)).toMatchObject({
      state: "IN_PROGRESS",
      balance: 2,
    });
  }, 20_000);

  it("editing the amount leaves counters and balance untouched", async () => {
    await updatePayment(
      uid,
      firstPaymentId,
      { amount: 200 },
      await readSource(),
    );

    expect((await getDoc(doc(db, `${paymentsPath(uid)}/${firstPaymentId}`))).data()?.amount).toBe(200);
    expect(await cached()).toEqual({ counted: 6, paid: 4 });
  }, 20_000);

  it("a two-cycle payment makes the student paid ahead; deleting restores the balance", async () => {
    const secondId = await recordPayment(
      uid,
      { studentId, dateKey: todayKey(), amount: 400, sessionsCovered: 8 },
      await readSource(),
    );
    expect(await cached()).toEqual({ counted: 6, paid: 12 });

    const student = (await readSource()).students[0];
    expect(computeStudentBalance(student, await cached(), DEFAULT_SETTINGS)).toMatchObject({
      state: "PAID_AHEAD",
      paidAheadBy: 6,
    });

    await removePayment(uid, secondId, await readSource());
    expect(await cached()).toEqual({ counted: 6, paid: 4 });
    const after = (await readSource()).students[0];
    expect(computeStudentBalance(after, await cached(), DEFAULT_SETTINGS).balance).toBe(2);
  }, 20_000);
});
