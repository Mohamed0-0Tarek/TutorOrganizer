import { DEFAULT_SETTINGS } from "@/domain/types";
import type {
  Attendance,
  Group,
  Payment,
  Session,
  Slot,
  Student,
  TutorSettings,
  Weekday,
} from "@/domain/types";

type Raw = Record<string, unknown>;

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function ms(value: unknown): number | undefined {
  if (
    typeof value === "object" &&
    value !== null &&
    "toMillis" in value &&
    typeof (value as { toMillis: unknown }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return typeof value === "number" ? value : undefined;
}

function isWeekday(value: unknown): value is Weekday {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 6
  );
}

function toSlots(value: unknown): Slot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const raw = item as Raw;
    if (!isWeekday(raw.weekday)) return [];
    return [
      {
        weekday: raw.weekday,
        time: str(raw.time, "17:00"),
        durationMin: num(raw.durationMin, 60),
      },
    ];
  });
}

export function mapSettings(value: unknown): TutorSettings {
  const raw = (typeof value === "object" && value !== null ? value : {}) as Raw;
  return {
    absenceCounts: bool(raw.absenceCounts, DEFAULT_SETTINGS.absenceCounts),
    cycleLength: Math.max(1, Math.round(num(raw.cycleLength, DEFAULT_SETTINGS.cycleLength))),
    language: raw.language === "en" ? "en" : "ar",
    currency: str(raw.currency, DEFAULT_SETTINGS.currency),
    currencyLabel: str(raw.currencyLabel, DEFAULT_SETTINGS.currencyLabel),
    weekStartsOn: isWeekday(raw.weekStartsOn)
      ? raw.weekStartsOn
      : DEFAULT_SETTINGS.weekStartsOn,
  };
}

export function mapGroup(id: string, value: Raw): Group {
  return {
    id,
    name: str(value.name, "—"),
    subject: typeof value.subject === "string" ? value.subject : undefined,
    slots: toSlots(value.slots),
    active: bool(value.active, true),
    createdAtMs: ms(value.createdAt),
    updatedAtMs: ms(value.updatedAt),
  };
}

export function mapStudent(id: string, value: Raw): Student {
  return {
    id,
    name: str(value.name, "—"),
    phone: typeof value.phone === "string" ? value.phone : undefined,
    groupId: str(value.groupId),
    pricePerSession: Math.max(0, Math.round(num(value.pricePerSession, 0))),
    startedAtKey: str(value.startedAtKey, "1970-01-01"),
    active: bool(value.active, true),
    note: typeof value.note === "string" ? value.note : undefined,
    initialCounted: Math.max(0, Math.round(num(value.initialCounted, 0))),
    initialPaid: Math.max(0, Math.round(num(value.initialPaid, 0))),
    sessionsCounted: Math.max(0, Math.round(num(value.sessionsCounted, 0))),
    sessionsPaid: Math.max(0, Math.round(num(value.sessionsPaid, 0))),
    createdAtMs: ms(value.createdAt),
    updatedAtMs: ms(value.updatedAt),
  };
}

export function mapSession(id: string, value: Raw): Session {
  const status =
    value.status === "completed" || value.status === "cancelled"
      ? value.status
      : "scheduled";
  return {
    id,
    groupId: str(value.groupId),
    groupName: str(value.groupName, "—"),
    dateKey: str(value.dateKey, "1970-01-01"),
    time: str(value.time, "17:00"),
    type: value.type === "extra" ? "extra" : "regular",
    status,
    note: typeof value.note === "string" ? value.note : undefined,
    createdAtMs: ms(value.createdAt),
    updatedAtMs: ms(value.updatedAt),
  };
}

export function mapAttendance(id: string, value: Raw): Attendance {
  return {
    id,
    sessionId: str(value.sessionId),
    studentId: str(value.studentId),
    groupId: str(value.groupId),
    dateKey: str(value.dateKey, "1970-01-01"),
    status: value.status === "absent" ? "absent" : "present",
    updatedAtMs: ms(value.updatedAt),
  };
}

export function mapPayment(id: string, value: Raw): Payment {
  return {
    id,
    studentId: str(value.studentId),
    dateKey: str(value.dateKey, "1970-01-01"),
    amount: Math.max(0, Math.round(num(value.amount, 0))),
    sessionsCovered: Math.max(0, Math.round(num(value.sessionsCovered, 0))),
    note: typeof value.note === "string" ? value.note : undefined,
    createdAtMs: ms(value.createdAt),
    updatedAtMs: ms(value.updatedAt),
  };
}
