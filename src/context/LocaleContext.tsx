import React, { createContext, useContext, useMemo, useState } from "react";

export type LocaleContextType = {
  locale: string;
  setLocale: (l: string) => void;
};

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<string>("en-GB");
  const value = useMemo<LocaleContextType>(() => ({ locale, setLocale }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextType {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within <LocaleProvider>.");
  return ctx;
}