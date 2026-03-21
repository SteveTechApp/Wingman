import { filterActiveSkus } from "./eolRules";
import type {
  ComparisonDomain,
  ComparisonHints,
  ComparisonUseCase,
  FitBreakdown,
  FitResult,
  StructuredProduct,
} from "./types";

function buildRejected(reason: string): FitBreakdown {
  return {
    comparisonDomainScore: 0,
    transportScore: 0,
    subtypeScore: 0,
    generationScore: 0,
    roleScore: 0,
    videoScore: 0,
    featureScore: 0,
    total: 0,
    reasons: [reason],
  };
}

function scoreComparisonDomain(a: StructuredProduct, b: StructuredProduct): number {
  if (a.comparisonDomain === b.comparisonDomain) return 100;
  if (a.comparisonDomain === "UNKNOWN" || b.comparisonDomain === "UNKNOWN") return 55;
  return 0;
}

function scoreTransport(a: StructuredProduct, b: StructuredProduct): number {
  return a.transport === b.transport ? 100 : 0;
}

function scoreSubtype(a: StructuredProduct, b: StructuredProduct): number {
  if (a.transport !== "AVOIP" || b.transport !== "AVOIP") return 100;
  if (a.avoipSubtype === b.avoipSubtype) return 100;

  if (a.avoipSubtype === "PROPRIETARY" || b.avoipSubtype === "PROPRIETARY") {
    return 40;
  }

  return 0;
}

function scoreGeneration(a: StructuredProduct, b: StructuredProduct): number {
  if (a.transport !== "HDBASET" || b.transport !== "HDBASET") return 100;
  if (a.hdbtGeneration === b.hdbtGeneration) return 100;
  if (a.hdbtGeneration === "HDBT_2_0" && b.hdbtGeneration === "HDBT_3_0") return 70;
  return 20;
}

function scoreRole(a: StructuredProduct, b: StructuredProduct): number {
  if (a.role === b.role) return 100;

  if (a.role === "DECODER" && b.role === "MULTIVIEW_DECODER") return 10;
  if (a.role === "MULTIVIEW_DECODER" && b.role === "DECODER") return 10;

  return 0;
}

function scoreVideo(a: StructuredProduct, b: StructuredProduct): number {
  let score = 0;

  if (a.video.maxResolution === b.video.maxResolution) score += 40;
  else if (a.video.maxResolution === "4K60" && b.video.maxResolution === "4K30") score += 10;
  else if (a.video.maxResolution === "4K30" && b.video.maxResolution === "4K60") score += 28;
  else if (a.video.maxResolution === "Unknown" || b.video.maxResolution === "Unknown") score += 10;

  if (a.video.chroma === b.video.chroma) score += 30;
  else if (a.video.chroma === "Unknown" || b.video.chroma === "Unknown") score += 10;

  if (a.video.bandwidth === b.video.bandwidth) score += 30;
  else if (a.video.bandwidth === "18G" && b.video.bandwidth === "10G") score += 0;
  else if (a.video.bandwidth === "10G" && b.video.bandwidth === "18G") score += 18;
  else if (a.video.bandwidth === "Unknown" || b.video.bandwidth === "Unknown") score += 10;

  return Math.round(score);
}

function scoreFeatures(a: StructuredProduct, b: StructuredProduct): number {
  let score = 0;
  if (a.features.scaling === b.features.scaling) score += 20;
  if (a.features.kvm === b.features.kvm) score += 20;
  if (a.features.videoWall === b.features.videoWall) score += 20;
  if (a.features.audioBreakout === b.features.audioBreakout) score += 20;
  if (a.features.multiview === b.features.multiview) score += 20;
  return score;
}

function matchesDomain(hints: ComparisonHints | undefined, domain: ComparisonDomain): boolean {
  return Boolean(hints?.preferredDomains.includes(domain));
}

function matchesUseCase(hints: ComparisonHints | undefined, useCase: ComparisonUseCase): boolean {
  return Boolean(hints?.preferredUseCases.includes(useCase));
}

function isAvoided(hints: ComparisonHints | undefined, domain: ComparisonDomain, useCase: ComparisonUseCase): boolean {
  return Boolean(
    hints?.avoidDomains.includes(domain) ||
      hints?.avoidUseCases.includes(useCase),
  );
}

function isRankLower(hints: ComparisonHints | undefined, useCase: ComparisonUseCase): boolean {
  return Boolean(hints?.rankLowerUseCases.includes(useCase));
}

