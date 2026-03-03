import { useEffect, useMemo, useState } from "react";

export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function useLocalStorageState<T>(key: string, initial: T) {
  const initialValue = useMemo(() => {
    return safeJsonParse<T>(localStorage.getItem(key), initial);
  }, [key, initial]);

  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);

  return [value, setValue] as const;
}