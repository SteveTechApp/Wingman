import * as React from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MonitorPlay,
  Network,
  RefreshCcw,
  Route,
  Rows3,
  ScanSearch,
  Sparkles,
  SplitSquareVertical,
  Wand2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import "./sales-positioning-page.css";

type OutcomeKey =
  | "split"
  | "extend"
  | "switch"
  | "matrix"
  | "avoip";

type PromptCard = {
  id: string;
  question: string;
  whyItMatters: string;
  whatGoodLooksLike: string;
  upsellPrompt?: string;
  technologyChecks: string[];
};

type OutcomeGuide = {
  key: OutcomeKey;
  title: string;
  subtitle: string;
  description: string;
  icon: "split" | "extend" | "switch" | "matrix" | "avoip";
  productDirection: string[];
  upgradeSignals: string[];
  cards: PromptCard[];
};

const OUTCOMES: OutcomeGuide[] = [
  {
    key: "split",
    title: "Split / duplicate a signal",
    subtitle: "One source to several displays",
    description:
      "Use this when the customer is duplicating one signal to multiple screens and does not need independent source selection per display.",
    icon: "split",
    productDirection: [
      "Start with HDMI splitter logic before discussing matrix systems.",
      "Check whether the job is truly one-to-many duplication or if future source selection is likely.",
      "If cable distance becomes the issue, move from local splitter thinking into extender or HDBaseT logic.",
    ],
    upgradeSignals: [
      "Long cable distances",
      "Need for display control",
      "Audio breakout or de-embedding",
      "Future request to add source selection",
      "Higher refresh / resolution requirement",
    ],
    cards: [
      {
        id: "split-1",
        question: "How many displays need to show the same source at the same time?",
        whyItMatters:
          "This confirms whether the requirement is a true splitter application and sizes the output count correctly.",
        whatGoodLooksLike:
          "Get a firm display count and confirm they are all showing the same content simultaneously.",
        technologyChecks: [
          "Output count",
          "HDMI version / bandwidth",
          "4K60 support",
          "HDR need",
        ],
      },
      {
        id: "split-2",
        question: "Are the displays close to the source, or do we have long cable runs?",
        whyItMatters:
          "A local splitter and a distributed splitter-plus-extension design are different conversations.",
        whatGoodLooksLike:
          "Get the approximate source-to-display distance for the furthest screen.",
        upsellPrompt:
          "If the distance is high, position extender or HDBaseT support instead of relying on long passive HDMI.",
        technologyChecks: [
          "Distance",
          "HDBaseT suitability",
          "Signal stability",
          "Power at receiver end",
        ],
      },
      {
        id: "split-3",
        question: "Do you need audio extraction, display control, or any integration features?",
        whyItMatters:
          "Simple duplication may still need professional features that narrow the product choice fast.",
        whatGoodLooksLike:
          "Confirm whether audio de-embed, RS232, IR, or Ethernet pass-through matter on this job.",
        technologyChecks: [
          "Audio de-embed",
          "RS232",
          "IR",
          "Ethernet pass-through",
        ],
      },
    ],
  },
  {
    key: "extend",
    title: "Extend a signal",
    subtitle: "Point-to-point transport",
    description:
      "Use this when the customer needs one source to one display over distance, with or without USB and control.",
    icon: "extend",
    productDirection: [
      "Start with point-to-point extension before jumping into switching or AVoIP.",
      "Distance and USB behaviour usually narrow the choice quickly.",
      "If multiple rooms or multiple displays appear, the conversation may need to move beyond extender logic.",
    ],
    upgradeSignals: [
      "USB camera or peripheral support",
      "Need for USB 3.0 rather than USB 2.0",
      "Control system integration",
      "Power / PoH preference",
      "Future expansion to multiple endpoints",
    ],
    cards: [
      {
        id: "extend-1",
        question: "What is the actual source-to-display distance?",
        whyItMatters:
          "Distance is the first major filter in extender selection.",
        whatGoodLooksLike:
          "Get a real cable path estimate, not just a room width guess.",
        technologyChecks: [
          "Distance",
          "HDBaseT range",
          "Copper vs other transport",
          "4K distance impact",
        ],
      },
      {
        id: "extend-2",
        question: "Is USB required, and if so is it simple HID/USB 2.0 or high-bandwidth USB 3.0?",
        whyItMatters:
          "This is one of the biggest product split points in real projects.",
        whatGoodLooksLike:
          "Confirm whether they only need keyboard/mouse/touch/HID or whether they need camera, storage, or higher-bandwidth USB behaviour.",
        upsellPrompt:
          "If they mention cameras, soft codec rooms, or docking behaviour, verify whether USB 3.0 performance matters.",
        technologyChecks: [
          "USB 2.0",
          "USB 3.0",
          "Camera support",
          "Peripheral bandwidth",
        ],
      },
      {
        id: "extend-3",
        question: "Do you need IR, RS232, Ethernet pass-through, or CEC-style control?",
        whyItMatters:
          "Control and integration features often separate a basic extender from a proper AV system component.",
        whatGoodLooksLike:
          "Confirm the real control method the installer or customer expects to use.",
        technologyChecks: [
          "RS232",
          "IR",
          "Ethernet pass-through",
          "Control path",
        ],
      },
    ],
  },
  {
    key: "switch",
    title: "Switch between sources",
    subtitle: "Several sources to one display",
    description:
      "Use this when the room needs source selection but only one main display destination is involved.",
    icon: "switch",
    productDirection: [
      "Lead with presentation switching logic when many sources feed one destination.",
      "Check whether the room also needs collaboration, wireless presentation, or USB host switching.",
      "If several displays must receive different sources, move toward matrix rather than simple switcher logic.",
    ],
    upgradeSignals: [
      "USB-C input expectations",
      "Wireless presentation",
      "BYOD / UC workflow",
      "Audio DSP or breakout needs",
      "Control system integration",
    ],
    cards: [
      {
        id: "switch-1",
        question: "How many source devices need to be selected, and what connector types are they?",
        whyItMatters:
          "Input count and connector mix immediately narrow the switching family.",
        whatGoodLooksLike:
          "List actual source types such as HDMI laptops, USB-C devices, wireless inputs, or media players.",
        technologyChecks: [
          "Input count",
          "HDMI",
          "USB-C",
          "Wireless input",
        ],
      },
      {
        id: "switch-2",
        question: "Is the requirement just video switching, or do laptops need USB, charging, or BYOD support too?",
        whyItMatters:
          "This separates a straightforward switcher from a more advanced collaboration or presentation solution.",
        whatGoodLooksLike:
          "Confirm whether the customer expects one-cable laptop connection or UC room integration.",
        upsellPrompt:
          "If they mention hybrid meetings or room peripherals, qualify USB switching and host/device behaviour early.",
        technologyChecks: [
          "USB host switching",
          "BYOD",
          "Laptop charging",
          "Meeting room peripherals",
        ],
      },
      {
        id: "switch-3",
        question: "Does the customer need simple push-button control, touchscreen control, or integration into a wider control system?",
        whyItMatters:
          "This helps position the room as either simple switching or part of a more managed AV environment.",
        whatGoodLooksLike:
          "Confirm who is controlling the room and how polished the user experience needs to be.",
        technologyChecks: [
          "Front-panel control",
          "Web UI / app control",
          "RS232",
          "Third-party control integration",
        ],
      },
    ],
  },
  {
    key: "matrix",
    title: "Matrix switching",
    subtitle: "Several sources to several displays",
    description:
      "Use this when the customer wants sources routed flexibly across multiple destinations.",
    icon: "matrix",
    productDirection: [
      "Start with matrix logic when different displays may need different sources.",
      "Quantify inputs, outputs, and whether routing must happen independently per destination.",
      "If the estate becomes very large or highly distributed, check whether AVoIP is the better long-term path.",
    ],
    upgradeSignals: [
      "Need for expansion later",
      "Audio breakaway",
      "Control room or multi-zone control",
      "Longer cable distances",
      "Potential migration to networked AV",
    ],
    cards: [
      {
        id: "matrix-1",
        question: "How many sources and how many display outputs need independent routing?",
        whyItMatters:
          "This is the foundation of matrix sizing and avoids under- or over-positioning the solution.",
        whatGoodLooksLike:
          "Get a proper input/output count and confirm whether every output needs independent source choice.",
        technologyChecks: [
          "Matrix size",
          "Input count",
          "Output count",
          "Independent routing",
        ],
      },
      {
        id: "matrix-2",
        question: "Are the outputs local, or are they spread across longer distances or different rooms?",
        whyItMatters:
          "This helps determine whether local matrix switching is enough or whether extension/distribution also needs to be built in.",
        whatGoodLooksLike:
          "Map outputs by room and approximate cable route length.",
        upsellPrompt:
          "If rooms are widely spread or growth is likely, begin positioning distributed AV or AVoIP as the cleaner future path.",
        technologyChecks: [
          "Distance",
          "Local matrix vs distributed",
          "HDBaseT output path",
          "Expansion risk",
        ],
      },
      {
        id: "matrix-3",
        question: "Do you need audio de-embedding, breakaway audio, or additional control features?",
        whyItMatters:
          "Professional matrix jobs often include more than video routing.",
        whatGoodLooksLike:
          "Confirm whether audio and control need to be handled separately from the main HDMI path.",
        technologyChecks: [
          "Audio de-embed",
          "Audio breakaway",
          "RS232",
          "IR",
        ],
      },
    ],
  },
  {
    key: "avoip",
    title: "AVoIP system",
    subtitle: "Networked AV distribution",
    description:
      "Use this when the requirement is larger-scale, more flexible, multi-room, or likely to expand over time.",
    icon: "avoip",
    productDirection: [
      "Lead with AVoIP when flexibility, scale, and routing freedom matter more than simple point-to-point topology.",
      "Qualify whether the customer needs one-to-many distribution, many-to-many switching, or video wall behaviour.",
      "Understand whether multiview, control, USB, and network readiness are part of the requirement.",
    ],
    upgradeSignals: [
      "Video wall requirement",
      "Many rooms or many endpoints",
      "Need for expansion",
      "Multiview or control room workflows",
      "Higher-end USB / KVM style behaviour",
    ],
    cards: [
      {
        id: "avoip-1",
        question: "How many endpoints or spaces are involved now, and how likely is future expansion?",
        whyItMatters:
          "Scale and flexibility are core reasons to move into AVoIP rather than simpler architectures.",
        whatGoodLooksLike:
          "Understand both the current deployment and the likely next phase.",
        technologyChecks: [
          "Endpoint count",
          "Expansion",
          "Many-to-many routing",
          "Scalability",
        ],
      },
      {
        id: "avoip-2",
        question: "Does the customer need simple distribution, flexible switching, multiview, or video wall behaviour?",
        whyItMatters:
          "Not all AVoIP requirements are the same. This shapes the decoder/feature path quickly.",
        whatGoodLooksLike:
          "Separate straightforward distribution from control-room, wall, or multiview expectations.",
        upsellPrompt:
          "If they mention wall layouts or multiple windows, qualify decoder feature level immediately.",
        technologyChecks: [
          "Multiview",
          "Video wall",
          "Decoder capability",
          "Windowing",
        ],
      },
      {
        id: "avoip-3",
        question: "Does USB, KVM-style behaviour, or control integration need to travel with the AV path?",
        whyItMatters:
          "This is often where AVoIP solutions diverge in practical suitability.",
        whatGoodLooksLike:
          "Confirm whether the AV network is only for video/audio, or whether USB/control must be part of the design too.",
        technologyChecks: [
          "USB transport",
          "KVM needs",
          "RS232",
          "IR",
          "Ethernet/control integration",
        ],
      },
    ],
  },
];

