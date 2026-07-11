import type {
  ProductTopologyBranch,
  ProductTopologyEndpoint,
  ProductTopologyProfile,
  ProductTopologySignal,
} from "./productTopology";

export type RoomSchematicInput = {
  sku: string;
  profile: ProductTopologyProfile;
};

const SIGNAL: Record<
  ProductTopologySignal,
  { color: string; label: string; dash?: string }
> = {
  video: { color: "#2563eb", label: "Video" },
  network: { color: "#0e9f6e", label: "Network / category / fibre" },
  usb: { color: "#d97706", label: "USB / host / peripherals" },
  control: { color: "#7c3aed", label: "Control", dash: "7 5" },
  audio: { color: "#db2777", label: "Audio" },
  power: { color: "#dc2626", label: "Power delivery", dash: "9 4" },
  capture: { color: "#64748b", label: "Room capture", dash: "2 6" },
};

function escapeXml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = String(text ?? "").trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;

    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else {
      line = candidate;
    }
  }

  if (line && lines.length < maxLines) lines.push(line);

  if (lines.join(" ").length < String(text ?? "").trim().length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1]}…`;
  }

  return lines.slice(0, maxLines);
}

function endpointBlock(options: {
  endpoint: ProductTopologyEndpoint;
  x: number;
  y: number;
  w: number;
  h: number;
  accent: string;
  emphasis?: boolean;
}): string {
  const { endpoint, x, y, w, h, accent, emphasis } = options;
  const fill = emphasis ? "#ecfeff" : "#ffffff";
  const stroke = emphasis ? "#0891b2" : accent;
  const strokeWidth = emphasis ? 2.5 : 1.5;
  const titleLines = wrapText(endpoint.title, emphasis ? 26 : 24, 2);
  const detailLines = wrapText(endpoint.detail, 31, 2);

  const titleMarkup = titleLines
    .map(
      (line, index) =>
        `<text x="${x + 14}" y="${y + 40 + index * 15}" font-size="${
          emphasis ? 15 : 13
        }" font-weight="700" fill="#0f172a">${escapeXml(line)}</text>`,
    )
    .join("");

  const detailStart = y + 40 + titleLines.length * 15 + 5;
  const detailMarkup = detailLines
    .map(
      (line, index) =>
        `<text x="${x + 14}" y="${detailStart + index * 14}" font-size="10.5" fill="#475569">${escapeXml(
          line,
        )}</text>`,
    )
    .join("");

  return `
  <g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="11" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    <path d="M${x},${y + 11} a11,11 0 0 1 11,-11 h${
      w - 22
    } a11,11 0 0 1 11,11 v23 h-${w} z" fill="${accent}"/>
    <text x="${x + 14}" y="${y + 19}" font-size="11" font-weight="750" letter-spacing="0.55" fill="#ffffff">${escapeXml(
      endpoint.tag,
    )}</text>
    ${titleMarkup}
    ${detailMarkup}
  </g>`;
}

function branchBlock(
  branch: ProductTopologyBranch,
  geometry: { x: number; y: number; w: number; h: number },
): string {
  return endpointBlock({
    endpoint: branch,
    ...geometry,
    accent: SIGNAL[branch.signal].color,
  });
}

function edgeLabel(cx: number, cy: number, text: string, color: string): string {
  const width = Math.min(270, Math.max(88, text.length * 5.9 + 18));

  return `
    <g>
      <rect x="${cx - width / 2}" y="${cy - 12}" width="${width}" height="24" rx="7" fill="#ffffff" stroke="${color}" stroke-opacity="0.46"/>
      <text x="${cx}" y="${cy + 4}" font-size="10.4" font-weight="650" text-anchor="middle" fill="${color}">${escapeXml(
        text,
      )}</text>
    </g>`;
}

