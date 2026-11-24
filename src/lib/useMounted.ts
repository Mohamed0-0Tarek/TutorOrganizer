"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * `false` during SSR and the hydration pass, `true` afterwards.
 *
 * Used to render clock/device-dependent text (greetings, "today") without a
 * setState-in-effect and without a hydration mismatch.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
