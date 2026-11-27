"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Loader2,
  UserRound,
  X,
} from "lucide-react";
import { BalanceChip } from "@/components/features/BalanceChip";
import { BigPrimaryButton } from "@/components/ui/BigPrimaryButton";
import { ConfirmCard } from "@/components/ui/ConfirmCard";
import { CounterRing } from "@/components/ui/CounterRing";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, inputClass } from "@/components/ui/Field";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/Headers";
import { NumberText } from "@/components/ui/NumberText";
import { Sheet } from "@/components/ui/Sheet";
import { StatusChip } from "@/components/ui/StatusChip";
import { useTutorData } from "@/data/provider/hooks";
import { saveLesson, type LessonResult } from "@/data/services/attendanceService";
import { cancelSession } from "@/data/services/sessionService";
import { formatArabicDate, formatTime } from "@/domain/dateKey";
import type { Attendance, AttendanceStatus } from "@/domain/types";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";
import { vibrate } from "@/lib/vibrate";

export default function AttendancePage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const params = useParams();
  const raw = params.sessionId;
  const sessionId = Array.isArray(raw) ? raw[0] : raw;

  const { students, attendance, payments, sessionsById, balances, settings, uid } =
    useTutorData();
  const session = sessionsById.get(sessionId ?? "");

  const [absentIds, setAbsentIds] = useState<Set<string>>(
    () =>
      new Set(
        attendance
          .filter((row) => row.sessionId === sessionId && row.status === "absent")
          .map((row) => row.studentId),
      ),
  );
  const [note, setNote] = useState(session?.note ?? "");
  const noteTouched = useRef(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LessonResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState("");

  const roster = useMemo(
    () =>
      session
        ? students
            .filter(
              (student) =>
                student.groupId === session.groupId &&
                student.active &&
                student.startedAtKey <= session.dateKey,
            )
            .sort((a, b) => a.name.localeCompare(b.name, "ar"))
        : [],
    [students, session],
  );

  const changedRows = useMemo(() => {
    const changes = new Map<string, AttendanceStatus>();
    for (const student of roster) {
      const row: Attendance | undefined = attendance.find(
        (item) => item.sessionId === session?.id && item.studentId === student.id,
      );
      const current: AttendanceStatus = absentIds.has(student.id)
        ? "absent"
        : "present";
      if (current !== (row?.status ?? "present")) {
        changes.set(student.id, current);
      }
    }
    return changes;
  }, [roster, attendance, absentIds, session?.id]);

  const dirty =
    changedRows.size > 0 || note.trim() !== (session?.note ?? "").trim();

  useEffect(() => {
    if (noteTouched.current) return;
    setNote(session?.note ?? "");
  }, [session?.note]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function toggle(studentId: string) {
    setAbsentIds((current) => {
      const next = new Set(current);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
        vibrate();
      }
      return next;
    });
  }

  async function handleSave() {
    if (!uid || !session || busy || roster.length === 0) return;
    setBusy(true);
    setMessage(null);
    const source = { students, sessionsById, attendance, payments, settings };

    try {
      const lessonResult = await saveLesson(uid, {
        sessionId: session.id,
        absentIds: [...absentIds],
        note,
        source,
      });
      setResult(lessonResult);
      noteTouched.current = false;
    } catch {
      setMessage(t.forms.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  async function confirmCancel() {
    if (!uid || !session || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await cancelSession(uid, session.id, cancelNote, {
        students,
        sessionsById,
        attendance,
        payments,
        settings,
      });
      setCancelOpen(false);
      setCancelNote("");
    } catch {
      setMessage(t.forms.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/schedule"
          className="flex min-h-11 items-center gap-2 text-[13px] text-muted"
        >
          <ArrowRight size={16} aria-hidden />
          {t.schedule.title}
        </Link>
        <EmptyState
          icon={<CalendarDays size={22} aria-hidden />}
          title={t.common.empty}
        />
      </div>
    );
  }

  const presentCount = roster.length - absentIds.size;
  const canSave =
    session.status !== "cancelled" && (session.status !== "completed" || dirty);

  return (
    <div className="flex flex-col gap-5 pb-16">
      <div>
        <button
          type="button"
          onClick={() => (dirty ? setLeaveOpen(true) : router.push("/schedule"))}
          className="mb-2 flex min-h-8 items-center gap-1 text-[13px] text-muted"
        >
          <ArrowRight size={15} aria-hidden />
          {t.schedule.title}
        </button>
        <PageHeader
          title={session.groupName}
          subtitle={`${formatArabicDate(
            session.dateKey,
            { weekday: "long", day: "numeric", month: "long" },
            locale,
          )} · ${formatTime(session.time, locale)}`}
          action={
            <div className="flex items-center gap-2">
              {session.status !== "cancelled" ? (
                <button
                  type="button"
                  onClick={() => {
                    setCancelNote("");
                    setCancelOpen(true);
                  }}
                  className="press rounded-full px-2 py-1 text-[12px] text-danger"
                >
                  {t.attendance.cancelLesson}
                </button>
              ) : null}
              <StatusChip
                tone={
                  session.status === "completed"
                    ? "success"
                    : session.status === "cancelled"
                      ? "danger"
                      : "neutral"
                }
              >
                {session.status === "completed"
                  ? t.schedule.completed
                  : session.status === "cancelled"
                    ? t.schedule.cancelled
                    : t.schedule.scheduled}
              </StatusChip>
            </div>
          }
        />
      </div>

      {session.status === "completed" ? (
        <GlassCard className="flex items-center gap-2 p-3 text-[12.5px] text-muted">
          <CheckCircle2 size={15} className="shrink-0 text-info" aria-hidden />
          {t.attendance.alreadyCompleted}
        </GlassCard>
      ) : null}

      {session.note ? (
        <GlassCard className="p-3 text-[12.5px] text-muted">{session.note}</GlassCard>
      ) : null}

      {roster.length === 0 ? (
        <EmptyState
          icon={<UserRound size={22} aria-hidden />}
          title={t.attendance.noStudents}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {roster.map((student) => {
            const absent = absentIds.has(student.id);
            const balance = balances.get(student.id);
            return (
              <li key={student.id}>
                <GlassCard
                  className={`flex items-center gap-3 px-3.5 py-3 transition-colors ${
                    absent ? "bg-danger/[0.08]" : ""
                  }`}
                >
                  <CounterRing
                    position={balance?.cyclePosition ?? 0}
                    length={settings.cycleLength}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-medium">
                      {student.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <NumberText className="text-[12px] text-muted">
                        {balance?.cyclePosition ?? 0}/{settings.cycleLength}
                      </NumberText>
                      {balance ? (
                        <BalanceChip
                          balance={balance}
                          t={t}
                          cycleLength={settings.cycleLength}
                          currencyLabel={settings.currencyLabel || t.common.currency}
                        />
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={student.name}
                    aria-pressed={absent}
                    onClick={() => toggle(student.id)}
                    className={`press flex min-h-11 min-w-[76px] items-center justify-center gap-1 rounded-btn px-3 text-[13px] font-semibold ${
                      absent
                        ? "bg-danger text-white"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    {absent ? (
                      <X size={15} aria-hidden />
                    ) : (
                      <Check size={15} aria-hidden />
                    )}
                    {absent ? t.attendance.absent : t.attendance.present}
                  </button>
                </GlassCard>
              </li>
            );
          })}
        </ul>
      )}

      <GlassCard className="flex flex-col gap-1.5 p-4">
        <Field label={t.attendance.note} hint={t.common.optional}>
          <textarea
            rows={2}
            className={`${inputClass} min-h-16 py-2`}
            value={note}
            onChange={(event) => {
              noteTouched.current = true;
              setNote(event.target.value);
            }}
          />
        </Field>
      </GlassCard>

      {message ? (
        <p role="alert" className="text-[12.5px] text-danger">
          {message}
        </p>
      ) : null}

      {roster.length > 0 ? (
        <div className="fixed inset-x-0 bottom-14 z-30 mx-auto w-full max-w-md px-4">
          <GlassCard className="flex items-center gap-3 p-2">
            <div className="shrink-0 px-1 text-center">
              <p className="text-[11px] text-muted">{t.today.studentsCount}</p>
              <p className="text-[15px] font-semibold">
                <NumberText>{presentCount}</NumberText>
                <span className="text-muted">/{roster.length}</span>
              </p>
            </div>
            <div className="flex-1">
              <BigPrimaryButton
                onClick={() => void handleSave()}
                disabled={busy || !canSave}
              >
                {busy ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                ) : null}
                {session.status === "completed"
                  ? t.attendance.updateLesson
                  : t.attendance.saveLesson}
              </BigPrimaryButton>
            </div>
          </GlassCard>
        </div>
      ) : null}

      <Sheet
        open={result !== null}
        onClose={() => setResult(null)}
        title={t.attendance.savedTitle}
      >
        <div className="flex flex-col gap-3">
          <p className="text-[13.5px] leading-6 text-muted">
            {result && result.newlyDue.length > 0
              ? format(t.attendance.newlyDue, { n: result.newlyDue.length })
              : t.attendance.savedBody}
          </p>
          {result?.newlyDue.length ? (
            <ul className="flex flex-col gap-2">
              {result.newlyDue.map((id) => {
                const student = students.find((item) => item.id === id);
                if (!student) return null;
                return (
                  <li key={id}>
                    <Link
                      href={`/students/${id}`}
                      className="press flex min-h-12 items-center justify-between gap-2 rounded-btn bg-white/55 px-3"
                    >
                      <span className="truncate text-[14px] font-medium">
                        {student.name}
                      </span>
                      <span className="text-[12.5px] font-medium text-primary-dark">
                        {t.attendance.recordPaymentNow}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <BigPrimaryButton onClick={() => setResult(null)}>
            {t.common.close}
          </BigPrimaryButton>
        </div>
      </Sheet>

      <Sheet
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title={t.attendance.unsavedTitle}
      >
        <ConfirmCard
          title={t.attendance.unsavedTitle}
          body={t.attendance.unsavedBody}
          confirmLabel={t.attendance.discard}
          cancelLabel={t.attendance.keepEditing}
          tone="danger"
          onCancel={() => setLeaveOpen(false)}
          onConfirm={() => router.push("/schedule")}
        />
      </Sheet>

      <Sheet
        open={cancelOpen}
        onClose={() => {
          setCancelOpen(false);
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
            onCancel={() => {
              setCancelOpen(false);
              setCancelNote("");
            }}
            onConfirm={() => void confirmCancel()}
          />
          <Field label={t.attendance.note} hint={t.schedule.cancelNoteHint}>
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
