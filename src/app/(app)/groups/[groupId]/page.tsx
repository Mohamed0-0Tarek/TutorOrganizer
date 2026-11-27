"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  Clock,
  FolderOpen,
  Pencil,
  UserRound,
} from "lucide-react";
import { BalanceChip } from "@/components/features/BalanceChip";
import { ConfirmCard } from "@/components/ui/ConfirmCard";
import { CounterRing } from "@/components/ui/CounterRing";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader, SectionHeader } from "@/components/ui/Headers";
import { NumberText } from "@/components/ui/NumberText";
import { Sheet } from "@/components/ui/Sheet";
import { StatusChip } from "@/components/ui/StatusChip";
import { useTutorData } from "@/data/provider/hooks";
import { setGroupActive } from "@/data/services/groupService";
import { useI18n } from "@/i18n/I18nProvider";
import { weekdayLabel } from "@/lib/weekdays";

export default function GroupDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const raw = params.groupId;
  const groupId = Array.isArray(raw) ? raw[0] : raw;

  const { groups, students, balances, settings, uid } = useTutorData();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(false);
  const group = groups.find((item) => item.id === groupId);
  const groupStudents = students
    .filter((student) => student.groupId === groupId && student.active)
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));

  if (!group) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/groups"
          className="flex min-h-11 items-center gap-2 text-[13px] text-muted"
        >
          <ArrowRight size={16} aria-hidden />
          {t.groups.title}
        </Link>
        <EmptyState
          icon={<FolderOpen size={22} aria-hidden />}
          title={t.common.empty}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/groups"
          className="mb-2 flex min-h-8 items-center gap-1 text-[13px] text-muted"
        >
          <ArrowRight size={15} aria-hidden />
          {t.groups.title}
        </Link>
        <PageHeader
          title={group.name}
          subtitle={group.subject}
          action={
            !group.active ? (
              <StatusChip tone="neutral">{t.groups.archived}</StatusChip>
            ) : undefined
          }
        />
      </div>

      <GlassCard className="flex flex-col gap-2 p-4">
        <p className="text-[13px] font-medium text-muted">{t.groups.slots}</p>
        {group.slots.length === 0 ? (
          <p className="text-[13px] text-muted">{t.common.empty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {group.slots.map((slot, index) => (
              <li
                key={`${slot.weekday}-${slot.time}-${index}`}
                className="flex items-center gap-2 text-[14px]"
              >
                <Clock size={15} className="text-primary" aria-hidden />
                {weekdayLabel(t, slot.weekday)}
                <span className="text-muted">·</span>
                <NumberText>{slot.time}</NumberText>
                <span className="text-muted">·</span>
                <NumberText>{slot.durationMin}</NumberText>
                <span className="text-[12px] text-muted">
                  {t.groups.minutesShort}
                </span>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <div className="flex gap-2">
        <Link
          href={`/groups/${group.id}/edit`}
          className="press flex min-h-12 flex-1 items-center justify-center gap-2 rounded-btn border border-white/70 bg-white/60 text-[14px] font-medium"
        >
          <Pencil size={16} className="text-primary" aria-hidden />
          {t.forms.editAction}
        </Link>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="press flex min-h-12 flex-1 items-center justify-center gap-2 rounded-btn border border-white/70 bg-white/60 text-[14px] font-medium"
        >
          {group.active ? (
            <Archive size={16} className="text-danger" aria-hidden />
          ) : (
            <ArchiveRestore size={16} className="text-primary" aria-hidden />
          )}
          {group.active ? t.forms.archiveAction : t.forms.unarchiveAction}
        </button>
      </div>

      <Sheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={group.active ? t.groups.archive : t.forms.unarchiveAction}
      >
        <ConfirmCard
          title={
            group.active
              ? t.forms.confirmArchiveGroupTitle
              : t.forms.confirmUnarchiveTitle
          }
          body={
            group.active
              ? t.forms.confirmArchiveGroupBody
              : t.forms.confirmUnarchiveBody
          }
          confirmLabel={
            group.active ? t.forms.archiveAction : t.forms.unarchiveAction
          }
          cancelLabel={t.common.cancel}
          tone={group.active ? "danger" : "primary"}
          busy={busy}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            if (!uid) return;
            setBusy(true);
            setActionError(false);
            void setGroupActive(uid, group.id, !group.active)
              .then(() => setConfirmOpen(false))
              .catch(() => setActionError(true))
              .finally(() => setBusy(false));
          }}
        />
      </Sheet>

      {actionError ? (
        <p role="alert" className="text-[12.5px] text-danger">
          {t.forms.saveFailed}
        </p>
      ) : null}

      <section>
        <SectionHeader
          title={t.students.title}
          action={
            <Link
              href={`/students/new?groupId=${group.id}`}
              className="press flex min-h-9 items-center gap-1 rounded-full bg-primary px-3 text-[12.5px] font-semibold text-white"
            >
              <UserRound size={14} aria-hidden />
              {t.students.addStudent}
            </Link>
          }
        />
        {groupStudents.length === 0 ? (
          <EmptyState
            icon={<UserRound size={20} aria-hidden />}
            title={t.students.noStudents}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {groupStudents.map((student) => {
              const balance = balances.get(student.id);
              return (
                <li key={student.id}>
                  <Link href={`/students/${student.id}`} className="press block">
                    <GlassCard className="flex items-center gap-3 px-3.5 py-3">
                      <CounterRing
                        position={balance?.cyclePosition ?? 0}
                        length={settings.cycleLength}
                      />
                      <p className="min-w-0 flex-1 truncate text-[14px] font-medium">
                        {student.name}
                      </p>
                      {balance ? (
                        <BalanceChip
                          balance={balance}
                          t={t}
                          cycleLength={settings.cycleLength}
                          currencyLabel={settings.currencyLabel || t.common.currency}
                        />
                      ) : null}
                    </GlassCard>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
