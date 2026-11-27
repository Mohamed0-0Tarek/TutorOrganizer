"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Plus, Trash2, Users } from "lucide-react";
import { BalanceChip } from "@/components/features/BalanceChip";
import { BigPrimaryButton } from "@/components/ui/BigPrimaryButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, inputClass } from "@/components/ui/Field";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader, SectionHeader } from "@/components/ui/Headers";
import { Sheet } from "@/components/ui/Sheet";
import { useTutorData } from "@/data/provider/hooks";
import { bulkEnrollStudents } from "@/data/services/enrollmentService";
import type { CreateStudentInput } from "@/data/services/studentService";
import { calculateBalance } from "@/domain/balanceCalculator";
import { todayKey } from "@/domain/dateKey";
import type { StudentBalance } from "@/domain/types";
import {
  normalizeCount,
  normalizeDateKey,
  normalizeName,
  normalizePhone,
  normalizePrice,
  type ValidationErrorKey,
} from "@/domain/validation";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";

type RowErrors = Partial<
  Record<"name" | "price" | "initialCounted" | "initialPaid" | "phone", string>
>;

type Row = {
  key: string;
  name: string;
  price: string;
  priceTouched: boolean;
  initialCounted: string;
  initialPaid: string;
  phone: string;
};

export function BulkStudentForm() {
  const { t } = useI18n();
  const router = useRouter();
  const { uid, groups, settings, students, sessionsById, attendance, payments } =
    useTutorData();

  const activeGroups = useMemo(() => groups.filter((group) => group.active), [groups]);
  const [fromGroupQuery] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("groupId"),
  );

  const [groupId, setGroupId] = useState(() => {
    const requested =
      typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get("groupId");
    if (requested && groups.some((group) => group.active && group.id === requested)) {
      return requested;
    }
    return groups.find((group) => group.active)?.id ?? "";
  });
  const [defaultPrice, setDefaultPrice] = useState("50");
  const [sharedDate, setSharedDate] = useState(() => todayKey());

  function newKey(): string {
    return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  }

  function makeRow(overrides: Partial<Row> = {}): Row {
    return {
      key: newKey(),
      name: "",
      price: defaultPrice,
      priceTouched: false,
      initialCounted: "0",
      initialPaid: "0",
      phone: "",
      ...overrides,
    };
  }

  const [rows, setRows] = useState<Row[]>(() => [
    makeRow(),
    makeRow(),
    makeRow(),
  ]);
  const [errors, setErrors] = useState<Record<string, RowErrors>>({});
  const [groupError, setGroupError] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const nameRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (focusKey) nameRefs.current[focusKey]?.focus();
  }, [focusKey, rows.length]);

  const hasNames = rows.some((row) => row.name.trim().length > 0);
  useEffect(() => {
    if (!hasNames) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasNames]);

  function isBlank(row: Row): boolean {
    const counted = row.initialCounted.trim();
    const paid = row.initialPaid.trim();
    return (
      !row.name.trim() &&
      !row.phone.trim() &&
      (counted === "" || counted === "0") &&
      (paid === "" || paid === "0")
    );
  }

  function previewFor(row: Row): StudentBalance | undefined {
    if (
      !row.price.trim() ||
      !row.initialCounted.trim() ||
      !row.initialPaid.trim()
    ) {
      return undefined;
    }
    const price = normalizePrice(row.price);
    const counted = normalizeCount(row.initialCounted);
    const paid = normalizeCount(row.initialPaid);
    if (!price.ok || !counted.ok || !paid.ok) return undefined;
    return calculateBalance({
      counted: counted.value,
      paid: paid.value,
      pricePerSession: price.value,
      cycleLength: settings.cycleLength,
    });
  }

  function changeDefaultPrice(value: string) {
    setDefaultPrice(value);
    setRows((current) =>
      current.map((row) =>
        row.priceTouched ? row : { ...row, price: value },
      ),
    );
  }

  function changeRow(rowKey: string, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row) => (row.key === rowKey ? { ...row, ...patch } : row)),
    );
    setErrors((current) => {
      if (!current[rowKey]) return current;
      const next = { ...current };
      next[rowKey] = {};
      return next;
    });
  }

  function addRow() {
    const row = makeRow({ price: defaultPrice });
    setRows((current) => [...current, row]);
    setFocusKey(row.key);
  }

  function removeRow(rowKey: string) {
    setRows((current) =>
      current.length > 1 ? current.filter((row) => row.key !== rowKey) : current,
    );
  }

  function applyPaste() {
    const names = pasteText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    setRows((current) => {
      let lastFilled = -1;
      current.forEach((row, index) => {
        if (!isBlank(row)) lastFilled = index;
      });
      const next = current.slice(0, lastFilled + 1);
      for (const name of names) {
        const blank = next.findIndex((row) => isBlank(row));
        if (blank >= 0) next[blank] = { ...next[blank], name, price: defaultPrice };
        else next.push(makeRow({ name, price: defaultPrice }));
      }
      return next.length > 0 ? next : [makeRow({ price: defaultPrice })];
    });
    setErrors({});
    setPasteOpen(false);
    setPasteText("");
  }

  function messageFor(error: ValidationErrorKey): string {
    return t.forms[error];
  }

  function validateAll(): boolean {
    setGroupError(!groupId);
    const date = normalizeDateKey(sharedDate);
    setDateError(date.ok ? null : messageFor(date.error));

    const nextErrors: Record<string, RowErrors> = {};
    let valid = Boolean(groupId) && date.ok;
    for (const row of rows) {
      if (isBlank(row)) continue;
      const rowErrors: RowErrors = {};
      const name = normalizeName(row.name);
      if (!name.ok) rowErrors.name = messageFor(name.error);
      const price = normalizePrice(row.price);
      if (!price.ok) rowErrors.price = messageFor(price.error);
      const counted = normalizeCount(row.initialCounted);
      if (!counted.ok) rowErrors.initialCounted = messageFor(counted.error);
      const paid = normalizeCount(row.initialPaid);
      if (!paid.ok) rowErrors.initialPaid = messageFor(paid.error);
      const phone = normalizePhone(row.phone);
      if (!phone.ok) rowErrors.phone = messageFor(phone.error);
      if (Object.keys(rowErrors).length > 0) {
        nextErrors[row.key] = rowErrors;
        valid = false;
      }
    }
    setErrors(nextErrors);
    return valid;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uid || !groupId || busy) return;
    setMessage(null);
    if (!validateAll()) return;

    const date = normalizeDateKey(sharedDate);
    if (!date.ok) return;
    const inputs: CreateStudentInput[] = [];
    for (const row of rows) {
      if (isBlank(row)) continue;
      const name = normalizeName(row.name);
      const price = normalizePrice(row.price);
      const counted = normalizeCount(row.initialCounted);
      const paid = normalizeCount(row.initialPaid);
      const phone = normalizePhone(row.phone);
      if (
        !name.ok ||
        !price.ok ||
        !counted.ok ||
        !paid.ok ||
        !phone.ok
      ) {
        return;
      }
      inputs.push({
        name: name.value,
        groupId,
        pricePerSession: price.value,
        startedAtKey: date.value,
        initialCounted: counted.value,
        initialPaid: paid.value,
        ...(phone.value ? { phone: phone.value } : {}),
      });
    }
    if (inputs.length === 0) {
      setMessage(t.bulk.needOne);
      return;
    }

    setBusy(true);
    try {
      await bulkEnrollStudents(uid, inputs, {
        students,
        sessionsById,
        attendance,
        payments,
        settings,
      });
      router.push(fromGroupQuery ? `/groups/${groupId}` : "/students");
    } catch {
      setMessage(t.bulk.saveFailed);
      setBusy(false);
    }
  }

  if (activeGroups.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <PageHeader title={t.bulk.title} subtitle={t.bulk.subtitle} />
        <EmptyState
          icon={<Users size={22} aria-hidden />}
          title={t.groups.noGroups}
          body={t.bulk.noGroupsBody}
          action={
            <Link href="/groups/new">
              <BigPrimaryButton>{t.bulk.goToGroups}</BigPrimaryButton>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="mx-auto flex w-full max-w-md flex-col gap-5"
    >
      <PageHeader title={t.bulk.title} subtitle={t.bulk.subtitle} />

      <GlassCard className="flex flex-col gap-3 p-4">
        <p className="text-[14px] font-semibold">{t.bulk.defaultsTitle}</p>
        <p className="text-[12px] leading-5 text-muted">{t.bulk.defaultsHint}</p>
        <Field
          label={t.students.group}
          error={groupError ? t.forms.groupRequired : undefined}
        >
          <select
            id="bulk-group"
            className={inputClass}
            value={groupId}
            onChange={(event) => {
              setGroupId(event.target.value);
              setGroupError(false);
            }}
            required
          >
            {activeGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.bulk.defaultPrice}>
            <input
              type="number"
              inputMode="numeric"
              dir="ltr"
              min={0}
              step={1}
              className={`${inputClass} tabular-nums`}
              value={defaultPrice}
              onChange={(event) => changeDefaultPrice(event.target.value)}
              required
            />
          </Field>
          <Field label={t.bulk.sharedDate} error={dateError ?? undefined}>
            <input
              type="date"
              dir="ltr"
              className={`${inputClass} tabular-nums`}
              value={sharedDate}
              onChange={(event) => setSharedDate(event.target.value)}
              required
            />
          </Field>
        </div>
      </GlassCard>

      <div className="flex items-center justify-between gap-2">
        <SectionHeader title={t.bulk.studentsTitle} />
        <button
          type="button"
          onClick={() => setPasteOpen(true)}
          className="press shrink-0 rounded-full bg-white/60 px-3 py-1.5 text-[12.5px] font-medium text-primary-dark"
        >
          {t.bulk.pasteNames}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((row, index) => {
          const rowErrors = errors[row.key] ?? {};
          const preview = previewFor(row);
          return (
            <GlassCard key={row.key} className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="shrink-0 text-[13px] font-semibold">
                  {format(t.bulk.rowLabel, { n: index + 1 })}
                </p>
                <div className="flex min-w-0 items-center gap-2">
                  {preview ? (
                    <BalanceChip
                      balance={preview}
                      t={t}
                      cycleLength={settings.cycleLength}
                      currencyLabel={settings.currencyLabel || t.common.currency}
                    />
                  ) : null}
                  <button
                    type="button"
                    aria-label={t.bulk.remove}
                    disabled={rows.length === 1}
                    onClick={() => removeRow(row.key)}
                    className="press shrink-0 rounded-full p-2 text-muted hover:text-danger disabled:opacity-40"
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>
              </div>

              <Field
                label={t.bulk.rowName}
                htmlFor={`bulk-name-${row.key}`}
                error={rowErrors.name}
              >
                <input
                  id={`bulk-name-${row.key}`}
                  ref={(node) => {
                    nameRefs.current[row.key] = node;
                  }}
                  className={inputClass}
                  value={row.name}
                  onChange={(event) =>
                    changeRow(row.key, { name: event.target.value })
                  }
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label={t.bulk.price} error={rowErrors.price}>
                  <input
                    type="number"
                    inputMode="numeric"
                    dir="ltr"
                    min={0}
                    step={1}
                    className={`${inputClass} tabular-nums`}
                    value={row.price}
                    onChange={(event) =>
                      changeRow(row.key, {
                        price: event.target.value,
                        priceTouched: true,
                      })
                    }
                    required
                  />
                </Field>
                <Field
                  label={t.students.initialCounted}
                  error={rowErrors.initialCounted}
                >
                  <input
                    type="number"
                    inputMode="numeric"
                    dir="ltr"
                    min={0}
                    step={1}
                    className={`${inputClass} tabular-nums`}
                    value={row.initialCounted}
                    onChange={(event) =>
                      changeRow(row.key, { initialCounted: event.target.value })
                    }
                    required
                  />
                </Field>
                <Field label={t.students.initialPaid} error={rowErrors.initialPaid}>
                  <input
                    type="number"
                    inputMode="numeric"
                    dir="ltr"
                    min={0}
                    step={1}
                    className={`${inputClass} tabular-nums`}
                    value={row.initialPaid}
                    onChange={(event) =>
                      changeRow(row.key, { initialPaid: event.target.value })
                    }
                    required
                  />
                </Field>
                <Field label={t.bulk.phone} error={rowErrors.phone}>
                  <input
                    type="tel"
                    inputMode="tel"
                    dir="ltr"
                    className={`${inputClass} tabular-nums`}
                    value={row.phone}
                    onChange={(event) =>
                      changeRow(row.key, { phone: event.target.value })
                    }
                  />
                </Field>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <BigPrimaryButton variant="ghost" onClick={addRow}>
            <Plus size={16} aria-hidden />
            {t.bulk.addAnother}
          </BigPrimaryButton>
        </div>
      </div>

      {message ? (
        <p role="alert" className="text-[12.5px] text-danger">
          {message}
        </p>
      ) : null}

      <BigPrimaryButton type="submit" disabled={busy || !uid}>
        {busy ? t.forms.saving : t.common.save}
      </BigPrimaryButton>

      <Link
        href={fromGroupQuery ? "/groups" : "/students"}
        className="flex min-h-11 items-center justify-center gap-1 text-[13px] text-muted"
      >
        <ArrowRight size={15} aria-hidden />
        {t.common.cancel}
      </Link>

      <Sheet
        open={pasteOpen}
        onClose={() => {
          setPasteOpen(false);
          setPasteText("");
        }}
        title={t.bulk.pasteTitle}
      >
        <div className="flex flex-col gap-3">
          <p className="text-[12.5px] leading-6 text-muted">{t.bulk.pasteHint}</p>
          <Field label={t.bulk.pasteNames}>
            <textarea
              rows={8}
              dir="rtl"
              placeholder={t.bulk.pastePlaceholder}
              className={inputClass}
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
            />
          </Field>
          <BigPrimaryButton
            onClick={applyPaste}
            disabled={!pasteText.trim()}
          >
            {t.bulk.pasteConfirm}
          </BigPrimaryButton>
        </div>
      </Sheet>
    </form>
  );
}
