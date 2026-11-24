import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { getFirebase } from "@/data/firebase/client";
import {
  paymentDocPath,
  paymentsPath,
  studentDocPath,
} from "@/data/paths";
import { computeCounters } from "@/domain/counters";
import type { Payment } from "@/domain/types";
import type { CounterSource } from "./counterService";
import { definedFields } from "./cleanPatch";

export interface RecordPaymentInput {
  studentId: string;
  dateKey: string;
  amount: number;
  sessionsCovered: number;
  note?: string;
}

function validate(input: RecordPaymentInput): void {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new RangeError("amount must be a positive whole number");
  }
  if (!Number.isInteger(input.sessionsCovered) || input.sessionsCovered < 1) {
    throw new RangeError("sessionsCovered must be a whole number >= 1");
  }
}

function prospectivePayments(
  source: CounterSource,
  change: { kind: "add" | "update" | "remove"; id: string; payment?: Payment },
): Payment[] {
  const existing = source.payments.filter((payment) => payment.id !== change.id);
  if (change.kind === "remove" || !change.payment) return existing;
  return [...existing, change.payment];
}

function persist(
  batch: ReturnType<typeof writeBatch>,
  db: Firestore,
  uid: string,
  source: CounterSource,
  payments: readonly Payment[],
): void {
  const counters = computeCounters({ ...source, payments });
  for (const student of source.students) {
    const next = counters.get(student.id);
    if (!next) continue;
    batch.update(doc(db, studentDocPath(uid, student.id)), {
      sessionsCounted: next.counted,
      sessionsPaid: next.paid,
      updatedAt: serverTimestamp(),
    });
  }
}

/** Payment doc + counter persist in one offline-safe batch. */
export async function recordPayment(
  uid: string,
  input: RecordPaymentInput,
  source: CounterSource,
): Promise<string> {
  validate(input);
  const { db } = getFirebase();
  const ref = doc(collection(db, paymentsPath(uid)));
  const payment: Payment = {
    id: ref.id,
    studentId: input.studentId,
    dateKey: input.dateKey,
    amount: input.amount,
    sessionsCovered: input.sessionsCovered,
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
  };

  const batch = writeBatch(db);
  batch.set(ref, { ...payment, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  persist(batch, db, uid, source, prospectivePayments(source, { kind: "add", id: ref.id, payment }));
  await batch.commit();
  return ref.id;
}

export async function updatePayment(
  uid: string,
  paymentId: string,
  patch: Partial<RecordPaymentInput>,
  source: CounterSource,
): Promise<void> {
  const current = source.payments.find((payment) => payment.id === paymentId);
  if (!current) throw new Error("PAYMENT_NOT_FOUND");
  const next: Payment = { ...current, ...patch };
  validate({
    studentId: next.studentId,
    dateKey: next.dateKey,
    amount: next.amount,
    sessionsCovered: next.sessionsCovered,
  });

  const { db } = getFirebase();
  const batch = writeBatch(db);
  batch.update(doc(db, paymentDocPath(uid, paymentId)), {
    ...definedFields(patch as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });
  persist(batch, db, uid, source, prospectivePayments(source, { kind: "update", id: paymentId, payment: next }));
  await batch.commit();
}

export async function removePayment(
  uid: string,
  paymentId: string,
  source: CounterSource,
): Promise<void> {
  const { db } = getFirebase();
  const batch = writeBatch(db);
  batch.delete(doc(db, paymentDocPath(uid, paymentId)));
  persist(batch, db, uid, source, prospectivePayments(source, { kind: "remove", id: paymentId }));
  await batch.commit();
}
