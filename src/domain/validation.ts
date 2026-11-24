import { isValidDateKey } from "./dateKey";
import type { DateKey, Slot, Weekday } from "./types";

/**
 * Pure form validation. The UI only maps these keys through the dictionary —
 * no validation message is ever hardcoded in a screen.
 */

export type ValidationErrorKey =
  | "nameRequired"
  | "nameTooShort"
  | "invalidTime"
  | "invalidDuration"
  | "invalidPrice"
  | "invalidCount"
  | "invalidDate"
  | "invalidPhone"
  | "noSlots";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ValidationErrorKey };

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const fail = <T>(error: ValidationErrorKey): ValidationResult<T> => ({
  ok: false,
  error,
});

export function normalizeName(raw: string): ValidationResult<string> {
  const value = raw.trim().replace(/\s+/g, " ");
  if (!value) return fail("nameRequired");
  if (value.length < 2) return fail("nameTooShort");
  return { ok: true, value };
}

export function normalizeTime(raw: string): ValidationResult<string> {
  const value = raw.trim();
  return TIME_RE.test(value)
    ? { ok: true, value }
    : fail("invalidTime");
}

export function normalizeDuration(raw: number | string): ValidationResult<number> {
  const value = typeof raw === "number" ? raw : Number(raw.trim());
  if (!Number.isInteger(value) || value < 15 || value > 180) {
    return fail("invalidDuration");
  }
  return { ok: true, value };
}

export function normalizeSlot(raw: {
  weekday: number;
  time: string;
  durationMin: number | string;
}): ValidationResult<Slot> {
  if (!Number.isInteger(raw.weekday) || raw.weekday < 0 || raw.weekday > 6) {
    return fail("invalidDate");
  }
  const time = normalizeTime(raw.time);
  if (!time.ok) return fail(time.error);
  const duration = normalizeDuration(raw.durationMin);
  if (!duration.ok) return fail(duration.error);
  return {
    ok: true,
    value: {
      weekday: raw.weekday as Weekday,
      time: time.value,
      durationMin: duration.value,
    },
  };
}

/** Whole currency units only — never decimals, never negatives. */
export function normalizePrice(raw: number | string): ValidationResult<number> {
  const value = typeof raw === "number" ? raw : Number(raw.trim());
  if (!Number.isInteger(value) || value < 0) return fail("invalidPrice");
  return { ok: true, value };
}

export function normalizeCount(raw: number | string): ValidationResult<number> {
  const value = raw === "" ? 0 : typeof raw === "number" ? raw : Number(raw.trim());
  if (!Number.isInteger(value) || value < 0) return fail("invalidCount");
  return { ok: true, value };
}

export function normalizeDateKey(raw: string): ValidationResult<DateKey> {
  const value = raw.trim();
  return isValidDateKey(value)
    ? { ok: true, value }
    : fail("invalidDate");
}

/** Empty is allowed; a present value must have 7–15 digits. */
export function normalizePhone(raw: string): ValidationResult<string | undefined> {
  const value = raw.trim();
  if (!value) return { ok: true, value: undefined };
  const digits = value.replace(/[^\d]/g, "");
  if (digits.length < 7 || digits.length > 15) return fail("invalidPhone");
  return { ok: true, value };
}
