import * as React from "react";
import { getWingmanState, subscribe, wingmanActions } from "./wingmanStore";
import type { WingmanState } from "./types";

export function useWingman(): WingmanState;
export function useWingman<T>(selector: (s: WingmanState) => T): T;
export function useWingman<T>(selector?: (s: WingmanState) => T) {
  const sel = selector ?? ((s: WingmanState) => s as unknown as T);

  const value = React.useSyncExternalStore(
    subscribe,
    () => sel(getWingmanState()),
    () => sel(getWingmanState())
  );

  return value;
}

export { wingmanActions };