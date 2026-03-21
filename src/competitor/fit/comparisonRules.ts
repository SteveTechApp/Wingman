export type ComparisonDomain =
  | "AVOIP"
  | "MATRIX"
  | "PRESENTATION"
  | "EXTENDER"
  | "VIDEO_WALL"
  | "CONTROL"
  | "UNKNOWN";

export type ComparisonUseCase =
  | "DISTRIBUTION"
  | "COLLABORATION"
  | "ROUTING"
  | "MULTIVIEW"
  | "WALL_PROCESSING"
  | "EXTENSION"
  | "CONTROL"
  | "UNKNOWN";

function tidy(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function has(blob: string, pattern: RegExp): boolean {
  return pattern.test(blob);
}

export function inferComparisonDomain(blobInput: string): ComparisonDomain {
  const blob = tidy(blobInput);

  if (has(blob, /\bvideo wall\b|\bvideowall\b|\bwall processor\b|\bwall feed\b|\bmultiview\b|\bwindowing\b/)) return "VIDEO_WALL";
  if (has(blob, /\bmatrix\b|\bmodular matrix\b|\bmatrix switch\b|\bmatrix switching\b/)) return "MATRIX";
  if (has(blob, /\bextender\b|\btpx\b|\btps\b|\bdtp\b|\bhdbase t\b|\bhdbaset\b|\bpoint to point\b/)) return "EXTENDER";
  if (has(blob, /\bcontroller\b|\bmanagement\b|\bdirector\b|\bcontrol\b/)) return "CONTROL";
  if (
    has(
      blob,
      /\bnvx\b|\bnav\b|\bubex\b|\bvinx\b|\bnetworkhd\b|\bavoip\b|\bsdvoe\b|\bav over ip\b|\bencoder\b|\bdecoder\b/,
    )
  ) {
    return "AVOIP";
  }
  if (
    has(
      blob,
      /\bpresentation switcher\b|\bpresentation system\b|\bcollaboration\b|\bbyod\b|\bbyom\b|\bucx\b|\bdmps\b|\bhd-ps\b|\btaurus ucx\b|\bomega\b|\bome\b|\bomni\b|\bclickshare\b|\bairmedia\b|\bvia\b|\bsharelink\b/,
    )
  ) {
    return "PRESENTATION";
  }

  return "UNKNOWN";
}

export function inferComparisonUseCase(
  blobInput: string,
  domain: ComparisonDomain,
): ComparisonUseCase {
  const blob = tidy(blobInput);

  if (has(blob, /\bmultiview\b|\bmulti-view\b|\bwindowing\b/)) return "MULTIVIEW";
  if (has(blob, /\bvideo wall\b|\bvideowall\b|\bwall processor\b|\bwall feed\b/)) return "WALL_PROCESSING";
  if (domain === "MATRIX") return "ROUTING";
  if (domain === "EXTENDER") return "EXTENSION";
  if (domain === "VIDEO_WALL") return "WALL_PROCESSING";
  if (domain === "CONTROL") return "CONTROL";
  if (domain === "PRESENTATION") return "COLLABORATION";
  if (
    has(
      blob,
      /\bcollaboration\b|\bbyod\b|\bbyom\b|\busb-c\b|\busb c\b|\bwireless presentation\b|\bhuddle\b|\bclickshare\b|\bairmedia\b|\bvia\b|\bsharelink\b/,
    )
  ) {
    return "COLLABORATION";
  }
  if (has(blob, /\bextension\b|\bextender\b|\bpoint to point\b|\blong reach\b/)) return "EXTENSION";
  if (has(blob, /\bcontrol\b|\bmanagement\b|\bdirector\b/)) return "CONTROL";
  if (domain === "AVOIP") return "DISTRIBUTION";

  return "UNKNOWN";
}
