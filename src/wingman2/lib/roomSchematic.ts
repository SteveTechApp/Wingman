// Visio-style room-connectivity schematic generator.
//
// Produces a standalone SVG string that shows where a WyreStorm product sits
// inside the wider room scheme: the source side, the product itself, the output
// side, and the control / network / USB / audio branches that matter for its
// role. One source of truth - the same SVG is shown on the Diagram tab, embedded
// in the printable cheat-sheet, and offered as a downloadable .svg file.

export type RoomSchematicInput = {
  sku: string;
  productType: string;
  role: string;
  source: string;
  output: string;
};

type SignalKey = "video" | "network" | "usb" | "control" | "audio" | "capture";

const SIGNAL: Record<SignalKey, { color: string; label: string; dash?: string }> = {
  video: { color: "#2563eb", label: "HDMI / video" },
  network: { color: "#0e9f6e", label: "Network (Cat / fibre)" },
  usb: { color: "#d97706", label: "USB peripherals" },
  control: { color: "#7c3aed", label: "Control", dash: "7 5" },
  audio: { color: "#db2777", label: "Audio" },
  capture: { color: "#64748b", label: "Captured view", dash: "2 6" },
};

type Edge = { sig: SignalKey; label?: string };
type Branch = { slot: "top" | "bottom"; tag: string; title: string; detail: string; sig: SignalKey; label?: string };
type RoleConfig = { tag: string; sourceEdge: Edge; outputEdge: Edge; branches: Branch[] };

