import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Cable,
  CheckCircle2,
  ClipboardList,
  Copy,
  Eraser,
  FileText,
  HelpCircle,
  MessageSquareText,
  Monitor,
  MoveRight,
  PackageSearch,
  Save,
  Scale,
  Search,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { routeCatalogByKey, type WingmanRouteKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
import {
  getCurrentWorkflowProject,
  readProjectStore,
  saveProjectRequirementsToProject,
  type StoredRequirementRecord,
} from "../data/projectStore";
import { buildSalesReadinessPackage } from "../lib/salesReadiness";

/* SALES HELPER LOCAL UI BEGIN */
type WingmanSelectionAccent = "cyan" | "teal" | "green" | "amber" | "red" | "purple" | "blue";

function selectionAccentClasses(accent: WingmanSelectionAccent) {
  const classes: Record<WingmanSelectionAccent, string> = {
    cyan: "border-cyan-200 bg-[#10263a] text-[#f7fbff] hover:border-cyan-300",
    teal: "border-[#29465e] bg-[#0d2133] text-[#f7fbff] hover:border-[#4af5e6]",
    green: "border-[#29465e] bg-[#0d2133] text-[#f7fbff] hover:border-[#4af5e6]",
    amber: "border-cyan-200 bg-[#0d2133] text-[#f7fbff] hover:border-cyan-300",
    red: "border-[#29465e] bg-[#0d2133] text-[#f7fbff] hover:border-[#ff8a8a]",
    purple: "border-[#29465e] bg-[#0d2133] text-[#f7fbff] hover:border-[#4af5e6]",
    blue: "border-[#29465e] bg-[#10263a] text-[#f7fbff] hover:border-[#4af5e6]",
  };

  return classes[accent] ?? classes.cyan;
}

function WingmanSelectionGrid({
  children,
  columns = 3,
  compact = false,
  className = "",
}: {
  children: ReactNode;
  columns?: number;
  compact?: boolean;
  className?: string;
}) {
  const columnClasses: Record<number, string> = {
    1: "grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 xl:grid-cols-3",
    4: "sm:grid-cols-2 xl:grid-cols-4",
  };

  const gapClass = compact ? "gap-2" : "gap-3";
  const gridClass = columnClasses[columns] ?? columnClasses[3];

  return <div className={`grid ${gapClass} ${gridClass} ${className}`}>{children}</div>;
}

function WingmanSelectionCard({
  title,
  description,
  eyebrow,
  icon: Icon,
  accent = "cyan",
  selected = false,
  compact = false,
  indicator,
  metaBadges,
  onClick,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  icon: LucideIcon;
  accent?: WingmanSelectionAccent;
  selected?: boolean;
  compact?: boolean;
  indicator?: string;
  metaBadges?: string[];
  onClick: () => void;
}) {
  const selectedClass = selected ? "ring-2 ring-slate-950 ring-offset-2" : "";
  const paddingClass = compact ? "p-3" : "p-4";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex h-full min-h-[150px] flex-col rounded-3xl border text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${paddingClass} ${selectionAccentClasses(
        accent,
      )} ${selectedClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-2xl bg-[#0d2133] p-2 text-white shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        {indicator ? (
          <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
            {indicator}
          </span>
        ) : null}
      </div>

      {eyebrow ? (
        <p className="mt-3 line-clamp-2 text-[11px] font-black uppercase tracking-[0.14em] opacity-70">
          {eyebrow}
        </p>
      ) : null}

      <h3 className="mt-2 text-base font-black leading-5 text-white">{title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-5 text-white/70">{description}</p>

      {metaBadges?.length ? (
        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          {metaBadges.map((badge) => (
            <span key={badge} className="rounded-full border border-[#29465e] bg-[#0d2133] px-2.5 py-1 text-[11px] font-bold text-white/70">
              {badge}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}
/* SALES HELPER LOCAL UI END */

type AnswerStatus = "unanswered" | "answered" | "unknown" | "review";

type AnswerCapture = {
  chips: string[];
  note: string;
  status: AnswerStatus;
  updatedAt?: string;
};

type SalesQuestion = {
  id: string;
  prompt: string;
  why: string;
  listenFor: string[];
  chips: string[];
  notePlaceholder: string;
  category: string;
};

type SalesConversation = {
  id: string;
  title: string;
  description: string;
  salesSituation: string;
  Icon: LucideIcon;
  accent: WingmanSelectionAccent;
  fallbackRoute: WingmanRouteKey;
  routeLabel: string;
  questions: SalesQuestion[];
};

const STORAGE_KEY = "wingman.salesHelper.activeWorkflow.v1";
const LATEST_CAPTURE_KEY = "wingman.salesHelper.latestCapture.v1";

const emptyAnswer: AnswerCapture = {
  chips: [],
  note: "",
  status: "unanswered",
};

const conversations: SalesConversation[] = [
  {
    id: "room-requirement",
    title: "Room requirement",
    description: "Use when the customer says they need AV for a room but the system shape is not clear yet.",
    salesSituation: "Meeting rooms, boardrooms, classrooms, training rooms, huddle spaces, council rooms, teaching rooms, or general room refresh enquiries.",
    Icon: Users,
    accent: "cyan",
    fallbackRoute: "discovery",
    routeLabel: "Open Discovery",
    questions: [
      {
        id: "room-type",
        prompt: "What type of room is this, and how many people normally use it?",
        why: "Room type and user count set the realistic expectation for source count, display size, USB, audio, control and complexity.",
        listenFor: ["Meeting room", "Classroom", "Boardroom", "Training room", "Small huddle", "Large space"],
        chips: ["Small meeting room", "Boardroom", "Classroom", "Training room", "Large divisible space", "Not confirmed"],
        notePlaceholder: "Example: 12-person boardroom, single table, used for Teams and laptop presentation.",
        category: "Room context",
      },
      {
        id: "main-use",
        prompt: "What does the room mainly need to do?",
        why: "A presentation-only room, BYOD room and flexible routed AV space use different WyreStorm product paths.",
        listenFor: ["Present", "Teams/Zoom", "Teaching", "Hybrid meeting", "Signage", "Mixed use"],
        chips: ["Presentation only", "BYOD / laptop conferencing", "Room PC conferencing", "Teaching / training", "Mixed use", "Unknown"],
        notePlaceholder: "Capture what the end user actually needs to achieve in the room.",
        category: "Application",
      },
      {
        id: "pain-point",
        prompt: "What is not working well today?",
        why: "Pain points help position value without jumping straight to a SKU.",
        listenFor: ["Too many cables", "Unreliable", "No USB", "Wrong display behaviour", "Too hard to use"],
        chips: ["Too many cables", "Unreliable switching", "Camera/mic issues", "Distance/cabling issue", "Hard to use", "New build"],
        notePlaceholder: "Capture the problem in the customer's own words.",
        category: "Pain point",
      },
      {
        id: "output-needed",
        prompt: "What should Wingman produce next for this opportunity?",
        why: "This decides whether to move into Discovery, Templates, Finder or Proposal.",
        listenFor: ["Need questions", "Need product", "Need quick template", "Need proposal"],
        chips: ["Full discovery", "Standard room template", "Product shortlist", "Proposal summary", "Pre-sales review"],
        notePlaceholder: "Capture any urgency, decision maker or preferred output.",
        category: "Next action",
      },
    ],
  },
  {
    id: "display-attach",
    title: "Display / signage attach",
    description: "Use when the opportunity starts from displays, signage, LED or a video wall.",
    salesSituation: "Customer, consultant, partner or integrator is discussing screens, LED, signage or a display refresh and needs a clear WyreStorm signal path.",
    Icon: Monitor,
    accent: "purple",
    fallbackRoute: "videowall",
    routeLabel: "Open Video Wall Builder",
    questions: [
      {
        id: "display-type",
        prompt: "What type of display setup is being discussed?",
        why: "Single display, duplicated displays, LCD wall and LED wall need different signal paths and processing.",
        listenFor: ["Single display", "Dual display", "LCD wall", "LED wall", "Signage"],
        chips: ["Single display", "Dual displays", "Multiple signage displays", "LCD video wall", "LED wall", "Not confirmed"],
        notePlaceholder: "Example: 3x3 LCD wall in reception, or LED wall fed from signage player.",
        category: "Display type",
      },
      {
        id: "content-behaviour",
        prompt: "Should the displays show one image, duplicated content, independent content, or multiview?",
        why: "This separates simple distribution from matrix, multiview, wall processing or AV-over-IP.",
        listenFor: ["One big canvas", "Mirror", "Different content", "Multiview", "Operator control"],
        chips: ["One large canvas", "Same image everywhere", "Different content per display", "Multiview", "Mixed layouts", "Unknown"],
        notePlaceholder: "Capture how the customer expects the displays to behave day to day.",
        category: "Display behaviour",
      },
      {
        id: "source-count",
        prompt: "How many sources need to feed the displays or wall?",
        why: "Source count drives whether a processor, matrix, NetworkHD or simple extender path is appropriate.",
        listenFor: ["One source", "Multiple sources", "Signage player", "Laptop", "Camera", "Rack sources"],
        chips: ["1 source", "2 sources", "3-4 sources", "5+ sources", "Signage player only", "Unknown"],
        notePlaceholder: "List likely sources and where they are located.",
        category: "Source count",
      },
      {
        id: "routing-need",
        prompt: "Is this a fixed display job, or part of a wider routed AV system?",
        why: "A fixed feature wall may suit SW-0204-VW or SW-0206-VW, while routed/multi-room systems may justify NetworkHD.",
        listenFor: ["Fixed wall", "Flexible routing", "Multiple rooms", "Expansion", "Simple processor"],
        chips: ["Fixed feature wall", "Local room only", "Multi-room routing", "Future expansion", "Needs operator control", "Unknown"],
        notePlaceholder: "Capture whether flexibility or simplicity is more important.",
        category: "Architecture direction",
      },
    ],
  },
  {
    id: "signal-enquiry",
    title: "HDMI / extender / matrix enquiry",
    description: "Use when the customer asks for an extender, matrix, switcher, splitter or general signal product.",
    salesSituation: "Classic sales enquiry: the customer asks for a product type but has not given enough design information.",
    Icon: Cable,
    accent: "teal",
    fallbackRoute: "finder",
    routeLabel: "Open Finder",
    questions: [
      {
        id: "source-display",
        prompt: "What source needs to connect to what display or destination?",
        why: "The signal path must be understood before choosing HDBaseT, HDMI, matrix, AVoIP or USB transport.",
        listenFor: ["Source type", "Destination", "Local or remote", "Rack or room"],
        chips: ["Laptop to display", "Rack source to display", "Multiple sources to one display", "Multiple sources to multiple displays", "Unknown"],
        notePlaceholder: "Example: Sky box in rack to three bar screens, or laptop at table to projector.",
        category: "Signal path",
      },
      {
        id: "distance",
        prompt: "What is the installed cable route distance?",
        why: "Distance determines whether local HDMI, HDBaseT, fibre or AV-over-IP is sensible.",
        listenFor: ["Under 5m", "10-35m", "35-70m", "100m", "Site-wide"],
        chips: ["Local <5m", "Short 5-10m", "Medium 10-35m", "Long 35-70m", "Very long 70-100m", "Unknown"],
        notePlaceholder: "Use cable route length, not straight-line distance.",
        category: "Distance",
      },
      {
        id: "usb-audio-control",
        prompt: "Does the same path also need USB, audio, IR, RS-232 or display control?",
        why: "This avoids recommending a video-only product where USB, audio or control is required.",
        listenFor: ["USB camera", "Touch", "KVM", "Audio de-embed", "IR", "RS-232"],
        chips: ["Video only", "USB 2.0", "USB 3.x", "Audio de-embed", "IR / RS-232", "Not confirmed"],
        notePlaceholder: "Capture all non-video requirements, even if they seem secondary.",
        category: "Signal extras",
      },
      {
        id: "resolution",
        prompt: "What resolution and image quality are required?",
        why: "4K60 4:4:4, 4K60 4:2:0, 1080p and lossless requirements change the product family.",
        listenFor: ["1080p", "4K30", "4K60", "4:4:4", "Low latency", "Lossless"],
        chips: ["1080p", "4K30", "4K60 4:2:0", "4K60 4:4:4", "Lossless / zero latency", "Unknown"],
        notePlaceholder: "Capture source and display capability if known.",
        category: "Video standard",
      },
    ],
  },
  {
    id: "conferencing-usb",
    title: "BYOD / conferencing / USB",
    description: "Use when the job includes Teams, Zoom, cameras, speakerphones, PTZ, touch or USB devices.",
    salesSituation: "Meeting room, UC, BYOD, BYOD, MTR, Zoom Room, video bar, camera or microphone enquiry.",
    Icon: Sparkles,
    accent: "green",
    fallbackRoute: "discovery",
    routeLabel: "Open Discovery",
    questions: [
      {
        id: "host",
        prompt: "What is the USB host: user laptop, room PC, MTR/Zoom device, or both?",
        why: "USB host direction is one of the most common design mistakes in meeting rooms.",
        listenFor: ["Laptop", "Room PC", "MTR", "Zoom Room", "Both"],
        chips: ["User laptop", "Room PC", "MTR / Zoom Room", "Laptop and room PC", "Wireless conferencing", "Unknown"],
        notePlaceholder: "Capture where the computer running the meeting is located.",
        category: "USB host",
      },
      {
        id: "usb-devices",
        prompt: "Which USB devices need to be shared?",
        why: "Camera, mic, speakerphone, touch and KVM devices can require different USB bandwidth and routing.",
        listenFor: ["Camera", "Speakerphone", "Microphone", "Touch display", "Keyboard/mouse"],
        chips: ["USB camera", "PTZ camera", "Speakerphone", "Touch display", "Keyboard / mouse", "Multiple USB devices"],
        notePlaceholder: "List every peripheral and where it sits physically.",
        category: "USB devices",
      },
      {
        id: "usb-bandwidth",
        prompt: "Is USB 2.0 enough, or is USB 3.x needed?",
        why: "USB 3.x can heavily affect product choice, distance and topology.",
        listenFor: ["USB 2.0", "USB 3", "Camera bandwidth", "Unknown"],
        chips: ["USB 2.0 enough", "USB 3.x required", "Not sure", "Video only after all"],
        notePlaceholder: "If unknown, mark for review rather than guessing.",
        category: "USB class",
      },
      {
        id: "room-audio",
        prompt: "Is audio handled by a USB speakerphone, display audio, DSP, Dante, or something else?",
        why: "Audio path affects switcher, de-embed, DSP and proposal accessory decisions.",
        listenFor: ["Speakerphone", "DSP", "Dante", "Display speakers", "Analogue audio"],
        chips: ["USB speakerphone", "Display audio", "DSP", "Dante / AES67", "Analogue audio", "Unknown"],
        notePlaceholder: "Capture audio ownership and whether AV or UC supplier handles it.",
        category: "Audio",
      },
    ],
  },
  {
    id: "competitor-sku",
    title: "Competitor SKU",
    description: "Use when the customer asks for a match to Extron, Kramer, AVPro Edge, Blustream, HDA, J+P or another brand.",
    salesSituation: "Competitor replacement, tender equivalence, channel product match or quote comparison.",
    Icon: Scale,
    accent: "red",
    fallbackRoute: "compare",
    routeLabel: "Open Compare",
    questions: [
      {
        id: "sku-role",
        prompt: "Is the competitor SKU a fixed requirement or just an example?",
        why: "A competitor product is often a clue, not the full design requirement.",
        listenFor: ["Fixed spec", "Example only", "Consultant listed", "Installer preference"],
        chips: ["Fixed specification", "Example only", "Customer preference", "Installer asked", "Unknown"],
        notePlaceholder: "Capture the brand, SKU and any link or datasheet detail.",
        category: "Competitor context",
      },
      {
        id: "important-feature",
        prompt: "Which part of that competitor product matters most?",
        why: "Port count alone can create false matches. Function and role matter first.",
        listenFor: ["I/O count", "Distance", "USB", "Scaling", "Audio", "Control", "Network"],
        chips: ["I/O count", "Distance", "USB", "Scaling", "Audio", "Control", "Network / AVoIP"],
        notePlaceholder: "Capture the feature the customer actually cares about.",
        category: "Match driver",
      },
      {
        id: "system-role",
        prompt: "What role does the competitor product play in the system?",
        why: "Encoder, decoder, matrix, switcher and processor products must not be cross-matched incorrectly.",
        listenFor: ["Encoder", "Decoder", "Matrix", "Wall processor", "Extender", "Switcher"],
        chips: ["Transmitter / encoder", "Receiver / decoder", "Matrix", "Switcher", "Video wall processor", "Unknown"],
        notePlaceholder: "Capture whether it is source-side, display-side or central-rack equipment.",
        category: "Product role",
      },
      {
        id: "match-output",
        prompt: "Do they need a direct replacement, safer alternative, or full system recommendation?",
        why: "This decides whether Compare or Finder should drive the next step.",
        listenFor: ["Direct match", "Alternative", "Whole room", "Attachment sale"],
        chips: ["Closest direct match", "Safer alternative", "Full room/system", "Attachment opportunity", "Needs pre-sales review"],
        notePlaceholder: "Capture whether WyreStorm should match, improve or reframe the requirement.",
        category: "Sales output",
      },
    ],
  },
  {
    id: "distributor-development",
    title: "Channel and customer growth conversation",
    description: "Use for account development, sales enablement and opportunity-shaping conversations with partners, consultants, integrators or end-user stakeholders.",
    salesSituation: "Sales call where the goal is to uncover attachment opportunities, product gaps, confidence gaps and useful next actions.",
    Icon: PackageSearch,
    accent: "amber",
    fallbackRoute: "callCards",
    routeLabel: "Open Call Cards",
    questions: [
      {
        id: "common-enquiries",
        prompt: "What AV enquiries or project conversations are coming up most often?",
        why: "Growth starts from real customer conversations, not abstract product training.",
        listenFor: ["Displays", "LED", "USB-C", "Teams rooms", "Extenders", "Matrix", "Networking"],
        chips: ["Displays / LED", "Meeting rooms", "HDMI extenders", "USB-C", "Matrix", "AVoIP / networking"],
        notePlaceholder: "Capture common customer requests and where the salesperson gets stuck.",
        category: "Account opportunity",
      },
      {
        id: "confidence-gap",
        prompt: "Where does the sales team lose confidence?",
        why: "Wingman and WyreStorm enablement should target weak points: USB, routing, AVoIP, control, audio and video walls.",
        listenFor: ["USB", "Matrix", "AVoIP", "Audio", "Video wall", "Control"],
        chips: ["USB / BYOD", "Matrix routing", "AVoIP", "Audio", "Video wall", "Control", "Product selection"],
        notePlaceholder: "Capture training gaps and support pain points.",
        category: "Enablement gap",
      },
      {
        id: "attach-opportunity",
        prompt: "Which display, UC or network conversations could WyreStorm attach to?",
        why: "The best sales motion often starts from the product or outcome already being discussed.",
        listenFor: ["Display attach", "MAXHUB", "Hisense", "Netgear", "PTZ", "UC"],
        chips: ["Display attach", "LED attach", "UC / meeting room attach", "Network / Netgear attach", "Camera / PTZ attach", "Hospitality attach"],
        notePlaceholder: "Capture specific brands, verticals or account names if mentioned.",
        category: "Attachment route",
      },
      {
        id: "commercial-next-step",
        prompt: "What would make the next month commercially useful?",
        why: "This turns a relationship conversation into action: training, stock, campaign, target accounts or pre-sales support.",
        listenFor: ["Training", "Stock", "Campaign", "Target accounts", "Joint calls"],
        chips: ["Sales training", "Technical training", "Target account list", "Stock focus", "Joint customer calls", "Campaign idea"],
        notePlaceholder: "Capture next action, owner and urgency.",
        category: "Commercial next step",
      },
    ],
  },
  {
    id: "closing-follow-up",
    title: "Proposal / closing follow-up",
    description: "Use when the call needs to end with clear actions, assumptions and next steps.",
    salesSituation: "After discovery, after a product shortlist, after a proposal draft, or before escalation to pre-sales.",
    Icon: FileText,
    accent: "blue",
    fallbackRoute: "proposal",
    routeLabel: "Open Proposal",
    questions: [
      {
        id: "playback",
        prompt: "Can I play back the requirement to check I have understood it properly?",
        why: "Repeating the requirement prevents wrong proposals and shows consultative control.",
        listenFor: ["Confirmed", "Correction", "Missing point"],
        chips: ["Requirement confirmed", "Needs correction", "Missing details", "Customer unsure"],
        notePlaceholder: "Write the plain-English requirement summary.",
        category: "Requirement playback",
      },
      {
        id: "missing-info",
        prompt: "What information is still missing before this can be proposed safely?",
        why: "This protects the salesperson from over-promising and gives pre-sales a useful handoff.",
        listenFor: ["Distance", "Cable", "USB", "Network", "Audio", "Control", "Budget"],
        chips: ["Distance", "Cable type", "USB details", "Network details", "Audio/control", "Budget", "Nothing obvious"],
        notePlaceholder: "Capture missing information and who can confirm it.",
        category: "Validation",
      },
      {
        id: "approval-path",
        prompt: "Who needs to approve the direction?",
        why: "Approval path changes the proposal language and next action.",
        listenFor: ["End user", "Dealer", "Consultant", "IT", "Finance"],
        chips: ["End user", "Dealer", "Consultant", "IT", "Finance", "Unknown"],
        notePlaceholder: "Capture decision maker, influencer and timing.",
        category: "Decision process",
      },
      {
        id: "next-output",
        prompt: "What output should we send next?",
        why: "The next step should be specific: shortlist, BOM, proposal, review or commercial follow-up.",
        listenFor: ["Shortlist", "BOM", "Proposal", "Review", "Commercials"],
        chips: ["Product shortlist", "BOM", "Proposal draft", "Pre-sales review", "Commercial follow-up"],
        notePlaceholder: "Capture what the customer expects and by when.",
        category: "Next output",
      },
    ],
  },
];

function nowIso() {
  return new Date().toISOString();
}

function answerKey(conversationId: string, questionId: string) {
  return `${conversationId}.${questionId}`;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function readStoredState() {
  if (typeof window === "undefined") {
    return {
      activeConversationId: conversations[0].id,
      activeQuestionIndex: 0,
      answers: {} as Record<string, AnswerCapture>,
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        activeConversationId: conversations[0].id,
        activeQuestionIndex: 0,
        answers: {} as Record<string, AnswerCapture>,
      };
    }

    const parsed = JSON.parse(raw) as {
      activeConversationId?: string;
      activeQuestionIndex?: number;
      answers?: Record<string, AnswerCapture>;
    };

    return {
      activeConversationId: parsed.activeConversationId || conversations[0].id,
      activeQuestionIndex: Number.isFinite(Number(parsed.activeQuestionIndex)) ? Number(parsed.activeQuestionIndex) : 0,
      answers: parsed.answers && typeof parsed.answers === "object" ? parsed.answers : {},
    };
  } catch {
    return {
      activeConversationId: conversations[0].id,
      activeQuestionIndex: 0,
      answers: {} as Record<string, AnswerCapture>,
    };
  }
}

function captureIsUseful(answer: AnswerCapture | undefined) {
  if (!answer) return false;
  if (answer.status === "unknown" || answer.status === "review") return true;
  if (answer.chips.length > 0) return true;
  if (answer.note.trim().length > 0) return true;
  return false;
}

function requirementStatus(status: AnswerStatus): StoredRequirementRecord["status"] {
  if (status === "unknown") return "unknown";
  if (status === "review") return "review";
  return "confirmed";
}

function answerValue(answer: AnswerCapture) {
  const parts = [
    answer.chips.length ? answer.chips.join(", ") : "",
    answer.note.trim(),
    answer.status === "unknown" ? "Unknown / not confirmed" : "",
    answer.status === "review" ? "Needs pre-sales review" : "",
  ].filter(Boolean);

  return parts.join(" | ") || "Captured";
}

export function SalesHelperPage() {
  const storedState = useMemo(() => readStoredState(), []);
  const [activeConversationId, setActiveConversationId] = useState(storedState.activeConversationId);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(storedState.activeQuestionIndex);
  const [answers, setAnswers] = useState<Record<string, AnswerCapture>>(storedState.answers);
  const [copied, setCopied] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const projectGuidance = useMemo(() => {
    const project = getCurrentWorkflowProject(readProjectStore());
    const roomModel = project?.discoveryBrief?.roomModel ?? {};
    const discovery = {
      projectTitle: String(roomModel.roomType || project?.name || "Standalone sales conversation"),
      summary: String(project?.discoveryBrief?.inference?.summary || "Use Sales Helper to capture the conversation before choosing the next Wingman workflow."),
      roomSize: String(roomModel.roomSize || "Not confirmed"),
      displays: String(roomModel.displayArrangement || "Not confirmed"),
      displayCount: String(roomModel.displayCount || ""),
      displayBehaviour: String(roomModel.displayBehaviour || ""),
      sourceCount: String(roomModel.sourceCount || ""),
      usb: String(roomModel.usbTransport || "Not confirmed"),
      distance: String(roomModel.longestRun || "Not confirmed"),
      network: String(roomModel.networkAvailability || ""),
      audio: Array.isArray(roomModel.audioNeeds) ? roomModel.audioNeeds.join(", ") : "",
      control: Array.isArray(roomModel.controlNeeds) ? roomModel.controlNeeds.join(", ") : "",
      budget: String(roomModel.budgetStyle || "Not confirmed"),
    };

    return buildSalesReadinessPackage({
      products: project?.productSelections ?? [],
      discovery,
      assumptions: [...(project?.ingest?.unknowns ?? []), ...(project?.compareRuns?.[0]?.warnings ?? [])],
      ingest: project?.ingest,
      compareRun: project?.compareRuns?.[0] ?? null,
    });
  }, []);

  const activeConversation = useMemo(() => {
    return conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0];
  }, [activeConversationId]);

  const safeQuestionIndex = Math.min(activeQuestionIndex, activeConversation.questions.length - 1);
  const activeQuestion = activeConversation.questions[safeQuestionIndex];

  const getAnswer = useCallback((conversationId: string, questionId: string) => {
    return answers[answerKey(conversationId, questionId)] ?? emptyAnswer;
  }, [answers]);

  const currentAnswer = getAnswer(activeConversation.id, activeQuestion.id);

  const capturedCount = activeConversation.questions.filter((question) => {
    return captureIsUseful(getAnswer(activeConversation.id, question.id));
  }).length;

  const progressPercent = Math.round((capturedCount / activeConversation.questions.length) * 100);
  const hasCapturedAnswers = capturedCount > 0;

  const riskFlags = useMemo(() => {
    const flags: string[] = [];
    const activeAnswers = activeConversation.questions.map((question) => answers[answerKey(activeConversation.id, question.id)] ?? emptyAnswer);
    const chips = activeAnswers.flatMap((answer) => answer.chips).join(" ").toLowerCase();
    const notes = activeAnswers.map((answer) => answer.note).join(" ").toLowerCase();
    const text = `${chips} ${notes}`;

    if (activeAnswers.some((answer) => answer.status === "unknown")) {
      flags.push("One or more important answers are unknown.");
    }

    if (activeAnswers.some((answer) => answer.status === "review")) {
      flags.push("Pre-sales review has been flagged.");
    }

    if (text.includes("usb 3")) {
      flags.push("USB 3.x requirement needs careful product and distance validation.");
    }

    if (text.includes("shared") && text.includes("network")) {
      flags.push("Shared customer network may require IT/multicast validation.");
    }

    if (text.includes("lcd video wall") || text.includes("led wall") || text.includes("multiview")) {
      flags.push("Wall or multiview behaviour must be confirmed before quoting.");
    }

    if (text.includes("lossless") || text.includes("zero latency")) {
      flags.push("Lossless / zero-latency requirement may push the design toward premium transport.");
    }

    if (text.includes("fixed specification")) {
      flags.push("Competitor fixed-spec request should be treated as comparison evidence, not automatic BOM content.");
    }

    return unique(flags);
  }, [activeConversation, answers]);

  const recommendedRoute = useMemo<WingmanRouteKey>(() => {
    const activeAnswers = activeConversation.questions.map((question) => answers[answerKey(activeConversation.id, question.id)] ?? emptyAnswer);
    const text = activeAnswers
      .flatMap((answer) => [...answer.chips, answer.note])
      .join(" ")
      .toLowerCase();

    if (activeConversation.id === "room-requirement") {
      if (text.includes("standard room template")) return "templates";
      return "discovery";
    }

    if (activeConversation.id === "display-attach") {
      if (text.includes("video wall") || text.includes("led wall") || text.includes("lcd") || text.includes("multiview")) return "videowall";
      return "discovery";
    }

    if (activeConversation.id === "signal-enquiry") return "finder";
    if (activeConversation.id === "conferencing-usb") return "discovery";
    if (activeConversation.id === "competitor-sku") return "compare";
    if (activeConversation.id === "distributor-development") return "callCards";

    if (activeConversation.id === "closing-follow-up") {
      if (riskFlags.length > 0) return "support";
      return "proposal";
    }

    return activeConversation.fallbackRoute;
  }, [activeConversation, answers, riskFlags.length]);

  const recommendedDestination = routeCatalogByKey[recommendedRoute];

  const summaryText = useMemo(() => {
    const lines: string[] = [];
    lines.push("Wingman Sales Helper summary");
    lines.push("");
    lines.push(`Conversation type: ${activeConversation.title}`);
    lines.push(`Recommended next step: ${recommendedDestination.label}`);
    lines.push(`Sales motion: ${projectGuidance.outputPurpose.motion}`);
    lines.push(`Readiness: ${projectGuidance.readinessScore}%`);
    lines.push("");

    activeConversation.questions.forEach((question) => {
      const answer = getAnswer(activeConversation.id, question.id);
      if (!captureIsUseful(answer)) return;

      lines.push(question.prompt);
      lines.push(`Answer: ${answerValue(answer)}`);
      lines.push(`Why it matters: ${question.why}`);
      lines.push("");
    });

    if (riskFlags.length > 0) {
      lines.push("Risk / review flags:");
      riskFlags.forEach((flag) => lines.push(`- ${flag}`));
      lines.push("");
    }

    lines.push(`Next action: Open ${recommendedDestination.label} in Wingman.`);

    return lines.join("\n");
  }, [activeConversation, getAnswer, projectGuidance.outputPurpose.motion, projectGuidance.readinessScore, recommendedDestination.label, riskFlags]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeConversationId,
        activeQuestionIndex: safeQuestionIndex,
        answers,
      }),
    );
  }, [activeConversationId, safeQuestionIndex, answers]);

  function selectConversation(conversationId: string) {
    setActiveConversationId(conversationId);
    setActiveQuestionIndex(0);
    setSaveMessage("");
  }

  function updateQuestionAnswer(question: SalesQuestion, updater: (answer: AnswerCapture) => AnswerCapture) {
    const key = answerKey(activeConversation.id, question.id);
    setAnswers((current) => {
      const existing = current[key] ?? emptyAnswer;
      return {
        ...current,
        [key]: {
          ...updater(existing),
          updatedAt: nowIso(),
        },
      };
    });
    setSaveMessage("");
  }

  function toggleChip(chip: string) {
    updateQuestionAnswer(activeQuestion, (answer) => {
      const nextChips = answer.chips.includes(chip)
        ? answer.chips.filter((item) => item !== chip)
        : [...answer.chips, chip];

      return {
        ...answer,
        chips: nextChips,
        status: nextChips.length > 0 || answer.note.trim() ? "answered" : "unanswered",
      };
    });
  }

  function updateNote(event: ChangeEvent<HTMLTextAreaElement>) {
    const note = event.target.value;

    updateQuestionAnswer(activeQuestion, (answer) => ({
      ...answer,
      note,
      status: note.trim() || answer.chips.length > 0 ? "answered" : "unanswered",
    }));
  }

  function markUnknown() {
    updateQuestionAnswer(activeQuestion, (answer) => ({
      ...answer,
      status: "unknown",
    }));
  }

  function markReview() {
    updateQuestionAnswer(activeQuestion, (answer) => ({
      ...answer,
      status: "review",
    }));
  }

  function goPrevious() {
    setActiveQuestionIndex((current) => Math.max(0, current - 1));
  }

  function goNext() {
    setActiveQuestionIndex((current) => Math.min(activeConversation.questions.length - 1, current + 1));
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function clearActiveConversation() {
    setAnswers((current) => {
      const next = { ...current };
      activeConversation.questions.forEach((question) => {
        delete next[answerKey(activeConversation.id, question.id)];
      });
      return next;
    });
    setActiveQuestionIndex(0);
    setSaveMessage("");
    setCopied(false);
  }

  function saveCapture() {
    const records: StoredRequirementRecord[] = activeConversation.questions
      .map((question) => {
        const answer = getAnswer(activeConversation.id, question.id);
        if (!captureIsUseful(answer)) return null;

        return {
          id: `sales-helper-${activeConversation.id}-${question.id}`,
          label: question.prompt,
          value: answerValue(answer),
          category: `Sales Helper - ${question.category}`,
          source: "Sales Helper",
          status: requirementStatus(answer.status),
          whyItMatters: question.why,
          updatedAt: nowIso(),
        } satisfies StoredRequirementRecord;
      })
      .filter((item): item is StoredRequirementRecord => Boolean(item));

    const payload = {
      savedAt: nowIso(),
      conversationType: activeConversation.title,
      recommendedRoute,
      recommendedRoutePath: recommendedDestination.path,
      summary: summaryText,
      riskFlags,
      answers: records,
    };

    window.localStorage.setItem(LATEST_CAPTURE_KEY, JSON.stringify(payload));

    if (records.length < 1) {
      setSaveMessage("Capture at least one answer before saving.");
      return;
    }

    const project = getCurrentWorkflowProject(readProjectStore());

    if (!project) {
      setSaveMessage("Saved locally. Open or create a project if you want this attached to a project record.");
      return;
    }

    const recordIds = new Set(records.map((record) => record.id));
    const retainedRequirements = (project.requirements ?? []).filter((requirement) => !recordIds.has(requirement.id));

    saveProjectRequirementsToProject(project.id, [...retainedRequirements, ...records]);
    setSaveMessage(`Saved ${records.length} Sales Helper item${records.length === 1 ? "" : "s"} to ${project.name}.`);
  }

  const ConversationIcon = activeConversation.Icon;

  return (
    <div className="pb-6">
      <PageHero
        eyebrow="Sales Helper"
        title="Guide the sales conversation one question at a time."
        purpose="Choose the type of conversation, capture quick answers, flag unknowns, and move the opportunity into the right Wingman workflow."
        nextMove="Start with the customer situation. Wingman will show the next best question, capture the answer, and recommend the next action."
        actions={[
          { label: "Open discovery", to: routeCatalogByKey.discovery.path },
          { label: "Open finder", to: routeCatalogByKey.finder.path, variant: "secondary" },
          { label: "Open proposal", to: routeCatalogByKey.proposal.path, variant: "secondary" },
        ]}
      />

      <div className="space-y-5">
        <SectionCard
          title="1. Choose the conversation type"
          subtitle="Sales Helper now starts from the call situation rather than showing a static wall of text boxes."
        >
          <WingmanSelectionGrid columns={3}>
            {conversations.map((conversation) => {
              const Icon = conversation.Icon;
              const selected = conversation.id === activeConversation.id;
              const answeredCount = conversation.questions.filter((question) => {
                return captureIsUseful(getAnswer(conversation.id, question.id));
              }).length;

              return (
                <WingmanSelectionCard
                  key={conversation.id}
                  onClick={() => selectConversation(conversation.id)}
                  title={conversation.title}
                  description={conversation.description}
                  eyebrow={conversation.salesSituation}
                  icon={Icon}
                  accent={conversation.accent}
                  selected={selected}
                  indicator={selected ? "recommended" : undefined}
                  metaBadges={answeredCount > 0 ? [`${answeredCount} captured`] : undefined}
                />
              );
            })}
          </WingmanSelectionGrid>
        </SectionCard>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <SectionCard
            title="2. Ask this next"
            subtitle="Only the current question is shown prominently. Previous answers stay in the summary panel."
            rightSlot={
              <div className="flex items-center gap-2 rounded-full border border-[#29465e] bg-[#0d2133] px-3 py-2 text-sm font-black text-white/70">
                <ConversationIcon className="h-4 w-4 text-cyan-500" />
                {capturedCount}/{activeConversation.questions.length} captured
              </div>
            }
          >
            <div className="rounded-3xl border border-[#29465e] bg-[#0d2133] p-4">
              <div className="mb-5 h-2 overflow-hidden rounded-full bg-[#0d2133]">
                <div
                  className="h-full rounded-full bg-slate-950 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="rounded-3xl border border-[#29465e] bg-[#0d2133] p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#f7fbff]">
                      Question {safeQuestionIndex + 1}
                    </span>
                    <span className="rounded-full bg-[#0d2133] px-3 py-1 text-xs font-bold text-white/60">
                      {activeQuestion.category}
                    </span>
                    {currentAnswer.status === "unknown" ? (
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                        Unknown
                      </span>
                    ) : null}
                    {currentAnswer.status === "review" ? (
                      <span className="rounded-full bg-cyan-600 px-3 py-1 text-xs font-black text-white">
                        Needs review
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-white">
                    {activeQuestion.prompt}
                  </h2>

                  <details className="mt-4 rounded-2xl border border-[#29465e] bg-[#0d2133] p-3 text-white/70">
                    <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                      <HelpCircle className="h-4 w-4 text-white/55" />
                      Why this matters
                    </summary>
                    <p className="mt-2 text-sm leading-6">{activeQuestion.why}</p>
                  </details>

                  <div className="mt-5">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-white/55">
                      Quick answer chips
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeQuestion.chips.map((chip) => {
                        const selected = currentAnswer.chips.includes(chip);

                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => toggleChip(chip)}
                            className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                              selected
                                ? "border-slate-950 bg-slate-950 text-white"
                                : "border-[#29465e] bg-[#0d2133] text-white/70 hover:border-cyan-300 hover:bg-[#0d2133]"
                            }`}
                          >
                            {chip}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="mt-5 block">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-white/55">
                      Optional note
                    </span>
                    <textarea
                      value={currentAnswer.note}
                      onChange={updateNote}
                      rows={3}
                      placeholder={activeQuestion.notePlaceholder}
                      className="mt-2 min-h-[84px] w-full resize-y rounded-2xl border border-[#29465e] bg-[#0d2133] px-4 py-3 text-sm leading-6 text-[#edf6ff] outline-none transition placeholder:text-[#8aa6b8] focus:border-[#4af5e6] focus:ring-4 focus:ring-[#4af5e6]/30"
                    />
                  </label>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={goPrevious}
                        disabled={safeQuestionIndex === 0}
                        className="inline-flex items-center gap-2 rounded-full border border-[#29465e] bg-[#0d2133] px-4 py-2 text-sm font-black text-white/70 transition hover:bg-[#0d2133] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        disabled={safeQuestionIndex === activeConversation.questions.length - 1}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-[#13283a]"
                      >
                        Next question
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={markUnknown}
                        className="rounded-full border border-[#29465e] bg-[#0d2133] px-4 py-2 text-sm font-black text-white/70 transition hover:bg-[#0d2133]"
                      >
                        Mark unknown
                      </button>
                      <button
                        type="button"
                        onClick={markReview}
                        className="rounded-full border border-cyan-300 bg-[#0d2133] px-4 py-2 text-sm font-black text-[#f7fbff] transition hover:bg-[#102b44]"
                      >
                        Needs review
                      </button>
                    </div>
                  </div>
                </div>

                <aside className="rounded-3xl border border-[#29465e] bg-[#0d2133] p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-black text-white">
                    <Search className="h-4 w-4 text-cyan-500" />
                    Listen for
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeQuestion.listenFor.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-[#29465e] bg-[#0d2133] px-3 py-1 text-xs font-bold text-white/60"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-white/55">
                      Recommended next action
                    </p>
                    <p className="mt-2 text-lg font-black text-white">{recommendedDestination.label}</p>
                    <p className="mt-2 text-sm leading-6 text-white/60">
                      This is based on the selected conversation type and captured answers.
                    </p>
                    <Link
                      to={recommendedDestination.path}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800"
                    >
                      Open workflow
                      <MoveRight className="h-4 w-4" />
                    </Link>
                  </div>

                  {riskFlags.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-cyan-200 bg-[#0d2133] p-4 text-[#f7fbff]">
                      <div className="flex items-center gap-2 text-sm font-black">
                        <AlertTriangle className="h-4 w-4" />
                        Review flags
                      </div>
                      <ul className="mt-3 space-y-2 text-sm leading-6">
                        {riskFlags.map((flag) => (
                          <li key={flag}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </aside>
              </div>
            </div>
          </SectionCard>

          <div className="space-y-5">
            <SectionCard
              title="Captured summary"
              subtitle="Copy this into an email, proposal note, CRM record or the next Wingman workflow."
              rightSlot={
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copySummary}
                    disabled={!hasCapturedAnswers}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-[#13283a]"
                  >
                    {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={clearActiveConversation}
                    className="inline-flex items-center gap-2 rounded-full border border-[#29465e] bg-[#0d2133] px-4 py-2 text-sm font-black text-white/70 transition hover:bg-[#0d2133]"
                  >
                    <Eraser className="h-4 w-4" />
                    Clear
                  </button>
                </div>
              }
            >
              <div className="rounded-2xl border border-[#29465e] bg-slate-950 p-4 text-slate-100">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-300">
                  <ClipboardList className="h-4 w-4" />
                  Live sales capture
                </div>
                <pre className="mt-3 max-h-[240px] overflow-auto whitespace-pre-wrap text-sm leading-6 text-slate-200">
                  {hasCapturedAnswers ? summaryText : "No answers captured yet. Start with the active question and use quick chips or notes."}
                </pre>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
                <div>
                  <p className="text-sm font-black text-white">Save this capture</p>
                  <p className="mt-1 text-sm leading-6 text-white/60">
                    Saves locally every time. If a project is active, it also writes these answers into project requirements.
                  </p>
                  {saveMessage ? <p className="mt-2 text-sm font-black text-cyan-700">{saveMessage}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={saveCapture}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0d2133]0 px-4 py-2 text-sm font-black text-white transition hover:bg-[#4af5e6]"
                >
                  <Save className="h-4 w-4" />
                  Save capture
                </button>
              </div>
            </SectionCard>

            <SectionCard title="Project-aware guidance" subtitle="Compact status from the active project, where available.">
              <div
                className={`rounded-2xl border p-5 ${
                  projectGuidance.reviewRequired
                    ? "border-cyan-200 bg-[#0d2133] text-[#f7fbff]"
                    : "border-[#29465e] bg-[#0d2133] text-[#f7fbff]"
                }`}
              >
                <p className="text-sm font-black uppercase tracking-[0.14em]">Readiness</p>
                <p className="mt-3 text-5xl font-black">{projectGuidance.readinessScore}%</p>
                <p className="mt-3 text-sm leading-6">
                  {projectGuidance.reviewRequired
                    ? "Use this as sales guidance. Validate before sending final customer output."
                    : "Good enough to move toward a draft, with final checks before issue."}
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4 text-sm leading-6 text-white/70">
                  <p className="flex items-center gap-2 font-black text-[#edf6ff]">
                    <MessageSquareText className="h-4 w-4 text-cyan-500" />
                    {projectGuidance.outputPurpose.motion}
                  </p>
                  <p className="mt-2">{projectGuidance.outputPurpose.customerOutput}</p>
                </div>
                {projectGuidance.repGuidance.slice(0, 2).map((item) => (
                  <div key={item} className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4 text-sm leading-6 text-white/70">
                    {item}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>

      </div>
    </div>
  );
}

