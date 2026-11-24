"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, Clock, Plus } from "lucide-react";
import { BigPrimaryButton } from "@/components/ui/BigPrimaryButton";
import { ConfirmCard } from "@/components/ui/ConfirmCard";
import { DateStepper } from "@/components/ui/DateStepper";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, inputClass } from "@/components/ui/Field";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/Headers";
import { NumberText } from "@/components/ui/NumberText";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { StatusChip } from "@/components/ui/StatusChip";
import { useTutorData } from "@/data/provider/hooks";
import {
  addExtraSession,
  cancelSession,
} from "@/data/services/sessionService";
import { formatArabicDate, formatTime, nextDateKeys, todayKey } from "@/domain/dateKey";
import { GENERATION_HORIZON_DAYS } from "@/domain/sessionGenerator";
import type { Session } from "@/domain/types";
import { useI18n } from "@/i18n/I18nProvider";
import { groupColor } from "@/lib/groupColor";

type View = "day" | "week";

export default function SchedulePage() {
  const { t, locale } = useI18n();
  const { sessions, groups, uid } = useTutorData();

  const [view, setView] = useState<View>("day");
  const [selected, setSelected] = useState(() => todayKey());
  const [extraOpen, setExtraOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Session | null>(null);
  const [extraGroupId, setExtraGroupId] = useState("");
  const [extraDate, setExtraDate] = useState(() => todayKey());
  const [extraTime, setExtraTime] = useState("17:00");
  const [cancelNote, setCancelNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const horizon = useMemo(
    () => nextDateKeys(todayKey(), GENERATION_HORIZON_DAYS),
    [],
  );

  const statusFor = (session: Session) => {
    if (session.status === "completed")
      return { tone: "success" as const, label: t.schedule.completed };
    if (session.status === "cancelled")
      return { tone: "danger" as const, label: t.schedule.cancelled };
    return { tone: "neutral" as const, label: t.schedule.scheduled };
  };

  function sessionRow(session: Session) {
    const status = statusFor(session);
    return (
      <li key={session.id}>
        <GlassCard className="flex items-center gap-3 p-3.5">
          <Link href={`/attendance/${session.id}`} className="press flex min-w-0 flex-1 items-center gap-3">
            <span
              className={`h-9 w-1.5 shrink-0 rounded-full ${groupColor(session.groupId)}`}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span
                className={`block truncate text-[14.5px] font-semibold ${
                  session.status === "cancelled" ? "line-through text-muted" : ""
                }`}
              >
                {session.groupName}
              </span>
              <span className="mt-0.5 block text-[12px] text-muted">
                <NumberText>{formatTime(session.time, locale)}</NumberText>
                {session.type === "extra" ? ` · ${t.schedule.extra}` : ""}
              </span>
            </span>
          </Link>
          <StatusChip tone={status.tone}>{status.label}</StatusChip>
          {session.status === "scheduled" ? (
            <button
              type="button"
              onClick={() => setCancelTarget(session)}
              className="press shrink-0 rounded-full px-2 py-1 text-[12px] text-danger"
            >
              {t.schedule.cancelSession}
            </button>
          ) : null}
        </GlassCard>
      </li>
    );
  }

  const daySessions = sessions
    .filter((session) => session.dateKey === selected)
    .sort((a, b) => a.time.localeCompare(b.time));

  async function saveExtra() {
    const group = groups.find((item) => item.id === extraGroupId);
    if (!uid || !group || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await addExtraSession(uid, {
        groupId: group.id,
        groupName: group.name,
        dateKey: extraDate,
        time: extraTime,
        existingIds: sessions.map((session) => session.id),
      });
      setExtraOpen(false);
      setMessage(t.schedule.extraSaved);
    } catch {
      setMessage(t.forms.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  async function confirmCancel() {
    if (!uid || !cancelTarget || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await cancelSession(uid, cancelTarget.id, cancelNote);
      setCancelTarget(null);
      setCancelNote("");
    } catch {
      setMessage(t.forms.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t.schedule.title}
        subtitle={t.schedule.upcoming}
        action={
          <button
            type="button"
            onClick={() => {
              setExtraGroupId(groups.find((group) => group.active)?.id ?? "");
              setExtraOpen(true);
            }}
            className="press flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white"
            aria-label={t.schedule.addExtra}
          >
            <Plus size={19} aria-hidden />
          </button>
        }
      />

      <Segmented
        label={t.schedule.title}
        value={view}
        options={[
          { value: "day", label: t.schedule.day },
          { value: "week", label: t.schedule.week },
        ]}
        onChange={setView}
      />

      {message ? (
        <p role="status" className="text-[12.5px] text-primary-dark">
          {message}
        </p>
      ) : null}

      {view === "day" ? (
        <section className="flex flex-col gap-3">
          <DateStepper value={selected} onChange={setSelected} />
          {daySessions.length === 0 ? (
            <EmptyState
              icon={<CalendarDays size={22} aria-hidden />}
              title={t.schedule.noLessons}
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {daySessions.map(sessionRow)}
            </ul>
          )}
        </section>
      ) : (
        <div className="flex flex-col gap-4">
          {horizon.map((dateKey) => {
            const rows = sessions
              .filter((session) => session.dateKey === dateKey)
              .sort((a, b) => a.time.localeCompare(b.time));
            return (
              <section key={dateKey}>
                <h2 className="mb-1.5 px-1 text-[14px] font-semibold">
                  {formatArabicDate(dateKey, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h2>
                {rows.length === 0 ? (
                  <p className="px-2 text-[12.5px] text-muted">
                    {t.schedule.noLessons}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">{rows.map(sessionRow)}</ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <Sheet
        open={extraOpen}
        onClose={() => setExtraOpen(false)}
        title={t.schedule.addExtraTitle}
      >
        <div className="flex flex-col gap-3">
          {groups.filter((group) => group.active).length === 0 ? (
            <p className="text-[13px] text-muted">{t.schedule.noGroupsForExtra}</p>
          ) : (
            <>
              <Field label={t.students.group}>
                <select
                  className={inputClass}
                  value={extraGroupId}
                  onChange={(event) => setExtraGroupId(event.target.value)}
                >
                  <option value="">{t.forms.selectGroup}</option>
                  {groups
                    .filter((group) => group.active)
                    .map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.students.startDate}>
                  <input
                    type="date"
                    dir="ltr"
                    className={`${inputClass} tabular-nums`}
                    value={extraDate}
                    onChange={(event) => setExtraDate(event.target.value)}
                  />
                </Field>
                <Field label={t.groups.time}>
                  <input
                    type="time"
                    dir="ltr"
                    className={`${inputClass} tabular-nums`}
                    value={extraTime}
                    onChange={(event) => setExtraTime(event.target.value)}
                  />
                </Field>
              </div>
              <BigPrimaryButton
                onClick={() => void saveExtra()}
                disabled={busy || !extraGroupId || !extraDate || !extraTime}
              >
                <Clock size={16} aria-hidden />
                {t.common.save}
              </BigPrimaryButton>
            </>
          )}
        </div>
      </Sheet>

      <Sheet
        open={cancelTarget !== null}
        onClose={() => {
          setCancelTarget(null);
          setCancelNote("");
        }}
        title={t.schedule.cancelSession}
      >
        <div className="flex flex-col gap-3">
          <ConfirmCard
            title={t.schedule.cancelTitle}
            body={t.schedule.cancelBody}
            confirmLabel={t.schedule.cancelSession}
            cancelLabel={t.common.cancel}
            tone="danger"
            busy={busy}
            onCancel={() => setCancelTarget(null)}
            onConfirm={() => void confirmCancel()}
          />
          <Field
            label={t.attendance.note}
            hint={t.schedule.cancelNoteHint}
          >
            <textarea
              rows={2}
              className={`${inputClass} min-h-16 py-2`}
              value={cancelNote}
              onChange={(event) => setCancelNote(event.target.value)}
            />
          </Field>
        </div>
      </Sheet>
    </div>
  );
}
