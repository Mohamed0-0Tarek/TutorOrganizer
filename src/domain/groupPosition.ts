import type { GroupOutlier, GroupStatus, Student, StudentBalance } from "./types";

/**
 * Group position = the most common `cyclePosition` among the active students of
 * the group who already have counted sessions. A tie resolves to the higher
 * position. Students who differ are flagged as outliers.
 */
export function computeGroupStatus(
  students: readonly Student[],
  balances: ReadonlyMap<string, Pick<StudentBalance, "cyclePosition" | "counted">>,
): GroupStatus {
  const eligible: Array<{ student: Student; position: number }> = [];

  for (const student of students) {
    if (!student.active) continue;
    const balance = balances.get(student.id);
    if (!balance || balance.counted <= 0) continue;
    eligible.push({ student, position: balance.cyclePosition });
  }

  if (eligible.length === 0) {
    return { position: 0, outliers: [], activeCount: 0 };
  }

  const frequencies = new Map<number, number>();
  for (const { position } of eligible) {
    frequencies.set(position, (frequencies.get(position) ?? 0) + 1);
  }

  let position = 0;
  let best = -1;
  for (const [candidate, count] of frequencies) {
    if (count > best || (count === best && candidate > position)) {
      position = candidate;
      best = count;
    }
  }

  const outliers: GroupOutlier[] = eligible
    .filter((entry) => entry.position !== position)
    .map(({ student, position: studentPosition }) => ({
      studentId: student.id,
      name: student.name,
      position: studentPosition,
    }));

  return {
    position,
    outliers,
    activeCount: students.filter((student) => student.active).length,
  };
}