function getOutcomeIcon(key: OutcomeGuide["icon"]) {
  switch (key) {
    case "split":
      return SplitSquareVertical;
    case "extend":
      return Route;
    case "switch":
      return ArrowLeftRight;
    case "matrix":
      return Rows3;
    case "avoip":
      return Network;
    default:
      return MonitorPlay;
  }
}

export default function SalesPositioningPage() {
  const [selectedOutcome, setSelectedOutcome] = React.useState<OutcomeKey>("split");
  const [cardIndex, setCardIndex] = React.useState(0);
  const [showAnswer, setShowAnswer] = React.useState(false);

  const activeOutcome = React.useMemo(
    () => OUTCOMES.find((item) => item.key === selectedOutcome) ?? OUTCOMES[0],
    [selectedOutcome],
  );

  const activeCard = activeOutcome.cards[cardIndex] ?? activeOutcome.cards[0];
  const ActiveIcon = getOutcomeIcon(activeOutcome.icon);

  React.useEffect(() => {
    setCardIndex(0);
    setShowAnswer(false);
  }, [selectedOutcome]);

  function previousCard() {
    setCardIndex((current) =>
      current === 0 ? activeOutcome.cards.length - 1 : current - 1,
    );
    setShowAnswer(false);
  }

  function nextCard() {
    setCardIndex((current) =>
      current === activeOutcome.cards.length - 1 ? 0 : current + 1,
    );
    setShowAnswer(false);
  }

  function randomOutcome() {
    const next = OUTCOMES[Math.floor(Math.random() * OUTCOMES.length)];
    setSelectedOutcome(next.key);
  }

  return (
    <div className="wm-page-shell wm-sales-tools-page">
      <section className="wm-page-header wm-page-header--split">
        <div className="wm-page-stack">
          <div className="wm-page-kicker">Sales helper</div>
          <h1 className="wm-page-title">
            Start from the AV outcome, then ask the right sales questions
          </h1>
          <p className="wm-page-subtitle">
            Choose the customer’s likely requirement first, then let the flash cards
            guide the qualification path, upgrade conversation, and WyreStorm product direction.
          </p>
        </div>

        <div className="wm-page-actions">
          <Link to={WM_ROUTES.catalog} className="wm-btn-secondary">
            Open Catalogue
          </Link>
          <Link to={WM_ROUTES.guru} className="wm-btn-secondary">
            Ask Guru
          </Link>
          <Link to={WM_ROUTES.proposal} className="wm-btn-primary">
            Open Proposal
          </Link>
        </div>
      </section>

      <section className="wm-stat-row wm-sales-tools-page__stats">
        <div className="wm-stat-card">
          <span className="wm-stat-label">Outcome paths</span>
          <span className="wm-stat-value">{OUTCOMES.length}</span>
        </div>
        <div className="wm-stat-card">
          <span className="wm-stat-label">Current path</span>
          <span className="wm-stat-value">{activeOutcome.title}</span>
        </div>
        <div className="wm-stat-card">
          <span className="wm-stat-label">Flash cards</span>
          <span className="wm-stat-value">{activeOutcome.cards.length}</span>
        </div>
        <div className="wm-stat-card">
          <span className="wm-stat-label">Use case</span>
          <span className="wm-stat-value">Live qualification</span>
        </div>
      </section>

      <section className="wm-section">
        <div className="wm-section-header">
          <div>
            <h2 className="wm-section-title">Choose the likely requirement</h2>
            <p className="wm-section-copy">
              Start from what the customer thinks they need. The helper then guides the
              follow-up questions that narrow the best-fit WyreStorm path.
            </p>
          </div>
        </div>

        <div className="wm-sales-tools-page__outcome-grid">
          {OUTCOMES.map((outcome) => {
            const Icon = getOutcomeIcon(outcome.icon);
            const isActive = outcome.key === selectedOutcome;

            return (
              <button
                key={outcome.key}
                type="button"
                className={"wm-sales-outcome-card" + (isActive ? " is-active" : "")}
                onClick={() => setSelectedOutcome(outcome.key)}
              >
                <div className="wm-sales-outcome-card__icon">
                  <Icon size={18} />
                </div>
                <div className="wm-sales-outcome-card__body">
                  <strong>{outcome.title}</strong>
                  <span>{outcome.subtitle}</span>
                  <p>{outcome.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="wm-page-grid wm-page-grid--2">
        <aside className="wm-card wm-sales-path-panel">
          <div className="wm-section-header">
            <div>
              <h2 className="wm-section-title">Current sales path</h2>
              <p className="wm-section-copy">{activeOutcome.description}</p>
            </div>
          </div>

          <div className="wm-sales-path-panel__hero">
            <div className="wm-sales-path-panel__hero-icon">
              <ActiveIcon size={20} />
            </div>
            <div>
              <div className="wm-title">{activeOutcome.title}</div>
              <div className="wm-text-muted">{activeOutcome.subtitle}</div>
            </div>
          </div>

          <div className="wm-card wm-sales-subpanel">
            <div className="wm-sales-subpanel__title">Product direction</div>
            <div className="wm-sales-list">
              {activeOutcome.productDirection.map((item) => (
                <div key={item} className="wm-sales-list__item">
                  <CheckCircle2 size={15} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="wm-card wm-sales-subpanel">
            <div className="wm-sales-subpanel__title">Upgrade / option signals</div>
            <div className="wm-page-inline-list">
              {activeOutcome.upgradeSignals.map((item) => (
                <span key={item} className="wm-workspace-tag">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <section className="wm-card wm-sales-flashcard-panel">
          <div className="wm-sales-flashcard-panel__top">
            <div className="wm-page-inline-list">
              <span className="wm-workspace-tag">{activeOutcome.title}</span>
              <span className="wm-workspace-tag">
                Card {cardIndex + 1} of {activeOutcome.cards.length}
              </span>
            </div>

            <button type="button" className="wm-btn-secondary" onClick={randomOutcome}>
              <RefreshCcw size={16} />
              Random path
            </button>
          </div>

          <div className="wm-sales-flashcard">
            {!showAnswer ? (
              <div className="wm-sales-flashcard__face">
                <div className="wm-sales-flashcard__label">
                  <ScanSearch size={16} />
                  <span>Question to ask</span>
                </div>
                <h3>{activeCard.question}</h3>
                <p>{activeCard.whyItMatters}</p>
              </div>
            ) : (
              <div className="wm-sales-flashcard__face wm-sales-flashcard__face--answer">
                <div className="wm-sales-flashcard__label">
                  <Sparkles size={16} />
                  <span>What good looks like</span>
                </div>
                <h3>{activeCard.whatGoodLooksLike}</h3>
                {activeCard.upsellPrompt ? <p>{activeCard.upsellPrompt}</p> : null}
              </div>
            )}
          </div>

          <div className="wm-action-row">
            <button
              type="button"
              className="wm-btn-secondary"
              onClick={() => setShowAnswer((current) => !current)}
            >
              <ArrowLeftRight size={16} />
              {showAnswer ? "Show question" : "Flip card"}
            </button>

            <button type="button" className="wm-btn-secondary" onClick={previousCard}>
              <ChevronLeft size={16} />
              Previous
            </button>

            <button type="button" className="wm-btn-secondary" onClick={nextCard}>
              Next
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="wm-card wm-sales-subpanel">
            <div className="wm-sales-subpanel__title">Technology checks to confirm</div>
            <div className="wm-page-inline-list">
              {activeCard.technologyChecks.map((item) => (
                <span key={item} className="wm-workspace-tag">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="wm-card wm-sales-subpanel">
            <div className="wm-sales-subpanel__title">Best next move</div>
            <div className="wm-sales-list">
              <Link to={WM_ROUTES.catalog} className="wm-sales-next-link">
                Review matching product families in Catalogue
                <ArrowRight size={15} />
              </Link>
              <Link to={WM_ROUTES.guru} className="wm-sales-next-link">
                Ask Guru to sense-check the architecture
                <ArrowRight size={15} />
              </Link>
              <Link to={WM_ROUTES.proposal} className="wm-sales-next-link">
                Move to proposal once the path is clear
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}