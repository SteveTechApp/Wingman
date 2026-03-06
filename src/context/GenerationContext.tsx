import * as React from "react";
import { createStrictContext } from "./createStrictContext";

export type GenerationContextValue = {
  handleDesignRoom: (...args: any[]) => Promise<void>;
  handleAgentSubmit: (...args: any[]) => Promise<void>;
  handleSurveyImport: (...args: any[]) => Promise<void>;
  handleStartFromTemplate: (...args: any[]) => Promise<void>;
};

const noop = async () => {};

const [GenerationContext, useGenerationContext] =
  createStrictContext<GenerationContextValue>("Generation");

export { useGenerationContext };

export function GenerationProvider(props: { children: React.ReactNode }) {
  const value = React.useMemo<GenerationContextValue>(() => ({
    handleDesignRoom: noop,
    handleAgentSubmit: noop,
    handleSurveyImport: noop,
    handleStartFromTemplate: noop,
  }), []);

  return <GenerationContext.Provider value={value}>{props.children}</GenerationContext.Provider>;
}