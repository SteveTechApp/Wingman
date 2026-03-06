import * as React from "react";
import { useNavigate } from "react-router-dom";
import { TRAINING_MODULES, type TrainingModule } from "@/training/trainingModules";
import {
  PageHeader,
  pageWrapStyle,
  stackStyle,
  cardStyle,
  sectionTitleStyle,
  sectionTextStyle,
  inputStyle,
  Field,
} from "@/ui2/page/PageChrome";

function pill(level: TrainingModule["level"]) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.86)",
  };
  return base;
}

export default function TrainingHubPage() {
  const nav = useNavigate();
  const [q, setQ] = React.useState("");
  const [track, setTrack] = React.useState<TrainingModule["track"] | "All">("All");
  const [level, setLevel] = React.useState<TrainingModule["level"] | "All">("All");
  const [openId, setOpenId] = React.useState<string | null>(TRAINING_MODULES[0]?.id ?? null);

  const tracks: Array<TrainingModule["track"] | "All"> = ["All", "Sales", "Design", "Products", "Tools"];
  const levels: Array<TrainingModule["level"] | "All"> = ["All", "Foundation", "Intermediate", "Advanced"];

  const filtered = React.useMemo(() => {
    const qq = q.trim().toLowerCase();
    return TRAINING_MODULES.filter((m) => {
      if (track !== "All" && m.track !== track) return false;
      if (level !== "All" && m.level !== level) return false;
      if (!qq) return true;
      const inTitle = m.title.toLowerCase().includes(qq);
      const inDesc = m.description.toLowerCase().includes(qq);
      const inLesson = m.lessons.some((l) => l.title.toLowerCase().includes(qq) || l.bullets.some((b) => b.toLowerCase().includes(qq)));
      return inTitle || inDesc || inLesson;
    });
  }, [q, track, level]);

  const open = filtered.find((m) => m.id === openId) ?? filtered[0] ?? null;

  return (
    <div className="wm-page wm-animate-in" style={pageWrapStyle()}>
      <div style={stackStyle(14)}>
        <PageHeader
          eyebrow="TRAINING"
          title="Training Hub"
          description="Modular learning blocks for sales discovery, system design, product positioning and tool use."
          actions={
            <button className="wm-btn" type="button" onClick={() => nav("/app/dashboard")}>
              Dashboard
            </button>
          }
        />

        <section style={cardStyle()}>
          <div style={sectionTitleStyle()}>Find a module</div>
          <div style={sectionTextStyle()}>
            Filter by track or level, then open a module for more detail.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gap: 14,
              gridTemplateColumns: "2fr 1fr 1fr",
            }}
          >
            <Field label="Search">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search modules or lessons"
                style={inputStyle()}
              />
            </Field>

            <Field label="Track">
              <select value={track} onChange={(e) => setTrack(e.target.value as any)} style={inputStyle()}>
                {tracks.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>

            <Field label="Level">
              <select value={level} onChange={(e) => setLevel(e.target.value as any)} style={inputStyle()}>
                {levels.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "minmax(360px, 0.9fr) minmax(420px, 1.1fr)",
          }}
        >
          <section style={cardStyle()}>
            <div style={sectionTitleStyle()}>Modules</div>
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {filtered.map((m) => {
                const active = m.id === (open?.id ?? openId);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setOpenId(m.id)}
                    style={{
                      textAlign: "left",
                      borderRadius: 14,
                      border: active
                        ? "1px solid rgba(15,154,126,0.28)"
                        : "1px solid rgba(255,255,255,0.08)",
                      background: active
                        ? "linear-gradient(90deg, rgba(9,44,39,0.92), rgba(7,18,30,0.92))"
                        : "rgba(255,255,255,0.03)",
                      padding: 14,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 800, color: "rgba(255,255,255,0.94)" }}>
                      {m.title}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.68)" }}>
                      {m.description}
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={pill(m.level)}>{m.level}</span>
                      <span style={pill(m.level)}>{m.track}</span>
                    </div>
                  </button>
                );
              })}

              {!filtered.length ? (
                <div style={{ ...sectionTextStyle(), marginTop: 0 }}>
                  No modules matched your filters.
                </div>
              ) : null}
            </div>
          </section>

          <section style={cardStyle()}>
            <div style={sectionTitleStyle()}>Module detail</div>

            {!open ? (
              <div style={sectionTextStyle()}>Select a module to view details.</div>
            ) : (
              <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "rgba(255,255,255,0.96)" }}>
                    {open.title}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.72)" }}>
                    {open.description}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={pill(open.level)}>{open.level}</span>
                    <span style={pill(open.level)}>{open.track}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {open.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      style={{
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.03)",
                        padding: 14,
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 800, color: "rgba(255,255,255,0.94)" }}>
                        {lesson.title}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.58)" }}>
                        {lesson.minutes} min
                      </div>
                      <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "rgba(255,255,255,0.76)" }}>
                        {lesson.bullets.map((b, i) => <li key={i} style={{ marginTop: 6 }}>{b}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}