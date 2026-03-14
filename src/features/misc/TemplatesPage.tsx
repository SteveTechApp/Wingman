import * as React from "react";
import { useNavigate } from "react-router-dom";
import CollapsibleCard from "@/ui2/components/CollapsibleCard";
import { WM_ROUTES } from "@/core/wingman/routeMap";
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
  type TierProfile,
} from "./templateCatalogExpanded";

const TEMPLATE_SEED_KEY = "wm_template_seed";

const TOOL_LABELS: Record<string, string> = {
  "/app/tools/room-wizard": "Room Wizard",
  "/app/tools/proposal": "Proposal Builder",
  "/app/tools/catalog": "Product Catalogue",
  "/app/tools/video-wall": "Video Wall Planner",
};

function SelectCard({
  title,
  text,
  active,
  accentRgb,
  meta,
  onClick,
}: {
  title: string;
  text: string;
  active?: boolean;
  accentRgb: string;
  meta?: string;
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
      {meta ? (
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.66)",
          }}
        >
          {meta}
        </div>
      ) : null}
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

function getToolLabel(path: string): string {
  return TOOL_LABELS[path] ?? path.replace("/app/tools/", "").replace(/-/g, " ");
}

function summarizeTierChange(
  currentTier: TierKey,
  currentProfile: TierProfile,
  targetTier: TierKey,
  targetProfile: TierProfile,
): string[] {
  const currentIndex = TIER_ORDER.indexOf(currentTier);
  const targetIndex = TIER_ORDER.indexOf(targetTier);
  const isDowngrade = targetIndex < currentIndex;
  const added = targetProfile.includedSystems.filter((item) => !currentProfile.includedSystems.includes(item));
  const removed = currentProfile.includedSystems.filter((item) => !targetProfile.includedSystems.includes(item));

  const lines: string[] = [
    isDowngrade
      ? "Lower cost and simpler scope, with fewer advanced capabilities."
      : "Higher capability and flexibility, with broader future headroom.",
  ];

  if (added.length > 0) {
    lines.push(`Adds: ${added.slice(0, 2).join(" • ")}.`);
  }

  if (removed.length > 0) {
    lines.push(`Reduces: ${removed.slice(0, 2).join(" • ")}.`);
  }

  lines.push(`Commercial impact: ${targetProfile.commercialNote}`);
  return lines;
}

function roomAssumptions(room: RoomTemplate): string[] {
  if (room.id.includes("boardroom")) {
    return [
      "Assumes 10-16 participants, dual-display expectation, and both table and in-room PC sources.",
      "Assumes customer-facing presentations matter, so switching confidence and polished source changes are important.",
      "Assumes installed signal paths and managed USB workflow are more important than ad hoc cabling.",
      "Assumes the room should feel premium even if the first phase is value engineered.",
    ];
  }

  if (room.id.includes("sports-bar") || room.id.includes("video-wall")) {
    return [
      "Assumes multiple displays need repeatable synchronised content delivery across the space.",
      "Assumes the operator needs a simple daily workflow rather than a fragile one-off engineering setup.",
      "Assumes visual impact is commercially important, so image routing credibility matters more than cosmetic extras.",
      "Assumes the design may grow into more zones, sources, or layouts over time.",
    ];
  }

  switch (room.useCaseGroup) {
    case "collaboration":
      return [
        "Assumes a fast-start room where users expect laptop-first presentation with minimal training.",
        "Assumes one primary display and a simple shared-content workflow are the baseline requirements.",
        "Assumes users will arrive with mixed devices, so a dependable wired path must always remain available.",
        "Assumes the room should stay easy to support even when trimmed for value.",
      ];
    case "training":
      return [
        "Assumes an instructor-led workflow with one clear presenter path and predictable display behaviour.",
        "Assumes the room needs repeatability for different presenters, not just a one-user custom setup.",
        "Assumes sightlines, source handoff, and straightforward room control are more important than gimmicks.",
        "Assumes the system must remain credible for daily use even when budget pressure is high.",
      ];
    case "signage":
      return [
        "Assumes the display system runs for long periods and must stay operationally simple.",
        "Assumes content reliability, basic control, and serviceable topology matter more than niche features.",
        "Assumes the customer may standardise this pattern across additional spaces or screens.",
        "Assumes the solution should support clean upgrades if the client later wants more zones or layouts.",
      ];
    case "entertainment":
      return [
        "Assumes guest or audience experience is visible, so source switching and display confidence must feel intentional.",
        "Assumes the room may shift between casual playback and higher-impact event moments.",
        "Assumes simple operator workflow is essential because specialist AV staff may not always be present.",
        "Assumes value engineering must preserve the core experience, not just reduce line count.",
      ];
    case "meeting":
    default:
      return [
        "Assumes a professional meeting workflow with reliable presentation and minimal friction for common source types.",
        "Assumes the room must remain intuitive for infrequent users as well as daily hosts.",
        "Assumes the baseline solution needs to be commercially credible before optional enhancements are added.",
        "Assumes future improvements should slot in cleanly without redesigning the whole room.",
      ];
  }
}

