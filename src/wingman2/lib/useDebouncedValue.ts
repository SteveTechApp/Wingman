import { useEffect, useState } from "react";

// Debounces a fast-changing value (e.g. a search box bound to onChange) so
// expensive derived work (full-catalogue scoring/classification passes) only
// re-runs after the user pauses typing, instead of on every keystroke.
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
