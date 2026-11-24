import { describe, expect, it } from "vitest";
import {
  calculateBalance,
  computeStudentBalance,
} from "@/domain/balanceCalculator";
import type { Payment } from "@/domain/types";

const base = { pricePerSession: 50, cycleLength: 4 };

describe("calculateBalance", () => {
  it("marks a student due after 4 counted sessions", () => {
    const balance = calculateBalance({ ...base, counted: 4, paid: 0 });

    expect(balance.state).toBe("DUE");
    expect(balance.balance).toBe(4);
    expect(balance.dueCycles).toBe(1);
    expect(balance.amountDue).toBe(200);
    expect(balance.cyclePosition).toBe(4);
  });

  it("treats an early payment as paid ahead and never as unpaid at session 4", () => {
    const atThree = calculateBalance({ ...base, counted: 3, paid: 4 });
    expect(atThree.state).toBe("PAID_AHEAD");
    expect(atThree.balance).toBe(-1);
    expect(atThree.paidAheadBy).toBe(1);
    expect(atThree.cyclePosition).toBe(3);
    expect(atThree.amountDue).toBe(0);

    const atFour = calculateBalance({ ...base, counted: 4, paid: 4 });
    expect(atFour.state).toBe("SETTLED");
    expect(atFour.balance).toBe(0);
    expect(atFour.cyclePosition).toBe(4);

    const atEight = calculateBalance({ ...base, counted: 8, paid: 4 });
    expect(atEight.state).toBe("DUE");
    expect(atEight.dueCycles).toBe(1);
    expect(atEight.amountDue).toBe(200);
  });

  it("keeps an unpaid student at one cycle when six sessions are owed", () => {
    const balance = calculateBalance({ ...base, counted: 6, paid: 0 });

    expect(balance.balance).toBe(6);
    expect(balance.dueCycles).toBe(1);
    expect(balance.amountDue).toBe(200);
    expect(balance.cyclePosition).toBe(2);

    const afterPayment = calculateBalance({ ...base, counted: 6, paid: 4 });
    expect(afterPayment.state).toBe("IN_PROGRESS");
    expect(afterPayment.balance).toBe(2);
    expect(afterPayment.cyclePosition).toBe(2);
    expect(afterPayment.amountDue).toBe(0);
  });

  it("uses the discounted per-student price", () => {
    const balance = calculateBalance({
      counted: 4,
      paid: 0,
      pricePerSession: 40,
      cycleLength: 4,
    });

    expect(balance.amountDue).toBe(160);
  });

  it("respects a cycle length of 5", () => {
    const five = calculateBalance({
      counted: 5,
      paid: 0,
      pricePerSession: 50,
      cycleLength: 5,
    });
    expect(five.cyclePosition).toBe(5);
    expect(five.state).toBe("DUE");
    expect(five.amountDue).toBe(250);

    const six = calculateBalance({
      counted: 6,
      paid: 0,
      pricePerSession: 50,
      cycleLength: 5,
    });
    expect(six.cyclePosition).toBe(1);
    expect(six.dueCycles).toBe(1);
    expect(six.amountDue).toBe(250);
  });

  it("re-prices new dues without touching past payments", () => {
    const oldPayment: Payment = {
      id: "p1",
      studentId: "s1",
      dateKey: "2026-01-05",
      amount: 200,
      sessionsCovered: 4,
    };
    const before = calculateBalance({
      counted: 4,
      paid: oldPayment.sessionsCovered,
      pricePerSession: 50,
      cycleLength: 4,
    });
    const afterPriceChange = calculateBalance({
      counted: 8,
      paid: oldPayment.sessionsCovered,
      pricePerSession: 60,
      cycleLength: 4,
    });

    expect(before.state).toBe("SETTLED");
    expect(afterPriceChange.amountDue).toBe(240);
    expect(oldPayment.amount).toBe(200);
  });

  it("counts each full cycle, not just one", () => {
    const balance = calculateBalance({ ...base, counted: 9, paid: 0 });
    expect(balance.dueCycles).toBe(2);
    expect(balance.amountDue).toBe(400);
  });

  it("returns position 0 for a student with no counted sessions", () => {
    const balance = calculateBalance({ ...base, counted: 0, paid: 0 });
    expect(balance.cyclePosition).toBe(0);
    expect(balance.state).toBe("SETTLED");
  });

  it("rejects invalid input", () => {
    expect(() =>
      calculateBalance({ ...base, counted: 1.5, paid: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      calculateBalance({ ...base, counted: -1, paid: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      calculateBalance({ ...base, counted: 1, paid: 0, cycleLength: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      calculateBalance({ ...base, counted: 1, paid: 0, pricePerSession: 10.5 }),
    ).toThrow(RangeError);
  });

  it("computes a student balance from counters + settings", () => {
    const balance = computeStudentBalance(
      { pricePerSession: 50 },
      { counted: 3, paid: 4 },
      { cycleLength: 4 },
    );
    expect(balance.state).toBe("PAID_AHEAD");
    expect(balance.paidAheadBy).toBe(1);
  });
});
