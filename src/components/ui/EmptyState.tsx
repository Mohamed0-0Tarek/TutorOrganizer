import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass-card flex flex-col items-center gap-2 p-6 text-center">
      {icon ? (
        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-white/60 text-primary">
          {icon}
        </div>
      ) : null}
      <p className="text-[17px] font-semibold">{title}</p>
      {body ? <p className="text-[13.5px] leading-6 text-muted">{body}</p> : null}
      {action ? <div className="mt-2 w-full">{action}</div> : null}
    </div>
  );
}
