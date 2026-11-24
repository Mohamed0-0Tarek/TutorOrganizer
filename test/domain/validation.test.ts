import { describe, expect, it } from "vitest";
import {
  normalizeCount,
  normalizeDateKey,
  normalizeDuration,
  normalizeName,
  normalizePhone,
  normalizePrice,
  normalizeSlot,
  normalizeTime,
} from "@/domain/validation";

describe("normalizeName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeName("  Ahmed   Ali  ")).toEqual({
      ok: true,
      value: "Ahmed Ali",
    });
  });

  it("rejects empty and one-character names", () => {
    expect(normalizeName("   ")).toEqual({ ok: false, error: "nameRequired" });
    expect(normalizeName("أ")).toEqual({ ok: false, error: "nameTooShort" });
  });
});

describe("time, duration, slot", () => {
  it("accepts 24-hour wall-clock times", () => {
    expect(normalizeTime("17:00")).toEqual({ ok: true, value: "17:00" });
    expect(normalizeTime("00:05")).toEqual({ ok: true, value: "00:05" });
  });

  it("rejects impossible times and durations", () => {
    expect(normalizeTime("24:00")).toEqual({ ok: false, error: "invalidTime" });
    expect(normalizeTime("9:00")).toEqual({ ok: false, error: "invalidTime" });
    expect(normalizeDuration(0)).toEqual({ ok: false, error: "invalidDuration" });
    expect(normalizeDuration(181)).toEqual({ ok: false, error: "invalidDuration" });
    expect(normalizeDuration("60")).toEqual({ ok: true, value: 60 });
  });

  it("normalises a slot including its weekday", () => {
    expect(normalizeSlot({ weekday: 6, time: "17:00", durationMin: "60" })).toEqual({
      ok: true,
      value: { weekday: 6, time: "17:00", durationMin: 60 },
    });
    expect(normalizeSlot({ weekday: 7, time: "17:00", durationMin: 60 })).toEqual({
      ok: false,
      error: "invalidDate",
    });
  });
});

describe("money and counters", () => {
  it("accepts non-negative integers only", () => {
    expect(normalizePrice("50")).toEqual({ ok: true, value: 50 });
    expect(normalizePrice(50.5)).toEqual({ ok: false, error: "invalidPrice" });
    expect(normalizePrice(-1)).toEqual({ ok: false, error: "invalidPrice" });
  });

  it("treats an empty counter as zero", () => {
    expect(normalizeCount("")).toEqual({ ok: true, value: 0 });
    expect(normalizeCount("12")).toEqual({ ok: true, value: 12 });
    expect(normalizeCount("1.5")).toEqual({ ok: false, error: "invalidCount" });
  });
});

describe("date and phone", () => {
  it("accepts real Cairo date keys", () => {
    expect(normalizeDateKey("2026-11-24")).toEqual({
      ok: true,
      value: "2026-11-24",
    });
    expect(normalizeDateKey("2026-02-30")).toEqual({
      ok: false,
      error: "invalidDate",
    });
  });

  it("allows no phone, or an international number", () => {
    expect(normalizePhone("")).toEqual({ ok: true, value: undefined });
    expect(normalizePhone("+20 100 123 4567")).toEqual({
      ok: true,
      value: "+20 100 123 4567",
    });
    expect(normalizePhone("123")).toEqual({ ok: false, error: "invalidPhone" });
  });
});
