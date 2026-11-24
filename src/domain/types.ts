/**
 * Domain types for Tutor Manager.
 *
 * PURE MODULE: no React, Next.js, Firebase or browser imports are allowed here.
 * Firestore `Timestamp`s are mapped to epoch milliseconds at the data layer so
 * the domain stays serialisable and testable.
 */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Local Cairo date in `yyyy-MM-dd` form. The only date identity in the app. */
export type DateKey = string;

export type Locale = "ar" | "en";

export type SessionStatus = "scheduled" | "completed" | "cancelled";
export type SessionType = "regular" | "extra";
export type AttendanceStatus = "present" | "absent";

export type BalanceState = "DUE" | "IN_PROGRESS" | "SETTLED" | "PAID_AHEAD";

export interface Slot {
  weekday: Weekday;
  /** Cairo wall-clock time, `HH:mm`. */
  time: string;
  durationMin: number;
}

export interface TutorSettings {
  absenceCounts: boolean;
  cycleLength: number;
  language: Locale;
  currency: string;
  currencyLabel: string;
  weekStartsOn: Weekday;
}

export const DEFAULT_SETTINGS: TutorSettings = {
  absenceCounts: true,
  cycleLength: 4,
  language: "ar",
  currency: "EGP",
  currencyLabel: "ج.م",
  weekStartsOn: 6,
};

export interface Group {
  id: string;
  name: string;
  subject?: string;
  slots: Slot[];
  active: boolean;
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface Student {
  id: string;
  name: string;
  /** Parent phone. Never sent to the AI provider. */
  phone?: string;
  groupId: string;
  pricePerSession: number;
  startedAtKey: DateKey;
  active: boolean;
  note?: string;
  /** Sessions carried over from before the app was used. */
  initialCounted: number;
  initialPaid: number;
  /** Cached, derived. Only `counterService` writes these. */
  sessionsCounted: number;
  sessionsPaid: number;
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface Session {
  id: string;
  groupId: string;
  groupName: string;
  dateKey: DateKey;
  time: string;
  type: SessionType;
  status: SessionStatus;
  note?: string;
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface Attendance {
  id: string;
  sessionId: string;
  studentId: string;
  /** Group at the time of the lesson (preserved across moves). */
  groupId: string;
  dateKey: DateKey;
  status: AttendanceStatus;
  updatedAtMs?: number;
}

export interface Payment {
  id: string;
  studentId: string;
  dateKey: DateKey;
  /** Whole currency units. */
  amount: number;
  sessionsCovered: number;
  note?: string;
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface Counters {
  counted: number;
  paid: number;
}

export interface StudentBalance {
  counted: number;
  paid: number;
  balance: number;
  /** 0 when the student has no counted sessions, otherwise 1..cycleLength. */
  cyclePosition: number;
  state: BalanceState;
  dueCycles: number;
  amountDue: number;
  paidAheadBy: number;
}

export interface GroupOutlier {
  studentId: string;
  name: string;
  position: number;
}

export interface GroupStatus {
  /** Most common position among active students with counted > 0; tie -> higher. */
  position: number;
  outliers: GroupOutlier[];
  activeCount: number;
}
