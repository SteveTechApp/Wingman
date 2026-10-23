import { wallDisplayPixels, wallProjectorCount, type WallRequirements } from "./videowallOptions";

/**
 * Physical size of the wall, derived from the panel diagonal the rep agreed.
 * A site is measured in millimetres, so the elevation quotes them beside the
 * pixels: a 55 in 16:9 panel is 1,218 × 685 mm whether it shows 1080p or 4K,
 * and the wall is the array of those panels. An LED wall has no panels — its
 * size follows the pixel pitch the design is built on.
 */

export const DEFAULT_PANEL_DIAGONAL_INCHES = 55;
export const DEFAULT_PIXEL_PITCH_MM = 2.5;
/**
 * Planning masses, not datasheet figures: they turn the panel area the design
 * already knows into a structural allowance. A commercial LCD panel carries
 * roughly 26 kg per m² of face (a 55 in panel is about 22 kg), and an LED wall
 * carries about 30 kg per m² once its cabinets and framing are counted.
 * Both are confirmed against the supplier's figures before ordering.
 */
export const PANEL_PLANNING_MASS_KG_PER_SQM = 26;
export const LED_PLANNING_MASS_KG_PER_SQM = 30;
/**
 * Clear space a screen needs on every side to be lifted onto its bracket,
 * aligned and serviced. The opening is the wall plus this margin twice over.
 */
export const MOUNTING_CLEARANCE_MM = 100;
/** Panel diagonals a commercial display is normally specified by. */
export const panelDiagonalPresets = [46, 55, 65, 75, 86] as const;
/** Indoor LED pitches a video wall is normally specified by. */
export const pixelPitchPresets = [1.9, 2.5, 3.9] as const;

const MM_PER_INCH = 25.4;

/**
 * What the sized wall weighs and what it needs around it. Both follow the
 * millimetres above: mass from the panel or canvas area, the opening from the
 * wall plus its service margin — no second measurement path.
 */
export type WallMounting = {
  /** Planning mass of one panel, kg. Null when there is no panel to weigh. */
  panelWeightKg: number | null;
  /** Planning mass the whole wall carries, kg. Null when mass is not derived. */
  totalWeightKg: number | null;
  /** Clear space to keep on every side, mm. */
  clearanceMm: number;
  /** Wall plus its clearance: the opening the mounting surface must keep free. */
  opening: { width: number; height: number };
  /** One clause naming the mass and clearance, for the schedule. */
  text: string;
};

export type WallPhysicalSize = {
  /** One panel (or one projector's image on a screen); null for an LED wall. */
  panel: { width: number; height: number } | null;
  /** Overall wall width and height in whole millimetres. */
  wall: { width: number; height: number };
  /** Diagonal the panel size was derived from, in inches. Null for LED. */
  diagonalInches: number | null;
  pixelPitchMm: number | null;
  /** Mass and mounting clearance derived from the same dimensions. */
  mounting: WallMounting;
  /** How the size was derived, for the caption. */
  basis: string;
  /** One clause naming the wall and panel size in millimetres. */
  text: string;
};

/** Thousands separators keep a four-figure millimetre size readable. */
export function formatMillimetres(value: number) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const group = formatMillimetres;

function positive(value: number | undefined) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function decimal(value: number) {
  return String(Number(value.toFixed(2)));
}

function squareMetres(width: number, height: number) {
  return (width * height) / 1_000_000;
}

function oneDecimal(value: number) {
  return Number(value.toFixed(1));
}

function openingFor(wall: { width: number; height: number }) {
  return {
    width: wall.width + MOUNTING_CLEARANCE_MM * 2,
    height: wall.height + MOUNTING_CLEARANCE_MM * 2,
  };
}

/** The clearance clause every application prints, with the opening it implies. */
function clearanceClause(opening: { width: number; height: number }) {
  return `keep ${MOUNTING_CLEARANCE_MM} mm clear each side — ${group(opening.width)} × ${group(opening.height)} mm opening`;
}

/** Split a diagonal into millimetres along the panel's own pixel shape. */
function sizeFromDiagonal(diagonalInches: number, pixels: { width: number; height: number }) {
  const diagonalMm = diagonalInches * MM_PER_INCH;
  const hypotenuse = Math.hypot(pixels.width, pixels.height) || 1;
  return {
    width: Math.round((diagonalMm * pixels.width) / hypotenuse),
    height: Math.round((diagonalMm * pixels.height) / hypotenuse),
  };
}

