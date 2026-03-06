import * as React from "react";
import { useNavigate } from "react-router-dom";
import CollapsibleCard from "@/ui2/components/CollapsibleCard";
import { askGuru, type GuruResponse } from "./guruService";

const SUGGESTIONS = [
  "Recommend a WyreStorm starting point for a BYOD meeting room with 2 displays, USB-C and wireless casting",
  "Suggest a WyreStorm KVM starting point for a control room with 4K30 and USB extension",
  "What WyreStorm product should I start with for a 4-input presentation space with multiview?",
  "Recommend a starting SKU for an audio collaboration room with ceiling mics and external speakers",
  "Suggest a like-for-like WyreStorm starting point for a competitor replacement matrix requirement",
];

const EMPTY_RESPONSE: GuruResponse = {
  question: "",
  productStartingPoint:
    "Describe the room, use case, source count, display count, cable distances, and any competitor reference so Guru can suggest a WyreStorm starting point.",
  skuSuggestions: [],
  matchedProducts: [],
  qualificationQuestions: [
    "What is the room type or application?",
    "How many sources and displays are involved?",
    "What are the required cable distances?",
    "Is this a new design, an upgrade, or a competitor replacement?",
  ],
  guidanceNotes: [
    "Guru works best when the question includes the commercial objective and the core technical constraints.",
  ],
};

function ResultBulletList({
  items,
  accentRgb,
}: {
  items: string[];
  accentRgb?: string;
}) {
  const rgb = accentRgb || "255,255,255";

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "10px 1fr",
            gap: 10,
            alignItems: "start",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              marginTop: 6,
              background: `rgba(${rgb},0.92)`,
            }}
          />
          <div style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.90)" }}>
            {item}
          </div>
        </div>
      ))}
    </div>
  );
}

function buildRefinedQuestion(baseQuestion: string, questions: string[], answers: string[]): string {
  const safeBase = (baseQuestion || "").trim();
  const lines: string[] = [];

  for (let i = 0; i < questions.length; i++) {
    const answer = (answers[i] || "").trim();
    if (!answer) continue;
    lines.push(`${questions[i]} ${answer}`);
  }

  if (!lines.length) return safeBase;

  return [safeBase, "", "Further qualification answers:", ...lines.map((x) => `- ${x}`)].join("\n");
}

