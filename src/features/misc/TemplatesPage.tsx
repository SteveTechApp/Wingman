import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type TierKey = "bronze" | "silver" | "gold";

type TierProfile = {
  label: string;
  summary: string;
  positioning: string;
  performance: string;
  commercialNote: string;
  includedSystems: string[];
  uplift: string[];
};

type RoomTemplate = {
  id: string;
  name: string;
  short: string;
  useCases: string[];
  defaultTier: TierKey;
  tiers: Record<TierKey, TierProfile>;
};

type MarketTemplate = {
  id: string;
  name: string;
  summary: string;
  buyer: string;
  accentRgb: string;
  roomTypes: RoomTemplate[];
};

const MARKETS: MarketTemplate[] = [
  {
    id: "corporate",
    name: "Corporate",
    summary: "Meeting spaces, collaboration rooms, boardrooms, and presentation-led workplaces.",
    buyer: "Sales teams usually need a fast route to a functional meeting-room design.",
    accentRgb: "94,234,212",
    roomTypes: [
      {
        id: "corporate-huddle",
        name: "Huddle Room",
        short: "Small collaboration room for quick meetings and content sharing.",
        useCases: ["Small team meetings", "BYOD spaces", "Fast presentation rooms"],
        defaultTier: "bronze",
        tiers: {
          bronze: {
            label: "Bronze",
            summary: "Functional single-display room with basic wired presentation and simple switching.",
            positioning: "Best for cost-conscious huddle rooms where reliability matters more than advanced collaboration.",
            performance: "Delivers a practical wired presentation baseline.",
            commercialNote: "Lowest-cost functional path with limited flexibility.",
            includedSystems: [
              "Single-display presentation path",
              "Basic wired switching",
              "Simple source connection workflow",
              "Entry-level control expectation",
            ],
            uplift: [
              "Keeps the room functional with a dependable minimum system.",
              "Good where the customer only needs a straightforward presentation space.",
            ],
          },
          silver: {
            label: "Silver",
            summary: "Adds improved connectivity, better user workflow, and more flexible switching.",
            positioning: "Best for rooms that need stronger everyday usability and broader source support.",
            performance: "Improves user convenience and connection flexibility.",
            commercialNote: "Better balance of budget and usability for most mainstream meeting spaces.",
            includedSystems: [
              "Single or dual-display support (depending on room fit)",
              "Improved switching flexibility",
              "USB-C friendly presentation workflow",
              "Cleaner user start-up experience",
            ],
            uplift: [
              "Makes the room easier to use for mixed user devices.",
              "Reduces friction in day-to-day meetings.",
            ],
          },
          gold: {
            label: "Gold",
            summary: "Premium collaboration baseline with stronger performance, flexibility, and user experience.",
            positioning: "Best for executive or high-usage rooms where polish and workflow matter.",
            performance: "Highest usability and stronger future-readiness.",
            commercialNote: "Premium room experience with broader long-term value.",
            includedSystems: [
              "Enhanced multi-input presentation workflow",
              "Premium connectivity mix",
              "Better collaboration readiness",
              "Higher-end user experience and room control path",
            ],
            uplift: [
              "Adds performance headroom and a more polished workflow.",
              "Better fit where the room supports frequent or business-critical meetings.",
            ],
          },
        },
      },
      {
        id: "corporate-boardroom",
        name: "Boardroom",
        short: "Premium multi-source room with stronger switching and presentation demands.",
        useCases: ["Leadership meetings", "Client presentations", "Multi-source boardroom use"],
        defaultTier: "silver",
        tiers: {
          bronze: {
            label: "Bronze",
            summary: "Functional boardroom entry point with core switching and presentation capability.",
            positioning: "A workable boardroom baseline for smaller budgets.",
            performance: "Covers core room functionality but with fewer enhancement features.",
            commercialNote: "A practical starting point where budget is constrained.",
            includedSystems: [
              "Core multi-source presentation switching",
              "Basic boardroom display routing",
              "Essential room signal management",
            ],
            uplift: [
              "Keeps the boardroom functional without over-specifying.",
            ],
          },
          silver: {
            label: "Silver",
            summary: "Balanced boardroom design with improved source flexibility and cleaner presentation workflow.",
            positioning: "Recommended default for most standard boardrooms.",
            performance: "Stronger switching behavior and better real-world room usability.",
            commercialNote: "Best-value boardroom tier for most commercial opportunities.",
            includedSystems: [
              "Improved multi-source switching",
              "Refined display routing workflow",
              "More flexible presenter connectivity",
              "Better system handling for everyday use",
            ],
            uplift: [
              "Improves the presentation experience without moving into premium overkill.",
            ],
          },
          gold: {
            label: "Gold",
            summary: "Premium boardroom design with stronger performance, flexibility, and presentation polish.",
            positioning: "For client-facing or executive rooms where system impression matters.",
            performance: "Highest confidence and feature depth for demanding boardroom use.",
            commercialNote: "Premium investment for stronger user confidence and room impact.",
            includedSystems: [
              "Premium switching and presentation path",
              "Higher-end connectivity options",
              "Stronger system flexibility and scalability",
              "Improved executive-user experience",
            ],
            uplift: [
              "Best fit where performance, polish, and flexibility are priority drivers.",
            ],
          },
        },
      },
    ],
  },
  {
    id: "education",
    name: "Education",
    summary: "Teaching spaces, training areas, lecture delivery, and campus presentation environments.",
    buyer: "Education projects usually need robustness, clarity, and repeatable room standards.",
    accentRgb: "125,211,252",
    roomTypes: [
      {
        id: "education-classroom",
        name: "Classroom",
        short: "Daily teaching room with repeatable, practical AV workflow.",
        useCases: ["Daily teaching", "Front-of-room presentation", "Simple hybrid-ready teaching"],
        defaultTier: "bronze",
        tiers: {
          bronze: {
            label: "Bronze",
            summary: "Reliable teaching-room baseline with essential presentation capability.",
            positioning: "Best for standard classrooms where consistency and price matter.",
            performance: "Covers everyday classroom delivery without unnecessary feature overhead.",
            commercialNote: "Strong volume-fit tier for broad classroom rollouts.",
            includedSystems: [
              "Essential teacher presentation path",
              "Simple room display workflow",
              "Repeatable standard room baseline",
            ],
            uplift: [
              "Good for standardisation across multiple similar rooms.",
            ],
          },
          silver: {
            label: "Silver",
            summary: "Adds better input flexibility and improved teaching workflow.",
            positioning: "For classrooms needing broader device support and better lecturer usability.",
            performance: "Improves the daily teaching experience and room flexibility.",
            commercialNote: "Good balance for mainstream teaching upgrades.",
            includedSystems: [
              "Improved input support",
              "Cleaner teaching workflow",
              "Better source flexibility for mixed devices",
            ],
            uplift: [
              "Reduces classroom friction for varied teaching styles.",
            ],
          },
          gold: {
            label: "Gold",
            summary: "Premium teaching-room template with stronger performance and future-ready flexibility.",
            positioning: "For flagship or heavily used learning spaces.",
            performance: "Highest teaching flexibility and stronger long-term value.",
            commercialNote: "Premium tier for high-importance rooms or advanced learning workflows.",
            includedSystems: [
              "High-flexibility room presentation path",
              "Stronger scaling for advanced teaching use",
              "Better support for more complex room behaviors",
            ],
            uplift: [
              "Best fit when the room needs headroom for broader teaching demands.",
            ],
          },
        },
      },
      {
        id: "education-training",
        name: "Training Room",
        short: "Instructor-led room with presentation, switching, and guided collaboration needs.",
        useCases: ["Corporate training", "Hands-on workshops", "Instructor-led presentation"],
        defaultTier: "silver",
        tiers: {
          bronze: {
            label: "Bronze",
            summary: "Functional training room with core delivery capability.",
            positioning: "For smaller training spaces with simple delivery requirements.",
            performance: "Covers the essentials without advanced flexibility.",
            commercialNote: "Entry-level commercial fit for training environments.",
            includedSystems: [
              "Basic trainer presentation path",
              "Simple display distribution",
              "Core room operation baseline",
            ],
            uplift: [
              "Keeps the room usable while staying cost-aware.",
            ],
          },
          silver: {
            label: "Silver",
            summary: "Recommended balanced tier for most instructor-led training spaces.",
            positioning: "The best default for structured training environments.",
            performance: "Adds better flexibility, stronger source handling, and smoother delivery.",
            commercialNote: "Most commercially balanced training-room tier.",
            includedSystems: [
              "Improved presentation switching",
              "Better source support for trainers",
              "Stronger room workflow for daily use",
            ],
            uplift: [
              "Improves trainer confidence and daily reliability.",
            ],
          },
          gold: {
            label: "Gold",
            summary: "High-performance training room for advanced delivery and stronger flexibility.",
            positioning: "For premium training spaces or rooms with broader user expectations.",
            performance: "Highest flexibility and best room confidence.",
            commercialNote: "Premium choice where training quality and experience are strategic.",
            includedSystems: [
              "Premium source and display handling",
              "Higher room flexibility",
              "Better support for advanced training scenarios",
            ],
            uplift: [
              "Adds more headroom for mixed-use and demanding training sessions.",
            ],
          },
        },
      },
    ],
  },
  {
    id: "hospitality",
    name: "Hospitality",
    summary: "Guest-facing spaces, lounges, bars, suites, and event-driven display environments.",
    buyer: "Hospitality designs need to stay intuitive while improving customer-facing experience.",
    accentRgb: "251,191,36",
    roomTypes: [
      {
        id: "hospitality-suite",
        name: "VIP Suite / Lounge",
        short: "Premium guest-facing room with polished presentation or entertainment needs.",
        useCases: ["VIP viewing", "Private hospitality", "Flexible guest entertainment"],
        defaultTier: "silver",
        tiers: {
          bronze: {
            label: "Bronze",
            summary: "Functional guest-space baseline with dependable switching and display support.",
            positioning: "For smaller hospitality spaces where reliability matters first.",
            performance: "Covers core functionality without premium feature depth.",
            commercialNote: "Good base tier for entry-level premium spaces.",
            includedSystems: [
              "Core guest display workflow",
              "Basic switching path",
              "Simple dependable room operation",
            ],
            uplift: [
              "Keeps the space functional at a sensible cost point.",
            ],
          },
          silver: {
            label: "Silver",
            summary: "Recommended hospitality tier with better flexibility and improved guest experience.",
            positioning: "Best for mainstream suites and hospitality lounges.",
            performance: "Improves usability and user experience without over-engineering.",
            commercialNote: "Best-value hospitality balance for most opportunities.",
            includedSystems: [
              "Improved display routing flexibility",
              "Better source handling",
              "Smoother guest or operator workflow",
            ],
            uplift: [
              "Improves guest-facing performance and operational ease.",
            ],
          },
          gold: {
            label: "Gold",
            summary: "Premium hospitality design with stronger flexibility, polish, and performance.",
            positioning: "For high-end guest environments where experience is a selling point.",
            performance: "Best overall guest experience and room flexibility.",
            commercialNote: "Premium tier for flagship hospitality spaces.",
            includedSystems: [
              "Higher-end switching and routing path",
              "Premium flexibility and control expectations",
              "Stronger guest-facing room performance",
            ],
            uplift: [
              "Best fit when experience quality is commercially important.",
            ],
          },
        },
      },
      {
        id: "hospitality-bar",
        name: "Sports Bar / Multi-Screen Zone",
        short: "Multi-display space requiring reliable routing and strong content distribution.",
        useCases: ["Sports viewing", "Live feed distribution", "Multi-display guest engagement"],
        defaultTier: "bronze",
        tiers: {
          bronze: {
            label: "Bronze",
            summary: "Functional multi-screen baseline for straightforward content routing.",
            positioning: "For smaller bar and lounge spaces with simple distribution needs.",
            performance: "Covers essential routing without advanced flexibility.",
            commercialNote: "Good cost-aware starting point.",
            includedSystems: [
              "Basic multi-screen routing",
              "Straightforward content distribution",
              "Entry-level control expectation",
            ],
            uplift: [
              "A dependable minimum viable design for guest-facing screens.",
            ],
          },
          silver: {
            label: "Silver",
            summary: "Adds better routing flexibility and stronger operational control.",
            positioning: "Recommended for most multi-screen hospitality applications.",
            performance: "Improves operational confidence and content flexibility.",
            commercialNote: "Best-value tier for mainstream hospitality screen systems.",
            includedSystems: [
              "Improved multi-screen switching",
              "Greater distribution flexibility",
              "More resilient operational workflow",
            ],
            uplift: [
              "Better fit where different displays need different content behaviors.",
            ],
          },
          gold: {
            label: "Gold",
            summary: "Premium multi-screen distribution with stronger flexibility and higher performance.",
            positioning: "For complex or premium hospitality display environments.",
            performance: "Highest operational flexibility and guest-impact potential.",
            commercialNote: "Premium investment where multi-screen performance is customer-visible.",
            includedSystems: [
              "Advanced routing flexibility",
              "Higher-end multi-screen control path",
              "Greater system headroom and flexibility",
            ],
            uplift: [
              "Best fit for larger, more demanding guest display systems.",
            ],
          },
        },
      },
    ],
  },
  {
    id: "retail",
    name: "Retail",
    summary: "Showroom, signage, demo, and customer-engagement spaces.",
    buyer: "Retail designs need clear visual impact, repeatability, and simple operational workflow.",
    accentRgb: "244,114,182",
    roomTypes: [
      {
        id: "retail-showroom",
        name: "Showroom Display Zone",
        short: "Customer-facing display environment built around product or content presentation.",
        useCases: ["Brand storytelling", "Product showcase", "Display-led engagement"],
        defaultTier: "bronze",
        tiers: {
          bronze: {
            label: "Bronze",
            summary: "Functional showroom baseline with dependable display delivery.",
            positioning: "For simple retail presentation spaces with straightforward needs.",
            performance: "Covers basic retail display needs with a reliable minimum system.",
            commercialNote: "Strong entry tier for price-sensitive retail opportunities.",
            includedSystems: [
              "Basic retail display path",
              "Simple content delivery workflow",
              "Dependable entry-level operation",
            ],
            uplift: [
              "Good minimum viable solution for simple display-led zones.",
            ],
          },
          silver: {
            label: "Silver",
            summary: "Adds more flexibility and stronger day-to-day retail usability.",
            positioning: "Recommended for most showroom and brand-led spaces.",
            performance: "Improves content handling and operational ease.",
            commercialNote: "Most commercially balanced showroom tier.",
            includedSystems: [
              "Improved display flexibility",
              "Better content handling",
              "Cleaner operator workflow",
            ],
            uplift: [
              "Better fit for more active or frequently updated display spaces.",
            ],
          },
          gold: {
            label: "Gold",
            summary: "Premium showroom system with stronger flexibility, impact, and long-term capability.",
            positioning: "For flagship retail spaces or higher-impact branded environments.",
            performance: "Highest visual and operational confidence.",
            commercialNote: "Premium choice for retail spaces where experience drives value.",
            includedSystems: [
              "Higher-end display workflow",
              "Advanced content flexibility",
              "Premium retail presentation baseline",
            ],
            uplift: [
              "Best fit where the display environment is central to the brand experience.",
            ],
          },
        },
      },
      {
        id: "retail-consultation",
        name: "Demo / Consultation Zone",
        short: "Smaller customer interaction space with focused product presentation needs.",
        useCases: ["Product demos", "Assisted selling", "Small-format consultation"],
        defaultTier: "silver",
        tiers: {
          bronze: {
            label: "Bronze",
            summary: "Simple assisted-selling setup with functional presentation capability.",
            positioning: "For smaller demo spaces where the requirement is straightforward.",
            performance: "Provides essential functionality without extra feature depth.",
            commercialNote: "A practical budget-conscious consultation baseline.",
            includedSystems: [
              "Basic demo display workflow",
              "Simple source presentation path",
              "Entry-level customer interaction support",
            ],
            uplift: [
              "Keeps the space functional and easy to deploy.",
            ],
          },
          silver: {
            label: "Silver",
            summary: "Recommended tier for stronger demo flexibility and cleaner customer-facing workflow.",
            positioning: "Best default for most consultation spaces.",
            performance: "Improves product demo quality and day-to-day usability.",
            commercialNote: "Best-value consultation tier.",
            includedSystems: [
              "Improved source flexibility",
              "Stronger display workflow",
              "Better user handling for assisted selling",
            ],
            uplift: [
              "Improves the consistency and polish of customer-facing demos.",
            ],
          },
          gold: {
            label: "Gold",
            summary: "Premium consultation zone with stronger performance and more polished engagement.",
            positioning: "For premium assisted-selling environments where experience matters.",
            performance: "Highest confidence and best customer-facing polish.",
            commercialNote: "Premium tier for higher-value retail interaction spaces.",
            includedSystems: [
              "Higher-end consultation presentation workflow",
              "Premium connectivity mix",
              "Best customer-facing operational experience",
            ],
            uplift: [
              "Best fit where the consultation experience directly supports conversion.",
            ],
          },
        },
      },
    ],
  },
];

