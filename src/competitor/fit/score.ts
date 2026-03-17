import { filterActiveSkus } from "./eolRules";
import type { FitBreakdown, FitResult, StructuredProduct } from "./types";

function buildRejected(reason: string): FitBreakdown {
  return {
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

export function rankStructuredCandidates(
  competitor: StructuredProduct,
  candidates: StructuredProduct[]
): FitResult[] {
  return filterActiveSkus(candidates)
    .map((candidate) => {
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

      const total = Math.round(
        transportScore * 0.20 +
        subtypeScore * 0.18 +
        generationScore * 0.10 +
        roleScore * 0.22 +
        videoScore * 0.20 +
        featureScore * 0.10
      );

      return {
        sku: candidate.sku,
        score: total,
        breakdown: {
          transportScore,
          subtypeScore,
          generationScore,
          roleScore,
          videoScore,
          featureScore,
          total,
          reasons: [
            `Transport: ${competitor.transport} vs ${candidate.transport}`,
            `Subtype: ${competitor.avoipSubtype} vs ${candidate.avoipSubtype}`,
            `HDBaseT generation: ${competitor.hdbtGeneration} vs ${candidate.hdbtGeneration}`,
            `Role: ${competitor.role} vs ${candidate.role}`,
          ],
        },
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.sku.localeCompare(b.sku));
}

export const rankProducts = rankStructuredCandidates;