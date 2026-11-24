/**
 * Money is always whole currency units (EGP). No floats anywhere in the app.
 */

export function assertInteger(value: number, name = "value"): number {
  if (!Number.isInteger(value)) {
    throw new RangeError(`${name} must be an integer, received ${value}`);
  }
  return value;
}

export function assertNonNegativeInteger(value: number, name = "value"): number {
  assertInteger(value, name);
  if (value < 0) {
    throw new RangeError(`${name} must be >= 0, received ${value}`);
  }
  return value;
}

export function expectedCycleAmount(
  pricePerSession: number,
  cycleLength: number,
): number {
  assertNonNegativeInteger(pricePerSession, "pricePerSession");
  assertInteger(cycleLength, "cycleLength");
  if (cycleLength < 1) {
    throw new RangeError("cycleLength must be >= 1");
  }
  return pricePerSession * cycleLength;
}

export function formatMoney(amount: number, label: string): string {
  assertInteger(amount, "amount");
  return `${amount.toLocaleString("en-US")} ${label}`;
}

export function formatEGP(amount: number): string {
  return formatMoney(amount, "ج.م");
}

/** Renders digits with Latin numerals regardless of the UI language, per D10. */
export function formatCount(value: number): string {
  assertInteger(value, "value");
  return value.toLocaleString("en-US");
}
