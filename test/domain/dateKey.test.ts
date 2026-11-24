import { describe, expect, it } from "vitest";
import {
  addDaysKey,
  compareDateKeys,
  dateKeyFromParts,
  dateKeyOf,
  daysBetweenKeys,
  formatArabicDate,
  formatTime,
  isKeyInRange,
  isValidDateKey,
  nextDateKeys,
  parseDateKey,
  todayKey,
  weekdayOfKey,
} from "@/domain/dateKey";

describe("dateKey", () => {
  it("uses the Cairo day at the UTC midnight boundary", () => {
    // 21:59 UTC = 23:59 in Cairo (UTC+2 in November) -> same day.
    expect(dateKeyOf(new Date("2026-11-24T21:59:00Z"))).toBe("2026-11-24");
    // 22:30 UTC = 00:30 next day in Cairo.
    expect(dateKeyOf(new Date("2026-11-24T22:30:00Z"))).toBe("2026-11-25");
  });

  it("follows Cairo summer time (UTC+3)", () => {
    expect(dateKeyOf(new Date("2026-07-01T21:30:00Z"))).toBe("2026-07-02");
  });

  it("derives the weekday from the key, not from local time", () => {
    expect(weekdayOfKey("2026-11-24")).toBe(2); // Tuesday
    expect(weekdayOfKey("2026-11-28")).toBe(6); // Saturday
  });

  it("adds days across month and leap-year boundaries", () => {
    expect(addDaysKey("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDaysKey("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDaysKey("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysKey("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("keeps a stable 14-day generation window", () => {
    const keys = nextDateKeys("2026-11-24", 14);
    expect(keys).toHaveLength(14);
    expect(keys[0]).toBe("2026-11-24");
    expect(keys[13]).toBe("2026-12-07");
  });

  it("validates keys", () => {
    expect(isValidDateKey("2026-02-28")).toBe(true);
    expect(isValidDateKey("2026-02-30")).toBe(false);
    expect(isValidDateKey("2026-13-01")).toBe(false);
    expect(isValidDateKey("2026-1-01")).toBe(false);
    expect(isValidDateKey("24-11-2026")).toBe(false);
    expect(() => parseDateKey("2026-02-30")).toThrow(RangeError);
  });

  it("builds valid keys from parts", () => {
    expect(dateKeyFromParts(2026, 3, 7)).toBe("2026-03-07");
    expect(() => dateKeyFromParts(2026, 2, 30)).toThrow(RangeError);
  });

  it("compares and ranges keys", () => {
    expect(compareDateKeys("2026-01-01", "2026-01-02")).toBe(-1);
    expect(compareDateKeys("2026-01-02", "2026-01-02")).toBe(0);
    expect(isKeyInRange("2026-01-15", "2026-01-01", "2026-01-31")).toBe(true);
    expect(isKeyInRange("2026-02-01", "2026-01-01", "2026-01-31")).toBe(false);
    expect(daysBetweenKeys("2026-01-01", "2026-01-31")).toBe(30);
  });

  it("formats Arabic dates with Latin digits", () => {
    const label = formatArabicDate("2026-11-24", { day: "numeric" });
    expect(label).toContain("24");
    expect(todayKey(new Date("2026-11-24T10:00:00Z"))).toBe("2026-11-24");
  });

  it("formats wall-clock times", () => {
    expect(formatTime("17:05")).toBe("5:05 م");
    expect(formatTime("09:00", "en")).toBe("9:00 AM");
    expect(formatTime("00:30")).toBe("12:30 ص");
    expect(formatTime("bad")).toBe("bad");
  });
});
