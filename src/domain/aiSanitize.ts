/** Never send parent phone numbers (or any long digit run) to the model. */
export function redactPhones(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/(?:\+?\d[\d\s().-]{6,}\d)/g, (match) => {
      const digits = match.replace(/\D/g, "");
      // Dates and Firestore ids are digit runs too — only real phone shapes
      // get redacted: '+' prefix, leading 0, or at least 10 digits.
      if (match.includes("+") || digits.startsWith("0") || digits.length >= 10) {
        return "[number]";
      }
      return match;
    })
    .trim();
}

/** Plain object with every string value redacted; ids are kept. */
export function redactStrings<T>(value: T): T {
  if (Array.isArray(value)) return value.map(redactStrings) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        typeof item === "string" ? redactPhones(item) : redactStrings(item),
      ]),
    ) as T;
  }
  return value;
}
