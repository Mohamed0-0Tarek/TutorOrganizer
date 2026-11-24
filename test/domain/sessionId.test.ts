import { describe, expect, it } from "vitest";
import {
  attendanceId,
  compactDateKey,
  dateKeyFromCompact,
  extraSessionId,
  nextExtraSessionNumber,
  parseSessionId,
  regularSessionId,
} from "@/domain/sessionId";

describe("session ids", () => {
  it("is deterministic per group and date", () => {
    expect(regularSessionId("g1", "2026-11-24")).toBe("g1_20261124");
    expect(regularSessionId("g1", "2026-11-24")).toBe("g1_20261124");
  });

  it("numbers extra sessions from 2", () => {
    expect(extraSessionId("g1", "2026-11-24", 2)).toBe("g1_20261124_2");
    expect(() => extraSessionId("g1", "2026-11-24", 1)).toThrow(RangeError);
  });

  it("parses regular and extra ids", () => {
    expect(parseSessionId("g1_20261124")).toEqual({
      groupId: "g1",
      dateKey: "2026-11-24",
      extraNumber: undefined,
    });
    expect(parseSessionId("g1_20261124_3")).toEqual({
      groupId: "g1",
      dateKey: "2026-11-24",
      extraNumber: 3,
    });
  });

  it("parses group ids that contain underscores", () => {
    expect(parseSessionId("group_with_underscore_20261124")).toEqual({
      groupId: "group_with_underscore",
      dateKey: "2026-11-24",
      extraNumber: undefined,
    });
  });

  it("rejects malformed ids", () => {
    expect(parseSessionId("g1")).toBeNull();
    expect(parseSessionId("g1_20261340")).toBeNull();
    expect(parseSessionId("g1_20261124_1")).toBeNull();
  });

  it("builds stable attendance ids", () => {
    expect(attendanceId("g1_20261124", "s1")).toBe("g1_20261124_s1");
  });

  it("finds the smallest free extra number (never reuses a taken slot)", () => {
    expect(
      nextExtraSessionNumber("g1", "2026-11-24", [
        "g1_20261124",
        "g1_20261124_2",
        "g1_20261124_4",
        "g2_20261124_9",
      ]),
    ).toBe(3);
    expect(nextExtraSessionNumber("g1", "2026-11-24", ["g1_20261124"])).toBe(2);
    expect(
      nextExtraSessionNumber("g1", "2026-11-24", [
        "g1_20261124_2",
        "g1_20261124_3",
      ]),
    ).toBe(4);
  });

  it("converts between compact and dashed date keys", () => {
    expect(compactDateKey("2026-11-24")).toBe("20261124");
    expect(dateKeyFromCompact("20261124")).toBe("2026-11-24");
    expect(() => compactDateKey("24/11/2026")).toThrow(RangeError);
  });
});
