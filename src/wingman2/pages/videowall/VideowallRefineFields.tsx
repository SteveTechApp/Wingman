import {
  DEFAULT_MOUNTING_HEIGHT_MM,
  FIXED_WINDOW_LIMIT,
  FLOATING_WINDOW_LIMIT,
  type WallRequirements,
} from "../../lib/videowallOptions";

/**
 * The collapsed detail a rep changes only when the captured answers are wrong:
 * panel counts and diagonal, source count, the mounting height the wall hangs on
 * and how the room's network constrains the transport. It lives apart from the
 * builder page because these fields are assumptions, not questions.
 */
export function VideowallRefineFields({
  requirements,
  lcd,
  errors,
  onUpdate,
}: {
  requirements: WallRequirements;
  lcd: boolean;
  errors: string[];
  onUpdate: (patch: Partial<WallRequirements>) => void;
}) {
  return (
    <details className="vw-builder-refine">
      <summary>Refine the detail Wingman assumes</summary>
      <div className="vw-builder-fields">
        {lcd ? (
          <>
            <label>Columns<input type="number" min={1} max={16} value={requirements.columns || ""} onChange={(event) => onUpdate({ columns: Number(event.target.value) })} /></label>
            <label>Rows<input type="number" min={1} max={16} value={requirements.rows || ""} onChange={(event) => onUpdate({ rows: Number(event.target.value) })} /></label>
            <label>Panel orientation<select value={requirements.orientation} onChange={(event) => onUpdate({ orientation: event.target.value as WallRequirements["orientation"] })}><option value="landscape">Landscape</option><option value="portrait">Portrait</option></select></label>
            <label>Panel diagonal (in)<input type="number" min={10} max={200} step={1} value={requirements.panelDiagonalInches ?? ""} onChange={(event) => onUpdate({ panelDiagonalInches: Number(event.target.value) })} /></label>
          </>
        ) : null}
        {requirements.application === "led" ? (
          <label>Pixel pitch (mm)<input type="number" min={0.5} max={20} step={0.1} value={requirements.pixelPitchMm ?? ""} onChange={(event) => onUpdate({ pixelPitchMm: Number(event.target.value) })} /></label>
        ) : null}
        <label>Available sources<input type="number" min={1} max={64} value={requirements.sources || ""} onChange={(event) => onUpdate({ sources: Number(event.target.value) })} /></label>
        <label>Bottom edge above floor (mm)<input type="number" min={0} max={2000} step={10} value={requirements.mountingHeightMm ?? DEFAULT_MOUNTING_HEIGHT_MM} onChange={(event) => onUpdate({ mountingHeightMm: Number(event.target.value) })} /></label>
        <label>Ceiling height above floor (mm)<input type="number" min={1} value={requirements.roomHeightMm ?? ""} onChange={(event) => onUpdate({ roomHeightMm: Number(event.target.value) || undefined })} /></label>
        {lcd ? <fieldset><legend>Display datasheet mass override</legend>
          <label>Display model<input value={requirements.panelMassOverride?.model ?? ""} onChange={(event) => onUpdate({ panelMassOverride: { kg: requirements.panelMassOverride?.kg ?? 0, source: requirements.panelMassOverride?.source ?? "", model: event.target.value } })} /></label>
          <label>Mass per panel (kg)<input type="number" min={0.1} step={0.1} value={requirements.panelMassOverride?.kg || ""} onChange={(event) => onUpdate({ panelMassOverride: { model: requirements.panelMassOverride?.model ?? "", source: requirements.panelMassOverride?.source ?? "", kg: Number(event.target.value) } })} /></label>
          <label>Datasheet reference<input value={requirements.panelMassOverride?.source ?? ""} onChange={(event) => onUpdate({ panelMassOverride: { model: requirements.panelMassOverride?.model ?? "", kg: requirements.panelMassOverride?.kg ?? 0, source: event.target.value } })} /></label>
          <button type="button" onClick={() => onUpdate({ panelMassOverride: undefined })}>Use planning mass</button>
        </fieldset> : null}
        <label>AV network<select value={requirements.network} onChange={(event) => onUpdate({ network: event.target.value as WallRequirements["network"] })}><option value="any">Compare all options</option><option value="none">No AV network</option><option value="1g">1GbE design</option><option value="10g">10GbE design</option></select></label>
        {requirements.layout === "custom" ? (
          <label>
            {requirements.customMode === "floating" ? `Floating windows (max ${FLOATING_WINDOW_LIMIT})` : "Windows in the fixed layout"}
            <input
              type="number"
              min={1}
              max={requirements.customMode === "floating" ? FLOATING_WINDOW_LIMIT : FIXED_WINDOW_LIMIT}
              value={requirements.windows || ""}
              onChange={(event) => onUpdate({
                windows: requirements.customMode === "floating"
                  ? Math.min(Number(event.target.value), FLOATING_WINDOW_LIMIT)
                  : Number(event.target.value),
              })}
            />
          </label>
        ) : null}
      </div>
      <p className="vw-builder-note">
        {lcd
          ? "The panel count does not create more source pixels. Agree crop, letterbox or stretch behaviour for the complete wall aspect ratio."
          : "This is one composed HDMI output. The downstream processor or projector still determines the final display canvas."}
      </p>
      {errors.length > 0 ? <ul className="vw-builder-warning" role="alert">{errors.map((error) => <li key={error}>{error}</li>)}</ul> : null}
    </details>
  );
}
