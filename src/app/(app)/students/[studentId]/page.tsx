"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  CalendarDays,
  FolderOpen,
  MoveRight,
  Pencil,
  Phone,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
import { BalanceChip } from "@/components/features/BalanceChip";
import { PaymentSheet } from "@/components/features/PaymentSheet";
import { ConfirmCard } from "@/components/ui/ConfirmCard";
import { CounterRing } from "@/components/ui/CounterRing";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader, SectionHeader } from "@/components/ui/Headers";
import { NumberText } from "@/components/ui/NumberText";
import { Sheet } from "@/components/ui/Sheet";
import { StatusChip } from "@/components/ui/StatusChip";
import { useTutorData } from "@/data/provider/hooks";
import {
  moveStudentAndReconcile,
  setStudentActiveAndReconcile,
} from "@/data/services/enrollmentService";
import { computeAttendanceCycles } from "@/domain/counters";
import { formatArabicDate } from "@/domain/dateKey";
import { formatMoney } from "@/domain/money";
import type { Payment } from "@/domain/types";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";

export default function StudentDetailPage() {
  const { t, locale } = useI18n();
  const params = useParams();
  const raw = params.studentId;
  const studentId = Array.isArray(raw) ? raw[0] : raw;

  const { students, groups, payments, attendance, sessionsById, balances, settings, uid } =
    useTutorData();

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentStartDelete, setPaymentStartDelete] = useState(false);

  const student = students.find((item) => item.id === studentId);
  const group = groups.find((item) => item.id === student?.groupId);
  const balance = student ? balances.get(student.id) : undefined;

  if (!student) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/students"
          className="flex min-h-11 items-center gap-2 text-[13px] text-muted"
        >
          <ArrowRight size={16} aria-hidden />
          {t.students.title}
        </Link>
        <EmptyState
          icon={<UserRound size={22} aria-hidden />}
          title={t.common.empty}
        />
      </div>
    );
  }

  const studentPayments = payments
    .filter((payment) => payment.studentId === student.id)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const studentAttendance = attendance
    .filter((row) => row.studentId === student.id)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const cycleByRow = computeAttendanceCycles(
    student,
    attendance,
    sessionsById,
    settings,
  );
  const currency = settings.currencyLabel || t.common.currency;

  const phoneDigits = student.phone?.replace(/[^\d+]/g, "") ?? "";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/students"
          className="mb-2 flex min-h-8 items-center gap-1 text-[13px] text-muted"
        >
          <ArrowRight size={15} aria-hidden />
          {t.students.title}
        </Link>
        <PageHeader
          title={student.name}
          subtitle={group?.name}
          action={
            balance ? (
              <BalanceChip
                balance={balance}
                t={t}
                cycleLength={settings.cycleLength}
                currencyLabel={currency}
              />
            ) : undefined
          }
        />
      </div>

      <GlassCard className="flex items-center gap-4 p-4">
        <CounterRing
          position={balance?.cyclePosition ?? 0}
          length={settings.cycleLength}
          size={64}
        />
        <div className="flex flex-1 flex-col gap-1 text-[13px]">
          <span className="text-muted">
            {t.students.price}:{" "}
            <NumberText className="font-semibold text-ink">
              {formatMoney(student.pricePerSession, currency)}
            </NumberText>
          </span>
          <span className="text-muted">
            {t.students.startDate}:{" "}
            <NumberText className="font-semibold text-ink">
              {formatArabicDate(
                student.startedAtKey,
                { day: "numeric", month: "short", year: "numeric" },
                locale,
              )}
            </NumberText>
          </span>
          {balance ? (
            <span className="text-muted">
              {t.students.sessionOf
                .replace("{position}", String(balance.cyclePosition))
                .replace("{length}", String(settings.cycleLength))}
            </span>
          ) : null}
        </div>
      </GlassCard>

      {student.phone ? (
        <div className="grid grid-cols-2 gap-3">
          <a
            href={`tel:${phoneDigits}`}
            className="press flex min-h-12 items-center justify-center gap-2 rounded-btn border border-white/70 bg-white/60 text-[14px] font-medium"
          >
            <Phone size={16} className="text-primary" aria-hidden />
            {t.students.phone}
          </a>
          <a
            href={`https://wa.me/${phoneDigits.replace(/^\+/, "")}`}
            target="_blank"
            rel="noreferrer"
            className="press flex min-h-12 items-center justify-center gap-2 rounded-btn border border-white/70 bg-white/60 text-[14px] font-medium"
          >
            <Wallet size={16} className="text-primary" aria-hidden />
            {t.dues.whatsapp}
          </a>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setEditingPayment(null);
            setPaymentStartDelete(false);
            setPaymentOpen(true);
          }}
          className="press flex min-h-11 items-center justify-center gap-1.5 rounded-btn bg-primary text-[12.5px] font-semibold text-white"
        >
          <Wallet size={15} aria-hidden />
          {t.dues.record}
        </button>
        <Link
          href={`/students/${student.id}/edit`}
          className="press flex min-h-11 items-center justify-center gap-1.5 rounded-btn border border-white/70 bg-white/60 text-[12.5px] font-medium"
        >
          <Pencil size={15} className="text-primary" aria-hidden />
          {t.forms.editAction}
        </Link>
        <button
          type="button"
          onClick={() => setMoveOpen(true)}
          className="press flex min-h-11 items-center justify-center gap-1.5 rounded-btn border border-white/70 bg-white/60 text-[12.5px] font-medium"
        >
          <MoveRight size={15} className="text-primary" aria-hidden />
          {t.forms.moveAction}
        </button>
        <button
          type="button"
          onClick={() => setArchiveOpen(true)}
          className="press flex min-h-11 items-center justify-center gap-1.5 rounded-btn border border-white/70 bg-white/60 text-[12.5px] font-medium"
        >
          {student.active ? (
            <Archive size={15} className="text-danger" aria-hidden />
          ) : (
            <ArchiveRestore size={15} className="text-primary" aria-hidden />
          )}
          {student.active ? t.forms.archiveAction : t.forms.unarchiveAction}
        </button>
      </div>

      {actionError ? (
        <p role="alert" className="text-[12.5px] text-danger">
          {t.forms.saveFailed}
        </p>
      ) : null}

      <Sheet
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        title={student.active ? t.students.archive : t.students.unarchive}
      >
        <ConfirmCard
          title={
            student.active
              ? t.forms.confirmArchiveStudentTitle
              : t.forms.confirmUnarchiveTitle
          }
          body={
            student.active
              ? t.forms.confirmArchiveStudentBody
              : t.forms.confirmUnarchiveBody
          }
          confirmLabel={
            student.active ? t.forms.archiveAction : t.forms.unarchiveAction
          }
          cancelLabel={t.common.cancel}
          tone={student.active ? "danger" : "primary"}
          busy={busy}
          onCancel={() => setArchiveOpen(false)}
          onConfirm={() => {
            if (!uid) return;
            setBusy(true);
            setActionError(false);
            void setStudentActiveAndReconcile(uid, student.id, !student.active, {
              students,
              sessionsById,
              attendance,
              payments,
              settings,
            })
              .then(() => setArchiveOpen(false))
              .catch(() => setActionError(true))
              .finally(() => setBusy(false));
          }}
        />
      </Sheet>

      <Sheet
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        title={t.students.moveGroup}
      >
        {groups.filter((group) => group.active && group.id !== student.groupId)
          .length === 0 ? (
          <p className="text-[13px] text-muted">{t.forms.noActiveGroups}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {groups
              .filter((group) => group.active && group.id !== student.groupId)
              .map((group) => (
                <li key={group.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setMoveOpen(false);
                      setPendingGroupId(group.id);
                    }}
                    className="press flex min-h-12 w-full items-center gap-2 rounded-btn px-3 text-[14px] hover:bg-white/50"
                  >
                    <FolderOpen size={18} className="text-primary" aria-hidden />
                    {group.name}
                  </button>
                </li>
              ))}
          </ul>
        )}
      </Sheet>

      <Sheet
        open={pendingGroupId !== null}
        onClose={() => setPendingGroupId(null)}
        title={t.students.moveGroup}
      >
        <ConfirmCard
          title={t.forms.confirmMoveTitle}
          body={t.forms.confirmMoveBody}
          confirmLabel={t.forms.moveAction}
          cancelLabel={t.common.cancel}
          tone="primary"
          busy={busy}
          onCancel={() => setPendingGroupId(null)}
          onConfirm={() => {
            if (!uid || !pendingGroupId) return;
            setBusy(true);
            setActionError(false);
            void moveStudentAndReconcile(uid, student.id, pendingGroupId, {
              students,
              sessionsById,
              attendance,
              payments,
              settings,
            })
              .then(() => setPendingGroupId(null))
              .catch(() => setActionError(true))
              .finally(() => setBusy(false));
          }}
        />
      </Sheet>

      <section>
        <SectionHeader title={t.students.attendanceHistory} />
        {studentAttendance.length === 0 ? (
          <EmptyState
            icon={<CalendarDays size={20} aria-hidden />}
            title={t.students.noHistory}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {studentAttendance.slice(0, 12).map((row) => {
              const session = sessionsById.get(row.sessionId);
              return (
                <li
                  key={row.id}
                  className="glass-card flex items-center justify-between gap-2 px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium">
                      {session?.groupName ?? "—"}
                    </p>
                    <p className="text-[12px] text-muted">
                      <NumberText>
                        {formatArabicDate(
                          row.dateKey,
                          { day: "numeric", month: "short" },
                          locale,
                        )}
                      </NumberText>
                      </p>
                      {cycleByRow.has(row.id) ? (
                        <StatusChip tone="neutral" className="mt-1">
                          {format(t.students.cycleNumber, {
                            n: cycleByRow.get(row.id) ?? 0,
                          })}
                        </StatusChip>
                      ) : null}
                    </div>
                    <StatusChip
                      tone={row.status === "present" ? "success" : "danger"}
                    >
                    {row.status === "present"
                      ? t.attendance.present
                      : t.attendance.absent}
                  </StatusChip>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <SectionHeader title={t.students.paymentsHistory} />
        {studentPayments.length === 0 ? (
          <EmptyState
            icon={<Wallet size={20} aria-hidden />}
            title={t.students.noHistory}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {studentPayments.map((payment) => (
              <li
                key={payment.id}
                className="glass-card flex items-center justify-between gap-2 px-3.5 py-3"
              >
                <div>
                  <p className="text-[14px] font-semibold">
                    <NumberText>
                      {formatMoney(payment.amount, currency)}
                    </NumberText>
                  </p>
                  <p className="text-[12px] text-muted">
                    <NumberText>
                      {formatArabicDate(
                        payment.dateKey,
                        { day: "numeric", month: "short" },
                        locale,
                      )}
                    </NumberText>{" "}
                    · <NumberText>{payment.sessionsCovered}</NumberText>{" "}
                    {t.today.sessionsToday}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    aria-label={t.common.edit}
                    onClick={() => {
                      setEditingPayment(payment);
                      setPaymentStartDelete(false);
                      setPaymentOpen(true);
                    }}
                    className="press rounded-full p-2 text-muted hover:text-primary"
                  >
                    <Pencil size={15} aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={t.common.delete}
                    onClick={() => {
                      setEditingPayment(payment);
                      setPaymentStartDelete(true);
                      setPaymentOpen(true);
                    }}
                    className="press rounded-full p-2 text-muted hover:text-danger"
                  >
                    <Trash2 size={15} aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {paymentOpen ? (
        <PaymentSheet
          key={`${editingPayment?.id ?? "new"}-${paymentStartDelete ? "delete" : "edit"}`}
          open
          onClose={() => setPaymentOpen(false)}
          student={student}
          payment={editingPayment ?? undefined}
          initialDelete={paymentStartDelete}
        />
      ) : null}
    </div>
  );
}
