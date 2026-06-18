// Builds a self-contained, print-ready HTML cheat-sheet for a single SKU.
//
// Everything is inline (styles + schematic SVG + image) so the document works
// offline and prints / saves to PDF cleanly when the live app is not available.

import type { ProductNarrative, ProductSpec } from "./productStoryEngine";
import { buildRoomSchematicSvg } from "./roomSchematic";

export type CheatSheetOptions = {
  product: ProductSpec;
  narrative: ProductNarrative;
  imageUrl?: string;
  generatedOn?: string;
};

function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function list(items: string[], max: number): string {
  const useful = items
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item && !/not yet|to be confirmed|not applicable|not confirmed/i.test(item))
    .slice(0, max);

  if (!useful.length) return "<li>To be confirmed from the current datasheet.</li>";
  return useful.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function block(title: string, body: string): string {
  return `<section class="blk"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></section>`;
}

export function buildProductCheatSheetHtml(options: CheatSheetOptions): string {
  const { product, narrative, imageUrl, generatedOn } = options;
  const schematic = buildRoomSchematicSvg({
    sku: product.sku,
    productType: product.productType,
    role: narrative.role,
    source: narrative.diagramSource,
    output: narrative.diagramOutput,
  });

  const imageMarkup = imageUrl
    ? `<img class="hero-img" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" referrerpolicy="no-referrer"/>`
    : `<div class="hero-img missing">Product image not yet indexed</div>`;

  const familyBlock = narrative.familyFit
    ? block("How it relates to the rest of the family", narrative.familyFit)
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(product.sku)} — WyreStorm sales cheat-sheet</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #e2e8f0; color: #0f172a; font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif; font-size: 12px; line-height: 1.5; }
  .toolbar { position: sticky; top: 0; display: flex; gap: 10px; justify-content: flex-end; padding: 10px 16px; background: #0f172a; }
  .toolbar button { font: inherit; font-weight: 700; border: 0; border-radius: 999px; padding: 8px 18px; cursor: pointer; }
  .toolbar .print { background: #22d3ee; color: #0f172a; }
  .toolbar .close { background: transparent; color: #e2e8f0; border: 1px solid #475569; }
  .sheet { width: 210mm; min-height: 297mm; margin: 16px auto; padding: 16mm 14mm; background: #fff; box-shadow: 0 6px 30px rgba(15,23,42,0.25); }
  header.top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0891b2; padding-bottom: 10px; }
  header.top .eyebrow { text-transform: uppercase; letter-spacing: 1.5px; font-size: 10px; font-weight: 800; color: #0891b2; }
  header.top h1 { margin: 4px 0 2px; font-size: 26px; letter-spacing: -0.5px; }
  header.top .name { font-size: 14px; font-weight: 600; color: #334155; }
  header.top .meta { text-align: right; font-size: 10.5px; color: #64748b; }
  .headline { margin: 12px 0 4px; font-size: 15px; font-weight: 700; color: #0e7490; }
  .grid { display: grid; grid-template-columns: 1.55fr 1fr; gap: 18px; margin-top: 10px; }
  .blk { margin-bottom: 11px; break-inside: avoid; }
  .blk h2 { margin: 0 0 3px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #0891b2; }
  .blk p { margin: 0; }
  .rail .card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 9px 11px; margin-bottom: 10px; break-inside: avoid; }
  .rail .card h2 { margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #334155; }
  .rail ul { margin: 0; padding-left: 16px; }
  .rail li { margin-bottom: 2px; }
  .hero-img { width: 100%; height: 150px; object-fit: contain; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; margin-bottom: 10px; }
  .hero-img.missing { display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; }
  .say { background: #ecfeff; border: 1px solid #67e8f9; border-radius: 10px; padding: 9px 11px; margin-top: 4px; }
  .say h2 { margin: 0 0 3px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #0891b2; }
  .say p { margin: 0; font-style: italic; }
  .schematic { margin-top: 14px; break-inside: avoid; }
  .schematic h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #0891b2; margin: 0 0 6px; }
  .schematic .frame { border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; }
  .schematic svg { width: 100%; height: auto; display: block; }
  footer.foot { margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 9.5px; color: #94a3b8; display: flex; justify-content: space-between; }
  @media print {
    body { background: #fff; }
    .toolbar { display: none; }
    .sheet { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; }
    @page { size: A4; margin: 12mm; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <button class="print" onclick="window.print()">Print / Save as PDF</button>
    <button class="close" onclick="window.close()">Close</button>
  </div>
  <div class="sheet">
    <header class="top">
      <div>
        <div class="eyebrow">WyreStorm sales cheat-sheet</div>
        <h1>${escapeHtml(product.sku)}</h1>
        <div class="name">${escapeHtml(product.name)}</div>
      </div>
      <div class="meta">
        ${escapeHtml(product.family)}<br/>
        ${escapeHtml(product.productType)}<br/>
        ${generatedOn ? `Generated ${escapeHtml(generatedOn)}` : ""}
      </div>
    </header>

    <div class="headline">${escapeHtml(narrative.headline)}</div>

    <div class="grid">
      <div class="main">
        ${block("What it is", narrative.whatItIs)}
        ${block("Where it fits in the room", narrative.whereItSits)}
        ${familyBlock}
        ${block("What it does", narrative.whyItHelps)}
        ${block("Why the customer cares", narrative.whyCustomerCares)}
        ${block("Use it when", narrative.useWhen)}
        ${block("Do not lead with it when", narrative.avoidIf)}
        <div class="say">
          <h2>Say it like this</h2>
          <p>${escapeHtml(narrative.suggestedWording)}</p>
        </div>
      </div>

      <div class="rail">
        ${imageMarkup}
        <div class="card">
          <h2>Key features to mention</h2>
          <ul>${list(product.keyFeatures, 6)}</ul>
        </div>
        <div class="card">
          <h2>Best-fit applications</h2>
          <ul>${list(product.applications, 5)}</ul>
        </div>
        <div class="card">
          <h2>Ask the customer</h2>
          <ul>${list(narrative.askNow, 4)}</ul>
        </div>
        <div class="card">
          <h2>Check before quoting</h2>
          <ul>${list(product.checks, 5)}</ul>
        </div>
      </div>
    </div>

    <div class="schematic">
      <h2>Room connectivity</h2>
      <div class="frame">${schematic}</div>
    </div>

    <footer class="foot">
      <span>WyreStorm Wingman — sales reference. Confirm specifications against the current datasheet.</span>
      <span>${escapeHtml(product.sku)}</span>
    </footer>
  </div>
</body>
</html>`;
}

export default buildProductCheatSheetHtml;
