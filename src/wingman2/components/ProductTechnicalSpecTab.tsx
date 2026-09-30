import { cleanUsefulList, type ProductSpec } from "../lib/productStoryEngine";
import { validateUsbPath, usbValidationIsRequired } from "../logic/usbPathValidator";

export function ProductTechnicalSpecTab({ product }: { product: ProductSpec }) {
  const technical = product.technicalData;
  const rows = [
    ["Data status", technical ? [`${technical.statusLabel} - ${technical.completeness}% complete`] : []],
    ["Product class", technical?.productClass ? [technical.productClass] : []],
    ["Endpoint / system role", technical?.role ? [technical.role] : []],
    ["Transport", technical?.transport ?? []], ["Product type", [product.productType]],
    ["I/O summary", product.ioSummary], ["Video / signal", product.video], ["Audio", product.audio],
    ["USB", product.usb], ["Network", product.network], ["Control / integration", product.control],
    ["Power", product.power], ["Physical / install", product.physical],
    ["Required dependencies", technical?.dependencies ?? []], ["Compatible families", technical?.compatibleFamilies ?? []],
    ["Evidence", technical?.evidence ?? []],
    ["Missing / needs review", [...(technical?.missingFields ?? []), ...(technical?.warnings ?? [])]],
    ["Checks before recommending", product.checks],
  ] as const;
  const usbContext = [product.category, product.productType, product.name, ...(product.applications ?? [])].join(" ");
  const usbResult = usbValidationIsRequired(usbContext) ? validateUsbPath({ path: [{ sku: product.sku }] }) : null;

  return (
    <div className="wm-product-pitch-spec">
      <section className="wm-product-pitch-section-intro rounded-3xl border p-5 wm-ui-section wm-ui-card">
        <p className="wm-ui-kicker">Governed product record</p>
        <h2 className="text-xl font-extrabold text-white">Technical specification view</h2>
        <p className="mt-2 text-sm leading-6 wm-ui-copy">Use this tab to confirm details. It is separated from the sales view so the salesperson is not forced to interpret technical data during a live conversation.</p>
      </section>
      {technical && !technical.compareReady ? <section className="wm-product-pitch-spec__notice rounded-3xl border p-5 wm-ui-section wm-ui-card">
        <h3 className="text-lg font-extrabold">Technical data review required</h3>
        <p className="mt-2 text-sm leading-6 wm-ui-copy">This SKU does not yet have enough verified structured data for automatic competitor-equivalence use. Product Pitch may show available official facts, but Compare must remain review-only until the missing fields are resolved.</p>
      </section> : null}
      {usbResult ? <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
        <h3 className="text-lg font-extrabold text-cyan-300">USB path check</h3>
        <p className="mt-1 text-sm leading-6 wm-ui-copy">USB standard <strong className="text-white">{usbResult.usbStandardUsed}</strong> · up to {usbResult.maxAllowedTiers} cascaded tier{usbResult.maxAllowedTiers === 1 ? "" : "s"}{usbResult.downstreamHubLimit ? ` · hub limit ${usbResult.downstreamHubLimit}` : ""}.</p>
        {usbResult.warnings.length ? <ul className="mt-2 space-y-1 text-sm wm-ui-copy">{usbResult.warnings.map((warning) => <li key={warning}>Warning: {warning}</li>)}</ul> : null}
        {usbResult.blockers.length ? <ul className="mt-2 space-y-1 text-sm wm-ui-copy">{usbResult.blockers.map((blocker) => <li key={blocker}>Blocked: {blocker}</li>)}</ul> : null}
        {usbResult.recommendationImpact ? <p className="mt-2 text-sm leading-6 wm-ui-copy">{usbResult.recommendationImpact}</p> : null}
      </section> : null}
      <dl className="wm-product-spec-groups grid grid-cols-1 gap-3 md:grid-cols-2">
        {rows.map(([label, rawItems]) => {
          const items = cleanUsefulList([...rawItems], Number.MAX_SAFE_INTEGER);
          const displayItems = items.length ? items : ["Not confirmed"];
          return <div key={label} data-spec-group={label.toLowerCase().replace(/[^a-z0-9]+/g, "-")} className="wm-product-spec-group min-w-0 rounded-2xl border p-4 wm-ui-card">
            <dt className="mb-2 wm-ui-kicker text-cyan-300">{label}</dt><dd><ul className={`grid gap-2 ${items.length ? "" : "is-unconfirmed italic opacity-70"}`}>{displayItems.map((item) => <li className="break-words wm-ui-copy" key={item}>{item}</li>)}</ul></dd>
          </div>;
        })}
      </dl>
    </div>
  );
}
