import { ar, type DictShape } from "./ar";
import { en } from "./en";

export type Locale = "ar" | "en";
export type Dict = DictShape;

export const dictionaries: Record<Locale, Dict> = { ar, en };
export const DEFAULT_LOCALE: Locale = "ar";
export const LOCALE_STORAGE_KEY = "tm.locale";

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function isLocale(value: unknown): value is Locale {
  return value === "ar" || value === "en";
}

/**
 * Tiny placeholder interpolation: `format("Session {position} of {length}", {...})`.
 * Keeps the dictionaries plain objects instead of functions.
 */
export function format(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

export type { DictShape };
