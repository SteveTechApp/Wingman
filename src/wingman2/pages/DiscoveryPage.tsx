import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  Cable,
  ChevronLeft,
  ClipboardList,
  FileText,
  GitCompare,
  Monitor,
  Network,
  Sparkles,
  Users,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

type DiscoveryStep = {
  id: string;
  title: string;
  ask: string;
  why: string;
  options?: string[];
  placeholder?: string;
};

type DiscoveryFlow = {
  id: string;
  title: string;
  description: string;
  bestFor: string;
  routeHint: string;
  nextPath: string;
  nextLabel: string;
  Icon: LucideIcon;
  steps: DiscoveryStep[];
};

type AnswerMap = Record<string, string>;

const flows: DiscoveryFlow[] = [
  {
    id: "customer-call",
    title: "Qualify a customer call",
    description: "Use this when someone is on the phone or asking for help in plain language.",
    bestFor: "Distributor, reseller or account manager conversations.",
    routeHint: "Captures room use, I/O, distance and obvious USB/audio needs.",
    nextPath: "/wingman/guided-discovery",
    nextLabel: "Continue guided discovery",
    Icon: Users,
    steps: [
      {
        id: "room-use",
        title: "Room use",
        ask: "What kind of space is this, and what does the customer need people to do in the room?",
        why: "The application decides whether this is likely to be presentation switching, UC, matrix, AV-over-IP, signage or video wall processing.",
        options: ["Meeting room", "Classroom / training", "Hospitality / bar", "Boardroom", "Retail / signage", "Not sure yet"],
      },
      {
        id: "io",
        title: "Sources and screens",
        ask: "How many things need to send a picture, and how many screens need to show it?",
        why: "The I/O pattern is the quickest way to separate simple extension, local switching, matrix switching and AV-over-IP.",
        options: ["One source to one display", "Several sources to one display", "One source to several displays", "Many sources to many displays", "Not confirmed"],
      },
      {
        id: "distance",
        title: "Distance",
        ask: "Roughly how far are the source devices from the screens, following the real cable route?",
        why: "Distance decides whether HDMI, HDBaseT, fibre or AV-over-IP should be considered.",
        options: ["Under 5m", "5m to 15m", "15m to 40m", "40m to 100m", "Over 100m", "Not sure"],
      },
      {
        id: "usb",
        title: "USB and conferencing",
        ask: "Does the laptop or room PC need to use a camera, microphone, speaker, touchscreen or keyboard/mouse?",
        why: "USB is often missed. A working conferencing room needs the USB path designed separately from the video path.",
        options: ["No USB needed", "Camera / mic / speaker", "Interactive display / touch", "Keyboard and mouse", "Not confirmed"],
      },
    ],
  },
  {
    id: "room-design",
    title: "Design a room",
    description: "Use this when you need enough information to build a proper room solution.",
    bestFor: "Pre-sales, integrators and more complete room discovery.",
    routeHint: "Builds a room-level design brief before moving into product selection.",
    nextPath: "/wingman/finder",
    nextLabel: "Open Product Finder",
    Icon: Building2,
    steps: [
      {
        id: "room-type",
        title: "Room type",
        ask: "Which room type is the closest match?",
        why: "Room type gives Wingman the first set of practical AV assumptions.",
        options: ["Meeting room", "Boardroom", "Training room", "Classroom", "Auditorium", "Hospitality", "Retail / showroom", "Command / control"],
      },
      {
        id: "display-behaviour",
        title: "Display behaviour",
        ask: "What should the displays do?",
        why: "Same content, independent content, multiview and wall canvas all need different technical approaches.",
        options: ["One main display", "Dual mirrored displays", "Independent displays", "Multiview", "Video wall", "Not confirmed"],
      },
      {
        id: "source-locations",
        title: "Source locations",
        ask: "Where are the source devices located?",
        why: "Source location decides whether the system is local, centralised, rack-based, or distributed.",
        options: ["At the table", "At a lectern", "Behind the display", "In a local rack", "In a remote rack", "Spread across the building"],
      },
      {
        id: "operation",
        title: "Operation",
        ask: "How should users operate the room?",
        why: "Control requirement affects product choice, accessories and commissioning effort.",
        options: ["Auto-switching", "Button or remote", "Touch panel", "App control", "Third-party control", "Not confirmed"],
      },
    ],
  },
  {
    id: "email-rfp",
    title: "Review an email, RFP or PDF",
    description: "Paste written requirements and separate confirmed facts from missing details.",
    bestFor: "Formal requests, incomplete customer emails, tender notes and consultant documents.",
    routeHint: "Extracts requirement clues before asking only the missing questions.",
    nextPath: "/wingman/proposal",
    nextLabel: "Start Proposal",
    Icon: FileText,
    steps: [
      {
        id: "document-text",
        title: "Requirement text",
        ask: "Paste the customer request, email extract, RFP note or PDF summary.",
        why: "Written information is often incomplete. Wingman should not assume products until it knows what is confirmed and what is missing.",
        placeholder: "Paste the customer request here...",
      },
      {
        id: "confirmed",
        title: "Confirmed requirements",
        ask: "Which requirements are definitely confirmed?",
        why: "Confirmed facts can be safely used in the proposal. Assumptions should be labelled separately.",
        placeholder: "Example: two displays, one lectern PC, Teams room, 25m run...",
      },
      {
        id: "missing",
        title: "Missing information",
        ask: "What is still missing or unclear?",
        why: "Missing information becomes the next customer question list.",
        placeholder: "Example: USB requirement, audio output, resolution, control method...",
      },
    ],
  },
  {
    id: "competitor",
    title: "Replace or compare a competitor product",
    description: "Use the competitor product as a clue, then qualify the real system role.",
    bestFor: "Customer asks for an equivalent to another brand or SKU.",
    routeHint: "Checks product role before matching I/O or features.",
    nextPath: "/wingman/compare",
    nextLabel: "Open Compare",
    Icon: GitCompare,
    steps: [
      {
        id: "competitor-sku",
        title: "Competitor product",
        ask: "What competitor brand and SKU has been mentioned?",
        why: "Wingman should match product role first, not just connector count.",
        placeholder: "Example: HDAnywhere matrix, Blustream C88CS, Kramer VP-440X...",
      },
      {
        id: "role",
        title: "System role",
        ask: "What is that product expected to do in the system?",
        why: "A product can be a switcher, extender, matrix, scaler, processor or control point. The role matters more than the SKU name.",
        options: ["Simple extender", "Presentation switcher", "Matrix", "AV-over-IP", "Video wall processor", "Scaler / multiview", "Not sure"],
      },
      {
        id: "must-match",
        title: "Must-match features",
        ask: "What must the WyreStorm solution match or improve?",
        why: "This prevents a false equivalent that matches ports but misses USB, audio, control, scaling or network behaviour.",
        options: ["I/O count", "Distance", "USB", "Audio", "Control", "Scaling", "Price point", "Not confirmed"],
      },
    ],
  },
  {
    id: "io-filter",
    title: "Find product from I/O",
    description: "Use this when the user already knows inputs, outputs and basic behaviour.",
    bestFor: "Fast product filtering without full discovery.",
    routeHint: "Moves quickly into Product Finder with the right technology direction.",
    nextPath: "/wingman/finder",
    nextLabel: "Open Product Finder",
    Icon: Cable,
    steps: [
      {
        id: "io-pattern",
        title: "I/O pattern",
        ask: "Which I/O pattern best describes the requirement?",
        why: "I/O pattern usually tells Wingman whether to look at extenders, switchers, matrix products or AVoIP.",
        options: ["1x1", "Several inputs to one output", "One input to several outputs", "Many inputs to many outputs", "Not sure"],
      },
      {
        id: "signal",
        title: "Signal type",
        ask: "What signal types need to be carried?",
        why: "Video-only, USB, audio, control and network needs change the product family.",
        options: ["Video only", "Video + USB", "Video + audio", "Video + control", "Video + USB + audio/control", "Not confirmed"],
      },
      {
        id: "quality",
        title: "Video quality",
        ask: "What video quality is required?",
        why: "Video format affects whether a value product is enough or a higher-bandwidth product family is needed.",
        options: ["1080p", "Standard 4K", "High-performance 4K60", "HDR / colour critical", "Not confirmed"],
      },
    ],
  },
  {
    id: "video-wall",
    title: "Video wall route",
    description: "Separate simple wall processing from flexible routing and multiview workflows.",
    bestFor: "LCD walls, LED walls, feature walls and control room displays.",
    routeHint: "Decides whether dedicated wall processing or AVoIP should be considered.",
    nextPath: "/wingman/videowall",
    nextLabel: "Open Video Wall",
    Icon: Video,
    steps: [
      {
        id: "wall-type",
        title: "Wall type",
        ask: "What kind of wall is this?",
        why: "LCD walls, LED walls and grouped displays have different processing requirements.",
        options: ["2x2 LCD wall", "Larger LCD wall", "LED wall", "Grouped displays", "Not confirmed"],
      },
      {
        id: "wall-behaviour",
        title: "Wall behaviour",
        ask: "What does the wall need to show?",
        why: "One large image, multiview, independent content and signage all need different processing routes.",
        options: ["One large image", "Independent content", "Multiview", "Signage", "Mixed layouts", "Not confirmed"],
      },
      {
        id: "wall-sources",
        title: "Source count",
        ask: "How many sources feed the wall?",
        why: "Source count and layout flexibility decide whether SW-0204-VW, SW-0206-VW, matrix or NetworkHD is more suitable.",
        options: ["One source", "Two sources", "Three to four sources", "Many sources", "Not confirmed"],
      },
    ],
  },
];

