import {
  assertInteger,
  assertNonNegativeInteger,
  expectedCycleAmount,
} from "./money";
import type { Counters, Student, StudentBalance, TutorSettings } from "./types";

export interface BalanceInput {
  counted: number;
  paid: number;
  pricePerSession: number;
  cycleLength: number;
}

/**
 * Balance rules (source of truth):
 *
 *   balance = counted - paid
 *   balance >= L  -> DUE (dueCycles = floor(balance / L))
 *   0 < balance < L -> IN_PROGRESS
 *   balance === 0 -> SETTLED
 *   balance < 0   -> PAID_AHEAD by abs(balance)
 *
 * `cyclePosition` depends only on counted sessions, never on payments.
 */
export function calculateBalance(input: BalanceInput): StudentBalance {
  const { counted, paid, pricePerSession } = input;

  assertNonNegativeInteger(counted, "counted");
  assertNonNegativeInteger(paid, "paid");
  assertNonNegativeInteger(pricePerSession, "pricePerSession");
  assertInteger(input.cycleLength, "cycleLength");
  if (input.cycleLength < 1) {
    throw new RangeError("cycleLength must be >= 1");
  }

  const cycleLength = input.cycleLength;
  const balance = counted - paid;

  const state =
    balance >= cycleLength
      ? "DUE"
      : balance > 0
        ? "IN_PROGRESS"
        : balance === 0
          ? "SETTLED"
          : "PAID_AHEAD";

  const dueCycles =
    balance >= cycleLength ? Math.floor(balance / cycleLength) : 0;

  return {
    counted,
    paid,
    balance,
    cyclePosition:
      counted === 0 ? 0 : ((counted - 1) % cycleLength) + 1,
    state,
    dueCycles,
    amountDue: dueCycles * expectedCycleAmount(pricePerSession, cycleLength),
    paidAheadBy: balance < 0 ? Math.abs(balance) : 0,
  };
}

/** Calculate a student's live balance from derived counters + settings. */
export function computeStudentBalance(
  student: Pick<Student, "pricePerSession">,
  counters: Counters,
  settings: Pick<TutorSettings, "cycleLength">,
): StudentBalance {
  return calculateBalance({
    counted: counters.counted,
    paid: counters.paid,
    pricePerSession: student.pricePerSession,
    cycleLength: settings.cycleLength,
  });
}

export function isDue(balance: Pick<StudentBalance, "state">): boolean {
  return balance.state === "DUE";
}
