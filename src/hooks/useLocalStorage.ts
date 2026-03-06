
import * as React from "react";

/**
 * Loop-proof localStorage hook:
 * - Reads once on mount (lazy initializer)
 * - Writes only when value changes
 * - If `initialValue` is an object literal passed inline, it will NOT trigger re-hydration loops
 * - Only re-hydrates when `key` changes
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const keyRef = React.useRef(key);
  const initialRef = React.useRef(initialValue);

  // Keep latest initialValue in a ref (does not trigger effects/rerenders)
  initialRef.current = initialValue;

  const [value, setValue] = React.useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return initialValue;
      return JSON.parse(raw) as T;
    } catch {
      return initialValue;
    }
  });

  // If key changes, re-hydrate from the new key (DO NOT depend on initialValue)
  React.useEffect(() => {
    if (keyRef.current === key) return;

    keyRef.current = key;

    try {
      const raw = localStorage.getItem(key);
      setValue(raw == null ? initialRef.current : (JSON.parse(raw) as T));
    } catch {
      setValue(initialRef.current);
    }
  }, [key]);

  // Persist when value changes
  React.useEffect(() => {
    try {
      localStorage.setItem(keyRef.current, JSON.stringify(value, null, 2));
    } catch {
      // ignore quota/private mode errors
    }
  }, [value]);

  const remove = React.useCallback(() => {
    try {
      localStorage.removeItem(keyRef.current);
    } catch {}
    setValue(initialRef.current);
  }, []);

  return [value, setValue, remove] as const;
}

export default useLocalStorage;

