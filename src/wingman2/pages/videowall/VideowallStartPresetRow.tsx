import { wallStartPresetFacts, type WallStartPreset } from "../../lib/videowallDecision";
import type { WallRequirements } from "../../lib/videowallOptions";
import { wallVisualLayout } from "../../lib/videowallVisual";

/**
 * The wall drawn small: its panels, the pictures mapped onto them and the seam
 * between two projectors. The drawing comes from the same layout the builder's
 * elevation uses, so a row can be recognised by its shape before its name is
 * read — a 3 × 3 wall and a projector pair no longer look like two lines of
 * text that differ only in the numbers.
 *
 * It is decoration: every fact it draws is also on the row as a fact chip, so
 * the glyph stays hidden from a screen reader rather than repeating them.
 */
export function WallPresetGlyph({ requirements }: { requirements: WallRequirements }) {
  const layout = wallVisualLayout(requirements);
  const box = { width: 96, height: 54 };
  const pad = 3;
  const ratio = layout.wall.width / layout.wall.height;
  let width = box.width - pad * 2;
  let height = width / ratio;
  if (height > box.height - pad * 2) {
    height = box.height - pad * 2;
    width = height * ratio;
  }
  const left = (box.width - width) / 2;
  const top = (box.height - height) / 2;
  const cellWidth = width / layout.columns;
  const cellHeight = height / layout.rows;
  const windowWidth = width / layout.windowColumns;
  const windowHeight = height / layout.windowRows;

  return (
    <svg
      className="vw-preset-glyph"
      viewBox={`0 0 ${box.width} ${box.height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <rect className="vw-preset-glyph-frame" x={left} y={top} width={width} height={height} rx={2} />
      {layout.mode === "panels"
        ? Array.from({ length: layout.panels }, (_, index) => (
          <rect
            key={`panel-${index}`}
            className="vw-preset-glyph-panel"
            x={left + (index % layout.columns) * cellWidth + 0.7}
            y={top + Math.floor(index / layout.columns) * cellHeight + 0.7}
            width={Math.max(1, cellWidth - 1.4)}
            height={Math.max(1, cellHeight - 1.4)}
            rx={1}
          />
        ))
        : null}
      {layout.windows.map((window) => (
        <rect
          key={`window-${window.index}`}
          className="vw-preset-glyph-window"
          x={left + window.column * windowWidth + 1.2}
          y={top + window.row * windowHeight + 1.2}
          width={Math.max(1, windowWidth - 2.4)}
          height={Math.max(1, windowHeight - 2.4)}
          rx={1}
        />
      ))}
      {layout.projectorSlices.slice(1).map((slice) => (
        <line
          key={`seam-${slice.index}`}
          className="vw-preset-glyph-seam"
          x1={left + slice.start * width}
          y1={top}
          x2={left + slice.start * width}
          y2={top + height}
        />
      ))}
    </svg>
  );
}

/**
 * One wall in the picker: what it looks like, what it is called, and the three
 * facts a rep compares — the array, the pictures it carries and the
 * architecture the answers reach. The facts are chips rather than one sentence
 * joined by dots, so two walls can be compared down a column without the three
 * values running together.
 */
export function VideowallStartPresetRow({ preset, saved, started, pinned, pinnable, pressed, onPick, onRemove, onTogglePin }: {
  preset: WallStartPreset;
  /** A wall this browser saved from the rep's own answers. */
  saved: boolean;
  /** The wall the design came from, which a changed answer does not undo. */
  started: boolean;
  /** This wall leads its family because the rep pinned it. */
  pinned: boolean;
  /** The shortlist is showing, so this catalogue wall can be pinned. */
  pinnable: boolean;
  /** The answers still match this wall exactly; null where nothing is compared. */
  pressed: boolean | null;
  onPick: (preset: WallStartPreset) => void;
  onRemove: (key: string) => void;
  onTogglePin: (key: string) => void;
}) {
  const facts = wallStartPresetFacts(preset).split(" · ");
  return (
    <li className="vw-preset-item" data-started={started ? "true" : undefined}>
      <button
        type="button"
        className="vw-preset-row"
        data-testid={`videowall-preset-${preset.key}`}
        data-started={started ? "true" : undefined}
        aria-pressed={pressed ?? undefined}
        onClick={() => onPick(preset)}
      >
        <WallPresetGlyph requirements={preset.requirements} />
        <span className="vw-preset-copy">
          <strong>{preset.label}</strong>
          <span>{preset.detail}</span>
        </span>
        <span className="vw-preset-facts">
          {started || saved || pinned ? (
            <span className="vw-preset-marks">
              {started ? "Started here · " : ""}
              {saved ? "Saved · " : ""}
              {pinned ? "Pinned · " : ""}
            </span>
          ) : null}
          {facts.map((fact) => (
            <span key={fact} className="vw-preset-fact">{fact}</span>
          ))}
        </span>
      </button>
      {saved ? (
        <button
          type="button"
          className="vw-preset-remove"
          aria-label={`Remove starting point ${preset.label}`}
          onClick={() => onRemove(preset.key)}
        >
          Remove
        </button>
      ) : null}
      {pinnable && !saved ? (
        <button
          type="button"
          className="vw-preset-pin"
          data-testid={`videowall-preset-pin-${preset.key}`}
          aria-pressed={pinned}
          aria-label={pinned
            ? `Unpin ${preset.label} from my shortlist`
            : `Pin ${preset.label} to my shortlist`}
          onClick={() => onTogglePin(preset.key)}
        >
          {pinned ? "Pinned" : "Pin"}
        </button>
      ) : null}
    </li>
  );
}
