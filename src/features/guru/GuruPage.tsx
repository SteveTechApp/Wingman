import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

function SectionCard({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
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
          <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
          {subtitle ? (
            <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.80)", lineHeight: 1.45 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div style={{ marginTop: 14 }}>{children}</div>
    </section>
  );
}

function SuggestionChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wm-hover-lift"
      style={{
        textAlign: "left",
        width: "100%",
        borderRadius: 12,
        border: "1px solid rgba(168,85,247,0.22)",
        background: "linear-gradient(180deg, rgba(168,85,247,0.12) 0%, rgba(168,85,247,0.06) 100%)",
        padding: "12px 14px",
        color: "rgba(255,255,255,0.94)",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 13, lineHeight: 1.4 }}>{label}</div>
    </button>
  );
}

function BulletList({
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

export default function GuruPage() {
  const nav = useNavigate();
  const [draftQuestion, setDraftQuestion] = useState(SUGGESTIONS[0]);
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [result, setResult] = useState<GuruResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => draftQuestion.trim().length > 0, [draftQuestion]);
  const hasSkuSuggestions = result.skuSuggestions.length > 0;

  async function submitQuestion() {
    const next = draftQuestion.trim();
    if (!next) return;

    setLoading(true);
    try {
      const response = await askGuru(next);
      setSubmittedQuestion(next);
      setResult(response);
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setDraftQuestion("");
    setSubmittedQuestion("");
    setResult(EMPTY_RESPONSE);
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
        }),
      );
    } catch {}

    nav("/app/tools/proposal");
  }

  return (
    <div className="wm-page wm-animate-in" style={{ width: "100%", maxWidth: "none", margin: 0 }}>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="wm-page-eyebrow">GUIDED ASSISTANCE</div>
          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>Wingman Guru</h1>
          <div style={{ maxWidth: 940, fontSize: 14, color: "rgba(255,255,255,0.88)", lineHeight: 1.5 }}>
            Guru now gives a product starting point first, then follow-up qualification questions, and finally a proposal handoff when SKU suggestions are available.
          </div>
        </div>

        <SectionCard
          title="Ask a question"
          subtitle="Describe the requirement clearly, then use Submit question to commit it."
          right={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="wm-btn" style={{ height: 36, padding: "0 12px" }} onClick={clearAll}>
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
          }
        >
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
        </SectionCard>

        <SectionCard
          title="Suggested inputs"
          subtitle="Selecting one loads it into the question box."
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
            {SUGGESTIONS.map((item) => (
              <SuggestionChip key={item} label={item} onClick={() => setDraftQuestion(item)} />
            ))}
          </div>
        </SectionCard>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 14 }}>
          <SectionCard title="Current question" subtitle="The last committed question.">
            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                padding: 14,
                minHeight: 120,
                fontSize: 14,
                lineHeight: 1.55,
                color: "rgba(255,255,255,0.94)",
                whiteSpace: "pre-wrap",
              }}
            >
              {submittedQuestion || "No question submitted yet."}
            </div>
          </SectionCard>

          <SectionCard
            title="Product starting point"
            subtitle="Guru should always suggest a practical starting direction first."
            right={
              hasSkuSuggestions ? (
                <span
                  className="wm-btn"
                  style={{
                    height: 30,
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0 10px",
                    borderColor: "rgba(168,85,247,0.28)",
                    background: "rgba(168,85,247,0.12)",
                    color: "rgba(255,255,255,0.94)",
                  }}
                >
                  SKU-aware
                </span>
              ) : null
            }
          >
            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(168,85,247,0.20)",
                background: "linear-gradient(180deg, rgba(168,85,247,0.10) 0%, rgba(168,85,247,0.05) 100%)",
                padding: 14,
                minHeight: 120,
                fontSize: 14,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.94)",
              }}
            >
              {result.productStartingPoint}
            </div>
          </SectionCard>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 14 }}>
          <SectionCard
            title="Suggested SKU starting point"
            subtitle="Provisional SKUs only — confirm fit after qualification."
            right={
              hasSkuSuggestions ? (
                <button type="button" className="wm-btn wm-btn-primary" style={{ height: 34, padding: "0 14px" }} onClick={buildProposal}>
                  Build proposal around this response
                </button>
              ) : null
            }
          >
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

                {result.matchedProducts.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {result.matchedProducts.map((item) => (
                      <div
                        key={item.sku}
                        style={{
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "rgba(255,255,255,0.04)",
                          padding: 12,
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: 13 }}>{item.sku} — {item.name}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.82)", lineHeight: 1.45 }}>
                          {item.summary}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  padding: 14,
                  minHeight: 120,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.82)",
                  lineHeight: 1.55,
                }}
              >
                No SKU suggestions yet. Add more detail about the room, distances, sources, displays, or workflow and submit again.
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Further qualification"
            subtitle="Questions that help build out the original requirement."
          >
            <BulletList items={result.qualificationQuestions} accentRgb="94,234,212" />
          </SectionCard>
        </div>

        <SectionCard title="Guided notes" subtitle="Additional guidance to support the original request.">
          <BulletList items={result.guidanceNotes} accentRgb="125,211,252" />
        </SectionCard>
      </div>
    </div>
  );
}