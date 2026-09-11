const COUNT = String.raw`(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)`;
const SOURCE_COUNT = new RegExp(String.raw`\b${COUNT}\s+(?:\w+[\s/-]+){0,3}sources?\b`, "i");
const DISPLAY_COUNT = new RegExp(String.raw`\b${COUNT}\s+(?:\w+[\s/-]+){0,3}displays?\b`, "i");
const SHARED_INTENT = /\b(?:shared?|repeats?|repeated|same content|distribut(?:e|es|ed|ion|ing))\b/i;

export function hasExplicitSharedContentIntent(assumptions) {
  return (assumptions ?? []).some((assumption) => {
    const text = String(assumption ?? "").replace(/\s+/g, " ").trim();
    return SHARED_INTENT.test(text) && SOURCE_COUNT.test(text) && DISPLAY_COUNT.test(text);
  });
}