const baseQuestionStrategyByStep: Record<string, string> = {
  "room-use": "Confirm the customer outcome before choosing presentation, UC, signage, matrix, AVoIP or wall processing.",
  io: "Classify the I/O pattern first so Wingman can avoid premature product selection.",
  distance: "Use the real installed cable path to decide whether HDMI, HDBaseT, fibre or AVoIP is practical.",
  usb: "Treat USB, camera, microphone, speakerphone, touch and KVM as a separate signal path from video.",
  "room-type": "Use the room type to set realistic assumptions for layout, user operation, audio and control.",
  "display-behaviour": "Clarify mirrored, independent, multiview or wall-canvas behaviour before selecting transport.",
  "source-locations": "Use source and display locations to decide whether the system is local, rack-based or distributed.",
  operation: "Confirm the control expectation before adding switching, automation, panels or third-party control.",
  "document-text": "Separate confirmed requirements from assumptions before turning written notes into products.",
  confirmed: "Only proposal-safe facts should move forward as confirmed requirements.",
  missing: "Missing details should become the next customer questions rather than hidden assumptions.",
  "competitor-sku": "Use the competitor product as a clue, then compare role, I/O, transport and feature gaps.",
  role: "Match the product role before matching connector count.",
  "must-match": "Protect the recommendation from missing USB, audio, control, scaling, distance or budget constraints.",
  "io-pattern": "Use the I/O pattern to narrow extension, switching, matrix and AVoIP routes.",
  signal: "Signal mix determines whether the design is video-only or a fuller AV/USB/audio/control system.",
  quality: "Video format and latency expectations decide whether value, premium or lossless routes are suitable.",
  "wall-type": "Wall type separates LCD processing, LED processor handoff and grouped-display behaviour.",
  "wall-behaviour": "Wall behaviour decides whether a dedicated processor, matrix, multiview or AVoIP route fits.",
  "wall-sources": "Source count and layout flexibility shape the wall processor or NetworkHD recommendation.",
};