function roomCredibility(room: RoomTemplate): string[] {
  switch (room.useCaseGroup) {
    case "collaboration":
      return [
        "Retain one dependable wired presentation path at all times.",
        "Keep source switching obvious enough that a first-time user can succeed quickly.",
        "Preserve display wake, handoff, and basic room control credibility.",
      ];
    case "training":
      return [
        "Preserve a stable instructor source path and a clear front-of-room workflow.",
        "Keep room control and display routing simple enough for repeated presenters.",
        "Ensure any cost reduction still leaves a room that works every day without operator workarounds.",
      ];
    case "signage":
      return [
        "Protect dependable content delivery to every required display or zone.",
        "Keep control topology supportable and straightforward for site teams.",
        "Do not compromise uptime or basic routing integrity for cosmetic savings.",
      ];
    case "entertainment":
      return [
        "Maintain fast content switching and a room feel that still satisfies guests or members.",
        "Protect the visible impact of the space even when simplifying hardware.",
        "Keep the operating workflow usable by non-specialist venue staff.",
      ];
    case "meeting":
    default:
      return [
        "Retain a dependable presentation baseline with clean source handoff.",
        "Keep the room intuitive enough for mixed users and visiting presenters.",
        "Protect the core experience before adding premium enhancements.",
      ];
  }
}

function valueEngineeredMoves(room: RoomTemplate, tier: TierKey): string[] {
  const tierLabel = TIER_ACCENTS[tier].label;
  const shared = [
    "Standardise on the core switching and transport path before adding premium room polish.",
    "Keep one credible control workflow and remove nice-to-have complexity first.",
    `If budget tightens, hold the ${tierLabel} functional baseline and defer expandable extras into phase two.`,
  ];

  switch (room.useCaseGroup) {
    case "collaboration":
      return [
        "Keep single-display collaboration and wired BYOD as the protected baseline.",
        "Defer premium wireless collaboration extras and non-essential UX refinements.",
        ...shared,
      ];
    case "training":
      return [
        "Prioritise the presenter path, display distribution, and simple instructor control first.",
        "Defer secondary zones, advanced room presets, or higher-end expansion until later.",
        ...shared,
      ];
    case "signage":
      return [
        "Protect core display count and dependable content routing before adding advanced control layers.",
        "Use a simpler distribution topology now, while leaving a clean migration path for more zones later.",
        ...shared,
      ];
    case "entertainment":
      return [
        "Preserve the visible guest experience and dependable program switching first.",
        "Trim premium flexibility or non-essential control embellishments before touching the core viewing path.",
        ...shared,
      ];
    case "meeting":
    default:
      return [
        "Protect everyday presentation reliability before enhancing flexibility.",
        "Hold the room to one commercially credible workflow and defer convenience upgrades where needed.",
        ...shared,
      ];
  }
}

