import * as React from "react";
import { useNavigate } from "react-router-dom";
import CollapsibleCard from "@/ui2/components/CollapsibleCard";
import {
  BUDGET_BIASES,
  MARKETS,
  TIER_ACCENTS,
  TIER_ORDER,
  USE_CASE_GROUPS,
  type BudgetBias,
  type RoomTemplate,
  type TierKey,
  type UseCaseGroup,
} from "./templateCatalogExpanded";

function SelectCard({
  title,
  text,
  active,
  accentRgb,
  onClick,
}: {
  title: string;
  text: string;
  active?: boolean;
  accentRgb: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wm-hover-lift"
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: 14,
        border: active
          ? `1px solid rgba(${accentRgb},0.34)`
          : "1px solid rgba(255,255,255,0.12)",
        background: active
          ? `linear-gradient(180deg, rgba(${accentRgb},0.18) 0%, rgba(${accentRgb},0.08) 100%)`
          : "rgba(255,255,255,0.04)",
        padding: 14,
        cursor: "pointer",
        color: "rgba(255,255,255,0.96)",
        boxShadow: active ? `inset 0 0 0 1px rgba(${accentRgb},0.08)` : "none",
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 15 }}>{title}</div>
      <div
        style={{
          marginTop: 5,
          fontSize: 12,
          color: "rgba(255,255,255,0.84)",
          lineHeight: 1.4,
        }}
      >
        {text}
      </div>
    </button>
  );
}

function TierButton({
  tier,
  active,
  onClick,
}: {
  tier: TierKey;
  active?: boolean;
  onClick: () => void;
}) {
  const accent = TIER_ACCENTS[tier];

  return (
    <button
      type="button"
      onClick={onClick}
      className="wm-hover-lift"
      style={{
        height: 42,
        padding: "0 14px",
        borderRadius: 12,
        border: active
          ? `1px solid rgba(${accent.rgb},0.38)`
          : "1px solid rgba(255,255,255,0.12)",
        background: active
          ? `linear-gradient(180deg, rgba(${accent.rgb},0.22) 0%, rgba(${accent.rgb},0.10) 100%)`
          : "rgba(255,255,255,0.04)",
        color: "rgba(255,255,255,0.96)",
        fontSize: 14,
        fontWeight: 800,
        cursor: "pointer",
        boxShadow: active ? `0 10px 18px rgba(${accent.rgb},0.10)` : "none",
      }}
    >
      {accent.label}
    </button>
  );
}

