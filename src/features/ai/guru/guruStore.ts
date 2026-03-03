import { useEffect, useMemo, useState } from "react";
import type { GuruMode, GuruContext } from "./guruApi";

const KEY = "wingman.guru.state.v1";

export type GuruState = {
  open: boolean;
  mode: GuruMode;
  lastQuestion?: string;
};

const defaultState: GuruState = { open: false, mode: "ask" };

function read(): GuruState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState;
    const j = JSON.parse(raw);
    return { ...defaultState, ...j };
  } catch {
    return defaultState;
  }
}

function write(s: GuruState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export function useGuruState() {
  const [state, setState] = useState<GuruState>(() => read());

  useEffect(() => { write(state); }, [state]);

  const api = useMemo(() => ({
    open: () => setState(s => ({ ...s, open: true })),
    close: () => setState(s => ({ ...s, open: false })),
    toggle: () => setState(s => ({ ...s, open: !s.open })),
    setMode: (mode: GuruMode) => setState(s => ({ ...s, mode })),
    setLastQuestion: (q: string) => setState(s => ({ ...s, lastQuestion: q })),
  }), []);

  return { state, setState, api };
}

export function buildGuruContext(mode: GuruMode, extra?: Partial<GuruContext>): GuruContext {
  return { mode, ...extra };
}
