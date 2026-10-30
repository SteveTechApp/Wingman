import { iconBase64 } from "./visio-stencil.mjs";

/**
 * The three symbols the shipped stencil carries, as data.
 *
 * Kept apart from the builder so the same catalog can be measured by a spec: the
 * package's content is one list, and a symbol added here is built, checked and
 * counted without a second edit anywhere.
 *
 * Every coordinate is in inches inside the symbol's own box, with y running up
 * from the bottom-left corner — Visio's own orientation. The builder turns each
 * point into a ShapeSheet row carrying both its value and a `Width*`/`Height*`
 * formula, so a designer who resizes the dropped shape moves the drawing with it
 * rather than leaving a fixed-size sketch behind.
 *
 * Each symbol is one shape with several paths rather than a group: the fill colour
 * belongs to the shape, so a filled body plus an unfilled ring drawn over it is how
 * these read as equipment without the extra failure surface a nested group has.
 */

const DARK = [31, 41, 55];
const LIGHT = [220, 230, 245];
const MID = [143, 163, 191];

/** A closed axis-aligned box as the four corners a geometry ring walks. */
function box(x1, y1, x2, y2) {
  return [[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]];
}

/** A closed circle as a polygon: 48 corners read as a circle at drawing scale. */
function circle(cx, cy, radius, corners = 48) {
  const points = [];
  for (let step = 0; step <= corners; step += 1) {
    const angle = (step / corners) * Math.PI * 2;
    points.push([
      Number((cx + radius * Math.cos(angle)).toFixed(6)),
      Number((cy + radius * Math.sin(angle)).toFixed(6)),
    ]);
  }
  return points;
}

/** The four mid-edge glue points, which is where an AV cable leaves a device. */
function midEdges(width, height) {
  return [
    { x: 0, y: height / 2 },
    { x: width, y: height / 2 },
    { x: width / 2, y: height },
    { x: width / 2, y: 0 },
  ];
}

const MANUFACTURER = { name: "Manufacturer", label: "Manufacturer", prompt: "Who makes the unit.", type: 0 };
const MODEL = { name: "Model", label: "Model / SKU", prompt: "The model or SKU on the quote.", type: 0 };
const NOTES = { name: "Notes", label: "Notes", prompt: "Anything the drawing should know.", type: 0 };

const displayWidth = 2.4;
const displayHeight = 1.35;

const matrixWidth = 2;
const matrixHeight = 0.7;

const speakerWidth = 1.1;
const speakerHeight = 1.1;

/**
 * Port ticks down the left and right edge of the switcher.
 *
 * Generated from the port count instead of listed, so the symbol in the stencil
 * and the `Inputs` / `Outputs` fields beside it cannot disagree about how many
 * there are.
 */
function portTicks(count, { side, width, height }) {
  const inset = 0.08;
  const depth = 0.22;
  const thickness = 0.06;
  const step = height / (count + 1);
  const ticks = [];
  for (let index = 1; index <= count; index += 1) {
    const centre = step * index;
    const x1 = side === "left" ? inset : width - inset - depth;
    ticks.push(box(x1, centre - thickness / 2, x1 + depth, centre + thickness / 2));
  }
  return ticks;
}

export const AV_SYMBOLS = [
  {
    nameU: "Wingman.AV.Display",
    name: "Display (16:9)",
    prompt: "Flat-panel display, wall or stand mounted.",
    width: displayWidth,
    height: displayHeight,
    paths: [
      { points: box(0, 0, displayWidth, displayHeight) },
      { points: box(0.1, 0.1, displayWidth - 0.1, displayHeight - 0.1), filled: false },
    ],
    connections: midEdges(displayWidth, displayHeight),
    properties: [
      MANUFACTURER,
      MODEL,
      { name: "ScreenSize", label: "Screen size (in)", prompt: "Diagonal, in inches.", type: 1 },
      { name: "Mount", label: "Mount", prompt: "Wall, mobile stand, ceiling.", type: 0 },
      NOTES,
    ],
    icon: iconBase64((icon) => {
      icon.fillRect(1, 3, 14, 12, LIGHT);
      icon.strokeRect(1, 3, 14, 12, DARK);
      icon.fillRect(7, 13, 8, 14, DARK);
    }),
  },
  {
    nameU: "Wingman.AV.MatrixSwitcher",
    name: "Matrix switcher (1U)",
    prompt: "Rack-mounted matrix switcher.",
    width: matrixWidth,
    height: matrixHeight,
    paths: [
      { points: box(0, 0, matrixWidth, matrixHeight) },
      ...portTicks(4, { side: "left", width: matrixWidth, height: matrixHeight })
        .map((points) => ({ points, filled: false })),
      ...portTicks(4, { side: "right", width: matrixWidth, height: matrixHeight })
        .map((points) => ({ points, filled: false })),
    ],
    connections: midEdges(matrixWidth, matrixHeight),
    properties: [
      MANUFACTURER,
      MODEL,
      { name: "Inputs", label: "Inputs", prompt: "How many sources it takes.", type: 1 },
      { name: "Outputs", label: "Outputs", prompt: "How many displays it feeds.", type: 1 },
      { name: "Signal", label: "Signal", prompt: "HDMI, HDBaseT, AV over IP.", type: 0 },
      NOTES,
    ],
    icon: iconBase64((icon) => {
      icon.fillRect(1, 5, 14, 10, LIGHT);
      icon.strokeRect(1, 5, 14, 10, DARK);
      for (const x of [4, 8, 11]) {
        for (let y = 6; y <= 9; y += 1) icon.put(x, y, MID);
      }
    }),
  },
  {
    nameU: "Wingman.AV.CeilingSpeaker",
    name: "Ceiling speaker",
    prompt: "In-ceiling loudspeaker.",
    width: speakerWidth,
    height: speakerHeight,
    paths: [
      { points: circle(speakerWidth / 2, speakerHeight / 2, speakerWidth / 2) },
      { points: circle(speakerWidth / 2, speakerHeight / 2, speakerWidth * 0.31), filled: false },
      { points: circle(speakerWidth / 2, speakerHeight / 2, speakerWidth * 0.11), filled: false },
    ],
    connections: midEdges(speakerWidth, speakerHeight),
    properties: [
      MANUFACTURER,
      MODEL,
      { name: "DriverSize", label: "Driver size (in)", prompt: "Nominal driver diameter.", type: 1 },
      { name: "Mounting", label: "Mounting", prompt: "Tile bridge, back can, pendant.", type: 0 },
      NOTES,
    ],
    icon: iconBase64((icon) => {
      icon.circle(8, 8, 6.2, DARK);
      icon.circle(8, 8, 3.4, MID);
      icon.put(8, 8, DARK);
    }),
  },
];
