import { describe, expect, it } from "vitest";
import { addDaysKey, weekdayOfKey } from "@/domain/dateKey";
import {
  GENERATION_HORIZON_DAYS,
  planGeneration,
  type GenerationChange,
} from "@/domain/sessionGenerator";
import { extraSessionId, regularSessionId } from "@/domain/sessionId";
import type { Group, Session } from "@/domain/types";

const today = "2026-11-24"; // Tuesday

function group(id: string, weekday: number, time = "17:00"): Group {
  return {
    id,
    name: `Group ${id}`,
    slots: [{ weekday: weekday as Group["slots"][number]["weekday"], time, durationMin: 60 }],
    active: true,
  };
}

function createdSessions(changes: GenerationChange[]): Session[] {
  return changes.flatMap((change) =>
    change.kind === "create" ? [change.session] : [],
  );
}

describe("planGeneration", () => {
  it("materialises only matching weekdays inside the horizon", () => {
    const changes = planGeneration({
      groups: [group("g1", weekdayOfKey(today))],
      sessions: [],
      today,
    });

    const sessions = createdSessions(changes);
    expect(sessions.length).toBeGreaterThanOrEqual(2);
    expect(sessions.every((item) => item.dateKey >= today)).toBe(true);
    expect(sessions.every((item) => item.dateKey < addDaysKey(today, GENERATION_HORIZON_DAYS))).toBe(true);
    expect(sessions[0]).toMatchObject({
      id: regularSessionId("g1", today),
      groupName: "Group g1",
      status: "scheduled",
      time: "17:00",
    });
  });

  it("is idempotent: a second run produces no writes", () => {
    const input = {
      groups: [group("g1", weekdayOfKey(today))],
      sessions: [] as Session[],
      today,
    };
    const first = createdSessions(planGeneration(input));
    expect(planGeneration({ ...input, sessions: first })).toEqual([]);
  });

  it("skips archived groups and never resurrects a cancelled lesson", () => {
    const cancelled: Session = {
      id: regularSessionId("g1", today),
      groupId: "g1",
      groupName: "Group g1",
      dateKey: today,
      time: "17:00",
      type: "regular",
      status: "cancelled",
    };
    const archived = { ...group("g2", weekdayOfKey(today)), active: false };

    const changes = createdSessions(
      planGeneration({
        groups: [group("g1", weekdayOfKey(today)), archived],
        sessions: [cancelled],
        today,
      }),
    );

    expect(changes.some((session) => session.id === cancelled.id)).toBe(false);
    expect(changes.some((session) => session.groupId === "g2")).toBe(false);
    expect(changes.length).toBeGreaterThan(0);
  });

  it("updates only future scheduled lessons when a slot time changes", () => {
    const futureKey = addDaysKey(today, 7);
    const future: Session = {
      id: regularSessionId("g1", futureKey),
      groupId: "g1",
      groupName: "Group g1",
      dateKey: futureKey,
      time: "17:00",
      type: "regular",
      status: "scheduled",
    };
    const todaySession: Session = {
      ...future,
      id: regularSessionId("g1", today),
      dateKey: today,
    };

    const changes = planGeneration({
      groups: [group("g1", weekdayOfKey(today), "18:30")],
      sessions: [future, todaySession],
      today,
    });

    expect(changes).toEqual([
      { kind: "updateTime", id: future.id, time: "18:30" },
    ]);
  });

  it("leaves extra sessions alone", () => {
    const extra: Session = {
      id: extraSessionId("g1", today, 2),
      groupId: "g1",
      groupName: "Group g1",
      dateKey: today,
      time: "19:00",
      type: "extra",
      status: "scheduled",
    };
    const changes = createdSessions(
      planGeneration({
        groups: [group("g1", weekdayOfKey(today))],
        sessions: [extra],
        today,
      }),
    );
    expect(changes.map((item) => item.id)).toContain(
      regularSessionId("g1", today),
    );
    expect(changes.map((item) => item.id)).not.toContain(extra.id);
  });
});
