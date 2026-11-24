"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { BalanceChip } from "@/components/features/BalanceChip";
import { CounterRing } from "@/components/ui/CounterRing";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/Headers";
import { useTutorData } from "@/data/provider/hooks";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/I18nProvider";

type Filter = "all" | "due" | "paidAhead" | "archived";

export default function StudentsPage() {
  const { t } = useI18n();
  const { students, groups, balances, settings } = useTutorData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return students
      .filter((student) => {
        if (filter === "archived") return !student.active;
        if (!student.active) return false;
        const balance = balances.get(student.id);
        if (filter === "due") return balance?.state === "DUE";
        if (filter === "paidAhead") return balance?.state === "PAID_AHEAD";
        return true;
      })
      .filter((student) =>
        normalized ? student.name.toLowerCase().includes(normalized) : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [students, balances, filter, query]);

  const filters: Array<{ key: Filter; label: string }> = [
    { key: "all", label: t.students.filterAll },
    { key: "due", label: t.students.filterDue },
    { key: "paidAhead", label: t.students.filterPaidAhead },
    { key: "archived", label: t.students.filterArchived },
  ];

  const groupName = (groupId: string) =>
    groups.find((group) => group.id === groupId)?.name ?? "—";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.students.title}
        subtitle={`${students.filter((student) => student.active).length} ${t.students.active}`}
      />

      <div className="glass-card flex items-center gap-2 px-3 py-2">
        <Search size={18} className="text-muted" aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.students.searchPlaceholder}
          className="min-h-9 w-full bg-transparent text-[14px] outline-none placeholder:text-muted/80"
        />
      </div>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={cn(
              "press shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium",
              filter === item.key
                ? "bg-primary text-white"
                : "bg-white/55 text-muted",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Users size={22} aria-hidden />}
          title={query ? t.students.noResults : t.students.noStudents}
          body={query ? undefined : t.students.noStudentsBody}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((student) => {
            const balance = balances.get(student.id);
            return (
              <li key={student.id}>
                <Link href={`/students/${student.id}`} className="press block">
                  <GlassCard className="flex items-center gap-3 p-3.5">
                    <CounterRing
                      position={balance?.cyclePosition ?? 0}
                      length={settings.cycleLength}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold">
                        {student.name}
                      </p>
                      <p className="mt-0.5 truncate text-[12.5px] text-muted">
                        {groupName(student.groupId)}
                        {!student.active ? ` · ${t.students.archived}` : ""}
                      </p>
                    </div>
                    {balance ? (
                      <BalanceChip
                        balance={balance}
                        t={t}
                        cycleLength={settings.cycleLength}
                      />
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
