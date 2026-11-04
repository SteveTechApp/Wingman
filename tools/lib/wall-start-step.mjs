/**
 * What the Guided video wall wizard's opening owes a rep, read from boxes.
 *
 * The wall type is the first decision because it determines which sizing and
 * signal questions apply. The first step must therefore expose every wall type;
 * choosing LED must lead to canvas, pitch and cabinet-array fields.
 */
import { stepCardTreeReport } from "./proposal-step-cards.mjs";

export const WALL_START_VIEWPORTS = [
  { width: 1366, height: 900 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
];

const STEP = "guided wall wizard's start step";

function containmentFailure(measured, { at }) {
  const escaped = measured.escaped ?? [];
  if (escaped.length) {
    const [worst, ...also] = escaped;
    return `The ${STEP} left content outside its card at ${at}: ${worst.node} is ${worst.width}px wide, `
      + `${worst.past}px past the card's content box `
      + `(${escaped.length} box${escaped.length === 1 ? "" : "es"} out`
      + `${also.length ? `, also ${also.slice(0, 3).map((entry) => entry.name).join(", ")}` : ""}). `
      + "Every block on the step lays out at the width the card has.";
  }
  if (measured.card.scroll > measured.card.width + 1) {
    return `The ${STEP} scrolls sideways at ${at} (${measured.card.scroll} > ${measured.card.width}).`;
  }
  if (measured.clipped) {
    return `The ${STEP} is wider than the box that clips it at ${at}.\n${stepCardTreeReport(measured.tree)}`;
  }
  return null;
}

function wallTypeFailure(measured, { at }) {
  if (!measured.wallTypeStep) return `The walk could not find the wall-type question in the ${STEP} at ${at}.`;
  if (Number.parseInt(at, 10) > 900 && measured.progressRows !== 1) {
    return `The ${STEP} puts its seven progress steps on ${measured.progressRows} rows at ${at}; they should read as one rail on a desktop.`;
  }
  if (Number.parseInt(at, 10) > 900 && measured.optionRows !== 2) {
    return `The ${STEP} lays out its five wall types on ${measured.optionRows} rows at ${at}; three choices and two centered choices should balance the card.`;
  }
  if (measured.wallTypes !== 5) {
    return `The ${STEP} offers ${measured.wallTypes} wall types at ${at}; LCD, LED and projection choices must all be present.`;
  }
  if (!measured.ledSizeStep) return `Choosing LED did not open its size step at ${at}.`;
  const missing = ["canvas width", "canvas height", "pixel pitch", "cabinet columns", "cabinet rows"]
    .filter((field) => !measured.ledFields.includes(field));
  if (missing.length) return `The LED size step is missing ${missing.join(", ")} at ${at}.`;
  return null;
}

export function readWallStartStep(measured, { at } = {}) {
  if (!measured) {
    return { verdict: `The walk could not find the ${STEP} at ${at}.`, summary: null };
  }
  const verdict = containmentFailure(measured, { at }) ?? wallTypeFailure(measured, { at });
  return {
    verdict,
    summary: `card ${measured.card.width}px holding ${measured.content}px, `
      + `${measured.progressRows} progress row${measured.progressRows === 1 ? "" : "s"}, `
      + `${measured.wallTypes} wall types in ${measured.optionRows} rows, LED size fields: ${measured.ledFields.join(", ")}`,
  };
}