function performanceUpgradeMoves(room: RoomTemplate, tier: TierKey): string[] {
  const higherTier =
    tier === "bronze" ? "Silver" : tier === "silver" ? "Gold" : "future expansion";

  switch (room.useCaseGroup) {
    case "collaboration":
      return [
        `Move toward ${higherTier} by improving USB workflow, source flexibility, and user confidence.`,
        "Upgrade to stronger collaboration switching, better device support, and cleaner room behaviour.",
        "Add higher-end room polish only after the presentation baseline is already reliable.",
      ];
    case "training":
      return [
        `Move toward ${higherTier} by improving presenter handoff, room flexibility, and trainer confidence.`,
        "Add better source routing, clearer control, and stronger support for repeat multi-user sessions.",
        "Upgrade in a way that improves teaching consistency, not just product count.",
      ];
    case "signage":
      return [
        `Move toward ${higherTier} by improving routing flexibility, control, and scale-readiness.`,
        "Add stronger zone management, better content agility, and cleaner operator workflow.",
        "Prioritise upgrades that make expansion or standardisation easier across the estate.",
      ];
    case "entertainment":
      return [
        `Move toward ${higherTier} by improving visible quality, routing confidence, and operational polish.`,
        "Add higher-end distribution, more flexible event handling, and stronger customer-facing experience.",
        "Focus premium spend where guests will actually notice the improvement.",
      ];
    case "meeting":
    default:
      return [
        `Move toward ${higherTier} by improving presentation confidence, room flexibility, and premium finish.`,
        "Add better switching options, cleaner source integration, and more polished control behaviour.",
        "Use upgrades to reduce user friction as much as to raise technical headroom.",
      ];
  }
}

