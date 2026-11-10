/**
 * Read the promise of the guided wall wizard's first step. Wall technology is
 * selected first, before saved presets or any connection and multiview choices.
 */
import { stepCardTreeReport } from "./proposal-step-cards.mjs";

export const WALL_START_VIEWPORTS = [
  { width: 1366, height: 900 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
];

const STEP = "guided wall wizard's first step";

function containmentFailure(measured, { at }) {
  const escaped = measured.escaped ?? [];
  if (escaped.length) {
    const [worst, ...also] = escaped;
    return `The ${STEP} left content outside its card at ${at}: ${worst.node} is ${worst.width}px wide, `
      + `${worst.past}px past the card's content box (${escaped.length} box${escaped.length === 1 ? "" : "es"} out`
      + `${also.length ? `, also ${also.slice(0, 3).map((entry) => entry.name).join(", ")}` : ""}).`;
  }
  if (measured.card.scroll > measured.card.width + 1) {
    return `The ${STEP} scrolls sideways at ${at} (${measured.card.scroll} > ${measured.card.width}).`;
  }
  if (measured.clipped) {
    return `The ${STEP} is wider than the box that clips it at ${at}.\n${stepCardTreeReport(measured.tree)}`;
  }
  return null;
}

export function readWallStartStep(measured, { at } = {}) {
  if (!measured) {
    return { verdict: `The walk could not find the ${STEP} at ${at}.`, summary: null };
  }
  let verdict = containmentFailure(measured, { at });
  if (!verdict && measured.heading !== "What kind of wall?") {
    verdict = `The ${STEP} asks "${measured.heading}" at ${at}; it must identify wall technology before other answers.`;
  }
  const expected = ["LCD video wall", "LED video wall", "Projection wall"];
  const actual = measured.technologies ?? [];
  if (!verdict && expected.some((label) => !actual.includes(label))) {
    verdict = `The ${STEP} does not offer all three wall technologies at ${at}: ${actual.join(", ") || "none"}.`;
  }
  return {
    verdict,
    summary: `card ${measured.card.width}px holding ${measured.content}px, heading "${measured.heading}", `
      + `${actual.length} wall technologies (${actual.join(", ")}), widest block ${measured.widest}px`,
  };
}