function BulletList({
  items,
  accentRgb,
}: {
  items: string[];
  accentRgb: string;
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
              background: `rgba(${accentRgb},0.92)`,
            }}
          />
          <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.90)" }}>
            {item}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TemplatesPage() {
  const nav = useNavigate();

  const [query, setQuery] = React.useState("");
  const [useCaseGroup, setUseCaseGroup] = React.useState<"all" | UseCaseGroup>("all");
  const [budgetBias, setBudgetBias] = React.useState<"all" | BudgetBias>("all");

  const [marketId, setMarketId] = React.useState<string>(MARKETS[0].id);
  const [roomId, setRoomId] = React.useState<string>(MARKETS[0].roomTypes[0].id);
  const [tier, setTier] = React.useState<TierKey>(MARKETS[0].roomTypes[0].defaultTier);

  const finderMatches = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    const rows: Array<{
      marketId: string;
      room: RoomTemplate;
      marketName: string;
      marketAccent: string;
    }> = [];

    for (const market of MARKETS) {
      for (const room of market.roomTypes) {
        const useCaseMatch = useCaseGroup === "all" || room.useCaseGroup === useCaseGroup;
        const budgetMatch = budgetBias === "all" || room.budgetBias === budgetBias;

        if (!useCaseMatch || !budgetMatch) continue;

        if (q) {
          const haystack = [
            market.name,
            market.summary,
            room.name,
            room.short,
            room.useCases.join(" "),
            room.keywords.join(" "),
            room.recommendedFamilies.join(" "),
          ]
            .join(" ")
            .toLowerCase();

          if (!haystack.includes(q)) continue;
        }

        rows.push({
          marketId: market.id,
          room,
          marketName: market.name,
          marketAccent: market.accentRgb,
        });
      }
    }

    return rows;
  }, [query, useCaseGroup, budgetBias]);

  React.useEffect(() => {
    if (!finderMatches.length) return;

    const currentMarket = MARKETS.find((m) => m.id === marketId);
    const currentRoom = currentMarket?.roomTypes.find((r) => r.id === roomId);

    const stillValid = !!currentRoom &&
      finderMatches.some((x) => x.marketId === marketId && x.room.id === roomId);

    if (stillValid) return;

    const first = finderMatches[0];
    setMarketId(first.marketId);
    setRoomId(first.room.id);
    setTier(first.room.defaultTier);
  }, [finderMatches, marketId, roomId]);

  const market = React.useMemo(
    () => MARKETS.find((m) => m.id === marketId) || MARKETS[0],
    [marketId]
  );

  const visibleRooms = React.useMemo(() => {
    const allowed = new Set(
      finderMatches
        .filter((x) => x.marketId === market.id)
        .map((x) => x.room.id)
    );

    if (!finderMatches.length) return market.roomTypes;

    const filtered = market.roomTypes.filter((r) => allowed.has(r.id));
    return filtered.length ? filtered : market.roomTypes;
  }, [finderMatches, market]);

  const room = React.useMemo(
    () => visibleRooms.find((r) => r.id === roomId) || visibleRooms[0] || market.roomTypes[0],
    [visibleRooms, roomId, market]
  );

  React.useEffect(() => {
    if (!room) return;
    if (room.id !== roomId) {
      setRoomId(room.id);
      setTier(room.defaultTier);
    }
  }, [room, roomId]);

  const tierProfile = room.tiers[tier];
  const tierAccent = TIER_ACCENTS[tier];

  function selectMarket(nextMarketId: string) {
    const nextMarket = MARKETS.find((m) => m.id === nextMarketId) || MARKETS[0];
    const nextVisibleIds = new Set(
      finderMatches
        .filter((x) => x.marketId === nextMarket.id)
        .map((x) => x.room.id)
    );

    const nextRoom =
      nextMarket.roomTypes.find((r) => nextVisibleIds.size === 0 || nextVisibleIds.has(r.id)) ||
      nextMarket.roomTypes[0];

    setMarketId(nextMarket.id);
    setRoomId(nextRoom.id);
    setTier(nextRoom.defaultTier);
  }

  function selectRoom(nextRoomId: string) {
    const nextRoom = visibleRooms.find((r) => r.id === nextRoomId) || visibleRooms[0];
    setRoomId(nextRoom.id);
    setTier(nextRoom.defaultTier);
  }

  function seedTemplateIntoProject() {
    const payload = {
      source: "template-workbench",
      verticalMarket: {
        id: market.id,
        name: market.name,
        summary: market.summary,
      },
      roomType: {
        id: room.id,
        name: room.name,
        summary: room.short,
        useCases: room.useCases,
      },
      tier: {
        id: tier,
        label: tierProfile.label,
        summary: tierProfile.summary,
        positioning: tierProfile.positioning,
        performance: tierProfile.performance,
        commercialNote: tierProfile.commercialNote,
      },
      includedSystems: tierProfile.includedSystems,
      uplift: tierProfile.uplift,
      projectName: market.name + " - " + room.name + " (" + tierProfile.label + ")",
      recommendedFamilies: room.recommendedFamilies,
      nextTool: room.nextTool,
      createdAt: new Date().toISOString(),
    };

    try {
      sessionStorage.setItem("wm_template_seed", JSON.stringify(payload, null, 2));
    } catch {}

    nav("/app/projects");
  }

  function goToRecommendedTool() {
    nav(room.nextTool);
  }

  return (
    <div
      className="wm-page wm-animate-in"
      style={{ width: "100%", maxWidth: "none", margin: 0, minWidth: 0 }}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="wm-page-eyebrow">WORKFLOW TEMPLATES</div>
          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>
            Template Workbench
          </h1>
          <div
            style={{
              maxWidth: 820,
              fontSize: 14,
              color: "rgba(255,255,255,0.88)",
              lineHeight: 1.45,
            }}
          >
            Use the template finder to narrow the options, then choose the application, room type, and capability tier.
          </div>
        </div>

        <section className="wm-card" style={{ padding: 16, borderRadius: 18 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Find a template quickly</div>
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "rgba(255,255,255,0.80)",
              lineHeight: 1.45,
            }}
          >
            Filter the catalog before you step through the selection flow.
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.2fr) repeat(2, minmax(180px, 0.4fr))",
              gap: 12,
            }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by room, use case, keyword, or product family"
              style={{
                height: 40,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.05)",
                padding: "0 12px",
                color: "rgba(255,255,255,0.96)",
              }}
            />

            <select
              value={useCaseGroup}
              onChange={(e) => setUseCaseGroup(e.target.value as "all" | UseCaseGroup)}
              style={{
                height: 40,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.05)",
                padding: "0 12px",
                color: "rgba(255,255,255,0.96)",
              }}
            >
              {USE_CASE_GROUPS.map((x) => (
                <option key={x.id} value={x.id} style={{ color: "#111" }}>
                  {x.label}
                </option>
              ))}
            </select>

            <select
              value={budgetBias}
              onChange={(e) => setBudgetBias(e.target.value as "all" | BudgetBias)}
              style={{
                height: 40,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.05)",
                padding: "0 12px",
                color: "rgba(255,255,255,0.96)",
              }}
            >
              {BUDGET_BIASES.map((x) => (
                <option key={x.id} value={x.id} style={{ color: "#111" }}>
                  {x.label}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "rgba(255,255,255,0.76)",
            }}
          >
            {finderMatches.length} matching room profile{finderMatches.length === 1 ? "" : "s"}
          </div>
        </section>

        <section className="wm-card" style={{ padding: 16, borderRadius: 18 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              color: "rgba(255,255,255,0.72)",
              textTransform: "uppercase",
            }}
          >
            Step 1
          </div>
          <div style={{ marginTop: 6, fontWeight: 900, fontSize: 18 }}>
            Choose the application
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "rgba(255,255,255,0.82)",
              lineHeight: 1.45,
            }}
          >
            Pick the vertical market first so the room choices stay relevant.
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
            }}
          >
            {MARKETS.map((item) => (
              <SelectCard
                key={item.id}
                title={item.name}
                text={item.summary}
                active={item.id === market.id}
                accentRgb={item.accentRgb}
                onClick={() => selectMarket(item.id)}
              />
            ))}
          </div>
        </section>

        <section className="wm-card" style={{ padding: 16, borderRadius: 18 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              color: "rgba(255,255,255,0.72)",
              textTransform: "uppercase",
            }}
          >
            Step 2
          </div>
          <div style={{ marginTop: 6, fontWeight: 900, fontSize: 18 }}>
            Choose a room type
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "rgba(255,255,255,0.82)",
              lineHeight: 1.45,
            }}
          >
            These room profiles are filtered to suit the selected market and current finder filters.
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 10,
            }}
          >
            {visibleRooms.map((item) => (
              <SelectCard
                key={item.id}
                title={item.name}
                text={item.short}
                active={item.id === room.id}
                accentRgb={market.accentRgb}
                onClick={() => selectRoom(item.id)}
              />
            ))}
          </div>
        </section>

        <section className="wm-card" style={{ padding: 16, borderRadius: 18 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              color: "rgba(255,255,255,0.72)",
              textTransform: "uppercase",
            }}
          >
            Step 3
          </div>
          <div style={{ marginTop: 6, fontWeight: 900, fontSize: 18 }}>
            Choose capability tier
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "rgba(255,255,255,0.82)",
              lineHeight: 1.45,
            }}
          >
            Every tier remains functional. Each step up improves capability, flexibility, or user experience.
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TIER_ORDER.map((item) => (
              <TierButton
                key={item}
                tier={item}
                active={item === tier}
                onClick={() => setTier(item)}
              />
            ))}
          </div>
        </section>

        <section className="wm-card" style={{ padding: 16, borderRadius: 18 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Selected template</div>

          <div
            style={{
              marginTop: 12,
              borderRadius: 16,
              border: `1px solid rgba(${tierAccent.rgb},0.22)`,
              background: `linear-gradient(180deg, rgba(${tierAccent.rgb},0.12) 0%, rgba(${tierAccent.rgb},0.05) 100%)`,
              padding: 14,
              display: "grid",
              gap: 10,
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.14em",
                color: "rgba(255,255,255,0.72)",
                textTransform: "uppercase",
              }}
            >
              Selected path
            </div>

            <div style={{ fontWeight: 900, fontSize: 18 }}>
              {market.name} → {room.name} → {tierProfile.label}
            </div>

            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.88)", lineHeight: 1.5 }}>
              {tierProfile.summary}
            </div>

            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.82)", lineHeight: 1.45 }}>
              <strong>Performance:</strong> {tierProfile.performance}
            </div>

            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.82)", lineHeight: 1.45 }}>
              <strong>Commercial note:</strong> {tierProfile.commercialNote}
            </div>

            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.86)", lineHeight: 1.45 }}>
              <strong>Recommended families:</strong> {room.recommendedFamilies.join(", ")}
            </div>

            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.86)", lineHeight: 1.45 }}>
              <strong>Recommended next tool:</strong> {room.nextTool}
            </div>

            <div style={{ marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="wm-btn wm-btn-primary"
                style={{ height: 40, padding: "0 16px" }}
                onClick={seedTemplateIntoProject}
              >
                Create project from this template
              </button>

              <button
                type="button"
                className="wm-btn"
                style={{ height: 40, padding: "0 16px" }}
                onClick={goToRecommendedTool}
              >
                Continue to recommended tool
              </button>

              <button
                type="button"
                className="wm-btn"
                style={{ height: 40, padding: "0 16px" }}
                onClick={() => nav("/app/projects")}
              >
                Open Projects
              </button>
            </div>
          </div>
        </section>

        <CollapsibleCard
          id="templates_more_detail"
          title="More detail"
          subtitle="Additional context for the selected market, room, and tier."
          defaultCollapsed
        >
          <div style={{ display: "grid", gap: 14 }}>
            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13 }}>{market.name} buyer context</div>
              <div
                style={{
                  marginTop: 5,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.82)",
                  lineHeight: 1.45,
                }}
              >
                {market.buyer}
              </div>
            </div>

            <div
              style={{
                borderRadius: 14,
                border: `1px solid rgba(${market.accentRgb},0.20)`,
                background: `linear-gradient(180deg, rgba(${market.accentRgb},0.10) 0%, rgba(${market.accentRgb},0.04) 100%)`,
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13 }}>{room.name}</div>
              <div
                style={{
                  marginTop: 5,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.84)",
                  lineHeight: 1.45,
                }}
              >
                {room.short}
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  color: "rgba(255,255,255,0.66)",
                  textTransform: "uppercase",
                }}
              >
                Typical use
              </div>

              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {room.useCases.map((item) => (
                  <span
                    key={item}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.04)",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.84)",
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>
                Included system behaviours
              </div>
              <BulletList items={tierProfile.includedSystems} accentRgb={tierAccent.rgb} />
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>
                Why this tier is stronger
              </div>
              <BulletList items={tierProfile.uplift} accentRgb={market.accentRgb} />
            </div>

            <div
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.86)",
                lineHeight: 1.5,
              }}
            >
              <strong>Positioning:</strong> {tierProfile.positioning}
            </div>
          </div>
        </CollapsibleCard>
      </div>
    </div>
  );
}