"use client";

import Link from "next/link";
import { ArrowLeft, FolderOpen, Users } from "lucide-react";
import { BigPrimaryButton } from "@/components/ui/BigPrimaryButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { useI18n } from "@/i18n/I18nProvider";

export default function OnboardingPage() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-4">
      <GlassCard className="p-5">
        <h1 className="text-[22px] font-bold">{t.auth.onboardingTitle}</h1>
        <p className="mt-2 text-[13.5px] leading-6 text-muted">
          {t.auth.onboardingBody}
        </p>

        <ol className="mt-4 flex flex-col gap-2 text-[14px]">
          <li className="flex items-center gap-3 rounded-btn bg-white/50 px-3 py-3">
            <FolderOpen size={20} className="text-primary" aria-hidden />
            {t.groups.addGroup}
          </li>
          <li className="flex items-center gap-3 rounded-btn bg-white/50 px-3 py-3">
            <Users size={20} className="text-primary" aria-hidden />
            {t.students.addStudent}
          </li>
        </ol>

        <div className="mt-5 flex flex-col gap-2">
          <Link href="/groups">
            <BigPrimaryButton>{t.today.goToGroups}</BigPrimaryButton>
          </Link>
          <Link
            href="/"
            className="flex min-h-11 items-center justify-center gap-2 text-[13px] text-muted"
          >
            <ArrowLeft size={16} aria-hidden />
            {t.auth.skipForNow}
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
