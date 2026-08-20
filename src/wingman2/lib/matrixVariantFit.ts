export type MatrixVariantCandidate = {
  sku: string;
  name: string;
  productClass: string;
  transport: string;
  tags: string[];
};

export type MatrixVariantEvidence = {
  applies: boolean;
  scoreAdjustment: number;
  matched: string[];
  gaps: string[];
  checks: string[];
  variant: "simple-hdmi" | "scaling" | "hdbaset" | "video-wall" | "other";
};

type MatrixFeatureEvidence = Record<string, boolean | undefined>;

function hasExplicitScalingRequirement(text: string, features: MatrixFeatureEvidence | undefined): boolean {
  return Boolean(features?.scaling || features?.outputScaling || features?.seamless) ||
    /\b(per[- ]output|independent(?:ly)?|each output|mixed[- ]resolution|seamless)\b.{0,36}\bscal(?:e|er|ing)\b|\bseamless switching\b/i.test(text);
}

function hasExplicitVideoWallRequirement(text: string, features: MatrixFeatureEvidence | undefined): boolean {
  return Boolean(features?.videoWall) || /\b(video\s*wall|videowall|wall processing)\b/i.test(text);
}

function hasExplicitHdBaseTRequirement(text: string, features: MatrixFeatureEvidence | undefined): boolean {
  return Boolean(features?.hdbtOutput || features?.receiverKit) ||
    /\b(hdbaset|hdbt|category cable|cat\s*[56][a-z]?|poh|receiver kit)\b/i.test(text);
}

export function assessMatrixVariantFit(params: {
  competitorText: string;
  competitorFeatures?: MatrixFeatureEvidence;
  candidate: MatrixVariantCandidate;
}): MatrixVariantEvidence {
  const { candidate } = params;
  if (!/matrix/i.test(candidate.productClass)) {
    return { applies: false, scoreAdjustment: 0, matched: [], gaps: [], checks: [], variant: "other" };
  }

  const candidateText = `${candidate.sku} ${candidate.name} ${candidate.transport} ${candidate.tags.join(" ")}`;
  const scalingCandidate = /\b(scaling|scaler|seamless)\b|SCL/i.test(candidateText);
  const videoWallCandidate = /\b(video\s*wall|videowall)\b/i.test(candidateText);
  const hdbasetCandidate = /\b(hdbaset|hdbt|receiver kit|poh)\b/i.test(candidateText);
  const scalingRequired = hasExplicitScalingRequirement(params.competitorText, params.competitorFeatures);
  const videoWallRequired = hasExplicitVideoWallRequirement(params.competitorText, params.competitorFeatures);
  const hdbasetRequired = hasExplicitHdBaseTRequirement(params.competitorText, params.competitorFeatures);
  const matched: string[] = [];
  const gaps: string[] = [];
  const checks: string[] = [];
  let scoreAdjustment = 0;

  if (scalingRequired) {
    if (scalingCandidate) {
      scoreAdjustment += 32;
      matched.push("Competitor evidence requires output scaling or seamless switching, which this scaling matrix variant provides.");
    } else {
      scoreAdjustment -= 42;
      gaps.push("Competitor evidence requires output scaling or seamless switching, which is not evidenced for this matrix variant.");
    }
  } else if (scalingCandidate) {
    checks.push("Scaling and seamless switching were not confirmed for the competitor; keep this as a feature-enhanced alternative, not an assumed requirement.");
  } else {
    matched.push("This is the simpler matrix architecture; no scaling requirement was established from the competitor evidence.");
  }

  if (videoWallRequired) {
    if (videoWallCandidate || scalingCandidate) {
      scoreAdjustment += 18;
      checks.push("Video-wall operation is evidenced; confirm the required layouts and whether this matrix variant supports them exactly.");
    } else {
      scoreAdjustment -= 30;
      gaps.push("Video-wall capability is evidenced for the competitor but is not evidenced for this matrix variant.");
    }
  } else if (videoWallCandidate) {
    checks.push("Video-wall processing was not confirmed for the competitor and should not influence the lead recommendation.");
  }

  if (hdbasetRequired) {
    if (hdbasetCandidate) {
      scoreAdjustment += 30;
      matched.push("Competitor evidence requires HDBaseT/CAT distribution or receiver topology, which this variant preserves.");
    } else {
      scoreAdjustment -= 48;
      gaps.push("Competitor evidence requires HDBaseT/CAT distribution or receivers, but this is a local matrix path.");
    }
  } else if (hdbasetCandidate) {
    checks.push("HDBaseT distance and receiver topology were not confirmed; consider this only if CAT distribution is required.");
  }

  const variant = videoWallCandidate
    ? "video-wall"
    : scalingCandidate
      ? "scaling"
      : hdbasetCandidate
        ? "hdbaset"
        : /\bhdmi\b/i.test(candidateText)
          ? "simple-hdmi"
          : "other";

  return { applies: true, scoreAdjustment, matched, gaps, checks, variant };
}
