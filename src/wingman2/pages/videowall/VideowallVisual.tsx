import { useId, useRef, useState } from "react";
import {
  wallElevationDimensions,
  wallElevationGeometry,
  wallElevationKey,
  wallMappingChoices,
  wallMappingFixes,
  wallMappingWarning,
  wallMappingRecommendation,
  type WallElevationDimension,
  type WallMapping,
} from "../../lib/wallElevation";
import { MIN_PROJECTOR_IMAGE_SHARE, wallProjectorSplits, type WallRequirements } from "../../lib/videowallOptions";
import { formatMillimetres } from "../../lib/wallPhysicalSize";
import { wallTransportPlan, type WallTransportLink } from "../../lib/videowallTransport";

/**
 * The wall as the customer will see it: real proportions, panel boundaries and
 * the window plan laid over them. The SVG is intentionally illustrative — it
 * does not claim to show a product render, only the geometry the design uses.
 *
 * When the source shape differs from the canvas, the drawing also shows the
 * agreed fit or fill: hatched bars inside the wall for a fitted source, or a
 * hatched overhang outside a dashed source frame for a filled one. Dimension
 * lines state the wall and panel size in millimetres, the gap beneath the wall
 * states the mounting height the installer sets out from the floor, and the rep
 * can switch between fit and fill here to see what each choice costs.
 */

type BandLabel = { x: number; y: number; rotate: boolean };

const BAND_LABEL_SIZE = 30;

/** One measured span, drawn with the same geometry as the exported elevation. */
function DimensionLine({ dimension, labelSize }: { dimension: WallElevationDimension; labelSize: number }) {
  const { from, to, label } = dimension;
  const tick = Math.max(5, Math.round(labelSize * 0.35));
  return (
    <g data-wall-dimension={dimension.key} stroke="#9fb6c4" strokeWidth={2} fill="none">
      {dimension.extensions.map((leader, index) => (
        <line
          key={`leader-${index}`}
          x1={leader.from.x}
          y1={leader.from.y}
          x2={leader.to.x}
          y2={leader.to.y}
          stroke="#64818f"
          strokeWidth={1.5}
          strokeDasharray="6 6"
        />
      ))}
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
      <line x1={from.x - (dimension.axis === "horizontal" ? 0 : tick)} y1={from.y - (dimension.axis === "horizontal" ? tick : 0)} x2={from.x + (dimension.axis === "horizontal" ? 0 : tick)} y2={from.y + (dimension.axis === "horizontal" ? tick : 0)} />
      <line x1={to.x - (dimension.axis === "horizontal" ? 0 : tick)} y1={to.y - (dimension.axis === "horizontal" ? tick : 0)} x2={to.x + (dimension.axis === "horizontal" ? 0 : tick)} y2={to.y + (dimension.axis === "horizontal" ? tick : 0)} />
      <text
        data-wall-dimension-label={dimension.size}
        x={label.x}
        y={label.y}
        fontSize={labelSize}
        fontWeight={600}
        letterSpacing={1}
        fill="#c7d8e2"
        stroke="none"
        textAnchor="middle"
        dominantBaseline="central"
        transform={label.rotate ? `rotate(-90 ${label.x} ${label.y})` : undefined}
      >
        {label.text}
      </text>
    </g>
  );
}

