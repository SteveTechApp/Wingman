import React from "react";

export type VideoWallTabKey = "overview" | "bom" | "signal" | "technical";

type TabItem = {
  key: VideoWallTabKey;
  label: string;
};

type Props = {
  title: string;
  subtitle?: string;

  recommendationTitle: string;
  recommendationSummary: string;
  recommendationMeta?: React.ReactNode;
  recommendationWhy?: React.ReactNode;
  recommendationActions?: React.ReactNode;

  controls: React.ReactNode;
  preview: React.ReactNode;

  tabs: TabItem[];
  activeTab: VideoWallTabKey;
  onTabChange: (key: VideoWallTabKey) => void;
  tabContent: React.ReactNode;

  rightRail?: React.ReactNode;
};

const shellCard: React.CSSProperties = {
  border: "1px solid rgba(100,180,255,0.18)",
  background: "linear-gradient(180deg, rgba(7,20,42,0.94) 0%, rgba(5,14,31,0.96) 100%)",
  borderRadius: 16,
  boxShadow: "0 10px 28px rgba(0,0,0,0.28)",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: "rgba(167,201,255,0.78)",
  fontWeight: 800,
};

const tabButton = (active: boolean): React.CSSProperties => ({
  borderRadius: 999,
  padding: "10px 14px",
  border: active ? "1px solid rgba(125,197,255,0.52)" : "1px solid rgba(100,180,255,0.18)",
  background: active
    ? "linear-gradient(180deg, rgba(42,102,174,0.36) 0%, rgba(20,53,96,0.48) 100%)"
    : "rgba(10,21,41,0.86)",
  color: active ? "#ffffff" : "rgba(220,234,255,0.82)",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  minWidth: 116,
});

export default function VideoWallSolutionShell(props: Props) {
  const {
    title,
    subtitle,
    recommendationTitle,
    recommendationSummary,
    recommendationMeta,
    recommendationWhy,
    recommendationActions,
    controls,
    preview,
    tabs,
    activeTab,
    onTabChange,
    tabContent,
    rightRail,
  } = props;

  return (
    <div className="wm-page">
      <div style={{ maxWidth: 1600, margin: "0 auto", width: "100%", display: "grid", gap: 16 }}>
        <section style={{ ...shellCard, padding: 18 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={labelStyle}>Quick video wall builder</div>
            <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#ffffff", lineHeight: 1.05 }}>
                  {title}
                </div>
                {subtitle ? (
                  <div style={{ fontSize: 14, color: "rgba(221,234,255,0.82)", maxWidth: 900, lineHeight: 1.5 }}>
                    {subtitle}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section style={{ ...shellCard, padding: 18 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={labelStyle}>Recommended solution</div>

            <div style={{ display: "grid", gridTemplateColumns: rightRail ? "minmax(0, 1.6fr) minmax(280px, 0.8fr)" : "1fr", gap: 16 }}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#ffffff", lineHeight: 1.08 }}>
                  {recommendationTitle}
                </div>

                <div style={{ fontSize: 15, color: "rgba(226,238,255,0.88)", lineHeight: 1.55 }}>
                  {recommendationSummary}
                </div>

                {recommendationWhy ? (
                  <div
                    style={{
                      border: "1px solid rgba(100,180,255,0.16)",
                      background: "rgba(9,21,42,0.62)",
                      borderRadius: 14,
                      padding: 14,
                    }}
                  >
                    {recommendationWhy}
                  </div>
                ) : null}

                {recommendationActions ? (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {recommendationActions}
                  </div>
                ) : null}
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {recommendationMeta ? (
                  <div
                    style={{
                      border: "1px solid rgba(100,180,255,0.16)",
                      background: "rgba(9,21,42,0.62)",
                      borderRadius: 14,
                      padding: 14,
                    }}
                  >
                    {recommendationMeta}
                  </div>
                ) : null}

                {rightRail ? (
                  <div
                    style={{
                      border: "1px solid rgba(100,180,255,0.16)",
                      background: "rgba(9,21,42,0.62)",
                      borderRadius: 14,
                      padding: 14,
                    }}
                  >
                    {rightRail}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "320px minmax(0, 1fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <aside style={{ ...shellCard, padding: 14, position: "sticky", top: 80 }}>
            {controls}
          </aside>

          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ ...shellCard, padding: 14, minHeight: 560 }}>
              {preview}
            </div>

            <div style={{ ...shellCard, padding: 14, display: "grid", gap: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => onTabChange(tab.key)}
                    style={tabButton(activeTab === tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div
                style={{
                  border: "1px solid rgba(100,180,255,0.16)",
                  background: "rgba(7,18,37,0.72)",
                  borderRadius: 14,
                  padding: 14,
                  minHeight: 260,
                }}
              >
                {tabContent}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}