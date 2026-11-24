import { describe, expect, it } from "vitest";
import {
  assertInteger,
  assertNonNegativeInteger,
  expectedCycleAmount,
  formatCount,
  formatEGP,
  formatMoney,
} from "@/domain/money";

describe("money", () => {
  it("accepts integers and rejects floats", () => {
    expect(assertInteger(4)).toBe(4);
    expect(() => assertInteger(4.2)).toThrow(RangeError);
    expect(() => assertNonNegativeInteger(-1)).toThrow(RangeError);
    expect(assertNonNegativeInteger(0)).toBe(0);
  });

  it("computes the expected cycle amount", () => {
    expect(expectedCycleAmount(50, 4)).toBe(200);
    expect(expectedCycleAmount(40, 5)).toBe(200);
    expect(expectedCycleAmount(0, 4)).toBe(0);
    expect(() => expectedCycleAmount(50, 0)).toThrow(RangeError);
  });

  it("formats money with tabular-friendly Latin digits", () => {
    expect(formatEGP(200)).toBe("200 ج.م");
    expect(formatMoney(1234, "ج.م")).toBe("1,234 ج.م");
    expect(formatCount(1234)).toBe("1,234");
    expect(() => formatEGP(200.5)).toThrow(RangeError);
  });
});
