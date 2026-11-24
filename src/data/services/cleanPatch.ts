/** Firestore rejects `undefined` field values in `updateDoc` patches. */
export function definedFields<T extends Record<string, unknown>>(
  patch: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
