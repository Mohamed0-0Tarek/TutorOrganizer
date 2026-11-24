"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysKey, formatArabicDate, todayKey } from "@/domain/dateKey";
import { NumberText } from "./NumberText";
import { useI18n } from "@/i18n/I18nProvider";

/** Cairo-aware day navigation. The "today" shortcut appears off the current day. */
export function DateStepper({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const isToday = value === todayKey();

  return (
    <div className="glass-card flex items-center justify-between gap-2 p-2">
      <button
        type="button"
        aria-label={t.schedule.prevDay}
        onClick={() => onChange(addDaysKey(value, -1))}
        className="press flex h-11 w-11 items-center justify-center rounded-btn text-muted hover:bg-white/60"
      >
        <ChevronRight size={20} className="rtl:rotate-180" aria-hidden />
      </button>

      <div className="flex flex-col items-center">
        <p className="text-[15px] font-semibold">
          <NumberText>
            {formatArabicDate(value, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </NumberText>
        </p>
        {!isToday ? (
          <button
            type="button"
            onClick={() => onChange(todayKey())}
            className="text-[12px] font-medium text-primary-dark"
          >
            {t.schedule.today}
          </button>
        ) : null}
      </div>

      <button
        type="button"
        aria-label={t.schedule.nextDay}
        onClick={() => onChange(addDaysKey(value, 1))}
        className="press flex h-11 w-11 items-center justify-center rounded-btn text-muted hover:bg-white/60"
      >
        <ChevronLeft size={20} className="rtl:rotate-180" aria-hidden />
      </button>
    </div>
  );
}
