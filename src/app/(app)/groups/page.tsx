"use client";

import Link from "next/link";
import { FolderOpen, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/Headers";
import { NumberText } from "@/components/ui/NumberText";
import { StatusChip } from "@/components/ui/StatusChip";
import { useTutorData } from "@/data/provider/hooks";
import { computeGroupStatus } from "@/domain/groupPosition";
import { useI18n } from "@/i18n/I18nProvider";
import { weekdayLabel } from "@/lib/weekdays";

export default function GroupsPage() {
  const { t } = useI18n();
  const { groups, students, balances, settings } = useTutorData();

  const sorted = [...groups].sort(
    (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "ar"),
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.groups.title}
        subtitle={`${groups.filter((group) => group.active).length} ${t.students.active}`}
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={22} aria-hidden />}
          title={t.groups.noGroups}
          body={t.groups.noGroupsBody}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((group) => {
            const groupStudents = students.filter(
              (student) => student.groupId === group.id && student.active,
            );
            const status = computeGroupStatus(groupStudents, balances);
            return (
              <li key={group.id}>
                <Link href={`/groups/${group.id}`} className="press block">
                  <GlassCard className="flex flex-col gap-2 p-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <FolderOpen size={16} aria-hidden />
                      </span>
                      <p className="flex-1 truncate text-[15px] font-semibold">
                        {group.name}
                      </p>
                      {!group.active ? (
                        <StatusChip tone="neutral">{t.groups.archived}</StatusChip>
                      ) : null}
                      {status.position > 0 ? (
                        <StatusChip tone="info">
                          <NumberText>
                            {status.position}
                          </NumberText>
                          /<NumberText>{settings.cycleLength}</NumberText>
                        </StatusChip>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Users size={13} aria-hidden />
                        <NumberText>{groupStudents.length}</NumberText>{" "}
                        {t.groups.studentsCount}
                      </span>
                      {group.slots.map((slot, index) => (
                        <span key={`${slot.weekday}-${slot.time}-${index}`}>
                          {weekdayLabel(t, slot.weekday)} ·{" "}
                          <NumberText>{slot.time}</NumberText>
                        </span>
                      ))}
                    </div>

                    {status.outliers.length > 0 ? (
                      <p className="text-[12px] text-warning">
                        {t.groups.outliers}:{" "}
                        {status.outliers
                          .map(
                            (outlier) =>
                              `${outlier.name} ${outlier.position}/${settings.cycleLength}`,
                          )
                          .join(" · ")}
                      </p>
                    ) : null}
                  </GlassCard>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
