import { AlertTriangle } from "lucide-react";
import { BigPrimaryButton } from "./BigPrimaryButton";

export function ErrorState({
  title,
  body,
  retryLabel,
  onRetry,
}: {
  title: string;
  body?: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="glass-card flex flex-col items-center gap-2 p-6 text-center">
      <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-danger/15 text-danger">
        <AlertTriangle size={22} aria-hidden />
      </div>
      <p className="text-[17px] font-semibold">{title}</p>
      {body ? <p className="text-[13.5px] leading-6 text-muted">{body}</p> : null}
      {onRetry ? (
        <div className="mt-3 w-full">
          <BigPrimaryButton variant="ghost" onClick={onRetry}>
            {retryLabel ?? "Retry"}
          </BigPrimaryButton>
        </div>
      ) : null}
    </div>
  );
}
