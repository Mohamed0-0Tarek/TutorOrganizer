import { describe, expect, it } from "vitest";
import { calculateBalance } from "@/domain/balanceCalculator";
import { expectedCycleAmount, formatMoney } from "@/domain/money";
import { DEFAULT_SETTINGS } from "@/domain/types";

const L = 4;
const PRICE = 50;
const balance = (counted: number, paid: number) =>
  calculateBalance({ counted, paid, pricePerSession: PRICE, cycleLength: L });

/** §7.1 money scenarios, reproduced through the pure calculator. */
describe("money scenarios", () => {
  it("early payer: paid ahead at session 3, settled at session 4", () => {
    const early = balance(3, 4);
    expect(early.state).toBe("PAID_AHEAD");
    expect(early.cyclePosition).toBe(3);
    expect(early.paidAheadBy).toBe(1);

    const atFour = balance(4, 4);
    expect(atFour.state).toBe("SETTLED");
    expect(atFour.balance).toBe(0);
  });

  it("after eight sessions with one payment, exactly one cycle is due", () => {
    const result = balance(8, 4);
    expect(result.state).toBe("DUE");
    expect(result.dueCycles).toBe(1);
    expect(result.amountDue).toBe(200);
    expect(result.cyclePosition).toBe(4);
  });

  it("unpaid six sessions: one cycle due, position wraps to 2", () => {
    const result = balance(6, 0);
    expect(result.state).toBe("DUE");
    expect(result.dueCycles).toBe(1);
    expect(result.amountDue).toBe(L * PRICE);
    expect(result.cyclePosition).toBe(2);
  });

  it("a discount is just a smaller payment amount", () => {
    const full = expectedCycleAmount(PRICE, L);
    const discounted = full - 40;
    expect(discounted).toBe(160);
    expect(formatMoney(discounted, DEFAULT_SETTINGS.currencyLabel)).toBe("160 ج.م");
    // Counters do not change: the student is still two sessions from due.
    expect(balance(6, 4).balance).toBe(2);
  });

  it("paying for two cycles settles both, then the next session is in progress", () => {
    const settled = balance(8, 8);
    expect(settled.state).toBe("SETTLED");
    expect(balance(9, 8).state).toBe("IN_PROGRESS");
  });
});
