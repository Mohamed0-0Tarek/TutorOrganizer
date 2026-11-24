import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-busy
      className={cn(
        "animate-pulse rounded-card bg-white/45",
        className ?? "h-20 w-full",
      )}
    />
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-[74px] w-full" />
      ))}
    </div>
  );
}
