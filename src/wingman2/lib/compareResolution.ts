/**
 * Shared resolution / chroma ranking for the Compare engines.
 *
 * A single robust parser used by both compareSpecEngine and
 * competitorCompareDecision so a valid capability is ranked the same way
 * everywhere. Previously each engine had its own parser: competitorCompareDecision
 * only matched the contiguous tokens "4k60"/"2160p60", so a perfectly valid
 * "4096x2160p @60Hz 4:4:4" ranked as 0 - and worse, a multi-resolution string
 * like "...4K60 4:4:4; 1080p60" matched the trailing "1080p" and ranked as HD,
 * which then false-blocked the candidate as "lower resolution capability".
 *
 * The ranking reads the HIGHEST tier present (checks run top down and return on
 * first match), so trailing lower resolutions in a list never drag the rank down.
 * Every "WxH", "@Hz" and chroma notation the profiles use is recognised.
 */
export function resolutionRank(label: unknown): number {
  const t = String(label ?? "").toLowerCase();
  if (!t) return 0;
  // 8K (7680x4320). Boundary before "8k" only, so "8k60" matches but "18k" (a
  // bandwidth like 18Gbps once lower-cased) does not.
  if (/\b8k|7680|4320/.test(t)) return 7;
  // 4K120 / 5K120 high-frame-rate
  if (/\b4k\s*@?\s*120(?:\s*hz)?\b|(?:3840|4096|5120)\s*[x×]\s*2160[^;\n]{0,32}\b120\s*hz\b|\b2160p?[^;\n]{0,24}\b120\s*hz\b/.test(t)) return 6;
  // 4K60 4:4:4 (full chroma at 60Hz)
  if (/4k\s*60[^;\n]*(4:4:4|444)|(4:4:4|444)[^;\n]*4k\s*60|(?:3840|4096)\s*[x×]\s*2160[^;\n]{0,40}(?:@?\s*)?60[^;\n]{0,20}(4:4:4|444)|2160p?\s*@?\s*60[^;\n]{0,20}(4:4:4|444)/.test(t)) return 5;
  // 4K60 (any chroma / notation, including "4096x2160p @60Hz")
  if (/4k\s*60|2160p?\s*@?\s*60|(?:3840|4096)\s*[x×]\s*2160[^;\n]{0,32}(?:@?\s*)?60/.test(t)) return 4;
  // 4K30 / generic 4K / UHD
  if (/4k\s*30|2160p?\s*@?\s*30|(?:3840|4096)\s*[x×]\s*2160|\b4k\b|uhd/.test(t)) return 3;
  // 1080p120
  if (/1080p?\s*@?\s*120/.test(t)) return 2.5;
  // 1080p / Full HD
  if (/1080|1920\s*[x×]\s*1080|full\s*hd|fullhd/.test(t)) return 2;
  if (/720p?|1280\s*[x×]\s*720/.test(t)) return 1;
  return 0;
}

export function chromaRank(label: unknown): number {
  const t = String(label ?? "").replace(/\s+/g, "");
  if (/4:4:4|444/.test(t)) return 3;
  if (/4:2:2|422/.test(t)) return 2;
  if (/4:2:0|420/.test(t)) return 1;
  return 0;
}
