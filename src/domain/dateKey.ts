import type { DateKey, Weekday } from "./types";

/**
 * Single source of truth for calendar identity.
 *
 * The tutor lives in Cairo, so "today" must be the Cairo day even when the
 * device is in another timezone or the browser clock is near UTC midnight.
 * `yyyy-MM-dd` keys are lexicographically sortable and DST-proof.
 */
export const APP_TIMEZONE = "Africa/Cairo";

export const MS_PER_DAY = 86_400_000;

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const keyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** Cairo calendar day of an instant, e.g. `2026-11-24`. */
export function dateKeyOf(date: Date): DateKey {
  const parts = keyFormatter.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("Could not format date key");
  }
  return `${year}-${month}-${day}`;
}

export function todayKey(now: Date = new Date()): DateKey {
  return dateKeyOf(now);
}

export function isValidDateKey(value: unknown): value is DateKey {
  if (typeof value !== "string") return false;
  const match = DATE_KEY_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  // Round-trip through UTC catches e.g. 2026-02-30.
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

export function dateKeyFromParts(
  year: number,
  month: number,
  day: number,
): DateKey {
  const key = `${year}-${pad2(month)}-${pad2(day)}`;
  if (!isValidDateKey(key)) {
    throw new RangeError(`Invalid date: ${year}-${month}-${day}`);
  }
  return key;
}

export function parseDateKey(key: DateKey): {
  year: number;
  month: number;
  day: number;
} {
  const match = DATE_KEY_RE.exec(key);
  if (!match || !isValidDateKey(key)) {
    throw new RangeError(`Invalid date key: ${key}`);
  }
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function utcMsOfKey(key: DateKey): number {
  const { year, month, day } = parseDateKey(key);
  return Date.UTC(year, month - 1, day);
}

function keyFromUtcMs(ms: number): DateKey {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(
    date.getUTCDate(),
  )}`;
}

/** Shift a key by whole days without ever touching local time or DST. */
export function addDaysKey(key: DateKey, days: number): DateKey {
  if (!Number.isInteger(days)) throw new RangeError("days must be an integer");
  return keyFromUtcMs(utcMsOfKey(key) + days * MS_PER_DAY);
}

/** 0 = Sunday … 6 = Saturday, matching `Date.getDay()`. */
export function weekdayOfKey(key: DateKey): Weekday {
  return new Date(utcMsOfKey(key)).getUTCDay() as Weekday;
}

export function nextDateKeys(fromKey: DateKey, count: number): DateKey[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError("count must be a non-negative integer");
  }
  return Array.from({ length: count }, (_, index) => addDaysKey(fromKey, index));
}

export function compareDateKeys(a: DateKey, b: DateKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isKeyInRange(
  key: DateKey,
  fromKey: DateKey,
  toKey: DateKey,
): boolean {
  return key >= fromKey && key <= toKey;
}

export function daysBetweenKeys(fromKey: DateKey, toKey: DateKey): number {
  return Math.round((utcMsOfKey(toKey) - utcMsOfKey(fromKey)) / MS_PER_DAY);
}

/** Human date in Arabic (Latin digits per the product decision). */
export function formatArabicDate(
  key: DateKey,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
  },
): string {
  const { year, month, day } = parseDateKey(key);
  // Noon UTC keeps the Cairo rendering on the intended day for any offset.
  const instant = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    timeZone: APP_TIMEZONE,
    ...options,
  }).format(instant);
}

export function formatTime(time: string, locale: "ar" | "en" = "ar"): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return time;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const suffix = hour < 12 ? (locale === "ar" ? "ص" : "AM") : locale === "ar" ? "م" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${pad2(minute)} ${suffix}`;
}
