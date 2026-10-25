import {
  MAX_BLEND_OVERLAP_MM,
  MAX_WALL_PROJECTORS,
  wallBlendOverlapMm,
  wallCanvasAspect,
  wallCanvasPlan,
  wallProjectorCount,
  wallResolutionBudget,
  type WallRequirements,
} from "../../lib/videowallOptions";
import { videowallPanelPresets, videowallSourcePresets } from "../../lib/videowallDraft";
import {
  formatMillimetres,
  panelDiagonalPresets,
  pixelPitchPresets,
  wallPhysicalSize,
} from "../../lib/wallPhysicalSize";

/**
 * The size answers of the design pass.
 *
 * Every chip row names what it sets. The rows were unlabelled, so "55 in",
 * "4K" and "4K30" arrived as three grids of tiles that only differed by their
 * numbers, and a rep had to read the aria-labels to tell panel size from panel
 * resolution from source timing.
 */
export function VideowallSizeFields({ requirements, panels, lcd, aspectWarning, budget, plan, onUpdate, onPanels }: {
  requirements: WallRequirements;
  panels: number;
  lcd: boolean;
  aspectWarning: string | null;
  budget: ReturnType<typeof wallResolutionBudget>;
  plan: ReturnType<typeof wallCanvasPlan>;
  onUpdate: (patch: Partial<WallRequirements>) => void;
  onPanels: (columns: number, rows: number) => void;
}) {
  const fitBars = plan.fit.bars.horizontal > 0
    ? `${plan.fit.bars.horizontal} px side bars`
    : `${plan.fit.bars.vertical} px top/bottom bars`;
  const fillCrop = plan.fill.crop.vertical > 0
    ? `${plan.fill.crop.vertical} px cropped top/bottom`
    : `${plan.fill.crop.horizontal} px cropped left/right`;
  return (
    <>
      {lcd ? (
        <div className="vw-builder-choices-group">
          <p className="vw-builder-choices-label">Panel array</p>
          <div className="vw-builder-choices vw-builder-choices-compact" role="group" aria-label="Panel array">
            {videowallPanelPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                aria-pressed={requirements.columns === preset.columns && requirements.rows === preset.rows}
                onClick={() => onPanels(preset.columns, preset.rows)}
              >
                <strong>{preset.label}</strong>
                <span>{preset.columns * preset.rows} panels</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {requirements.application === "projection" ? (
        <div className="vw-builder-choices-group">
          <p className="vw-builder-choices-label">Projectors</p>
          <div className="vw-builder-choices vw-builder-choices-compact" role="group" aria-label="Projectors">
            {Array.from({ length: MAX_WALL_PROJECTORS }, (_, index) => index + 1).map((count) => (
              <button
                key={count}
                type="button"
                aria-pressed={wallProjectorCount(requirements) === count}
                onClick={() => onUpdate({ projectors: count })}
              >
                <strong>{count}</strong>
                <span>projector{count === 1 ? "" : "s"}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {requirements.application === "projection" && wallProjectorCount(requirements) > 1 ? (
        <div className="vw-builder-resolution-inputs" role="group" aria-label="Blend overlap">
          <label>
            Blend overlap at survey (mm)
            <input
              type="number"
              min={0}
              max={MAX_BLEND_OVERLAP_MM}
              step={5}
              value={requirements.blendOverlapMm ?? ""}
              placeholder="Not measured"
              onChange={(event) =>
                onUpdate({ blendOverlapMm: event.target.value === "" ? undefined : Number(event.target.value) })
              }
            />
          </label>
          <p>
            {wallBlendOverlapMm(requirements) > 0
              ? `The elevation draws the ${wallBlendOverlapMm(requirements)} mm band the images share.`
              : "The elevation marks the seam until the overlap is measured on site."}
          </p>
          <p>Drag a seam on the elevation when the images are not the same width.</p>
        </div>
      ) : null}
      {requirements.application !== "led" ? (
        <div className="vw-builder-choices-group">
          <p className="vw-builder-choices-label">{requirements.application === "projection" ? "Screen size" : "Panel size"}</p>
          <div
            className="vw-builder-choices vw-builder-choices-compact"
            role="group"
            aria-label={requirements.application === "projection" ? "Screen size" : "Panel size"}
          >
            {panelDiagonalPresets.map((inches) => {
              const physical = wallPhysicalSize({ ...requirements, panelDiagonalInches: inches });
              return (
                <button
                  key={inches}
                  type="button"
                  aria-pressed={requirements.panelDiagonalInches === inches}
                  onClick={() => onUpdate({ panelDiagonalInches: inches })}
                >
                  <strong>{inches} in</strong>
                  <span>{formatMillimetres(physical.wall.width)} mm wide</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {aspectWarning ? (
        <div className="vw-builder-aspect" role="note">
          <strong>{wallCanvasAspect(requirements).label} canvas</strong>
          <p>{aspectWarning}</p>
          {requirements.layout !== "independent" ? (
            <button
              type="button"
              onClick={() => onUpdate({
                application: "lcd-direct",
                layout: "independent",
                windows: 1,
                sources: Math.max(requirements.sources, panels),
              })}
            >
              Feed each panel separately
            </button>
          ) : null}
        </div>
      ) : null}
      {requirements.application === "led" ? (
        <div className="vw-builder-resolution-inputs" role="group" aria-label="LED canvas">
          <label>LED canvas width<input type="number" min={1} max={16384} step={1} value={requirements.ledCanvasWidth || ""} onChange={(event) => onUpdate({ ledCanvasWidth: Number(event.target.value) })} /></label>
          <label>LED canvas height<input type="number" min={1} max={16384} step={1} value={requirements.ledCanvasHeight || ""} onChange={(event) => onUpdate({ ledCanvasHeight: Number(event.target.value) })} /></label>
        </div>
      ) : (
        <div className="vw-builder-choices-group">
          <p className="vw-builder-choices-label">{requirements.application === "projection" ? "Projector resolution" : "Panel resolution"}</p>
          <div className="vw-builder-choices vw-builder-choices-compact" role="group" aria-label="Display resolution">
            {([["1080p", "1080p panels"], ["4k", "4K panels"]] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={!requirements.displayCustom && requirements.displayResolution === value} onClick={() => onUpdate({ displayResolution: value, displayCustom: false })}>
                <strong>{value === "4k" ? "4K" : "1080p"}</strong>
                <span>{requirements.application === "projection" ? label.replace("panels", "projector") : label}</span>
              </button>
            ))}
            <button
              type="button"
              aria-pressed={requirements.displayCustom}
              onClick={() => onUpdate(requirements.displayCustom
                ? { displayCustom: false }
                : requirements.displayResolution === "1080p"
                  ? { displayCustom: true, displayWidth: 1920, displayHeight: 1080 }
                  : { displayCustom: true, displayWidth: 3840, displayHeight: 2160 })}
            >
              <strong>Custom</strong>
              <span>{requirements.application === "projection" ? "projector pixels" : "panel pixels"}</span>
            </button>
          </div>
        </div>
      )}
      {requirements.application === "led" ? (
        <div className="vw-builder-choices-group">
          <p className="vw-builder-choices-label">Pixel pitch</p>
          <div className="vw-builder-choices vw-builder-choices-compact" role="group" aria-label="LED pixel pitch">
            {pixelPitchPresets.map((pitch) => {
              const physical = wallPhysicalSize({ ...requirements, pixelPitchMm: pitch });
              return (
                <button
                  key={pitch}
                  type="button"
                  aria-pressed={requirements.pixelPitchMm === pitch}
                  onClick={() => onUpdate({ pixelPitchMm: pitch })}
                >
                  <strong>{pitch} mm</strong>
                  <span>{formatMillimetres(physical.wall.width)} mm wide</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {requirements.application !== "led" && requirements.displayCustom ? (
        <div className="vw-builder-resolution-inputs" role="group" aria-label="Display pixels">
          <label>{requirements.application === "projection" ? "Projector width" : "Panel width"}<input type="number" min={1} max={16384} step={1} value={requirements.displayWidth || ""} onChange={(event) => onUpdate({ displayWidth: Number(event.target.value) })} /></label>
          <label>{requirements.application === "projection" ? "Projector height" : "Panel height"}<input type="number" min={1} max={16384} step={1} value={requirements.displayHeight || ""} onChange={(event) => onUpdate({ displayHeight: Number(event.target.value) })} /></label>
        </div>
      ) : null}
      <div className="vw-builder-choices-group">
        <p className="vw-builder-choices-label">Source timing</p>
        <div className="vw-builder-choices vw-builder-choices-compact" role="group" aria-label="Source resolution">
          {([["1080p", "1080p60"], ["4k30", "4K30"], ["4k60", "4K60"]] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={requirements.sourceResolution === value} onClick={() => onUpdate({ sourceResolution: value })}>
              <strong>{label}</strong>
              <span>source</span>
            </button>
          ))}
          <button
            type="button"
            aria-pressed={requirements.sourceCustom}
            onClick={() => onUpdate(requirements.sourceCustom
              ? { sourceCustom: false }
              : requirements.sourceResolution === "1080p"
                ? { sourceCustom: true, sourceWidth: 1920, sourceHeight: 1080 }
                : { sourceCustom: true, sourceWidth: 3840, sourceHeight: 2160 })}
          >
            <strong>Custom</strong>
            <span>source pixels</span>
          </button>
        </div>
      </div>
      {requirements.sourceCustom ? (
        <div className="vw-builder-resolution-inputs" role="group" aria-label="Source pixels">
          <label>Source width<input type="number" min={1} max={16384} step={1} value={requirements.sourceWidth || ""} onChange={(event) => onUpdate({ sourceWidth: Number(event.target.value) })} /></label>
          <label>Source height<input type="number" min={1} max={16384} step={1} value={requirements.sourceHeight || ""} onChange={(event) => onUpdate({ sourceHeight: Number(event.target.value) })} /></label>
        </div>
      ) : null}
      <div className="vw-builder-resolution" role="note">
        <strong>Resolution budget</strong>
        <p><b>{budget.headline}</b></p>
        <p>{budget.mapping}</p>
      </div>
      <div className="vw-builder-resolution" role="note">
        <strong>Canvas plan</strong>
        <p><b>{plan.headline}</b></p>
        <p>{plan.rationale}</p>
        {plan.recommended === "per-panel" || plan.recommended === "match" ? null : (
          <p>
            {plan.recommended === "fit"
              ? <>Alternative — fill: {fillCrop}.</>
              : <>Alternative — fit: {fitBars}.</>}
          </p>
        )}
      </div>
      <div className="vw-builder-choices-group">
        <p className="vw-builder-choices-label">Sources</p>
        <div className="vw-builder-choices vw-builder-choices-compact" role="group" aria-label="Source count">
          {videowallSourcePresets.map((count) => (
            <button
              key={count}
              type="button"
              aria-pressed={requirements.sources === count}
              onClick={() => onUpdate({ sources: count, windows: requirements.layout === "single" ? 1 : Math.min(requirements.windows, count) })}
            >
              <strong>{count}</strong>
              <span>source{count === 1 ? "" : "s"}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
