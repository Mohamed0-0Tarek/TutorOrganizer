import { describe, expect, it } from "vitest";
import { computeGroupStatus } from "@/domain/groupPosition";
import type { StudentBalance } from "@/domain/types";
import { makeStudent } from "./helpers";

function balance(position: number, counted = 3): Pick<StudentBalance, "cyclePosition" | "counted"> {
  return { cyclePosition: position, counted };
}

describe("computeGroupStatus", () => {
  it("uses the group position and flags the late joiner", () => {
    const a = makeStudent({ id: "a", name: "Ahmed" });
    const b = makeStudent({ id: "b", name: "Hamada" });
    const late = makeStudent({ id: "late", name: "Omar", startedAtKey: "2026-01-15" });

    const status = computeGroupStatus(
      [a, b, late],
      new Map([
        ["a", balance(3)],
        ["b", balance(3)],
        ["late", balance(1, 1)],
      ]),
    );

    expect(status.position).toBe(3);
    expect(status.outliers).toEqual([
      { studentId: "late", name: "Omar", position: 1 },
    ]);
  });

  it("breaks a tie toward the higher position", () => {
    const a = makeStudent({ id: "a", name: "A" });
    const b = makeStudent({ id: "b", name: "B" });

    const status = computeGroupStatus(
      [a, b],
      new Map([
        ["a", balance(3)],
        ["b", balance(2)],
      ]),
    );

    expect(status.position).toBe(3);
    expect(status.outliers).toEqual([{ studentId: "b", name: "B", position: 2 }]);
  });

  it("ignores inactive students and students without counted sessions", () => {
    const active = makeStudent({ id: "active", name: "Active" });
    const inactive = makeStudent({ id: "inactive", name: "Inactive", active: false });
    const newJoin = makeStudent({ id: "new", name: "New" });

    const status = computeGroupStatus(
      [active, inactive, newJoin],
      new Map([
        ["active", balance(2)],
        ["inactive", balance(4)],
        ["new", balance(0, 0)],
      ]),
    );

    expect(status.position).toBe(2);
    expect(status.outliers).toEqual([]);
    expect(status.activeCount).toBe(2);
  });

  it("reports position 0 for an empty group", () => {
    const status = computeGroupStatus([], new Map());
    expect(status.position).toBe(0);
    expect(status.outliers).toEqual([]);
  });
});