function getQuestionStrategy(flow: DiscoveryFlow, step: DiscoveryStep) {
  return baseQuestionStrategyByStep[step.id] ?? flow.routeHint;
}

function getStepKey(flowId: string, stepId: string) {
  return `${flowId}.${stepId}`;
}

function inferSummary(flow: DiscoveryFlow, answers: AnswerMap) {
  const values = flow.steps
    .map((step) => answers[getStepKey(flow.id, step.id)])
    .filter(Boolean);

  if (!values.length) {
    return "No answers captured yet.";
  }

  return values.join(" | ");
}

export function DiscoveryPage() {
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [draft, setDraft] = useState("");

  const activeFlow = useMemo(
    () => flows.find((flow) => flow.id === activeFlowId) ?? null,
    [activeFlowId],
  );

  const activeStep = activeFlow?.steps[stepIndex] ?? null;
  const stepKey = activeFlow && activeStep ? getStepKey(activeFlow.id, activeStep.id) : "";
  const savedValue = stepKey ? answers[stepKey] ?? "" : "";
  const currentValue = draft || savedValue;
  const isFinalStep = Boolean(activeFlow && stepIndex >= activeFlow.steps.length - 1);
  const capturedCount = activeFlow
    ? activeFlow.steps.filter((step) => Boolean(answers[getStepKey(activeFlow.id, step.id)])).length
    : 0;

  function openFlow(flowId: string) {
    setActiveFlowId(flowId);
    setStepIndex(0);
    setDraft("");
  }

  function closeFlow() {
    setActiveFlowId(null);
    setStepIndex(0);
    setDraft("");
  }

  function saveCurrentAnswer() {
    if (!activeFlow || !activeStep) return;

    const value = currentValue.trim() || "Not confirmed";

    setAnswers((current) => ({
      ...current,
      [getStepKey(activeFlow.id, activeStep.id)]: value,
    }));

    setDraft("");

    if (isFinalStep) {
      return;
    }

    setStepIndex((current) => current + 1);
  }

  function goBack() {
    if (stepIndex < 1) return;
    setDraft("");
    setStepIndex((current) => current - 1);
  }

  return (
    <main className="discovery-mini-page">
      <section className="discovery-mini-hero">
        <div>
          <p className="discovery-mini-kicker">Customer Discovery</p>
          <h1>Choose one discovery route.</h1>
          <p>
            Discovery now starts small. Pick the task, answer one question at a time, then move to the right Wingman tool.
          </p>
        </div>

        <div className="discovery-mini-actions">
          <Link className="discovery-mini-button primary" to="/wingman/guided-discovery">
            Guided Discovery
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="discovery-mini-grid" aria-label="Discovery routes">
        {flows.map(({ id, title, description, bestFor, routeHint, Icon }) => (
          <button
            key={id}
            type="button"
            className="discovery-mini-card"
            onClick={() => openFlow(id)}
          >
            <Icon aria-hidden="true" />
            <strong>{title}</strong>
            <span>{description}</span>
            <small>{bestFor}</small>
            <em>{routeHint}</em>
          </button>
        ))}
      </section>

      <section className="discovery-mini-guidance">
        <div>
          <ClipboardList aria-hidden="true" />
          <div>
            <strong>Ask less, explain more</strong>
            <span>Products, engineering detail and advisory notes stay hidden until a discovery path needs them.</span>
          </div>
        </div>
        <div>
          <Monitor aria-hidden="true" />
          <div>
            <strong>Start with I/O and use case</strong>
            <span>Inputs, outputs, locations, distance and USB quickly point toward the correct architecture.</span>
          </div>
        </div>
        <div>
          <Network aria-hidden="true" />
          <div>
            <strong>Architecture before SKU</strong>
            <span>Wingman should classify extension, switching, matrix, AVoIP, UC or wall processing before product selection.</span>
          </div>
        </div>
      </section>

      {activeFlow && activeStep ? (
        <div className="discovery-mini-modal-backdrop" role="presentation">
          <section className="discovery-mini-modal" role="dialog" aria-modal="true" aria-labelledby="discovery-mini-title">
            <header>
              <div>
                <p className="discovery-mini-kicker">{activeFlow.title}</p>
                <h2 id="discovery-mini-title">{activeStep.title}</h2>
                <span>
                  Question {stepIndex + 1} of {activeFlow.steps.length}
                </span>
              </div>

              <button type="button" className="discovery-mini-icon-button" onClick={closeFlow} aria-label="Close discovery route">
                <X aria-hidden="true" />
              </button>
            </header>

            <div className="discovery-mini-question">
              <blockquote>{activeStep.ask}</blockquote>

              {activeStep.options ? (
                <div className="discovery-mini-option-grid">
                  {activeStep.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={currentValue === option ? "is-selected" : ""}
                      onClick={() => setDraft(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  value={currentValue}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={activeStep.placeholder ?? "Type the answer here..."}
                />
              )}
            </div>

            <details className="discovery-mini-details">
              <summary>Why am I asking this?</summary>
              <p>{activeStep.why}</p>
              <p>{getQuestionStrategy(activeFlow, activeStep)}</p>
            </details>

            <details className="discovery-mini-details">
              <summary>Show captured answers</summary>
              <ul>
                {activeFlow.steps.map((step) => {
                  const value = answers[getStepKey(activeFlow.id, step.id)];

                  if (!value) return null;

                  return (
                    <li key={step.id}>
                      <strong>{step.title}:</strong> {value}
                    </li>
                  );
                })}
              </ul>
              {!capturedCount ? <p>No answers captured yet.</p> : null}
            </details>

            {isFinalStep && capturedCount === activeFlow.steps.length ? (
              <section className="discovery-mini-result">
                <p className="discovery-mini-kicker">Discovery summary</p>
                <strong>{inferSummary(activeFlow, answers)}</strong>
                <div className="discovery-mini-actions">
                  <Link className="discovery-mini-button primary" to={activeFlow.nextPath}>
                    {activeFlow.nextLabel}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </section>
            ) : null}

            <footer>
              <button type="button" className="discovery-mini-button" onClick={goBack} disabled={stepIndex < 1}>
                <ChevronLeft aria-hidden="true" />
                Back
              </button>

              <button type="button" className="discovery-mini-button primary" onClick={saveCurrentAnswer}>
                {isFinalStep ? "Save answer" : "Save and next"}
                <ArrowRight aria-hidden="true" />
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}