function scoreGuidance(a: StructuredProduct, b: StructuredProduct): { score: number; notes: string[] } {
  const hints = a.comparisonHints;
  if (!hints) return { score: 0, notes: [] };

  const notes: string[] = [];
  let score = 0;

  if (matchesDomain(hints, b.comparisonDomain)) {
    score += 10;
    notes.push(`Preferred domain aligned (${b.comparisonDomain}).`);
  } else if (hints.preferredDomains.length > 0) {
    score -= 8;
    notes.push(`Candidate sits outside the preferred domain set (${b.comparisonDomain}).`);
  }

  if (matchesUseCase(hints, b.comparisonUseCase)) {
    score += 10;
    notes.push(`Preferred use case aligned (${b.comparisonUseCase}).`);
  } else if (hints.preferredUseCases.length > 0) {
    score -= 5;
    notes.push(`Candidate sits outside the preferred use case set (${b.comparisonUseCase}).`);
  }

  if (isRankLower(hints, b.comparisonUseCase)) {
    score -= 8;
    notes.push(`This use case should rank lower for the competitor state (${b.comparisonUseCase}).`);
  }

  if (isAvoided(hints, b.comparisonDomain, b.comparisonUseCase)) {
    score -= 18;
    notes.push(`Avoided comparison state for this competitor family (${b.comparisonDomain} / ${b.comparisonUseCase}).`);
  }

  return { score, notes };
}

export function rankStructuredCandidates(
  competitor: StructuredProduct,
  candidates: StructuredProduct[]
): FitResult[] {
  return filterActiveSkus(candidates)
    .map((candidate) => {
      const comparisonDomainScore = scoreComparisonDomain(competitor, candidate);
      if (comparisonDomainScore === 0) {
        return {
          sku: candidate.sku,
          score: 0,
          breakdown: buildRejected("Rejected: product class mismatch."),
        };
      }

      const transportScore = scoreTransport(competitor, candidate);
      if (transportScore === 0) {
        return {
          sku: candidate.sku,
          score: 0,
          breakdown: buildRejected("Rejected: top-level transport mismatch."),
        };
      }

      const roleScore = scoreRole(competitor, candidate);
      if (roleScore === 0) {
        return {
          sku: candidate.sku,
          score: 0,
          breakdown: buildRejected("Rejected: device role mismatch."),
        };
      }

      const subtypeScore = scoreSubtype(competitor, candidate);
      if (competitor.transport === "AVOIP" && subtypeScore === 0) {
        return {
          sku: candidate.sku,
          score: 0,
          breakdown: buildRejected("Rejected: AVoIP subtype / chipset family mismatch."),
        };
      }

      const generationScore = scoreGeneration(competitor, candidate);
      const videoScore = scoreVideo(competitor, candidate);
      const featureScore = scoreFeatures(competitor, candidate);
      const guidanceScore = scoreGuidance(competitor, candidate);
      const profileNotes = [
        ...(competitor.notes ?? []).slice(0, 1).map((note) => `Competitor profile: ${note}`),
        ...(candidate.notes ?? []).slice(0, 1).map((note) => `WyreStorm profile: ${note}`),
      ];

      const total = Math.round(
        comparisonDomainScore * 0.18 +
        transportScore * 0.18 +
        subtypeScore * 0.14 +
        generationScore * 0.08 +
        roleScore * 0.18 +
        videoScore * 0.16 +
        featureScore * 0.08 +
        guidanceScore.score
      );

      return {
        sku: candidate.sku,
        score: total,
        breakdown: {
          comparisonDomainScore,
          transportScore,
          subtypeScore,
          generationScore,
          roleScore,
          videoScore,
          featureScore,
          total,
          reasons: [
            `Comparison domain: ${competitor.comparisonDomain} vs ${candidate.comparisonDomain}`,
            `Use case: ${competitor.comparisonUseCase} vs ${candidate.comparisonUseCase}`,
            `Transport: ${competitor.transport} vs ${candidate.transport}`,
            `Subtype: ${competitor.avoipSubtype} vs ${candidate.avoipSubtype}`,
            `HDBaseT generation: ${competitor.hdbtGeneration} vs ${candidate.hdbtGeneration}`,
            `Role: ${competitor.role} vs ${candidate.role}`,
            ...guidanceScore.notes,
            ...profileNotes,
          ],
        },
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.sku.localeCompare(b.sku));
}

export const rankProducts = rankStructuredCandidates;
