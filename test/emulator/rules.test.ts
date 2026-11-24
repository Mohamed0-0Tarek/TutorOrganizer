import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-tutor-manager",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("firestore rules", () => {
  it("lets an owner read and write their own settings document", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(doc(db, "users/alice"), { settings: { cycleLength: 4 } }),
    );
    await assertSucceeds(getDoc(doc(db, "users/alice")));
  });

  it("lets an owner write students, sessions, attendance and payments", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(doc(db, "users/alice/students/s1"), { name: "Ahmed" }),
    );
    await assertSucceeds(
      setDoc(doc(db, "users/alice/sessions/g1_20261124"), { status: "scheduled" }),
    );
    await assertSucceeds(
      setDoc(doc(db, "users/alice/attendance/g1_20261124_s1"), {
        status: "present",
      }),
    );
    await assertSucceeds(
      setDoc(doc(db, "users/alice/payments/p1"), { amount: 200 }),
    );
  });

  it("denies another signed-in user", async () => {
    const db = testEnv.authenticatedContext("mallory").firestore();
    await assertFails(getDoc(doc(db, "users/alice")));
    await assertFails(getDoc(doc(db, "users/alice/students/s1")));
    await assertFails(
      setDoc(doc(db, "users/alice/students/s2"), { name: "Mallory" }),
    );
  });

  it("denies anonymous access", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "users/alice")));
    await assertFails(
      setDoc(doc(db, "users/anonymous/students/s1"), { name: "x" }),
    );
  });
});
