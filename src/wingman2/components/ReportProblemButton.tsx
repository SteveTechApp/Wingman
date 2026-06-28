import { useState } from "react";
import { postWingmanJson } from "../api/wingmanApi";

// A lightweight "report a problem" capture so a salesperson who spots a wrong
// product detail (e.g. a mis-parsed feature tag) can submit a correction. The
// report is saved to a durable local queue immediately so it is never lost, and
// optimistically POSTed to an API route so it reaches the product team the moment
// a backend handler exists. The salesperson can also copy it to send through any channel.

export type ProductReport = {
  id: string;
  createdAt: string;
  sku: string;
  productName: string;
  detail: string;
  problem: string;
  correction: string;
  reporter: string;
  source: string;
};

const STORAGE_KEY = "wingman.productReports.v1";
const REPORT_ENDPOINT = "/api/wingman/product-report";

function createReportId(): string {
  const globalCrypto = typeof crypto !== "undefined" ? crypto : undefined;
  if (globalCrypto?.randomUUID) return globalCrypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadProductReports(): ProductReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProductReport[]) : [];
  } catch {
    return [];
  }
}

function persistProductReport(report: ProductReport): void {
  try {
    const existing = loadProductReports();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([report, ...existing].slice(0, 200)));
  } catch {
    // localStorage may be unavailable (private mode etc.); the report can still be
    // submitted to the API and copied, so a failure here is non-fatal.
  }
}

function reportToText(report: ProductReport): string {
  return [
    "WyreStorm Wingman - product data correction",
    `Product: ${report.sku} - ${report.productName}`,
    report.detail ? `Detail in question: ${report.detail}` : "",
    `What's wrong: ${report.problem}`,
    report.correction ? `What it should say: ${report.correction}` : "",
    report.reporter ? `Reported by: ${report.reporter}` : "",
    `Logged: ${report.createdAt}`,
  ]
    .filter(Boolean)
    .join("\n");
}

type Phase = "form" | "submitting" | "sent" | "queued";

export function ReportProblemButton({
  sku,
  productName,
  detail = "",
}: {
  sku: string;
  productName: string;
  detail?: string;
}) {
  const [open, setOpen] = useState(false);
  const [detailField, setDetailField] = useState(detail);
  const [problem, setProblem] = useState("");
  const [correction, setCorrection] = useState("");
  const [reporter, setReporter] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [submitted, setSubmitted] = useState<ProductReport | null>(null);
  const [copied, setCopied] = useState(false);

  function resetForm() {
    setDetailField(detail);
    setProblem("");
    setCorrection("");
    setReporter("");
    setPhase("form");
    setSubmitted(null);
    setCopied(false);
  }

  function close() {
    setOpen(false);
    resetForm();
  }

  async function handleSubmit() {
    if (!problem.trim()) return;

    const report: ProductReport = {
      id: createReportId(),
      createdAt: new Date().toISOString(),
      sku,
      productName,
      detail: detailField.trim(),
      problem: problem.trim(),
      correction: correction.trim(),
      reporter: reporter.trim(),
      source: typeof window !== "undefined" ? window.location.pathname : "",
    };

    setPhase("submitting");
    persistProductReport(report);
    setSubmitted(report);

    try {
      await postWingmanJson(REPORT_ENDPOINT, report);
      setPhase("sent");
    } catch {
      // No backend handler yet / offline: it is safely queued locally and copyable.
      setPhase("queued");
    }
  }

  async function copyReport() {
    if (!submitted) return;
    try {
      await navigator.clipboard.writeText(reportToText(submitted));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-amber-300/70 px-4 py-2 text-sm font-black text-amber-200 hover:bg-amber-300/10"
      >
        Report a problem
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={close}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[#29465e] bg-[#071522] p-5 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">Report a problem</p>
                <h2 className="mt-1 text-lg font-bold text-white">
                  {sku} - {productName}
                </h2>
              </div>
              <button type="button" onClick={close} className="text-white/60 hover:text-white" aria-label="Close">
                ✕
              </button>
            </div>

            {phase === "form" || phase === "submitting" ? (
              <div className="mt-4 grid gap-3">
                <label className="grid gap-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-white/60">
                    Which detail is wrong? (optional)
                  </span>
                  <input
                    value={detailField}
                    onChange={(event) => setDetailField(event.target.value)}
                    placeholder='e.g. Feature: "Seamless Switching"'
                    className="w-full rounded-lg border border-[#29465e] bg-[#0b2032] p-2 text-sm text-white placeholder-white/40"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-white/60">What's wrong?</span>
                  <textarea
                    value={problem}
                    onChange={(event) => setProblem(event.target.value)}
                    rows={3}
                    placeholder="Describe what's incorrect or misleading."
                    className="w-full rounded-lg border border-[#29465e] bg-[#0b2032] p-2 text-sm text-white placeholder-white/40"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-white/60">
                    What should it say? (optional)
                  </span>
                  <textarea
                    value={correction}
                    onChange={(event) => setCorrection(event.target.value)}
                    rows={2}
                    placeholder="The correct detail, if you know it."
                    className="w-full rounded-lg border border-[#29465e] bg-[#0b2032] p-2 text-sm text-white placeholder-white/40"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-white/60">
                    Your name or email (optional)
                  </span>
                  <input
                    value={reporter}
                    onChange={(event) => setReporter(event.target.value)}
                    placeholder="So the team can follow up."
                    className="w-full rounded-lg border border-[#29465e] bg-[#0b2032] p-2 text-sm text-white placeholder-white/40"
                  />
                </label>

                <div className="mt-1 flex items-center justify-end gap-2">
                  <button type="button" onClick={close} className="rounded-full px-4 py-2 text-sm font-bold text-white/70 hover:text-white">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!problem.trim() || phase === "submitting"}
                    className="rounded-full bg-amber-300 px-4 py-2 text-sm font-black text-[#071522] disabled:opacity-50"
                  >
                    {phase === "submitting" ? "Submitting..." : "Submit report"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                <p className="text-sm font-bold text-emerald-300">Thanks - your report has been logged.</p>
                <p className="text-sm text-white/70">
                  {phase === "sent"
                    ? "It's been sent to the product team for review."
                    : "It's saved on this device. Use Copy report to send it to the product team."}
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={copyReport}
                    className="rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100"
                  >
                    {copied ? "Copied" : "Copy report"}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-full bg-amber-300 px-4 py-2 text-sm font-black text-[#071522]"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
