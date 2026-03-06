import * as React from "react";

export function createStrictContext<T>(name: string) {
  const Ctx = React.createContext<T | undefined>(undefined);

  function useCtx(): T {
    const v = React.useContext(Ctx);
    if (v === undefined) {
      throw new Error(`${name} must be used within <${name}Provider>`);
    }
    return v;
  }

  return [Ctx, useCtx] as const;
}