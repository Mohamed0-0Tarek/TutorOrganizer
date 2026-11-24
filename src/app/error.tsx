"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { useI18n } from "@/i18n/I18nProvider";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md items-center justify-center px-5">
      <ErrorState
        title={t.common.errorTitle}
        body={t.common.errorBody}
        retryLabel={t.common.retry}
        onRetry={reset}
      />
    </div>
  );
}
