const text = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

export function isEthernetConnector(value) {
  return /\b(?:rj-?45|ethernet|\d+g?be)\b/i.test(text(value));
}

export function isAnalogueAudioConnector(value) {
  return /\b(?:phoenix|euroblock|terminal\s*block|trs|xlr|3\.5\s*mm)\b/i.test(text(value));
}

export function isExplicitAudioOutputEvidence(value) {
  return /\b(?:analogue|analog|audio|line)\s*(?:out|output)\b/i.test(text(value));
}

export function isAnalogueAudioEvidence(value) {
  const valueText = text(value);
  const analogueFunction = /\b(?:analogue|analog|balanced|unbalanced|line\s*(?:in|out|input|output)|audio\s*(?:in|out|input|output))\b/i.test(valueText);
  const analogueTermination = /\b(?:phoenix|euroblock|terminal\s*block|trs|xlr|3\.5\s*mm|[2345]-?pin)\b/i.test(valueText);
  const lineLevelFunction = /\bline\s*(?:in|out|input|output)\b/i.test(valueText);
  return lineLevelFunction || (analogueFunction && analogueTermination);
}
