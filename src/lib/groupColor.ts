/** Stable, non-semantic colour per group id — no colour is the only cue. */
const palette = [
  "bg-primary",
  "bg-accent",
  "bg-info",
  "bg-warning",
  "bg-danger",
] as const;

export function groupColor(groupId: string): string {
  let hash = 0;
  for (const character of groupId) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}
