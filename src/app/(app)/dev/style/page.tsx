"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BigPrimaryButton } from "@/components/ui/BigPrimaryButton";
import { CounterRing } from "@/components/ui/CounterRing";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader, SectionHeader } from "@/components/ui/Headers";
import { NumberText } from "@/components/ui/NumberText";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatMoney } from "@/domain/money";
import { useI18n } from "@/i18n/I18nProvider";

const swatches = [
  { name: "canvas", className: "bg-canvas" },
  { name: "sand", className: "bg-sand" },
  { name: "sage-soft", className: "bg-sage-soft" },
  { name: "clay-soft", className: "bg-clay-soft" },
  { name: "primary", className: "bg-primary" },
  { name: "primary-dark", className: "bg-primary-dark" },
  { name: "accent", className: "bg-accent" },
  { name: "ink", className: "bg-ink" },
  { name: "muted", className: "bg-muted" },
  { name: "success", className: "bg-success" },
  { name: "warning", className: "bg-warning" },
  { name: "danger", className: "bg-danger" },
  { name: "info", className: "bg-info" },
];

export default function StyleGalleryPage() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/dev"
          className="mb-2 flex min-h-8 items-center gap-1 text-[13px] text-muted"
        >
          <ArrowRight size={15} aria-hidden />
          {t.dev.title}
        </Link>
        <PageHeader
          title={t.dev.styleGallery}
          subtitle={t.dev.styleGalleryBody}
        />
      </div>

      <section>
        <SectionHeader title={t.dev.styleGallery} />
        <GlassCard className="grid grid-cols-4 gap-2 p-3">
          {swatches.map((swatch) => (
            <div key={swatch.name} className="flex flex-col items-center gap-1">
              <span
                className={`h-10 w-full rounded-btn border border-white/60 ${swatch.className}`}
              />
              <span className="text-[10px] text-muted">{swatch.name}</span>
            </div>
          ))}
        </GlassCard>
      </section>

      <section>
        <SectionHeader title={t.schedule.title} />
        <GlassCard className="flex flex-col gap-2 p-4">
          <p className="text-[15px] font-semibold">{t.common.appName}</p>
          <p className="text-[13px] text-muted">{t.common.appTagline}</p>
          <p className="text-[13px]">
            {t.today.dueAmount}:{" "}
            <NumberText className="font-semibold">
              {formatMoney(1250, t.common.currency)}
            </NumberText>
          </p>
        </GlassCard>
      </section>

      <section>
        <SectionHeader title={t.attendance.present} />
        <GlassCard className="flex flex-wrap items-center gap-2 p-3">
          <StatusChip tone="success">{t.attendance.present}</StatusChip>
          <StatusChip tone="danger">{t.attendance.absent}</StatusChip>
          <StatusChip tone="warning">{t.schedule.scheduled}</StatusChip>
          <StatusChip tone="info">{t.schedule.extra}</StatusChip>
          <StatusChip tone="neutral">{t.groups.archived}</StatusChip>
        </GlassCard>
      </section>

      <section>
        <SectionHeader title={t.groups.title} />
        <GlassCard className="flex items-center justify-around gap-3 p-4">
          <CounterRing position={0} length={4} />
          <CounterRing position={3} length={4} />
          <CounterRing position={4} length={4} size={56} />
          <CounterRing position={6} length={8} size={56} />
        </GlassCard>
      </section>

      <section className="flex flex-col gap-2">
        <BigPrimaryButton>{t.common.save}</BigPrimaryButton>
        <BigPrimaryButton variant="ghost">{t.common.cancel}</BigPrimaryButton>
      </section>

      <EmptyState
        icon={<ArrowRight size={20} aria-hidden />}
        title={t.common.empty}
        body={t.common.errorBody}
      />
    </div>
  );
}
