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
  type MarketTemplate,
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
  eyebrow,
  title,
  text,
  detail,
  active,
  accentRgb,
  meta,
  onClick,
}: {
  eyebrow?: string;
  title: string;
  text: string;
  detail?: string;
  active?: boolean;
  accentRgb: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`wm-choice-card wm-hover-lift${active ? " is-active" : ""}`}
      style={{ "--wm-choice-accent-rgb": accentRgb } as React.CSSProperties}
    >
      {eyebrow ? (
        <div className="wm-choice-card__eyebrow">{eyebrow}</div>
      ) : null}
      <div className="wm-choice-card__title">{title}</div>
      <div className="wm-choice-card__body">{text}</div>
      {detail ? (
        <div className="wm-choice-card__detail">{detail}</div>
      ) : null}
      {meta ? (
        <div className="wm-choice-card__meta">{meta}</div>
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
      className={`wm-tier-button wm-hover-lift${active ? " is-active" : ""}`}
      style={{ "--wm-choice-accent-rgb": accent.rgb } as React.CSSProperties}
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
    <div className="wm-bullet-list" style={{ "--wm-choice-accent-rgb": accentRgb } as React.CSSProperties}>
      {items.map((item, i) => (
        <div key={i} className="wm-bullet-list__item">
          <div className="wm-bullet-list__dot" />
          <div className="wm-bullet-list__copy">
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

function getPunchyStory(story: string): string {
  const trimmed = story.trim().replace(/\.$/, "");
  const parts = trimmed.split(/\s+(where|that|built|with)\s+/i);
  return parts[0] || trimmed;
}

function getRoomCardMeta(room: RoomTemplate): string {
  const families = room.recommendedFamilies.slice(0, 2).join(" + ");
  return families ? `Built on ${families}` : "Template ready";
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
    lines.push(`Adds: ${added.slice(0, 2).join(", ")}.`);
  }

  if (removed.length > 0) {
    lines.push(`Reduces: ${removed.slice(0, 2).join(", ")}.`);
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

type ScenarioDetail = {
  headline: string;
  story: string;
  designPurpose: string;
  customerScenario: string;
  sourceOutput: string;
  tierFit: string;
  baseline: string[];
  operationalPriorities: string[];
  roomAssumptions: string[];
  tierChoice: string;
};

function getIoProfile(room: RoomTemplate, tier: TierKey): {
  sources: string;
  outputs: string;
  operators: string;
} {
  if (room.id.includes("huddle")) {
    return {
      sources: tier === "bronze"
        ? "2 routine sources: a bring-your-own laptop and one in-room UC or PC source"
        : "3 routine sources: a bring-your-own laptop, an in-room UC or PC source, and an overflow wireless presentation path",
      outputs: "1 main front-of-room display",
      operators: "a general office user who needs auto-switching and obvious input selection",
    };
  }

  if (room.id.includes("boardroom") || room.id.includes("operations") || room.id.includes("mdt") || room.id.includes("chamber")) {
    return {
      sources: tier === "gold"
        ? "4 live sources: table laptop, in-room PC, UC appliance, and guest HDMI ingest"
        : "3 live sources: table laptop, in-room PC, and UC appliance",
      outputs: "2 front-of-room displays with shared presentation confidence",
      operators: "an executive host or coordinator who cannot afford awkward source changes in front of clients or stakeholders",
    };
  }

  if (room.id.includes("classroom") || room.id.includes("training") || room.id.includes("seminar")) {
    return {
      sources: tier === "bronze"
        ? "2 presenter sources: lecturer PC and guest laptop input"
        : "3 presenter sources: lecturer PC, guest laptop input, and visualiser or wireless share path",
      outputs: room.id.includes("seminar")
        ? "1 main display with optional confidence monitor behaviour"
        : "1 main teaching display plus 1 confidence or overflow output",
      operators: "different presenters across the week, not one power user who knows a custom workflow",
    };
  }

  if (room.id.includes("lecture") || room.id.includes("townhall") || room.id.includes("ballroom") || room.id.includes("event")) {
    return {
      sources: tier === "gold"
        ? "5 active sources: lectern PC, guest laptop, wireless share, VC feed, and event playback source"
        : "4 active sources: lectern PC, guest laptop, wireless share, and event playback source",
      outputs: room.id.includes("ballroom")
        ? "3-4 destination outputs across main displays, confidence display, and divisible-room feeds"
        : "2-3 destination outputs across main displays and confidence or relay screens",
      operators: "venue or corporate staff who need preset-based operation during live sessions",
    };
  }

  if (room.id.includes("sports-bar")) {
    return {
      sources: tier === "bronze"
        ? "3 routine sources: local signage player and two live TV or sports feeds"
        : "4 routine sources: local signage player, two live TV feeds, and one event or promo source",
      outputs: "4-8 display outputs across the viewing zone",
      operators: "bar staff who need quick daily source changes without engineering support",
    };
  }

  if (room.id.includes("showroom") || room.id.includes("window") || room.id.includes("reception") || room.id.includes("waiting")) {
    return {
      sources: tier === "bronze"
        ? "1-2 content sources: a signage player and optional local promo or laptop input"
        : "2-3 content sources: signage player, local promo input, and a service laptop or event source",
      outputs: room.id.includes("window")
        ? "1-2 customer-facing displays"
        : "2-4 customer-facing displays or signage endpoints",
      operators: "front-of-house staff who need the system to feel fixed, simple, and repeatable",
    };
  }

  if (room.id.includes("studio") || room.id.includes("gym")) {
    return {
      sources: tier === "bronze"
        ? "2 daily sources: an instructor laptop and a local media or signage player"
        : "3 daily sources: an instructor laptop, local media player, and one guest or event input",
      outputs: "2 display destinations plus an audio-led teaching zone",
      operators: "fitness or venue staff who need one dependable daily playback routine",
    };
  }

  if (room.id.includes("suite") || room.id.includes("lounge") || room.id.includes("cinema") || room.id.includes("consultation")) {
    return {
      sources: tier === "gold"
        ? "4 active sources: local playback, guest laptop input, UC or streaming device, and one premium media source"
        : "2-3 active sources: local playback, guest laptop input, and one room PC or media source",
      outputs: room.id.includes("cinema")
        ? "1 main cinematic display plus local audio system"
        : "1-2 displays with a premium local presentation or entertainment path",
      operators: "guest-facing staff who need the room to feel polished even when operated casually",
    };
  }

  if (room.id.includes("multiroom")) {
    return {
      sources: "3 shared sources: local playback, streaming endpoint, and one guest presentation input",
      outputs: "3-6 zone outputs across adjoining rooms or media zones",
      operators: "a homeowner or installer who wants simple distribution without rethinking the platform later",
    };
  }

  return {
    sources: tier === "bronze"
      ? "2 routine sources: one local room source and one guest presentation source"
      : "3 routine sources: one local room source, one guest presentation source, and one overflow or wireless path",
    outputs: room.useCaseGroup === "signage" ? "2-4 display outputs" : "1-2 display outputs",
    operators: "day-to-day staff who need a dependable operating pattern rather than a bespoke AV workflow",
  };
}

function buildScenarioDetail(
  market: MarketTemplate,
  room: RoomTemplate,
  tier: TierKey,
  tierProfile: TierProfile,
): ScenarioDetail {
  const io = getIoProfile(room, tier);
  const tierLabel = TIER_ACCENTS[tier].label;

  return {
    headline: `${tierLabel} starting point for a ${market.name.toLowerCase()} ${room.name.toLowerCase()}.`,
    story: room.story,
    designPurpose: room.designPurpose,
    customerScenario:
      `Built for ${room.useCases[0].toLowerCase()} in a ${market.name.toLowerCase()} setting, with a layout that feels right on day one and stays easy to use every day.`,
    sourceOutput:
      `${io.sources}. ${io.outputs}. Operated by ${io.operators}.`,
    tierFit:
      tier === "bronze"
        ? "Bronze keeps the room simple and dependable."
        : tier === "silver"
          ? "Silver adds a smoother day-to-day experience without overcomplicating the room."
          : "Gold is for rooms where polish, flexibility, and visibility matter as much as core function.",
    baseline: [
      `Use case: ${room.useCases.slice(0, 2).join(" and ")}.`,
      `Design goal: ${room.designPurpose}`,
      `System size: ${io.sources}, with ${io.outputs}.`,
      `Core families: ${room.recommendedFamilies.join(" and ")}.`,
    ],
    operationalPriorities: [
      `Keep source selection clear for ${io.operators}.`,
      `Make ${room.useCases[0].toLowerCase()} reliable every day.`,
      `Protect the room outcome before adding extras.`,
    ],
    roomAssumptions: [
      `Sources: ${io.sources}.`,
      `Outputs: ${io.outputs}.`,
      "People should be able to start and switch content quickly.",
    ],
    tierChoice:
      `Stay on ${tierLabel} unless the source count, output count, room visibility, or operator needs change.`,
  };
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
            room.story,
            room.designPurpose,
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
  const scenarioDetail = React.useMemo(
    () => buildScenarioDetail(market, room, tier, tierProfile),
    [market, room, tier, tierProfile],
  );
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

  function flowSectionClassName(step: 1 | 2 | 3 | 4) {
    return `wm-card wm-flow-section${activeStep === step ? " is-active" : ""}`;
  }

  function flowEyebrowClassName(step: 1 | 2 | 3 | 4) {
    return `wm-flow-section__eyebrow${activeStep === step ? " is-active" : ""}`;
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
        story: room.story,
        designPurpose: room.designPurpose,
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
      assumptions: scenarioDetail.roomAssumptions,
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
      className="wm-page wm-animate-in wm-templates-page"
      style={{ width: "100%", maxWidth: 1600, margin: "0 auto", minWidth: 0, zoom: 1 }}
    >
      <div style={{ display: "grid", gap: 18 }}>
        <section className="wm-hero">
          <div className="wm-page-eyebrow">WORKFLOW TEMPLATES</div>
          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>
            Template Workbench
          </h1>
          <div className="wm-page-lead">
            Pick the market, pick the room, then choose the tier. Each template now explains the room story,
            the design goal, and the product families that best fit the application.
          </div>
        </section>

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
              gap: 14,
            }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by room, market, keyword, family, or use case"
              className="wm-form-input"
            />

            <select
              value={useCaseGroup}
              onChange={(e) => setUseCaseGroup(e.target.value as "all" | UseCaseGroup)}
              className="wm-form-input"
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
              className="wm-form-input"
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
              gap: 12,
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
                className="wm-work-card"
                style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}
              >
                {item}
              </div>
            ))}
          </div>
        </CollapsibleCard>

        <section
          ref={step1Ref}
          className={flowSectionClassName(1)}
          style={{ "--wm-flow-accent-rgb": FLOW_ACTIVE_RGB } as React.CSSProperties}
        >
          <div className={flowEyebrowClassName(1)}>
            Step 1{activeStep === 1 ? " / Current position" : ""}
          </div>
          <div style={{ marginTop: 6, fontWeight: 900, fontSize: 20 }}>
            Choose the market
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 14,
              color: "rgba(255,255,255,0.82)",
              lineHeight: 1.55,
            }}
          >
            Start with the market so the room options match the kind of customer and application you are designing for.
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            {MARKETS.map((item) => (
              <SelectCard
                key={item.id}
                eyebrow={`${item.roomTypes.length} room types`}
                title={item.name}
                text={item.summary}
                detail={item.buyer}
                meta="Choose market"
                active={item.id === market.id}
                accentRgb={item.accentRgb}
                onClick={() => selectMarket(item.id)}
              />
            ))}
          </div>
        </section>

        <section
          ref={step2Ref}
          className={flowSectionClassName(2)}
          style={{ "--wm-flow-accent-rgb": FLOW_ACTIVE_RGB } as React.CSSProperties}
        >
          <div className={flowEyebrowClassName(2)}>
            Step 2{activeStep === 2 ? " / Current position" : ""}
          </div>
          <div style={{ marginTop: 6, fontWeight: 900, fontSize: 20 }}>
            Choose the room
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 14,
              color: "rgba(255,255,255,0.82)",
              lineHeight: 1.55,
            }}
          >
            These are ready-made room patterns. Each one tells you what the room is for and why the design fits that market.
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {visibleRooms.map((item) => (
              <SelectCard
                key={item.id}
                eyebrow={item.useCases[0]}
                title={item.name}
                text={getPunchyStory(item.story)}
                detail={getRoomCardMeta(item)}
                meta={`${TIER_ACCENTS[item.defaultTier].label} start`}
                active={item.id === room.id}
                accentRgb={market.accentRgb}
                onClick={() => selectRoom(item.id)}
              />
            ))}
          </div>
        </section>

        <section
          ref={step4Ref}
          className={flowSectionClassName(4)}
          style={{ "--wm-flow-accent-rgb": FLOW_ACTIVE_RGB } as React.CSSProperties}
        >
          <div className={flowEyebrowClassName(4)}>Step 4{activeStep === 4 ? " / Current position" : ""}</div>
          <div style={{ fontWeight: 900, fontSize: 20 }}>Review the template</div>

          <div
            style={{
              marginTop: 12,
              borderRadius: 16,
              border: `1px solid rgba(${tierAccent.rgb},0.22)`,
              background: `linear-gradient(180deg, rgba(${tierAccent.rgb},0.12) 0%, rgba(${tierAccent.rgb},0.05) 100%)`,
              padding: 16,
              display: "grid",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "flex-start",
                alignItems: "flex-start",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "grid", gap: 8, minWidth: "min(100%, 420px)", flex: "1 1 420px" }}>
                <div
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.12em",
                    color: "rgba(255,255,255,0.72)",
                    textTransform: "uppercase",
                  }}
                  >
                  Template selected
                </div>

                <div style={{ fontWeight: 900, fontSize: 20 }}>
                  {market.name} / {room.name} / {tierProfile.label}
                </div>

                <div style={{ fontSize: 15, color: "rgba(255,255,255,0.92)", lineHeight: 1.6 }}>
                  {scenarioDetail.headline}
                </div>

                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.88)", lineHeight: 1.6 }}>
                  <strong>Story:</strong> {scenarioDetail.story}
                </div>

                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.84)", lineHeight: 1.55 }}>
                  <strong>Built for:</strong> {scenarioDetail.designPurpose}
                </div>

                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.84)", lineHeight: 1.55 }}>
                  <strong>Recommended families:</strong> {room.recommendedFamilies.join(", ")}
                </div>

                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.84)", lineHeight: 1.55 }}>
                  <strong>Recommended next tool:</strong> {getToolLabel(room.nextTool)}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  justifyContent: "flex-start",
                  alignItems: "center",
                  
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


              </div>
            </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr)",
                  gap: 14,
                }}
              >


              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                  padding: 14,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 14 }}>Best fit</div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.88)" }}>
                  <strong>Use:</strong> {scenarioDetail.customerScenario}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.88)" }}>
                  <strong>Scope:</strong> {scenarioDetail.sourceOutput}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.88)" }}>
                  <strong>Tier fit:</strong> {scenarioDetail.tierFit}
                </div>
                <div style={{ fontWeight: 800, fontSize: 13, marginTop: 2 }}>Key points</div>
                <BulletList items={scenarioDetail.baseline} accentRgb={tierAccent.rgb} />
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
                  padding: 14,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 14 }}>Keep these true</div>
                <BulletList items={scenarioDetail.operationalPriorities} accentRgb={market.accentRgb} />
              </div>

              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                  padding: 14,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 14 }}>Room setup</div>
                <BulletList items={scenarioDetail.roomAssumptions} accentRgb={tierAccent.rgb} />
              </div>
              <div
                style={{
                  borderRadius: 14,
                  border: `1px solid rgba(${tierAccent.rgb},0.20)`,
                  background: `linear-gradient(180deg, rgba(${tierAccent.rgb},0.10) 0%, rgba(${tierAccent.rgb},0.04) 100%)`,
                  padding: 14,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 14 }}>Solution tier</div>
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.82)",
                    lineHeight: 1.55,
                  }}
                >
                  Match the tier to the real source count, output count, and how demanding the room will be to operate.
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.78)",
                    lineHeight: 1.55,
                  }}
                >
                  {scenarioDetail.tierChoice}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
              </div>
            </div>

            <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                  padding: 14,
                  display: "grid",
                  gap: 12,
                }}
              >
              <div style={{ fontWeight: 900, fontSize: 15 }}>Alternative tiers</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.80)", lineHeight: 1.55 }}>
                If you move tier, this is what changes.
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: 12,
                }}
              >
                {alternativeTiers.map((option) => (
                  <div
                    key={option.tierKey}
                    style={{
                      borderRadius: 12,
                      border: `1px solid rgba(${option.accent.rgb},0.24)`,
                      background: `linear-gradient(180deg, rgba(${option.accent.rgb},0.11) 0%, rgba(${option.accent.rgb},0.04) 100%)`,
                      padding: 14,
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 14 }}>
                      {option.accent.label} option
                    </div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.90)", lineHeight: 1.55 }}>
                      {option.profile.summary}
                    </div>
                    <BulletList items={option.summaryLines} accentRgb={option.accent.rgb} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
