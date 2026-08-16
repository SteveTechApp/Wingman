export type RequirementAnalysis = {
  requirements: string[];
  unknowns: string[];
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

// Word-form numbers appear all over RFQ prose ("two projectors", "four
// screens"). Map the common ones to digits so the count extractors below can
// treat them identically to numerals.
const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  twenty: 20,
  "twenty two": 22,
  "twenty-four": 24,
  thirty: 30,
  "thirty two": 32,
  forty: 40,
  "forty eight": 48,
  "sixty four": 64,
};

// Counts are whole numbers only. Decimals must NOT match here - "HDMI 2.0" and
// "DisplayPort 1.4" are versions, not quantities (distances keep their own
// decimal-aware pattern below).
const NUMBER_TOKEN = "(?:\\d+|" + Object.keys(WORD_NUMBERS).join("|") + ")";

// Connectors frequently prefix the count noun ("2x HDMI inputs"); resolutions
// sit between connector and noun in spec phrasing ("1x 4K display"). Both are
// optional so plain "3 sources to 4 screens" and "4 laptops" still work.
const CONNECTOR_TOKEN = "(?:(?:hdmi|displayport|\\bdp\\b|vga|dvi|sdi|usb-?c|usb c)\\s*)?";
const RESOLUTION_TOKEN = "(?:(?:4k60|4k|8k|uhd|1080p|hdr)\\s*)?";

// The count is the single capture group (match[1]) - everything else around it
// is deliberately non-capturing. A digit or dot immediately before the count
// blocks version strings ("DisplayPort 1.4 output" must not read the "4" as
// four displays; "HDMI 2.0" must not read "2").
const COUNT_GUARD = "\\b(?<![0-9.])";
const SOURCE_PATTERN = new RegExp(
  COUNT_GUARD + "(" + NUMBER_TOKEN + ")\\s*(?:[x×]\\s*)?" + CONNECTOR_TOKEN + RESOLUTION_TOKEN +
    "(?:laptops?|sources?|inputs?|senders?)\\b",
  "i",
);
const DISPLAY_PATTERN = new RegExp(
  COUNT_GUARD + "(" + NUMBER_TOKEN + ")\\s*(?:[x×]\\s*)?" + CONNECTOR_TOKEN + RESOLUTION_TOKEN +
    "(?:displays?|screens?|monitors?|outputs?|projectors?|tvs?)\\b",
  "i",
);

function numberValue(match: string): number | undefined {
  const trimmed = match.trim().toLowerCase();
  if (/^\d/.test(trimmed)) {
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return WORD_NUMBERS[trimmed];
}

function extractCounts(text: string): { sourceCount?: number; displayCount?: number } {
  let sourceCount: number | undefined;
  let displayCount: number | undefined;

  const sourceMatch = text.match(SOURCE_PATTERN);
  if (sourceMatch) {
    const value = numberValue(sourceMatch[1]);
    if (value !== undefined) sourceCount = value;
  }

  const displayMatch = text.match(DISPLAY_PATTERN);
  if (displayMatch) {
    const value = numberValue(displayMatch[1]);
    if (value !== undefined) displayCount = value;
  }

  return { sourceCount, displayCount };
}

const DISTANCE_PATTERN = /(\d+(?:\.\d+)?)\s*(?:m|metres|meters|ft|feet|metre|meter)\b/i;

export function extractRequirementsFromText(text: string) {
  const normalized = text.toLowerCase();
  const requirements: string[] = [];

  if (/boardroom|meeting room|huddle|conference room/.test(normalized)) {
    requirements.push("Meeting or collaboration room application detected.");
  }
  if (/classroom|lecture|teaching/.test(normalized)) {
    requirements.push("Education / classroom application detected.");
  }
  if (/retail|signage|display rollout/.test(normalized)) {
    requirements.push("Retail signage or distributed display application detected.");
  }
  if (/video wall|videowall|led wall|lcd wall/.test(normalized)) {
    requirements.push("Video wall requirement detected.");
  }
  if (/usb|camera|byom|byod|teams|zoom|speakerphone/.test(normalized)) {
    requirements.push("USB, camera, or conferencing workflow should be qualified.");
  }
  if (/hdbaset|cat6|cat 6|networkhd|avoip|av over ip|fiber|fibre/.test(normalized)) {
    requirements.push("Transport path has been mentioned and should be validated against distance and network readiness.");
  }

  const { sourceCount, displayCount } = extractCounts(text);

  if (sourceCount !== undefined) requirements.push(`${sourceCount} source/input position(s) mentioned.`);
  if (displayCount !== undefined) requirements.push(`${displayCount} display/output position(s) mentioned.`);

  const distanceMatch = text.match(DISTANCE_PATTERN);
  if (distanceMatch?.[0]) requirements.push(`Signal distance mentioned: ${distanceMatch[0]}.`);

  return unique(requirements);
}

export function buildUnknowns(text: string, extractionWarnings: string[] = []) {
  const normalized = text.toLowerCase();
  const unknowns: string[] = [];
  const { sourceCount, displayCount } = extractCounts(text);

  if (sourceCount === undefined) unknowns.push("Confirm source/input count.");
  if (displayCount === undefined) unknowns.push("Confirm display/output count.");
  if (!DISTANCE_PATTERN.test(text)) unknowns.push("Confirm maximum signal distance.");
  if (!/usb|camera|byom|byod|teams|zoom|speakerphone/.test(normalized)) unknowns.push("Confirm USB/camera/conferencing requirements.");
  if (!/control|rs-232|rs232|api|touch panel/.test(normalized)) unknowns.push("Confirm control expectations.");

  extractionWarnings.forEach((warning) => unknowns.push(warning));

  return unique(unknowns);
}

export function analyzeRequirementsText(text: string, extractionWarnings: string[] = []): RequirementAnalysis {
  const requirements = extractRequirementsFromText(text);

  return {
    requirements: requirements.length ? requirements : ["No structured AV requirements were detected in readable text yet."],
    unknowns: buildUnknowns(text, extractionWarnings),
  };
}
