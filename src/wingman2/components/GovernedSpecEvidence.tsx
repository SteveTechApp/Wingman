import type { ReactNode } from "react";
import type { WingmanSpecEvidence } from "../lib/productClassification";

/**
 * Compact governed-spec evidence chips shared by the Recommendations and
 * Catalog pages: the verified I/O count, USB version and signal reach behind
 * a recommendation, plus a source marker so a rep can tell governed-spec
 * facts from catalogue-text inference. Only facts that actually resolved are
 * rendered - no placeholder rows for missing data.
 */

const TRANSPORT_LABELS: Record<string, string> = {
  hdmi: "HDMI",
  hdbaset: "HDBaseT",
  "hdbaset-3": "HDBaseT 3",
  "avoip-1g": "AVoIP 1G",
  "avoip-10g": "AVoIP 10G",
  fibre: "Fibre",
  usb: "USB",
  wireless: "Wireless",
  audio: "Audio",
  control: "Control",
};

function chip(label: string, key: string, tone: "fact" | "source" | "muted"): ReactNode {
  // Dark-theme chips matching the app's slate surface, with the source tone
  // colour-coded: emerald for governed evidence, amber for inference.
  const classes =
    tone === "source"
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
      : tone === "muted"
        ? "border-slate-700/60 bg-slate-900/70 text-slate-400"
        : "border-slate-700/60 bg-slate-900/70 text-slate-200";
  return (
    <span
      key={key}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-4 ${classes}`}
    >
      {label}
    </span>
  );
}

export function GovernedSpecEvidence({
  evidence,
  ariaLabel = "Governed spec evidence",
}: {
  evidence: WingmanSpecEvidence;
  ariaLabel?: string;
}) {
  const facts = [
    evidence.io ? { label: evidence.io, key: "io", title: "Routed I/O count" } : null,
    evidence.usb ? { label: evidence.usb, key: "usb", title: "USB version" } : null,
    evidence.reach ? { label: `${evidence.reach} reach`, key: "reach", title: "Signal reach" } : null,
  ].filter((fact): fact is { label: string; key: string; title: string } => Boolean(fact));

  if (!facts.length) {
    return null;
  }

  const connectors = evidence.connectors.slice(0, 3);
  const transports = evidence.transport.map((t) => TRANSPORT_LABELS[t] ?? t).filter(Boolean).slice(0, 2);

  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label={ariaLabel}>
      {facts.map((fact) => (
        <span
          key={fact.key}
          title={fact.title}
          className="inline-flex items-center rounded-full border border-slate-600/60 bg-slate-800/80 px-2 py-0.5 text-[11px] font-bold leading-4 text-slate-100"
        >
          {fact.label}
        </span>
      ))}
      {connectors.map((connector) => chip(connector, `connector-${connector}`, "muted"))}
      {transports.map((transport) => chip(transport, `transport-${transport}`, "muted"))}
      {chip(evidence.source === "governed" ? "Governed spec" : "Inferred", "source", "source")}
    </div>
  );
}