function connector(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  signal: ProductTopologySignal,
  labelText: string,
): string {
  const { color, dash } = SIGNAL[signal];
  const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";
  const line = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2.5" marker-end="url(#wm-arrow-${signal})"${dashAttr}/>`;
  const midx = (x1 + x2) / 2;
  const midy = (y1 + y2) / 2;

  return `${line}${edgeLabel(midx, midy, labelText, color)}`;
}

function markerDefinitions(): string {
  return Object.entries(SIGNAL)
    .map(
      ([key, signal]) => `
      <marker id="wm-arrow-${key}" markerWidth="11" markerHeight="11" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L8,3 L0,6 Z" fill="${signal.color}"/>
      </marker>`,
    )
    .join("");
}

function confidenceLabel(profile: ProductTopologyProfile): string {
  if (profile.confidence === "verified") return "Verified topology";
  if (profile.confidence === "inferred") return "Family/type topology";
  return "Review required";
}

function buildReviewRequiredSvg(input: RoomSchematicInput): string {
  const checks = input.profile.checks.slice(0, 3);
  const warning = input.profile.warnings[0] || "Topology evidence is incomplete.";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 520" font-family="'Segoe UI', system-ui, -apple-system, sans-serif" role="img" aria-label="Topology review required for ${escapeXml(
    input.sku,
  )}">
    <rect width="920" height="520" fill="#f8fafc"/>
    <rect x="54" y="50" width="812" height="405" rx="22" fill="#fff7ed" stroke="#f97316" stroke-width="2"/>
    <text x="84" y="98" font-size="13" font-weight="750" letter-spacing="1" fill="#c2410c">TOPOLOGY REVIEW REQUIRED</text>
    <text x="84" y="142" font-size="28" font-weight="800" fill="#0f172a">${escapeXml(
      input.sku,
    )}</text>
    <text x="84" y="177" font-size="16" font-weight="650" fill="#334155">${escapeXml(
      input.profile.product.detail,
    )}</text>
    <text x="84" y="223" font-size="14" fill="#9a3412">${escapeXml(
      wrapText(warning, 92, 1)[0] || warning,
    )}</text>
    <text x="84" y="272" font-size="13" font-weight="750" fill="#0f172a">Confirm before drawing:</text>
    ${checks
      .map(
        (check, index) =>
          `<circle cx="93" cy="${306 + index * 38}" r="4" fill="#f97316"/>
           <text x="110" y="${311 + index * 38}" font-size="12.5" fill="#334155">${escapeXml(
             wrapText(check, 90, 1)[0] || check,
           )}</text>`,
      )
      .join("")}
    <text x="84" y="432" font-size="11" fill="#64748b">Wingman has withheld a connection diagram rather than inventing ports, direction or dependencies.</text>
  </svg>`;
}

export function buildRoomSchematicSvg(input: RoomSchematicInput): string {
  const profile = input.profile;

  if (!profile.renderable) {
    return buildReviewRequiredSvg(input);
  }

  const product = { x: 355, y: 230, w: 210, h: 116 };
  const source = { x: 50, y: 238, w: 220, h: 102 };
  const output = { x: 650, y: 238, w: 220, h: 102 };
  const top = { x: 337, y: 72, w: 246, h: 100 };
  const bottom = { x: 337, y: 400, w: 246, h: 100 };

  const topBranch = profile.branches.find((branch) => branch.slot === "top");
  const bottomBranch = profile.branches.find((branch) => branch.slot === "bottom");

  const productEndpoint: ProductTopologyEndpoint = {
    tag: profile.product.tag,
    title: input.sku,
    detail: profile.product.detail,
  };

  const productCy = product.y + product.h / 2;
  const usedSignals = new Set<ProductTopologySignal>([
    profile.sourceEdge.signal,
    profile.outputEdge.signal,
    ...profile.branches.map((branch) => branch.signal),
  ]);

  const blocks = [
    endpointBlock({
      endpoint: profile.source,
      ...source,
      accent: SIGNAL[profile.sourceEdge.signal].color,
    }),
    endpointBlock({
      endpoint: profile.output,
      ...output,
      accent: SIGNAL[profile.outputEdge.signal].color,
    }),
    topBranch ? branchBlock(topBranch, top) : "",
    bottomBranch ? branchBlock(bottomBranch, bottom) : "",
    endpointBlock({
      endpoint: productEndpoint,
      ...product,
      accent: "#0891b2",
      emphasis: true,
    }),
  ].join("");

  const connectors = [
    connector(
      source.x + source.w,
      productCy,
      product.x,
      productCy,
      profile.sourceEdge.signal,
      profile.sourceEdge.label,
    ),
    connector(
      product.x + product.w,
      productCy,
      output.x,
      productCy,
      profile.outputEdge.signal,
      profile.outputEdge.label,
    ),
    topBranch
      ? connector(
          top.x + top.w / 2,
          top.y + top.h,
          product.x + product.w / 2,
          product.y,
          topBranch.signal,
          topBranch.label,
        )
      : "",
    bottomBranch
      ? connector(
          bottom.x + bottom.w / 2,
          bottom.y,
          product.x + product.w / 2,
          product.y + product.h,
          bottomBranch.signal,
          bottomBranch.label,
        )
      : "",
  ].join("");

  const legend = Array.from(usedSignals)
    .map((signal, index) => {
      const lx = 52 + index * 166;
      const definition = SIGNAL[signal];
      const dashAttr = definition.dash
        ? ` stroke-dasharray="${definition.dash}"`
        : "";

      return `
        <line x1="${lx}" y1="566" x2="${lx + 28}" y2="566" stroke="${definition.color}" stroke-width="3"${dashAttr}/>
        <text x="${lx + 36}" y="570" font-size="10.7" fill="#334155">${escapeXml(
          definition.label,
        )}</text>`;
    })
    .join("");

  const primaryWarning = profile.warnings[0] || profile.checks[0] || "";
  const footerText = primaryWarning
    ? `Check: ${primaryWarning}`
    : "Indicative connectivity — confirm ports, distance, power, USB topology and dependencies before quoting.";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 610" font-family="'Segoe UI', system-ui, -apple-system, sans-serif" role="img" aria-label="Product-aware room connectivity schematic for ${escapeXml(
    input.sku,
  )}">
    <defs>${markerDefinitions()}</defs>
    <rect width="920" height="610" fill="#f8fafc"/>
    <rect x="26" y="24" width="868" height="514" rx="22" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 6"/>
    <text x="48" y="54" font-size="11" font-weight="750" letter-spacing="0.8" fill="#0891b2">${escapeXml(
      profile.label.toUpperCase(),
    )}</text>
    <rect x="720" y="36" width="150" height="26" rx="8" fill="${
      profile.confidence === "verified" ? "#dcfce7" : "#e0f2fe"
    }" stroke="${profile.confidence === "verified" ? "#16a34a" : "#0284c7"}"/>
    <text x="795" y="53" font-size="10.5" font-weight="700" text-anchor="middle" fill="${
      profile.confidence === "verified" ? "#166534" : "#075985"
    }">${escapeXml(confidenceLabel(profile))}</text>
    ${connectors}
    ${blocks}
    ${legend}
    <text x="52" y="597" font-size="10.4" fill="#64748b">${escapeXml(
      wrapText(footerText, 132, 1)[0] || footerText,
    )}</text>
  </svg>`;
}

export default buildRoomSchematicSvg;
