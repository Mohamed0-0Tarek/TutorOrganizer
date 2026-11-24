import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  isLocale,
  type Locale,
} from "./index";

/**
 * Tiny external store for the UI language.
 *
 * Using `useSyncExternalStore` keeps the server snapshot stable (Arabic) and
 * swaps to the saved locale right after hydration without a setState-in-effect
 * and without a hydration mismatch.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let cached: Locale | null = null;

function readStored(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(saved) ? saved : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function getLocaleSnapshot(): Locale {
  if (cached === null) cached = readStored();
  return cached;
}

export function getLocaleServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

export function subscribeToLocale(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === LOCALE_STORAGE_KEY) {
      cached = readStored();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setStoredLocale(locale: Locale): void {
  cached = locale;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Private mode: the choice still applies for this session.
  }
  for (const listener of listeners) listener();
}
