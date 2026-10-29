import { useState } from "react";
import { defaultWallRequirements, type WallRequirements } from "../../lib/videowallOptions";
import { videowallPanelPresets } from "../../lib/videowallDraft";
import { formatMillimetres, pixelPitchPresets, wallPhysicalSize } from "../../lib/wallPhysicalSize";

/**
 * The LED brief, asked before any wall is offered.
 *
 * A wall someone else answered is a poor place to start an LED design: the
 * canvas, the pitch and the cabinet array are the customer's, and a preset
 * carries all three already decided. So the guided reading opens with the three
 * facts that *are* the LED brief — canvas pixels, pixel pitch and the cabinet
 * array — and the connection question follows, because who scales the canvas is
 * only answerable once the canvas exists.
 *
 * The array is the one `columns` × `rows` the design already carries, which is
 * what the display schedule prints as cabinets for an LED wall; nothing here
 * invents a second way to describe the same wall.
 *
 * The draft is local: typing a canvas width does not turn the design on screen
 * into an LED wall, the same way looking at the preset list does not. Only the
 * start action writes, and it writes a clean LED design rather than inheriting
 * the LCD wall this browser last held — a brief is a new wall.
 */

const CANVAS_LIMIT = 16384;

/** A 16:9 canvas, a 2.5 mm pitch and a 2 × 2 cabinet array: the common LED start. */
const BRIEF_DEFAULTS = { width: 3840, height: 2160, pitch: 2.5, columns: 2, rows: 2 };

export function VideowallLedBrief({ requirements, onStart }: {
  requirements: WallRequirements;
  /** Writes the brief as the design; the caller moves on to the connection. */
  onStart: (next: WallRequirements) => void;
}) {
  const [draft, setDraft] = useState(() => (requirements.application === "led"
    ? {
      width: requirements.ledCanvasWidth,
      height: requirements.ledCanvasHeight,
      pitch: requirements.pixelPitchMm ?? BRIEF_DEFAULTS.pitch,
      columns: requirements.columns,
      rows: requirements.rows,
    }
    : BRIEF_DEFAULTS));

  const pixels = (value: number) => Number.isFinite(value) && value >= 1 && value <= CANVAS_LIMIT;
  const valid = pixels(draft.width) && pixels(draft.height) && draft.pitch > 0;
  const cabinets = draft.columns * draft.rows;
  // The physical size is the read-out that makes the three answers one wall: a
  // canvas and a pitch are millimetres of cabinet, and a rep quotes the wall.
  const wall = wallPhysicalSize({
    ...defaultWallRequirements,
    application: "led",
    ledCanvasWidth: draft.width,
    ledCanvasHeight: draft.height,
    pixelPitchMm: draft.pitch,
    columns: draft.columns,
    rows: draft.rows,
  });

  function start() {
    onStart({
      ...defaultWallRequirements,
      application: "led",
      ledCanvasWidth: draft.width,
      ledCanvasHeight: draft.height,
      pixelPitchMm: draft.pitch,
      columns: draft.columns,
      rows: draft.rows,
      // An LED canvas is one processor input showing one picture, so the
      // windows and the sources start as the same single feed.
      sources: 1,
      windows: 1,
      layout: "single",
    });
  }

  return (
    <div data-testid="videowall-led-brief">
      <div className="vw-wizard-fieldset" role="group" aria-label="LED canvas">
        <p className="vw-wizard-label">Canvas pixels</p>
        <div className="vw-builder-resolution-inputs">
          <label>
            Canvas width
            <input
              type="number"
              min={1}
              max={CANVAS_LIMIT}
              step={1}
              value={draft.width || ""}
              onChange={(event) => setDraft((current) => ({ ...current, width: Number(event.target.value) }))}
            />
          </label>
          <label>
            Canvas height
            <input
              type="number"
              min={1}
              max={CANVAS_LIMIT}
              step={1}
              value={draft.height || ""}
              onChange={(event) => setDraft((current) => ({ ...current, height: Number(event.target.value) }))}
            />
          </label>
        </div>
      </div>

      <div className="vw-wizard-fieldset" role="group" aria-label="LED pixel pitch">
        <p className="vw-wizard-label">Pixel pitch</p>
        <div className="vw-wizard-chips">
          {pixelPitchPresets.map((pitch) => {
            const physical = wallPhysicalSize({ ...defaultWallRequirements, application: "led", ledCanvasWidth: draft.width, ledCanvasHeight: draft.height, pixelPitchMm: pitch });
            return (
              <button
                key={pitch}
                type="button"
                aria-pressed={draft.pitch === pitch}
                onClick={() => setDraft((current) => ({ ...current, pitch }))}
              >
                <strong>{pitch} mm</strong>
                <span>{formatMillimetres(physical.wall.width)} mm wide</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="vw-wizard-fieldset" role="group" aria-label="LED cabinet array">
        <p className="vw-wizard-label">Cabinet array</p>
        <div className="vw-wizard-chips">
          {videowallPanelPresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              aria-pressed={draft.columns === preset.columns && draft.rows === preset.rows}
              onClick={() => setDraft((current) => ({ ...current, columns: preset.columns, rows: preset.rows }))}
            >
              <strong>{preset.label}</strong>
              <span>{preset.columns * preset.rows} cabinets</span>
            </button>
          ))}
        </div>
      </div>

      <p className="vw-wizard-hint" data-testid="videowall-led-brief-readout">
        {valid
          ? `${draft.width} × ${draft.height} canvas · ${formatMillimetres(wall.wall.width)} × ${formatMillimetres(wall.wall.height)} mm · ${draft.columns} × ${draft.rows} array (${cabinets} cabinets)`
          : "Enter the canvas in pixels: the width and height drive the wall's size and its processors."}
      </p>

      <div className="vw-wizard-nav">
        <button type="button" className="vw-wizard-primary" data-testid="videowall-led-brief-start" disabled={!valid} onClick={start}>
          Start the LED brief
        </button>
      </div>
    </div>
  );
}