function roleConfig(role: string): RoleConfig {
  switch (role) {
    case "avoip":
      return {
        tag: "AVoIP",
        sourceEdge: { sig: "video" },
        outputEdge: { sig: "network", label: "Network → decoders" },
        branches: [
          { slot: "top", tag: "CTL", title: "NHD-CTL-PRO", detail: "Routing, presets, system control", sig: "control" },
          { slot: "bottom", tag: "NET", title: "Managed AV switch", detail: "VLAN, multicast, PoE", sig: "network" },
        ],
      };
    case "matrix":
      return {
        tag: "MATRIX",
        sourceEdge: { sig: "video", label: "HDMI in" },
        outputEdge: { sig: "video", label: "HDMI / HDBaseT" },
        branches: [{ slot: "top", tag: "CTL", title: "Control / presets", detail: "Keypad, app or 3rd-party", sig: "control" }],
      };
    case "videoWall":
      return {
        tag: "WALL",
        sourceEdge: { sig: "video" },
        outputEdge: { sig: "video", label: "Per-display feeds" },
        branches: [{ slot: "top", tag: "CTL", title: "Layout control", detail: "Presets & source select", sig: "control" }],
      };
    case "multiview":
      return {
        tag: "MV",
        sourceEdge: { sig: "video", label: "Multiple sources" },
        outputEdge: { sig: "video", label: "Composed output" },
        branches: [{ slot: "top", tag: "CTL", title: "Layout control", detail: "Window presets", sig: "control" }],
      };
    case "presentation":
      return {
        tag: "ROOM",
        sourceEdge: { sig: "video", label: "HDMI / USB-C" },
        outputEdge: { sig: "video", label: "To display" },
        branches: [{ slot: "bottom", tag: "USB", title: "USB peripherals", detail: "Camera, mic, touch", sig: "usb" }],
      };
    case "extension":
      return {
        tag: "EXT",
        sourceEdge: { sig: "video" },
        outputEdge: { sig: "video", label: "To remote display" },
        branches: [{ slot: "bottom", tag: "CAT", title: "Category / fibre run", detail: "Distance-rated cable", sig: "network", label: "Transport" }],
      };
    case "wireless":
      return {
        tag: "CAST",
        sourceEdge: { sig: "network", label: "Wireless cast" },
        outputEdge: { sig: "video", label: "To display" },
        branches: [{ slot: "top", tag: "NET", title: "Network / IT policy", detail: "Guest access rules", sig: "network" }],
      };
    case "audio":
      return {
        tag: "AUDIO",
        sourceEdge: { sig: "audio", label: "Audio in" },
        outputEdge: { sig: "audio", label: "To speakers" },
        branches: [{ slot: "bottom", tag: "DSP", title: "DSP / Dante network", detail: "Mics & processing", sig: "audio" }],
      };
    case "camera":
      return {
        tag: "CAM",
        sourceEdge: { sig: "capture", label: "Captured view" },
        outputEdge: { sig: "video", label: "USB / HDMI / NDI" },
        branches: [{ slot: "bottom", tag: "NET", title: "Network (NDI)", detail: "If network-video workflow", sig: "network" }],
      };
    default:
      return {
        tag: "AV",
        sourceEdge: { sig: "video" },
        outputEdge: { sig: "video" },
        branches: [{ slot: "top", tag: "CTL", title: "Control", detail: "User or control system", sig: "control" }],
      };
  }
}

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

  const used = lines.join(" ").length;
  if (used < String(text ?? "").trim().length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1]}…`;
  }

  return lines.slice(0, maxLines);
}

function block(opts: {
  x: number;
  y: number;
  w: number;
  h: number;
  tag: string;
  title: string;
  detail: string;
  accent: string;
  emphasis?: boolean;
}): string {
  const { x, y, w, h, tag, title, detail, accent, emphasis } = opts;
  const fill = emphasis ? "#ecfeff" : "#ffffff";
  const stroke = emphasis ? "#0891b2" : accent;
  const strokeWidth = emphasis ? 2.5 : 1.5;
  const titleLines = wrapText(title, emphasis ? 22 : 20, 1);
  const detailLines = wrapText(detail, 26, 2);

  const detailMarkup = detailLines
    .map((line, index) => `<text x="${x + 13}" y="${y + 52 + index * 14}" font-size="11" fill="#475569">${escapeXml(line)}</text>`)
    .join("");

  return `
  <g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="11" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    <path d="M${x},${y + 11} a11,11 0 0 1 11,-11 h${w - 22} a11,11 0 0 1 11,11 v13 h-${w} z" fill="${accent}"/>
    <text x="${x + 13}" y="${y + 17}" font-size="11" font-weight="700" letter-spacing="0.5" fill="#ffffff">${escapeXml(tag)}</text>
    <text x="${x + 13}" y="${y + 38}" font-size="${emphasis ? 15 : 13.5}" font-weight="700" fill="#0f172a">${escapeXml(titleLines[0] || "")}</text>
    ${detailMarkup}
  </g>`;
}

function edgeLabel(cx: number, cy: number, text: string, color: string): string {
  const width = text.length * 6.3 + 16;
  return `
    <g>
      <rect x="${cx - width / 2}" y="${cy - 11}" width="${width}" height="22" rx="7" fill="#ffffff" stroke="${color}" stroke-opacity="0.45"/>
      <text x="${cx}" y="${cy + 4}" font-size="11" font-weight="600" text-anchor="middle" fill="${color}">${escapeXml(text)}</text>
    </g>`;
}

function connector(x1: number, y1: number, x2: number, y2: number, sig: SignalKey, labelText: string): string {
  const { color, dash } = SIGNAL[sig];
  const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";
  const line = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2.5" marker-end="url(#wm-arrow)"${dashAttr}/>`;
  const midx = (x1 + x2) / 2;
  const midy = (y1 + y2) / 2;
  return `${line}${edgeLabel(midx, midy, labelText, color)}`;
}

