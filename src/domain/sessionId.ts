import { isValidDateKey, parseDateKey } from "./dateKey";
import type { DateKey } from "./types";

/**
 * Deterministic document ids.
 *
 * Doubling as a natural uniqueness constraint means offline retries and
 * generator re-runs can never create duplicates.
 */

const SESSION_ID_RE = /^(?<groupId>.+)_(?<day>\d{8})(?:_(?<extra>\d+))?$/;

export function compactDateKey(dateKey: DateKey): string {
  if (!isValidDateKey(dateKey)) {
    throw new RangeError(`Invalid date key: ${dateKey}`);
  }
  return dateKey.replace(/-/g, "");
}

export function regularSessionId(groupId: string, dateKey: DateKey): string {
  if (groupId.length === 0) {
    throw new RangeError("groupId is required");
  }
  return `${groupId}_${compactDateKey(dateKey)}`;
}

/** Extras are numbered from 2: `{groupId}_{yyyyMMdd}_2`, `_3`, … */
export function extraSessionId(
  groupId: string,
  dateKey: DateKey,
  extraNumber: number,
): string {
  if (!Number.isInteger(extraNumber) || extraNumber < 2) {
    throw new RangeError("extraNumber must be an integer >= 2");
  }
  return `${regularSessionId(groupId, dateKey)}_${extraNumber}`;
}

export interface ParsedSessionId {
  groupId: string;
  dateKey: DateKey;
  /** Undefined for regular sessions. */
  extraNumber?: number;
}

export function parseSessionId(id: string): ParsedSessionId | null {
  const match = SESSION_ID_RE.exec(id);
  if (!match?.groups) return null;
  const day = match.groups.day;
  const dateKey = `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`;
  if (!isValidDateKey(dateKey)) return null;
  const extraRaw = match.groups.extra;
  const extraNumber = extraRaw ? Number(extraRaw) : undefined;
  if (extraNumber !== undefined && (!Number.isInteger(extraNumber) || extraNumber < 2)) {
    return null;
  }
  return { groupId: match.groups.groupId, dateKey, extraNumber };
}

/** `{sessionId}_{studentId}` — one attendance row per student per lesson. */
export function attendanceId(sessionId: string, studentId: string): string {
  return `${sessionId}_${studentId}`;
}

/** Next free extra number for a group on a date, given existing session ids. */
export function nextExtraSessionNumber(
  groupId: string,
  dateKey: DateKey,
  existingIds: Iterable<string>,
): number {
  let candidate = 2;
  const used = new Set<number>();
  for (const id of existingIds) {
    const parsed = parseSessionId(id);
    if (!parsed) continue;
    if (parsed.groupId !== groupId || parsed.dateKey !== dateKey) continue;
    if (parsed.extraNumber !== undefined) used.add(parsed.extraNumber);
  }
  while (used.has(candidate)) candidate += 1;
  return candidate;
}

/** Compact `yyyyMMdd` back to a date key, for UI/debug helpers. */
export function dateKeyFromCompact(compact: string): DateKey {
  if (!/^\d{8}$/.test(compact)) {
    throw new RangeError(`Invalid compact date: ${compact}`);
  }
  const key = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  parseDateKey(key);
  return key;
}