const TIER_ORDER: TierKey[] = ["bronze", "silver", "gold"];

const TIER_ACCENTS: Record<TierKey, { rgb: string; label: string }> = {
  bronze: { rgb: "217,119,6", label: "Bronze" },
  silver: { rgb: "148,163,184", label: "Silver" },
  gold: { rgb: "251,191,36", label: "Gold" },
};

function SectionCard({
  title,
  subtitle,
  step,
  children,
}: {
  title: string;
  subtitle?: string;
  step?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="wm-card" style={{ padding: 16, borderRadius: 18 }}>
      <div>
        {step ? (
          <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "rgba(255,255,255,0.72)", textTransform: "uppercase" }}>
            {step}
          </div>
        ) : null}
        <div style={{ marginTop: step ? 6 : 0, fontWeight: 900, fontSize: 18 }}>{title}</div>
        {subtitle ? (
          <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.45 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      <div style={{ marginTop: 14 }}>
        {children}
      </div>
    </section>
  );
}

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
      <div style={{ marginTop: 5, fontSize: 12, color: "rgba(255,255,255,0.84)", lineHeight: 1.4 }}>{text}</div>
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

  const [marketId, setMarketId] = useState<string>(MARKETS[0].id);
  const [roomId, setRoomId] = useState<string>(MARKETS[0].roomTypes[0].id);
  const [tier, setTier] = useState<TierKey>(MARKETS[0].roomTypes[0].defaultTier);

  const market = useMemo(
    () => MARKETS.find((m) => m.id === marketId) || MARKETS[0],
    [marketId],
  );

  const room = useMemo(
    () => market.roomTypes.find((r) => r.id === roomId) || market.roomTypes[0],
    [market, roomId],
  );

  const tierProfile = room.tiers[tier];
  const tierAccent = TIER_ACCENTS[tier];

  function selectMarket(nextMarketId: string) {
    const nextMarket = MARKETS.find((m) => m.id === nextMarketId) || MARKETS[0];
    const nextRoom = nextMarket.roomTypes[0];
    setMarketId(nextMarket.id);
    setRoomId(nextRoom.id);
    setTier(nextRoom.defaultTier);
  }

  function selectRoom(nextRoomId: string) {
    const nextRoom = market.roomTypes.find((r) => r.id === nextRoomId) || market.roomTypes[0];
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
      createdAt: new Date().toISOString(),
    };

    try {
      sessionStorage.setItem("wm_template_seed", JSON.stringify(payload));
    } catch {}

    nav("/app/projects");
  }

  return (
    <div className="wm-page wm-animate-in" style={{ width: "100%", maxWidth: "none", margin: 0, minWidth: 0 }}>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="wm-page-eyebrow">WORKFLOW TEMPLATES</div>
          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>Template Workbench</h1>
          <div style={{ maxWidth: 980, fontSize: 14, color: "rgba(255,255,255,0.88)", lineHeight: 1.5 }}>
            Start with the vertical market, choose a typical room type for that application, then select Bronze, Silver, or Gold to control how capable the design becomes while remaining commercially functional.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 14,
            alignItems: "start",
          }}
        >
          <SectionCard
            step="1. Vertical market"
            title="Choose the application"
            subtitle="Pick the customer vertical first so the room choices stay relevant."
          >
            <div style={{ display: "grid", gap: 10 }}>
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

            <div
              style={{
                marginTop: 14,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13 }}>{market.name} focus</div>
              <div style={{ marginTop: 5, fontSize: 12, color: "rgba(255,255,255,0.82)", lineHeight: 1.45 }}>
                {market.buyer}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            step="2. Room type"
            title="Choose a typical room"
            subtitle="These options are filtered to suit the selected vertical market."
          >
            <div style={{ display: "grid", gap: 10 }}>
              {market.roomTypes.map((item) => (
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

            <div
              style={{
                marginTop: 14,
                borderRadius: 14,
                border: `1px solid rgba(${market.accentRgb},0.20)`,
                background: `linear-gradient(180deg, rgba(${market.accentRgb},0.10) 0%, rgba(${market.accentRgb},0.04) 100%)`,
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13 }}>{room.name}</div>
              <div style={{ marginTop: 5, fontSize: 12, color: "rgba(255,255,255,0.84)", lineHeight: 1.45 }}>
                {room.short}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, letterSpacing: "0.12em", color: "rgba(255,255,255,0.66)", textTransform: "uppercase" }}>
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
          </SectionCard>

          <SectionCard
            step="3. Capability tier"
            title="Choose Bronze, Silver, or Gold"
            subtitle="Every tier remains functional, but each step up improves capability, performance, or user experience."
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {TIER_ORDER.map((item) => (
                <TierButton
                  key={item}
                  tier={item}
                  active={item === tier}
                  onClick={() => setTier(item)}
                />
              ))}
            </div>

            <div
              style={{
                marginTop: 14,
                borderRadius: 16,
                border: `1px solid rgba(${tierAccent.rgb},0.22)`,
                background: `linear-gradient(180deg, rgba(${tierAccent.rgb},0.12) 0%, rgba(${tierAccent.rgb},0.05) 100%)`,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "rgba(255,255,255,0.72)", textTransform: "uppercase" }}>
                {tierProfile.label} profile
              </div>
              <div style={{ marginTop: 6, fontWeight: 900, fontSize: 18 }}>{tierProfile.summary}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.88)", lineHeight: 1.5 }}>
                {tierProfile.positioning}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.82)", lineHeight: 1.45 }}>
                <strong>Performance:</strong> {tierProfile.performance}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.82)", lineHeight: 1.45 }}>
                <strong>Commercial note:</strong> {tierProfile.commercialNote}
              </div>
            </div>
          </SectionCard>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.15fr) minmax(360px, 0.85fr)",
            gap: 14,
            alignItems: "start",
          }}
        >
          <SectionCard
            title="What changes at this tier"
            subtitle="This is the functional uplift the chosen tier introduces."
          >
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>Included system behaviors</div>
                <BulletList items={tierProfile.includedSystems} accentRgb={tierAccent.rgb} />
              </div>

              <div>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>Why this tier is stronger</div>
                <BulletList items={tierProfile.uplift} accentRgb={market.accentRgb} />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Seed this into Projects"
            subtitle="This saves the chosen market, room type, and tier into the live project draft."
          >
            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                padding: 14,
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "rgba(255,255,255,0.68)", textTransform: "uppercase" }}>
                Selected path
              </div>
              <div style={{ marginTop: 8, fontWeight: 900, fontSize: 18 }}>
                {market.name} → {room.name} → {tierProfile.label}
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.84)", lineHeight: 1.45 }}>
                The project seed will include the chosen vertical, the typical room type, the selected tier, and the commercial/design intent for the chosen level.
              </div>

              <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
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
                  onClick={() => nav("/app/projects")}
                >
                  Open Projects
                </button>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}