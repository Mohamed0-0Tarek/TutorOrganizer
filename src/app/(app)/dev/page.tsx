"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  Database,
  Loader2,
  Palette,
  RefreshCcw,
  Trash2,
  UserX,
} from "lucide-react";
import { BigPrimaryButton } from "@/components/ui/BigPrimaryButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/Headers";
import { NumberText } from "@/components/ui/NumberText";
import {
  clearDemoData,
  seedDemoData,
  setAttendanceStatus,
} from "@/data/services/devSeedService";
import { reconcileCounters } from "@/data/services/counterService";
import { useTutorData } from "@/data/provider/hooks";
import { attendanceId } from "@/domain/sessionId";
import { useI18n } from "@/i18n/I18nProvider";

export default function DevPage() {
  const { t } = useI18n();
  const data = useTutorData();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const uid = data.uid;

  async function run(label: string, action: () => Promise<unknown>) {
    if (!uid || busy) return;
    setBusy(label);
    setMessage(null);
    try {
      const result = await action();
      setMessage(
        typeof result === "number" ? `✓ ${label} (${result})` : `✓ ${label}`,
      );
    } catch (error) {
      setMessage(
        `✕ ${label}: ${error instanceof Error ? error.message : "error"}`,
      );
    } finally {
      setBusy(null);
    }
  }

  async function toggleAbsence() {
    if (!uid) return;
    const session = data.sessions.find((item) => item.status === "completed");
    const student = session
      ? data.students.find((item) => item.groupId === session.groupId)
      : undefined;
    if (!session || !student) {
      setMessage("✕ no completed session/student — seed data first");
      return;
    }

    const existing = data.attendance.find(
      (row) => row.sessionId === session.id && row.studentId === student.id,
    );
    const nextStatus = existing?.status === "absent" ? "present" : "absent";
    const id = existing?.id ?? attendanceId(session.id, student.id);

    await setAttendanceStatus({
      uid,
      attendanceId: id,
      sessionId: session.id,
      studentId: student.id,
      groupId: session.groupId,
      dateKey: session.dateKey,
      status: nextStatus,
    });

    // Let the snapshot land (works offline via latency compensation), then
    // reconcile the cached counters from the hydrated state.
    window.setTimeout(() => {
      void reconcileCounters(uid, dataRef.current);
    }, 900);
  }

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.dev.title} subtitle={t.dev.body} />

      <GlassCard className="flex flex-col gap-2 p-4 text-[13px]">
        <Row label={t.dev.users} value={data.students.length} />
        <Row label={t.dev.groups} value={data.groups.length} />
        <Row label={t.dev.sessions} value={data.sessions.length} />
        <Row label={t.dev.attendance} value={data.attendance.length} />
        <Row label={t.dev.payments} value={data.payments.length} />
        <div className="mt-1 flex flex-wrap gap-2 text-[12px] text-muted">
          <span className="rounded-full bg-white/60 px-2 py-1">
            {t.dev.online}: {data.online ? "✓" : "✕"}
          </span>
          <span className="rounded-full bg-white/60 px-2 py-1">
            {t.dev.cache}: {data.fromCache ? "✓" : "✕"}
          </span>
          <span className="rounded-full bg-white/60 px-2 py-1">
            {t.dev.state}: {data.status}
          </span>
        </div>
      </GlassCard>

      <div className="flex flex-col gap-2">
        <BigPrimaryButton
          onClick={() => void run(t.dev.seed, () => seedDemoData(uid!))}
          disabled={!uid || busy !== null}
        >
          {busy === t.dev.seed ? (
            <Loader2 size={16} className="animate-spin" aria-hidden />
          ) : (
            <Database size={16} aria-hidden />
          )}
          {t.dev.seed}
        </BigPrimaryButton>

        <BigPrimaryButton
          variant="ghost"
          onClick={() => void run(t.dev.toggleAbsence, toggleAbsence)}
          disabled={!uid || busy !== null}
        >
          <UserX size={16} aria-hidden />
          {t.dev.toggleAbsence}
        </BigPrimaryButton>

        <BigPrimaryButton
          variant="ghost"
          onClick={() =>
            void run(t.dev.recompute, () => reconcileCounters(uid!, data))
          }
          disabled={!uid || busy !== null}
        >
          <RefreshCcw size={16} aria-hidden />
          {t.dev.recompute}
        </BigPrimaryButton>

        <BigPrimaryButton
          variant="ghost"
          onClick={() =>
            void run(t.dev.clear, () =>
              clearDemoData(uid!, {
                groupIds: data.groups.map((group) => group.id),
                studentIds: data.students.map((student) => student.id),
                sessionIds: data.sessions.map((session) => session.id),
                attendanceIds: data.attendance.map((row) => row.id),
                paymentIds: data.payments.map((payment) => payment.id),
              }),
            )
          }
          disabled={!uid || busy !== null}
        >
          <Trash2 size={16} aria-hidden />
          {t.dev.clear}
        </BigPrimaryButton>

        <Link
          href="/dev/style"
          className="press flex min-h-12 w-full items-center justify-center gap-2 rounded-btn border border-white/70 bg-white/60 text-[15px] font-semibold text-ink"
        >
          <Palette size={16} aria-hidden />
          {t.dev.styleGallery}
        </Link>
      </div>

      {message ? (
        <GlassCard className="text-[12.5px] text-muted">
          <p>{message}</p>
        </GlassCard>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-semibold">
        <NumberText>{value}</NumberText>
      </span>
    </div>
  );
}