export default function TemplatesPage() {
  const nav = useNavigate();
  const FLOW_ACTIVE_RGB = "96,194,132";

  const [query, setQuery] = React.useState("");
  const [useCaseGroup, setUseCaseGroup] = React.useState<"all" | UseCaseGroup>("all");
  const [budgetBias, setBudgetBias] = React.useState<"all" | BudgetBias>("all");
  const [activeStep, setActiveStep] = React.useState<1 | 2 | 3 | 4>(1);
  const step1Ref = React.useRef<HTMLElement | null>(null);
  const step2Ref = React.useRef<HTMLElement | null>(null);
  const step3Ref = React.useRef<HTMLElement | null>(null);
  const step4Ref = React.useRef<HTMLElement | null>(null);

  const [marketId, setMarketId] = React.useState<string>(MARKETS[0].id);
  const [roomId, setRoomId] = React.useState<string>(MARKETS[0].roomTypes[0].id);
  const [tier, setTier] = React.useState<TierKey>(MARKETS[0].roomTypes[0].defaultTier);
  const totalRoomProfiles = React.useMemo(
    () => MARKETS.reduce((sum, market) => sum + market.roomTypes.length, 0),
    [],
  );

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
  const assumptions = React.useMemo(() => roomAssumptions(room), [room]);
  const credibility = React.useMemo(() => roomCredibility(room), [room]);
  const upgradeMoves = React.useMemo(() => performanceUpgradeMoves(room, tier), [room, tier]);
  const alternativeTiers = React.useMemo(
    () =>
      TIER_ORDER
        .filter((item) => item !== tier)
        .map((item) => ({
          tierKey: item,
          accent: TIER_ACCENTS[item],
          profile: room.tiers[item],
          summaryLines: summarizeTierChange(tier, tierProfile, item, room.tiers[item]),
        })),
    [room, tier, tierProfile],
  );

  function workflowSectionStyle(step: 1 | 2 | 3 | 4): React.CSSProperties {
    const isActive = activeStep === step;

    return {
      padding: 16,
      borderRadius: 18,
      border: isActive
        ? `1px solid rgba(${FLOW_ACTIVE_RGB},0.36)`
        : "1px solid rgba(255,255,255,0.10)",
      background: isActive
        ? `linear-gradient(180deg, rgba(${FLOW_ACTIVE_RGB},0.12) 0%, rgba(${FLOW_ACTIVE_RGB},0.05) 100%)`
        : "linear-gradient(180deg, rgba(9,20,33,0.78) 0%, rgba(7,16,28,0.62) 100%)",
      boxShadow: isActive
        ? `0 0 0 1px rgba(${FLOW_ACTIVE_RGB},0.12), 0 14px 30px rgba(${FLOW_ACTIVE_RGB},0.07)`
        : "none",
      opacity: isActive ? 1 : 0.64,
      transition: "border-color 180ms ease, background 180ms ease, box-shadow 180ms ease, opacity 180ms ease",
    };
  }

  function workflowStepLabelStyle(step: 1 | 2 | 3 | 4): React.CSSProperties {
    const isActive = activeStep === step;

    return {
      fontSize: 11,
      letterSpacing: "0.14em",
      color: isActive ? `rgba(${FLOW_ACTIVE_RGB},0.94)` : "rgba(255,255,255,0.72)",
      textTransform: "uppercase",
    };
  }

  React.useEffect(() => {
    if (activeStep === 1 || typeof window === "undefined") return;

    const target =
      activeStep === 2 ? step2Ref.current :
      activeStep === 3 ? step3Ref.current :
      step4Ref.current;

    if (!target) return;

    const rect = target.getBoundingClientRect();
    const topPadding = 92;
    const bottomPadding = 20;
    const fullyVisible = rect.top >= topPadding && rect.bottom <= window.innerHeight - bottomPadding;
    if (fullyVisible) return;

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeStep]);

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
    setActiveStep(2);
  }

  function selectRoom(nextRoomId: string) {
    const nextRoom = visibleRooms.find((r) => r.id === nextRoomId) || visibleRooms[0];
    setRoomId(nextRoom.id);
    setTier(nextRoom.defaultTier);
    setActiveStep(3);
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
      uplift: [...tierProfile.uplift, ...upgradeMoves],
      assumptions,
      recommendedFamilies: room.recommendedFamilies,
      recommendedTool: room.nextTool,
      projectName: market.name + " - " + room.name + " (" + tierProfile.label + ")",
      createdAt: new Date().toISOString(),
    };

    try {
      sessionStorage.setItem(TEMPLATE_SEED_KEY, JSON.stringify(payload, null, 2));
    } catch {}

    nav(WM_ROUTES.newProject);
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
            Cover common room types fast, but keep the design commercially credible. Every template path includes
            Bronze, Silver, and Gold positioning, with room assumptions, value-engineered moves, and performance
            upgrades so we can right-size the answer without losing the function.
          </div>
        </div>

        <CollapsibleCard
          id="templates-quick-filters"
          title="Quick filters"
          subtitle="Optional filters for narrowing templates before selection."
          defaultCollapsed
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by room, market, keyword, family, or use case"
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
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
            {[
              `${MARKETS.length} vertical markets`,
              `${totalRoomProfiles} room scenarios`,
              `${totalRoomProfiles * TIER_ORDER.length} tiered pathways`,
              `${finderMatches.length} current matches`,
            ].map((item) => (
              <div
                key={item}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                  padding: "10px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.88)",
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </CollapsibleCard>

        <section ref={step1Ref} className="wm-card" style={workflowSectionStyle(1)}>
          <div
            style={workflowStepLabelStyle(1)}
          >
            Step 1{activeStep === 1 ? " / Current position" : ""}
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
            Start with the customer environment so the room templates stay grounded in how the space will actually be used.
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
                meta={`${item.roomTypes.length} scenarios`}
                active={item.id === market.id}
                accentRgb={item.accentRgb}
                onClick={() => selectMarket(item.id)}
              />
            ))}
          </div>
        </section>

        <section ref={step2Ref} className="wm-card" style={workflowSectionStyle(2)}>
          <div
            style={workflowStepLabelStyle(2)}
          >
            Step 2{activeStep === 2 ? " / Current position" : ""}
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
            These are practical room patterns rather than abstract labels, so the tier guidance stays anchored to a believable use case.
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
                meta={`${item.useCases.length} typical use patterns`}
                active={item.id === room.id}
                accentRgb={market.accentRgb}
                onClick={() => selectRoom(item.id)}
              />
            ))}
          </div>
        </section>

        <section ref={step3Ref} className="wm-card" style={workflowSectionStyle(3)}>
          <div
            style={workflowStepLabelStyle(3)}
          >
            Step 3{activeStep === 3 ? " / Current position" : ""}
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
            Bronze protects the function, Silver is the default sweet spot, and Gold expands experience, resilience, and commercial polish.
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TIER_ORDER.map((item) => (
              <TierButton
                key={item}
                tier={item}
                active={item === tier}
                onClick={() => {
                  setTier(item);
                  setActiveStep(4);
                }}
              />
            ))}
          </div>
        </section>

        <section ref={step4Ref} className="wm-card" style={workflowSectionStyle(4)}>
          <div style={workflowStepLabelStyle(4)}>Step 4{activeStep === 4 ? " / Current position" : ""}</div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Selected template</div>

          <div
            style={{
              marginTop: 12,
              borderRadius: 16,
              border: `1px solid rgba(${tierAccent.rgb},0.22)`,
              background: `linear-gradient(180deg, rgba(${tierAccent.rgb},0.12) 0%, rgba(${tierAccent.rgb},0.05) 100%)`,
              padding: 14,
              display: "grid",
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "grid", gap: 8, minWidth: "min(100%, 420px)", flex: "1 1 420px" }}>
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
                  {market.name} / {room.name} / {tierProfile.label}
                </div>

                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.92)", lineHeight: 1.5 }}>
                  {tierProfile.summary}
                </div>

                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.84)", lineHeight: 1.5 }}>
                  <strong>Recommended families:</strong> {room.recommendedFamilies.join(", ")}
                </div>

                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.84)", lineHeight: 1.5 }}>
                  <strong>Recommended next tool:</strong> {getToolLabel(room.nextTool)}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  marginLeft: "auto",
                }}
              >
                <button
                  type="button"
                  className="wm-btn wm-btn-primary"
                  style={{ height: 40, padding: "0 16px" }}
                  onClick={seedTemplateIntoProject}
                >
                  Start a project from this template
                </button>

                <button
                  type="button"
                  className="wm-btn"
                  style={{ height: 40, padding: "0 16px" }}
                  onClick={goToRecommendedTool}
                >
                  Continue to {getToolLabel(room.nextTool)}
                </button>
              </div>
            </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: 14,
                }}
              >
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>Path at a glance</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.88)" }}>
                    <strong>Recommended families:</strong> {room.recommendedFamilies.join(", ")}
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.88)" }}>
                    <strong>Next tool:</strong> {getToolLabel(room.nextTool)}
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.88)" }}>
                    <strong>Commercial focus:</strong> {tierProfile.commercialNote}
                  </div>
                </div>

              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                  padding: 12,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 13 }}>Clear summary</div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.88)" }}>
                  <strong>Positioning:</strong> {tierProfile.positioning}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.88)" }}>
                  <strong>Performance:</strong> {tierProfile.performance}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.88)" }}>
                  <strong>Commercial:</strong> {tierProfile.commercialNote}
                </div>
                <div style={{ fontWeight: 800, fontSize: 12, marginTop: 2 }}>What you get in this tier</div>
                <BulletList items={tierProfile.includedSystems.slice(0, 3)} accentRgb={tierAccent.rgb} />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 12,
              }}
            >
              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                  padding: 12,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 13 }}>Core credibility</div>
                <BulletList items={credibility} accentRgb={market.accentRgb} />
              </div>

              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                  padding: 12,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 13 }}>Room assumptions</div>
                <BulletList items={assumptions.slice(0, 3)} accentRgb={tierAccent.rgb} />
              </div>
            </div>

            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                padding: 12,
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 14 }}>Alternative tiers</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.80)", lineHeight: 1.45 }}>
                If you switch tier, this is what changes in plain English.
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 10,
                }}
              >
                {alternativeTiers.map((option) => (
                  <div
                    key={option.tierKey}
                    style={{
                      borderRadius: 12,
                      border: `1px solid rgba(${option.accent.rgb},0.24)`,
                      background: `linear-gradient(180deg, rgba(${option.accent.rgb},0.11) 0%, rgba(${option.accent.rgb},0.04) 100%)`,
                      padding: 12,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 13 }}>
                      {option.accent.label} option
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.90)", lineHeight: 1.45 }}>
                      {option.profile.summary}
                    </div>
                    <BulletList items={option.summaryLines} accentRgb={option.accent.rgb} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <CollapsibleCard
          id="templates_more_detail"
          title="More detail"
          subtitle="Commercial context, typical use, and included system behaviours for the selected path."
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

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 14,
              }}
            >
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
            </div>
          </div>
        </CollapsibleCard>
      </div>
    </div>
  );
}
