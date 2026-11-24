"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  dictionaries,
  dirFor,
  type Dict,
  type Locale,
} from "./index";
import {
  getLocaleServerSnapshot,
  getLocaleSnapshot,
  setStoredLocale,
  subscribeToLocale,
} from "./localeStore";

type I18nContextValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: Dict;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeToLocale,
    getLocaleSnapshot,
    getLocaleServerSnapshot,
  );

  const dir = dirFor(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const setLocale = useCallback((next: Locale) => {
    setStoredLocale(next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, dir, t: dictionaries[locale], setLocale }),
    [locale, dir, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
