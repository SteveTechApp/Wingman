import { generateProposal } from "@/services/proposalService";
import { designRoom } from "@/services/roomDesignerService";
import { analyzeProject } from "@/services/projectAnalysisService";
import { suggestProducts } from "@/services/productService";
import { extractRequirements } from "@/import/extractRequirements";
import { recommendFamilies } from "@/features/discovery/discoveryStore";

type GenerationPipelineResult<TName extends string, TPayload = Record<string, unknown>> = {
  ok: true;
  mode: "deterministic-pipeline";
  handler: TName;
  message: string;
  payload: TPayload;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function getString(source: Record<string, unknown> | undefined, keys: string[]): string {
  if (!source) return "";
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

function asJoinedText(args: unknown[]): string {
  return args
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (!item || typeof item !== "object") return "";

      const payload = item as Record<string, unknown>;
      const fields = [
        getString(payload, ["prompt", "brief", "text", "message", "notes", "description"]),
        getString(payload, ["customer", "customerName"]),
        getString(payload, ["roomName", "room", "projectName"]),
      ]
        .map((value) => value.trim())
        .filter(Boolean)
        .join("\n");

      if (fields) return fields;
      try {
        return JSON.stringify(item);
      } catch {
        return String(item);
      }
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function distanceHintToMeters(hint?: string): string {
  const normalized = String(hint ?? "").toLowerCase();
  if (normalized === "long") return "30";
  if (normalized === "medium") return "15";
  if (normalized === "short") return "5";
  return "";
}

export function useProjectGeneration() {
  return {
    isLoading: false,
    error: null as unknown,

    handleAgentSubmit: async (...args: unknown[]): Promise<GenerationPipelineResult<"handleAgentSubmit">> => {
      const text = asJoinedText(args);
      const extracted = extractRequirements(text);
      const families = recommendFamilies({
        applicationType: extracted.roomType || "",
        displayCount: extracted.displays != null ? String(extracted.displays) : "",
        cableDistanceM: distanceHintToMeters(extracted.distanceHint),
        usbNeeds: extracted.byodUsbC ? "USB-C / BYOD" : "",
        controlNeeds: extracted.switchingNeeded ? "Switching required" : "",
      });

      const [analysis, suggestions, proposal] = await Promise.all([
        analyzeProject(text),
        suggestProducts(text),
        generateProposal(args[0]),
      ]);

      return {
        ok: true,
        mode: "deterministic-pipeline",
        handler: "handleAgentSubmit",
        message: "Agent pipeline completed with deterministic analysis, SKU suggestions, and proposal draft.",
        payload: {
          analysis,
          suggestions,
          proposal,
          extracted,
          families: families.families,
          nextTool: families.nextTool,
        },
      };
    },

    handleProjectSetupSubmit: async (...args: unknown[]): Promise<GenerationPipelineResult<"handleProjectSetupSubmit">> => {
      const payload = asRecord(args[0]);
      const text = asJoinedText(args);
      const extracted = extractRequirements(text);
      const families = recommendFamilies({
        applicationType: getString(payload, ["applicationType", "roomType"]) || extracted.roomType || "",
        displayCount: getString(payload, ["displayCount"]) || (extracted.displays != null ? String(extracted.displays) : ""),
        cableDistanceM: getString(payload, ["cableDistanceM"]) || distanceHintToMeters(extracted.distanceHint),
        usbNeeds: getString(payload, ["usbNeeds"]) || (extracted.byodUsbC ? "USB-C / BYOD" : ""),
        controlNeeds: getString(payload, ["controlNeeds"]) || (extracted.switchingNeeded ? "Switching required" : ""),
      });

      return {
        ok: true,
        mode: "deterministic-pipeline",
        handler: "handleProjectSetupSubmit",
        message: "Project setup intake mapped to deterministic families and next tool guidance.",
        payload: {
          extracted,
          families: families.families,
          nextTool: families.nextTool,
        },
      };
    },

    handleSurveyImport: async (...args: unknown[]): Promise<GenerationPipelineResult<"handleSurveyImport">> => {
      const text = asJoinedText(args);
      const extracted = extractRequirements(text);
      const families = recommendFamilies({
        applicationType: extracted.roomType || "",
        displayCount: extracted.displays != null ? String(extracted.displays) : "",
        cableDistanceM: distanceHintToMeters(extracted.distanceHint),
        usbNeeds: extracted.byodUsbC ? "USB-C / BYOD" : "",
        controlNeeds: extracted.switchingNeeded ? "Switching required" : "",
      });
      const suggestions = await suggestProducts(text || extracted.summary.join("; "));

      return {
        ok: true,
        mode: "deterministic-pipeline",
        handler: "handleSurveyImport",
        message: "Survey import parsed into discovery signals and deterministic SKU suggestions.",
        payload: {
          extracted,
          suggestions,
          families: families.families,
          nextTool: families.nextTool,
        },
      };
    },

    handleStartFromTemplate: async (...args: unknown[]): Promise<GenerationPipelineResult<"handleStartFromTemplate">> => {
      const payload = asRecord(args[0]);
      const templateName = getString(payload, ["templateName", "name"]) || "Template";
      const roomName = getString(payload, ["roomName", "roomType"]) || "Room";
      const tier = getString(payload, ["tier", "selectedTier"]) || "Silver";

      return {
        ok: true,
        mode: "deterministic-pipeline",
        handler: "handleStartFromTemplate",
        message: "Template context normalized for project creation flow.",
        payload: {
          templateName,
          roomName,
          tier,
        },
      };
    },

    handleGenerateDiagram: async (...args: unknown[]): Promise<GenerationPipelineResult<"handleGenerateDiagram">> => {
      const first = args[0];
      const payload = asRecord(first);
      const roomId = typeof first === "string" ? first : getString(payload, ["roomId", "roomName"]);
      const design = await designRoom({ roomId: roomId || undefined });

      return {
        ok: true,
        mode: "deterministic-pipeline",
        handler: "handleGenerateDiagram",
        message: "Design-room diagram bundle generated in deterministic mode.",
        payload: {
          roomId: roomId || null,
          design,
        },
      };
    },

    handleValueEngineerRoom: async (...args: unknown[]): Promise<GenerationPipelineResult<"handleValueEngineerRoom">> => {
      const first = args[0];
      const payload = asRecord(first);
      const roomId = typeof first === "string" ? first : getString(payload, ["roomId", "roomName"]);
      const tier = getString(payload, ["targetTier", "tier", "selectedTier"]) || "Bronze";
      const design = await designRoom({ roomId: roomId || undefined, targetTier: tier as "Bronze" | "Silver" | "Gold" });

      return {
        ok: true,
        mode: "deterministic-pipeline",
        handler: "handleValueEngineerRoom",
        message: "Value engineering pass completed with deterministic design-room pipeline.",
        payload: {
          roomId: roomId || null,
          tier,
          design,
        },
      };
    },

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
