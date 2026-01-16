import React, { createContext, useContext, useMemo } from "react";
import { useProjectGeneration } from "../hooks/useProjectGeneration";

type GenerationContextValue = ReturnType<typeof useProjectGeneration>;

const GenerationContext = createContext<GenerationContextValue | null>(null);

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const gen = useProjectGeneration();

  // Ensure provider value always includes isLoading + error + handlers (whatever hook returns)
  const value = useMemo(() => gen, [gen]);

  return <GenerationContext.Provider value={value}>{children}</GenerationContext.Provider>;
}

export function useGeneration() {
  const ctx = useContext(GenerationContext);
  if (!ctx) throw new Error("useGeneration must be used within a GenerationProvider");
  return ctx;
}

export const useGenerationContext = useGeneration;
