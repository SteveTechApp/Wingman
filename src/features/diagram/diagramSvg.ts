import type { DesignBundle, BlockDiagramNode, BlockDiagramEdge } from "@/features/systemDesign/designTypes";

type NodePos = {
  id: string;
  x: number;
  y: number;
  label: string;
  kind: string;
};

function roleColumn(kind: string) {
  switch (kind) {
    case "source": return 0;
    case "switcher":
    case "processor":
    case "network": return 1;
    case "audio":
    case "control":
    case "usb": return 2;
    case "display": return 3;
    default: return 1;
  }
}

function roleColor(kind: string) {
  switch (kind) {
    case "source": return "rgba(96,165,250,0.28)";
    case "switcher": return "rgba(34,197,94,0.24)";
    case "processor": return "rgba(251,191,36,0.24)";
    case "network": return "rgba(168,85,247,0.24)";
    case "display": return "rgba(244,114,182,0.24)";
    case "audio": return "rgba(45,212,191,0.24)";
    case "control": return "rgba(148,163,184,0.24)";
    default: return "rgba(255,255,255,0.12)";
  }
}

export function buildDiagramLayout(nodes: BlockDiagramNode[]) {
  const columns = [0, 0, 0, 0];
  return nodes.map((node): NodePos => {
    const col = roleColumn(node.kind);
    const idx = columns[col]++;
    return {
      id: node.id,
      x: 70 + (col * 260),
      y: 60 + (idx * 110),
      label: node.label,
      kind: node.kind,
    };
  });
}

function esc(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildDiagramSvg(bundle: DesignBundle): string {
  const positions = buildDiagramLayout(bundle.nodes);
  const posMap = Object.fromEntries(positions.map((p) => [p.id, p]));
  const width = 1040;
  const height = Math.max(420, (Math.max(1, ...positions.map((p) => p.y)) + 120));

  const edgeSvg = bundle.edges.map((edge: BlockDiagramEdge) => {
    const a = posMap[edge.source];
    const b = posMap[edge.target];
    if (!a || !b) return "";
    const x1 = a.x + 90;
    const y1 = a.y + 26;
    const x2 = b.x;
    const y2 = b.y + 26;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - 6;

    return [
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(255,255,255,0.38)" stroke-width="2" />`,
      `<text x="${mx}" y="${my}" fill="rgba(255,255,255,0.72)" font-size="11" text-anchor="middle">${esc(edge.signalType ?? "")}</text>`
    ].join("");
  }).join("");

  const nodeSvg = positions.map((node) => {
    return [
      `<rect x="${node.x}" y="${node.y}" rx="12" ry="12" width="180" height="52" fill="${roleColor(node.kind)}" stroke="rgba(255,255,255,0.16)" />`,
      `<text x="${node.x + 90}" y="${node.y + 23}" text-anchor="middle" fill="rgba(255,255,255,0.94)" font-size="13" font-weight="700">${esc(node.label)}</text>`,
      `<text x="${node.x + 90}" y="${node.y + 39}" text-anchor="middle" fill="rgba(255,255,255,0.62)" font-size="11">${esc(node.kind)}</text>`
    ].join("");
  }).join("");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect x="0" y="0" width="${width}" height="${height}" fill="rgb(7,13,24)" />`,
    edgeSvg,
    nodeSvg,
    `</svg>`
  ].join("");
}

export function downloadDiagramSvg(fileName: string, bundle: DesignBundle) {
  const svg = buildDiagramSvg(bundle);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}