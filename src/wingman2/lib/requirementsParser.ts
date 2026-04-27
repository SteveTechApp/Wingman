export type RequirementAnalysis = {
  requirements: string[];
  unknowns: string[];
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

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

  const sourceMatch = text.match(/(\d+)\s+(?:laptop|source|input)s?/i);
  if (sourceMatch?.[1]) requirements.push(`${sourceMatch[1]} source/input position(s) mentioned.`);

  const displayMatch = text.match(/(\d+)\s+(?:display|screen|output|projector)s?/i);
  if (displayMatch?.[1]) requirements.push(`${displayMatch[1]} display/output position(s) mentioned.`);

  const distanceMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:m|metres|meters|ft|feet)\b/i);
  if (distanceMatch?.[0]) requirements.push(`Signal distance mentioned: ${distanceMatch[0]}.`);

  return unique(requirements);
}

export function buildUnknowns(text: string, extractionWarnings: string[] = []) {
  const normalized = text.toLowerCase();
  const unknowns: string[] = [];

  if (!/(\d+)\s+(?:laptop|source|input)s?/i.test(text)) unknowns.push("Confirm source/input count.");
  if (!/(\d+)\s+(?:display|screen|output|projector)s?/i.test(text)) unknowns.push("Confirm display/output count.");
  if (!/(\d+(?:\.\d+)?)\s*(?:m|metres|meters|ft|feet)\b/i.test(text)) unknowns.push("Confirm maximum signal distance.");
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