export function VideowallVisual({ requirements, onMappingChange, onRequirementsChange }: {
  requirements: WallRequirements;
  /** Present when the rep may switch the mapping from the drawing itself. */
  onMappingChange?: (mapping: WallMapping) => void;
  /** Present when the warning may apply its one-tap fixes. */
  onRequirementsChange?: (next: WallRequirements) => void;
}) {
  const [undoRequirements, setUndoRequirements] = useState<WallRequirements | null>(null);
  // Which seam is under the pointer: the drawing follows the drag, so the rep
  // sees where the boundary lands rather than dropping it on release.
  const [draggingSeam, setDraggingSeam] = useState<number | null>(null);
  const wallFrameRef = useRef<SVGRectElement | null>(null);
  const recommendation = wallMappingRecommendation(requirements);
  const geometry = wallElevationGeometry(requirements);
  const { layout, overlay, frame, origin, margin, drawing, scale, labelSize: dimensionLabelSize } = geometry;
  const dimensions = wallElevationDimensions(geometry);
  const mappingChoices = wallMappingChoices(requirements);
  // A mapping that costs a visible share of the wall needs to say so here, next
  // to the buttons that change it, rather than only in the printed caption.
  const warning = wallMappingWarning(requirements);
  // The fixes re-shape the design rather than only its mapping, so they need
  // somewhere to put the result; without that they are not offered at all.
  const fixes = warning && onRequirementsChange ? wallMappingFixes(requirements) : [];
  // The scale figure stands beside the wall at the wall's own scale, so the
  // millimetre labels have something familiar to be read against.
  const figure = scale ? (() => {
    const centre = scale.x + scale.doorWidth / 2;
    const top = scale.floorY - scale.personHeight;
    const head = scale.personHeight * 0.062;
    const width = scale.personHeight * 0.23;
    const shoulderY = top + scale.personHeight * 0.16;
    const hipY = top + scale.personHeight * 0.47;
    const foot = scale.personHeight * 0.17;
    const silhouette = [
      `M ${Math.round(centre - width / 2)} ${Math.round(shoulderY)}`,
      `Q ${Math.round(centre)} ${Math.round(top + scale.personHeight * 0.1)} ${Math.round(centre + width / 2)} ${Math.round(shoulderY)}`,
      `L ${Math.round(centre + width * 0.42)} ${Math.round(hipY)}`,
      `L ${Math.round(centre + foot)} ${Math.round(scale.floorY)}`,
      `L ${Math.round(centre + width * 0.05)} ${Math.round(scale.floorY)}`,
      `L ${Math.round(centre)} ${Math.round(hipY + scale.personHeight * 0.02)}`,
      `L ${Math.round(centre - width * 0.05)} ${Math.round(scale.floorY)}`,
      `L ${Math.round(centre - foot)} ${Math.round(scale.floorY)}`,
      `L ${Math.round(centre - width * 0.42)} ${Math.round(hipY)}`,
      "Z",
    ].join(" ");
    return {
      centre: Math.round(centre),
      head: Math.round(head),
      headY: Math.round(top + head),
      silhouette,
      labelSize: Math.round(Math.max(dimensionLabelSize * 0.7, scale.doorWidth * 0.08)),
    };
  })() : null;
  const patternId = `vw-wall-led-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const hatchId = `vw-wall-band-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const { width, height } = layout.wall;
  const bezel = Math.max(2, width * 0.004);
  const cellWidth = width / layout.columns;
  const cellHeight = height / layout.rows;
  const windowWidth = width / layout.windowColumns;
  const windowHeight = height / layout.windowRows;
  const inset = Math.max(3, Math.min(windowWidth, windowHeight) * 0.03);
  const labelSize = Math.max(14, Math.min(58, Math.min(windowWidth, windowHeight) * 0.18));
  const showPanelNumbers = layout.mode === "panels" && layout.panels <= 12;
  const radius = Math.min(14, width * 0.01);
  const cropped = overlay?.mode === "fill";

  // A seam moved by the rep is a design answer, so it is stored with the wall
  // rather than kept in the drawing: the elevation, the proposal and the link
  // all read the same boundary. The write is clamped by the same reader that
  // draws it, so a drag can never collapse an image.
  const moveSeam = (boundary: number, fraction: number) => {
    if (!onRequirementsChange) return;
    const points = [...wallProjectorSplits(requirements)];
    // Half a percent is finer than a seam can be installed and coarse enough
    // that a drag writes tens of times rather than on every pointer event.
    points[boundary] = Math.round(Math.min(1, Math.max(0, fraction)) * 200) / 200;
    const clamped = wallProjectorSplits({ ...requirements, projectorSplits: points });
    if (clamped[boundary] === wallProjectorSplits(requirements)[boundary]) return;
    onRequirementsChange({ ...requirements, projectorSplits: clamped });
  };
  const seamFromPointer = (clientX: number) => {
    const box = wallFrameRef.current?.getBoundingClientRect();
    if (!box || box.width <= 0) return null;
    return (clientX - box.left) / box.width;
  };

  // A run that cannot carry its payload is marked where the cable lands, so the
  // rep can see which panel to rebuild rather than only that a link is over.
  const breaches: WallTransportLink[] = wallTransportPlan(requirements).allLinks
    .filter((link) => link.status === "limit");
  const breachForPanel = (index: number) => breaches.find((link) => link.group === "display" && Number(link.id.split("-").pop()) === index + 1);
  const wallBreach = layout.mode === "panels" ? null : breachForPanel(0);
  const breachFont = Math.max(12, Math.min(28, Math.min(cellWidth, cellHeight) * 0.11));
  // The tag names the run that cannot make it, so it lives inside the panel
  // that run feeds: a tag wider than its panel would point the rep at a cable
  // that is fine, so the type shrinks to stay within the failing surface.
  const breachTag = (link: WallTransportLink, box: { x: number; y: number; width: number; height: number }) => {
    const text = `${link.runMetres} m > ${link.limitMetres} m`;
    const pad = Math.max(6, Math.min(box.width, box.height) * 0.06);
    const font = Math.max(9, Math.min(breachFont, Math.max(40, box.width - pad * 2) / (text.length * 0.58 + 0.8)));
    const tagWidth = Math.round(text.length * font * 0.58 + font * 0.8);
    const tagHeight = Math.round(font * 1.6);
    // The panel number owns the top-left corner, so the tag takes the bottom.
    const x = box.x + pad;
    const y = box.y + box.height - pad - tagHeight;
    return (
      <g transform={`translate(${Math.round(x)} ${Math.round(y)})`}>
        <rect x={0} y={0} width={tagWidth} height={tagHeight} rx={Math.round(font * 0.35)} fill="#7f1d1d" opacity={0.94} />
        <text
          data-wall-breach-label={link.id}
          x={tagWidth / 2}
          y={tagHeight / 2}
          fontSize={font}
          fontWeight={700}
          fill="#fecaca"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {text}
        </text>
      </g>
    );
  };

  // Bars sit inside the wall; a crop is the overhang outside it.
  const bar = overlay?.mode === "fit"
    ? Math.round((overlay.edges === "top-bottom" ? height : width) * overlay.band)
    : 0;
  const bars: [number, number, number, number][] = overlay?.mode === "fit" && bar > 0
    ? overlay.edges === "top-bottom"
      ? [[0, 0, width, bar], [0, height - bar, width, bar]]
      : [[0, 0, bar, height], [width - bar, 0, bar, height]]
    : [];
  const barLabels: BandLabel[] = overlay?.mode === "fit" && bar >= 18
    ? overlay.edges === "top-bottom"
      ? [{ x: width / 2, y: bar / 2, rotate: false }, { x: width / 2, y: height - bar / 2, rotate: false }]
      : [{ x: bar / 2, y: height / 2, rotate: true }, { x: width - bar / 2, y: height / 2, rotate: true }]
    : [];
  const cropLabels: BandLabel[] = cropped && overlay
    ? overlay.edges === "top-bottom"
      ? origin.y >= 18
        ? [{ x: frame.width / 2, y: origin.y / 2, rotate: false }, { x: frame.width / 2, y: frame.height - origin.y / 2, rotate: false }]
        : []
      : origin.x >= 18
        ? [{ x: origin.x / 2, y: frame.height / 2, rotate: true }, { x: frame.width - origin.x / 2, y: frame.height / 2, rotate: true }]
        : []
    : [];
  const bandText = (label: BandLabel, text: string, colour: string) => (
    <text
      key={`${text}-${label.x}-${label.y}`}
      data-wall-band-label={text.toLowerCase()}
      x={label.x}
      y={label.y}
      fontSize={BAND_LABEL_SIZE}
      fontWeight={600}
      letterSpacing={3}
      fill={colour}
      textAnchor="middle"
      dominantBaseline="central"
      transform={label.rotate ? `rotate(-90 ${label.x} ${label.y})` : undefined}
    >
      {text}
    </text>
  );

  return (
    <figure className={`vw-wall vw-wall--${layout.mode}`}>
      <div className="vw-wall-head">
        <p className="vw-wall-title">Wall elevation</p>
        <span className="vw-wall-aspect">{layout.aspectLabel}</span>
      </div>
      <div className="vw-wall-stage">
        <svg
          viewBox={`0 0 ${drawing.width} ${drawing.height}`}
          role="img"
          aria-label={`${layout.ariaLabel}${overlay ? ` ${overlay.text}.` : ""}${breaches.length ? ` ${breaches.map((link) => `${link.label}: ${link.runMetres} m run exceeds the ${link.limitMetres} m limit.`).join(" ")}` : ""}${scale ? " A 1,700 mm person in a 2,040 mm doorway gives the scale." : ""}`}
        >
          <defs>
            <pattern id={patternId} width={16} height={16} patternUnits="userSpaceOnUse">
              <circle cx={4} cy={4} r={1.4} fill="#53e0e8" opacity={0.22} />
            </pattern>
            {overlay ? (
              <pattern id={hatchId} width={14} height={14} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1={0} y1={0} x2={0} y2={14} stroke={cropped ? "#ef9a9a" : "#7fb8c4"} strokeWidth={3} />
              </pattern>
            ) : null}
          </defs>
          <g transform={`translate(${margin.left} ${margin.top})`}>
          {cropped ? (
            <g data-wall-crop="true">
              <rect x={0} y={0} width={frame.width} height={frame.height} rx={radius} fill="#2a1416" opacity={0.7} />
              <rect x={0} y={0} width={frame.width} height={frame.height} rx={radius} fill={`url(#${hatchId})`} opacity={0.55} />
            </g>
          ) : null}
          <g transform={`translate(${origin.x} ${origin.y})`}>
            <rect ref={wallFrameRef} className="vw-wall-frame" x={0} y={0} width={width} height={height} rx={radius} />
            {layout.mode === "panels" ? (
              Array.from({ length: layout.panels }, (_, index) => {
                const x = (index % layout.columns) * cellWidth;
                const y = Math.floor(index / layout.columns) * cellHeight;
                return (
                  <rect
                    key={index}
                    className="vw-wall-panel"
                    x={x + bezel / 2}
                    y={y + bezel / 2}
                    width={cellWidth - bezel}
                    height={cellHeight - bezel}
                    rx={Math.min(8, cellWidth * 0.02)}
                  />
                );
              })
            ) : layout.mode === "canvas" ? (
              <>
                <rect className="vw-wall-screen" x={bezel} y={bezel} width={width - bezel * 2} height={height - bezel * 2} rx={Math.min(8, width * 0.01)} />
                <rect className="vw-wall-screen" x={bezel} y={bezel} width={width - bezel * 2} height={height - bezel * 2} rx={Math.min(8, width * 0.01)} fill={`url(#${patternId})`} />
              </>
            ) : (
              <rect className="vw-wall-screen" x={bezel} y={bezel} width={width - bezel * 2} height={height - bezel * 2} rx={Math.min(10, width * 0.012)} />
            )}
            {layout.windows.map((window) => {
              const x = window.column * windowWidth + inset;
              const y = window.row * windowHeight + inset;
              return (
                <g key={window.index}>
                  <rect
                    className="vw-wall-window"
                    data-tone={window.tone}
                    x={x}
                    y={y}
                    width={windowWidth - inset * 2}
                    height={windowHeight - inset * 2}
                    rx={Math.min(10, windowWidth * 0.04)}
                  />
                  <text
                    className="vw-wall-window-label"
                    x={x + (windowWidth - inset * 2) / 2}
                    y={y + (windowHeight - inset * 2) / 2}
                    fontSize={labelSize}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {window.label}
                  </text>
                </g>
              );
            })}
            {layout.mode === "panels" ? (
              Array.from({ length: layout.panels }, (_, index) => {
                const x = (index % layout.columns) * cellWidth;
                const y = Math.floor(index / layout.columns) * cellHeight;
                return (
                  <g key={`bezel-${index}`}>
                    <rect className="vw-wall-bezel" x={x + bezel / 2} y={y + bezel / 2} width={cellWidth - bezel} height={cellHeight - bezel} rx={Math.min(8, cellWidth * 0.02)} />
                    {showPanelNumbers ? (
                      <text className="vw-wall-panel-label" x={x + bezel + cellWidth * 0.06} y={y + bezel + cellHeight * 0.09} fontSize={Math.max(10, cellHeight * 0.07)}>
                        {index + 1}
                      </text>
                    ) : null}
                  </g>
                );
              })
            ) : null}
            {bars.map(([x, y, w, h], index) => (
              <g key={`bar-${index}`} data-wall-bar="true">
                <rect x={x} y={y} width={w} height={h} fill="#020b12" opacity={0.62} />
                <rect x={x} y={y} width={w} height={h} fill={`url(#${hatchId})`} opacity={0.9} />
              </g>
            ))}
            {overlay?.mode === "fit" && bar > 0 ? (
              <rect
                data-wall-content-frame="true"
                x={overlay.edges === "top-bottom" ? 1 : bar}
                y={overlay.edges === "top-bottom" ? bar : 1}
                width={overlay.edges === "top-bottom" ? width - 2 : width - bar * 2}
                height={overlay.edges === "top-bottom" ? height - bar * 2 : height - 2}
                fill="none"
                stroke="#16b8b0"
                strokeWidth={2}
                strokeDasharray="12 8"
                opacity={0.8}
              />
            ) : null}
            {barLabels.map((label) => bandText(label, "Bars", "#a7dbe0"))}
            {/* A screen carried by several projectors draws as several images:
                the seam where one ends and the next begins, or — once the
                overlap has been surveyed — the band the two of them share.
                A seam is also the control: a wide image beside a narrow one
                meets somewhere other than the middle, so the rep drags it (or
                nudges it with the arrow keys) to where the images really meet. */}
            {layout.projectorSlices.length ? (
              <g data-wall-projectors="true">
                {layout.projectorSlices.slice(1).map((slice) => {
                  const boundary = slice.index - 1;
                  const blend = layout.projectorBlends.find((item) => item.x === slice.start) ?? null;
                  const x = slice.start * width;
                  const bandWidth = blend ? Math.max(2, (blend.end - blend.start) * width) : 0;
                  const share = Math.round(slice.start * 100);
                  // The slider stops where the neighbouring images stop being
                  // real, so its stated range is the range it will accept.
                  const previousBoundary = layout.projectorSlices[boundary - 1]?.start ?? 0;
                  const nextBoundary = layout.projectorSlices[boundary + 2]?.start ?? 1;
                  return (
                    <g key={`boundary-${boundary}`} data-wall-boundary={boundary}>
                      {blend ? (
                        <g data-wall-blend-band={blend.overlapMm}>
                          <rect x={x} y={0} width={bandWidth} height={height} fill="#f5a524" opacity={0.2} />
                          <line x1={x} y1={0} x2={x} y2={height} stroke="#a86a00" strokeWidth={2} strokeDasharray="8 5" />
                          <line x1={x + bandWidth} y1={0} x2={x + bandWidth} y2={height} stroke="#a86a00" strokeWidth={2} strokeDasharray="8 5" />
                          <text x={x + bandWidth / 2} y={height * 0.94} textAnchor="middle" fontSize={Math.max(10, width * 0.012)} fill="#6b4400">
                            {`${blend.overlapMm} mm blend`}
                          </text>
                        </g>
                      ) : (
                        <line data-wall-projector-seam="true" x1={x} y1={0} x2={x} y2={height} stroke="#f5a524" strokeWidth={2} strokeDasharray="6 6" />
                      )}
                      {onRequirementsChange ? (
                        <g
                          data-wall-seam-handle={boundary}
                          role="slider"
                          tabIndex={0}
                          aria-label={`Seam between Projector ${slice.index} and Projector ${slice.index + 1}`}
                          aria-orientation="horizontal"
                          aria-valuemin={Math.round((previousBoundary + MIN_PROJECTOR_IMAGE_SHARE) * 100)}
                          aria-valuemax={Math.round((nextBoundary - MIN_PROJECTOR_IMAGE_SHARE) * 100)}
                          aria-valuenow={share}
                          aria-valuetext={`${share}% of the screen`}
                          style={{ cursor: draggingSeam === boundary ? "grabbing" : "ew-resize" }}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.currentTarget.setPointerCapture?.(event.pointerId);
                            setDraggingSeam(boundary);
                          }}
                          onPointerMove={(event) => {
                            if (draggingSeam !== boundary) return;
                            const fraction = seamFromPointer(event.clientX);
                            if (fraction !== null) moveSeam(boundary, fraction);
                          }}
                          onPointerUp={() => setDraggingSeam(null)}
                          onPointerCancel={() => setDraggingSeam(null)}
                          onKeyDown={(event) => {
                            const step = event.key === "ArrowLeft" ? -0.01 : event.key === "ArrowRight" ? 0.01 : 0;
                            if (!step) return;
                            event.preventDefault();
                            moveSeam(boundary, slice.start + step * (event.shiftKey ? 5 : 1));
                          }}
                        >
                          {/* The grip is drawn where the seam is, so the control
                              and the boundary cannot drift apart. */}
                          <rect x={x - 22} y={height * 0.5 - 34} width={44} height={68} rx={10} fill="transparent" />
                          <rect x={x - 7} y={height * 0.5 - 28} width={14} height={56} rx={7} fill="#f5a524" stroke="#6b4400" strokeWidth={2} />
                          <line x1={x - 2} y1={height * 0.5 - 18} x2={x - 2} y2={height * 0.5 + 18} stroke="#6b4400" strokeWidth={2} />
                          <line x1={x + 2} y1={height * 0.5 - 18} x2={x + 2} y2={height * 0.5 + 18} stroke="#6b4400" strokeWidth={2} />
                        </g>
                      ) : null}
                    </g>
                  );
                })}
                {layout.projectorSlices.map((slice) => (
                  <text
                    key={`slice-${slice.label}`}
                    data-wall-projector-slice={slice.label}
                    x={((slice.start + slice.end) / 2) * width}
                    y={Math.max(16, height * 0.06)}
                    textAnchor="middle"
                    fontSize={Math.max(10, width * 0.014)}
                    fontWeight={700}
                    fill="#f5a524"
                  >
                    {slice.label}
                  </text>
                ))}
              </g>
            ) : null}
          {/* A breach is drawn where the cable lands: the panel it feeds, or the
              whole canvas when the wall is one surface. */}
          {breaches.length ? (
            <g data-wall-breaches="true">
              {layout.mode === "panels"
                ? Array.from({ length: layout.panels }, (_, index) => {
                  const link = breachForPanel(index);
                  if (!link) return null;
                  const x = (index % layout.columns) * cellWidth;
                  const y = Math.floor(index / layout.columns) * cellHeight;
                  return (
                    <g key={`breach-${link.id}`} data-wall-breach={link.id}>
                      <rect
                        x={x + bezel / 2}
                        y={y + bezel / 2}
                        width={cellWidth - bezel}
                        height={cellHeight - bezel}
                        rx={Math.min(8, cellWidth * 0.02)}
                        fill="none"
                        stroke="#f87171"
                        strokeWidth={Math.max(3, width * 0.004)}
                        strokeDasharray="16 10"
                      />
                      {breachTag(link, { x, y, width: cellWidth, height: cellHeight })}
                    </g>
                  );
                })
                : wallBreach ? (
                  <g data-wall-breach={wallBreach.id}>
                    <rect
                      x={bezel}
                      y={bezel}
                      width={width - bezel * 2}
                      height={height - bezel * 2}
                      rx={radius}
                      fill="none"
                      stroke="#f87171"
                      strokeWidth={Math.max(3, width * 0.004)}
                      strokeDasharray="16 10"
                    />
                    {breachTag(wallBreach, { x: 0, y: 0, width, height })}
                  </g>
                ) : null}
            </g>
          ) : null}
          </g>
          {cropped ? (
            <rect
              data-wall-source-frame="true"
              x={0.5}
              y={0.5}
              width={frame.width - 1}
              height={frame.height - 1}
              rx={radius}
              fill="none"
              stroke="#ef9a9a"
              strokeWidth={2}
              strokeDasharray="14 10"
              opacity={0.9}
            />
          ) : null}
          {cropLabels.map((label) => bandText(label, "Cropped", "#f2b8b8"))}
          {dimensions.map((dimension) => (
            <DimensionLine key={dimension.key} dimension={dimension} labelSize={dimensionLabelSize} />
          ))}
          </g>
          {/* The figure stands on the floor below the mounting gap, outside the gutter. */}
          {scale && figure ? (
            <g data-scale-figure="true">
              <line
                className="vw-wall-ground"
                x1={Math.round(scale.wallRight)}
                y1={Math.round(scale.floorY)}
                x2={Math.round(scale.x + scale.doorWidth)}
                y2={Math.round(scale.floorY)}
              />
              <rect
                className="vw-wall-door"
                x={Math.round(scale.x)}
                y={Math.round(scale.floorY - scale.doorHeight)}
                width={Math.round(scale.doorWidth)}
                height={Math.round(scale.doorHeight)}
                rx={2}
              />
              <path className="vw-wall-person" d={figure.silhouette} />
              <circle className="vw-wall-person" cx={figure.centre} cy={figure.headY} r={figure.head} />
              <text
                className="vw-wall-scale-label"
                x={figure.centre}
                y={Math.round(scale.floorY + figure.labelSize * 1.35)}
                fontSize={figure.labelSize}
                textAnchor="middle"
              >
                1,700 mm
              </text>
            </g>
          ) : null}
          {geometry.ceiling ? <g data-ceiling="true"><line x1={margin.left} y1={geometry.ceiling.y} x2={drawing.width} y2={geometry.ceiling.y} stroke="#c7d8e2" strokeDasharray="10 6" /><text x={margin.left} y={geometry.ceiling.y - 6} fill="#c7d8e2" fontSize={dimensionLabelSize}>Ceiling {geometry.ceiling.heightMm} mm · headroom {geometry.ceiling.headroomMm} mm</text></g> : null}
        </svg>
      </div>
      {warning ? (
        <div className="vw-wall-warning" data-wall-warning={warning.mode}>
          <p className="vw-wall-warning-text" role="status">
            <strong>Check the mapping.</strong> {warning.advice}
          </p>
          {fixes.length ? (
            <div className="vw-wall-fixes" role="group" aria-label="Fix the source shape">
              {fixes.map((fix) => (
                <button
                  key={fix.id}
                  type="button"
                  className="vw-wall-fix"
                  data-wall-fix={fix.id}
                  onClick={() => {
                    setUndoRequirements(requirements);
                    const { ledCanvasWidth, ledCanvasHeight, sourceCustom, sourceWidth, sourceHeight } = requirements;
                    onRequirementsChange?.({ ...fix.requirements, mappingHistory: [...(requirements.mappingHistory ?? []), { appliedAt: new Date().toISOString(), kind: fix.id, before: { ledCanvasWidth, ledCanvasHeight, sourceCustom, sourceWidth, sourceHeight } }] });
                  }}
                >
                  <img
                    src={`data:image/svg+xml;utf8,${encodeURIComponent(fix.previewSvg)}`}
                    alt={`Preview of the wall after ${fix.label.toLowerCase()}`}
                  />
                  <span className="vw-wall-fix-copy">
                    <strong>{fix.label}</strong>
                    <span>{fix.detail}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {undoRequirements && onRequirementsChange ? <button type="button" onClick={() => { const previous = undoRequirements; onRequirementsChange({ ...requirements, ledCanvasWidth: previous.ledCanvasWidth, ledCanvasHeight: previous.ledCanvasHeight, sourceCustom: previous.sourceCustom, sourceWidth: previous.sourceWidth, sourceHeight: previous.sourceHeight, mappingHistory: requirements.mappingHistory?.map((entry, index, entries) => index === entries.length - 1 ? { ...entry, undoneAt: new Date().toISOString() } : entry) }); setUndoRequirements(null); }}>Undo mapping snap</button> : null}
      {geometry.ceiling && geometry.ceiling.headroomMm < 0 ? <p role="alert">Wall top exceeds the ceiling by {-geometry.ceiling.headroomMm} mm. {geometry.ceiling.heightMm >= layout.physical.wall.height ? <button type="button" onClick={() => onRequirementsChange?.({ ...requirements, mountingHeightMm: geometry.ceiling!.heightMm - layout.physical.wall.height })}>Set bottom edge to {geometry.ceiling.heightMm - layout.physical.wall.height} mm</button> : "The wall itself is taller than the room; reduce its height."}</p> : null}
      {recommendation && requirements.mapping && requirements.mapping !== recommendation.value ? <p role="alert">Saved mapping differs from the recommendation. <a href="#wall-mapping-pair">Compare fit and fill</a>.</p> : null}
      {mappingChoices && onMappingChange ? (
        <div id="wall-mapping-pair" className="vw-wall-mapping" role="group" aria-label="Source mapping">
          <p>Source mapping</p>
          <div>
            {mappingChoices.map((choice) => (
              <button
                key={choice.value}
                type="button"
                data-wall-mapping-choice={choice.value}
                aria-pressed={overlay?.mode === choice.value}
                onClick={() => onMappingChange(choice.value)}
              >
                <strong>{choice.value === "fit" ? "Fit" : "Fill"}</strong>
                <span>{choice.text}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="vw-wall-meta">
        <span>{layout.arrayLabel}</span>
        <span>{layout.pixelsLabel}</span>
        <span>{layout.windowLabel}</span>
        <span data-wall-dimensions="true">{layout.physical.text}</span>
        <span data-wall-mounting="true">{`Bottom edge ${formatMillimetres(geometry.mounting.heightMm)} mm above the floor`}</span>
        {breaches.map((link) => (
          <span key={link.id} data-wall-breach-link={link.id}>
            {`${link.label}: ${link.runMetres} m run · ${link.limitMetres} m limit`}
          </span>
        ))}
        {overlay ? <span data-wall-mapping="true">{overlay.text}</span> : null}
        {layout.imageSharesLabel ? (
          <span data-wall-image-shares={layout.imageSharesLabel}>{`Image shares ${layout.imageSharesLabel}`}</span>
        ) : null}
        {layout.projectorSlices.length ? (
          <span data-wall-blend={layout.projectorBlends[0]?.overlapMm ?? 0}>
            {layout.projectorBlends.length
              ? `${layout.projectorBlends[0].overlapMm} mm blend measured at survey`
              : "Blend overlap confirmed at survey"}
          </span>
        ) : null}
      </div>
      {/* The drawing's two type sizes, said once for every place it prints. */}
      <ul className="vw-wall-key" aria-label="Drawing key">
        {wallElevationKey(layout).map((item) => (
          <li key={item.kind} className="vw-wall-key-item" data-wall-key={item.kind}>
            <span className={`vw-wall-key-mark vw-wall-key-mark--${item.kind}`} aria-hidden="true">{item.mark}</span>
            {item.text}
          </li>
        ))}
      </ul>
      <figcaption className="vw-wall-caption">{layout.caption}</figcaption>
    </figure>
  );
}
