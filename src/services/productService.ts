import {
  inferRecommendationTierFromText,
  matchSolutionFamiliesForPrompt,
} from "@/catalog/serviceRecommendations";
import { validateTopology } from "./ioValidationService";

type ProductSuggestion = {
  sku: string;
  family: string;
  confidence: "Low" | "Medium" | "High";
  rationale: string;
};

export type ProductSuggestionResponse = {
  ok: true;
  mode: "deterministic-fallback";
  service: "productService";
  prompt: string;
  recommendations: ProductSuggestion[];
};

function normalizePrompt(v: string): string {
  return v.trim().toLowerCase();
}

function rank(v: "Low" | "Medium" | "High"): number {
  if (v === "High") return 3;
  if (v === "Medium") return 2;
  return 1;
}

export async function suggestProducts(
  prompt: string,
  topology?: { sources?: number; displays?: number; transport?: string }
): Promise<ProductSuggestionResponse> {
  const normalized = normalizePrompt(prompt);
  const validation = validateTopology(topology);
  const matches = matchSolutionFamiliesForPrompt(normalized, {
    transport: topology?.transport,
    tier: inferRecommendationTierFromText(prompt),
    limit: 3,
  });

  if (matches.length === 0 && !validation.valid) {
    return {
      ok: true,
      mode: "deterministic-fallback",
      service: "productService",
      prompt,
      recommendations: [
        {
          sku: "UNKNOWN",
          family: "Unknown",
          confidence: "Low",
          rationale: "Missing system data: " + validation.missing.join(", "),
        },
      ],
    };
  }

  const recommendations = matches.flatMap((match) =>
    match.skus.map((sku) => ({
      sku,
      family: match.family,
      confidence: match.confidence,
      rationale: match.matchedKeywords.length > 0
        ? `Matched ${match.matchedKeywords.length} keyword(s)${
            validation.valid ? " and aligned to the provided topology." : ""
          }`
        : validation.valid
          ? "Aligned to the provided topology."
          : `Prompt-only suggestion while missing: ${validation.missing.join(", ")}`,
    }))
  );

  recommendations.sort((a, b) => rank(b.confidence) - rank(a.confidence));

  return {
    ok: true,
    mode: "deterministic-fallback",
    service: "productService",
    prompt,
    recommendations,
  };
}
