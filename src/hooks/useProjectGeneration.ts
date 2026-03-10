import { generateProposal } from "@/services/proposalService";
import { designRoom } from "@/services/roomDesignerService";

type GenerationFallbackResult<TName extends string> = {
  ok: true;
  mode: "deterministic-fallback";
  handler: TName;
  message: string;
  argsCount: number;
};

async function fallback<TName extends string>(
  name: TName,
  args: unknown[],
): Promise<GenerationFallbackResult<TName>> {
  return {
    ok: true,
    mode: "deterministic-fallback",
    handler: name,
    message: `${name} executed in fallback mode.`,
    argsCount: args.length,
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

export function useProjectGeneration() {
  return {
    isLoading: false,
    error: null as unknown,

    handleAgentSubmit: async (...args: unknown[]) => fallback("handleAgentSubmit", args),
    handleProjectSetupSubmit: async (...args: unknown[]) => fallback("handleProjectSetupSubmit", args),
    handleSurveyImport: async (...args: unknown[]) => fallback("handleSurveyImport", args),
    handleStartFromTemplate: async (...args: unknown[]) => fallback("handleStartFromTemplate", args),
    handleGenerateDiagram: async (...args: unknown[]) => fallback("handleGenerateDiagram", args),
    handleValueEngineerRoom: async (...args: unknown[]) => fallback("handleValueEngineerRoom", args),

    handleDesignRoom: async (...args: unknown[]) => {
      const first = args[0];
      if (typeof first === "string") {
        return designRoom({ roomId: first });
      }

      const payload = asRecord(first);
      return designRoom({
        roomId: typeof payload?.roomId === "string" ? payload.roomId : undefined,
      });
    },

    handleGenerateProposal: async (...args: unknown[]) => {
      return generateProposal(args[0]);
    },
  };
}
