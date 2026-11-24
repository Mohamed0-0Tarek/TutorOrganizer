import { nextDateKeys, weekdayOfKey } from "./dateKey";
import { regularSessionId } from "./sessionId";
import type { DateKey, Group, Session } from "./types";

/**
 * Number of Cairo days materialised ahead of the tutor, including today.
 * The schedule view uses the same horizon.
 */
export const GENERATION_HORIZON_DAYS = 14;

export interface GenerationInput {
  groups: readonly Group[];
  sessions: readonly Session[];
  today: DateKey;
}

export type GenerationChange =
  | { kind: "create"; session: Session }
  | { kind: "updateTime"; id: string; time: string };

/**
 * Pure planner. Existing documents are never resurrected or duplicated: the
 * deterministic id is the uniqueness constraint. Only a *future, scheduled*
 * regular lesson follows a slot time edit.
 *
 * Extras (`_2`, `_3`, …) are deliberately outside the generator's scope.
 */
export function planGeneration(input: GenerationInput): GenerationChange[] {
  const { groups, sessions, today } = input;
  const byId = new Map(sessions.map((session) => [session.id, session]));
  const dates = nextDateKeys(today, GENERATION_HORIZON_DAYS);
  const changes: GenerationChange[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    if (!group.active) continue;

    for (const slot of group.slots) {
      for (const dateKey of dates) {
        if (weekdayOfKey(dateKey) !== slot.weekday) continue;

        const id = regularSessionId(group.id, dateKey);
        if (seen.has(id)) continue;
        seen.add(id);

        const existing = byId.get(id);
        if (!existing) {
          changes.push({
            kind: "create",
            session: {
              id,
              groupId: group.id,
              groupName: group.name,
              dateKey,
              time: slot.time,
              type: "regular",
              status: "scheduled",
            },
          });
          continue;
        }

        // Cancelled and completed lessons are historical truth: never rewrite
        // them, and never bring a cancelled one back.
        if (
          existing.status === "scheduled" &&
          existing.dateKey > today &&
          existing.time !== slot.time
        ) {
          changes.push({ kind: "updateTime", id, time: slot.time });
        }
      }
    }
  }

  return changes;
}
