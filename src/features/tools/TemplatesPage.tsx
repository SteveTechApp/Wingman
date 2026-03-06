import * as React from "react";
// src/features/tools/TemplatesPage.tsx

import { getActiveProject } from "@/features/projects/projectStore";
import type { DiscoveryProductFamily } from "@/features/discovery/DiscoveryWizardPage";

type TemplateTier = "Bronze" | "Silver" | "Gold";

type TemplatePack = {
  tier: TemplateTier;
  title: string;
  summary: string;
  families: DiscoveryProductFamily[];
  items: string[];
};

function chipStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 28,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    fontSize: 12,
    lineHeight: 1,
    whiteSpace: "nowrap",
  };
}

function cardStyle(): React.CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    background: "rgba(16,22,32,0.72)",
    padding: 14,
  };
}

function buttonStyle(active?: boolean): React.CSSProperties {
  return {
    borderRadius: 12,
    border: active
      ? "1px solid rgba(120,200,255,0.26)"
      : "1px solid rgba(255,255,255,0.12)",
    background: active
      ? "rgba(120,200,255,0.14)"
      : "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.92)",
    padding: "9px 12px",
    minHeight: 36,
    cursor: "pointer",
    font: "inherit",
    whiteSpace: "nowrap",
  };
}

function uniqueFamilies(rows: DiscoveryProductFamily[]): DiscoveryProductFamily[] {
  return Array.from(new Set(rows));
}

function buildTemplate(
  tier: TemplateTier,
  families: DiscoveryProductFamily[],
  roomName: string
): TemplatePack {
  const items: string[] = [];
  const title = roomName ? `${tier} template · ${roomName}` : `${tier} template`;

  if (families.includes("Apollo")) {
    items.push(
      tier === "Bronze"
        ? "1x Apollo base collaboration endpoint"
        : tier === "Silver"
        ? "1x Apollo enhanced collaboration endpoint"
        : "1x Apollo premium collaboration endpoint"
    );
  }
  if (families.includes("HDBaseT")) {
    items.push(
      tier === "Bronze"
        ? "1x HDBaseT point-to-point kit"
        : tier === "Silver"
        ? "1x HDBaseT extender set with control"
        : "1x HDBaseT premium transport set"
    );
  }
  if (families.includes("AVoIP")) {
    items.push(
      tier === "Bronze"
        ? "2x AVoIP endpoints"
        : tier === "Silver"
        ? "4x AVoIP endpoints"
        : "6x AVoIP endpoints"
    );
  }
  if (families.includes("Matrix")) {
    items.push(
      tier === "Bronze"
        ? "1x 4x4 matrix"
        : tier === "Silver"
        ? "1x 8x8 matrix"
        : "1x 16x16 matrix"
    );
  }
  if (families.includes("USB Extension")) {
    items.push(
      tier === "Bronze"
        ? "1x USB extender"
        : tier === "Silver"
        ? "1x managed USB extender"
        : "1x premium USB extension set"
    );
  }
  if (families.includes("Video Wall")) {
    items.push(
      tier === "Bronze"
        ? "1x entry video wall controller"
        : tier === "Silver"
        ? "1x mid video wall controller"
        : "1x advanced video wall processor"
    );
  }

  if (!items.length) {
    items.push(
      tier === "Bronze"
        ? "1x starter template placeholder"
        : tier === "Silver"
        ? "1x balanced template placeholder"
        : "1x premium template placeholder"
    );
  }

  const summary =
    tier === "Bronze"
      ? "Cost-led starting point for early-stage qualification."
      : tier === "Silver"
      ? "Balanced recommendation for most standard opportunities."
      : "Higher-spec option for premium or expansion-ready systems.";

  return {
    tier,
    title,
    summary,
    families,
    items,
  };
}

function packToText(pack: TemplatePack, projectName: string): string {
  return [
    `Project: ${projectName || "No active project"}`,
    `Template: ${pack.title}`,
    `Tier: ${pack.tier}`,
    `Families: ${pack.families.length ? pack.families.join(", ") : "None"}`,
    "",
    pack.summary,
    "",
    ...pack.items.map((x, i) => `${i + 1}. ${x}`),
  ].join("\n");
}

function downloadTxt(fileName: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function TemplatesPage() {
  const activeProject = getActiveProject();
  const [selectedTier, setSelectedTier] = React.useState<TemplateTier>("Silver");

  const discovery = activeProject?.discovery;
  const recommendedFamilies = React.useMemo(
    () =>
      uniqueFamilies(
        Array.isArray(discovery?.recommendedFamilies)
          ? discovery!.recommendedFamilies
          : []
      ),
    [discovery]
  );

  const roomName = discovery?.roomName || activeProject?.name || "";

  const packs = React.useMemo(
    () => [
      buildTemplate("Bronze", recommendedFamilies, roomName),
      buildTemplate("Silver", recommendedFamilies, roomName),
      buildTemplate("Gold", recommendedFamilies, roomName),
    ],
    [recommendedFamilies, roomName]
  );

  const selectedPack = React.useMemo(
    () => packs.find((p) => p.tier === selectedTier) || packs[1] || packs[0],
    [packs, selectedTier]
  );

  async function copyPack() {
    const text = packToText(selectedPack, activeProject?.name || "");
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }

  function exportPack() {
    const text = packToText(selectedPack, activeProject?.name || "");
    const fileName = `${(activeProject?.name || "template").replace(/[^a-z0-9_\-]+/gi, "_")}_${selectedPack.tier}.txt`;
    downloadTxt(fileName, text);
  }

  return (
    <div style={{ minHeight: "100%", padding: 16, color: "rgba(255,255,255,0.92)" }}>
      <div style={{ ...cardStyle(), marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>
          Templates
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <span style={chipStyle()}>Project: {activeProject?.name || "No active project"}</span>
          <span style={chipStyle()}>Room: {discovery?.roomName || "—"}</span>
          <span style={chipStyle()}>
            Families: {recommendedFamilies.length ? recommendedFamilies.join(", ") : "No discovery recommendations"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <button type="button" onClick={() => setSelectedTier("Bronze")} style={buttonStyle(selectedTier === "Bronze")}>
            Bronze
          </button>
          <button type="button" onClick={() => setSelectedTier("Silver")} style={buttonStyle(selectedTier === "Silver")}>
            Silver
          </button>
          <button type="button" onClick={() => setSelectedTier("Gold")} style={buttonStyle(selectedTier === "Gold")}>
            Gold
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={copyPack} style={buttonStyle()}>
            Copy template
          </button>
          <button type="button" onClick={exportPack} style={buttonStyle(true)}>
            Export .txt
          </button>
        </div>
      </div>

      <div style={{ ...cardStyle(), marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>
            {selectedPack.title}
          </div>
          <span style={chipStyle()}>{selectedPack.items.length} items</span>
        </div>

        <div style={{ opacity: 0.82, fontSize: 13, marginBottom: 12 }}>
          {selectedPack.summary}
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {selectedPack.items.map((item, idx) => (
            <div
              key={selectedPack.tier + "_" + idx}
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 700 }}>{item}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        {packs.map((pack) => (
          <div key={pack.tier} style={cardStyle()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>{pack.tier}</div>
              <span style={chipStyle()}>{pack.items.length} items</span>
            </div>
            <div style={{ opacity: 0.8, fontSize: 13, marginBottom: 10 }}>
              {pack.summary}
            </div>
            <div style={{ opacity: 0.78, fontSize: 13 }}>
              {pack.items.join(", ")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
