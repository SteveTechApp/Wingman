import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type WingmanUiMode = "guided" | "unguided";

export type UiModeContextValue = {
  mode: WingmanUiMode;
  setMode: (mode: WingmanUiMode) => void;
  toggleMode: () => void;
  isGuided: boolean;
};

/* ------------------------------------------------------------------ */
/*  Storage                                                            */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "wingman-ui-mode-v1";
const MODE_CHANGE_EVENT = "wingman:ui-mode-changed";

function readStoredMode(): WingmanUiMode {
  if (typeof window === "undefined") return "guided";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "unguided" || stored === "guided") return stored;
  return "guided"; // Default to guided for new users
}

function writeStoredMode(mode: WingmanUiMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent(MODE_CHANGE_EVENT, { detail: { mode } }));
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const UiModeContext = createContext<UiModeContextValue>({
  mode: "guided",
  setMode: () => {},
  toggleMode: () => {},
  isGuided: true,
});

export function UiModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<WingmanUiMode>(readStoredMode);

  const setMode = useCallback((next: WingmanUiMode) => {
    setModeState(next);
    writeStoredMode(next);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "guided" ? "unguided" : "guided");
  }, [mode, setMode]);

  useEffect(() => {
    function handleStorageChange(event: Event) {
      const custom = event as CustomEvent<{ mode?: WingmanUiMode }>;
      if (custom.detail?.mode) {
        setModeState(custom.detail.mode);
      }
    }

    function handleNativeStorage() {
      setModeState(readStoredMode());
    }

    window.addEventListener(MODE_CHANGE_EVENT, handleStorageChange);
    window.addEventListener("storage", handleNativeStorage);
    return () => {
      window.removeEventListener(MODE_CHANGE_EVENT, handleStorageChange);
      window.removeEventListener("storage", handleNativeStorage);
    };
  }, []);

  // Apply mode as a data attribute on <html> for CSS scoping
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.wingmanUiMode = mode;
    return () => {
      delete document.documentElement.dataset.wingmanUiMode;
    };
  }, [mode]);

  const value = useMemo<UiModeContextValue>(
    () => ({ mode, setMode, toggleMode, isGuided: mode === "guided" }),
    [mode, setMode, toggleMode],
  );

  return <UiModeContext.Provider value={value}>{children}</UiModeContext.Provider>;
}

export function useUiMode(): UiModeContextValue {
  return useContext(UiModeContext);
}