export function buildRoomSchematicSvg(input: RoomSchematicInput): string {
  const config = roleConfig(input.role);
  const topBranch = config.branches.find((branch) => branch.slot === "top");
  const bottomBranch = config.branches.find((branch) => branch.slot === "bottom");

  const sourceEdge = config.sourceEdge;
  const outputEdge = config.outputEdge;

  const usedSignals = new Set<SignalKey>([sourceEdge.sig, outputEdge.sig, ...config.branches.map((branch) => branch.sig)]);

  // --- block geometry (canvas 920 x 600) ---
  const product = { x: 355, y: 250, w: 210, h: 96 };
  const source = { x: 60, y: 256, w: 178, h: 88 };
  const output = { x: 682, y: 256, w: 178, h: 88 };
  const top = { x: 350, y: 126, w: 220, h: 74 };
  const bottom = { x: 340, y: 370, w: 240, h: 74 };

  const productCy = product.y + 48;

  const blocks = [
    block({ ...source, tag: "SRC", title: input.source, detail: "Source side of the system", accent: SIGNAL[sourceEdge.sig].color }),
    block({ ...output, tag: "OUT", title: input.output, detail: "Output / destination side", accent: SIGNAL[outputEdge.sig].color }),
    topBranch
      ? block({ ...top, tag: topBranch.tag, title: topBranch.title, detail: topBranch.detail, accent: SIGNAL[topBranch.sig].color })
      : "",
    bottomBranch
      ? block({ ...bottom, tag: bottomBranch.tag, title: bottomBranch.title, detail: bottomBranch.detail, accent: SIGNAL[bottomBranch.sig].color })
      : "",
    block({ ...product, tag: config.tag, title: input.sku, detail: input.productType, accent: "#0891b2", emphasis: true }),
  ].join("");

  const connectors = [
    connector(source.x + source.w, productCy, product.x, productCy, sourceEdge.sig, sourceEdge.label || SIGNAL[sourceEdge.sig].label),
    connector(product.x + product.w, productCy, output.x, productCy, outputEdge.sig, outputEdge.label || SIGNAL[outputEdge.sig].label),
    topBranch ? connector(top.x + top.w / 2, top.y + top.h, top.x + top.w / 2, product.y, topBranch.sig, topBranch.label || SIGNAL[topBranch.sig].label) : "",
    bottomBranch
      ? connector(bottom.x + bottom.w / 2, bottom.y, bottom.x + bottom.w / 2, product.y + product.h, bottomBranch.sig, bottomBranch.label || SIGNAL[bottomBranch.sig].label)
      : "",
  ].join("");

  // --- legend ---
  const legendItems = Array.from(usedSignals);
  const legend = legendItems
    .map((sig, index) => {
      const lx = 60 + index * 168;
      const { color, label, dash } = SIGNAL[sig];
      const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";
      return `
        <line x1="${lx}" y1="546" x2="${lx + 28}" y2="546" stroke="${color}" stroke-width="3"${dashAttr}/>
        <text x="${lx + 36}" y="550" font-size="11.5" fill="#334155">${escapeXml(label)}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 600" font-family="'Segoe UI', system-ui, -apple-system, sans-serif" role="img" aria-label="Room connectivity schematic for ${escapeXml(input.sku)}">
  <defs>
    <marker id="wm-arrow" markerWidth="11" markerHeight="11" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L8,3 L0,6 Z" fill="#334155"/>
    </marker>
  </defs>
  <rect x="0" y="0" width="920" height="600" fill="#f8fafc"/>

  <rect x="24" y="18" width="872" height="50" rx="10" fill="#0f172a"/>
  <text x="40" y="40" font-size="16" font-weight="800" fill="#ffffff">${escapeXml(input.sku)}</text>
  <text x="40" y="58" font-size="11.5" fill="#94a3b8">Room connectivity schematic — where this product sits in the wider room scheme</text>
  <text x="880" y="48" font-size="11" font-weight="700" fill="#22d3ee" text-anchor="end">WyreStorm Wingman</text>

  <rect x="30" y="88" width="860" height="384" rx="14" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 6"/>
  <text x="48" y="108" font-size="11" font-weight="700" letter-spacing="1" fill="#64748b">ROOM LAYOUT</text>

  ${connectors}
  ${blocks}

  ${legend}
  <text x="60" y="582" font-size="10.5" fill="#94a3b8">Indicative connectivity — confirm distances, power, USB topology and any by-others / TBC items against the current datasheet before quoting.</text>
</svg>`;
}

export default buildRoomSchematicSvg;
