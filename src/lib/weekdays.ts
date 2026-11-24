import type { Dict } from "@/i18n";

const ORDER = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export function weekdayLabel(t: Dict, weekday: number): string {
  const key = ORDER[weekday] ?? "saturday";
  return t.settings.weekdays[key];
}

export function weekdayOptions(t: Dict): Array<{ value: number; label: string }> {
  return ORDER.map((_, index) => ({ value: index, label: weekdayLabel(t, index) }));
}