export function wallPhysicalSize(requirements: WallRequirements): WallPhysicalSize {
  const columns = Math.max(1, Math.round(Number(requirements.columns) || 1));
  const rows = Math.max(1, Math.round(Number(requirements.rows) || 1));

  if (requirements.application === "led") {
    const pitch = positive(requirements.pixelPitchMm) ?? DEFAULT_PIXEL_PITCH_MM;
    const wall = {
      width: Math.round(Math.max(1, Math.round(Number(requirements.ledCanvasWidth) || 1)) * pitch),
      height: Math.round(Math.max(1, Math.round(Number(requirements.ledCanvasHeight) || 1)) * pitch),
    };
    const cabinetArea = squareMetres(wall.width, wall.height);
    const totalWeightKg = Math.round(cabinetArea * LED_PLANNING_MASS_KG_PER_SQM);
    const opening = openingFor(wall);
    return {
      panel: null,
      wall,
      diagonalInches: null,
      pixelPitchMm: pitch,
      mounting: {
        // An LED wall has no panel to weigh, so the row quotes the canvas.
        panelWeightKg: null,
        totalWeightKg,
        clearanceMm: MOUNTING_CLEARANCE_MM,
        opening,
        text: `${group(totalWeightKg)} kg planning mass for ${decimal(cabinetArea)} m² of cabinets; ${clearanceClause(opening)}. Confirm cabinet mass and fixings with the supplier.`,
      },
      basis: `${decimal(pitch)} mm pixel pitch`,
      text: `Wall ${group(wall.width)} × ${group(wall.height)} mm at ${decimal(pitch)} mm pixel pitch`,
    };
  }

  const diagonal = positive(requirements.panelDiagonalInches) ?? DEFAULT_PANEL_DIAGONAL_INCHES;
  // The drawn cell carries the panel's orientation, so a portrait panel reports
  // its portrait width and height.
  const panel = sizeFromDiagonal(diagonal, wallDisplayPixels(requirements));

  if (requirements.application === "projection") {
    // A projection screen's mass follows its surface and tensioning, not its
    // outline, so only the clearance is derived here. The screen is as wide as
    // the images together — a pair of 55 in images is a 2,436 mm wide surface —
    // while each image keeps its own diagonal.
    const projectors = wallProjectorCount(requirements);
    const screen = { width: panel.width * projectors, height: panel.height };
    const opening = openingFor(screen);
    return {
      panel,
      wall: screen,
      diagonalInches: diagonal,
      pixelPitchMm: null,
      mounting: {
        panelWeightKg: null,
        totalWeightKg: null,
        clearanceMm: MOUNTING_CLEARANCE_MM,
        opening,
        text: `${clearanceClause(opening)}. Screen mass and fixing points come from the specified screen.`,
      },
      basis: projectors > 1 ? `${decimal(diagonal)} in images` : `${decimal(diagonal)} in screen`,
      text: projectors > 1
        ? `Screen ${group(screen.width)} × ${group(screen.height)} mm · ${projectors} images at ${group(panel.width)} × ${group(panel.height)} mm (${decimal(diagonal)} in each)`
        : `Screen ${group(panel.width)} × ${group(panel.height)} mm (${decimal(diagonal)} in)`,
    };
  }

  const wall = { width: panel.width * columns, height: panel.height * rows };
  const panels = columns * rows;
  const override = requirements.panelMassOverride;
  const datasheet = override && Number.isFinite(override.kg) && positive(override.kg) && typeof override.model === "string" && override.model.trim() && typeof override.source === "string" && override.source.trim() ? override : null;
  const panelWeightKg = datasheet ? datasheet.kg : oneDecimal(squareMetres(panel.width, panel.height) * PANEL_PLANNING_MASS_KG_PER_SQM);
  const massSource = datasheet ? `datasheet mass (${datasheet.model}; ${datasheet.source})` : "planning mass";
  const totalWeightKg = Math.round(panelWeightKg * panels);
  const opening = openingFor(wall);
  return {
    panel,
    wall,
    diagonalInches: diagonal,
    pixelPitchMm: null,
    mounting: {
      panelWeightKg,
      totalWeightKg,
      clearanceMm: MOUNTING_CLEARANCE_MM,
      opening,
      text: `${panels > 1 ? `${panels} panels at ${panelWeightKg} kg ${massSource} (${group(totalWeightKg)} kg total)` : `${panelWeightKg} kg ${massSource}`}; ${clearanceClause(opening)}. Confirm mass and fixings with the panel datasheet.`,
    },
    basis: `${decimal(diagonal)} in panels`,
    text: panels > 1
      ? `Wall ${group(wall.width)} × ${group(wall.height)} mm · ${decimal(diagonal)} in panels at ${group(panel.width)} × ${group(panel.height)} mm`
      : `Wall ${group(wall.width)} × ${group(wall.height)} mm (${decimal(diagonal)} in panel)`,
  };
}
