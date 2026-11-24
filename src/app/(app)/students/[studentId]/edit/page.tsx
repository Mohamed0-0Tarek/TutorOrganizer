"use client";

import { useParams } from "next/navigation";
import { UserRound } from "lucide-react";
import { StudentForm } from "@/components/features/StudentForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTutorData } from "@/data/provider/hooks";
import { useI18n } from "@/i18n/I18nProvider";

export default function EditStudentPage() {
  const params = useParams();
  const raw = params.studentId;
  const studentId = Array.isArray(raw) ? raw[0] : raw;
  const { students } = useTutorData();
  const { t } = useI18n();

  const student = students.find((item) => item.id === studentId);
  if (!student) {
    return (
      <EmptyState
        icon={<UserRound size={22} aria-hidden />}
        title={t.common.empty}
      />
    );
  }

  return <StudentForm student={student} />;
}
