import { HelpCircle, MessageCircle, X } from "lucide-react";
import { useState } from "react";

export type ProductWhyContext = { sku:string; name?:string; family?:string; summary?:string; problem?:string; useWhen?:string; confirm?:string };

export function ProductWhyFlashCard({ context }: { context: ProductWhyContext }) {
  const [open, setOpen] = useState(false);
  const identity = context.name?.trim() || context.family?.trim() || "this product";
  const problem = context.problem?.trim() || context.summary?.trim() || `${identity} helps connect, route or manage part of the customer's AV system without requiring them to understand the underlying technology.`;
  const useWhen = context.useWhen?.trim() || `Consider it when the customer needs the capability described by ${identity}, especially where a simpler connection cannot meet the required distance, flexibility or control.`;
  const confirm = context.confirm?.trim() || "Confirm what must connect, where it is located, the required signal quality and whether control, audio, USB or network features are also needed.";

  const askGuru = () => {
    window.dispatchEvent(new CustomEvent("wingman:open-guru", { detail: { prompt: `Explain in plain, non-technical language why a customer might need ${context.sku}${context.name ? ` (${context.name})` : ""}. Describe the customer problem it solves, a relatable example, when it is not needed, and the next questions I should ask. Avoid unexplained AV jargon.` } }));
    setOpen(false);
  };

  return <div className="wm-product-why">
    <button type="button" className="wm-product-why-trigger" aria-expanded={open} onClick={() => setOpen((value) => !value)}><HelpCircle aria-hidden="true" />Why might I need this?</button>
    {open ? <section className="wm-product-why-card" aria-label={`Why ${context.sku} might be needed`}>
      <header><div><span>Guru quick explanation</span><strong>{context.sku}{context.name ? ` · ${context.name}` : ""}</strong></div><button type="button" aria-label="Close explanation" onClick={() => setOpen(false)}><X /></button></header>
      <dl><div><dt>The problem it helps solve</dt><dd>{problem}</dd></div><div><dt>When it may be useful</dt><dd>{useWhen}</dd></div><div><dt>What to confirm next</dt><dd>{confirm}</dd></div></dl>
      <button type="button" className="wm-product-why-guru" onClick={askGuru}><MessageCircle aria-hidden="true" />Ask Guru about this product</button>
    </section> : null}
  </div>;
}

export default ProductWhyFlashCard;
