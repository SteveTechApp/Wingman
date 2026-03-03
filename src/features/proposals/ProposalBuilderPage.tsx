import React, { useEffect, useMemo, useState } from "react";

type GuruSeed = {
  source?: string;
  question?: string;
  productStartingPoint?: string;
  skuSuggestions?: string[];
  qualificationQuestions?: string[];
  guidanceNotes?: string[];
  matchedProducts?: Array<{ sku: string; name: string; summary?: string }>;
  savedAt?: string;
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

function BulletList({
  items,
}: {
  items: string[];
}) {
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
              background: "rgba(251,191,36,0.92)",
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

export default function ProposalBuilderPage() {
  const [seed, setSeed] = useState<GuruSeed | null>(null);
  const [opportunityName, setOpportunityName] = useState("Untitled opportunity");
  const [proposalSummary, setProposalSummary] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wm_guru_proposal_seed");
      if (!raw) return;
      const parsed = JSON.parse(raw) as GuruSeed;
      setSeed(parsed);
      setProposalSummary(parsed.productStartingPoint || "");
    } catch {}
  }, []);

  const skus = useMemo(() => seed?.skuSuggestions || [], [seed]);

  function clearGuruSeed() {
    try {
      localStorage.removeItem("wm_guru_proposal_seed");
    } catch {}
    setSeed(null);
  }

  return (
    <div className="wm-page wm-animate-in" style={{ width: "100%", maxWidth: "none", margin: 0 }}>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="wm-page-eyebrow">COMMERCIAL HANDOFF</div>
          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>Proposal Builder</h1>
          <div style={{ maxWidth: 960, fontSize: 14, color: "rgba(255,255,255,0.88)", lineHeight: 1.5 }}>
            Build a proposal around the current recommendation. If you came from Guru, the recommendation seed is loaded below.
          </div>
        </div>

        {seed ? (
          <SectionCard
            title="Guru recommendation imported"
            subtitle="This proposal is seeded from the most recent Guru response."
            right={
              <button type="button" className="wm-btn" style={{ height: 34, padding: "0 12px" }} onClick={clearGuruSeed}>
                Clear Guru seed
              </button>
            }
          >
            <div style={{ display: "grid", gap: 12 }}>
              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(168,85,247,0.20)",
                  background: "linear-gradient(180deg, rgba(168,85,247,0.10) 0%, rgba(168,85,247,0.05) 100%)",
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  Product starting point
                </div>
                <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.94)" }}>
                  {seed.productStartingPoint || "No Guru starting point available."}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
                <div
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.04)",
                    padding: 14,
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>Recommended SKUs</div>
                  {skus.length ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {skus.map((sku) => (
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
                  ) : (
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
                      No SKU suggestions were provided by Guru.
                    </div>
                  )}
                </div>

                <div
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.04)",
                    padding: 14,
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>Outstanding qualification items</div>
                  <BulletList items={seed.qualificationQuestions || ["Confirm source count, display count, distances, and user workflow."]} />
                </div>
              </div>
            </div>
          </SectionCard>
        ) : null}

        <SectionCard title="Proposal summary" subtitle="Use this as the commercial narrative starting point.">
          <div style={{ display: "grid", gap: 12 }}>
            <input
              value={opportunityName}
              onChange={(e) => setOpportunityName(e.target.value)}
              placeholder="Opportunity name"
              style={{
                width: "100%",
                height: 42,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                padding: "0 12px",
                color: "rgba(255,255,255,0.96)",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />

            <textarea
              value={proposalSummary}
              onChange={(e) => setProposalSummary(e.target.value)}
              placeholder="Summarise the recommended solution, commercial position, and assumptions."
              style={{
                width: "100%",
                minHeight: 140,
                resize: "vertical",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                padding: 14,
                color: "rgba(255,255,255,0.96)",
                fontSize: 14,
                lineHeight: 1.5,
                boxSizing: "border-box",
              }}
            />
          </div>
        </SectionCard>

        <SectionCard title="Recommended commercial structure" subtitle="A simple quote-pack skeleton to speed up handoff.">
          <div style={{ display: "grid", gap: 12 }}>
            <div className="wm-card" style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.03)" }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>1. Requirement summary</div>
              <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.45 }}>
                Confirm the room type, use case, source count, display count, and operational objective.
              </div>
            </div>
            <div className="wm-card" style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.03)" }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>2. Recommended starting products</div>
              <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.45 }}>
                Present the initial SKU path and explain why it is the correct commercial starting point.
              </div>
            </div>
            <div className="wm-card" style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.03)" }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>3. Assumptions and exclusions</div>
              <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.45 }}>
                Record any assumptions that still need confirmation before the final BOM is issued.
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}