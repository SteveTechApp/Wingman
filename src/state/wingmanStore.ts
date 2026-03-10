import * as React from "react";
import { DEFAULT_WINGMAN_STATE } from "./defaults";
import type { WingmanState, Product } from "./types";
/** Tiny store (no external dependency) */
let STATE: WingmanState = DEFAULT_WINGMAN_STATE;
const LISTENERS = new Set<() => void>();

function emit(){
  for (const l of LISTENERS) l();
}

export function getWingmanState(): WingmanState {
  return STATE;
}

export function setWingmanState(next: WingmanState){
  STATE = next;
  emit();
}

export function patchWingmanState(patch: Partial<WingmanState>){
  setWingmanState({ ...STATE, ...patch });
}

export function subscribeWingman(listener: () => void){
  LISTENERS.add(listener);
  return () => LISTENERS.delete(listener);
}

/** Actions consumed by legacy contexts/components */
export const wingmanActions = {
  // --- Auth ---
  signInDemo(email?: string) {
    const userId = (email && email.trim()) ? email.trim() : "demo@wingman.local";
    setWingmanState({
      ...STATE,
      auth: { isAuthed: true, userId },
    });
  },

  signOut() {
    setWingmanState({
      ...STATE,
      auth: { isAuthed: false, userId: null },
    });
  },

  /** Legacy compatibility: older contexts call setAuthed(true, id) */
  setAuthed(isAuthed: boolean, userId?: string) {
    setWingmanState({
      ...STATE,
      auth: { isAuthed, userId: isAuthed ? (userId ?? "local-user") : null },
    });
  },

  // --- Projects (legacy compatibility) ---
  /** Legacy compatibility: older contexts call setActiveProject(id|null) */
  setActiveProject(id: string | null) {
    wingmanActions.setActiveProjectId(id);
  },

  /** Canonical */
  setActiveProjectId(id: string | null) {
    setWingmanState({
      ...STATE,
      projects: { ...STATE.projects, activeId: id },
    });
  },

  setProjects(list: any[]) {
    setWingmanState({
      ...STATE,
      projects: { ...STATE.projects, list },
    });
  },
  startNewProject() {
    // Minimal: clears active project and comparison (keeps saved projects)
    try { wingmanActions.setActiveProjectId(null); } catch {}
    try { wingmanActions.clearComparison(); } catch {}
    // If your project reducer expects a different init, this is the safest no-crash default.
  },

  // --- Comparison ---
  // --- Comparison ---
  toggleComparison(product: Product) {
    const cur = (STATE.comparison?.comparisonList ?? []) as Product[];
    const has = cur.some((p) => p?.sku === product.sku);
    const next = has ? cur.filter((p) => p?.sku !== product.sku) : [...cur, product];

    setWingmanState({
      ...STATE,
      comparison: { ...(STATE.comparison ?? {}), comparisonList: next },
    });
  },

  clearComparison() {
    setWingmanState({
      ...STATE,
      comparison: { ...(STATE.comparison ?? {}), comparisonList: [] },
    });
  },

  // --- User profile (safe defaults) ---
  updateUserProfile(patch: any) {
    setWingmanState({
      ...STATE,
      user: { ...(STATE.user ?? {}), profile: { ...(STATE.user?.profile ?? {}), ...patch } },
    });
  },

  setUserProfile(profile: any) {
    setWingmanState({
      ...STATE,
      user: { ...(STATE.user ?? {}), profile },
    });
  },

  // --- UI ---
  setLoadingContext(ctx: any) {
    setWingmanState({
      ...STATE,
      ui: { ...(STATE.ui ?? {}), loadingContext: ctx },
    });
  },
};/** useWingman(selector?) Ã¢â‚¬â€œ supports both patterns:
 *   const s = useWingman()
 *   const v = useWingman(s => s.auth.isAuthed)
 */
export function useWingman(): WingmanState;
export function useWingman<T>(selector: (s: WingmanState) => T): T;
export function useWingman<T>(selector?: (s: WingmanState) => T){
  const snap = React.useSyncExternalStore(
    subscribeWingman,
    () => STATE,
    () => STATE
  );
  return selector ? selector(snap) : snap;
}

// Alias for hook compatibility
export const subscribe = subscribeWingman;

// Alias for hook compatibility


