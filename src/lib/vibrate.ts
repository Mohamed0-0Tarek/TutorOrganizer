/**
 * Haptics are a nicety, never a requirement: unsupported browsers (iOS Safari),
 * reduced-motion users and SSR all fall through silently.
 */
export function vibrate(pattern: number | number[] = 12): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  if (typeof window !== "undefined") {
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    if (reduced) return;
  }
  navigator.vibrate(pattern);
}
