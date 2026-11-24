import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { BigPrimaryButton } from "./BigPrimaryButton";

/** Inline confirmation — used inside a Sheet for destructive actions. */
export function ConfirmCard({
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}): ReactNode {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            tone === "danger" ? "bg-danger/15 text-danger" : "bg-primary/15 text-primary"
          }`}
        >
          <AlertTriangle size={16} aria-hidden />
        </span>
        <div>
          <p className="text-[15px] font-semibold">{title}</p>
          {body ? <p className="mt-1 text-[13px] leading-5 text-muted">{body}</p> : null}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <BigPrimaryButton variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </BigPrimaryButton>
        </div>
        <div className="flex-1">
          <BigPrimaryButton
            onClick={onConfirm}
            disabled={busy}
            className={
              tone === "danger"
                ? "bg-danger shadow-[0_8px_20px_rgba(196,91,82,0.2)]"
                : undefined
            }
          >
            {confirmLabel}
          </BigPrimaryButton>
        </div>
      </div>
    </div>
  );
}
