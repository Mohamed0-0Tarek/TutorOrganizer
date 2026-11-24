"use client";

import { useParams } from "next/navigation";
import { GroupForm } from "@/components/features/GroupForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { FolderOpen } from "lucide-react";
import { useTutorData } from "@/data/provider/hooks";
import { useI18n } from "@/i18n/I18nProvider";

export default function EditGroupPage() {
  const params = useParams();
  const raw = params.groupId;
  const groupId = Array.isArray(raw) ? raw[0] : raw;
  const { groups } = useTutorData();
  const { t } = useI18n();

  const group = groups.find((item) => item.id === groupId);
  if (!group) {
    return (
      <EmptyState
        icon={<FolderOpen size={22} aria-hidden />}
        title={t.common.empty}
      />
    );
  }

  return <GroupForm group={group} />;
}
