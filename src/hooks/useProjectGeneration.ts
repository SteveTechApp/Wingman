import * as React from "react";


type DisabledResult = { ok: false; message: string };

async function disabled<T = unknown>(_name: string): Promise<T> {
  throw new Error("Project generation is temporarily disabled (stabilisation mode).");
}

export function useProjectGeneration() {
  return {
    isLoading: false,
    error: null as unknown,

    // Legacy handler names expected by GenerationContext/pages
    handleAgentSubmit: async (..._args: unknown[]) => disabled("handleAgentSubmit"),
    handleProjectSetupSubmit: async (..._args: unknown[]) => disabled("handleProjectSetupSubmit"),
    handleSurveyImport: async (..._args: unknown[]) => disabled("handleSurveyImport"),
    handleStartFromTemplate: async (..._args: unknown[]) => disabled("handleStartFromTemplate"),
    handleDesignRoom: async (..._args: unknown[]) => disabled("handleDesignRoom"),
    handleGenerateDiagram: async (..._args: unknown[]) => disabled("handleGenerateDiagram"),
    handleGenerateProposal: async (..._args: unknown[]) => disabled("handleGenerateProposal"),
    handleValueEngineerRoom: async (..._args: unknown[]) => disabled("handleValueEngineerRoom")
  };
}