export default function GuruPage() {
  const nav = useNavigate();
  const [draftQuestion, setDraftQuestion] = React.useState(SUGGESTIONS[0]);
  const [submittedQuestion, setSubmittedQuestion] = React.useState("");
  const [result, setResult] = React.useState<GuruResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = React.useState(false);

  const [followUpAnswers, setFollowUpAnswers] = React.useState<string[]>([]);
  const [refinedQuestion, setRefinedQuestion] = React.useState("");
  const [lastRefinementApplied, setLastRefinementApplied] = React.useState(false);

  const canSubmit = React.useMemo(() => draftQuestion.trim().length > 0, [draftQuestion]);
  const hasSkuSuggestions = result.skuSuggestions.length > 0;

  const preparedAnswers = React.useMemo(() => {
    return result.qualificationQuestions.map((_, i) => followUpAnswers[i] || "");
  }, [result.qualificationQuestions, followUpAnswers]);

  const hasAnyFollowUpAnswer = React.useMemo(() => {
    return preparedAnswers.some((x) => x.trim().length > 0);
  }, [preparedAnswers]);

  async function submitQuestion() {
    const next = draftQuestion.trim();
    if (!next) return;

    setLoading(true);
    try {
      const response = await askGuru(next);
      setSubmittedQuestion(next);
      setResult(response);
      setFollowUpAnswers(new Array(response.qualificationQuestions.length).fill(""));
      setRefinedQuestion("");
      setLastRefinementApplied(false);
    } finally {
      setLoading(false);
    }
  }

  async function applyFurtherQuestioning() {
    const base = submittedQuestion.trim() || draftQuestion.trim();
    if (!base) return;

    const nextRefinedQuestion = buildRefinedQuestion(
      base,
      result.qualificationQuestions,
      preparedAnswers
    );

    if (nextRefinedQuestion.trim() === base.trim()) return;

    setLoading(true);
    try {
      const response = await askGuru(nextRefinedQuestion);
      setSubmittedQuestion(nextRefinedQuestion);
      setRefinedQuestion(nextRefinedQuestion);
      setResult(response);
      setFollowUpAnswers(new Array(response.qualificationQuestions.length).fill(""));
      setLastRefinementApplied(true);
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setDraftQuestion("");
    setSubmittedQuestion("");
    setResult(EMPTY_RESPONSE);
    setFollowUpAnswers([]);
    setRefinedQuestion("");
    setLastRefinementApplied(false);
  }

  function clearFollowUpAnswers() {
    setFollowUpAnswers(new Array(result.qualificationQuestions.length).fill(""));
  }

  function updateFollowUpAnswer(index: number, value: string) {
    setFollowUpAnswers((prev) => {
      const next = [...prev];
      while (next.length < result.qualificationQuestions.length) next.push("");
      next[index] = value;
      return next;
    });
  }

  function buildProposal() {
    try {
      localStorage.setItem(
        "wm_guru_proposal_seed",
        JSON.stringify({
          source: "guru",
          question: submittedQuestion,
          productStartingPoint: result.productStartingPoint,
          skuSuggestions: result.skuSuggestions,
          qualificationQuestions: result.qualificationQuestions,
          guidanceNotes: result.guidanceNotes,
          matchedProducts: result.matchedProducts,
          savedAt: new Date().toISOString(),
        })
      );
    } catch {}

    nav("/app/tools/proposal");
  }

  return (
    <div className="wm-page wm-animate-in" style={{ width: "100%", maxWidth: "none", margin: 0 }}>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="wm-page-eyebrow">GUIDED ASSISTANCE</div>
          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>
            Wingman Guru
          </h1>
          <div
            style={{
              maxWidth: 760,
              fontSize: 14,
              color: "rgba(255,255,255,0.88)",
              lineHeight: 1.45,
            }}
          >
            Ask one clear question, get a practical starting point, then refine only if needed.
          </div>
        </div>

        <section className="wm-card" style={{ padding: 16, borderRadius: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Ask Guru</div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.80)",
                  lineHeight: 1.45,
                }}
              >
                Describe the room, workflow, distances, and any competitor reference.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="wm-btn"
                style={{ height: 36, padding: "0 12px" }}
                onClick={clearAll}
              >
                Clear
              </button>

              <button
                type="button"
                className="wm-btn wm-btn-primary"
                style={{
                  height: 36,
                  padding: "0 14px",
                  opacity: canSubmit && !loading ? 1 : 0.65,
                  cursor: canSubmit && !loading ? "pointer" : "not-allowed",
                }}
                disabled={!canSubmit || loading}
                onClick={submitQuestion}
              >
                {loading ? "Working..." : "Submit question"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <textarea
              value={draftQuestion}
              onChange={(e) => setDraftQuestion(e.target.value)}
              placeholder="Describe the room, source count, display count, cable distances, user workflow, or competitor reference."
              style={{
                width: "100%",
                minHeight: 110,
                resize: "vertical",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.05)",
                padding: 14,
                color: "rgba(255,255,255,0.96)",
                fontSize: 14,
                lineHeight: 1.5,
                boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SUGGESTIONS.slice(0, 3).map((item) => (
                <button
                  key={item}
                  type="button"
                  className="wm-btn"
                  style={{ minHeight: 34, padding: "6px 10px", textAlign: "left" }}
                  onClick={() => setDraftQuestion(item)}
                >
                  Load example
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="wm-card" style={{ padding: 16, borderRadius: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Guru result</div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.80)",
                  lineHeight: 1.45,
                }}
              >
                Practical starting point first. Refine only if you need more precision.
              </div>
            </div>

            {hasSkuSuggestions ? (
              <button
                type="button"
                className="wm-btn wm-btn-primary"
                style={{ height: 34, padding: "0 14px" }}
                onClick={buildProposal}
              >
                Build proposal
              </button>
            ) : null}
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(168,85,247,0.20)",
                background: "linear-gradient(180deg, rgba(168,85,247,0.10) 0%, rgba(168,85,247,0.05) 100%)",
                padding: 14,
                fontSize: 14,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.94)",
              }}
            >
              {result.productStartingPoint}
            </div>

            {hasSkuSuggestions ? (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {result.skuSuggestions.map((sku) => (
                    <span
                      key={sku}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: "1px solid rgba(251,191,36,0.24)",
                        background: "rgba(251,191,36,0.10)",
                        color: "rgba(255,245,214,0.96)",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      {sku}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <CollapsibleCard
          id="guru_refine"
          title="Refine the recommendation"
          subtitle="Answer follow-up questions only when you need a more precise result."
          defaultCollapsed
        >
          {result.qualificationQuestions.length ? (
            <div style={{ display: "grid", gap: 12 }}>
              {result.qualificationQuestions.map((question, index) => (
                <div
                  key={`${question}-${index}`}
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(94,234,212,0.16)",
                    background: "rgba(94,234,212,0.05)",
                    padding: 12,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(220,252,247,0.96)" }}>
                    {question}
                  </div>

                  <textarea
                    value={preparedAnswers[index]}
                    onChange={(e) => updateFollowUpAnswer(index, e.target.value)}
                    placeholder="Enter the customer's answer or your best known detail here."
                    style={{
                      width: "100%",
                      minHeight: 74,
                      resize: "vertical",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      padding: 10,
                      color: "rgba(255,255,255,0.94)",
                      fontSize: 13,
                      lineHeight: 1.45,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="wm-btn"
                  style={{ height: 34, padding: "0 12px" }}
                  onClick={clearFollowUpAnswers}
                  disabled={!result.qualificationQuestions.length || loading}
                >
                  Clear answers
                </button>

                <button
                  type="button"
                  className="wm-btn wm-btn-primary"
                  style={{
                    height: 34,
                    padding: "0 14px",
                    opacity: hasAnyFollowUpAnswer && !loading ? 1 : 0.65,
                    cursor: hasAnyFollowUpAnswer && !loading ? "pointer" : "not-allowed",
                  }}
                  disabled={!hasAnyFollowUpAnswer || loading}
                  onClick={applyFurtherQuestioning}
                >
                  {loading ? "Working..." : "Refine design"}
                </button>
              </div>

              {lastRefinementApplied && refinedQuestion ? (
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(94,234,212,0.18)",
                    background: "rgba(94,234,212,0.05)",
                    padding: 12,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: "rgba(240,253,250,0.92)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {refinedQuestion}
                </div>
              ) : null}
            </div>
          ) : (
            <ResultBulletList
              items={["No further qualification questions are currently available."]}
              accentRgb="94,234,212"
            />
          )}
        </CollapsibleCard>

        <CollapsibleCard
          id="guru_notes"
          title="Guided notes"
          subtitle="Additional supporting guidance."
          defaultCollapsed
        >
          <ResultBulletList items={result.guidanceNotes} accentRgb="125,211,252" />
        </CollapsibleCard>
      </div>
    </div>
  );
}