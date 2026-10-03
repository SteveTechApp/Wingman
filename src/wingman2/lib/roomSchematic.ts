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

type BlockGeometry = { x: number; y: number; w: number; h: number };

function polylineConnector(
  points: Array<[number, number]>,
  signal: ProductTopologySignal,
  labelText: string,
  labelX: number,
  labelY: number,
  target: "product" | "source" | "output",
): string {
  const { color, dash } = SIGNAL[signal];
  const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";
  const pointText = points.map(([x, y]) => `${x},${y}`).join(" ");

  return `<g data-branch-target="${target}">
    <polyline points="${pointText}" fill="none" stroke="${color}" stroke-width="2.5" marker-end="url(#wm-arrow-${signal})"${dashAttr}/>
    ${edgeLabel(labelX, labelY, labelText, color)}
  </g>`;
}

function branchConnector(
  branch: ProductTopologyBranch,
  branchBox: BlockGeometry,
  sourceBox: BlockGeometry,
  productBox: BlockGeometry,
  outputBox: BlockGeometry,
  slot: "top" | "bottom",
): string {
  const target = branch.target ?? "product";
  const targetBox =
    target === "source" ? sourceBox : target === "output" ? outputBox : productBox;
  const branchX = branchBox.x + branchBox.w / 2;
  const targetX = targetBox.x + targetBox.w / 2;

  if (slot === "top") {
    const startY = branchBox.y + branchBox.h;
    const routeY = Math.min(targetBox.y - 32, startY + 38);
    const endY = targetBox.y;

    return polylineConnector(
      [
        [branchX, startY],
        [branchX, routeY],
        [targetX, routeY],
        [targetX, endY],
      ],
      branch.signal,
      branch.label,
      (branchX + targetX) / 2,
      routeY - 15,
      target,
    );
  }

  const startY = branchBox.y;
  const routeY = Math.max(targetBox.y + targetBox.h + 32, startY - 38);
  const endY = targetBox.y + targetBox.h;

  return polylineConnector(
    [
      [branchX, startY],
      [branchX, routeY],
      [targetX, routeY],
      [targetX, endY],
    ],
    branch.signal,
    branch.label,
    (branchX + targetX) / 2,
    routeY + 15,
    target,
  );
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

function buildMatrixSchematicSvg(input: RoomSchematicInput): string {
  const profile = input.profile;
  const architecture = profile.matrixArchitecture!;
  const inputs = Math.min(architecture.inputCount, 6);
  const outputs = Math.min(architecture.outputCount, 6);
  const rows = Math.max(inputs, outputs);
  const rowGap = rows > 4 ? 48 : 62;
  const firstY = 196;
  const matrixY = firstY - 68;
  const matrixH = (rows - 1) * rowGap + 98;
  const controls = architecture.controlInterfaces.length
    ? architecture.controlInterfaces.join(" · ")
    : "Front panel / control system";
  const receiverLayer = architecture.receiverCount > 0;

  const sourceRows = Array.from({ length: inputs }, (_, index) => {
    const y = firstY + index * rowGap;
    return `<g data-connection="input-${index + 1}">
      <rect x="48" y="${y - 18}" width="154" height="36" rx="7" fill="#ffffff" stroke="#2563eb"/>
      <circle cx="66" cy="${y}" r="9" fill="#dbeafe"/><text x="66" y="${y + 3.5}" text-anchor="middle" font-size="9" font-weight="800" fill="#1d4ed8">${index + 1}</text>
      <text x="82" y="${y - 2}" font-size="10.5" font-weight="700" fill="#0f172a">Source ${index + 1}</text>
      <text x="82" y="${y + 11}" font-size="8.8" fill="#64748b">${escapeXml(architecture.inputTransport)} output</text>
      <line x1="202" y1="${y}" x2="296" y2="${y}" stroke="#2563eb" stroke-width="2.2" marker-end="url(#wm-arrow-video)"/>
      <text x="254" y="${y - 7}" text-anchor="middle" font-size="8.4" fill="#1d4ed8">${escapeXml(architecture.inputTransport)} IN ${index + 1}</text>
    </g>`;
  }).join("");

  const outputRows = Array.from({ length: outputs }, (_, index) => {
    const y = firstY + index * rowGap;
    const receiver = receiverLayer
      ? `<rect x="566" y="${y - 18}" width="132" height="36" rx="7" fill="#ecfdf5" stroke="#0e9f6e"/>
         <text x="632" y="${y - 2}" text-anchor="middle" font-size="9.6" font-weight="750" fill="#065f46">Receiver ${index + 1}</text>
         <text x="632" y="${y + 11}" text-anchor="middle" font-size="8.2" fill="#047857">HDBaseT → HDMI</text>`
      : "";
    const linkEnd = receiverLayer ? 554 : 734;
    const displayStart = receiverLayer ? 698 : 552;
    return `<g data-connection="output-${index + 1}">
      <line x1="500" y1="${y - 3}" x2="${linkEnd}" y2="${y - 3}" stroke="#0e9f6e" stroke-width="3" marker-end="url(#wm-arrow-network)"/>
      ${architecture.powerOverLink ? `<line x1="504" y1="${y + 7}" x2="${linkEnd - 4}" y2="${y + 7}" stroke="#dc2626" stroke-width="1.4" stroke-dasharray="5 4"/>` : ""}
      ${receiver}
      <line x1="${displayStart}" y1="${y}" x2="736" y2="${y}" stroke="#2563eb" stroke-width="2.2" marker-end="url(#wm-arrow-video)"/>
      <rect x="746" y="${y - 18}" width="126" height="36" rx="7" fill="#ffffff" stroke="#2563eb"/>
      <rect x="760" y="${y - 9}" width="20" height="14" rx="2" fill="#dbeafe" stroke="#2563eb"/><line x1="766" y1="${y + 8}" x2="774" y2="${y + 8}" stroke="#2563eb"/>
      <text x="790" y="${y - 2}" font-size="10.2" font-weight="700" fill="#0f172a">Display ${index + 1}</text>
      <text x="790" y="${y + 11}" font-size="8.4" fill="#64748b">Independent zone</text>
    </g>`;
  }).join("");

  const crosspoints = Array.from({ length: outputs }, (_, outputIndex) =>
    Array.from({ length: inputs }, (_, inputIndex) => {
      const x = 340 + inputIndex * (132 / Math.max(inputs - 1, 1));
      const y = firstY + outputIndex * rowGap;
      return `<circle cx="${x}" cy="${y}" r="3.4" fill="${inputIndex === outputIndex ? "#0891b2" : "#cbd5e1"}"/>`;
    }).join(""),
  ).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 610" font-family="'Segoe UI', system-ui, -apple-system, sans-serif" role="img" aria-label="${architecture.inputCount} by ${architecture.outputCount} connection schematic for ${escapeXml(input.sku)}">
    <defs>${markerDefinitions()}</defs>
    <rect width="920" height="610" fill="#f8fafc"/>
    <rect x="22" y="20" width="876" height="526" rx="18" fill="#ffffff" stroke="#94a3b8" stroke-width="1.2"/>
    <text x="46" y="49" font-size="11" font-weight="800" letter-spacing=".9" fill="#0891b2">${architecture.inputCount} × ${architecture.outputCount} ROUTED SIGNAL ARCHITECTURE</text>
    <text x="46" y="68" font-size="9.5" fill="#64748b">Each output can select any input independently. Receiver and transport layers are shown explicitly.</text>
    <rect x="304" y="74" width="198" height="38" rx="8" fill="#f5f3ff" stroke="#7c3aed"/>
    <text x="320" y="89" font-size="8.5" font-weight="800" fill="#6d28d9">CONTROL</text><text x="320" y="103" font-size="9" fill="#334155">${escapeXml(controls)}</text>
    <line x1="403" y1="112" x2="403" y2="${matrixY - 10}" stroke="#7c3aed" stroke-width="2" stroke-dasharray="7 5" marker-end="url(#wm-arrow-control)"/>
    <rect x="306" y="${matrixY}" width="194" height="${matrixH}" rx="12" fill="#ecfeff" stroke="#0891b2" stroke-width="2.4"/>
    <rect x="306" y="${matrixY}" width="194" height="42" rx="12" fill="#0891b2"/><rect x="306" y="${matrixY + 30}" width="194" height="12" fill="#0891b2"/>
    <text x="322" y="${matrixY + 18}" font-size="9" font-weight="800" fill="#cffafe">MATRIX ROUTING CORE</text><text x="322" y="${matrixY + 34}" font-size="12.5" font-weight="800" fill="#ffffff">${escapeXml(input.sku)}</text>
    <text x="403" y="${matrixY + 55}" text-anchor="middle" font-size="7.8" font-weight="700" letter-spacing=".35" fill="#64748b">ANY INPUT → ANY OUTPUT</text><line x1="336" y1="${matrixY + 62}" x2="470" y2="${matrixY + 62}" stroke="#cbd5e1" stroke-width="1"/>
    ${crosspoints}${sourceRows}${outputRows}
    ${architecture.audioBreakout ? `<rect x="306" y="${matrixY + matrixH + 16}" width="194" height="38" rx="7" fill="#fdf2f8" stroke="#db2777"/><text x="322" y="${matrixY + matrixH + 31}" font-size="9" font-weight="800" fill="#be185d">AUDIO DE-EMBED</text><text x="322" y="${matrixY + matrixH + 45}" font-size="8.6" fill="#64748b">Zone audio to amplifier / DSP</text>` : ""}
    <g transform="translate(48 570)"><line x1="0" y1="0" x2="26" y2="0" stroke="#2563eb" stroke-width="3"/><text x="34" y="4" font-size="9.5" fill="#334155">HDMI video</text><line x1="132" y1="0" x2="158" y2="0" stroke="#0e9f6e" stroke-width="3"/><text x="166" y="4" font-size="9.5" fill="#334155">HDBaseT link</text>${architecture.powerOverLink ? `<line x1="286" y1="0" x2="312" y2="0" stroke="#dc2626" stroke-width="2" stroke-dasharray="5 4"/><text x="320" y="4" font-size="9.5" fill="#334155">PoH power</text>` : ""}<line x1="420" y1="0" x2="446" y2="0" stroke="#7c3aed" stroke-width="2" stroke-dasharray="7 5"/><text x="454" y="4" font-size="9.5" fill="#334155">Control</text></g>
    <text x="872" y="590" text-anchor="end" font-size="9" fill="#64748b">Topology: ${escapeXml(confidenceLabel(profile))}</text>
  </svg>`;
}

export function buildRoomSchematicSvg(input: RoomSchematicInput): string {
  const profile = input.profile;

  if (!profile.renderable) {
    return buildReviewRequiredSvg(input);
  }

  if (profile.mode === "matrix" && profile.matrixArchitecture) {
    return buildMatrixSchematicSvg(input);
  }

  const product = { x: 360, y: 230, w: 200, h: 116 };
  const source = { x: 40, y: 238, w: 200, h: 102 };
  const output = { x: 680, y: 238, w: 200, h: 102 };
  const top = { x: 335, y: 72, w: 250, h: 100 };
  const bottom = { x: 335, y: 400, w: 250, h: 100 };

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
      ? branchConnector(topBranch, top, source, product, output, "top")
      : "",
    bottomBranch
      ? branchConnector(bottomBranch, bottom, source, product, output, "bottom")
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
