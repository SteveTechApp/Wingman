// DiscoveryCaptureSuggestion — the standard-flow capture box auto-classifier.
//
// As the rep types (or dictates through the existing mic button), the free
// text in the capture box is interpreted onto the closest governed option for
// the current question, and a confirm chip is shown under the textarea:
//   "Matched: USB PTZ camera        [Confirm] [Not this]"
// Confirming stores the governed answer while keeping the raw customer wording
// as the note; "Not this" dismisses the suggestion for the current wording.
// The interpretation reuses the guided-interview matcher
// (discoveryGuidedInterviewLogic), so the standard flow and the guided
// interview classify spoken or typed answers identically.

import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import type { DiscoveryQuestion, DiscoveryQuestionView } from "./discoveryTypes";
import {
  matchSpokenAnswer,
  type GuidedAnswerMatch,
} from "./discoveryGuidedInterviewLogic";
import { normalizeInterviewLang } from "./discoveryGuidedInterviewI18n";
import { getStoredWingmanCaptureLanguage } from "../../data/wingmanLanguage";

export type DiscoveryCaptureSuggestionProps = {
  step: DiscoveryQuestion | undefined;
  view: DiscoveryQuestionView | undefined;
  note: string;
  onConfirm: (values: string[], confidence?: "high" | "matched" | "low") => void;
};

export function DiscoveryCaptureSuggestion({
  step,
  view,
  note,
  onConfirm,
}: DiscoveryCaptureSuggestionProps) {
  const [dismissed, setDismissed] = useState(false);

  // A new note (or a new question) means the wording changed, so any previous
  // "Not this" dismissal no longer applies.
  useEffect(() => {
    setDismissed(false);
  }, [step?.id, note]);

  const match = useMemo<GuidedAnswerMatch | null>(() => {
    if (dismissed || !step || !view) return null;
    const text = (note ?? "").trim();
    if (text.length < 4) return null;
    const candidate = matchSpokenAnswer(
      view,
      text,
      normalizeInterviewLang(getStoredWingmanCaptureLanguage().speechLang),
    );
    return candidate.values.length ? candidate : null;
  }, [dismissed, step, view, note]);

  if (!match) return null;

  // Carry the tier into the trail so the conversation review can flag
  // low-confidence captures for re-verification before export.
  const tierConfidence =
    match.score >= 5 ? "high" : match.confidence === "matched" ? "matched" : "low";

  const confirm = () => {
    setDismissed(true);
    onConfirm(match.values, tierConfidence);
  };

  // Confidence level so a rep can see when Wingman is certain (a strong
  // curated phrase or exclusive negative, score >= 5) versus guessing (a
  // single generic keyword hit, score < 3) and verify before confirming.
  const confidenceTier =
    match.score >= 5
      ? {
          label: "High confidence",
          badge: "bg-emerald-500/15 text-emerald-300",
          bar: "bg-emerald-500",
          bars: 3,
        }
      : match.confidence === "matched"
        ? {
            label: "Matched",
            badge: "bg-emerald-500/15 text-emerald-300",
            bar: "bg-emerald-500",
            bars: 2,
          }
        : {
            label: "Low confidence — verify",
            badge: "bg-amber-500/15 text-amber-300",
            bar: "bg-amber-500",
            bars: 1,
          };

  return (      <div
        className="mt-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3"
        data-wingman-capture-suggestion="true"
      >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[#edf6ff]">
          <span
            className={`mr-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${confidenceTier.badge}`}
          >
            {confidenceTier.label}
          </span>
          <span
            className="mr-1.5 inline-flex items-center gap-0.5 align-middle"
            title={`Confidence ${confidenceTier.bars} of 3`}
            aria-label={`Confidence ${confidenceTier.bars} of 3`}
          >
            {[1, 2, 3].map((bar) => (
              <span
                key={bar}
                className={`h-1.5 w-3 rounded-full ${bar <= confidenceTier.bars ? confidenceTier.bar : "bg-white/10"}`}
              />
            ))}
          </span>
          {match.labels.join(", ")}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={confirm}
            className="inline-flex items-center gap-1 rounded-full bg-cyan-500 px-3.5 py-1.5 text-xs font-bold text-cyan-950 transition hover:bg-cyan-400"
          >
            <Check className="h-3.5 w-3.5" />
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-[#8fb8d0] transition hover:text-[#cfe6f7]"
          >
            <X className="h-3.5 w-3.5" />
            Not this
          </button>
        </div>
      </div>
    </div>
  );
}

export default DiscoveryCaptureSuggestion;
