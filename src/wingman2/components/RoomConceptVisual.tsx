import { useEffect, useMemo, useState } from "react";
import type { StoredProject } from "../data/projectStore";
import { getProductMediaBySku, loadProductMediaIndex } from "../data/productMedia";

type RoomConceptVisualProps = {
  project: StoredProject | null;
  onSave: (render: { svg: string; width: number; height: number }) => void;
};

const WIDTH = 1600;
const HEIGHT = 900;

function xml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character] ?? character);
}

export function buildRoomConceptSvg(project: StoredProject | null, productImages: Record<string, string> = {}): string {
  const name = xml(project?.name ?? "Concept room");
  const products = (project?.productSelections ?? []).slice(0, 4);
  const productLabels = products.length ? products.map((item) => xml(item.sku)) : ["AV source", "WyreStorm system", "Room display"];
  const applicationText = String(project?.discoveryBrief?.roomModel?.application ?? project?.discoveryBrief?.roomModel?.roomType ?? "Meeting and presentation space");
  const application = xml(applicationText);
  const education = /lecture|education|classroom|teaching|university/i.test(`${project?.name ?? ""} ${applicationText}`);
  const productCards = productLabels.map((label, index) => {
    const x = 940 + (index % 2) * 245;
    const y = 360 + Math.floor(index / 2) * 125;
    const image = productImages[products[index]?.sku ?? ""];
    return `<g><rect x="${x}" y="${y}" width="210" height="100" rx="14" fill="#f7fafc" stroke="#45d7c8" stroke-width="2"/>${image ? `<image href="${xml(image)}" x="${x + 8}" y="${y + 8}" width="82" height="62" preserveAspectRatio="xMidYMid meet"/>` : `<circle cx="${x + 28}" cy="${y + 30}" r="12" fill="#45d7c8"/>`}<text x="${x + 98}" y="${y + 35}" font-size="16" fill="#102536" font-weight="700">${label}</text><text x="${x + 98}" y="${y + 58}" font-size="12" fill="#526b7d">${image ? "Official product image" : "Product position"}</text><text x="${x + 14}" y="${y + 88}" font-size="12" fill="#526b7d">${index < 2 ? "Equipment rack / AV network" : "Room endpoint"}</text></g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#061522"/><stop offset="1" stop-color="#12344a"/></linearGradient><linearGradient id="screen" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#19c7d8"/><stop offset="1" stop-color="#2255aa"/></linearGradient></defs>
  <rect width="1600" height="900" fill="url(#bg)"/><path d="M0 690 L800 520 L1600 690 V900 H0Z" fill="#102838"/><path d="M800 520 V900 M0 690 L800 520 L1600 690" stroke="#2a5368" stroke-width="3" fill="none"/>
  <text x="70" y="78" fill="#45d7c8" font-size="22" font-weight="700" letter-spacing="4">WINGMAN · CONCEPT VISUAL</text><text x="70" y="132" fill="#f5fbff" font-size="42" font-weight="650">${name}</text><text x="70" y="170" fill="#9db5c7" font-size="21">${application}</text>
  <g><rect x="150" y="245" width="650" height="315" rx="18" fill="#07101b" stroke="#5a7485" stroke-width="7"/><rect x="176" y="271" width="598" height="263" rx="8" fill="url(#screen)"/><path d="M225 460 L355 340 L465 425 L570 315 L730 475" stroke="#d4fbff" stroke-width="11" opacity=".65" fill="none"/><circle cx="660" cy="335" r="42" fill="#f5d27c" opacity=".75"/><rect x="410" y="560" width="125" height="28" rx="8" fill="#758b99"/></g>
  ${education ? `<g><path d="M140 760 L730 760 L780 850 L90 850Z" fill="#183d50" stroke="#4b7184" stroke-width="3"/><rect x="665" y="590" width="125" height="170" rx="8" fill="#245468"/><rect x="680" y="610" width="95" height="55" rx="5" fill="#132938"/><text x="691" y="642" fill="#9fece5" font-size="15">LECTERN</text><g fill="#b7cbd5"><circle cx="220" cy="700" r="24"/><circle cx="350" cy="700" r="24"/><circle cx="480" cy="700" r="24"/><circle cx="610" cy="700" r="24"/><circle cx="275" cy="805" r="24"/><circle cx="425" cy="805" r="24"/><circle cx="575" cy="805" r="24"/></g><g><circle cx="720" cy="245" r="22" fill="#c6d8e2"/><rect x="700" y="265" width="40" height="28" rx="9" fill="#526f82"/><text x="642" y="320" fill="#9db5c7" font-size="14">PTZ lecture camera</text></g></g>` : `<g><path d="M270 730 L650 730 L755 850 L165 850Z" fill="#183d50" stroke="#4b7184" stroke-width="3"/><ellipse cx="460" cy="730" rx="190" ry="58" fill="#245468"/><g fill="#b7cbd5"><circle cx="315" cy="690" r="30"/><circle cx="605" cy="690" r="30"/><circle cx="355" cy="795" r="30"/><circle cx="565" cy="795" r="30"/></g></g>`}
  <path d="M800 400 C870 400 875 400 920 400" stroke="#45d7c8" stroke-width="4" stroke-dasharray="10 8" fill="none"/><text x="940" y="315" fill="#45d7c8" font-size="18" font-weight="700" letter-spacing="2">APPLICATION COMPONENTS</text>${productCards}
  <rect x="70" y="810" width="1460" height="52" rx="10" fill="#07121e" stroke="#765da4"/><text x="96" y="843" fill="#d8cdf2" font-size="17">CONCEPT ONLY — dimensions, finishes, product appearance and installation positions require confirmation.</text></svg>`;
}

export default function RoomConceptVisual({ project, onSave }: RoomConceptVisualProps) {
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  useEffect(() => { let live = true; loadProductMediaIndex().then((index) => { if (!live) return; const images: Record<string, string> = {}; for (const product of project?.productSelections ?? []) { const media = getProductMediaBySku(index, product.sku); const url = media?.front?.url ?? media?.gallery[0]?.url; if (url) images[product.sku] = url; } setProductImages(images); }); return () => { live = false; }; }, [project]);
  const svg = useMemo(() => buildRoomConceptSvg(project, productImages), [productImages, project]);
  const dataUrl = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, [svg]);
  function download() {
    const link = document.createElement("a");
    link.download = `${(project?.name ?? "room-concept").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-concept.svg`;
    link.href = dataUrl;
    link.click();
  }
  return <section className="wm-pv-room-canvas">
    <div className="wm-vs-canvas-toolbar"><div><p className="wm-vs-eyebrow">Generated room application</p><h2>{project?.name ?? "Concept room"}</h2></div><div className="wm-vs-toolbar-actions"><button type="button" className="wm-vs-button wm-vs-button-secondary" onClick={download}>Export SVG</button><button type="button" className="wm-vs-button wm-vs-button-primary" onClick={() => onSave({ svg: dataUrl, width: WIDTH, height: HEIGHT })}>Save to project</button></div></div>
    <div className="wm-pv-room-preview"><img src={dataUrl} alt={`Conceptual room application for ${project?.name ?? "the active project"}`} /></div>
  </section>;
}
