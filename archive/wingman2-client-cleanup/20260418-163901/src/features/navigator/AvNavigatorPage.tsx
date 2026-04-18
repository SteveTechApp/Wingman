import * as React from "react";
import { useNavigate } from "react-router-dom";
import SplitWorkspaceFrame from "@/components/workspace/SplitWorkspaceFrame";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  buildRoomWorkflowGuidance,
  getRouteLabel,
} from "@/features/import/intakeExperience";
import {
  ensureActiveProject,
  getActiveProject,
  setActiveProjectId,
  subscribeProjects,
  updateProject,
  type DiscoveryProductFamily,
} from "@/features/projects/projectStore";
import {
  DEFAULT_ROOM_TEMPLATE_ID,
  findBestRoomTemplateForProject,
  findRoomTemplateById,
} from "@/features/templates/roomWorkflowContext";
import {
  ROOM_TEMPLATE_CATEGORY_ORDER,
  ROOM_TEMPLATE_LIBRARY,
  type RoomTemplateScenario,
} from "@/features/templates/roomTemplateLibrary";
import "./avNavigator.css";

type NavigatorTrackId = "shape-room" | "prepare-call" | "capture-call";

type NavigatorQuestion = {
  id: string;
  prompt: string;
  helper: string;
  type: "single" | "multi" | "text";
  options?: string[];
  placeholder?: string;
};

type NavigatorTrack = {
  id: NavigatorTrackId;
  title: string;
  subtitle: string;
  summary: string;
  questions: NavigatorQuestion[];
};

type NavigatorSummary = {
  title: string;
  summary: string;
  signals: string[];
  prompts: string[];
  routes: string[];
  routeReasoning: string;
  recommendedFamilies: DiscoveryProductFamily[];
};

const TRACKS: NavigatorTrack[] = [
  {
    id: "shape-room",
    title: "Choose the room direction",
    subtitle: "Use this when the room is still taking shape and you need the clearest next workflow.",
    summary: "Start with the room type, capture only the few assumptions that really move the design, then let Wingman point you to the next tool.",
    questions: [
      {
        id: "outcome",
        prompt: "What should this room do well?",
        helper: "Choose the outcomes the customer will actually notice day to day.",
        type: "multi",
        options: [
          "Easy presentation",
          "Hybrid meetings",
          "Several displays or zones",
          "Simple staff control",
          "Future growth",
        ],
      },
      {
        id: "risk",
        prompt: "What feels most sensitive technically?",
        helper: "Pick the thing most likely to change the design direction.",
        type: "single",
        options: [
          "Nothing major yet",
          "Long cable runs",
          "USB cameras or peripherals",
          "More sources and displays",
          "Scaling later",
        ],
      },
      {
        id: "nextNeed",
        prompt: "What do you need next from Wingman?",
        helper: "This makes the recommended next tool much more direct.",
        type: "single",
        options: [
          "Choose the workflow",
          "Shortlist products",
          "Build proposal direction",
          "Sense-check the room",
        ],
      },
      {
        id: "notes",
        prompt: "What is the customer actually saying?",
        helper: "Discovery language you want the next tool to inherit.",
        type: "text",
        placeholder: "Customer language, room notes, or project intent...",
      },
    ],
  },
  {
    id: "prepare-call",
    title: "Prepare for the next customer call",
    subtitle: "Use this when you know the room and want the best conversation angle before the meeting.",
    summary: "Turn the room type into a cleaner call plan: what to lead with, what may block the sale, and which Wingman tool should support the next step.",
    questions: [
      {
        id: "customer",
        prompt: "Who is the customer or opportunity?",
        helper: "Account name, site, or opportunity name is enough to anchor the summary.",
        type: "text",
        placeholder: "Customer, site, or opportunity...",
      },
      {
        id: "pressure",
        prompt: "What are they trying to improve?",
        helper: "Choose the things most likely to create momentum in the next call.",
        type: "multi",
        options: [
          "Simpler meetings",
          "Refresh an old system",
          "More displays or zones",
          "Standardise many rooms",
          "Competitive benchmark",
          "Reduce support pain",
        ],
      },
      {
        id: "blocker",
        prompt: "What could slow the sale down?",
        helper: "Pick the main risks rather than everything that might go wrong.",
        type: "multi",
        options: [
          "Price pressure",
          "Complexity worries",
          "Existing brand loyalty",
          "Need more proof",
          "Room scope still unclear",
        ],
      },
      {
        id: "notes",
        prompt: "What should the next salesperson remember?",
        helper: "Capture tone, urgency, or any language worth mirroring back.",
        type: "text",
        placeholder: "Call prep notes...",
      },
    ],
  },
  {
    id: "capture-call",
    title: "Capture what you learned",
    subtitle: "Use this right after a customer call to organise the room, the blockers, and the next move.",
    summary: "Keep the summary short, plain, and actionable so the next tool opens with a usable project readout instead of scattered notes.",
    questions: [
      {
        id: "stage",
        prompt: "Where is the customer now?",
        helper: "Choose the rough stage that best matches the conversation.",
        type: "single",
        options: [
          "Early interest",
          "Comparing options",
          "Shortlisting now",
          "Trying to fix a live issue",
        ],
      },
      {
        id: "positive",
        prompt: "What landed well?",
        helper: "Write down what they responded positively to.",
        type: "text",
        placeholder: "What seemed to resonate...",
      },
      {
        id: "blocker",
        prompt: "What still feels stuck?",
        helper: "Pick the blockers that need the clearest next action.",
        type: "multi",
        options: [
          "Budget pressure",
          "Need more clarity",
          "Brand loyalty elsewhere",
          "Too much complexity",
          "Support concerns",
          "Need rollout confidence",
        ],
      },
      {
        id: "nextNeed",
        prompt: "What should happen next?",
        helper: "Choose the next piece of work you want Wingman to take forward.",
        type: "single",
        options: [
          "Room workflow",
          "Product shortlist",
          "Competitive answer",
          "Proposal scope",
          "Project review",
        ],
      },
      {
        id: "notes",
        prompt: "Anything else the team should carry forward?",
        helper: "Add only the detail that would genuinely help the next person.",
        type: "text",
        placeholder: "Follow-up notes...",
      },
    ],
  },
];

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function dedupeStrings(values: unknown[], limit = 12): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const text = tidy(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }

  return out;
}

function dedupeFamilies(values: unknown[]): DiscoveryProductFamily[] {
  const allowed: DiscoveryProductFamily[] = [
    "Apollo",
    "HDBaseT",
    "AVoIP",
    "Matrix",
    "USB Extension",
    "Video Wall",
  ];
  const out: DiscoveryProductFamily[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const text = tidy(value).toLowerCase();
    const match = allowed.find((item) => item.toLowerCase() === text);
    if (!match || seen.has(match.toLowerCase())) continue;
    seen.add(match.toLowerCase());
    out.push(match);
  }

  return out;
}

function arrayValue(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  return typeof value === "string" && value ? [value] : [];
}

function textValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "";
}

function toggleMultiValue(current: string | string[] | undefined, next: string): string[] {
  const values = arrayValue(current);
  return values.includes(next) ? values.filter((item) => item !== next) : [...values, next];
}

function countAnswers(track: NavigatorTrack, answers: Record<string, string | string[]>) {
  return track.questions.reduce((count, question) => {
    const value = answers[question.id];
    return count + (question.type === "multi" ? Number(arrayValue(value).length > 0) : Number(Boolean(textValue(value).trim())));
  }, 0);
}

function firstUnansweredIndex(track: NavigatorTrack, answers: Record<string, string | string[]>) {
  return track.questions.findIndex((question) => {
    const value = answers[question.id];
    return question.type === "multi" ? arrayValue(value).length === 0 : !textValue(value).trim();
  });
}

function buildRoomSearchBlob(room: RoomTemplateScenario): string {
  return [
    room.roomType,
    room.vertical,
    room.summary,
    ...room.useCases,
    ...room.sourceTypes,
    ...room.outputTypes,
    ...room.recommendedFamilies,
  ]
    .join(" ")
    .toLowerCase();
}

function labelNavigatorRoute(route: string): string {
  if (route === WM_ROUTES.compare) return "Competitor Compare";
  if (route === WM_ROUTES.catalog) return "Catalog";
  if (route === WM_ROUTES.guru) return "Guru";
  if (route === WM_ROUTES.sales) return "Sales Positioning";
  if (route === WM_ROUTES.proposal) return "Proposal Builder";
  if (route === WM_ROUTES.roomWizard) return "Room Wizard";
  if (route === WM_ROUTES.discovery) return "Discovery";
  return getRouteLabel(route);
}

function buildTemplateTier(room: RoomTemplateScenario): "Bronze" | "Silver" | "Gold" {
  if (room.templateTier === "bronze") return "Bronze";
  if (room.templateTier === "gold") return "Gold";
  return "Silver";
}

function mergeNotes(existing: string | undefined, next: string) {
  const current = tidy(existing);
  const incoming = tidy(next);
  if (!current) return incoming;
  if (!incoming || current.includes(incoming)) return current;
  return `${current}\n\n${incoming}`;
}

function buildWorkflowSummary(
  room: RoomTemplateScenario,
  answers: Record<string, string | string[]>,
): {
  guidance: ReturnType<typeof buildRoomWorkflowGuidance>;
  routes: string[];
  prompts: string[];
  extraSignals: string[];
  summary: string;
  routeReasoning: string;
} {
  const outcomes = arrayValue(answers.outcome);
  const risk = textValue(answers.risk);
  const nextNeed = textValue(answers.nextNeed);

  const displayCount = outcomes.includes("Several displays or zones")
    ? Math.max(room.ioProfile.displayCount, 4)
    : room.ioProfile.displayCount;
  const sourceCount = outcomes.includes("Several displays or zones")
    ? Math.max(room.ioProfile.sourceCount, 4)
    : room.ioProfile.sourceCount;
  const distanceM =
    risk === "Long cable runs"
      ? 45
      : risk === "More sources and displays"
        ? 30
        : 18;
  const usbNeeds =
    outcomes.includes("Hybrid meetings")
    || risk === "USB cameras or peripherals"
    || room.recommendedFamilies.includes("USB Extension");
  const futureExpansion =
    outcomes.includes("Future growth")
    || risk === "Scaling later";
  const networkReady =
    futureExpansion
    || room.recommendedFamilies.includes("AVoIP")
    || room.ioProfile.displayCount >= 6;

  const guidance = buildRoomWorkflowGuidance({
    room,
    sourceCount,
    displayCount,
    distanceM,
    usbNeeds,
    networkReady,
    futureExpansion,
  });

  let primaryRoute = guidance.primaryRoute;
  if (nextNeed === "Shortlist products") primaryRoute = WM_ROUTES.catalog;
  if (nextNeed === "Build proposal direction") primaryRoute = WM_ROUTES.proposal;
  if (nextNeed === "Sense-check the room") primaryRoute = WM_ROUTES.guru;

  const routes = dedupeStrings([
    primaryRoute,
    guidance.primaryRoute,
    guidance.secondaryRoute,
    WM_ROUTES.sales,
  ], 3);

  const prompts = dedupeStrings([
    outcomes.includes("Hybrid meetings")
      ? "Do users need room USB peripherals, or only fast presentation and display switching?"
      : "",
    outcomes.includes("Several displays or zones")
      ? "Do those screens show the same content, or will some zones need independent routing?"
      : "",
    outcomes.includes("Future growth")
      ? "Is this just one room today, or the start of a wider room standard?"
      : "",
    outcomes.includes("Simple staff control")
      ? "Who will actually run the room day to day when the pressure is on?"
      : "",
    risk === "Long cable runs"
      ? "What is the real longest signal run once rack and display positions are confirmed?"
      : "",
  ], 4);

  return {
    guidance,
    routes,
    prompts,
    extraSignals: outcomes,
    summary: `${room.roomType} looks like a ${guidance.complexityLabel.toLowerCase()} and should move next into ${labelNavigatorRoute(primaryRoute)}.`,
    routeReasoning: guidance.routeSummary,
  };
}

function buildPrepareCallSummary(
  room: RoomTemplateScenario,
  answers: Record<string, string | string[]>,
): NavigatorSummary {
  const pressure = arrayValue(answers.pressure);
  const blockers = arrayValue(answers.blocker);

  const recommendedFamilies = dedupeFamilies([
    ...room.recommendedFamilies,
    ...(pressure.includes("Simpler meetings") ? ["Apollo", "USB Extension"] : []),
    ...(pressure.includes("Refresh an old system") ? ["HDBaseT", "Matrix"] : []),
    ...(pressure.includes("More displays or zones") ? ["Matrix"] : []),
    ...(pressure.includes("Standardise many rooms") ? ["AVoIP", "Matrix"] : []),
  ]);

  let primaryRoute: string = WM_ROUTES.sales;
  if (pressure.includes("Competitive benchmark") || blockers.includes("Existing brand loyalty")) {
    primaryRoute = WM_ROUTES.compare;
  } else if (pressure.includes("Standardise many rooms")) {
    primaryRoute = WM_ROUTES.proposal;
  } else if (blockers.includes("Room scope still unclear")) {
    primaryRoute = WM_ROUTES.discovery;
  }

  return {
    title: `Call plan for ${room.roomType}`,
    summary: `Lead the next conversation around the ${room.roomType.toLowerCase()} outcome, not the part number. Keep the value story tight and only add technical detail where it removes risk.`,
    signals: dedupeStrings([
      room.roomType,
      ...pressure,
      ...blockers,
      ...recommendedFamilies,
    ], 8),
    prompts: dedupeStrings([
      pressure.includes("Simpler meetings")
        ? "What slows the room down today when people walk in and try to start?"
        : "",
      pressure.includes("Refresh an old system")
        ? "What is painful about the current system: reliability, support, or usability?"
        : "",
      pressure.includes("Standardise many rooms")
        ? "How many rooms could this turn into if the first space lands well?"
        : "",
      blockers.includes("Need more proof")
        ? "What proof will actually move the decision: product fit, support story, or rollout confidence?"
        : "",
      blockers.includes("Price pressure")
        ? "What operational pain is costing them more than the product line item?"
        : "",
    ], 4),
    routes: dedupeStrings([
      primaryRoute,
      WM_ROUTES.catalog,
      WM_ROUTES.guru,
    ], 3),
    routeReasoning: primaryRoute === WM_ROUTES.compare
      ? "The next conversation needs a stronger competitive answer before it needs more product depth."
      : primaryRoute === WM_ROUTES.proposal
        ? "This already feels like a broader room or rollout conversation, so commercial scope should stay visible."
        : "The next call will benefit most from a room-first sales angle and a tighter shortlist.",
    recommendedFamilies,
  };
}

function buildCaptureCallSummary(
  room: RoomTemplateScenario,
  answers: Record<string, string | string[]>,
): NavigatorSummary {
  const stage = textValue(answers.stage);
  const blockers = arrayValue(answers.blocker);
  const nextNeed = textValue(answers.nextNeed);

  let primaryRoute: string = WM_ROUTES.guru;
  if (nextNeed === "Room workflow") primaryRoute = room.recommendedTool || WM_ROUTES.roomWizard;
  if (nextNeed === "Product shortlist") primaryRoute = WM_ROUTES.catalog;
  if (nextNeed === "Competitive answer") primaryRoute = WM_ROUTES.compare;
  if (nextNeed === "Proposal scope") primaryRoute = WM_ROUTES.proposal;
  if (stage === "Trying to fix a live issue") primaryRoute = WM_ROUTES.guru;

  const recommendedFamilies = dedupeFamilies([
    ...room.recommendedFamilies,
    ...(blockers.includes("Need rollout confidence") ? ["AVoIP"] : []),
    ...(blockers.includes("Too much complexity") ? ["Apollo"] : []),
    ...(blockers.includes("Brand loyalty elsewhere") ? ["Matrix", "HDBaseT"] : []),
  ]);

  return {
    title: `Call readout for ${room.roomType}`,
    summary: `The call now needs a practical next step, not more scattered notes. Keep the follow-up focused on one action the customer can understand and the team can execute.`,
    signals: dedupeStrings([
      stage,
      ...blockers,
      ...recommendedFamilies,
      textValue(answers.positive),
    ], 8),
    prompts: dedupeStrings([
      blockers.includes("Need more clarity")
        ? "What single missing detail would make the next recommendation feel much safer?"
        : "",
      blockers.includes("Brand loyalty elsewhere")
        ? "Which brand assumption do we need to challenge with confidence next time?"
        : "",
      blockers.includes("Too much complexity")
        ? "What can we simplify in the story before the next call?"
        : "",
      nextNeed === "Proposal scope"
        ? "What would need to be true for the customer to accept a proposal-ready direction?"
        : "",
      nextNeed === "Product shortlist"
        ? "What room assumptions must stay true before we narrow to a final shortlist?"
        : "",
    ], 4),
    routes: dedupeStrings([
      primaryRoute,
      WM_ROUTES.sales,
      WM_ROUTES.guru,
    ], 3),
    routeReasoning: `The clearest next move is ${labelNavigatorRoute(primaryRoute)} because that is where this follow-up can turn into a real decision.`,
    recommendedFamilies,
  };
}

function buildNavigatorSummary(
  track: NavigatorTrack,
  room: RoomTemplateScenario,
  answers: Record<string, string | string[]>,
): NavigatorSummary {
  if (track.id === "prepare-call") {
    return buildPrepareCallSummary(room, answers);
  }

  if (track.id === "capture-call") {
    return buildCaptureCallSummary(room, answers);
  }

  const workflow = buildWorkflowSummary(room, answers);
  return {
    title: `Room direction for ${room.roomType}`,
    summary: workflow.summary,
    signals: dedupeStrings([
      room.roomType,
      ...workflow.guidance.signalSummary,
      ...workflow.extraSignals,
      ...workflow.guidance.recommendedFamilies,
    ], 9),
    prompts: workflow.prompts,
    routes: workflow.routes,
    routeReasoning: workflow.routeReasoning,
    recommendedFamilies: workflow.guidance.recommendedFamilies,
  };
}

function suggestProjectName(
  track: NavigatorTrack,
  room: RoomTemplateScenario,
  answers: Record<string, string | string[]>,
) {
  if (track.id === "prepare-call") {
    return tidy(answers.customer) || room.roomType;
  }
  return `${room.roomType} Opportunity`;
}

function buildNavigatorSessionBlock(
  track: NavigatorTrack,
  room: RoomTemplateScenario,
  answers: Record<string, string | string[]>,
  summary: NavigatorSummary,
) {
  const rows = track.questions.flatMap((question) => {
    const value = question.type === "multi" ? arrayValue(answers[question.id]).join(", ") : textValue(answers[question.id]).trim();
    return value ? [`- ${question.prompt}: ${value}`] : [];
  });

  return [
    `Navigator room: ${room.roomType}`,
    `Navigator track: ${track.title}`,
    summary.summary,
    summary.signals.length ? `Signals: ${summary.signals.join("; ")}` : "",
    summary.prompts.length ? `Ask next: ${summary.prompts.join(" | ")}` : "",
    rows.length ? `Captured notes:\n${rows.join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
}

export default function AvNavigatorPage() {
  const navigate = useNavigate();
  const activeProject = React.useSyncExternalStore(subscribeProjects, getActiveProject, () => undefined);
  const inferredRoom = React.useMemo(
    () =>
      findRoomTemplateById(activeProject?.template?.templateId)
      || findBestRoomTemplateForProject(activeProject)
      || ROOM_TEMPLATE_LIBRARY[0],
    [activeProject],
  );

  const [category, setCategory] = React.useState<(typeof ROOM_TEMPLATE_CATEGORY_ORDER)[number]>("All Rooms");
  const [roomQuery, setRoomQuery] = React.useState("");
  const [roomId, setRoomId] = React.useState(inferredRoom?.id || DEFAULT_ROOM_TEMPLATE_ID);
  const [trackId, setTrackId] = React.useState<NavigatorTrackId>("shape-room");
  const [saveMessage, setSaveMessage] = React.useState("");
  const [answersByTrack, setAnswersByTrack] = React.useState<Record<NavigatorTrackId, Record<string, string | string[]>>>({
    "shape-room": {},
    "prepare-call": {},
    "capture-call": {},
  });

  React.useEffect(() => {
    setRoomId(inferredRoom?.id || DEFAULT_ROOM_TEMPLATE_ID);
  }, [activeProject?.id, inferredRoom?.id]);

  const selectedRoom = React.useMemo(
    () => findRoomTemplateById(roomId) || inferredRoom || ROOM_TEMPLATE_LIBRARY[0],
    [inferredRoom, roomId],
  );

  const visibleRooms = React.useMemo(() => {
    const q = tidy(roomQuery).toLowerCase();
    return ROOM_TEMPLATE_LIBRARY.filter((room) => {
      const matchesCategory = category === "All Rooms" || room.category === category;
      if (!matchesCategory) return false;
      if (!q) return true;
      return buildRoomSearchBlob(room).includes(q);
    });
  }, [category, roomQuery]);

  const activeTrack = React.useMemo(
    () => TRACKS.find((track) => track.id === trackId) ?? TRACKS[0],
    [trackId],
  );
  const answers = answersByTrack[trackId];
  const answerCount = countAnswers(activeTrack, answers);
  const firstPending = firstUnansweredIndex(activeTrack, answers);
  const summary = React.useMemo(
    () => buildNavigatorSummary(activeTrack, selectedRoom, answers),
    [activeTrack, answers, selectedRoom],
  );
  const primaryRoute = summary.routes[0] ?? WM_ROUTES.discovery;

  function setAnswer(questionId: string, value: string | string[]) {
    setAnswersByTrack((previous) => ({
      ...previous,
      [trackId]: {
        ...previous[trackId],
        [questionId]: value,
      },
    }));
    setSaveMessage("");
  }

  function resetTrack() {
    setAnswersByTrack((previous) => ({
      ...previous,
      [trackId]: {},
    }));
    setSaveMessage("");
  }

  function persistNavigator(route?: string) {
    const nextRoute = route ?? primaryRoute;
    const suggestedName = suggestProjectName(activeTrack, selectedRoom, answers);
    const customerName = activeTrack.id === "prepare-call" ? textValue(answers.customer).trim() : activeProject?.customer?.trim() || "";
    const sessionBlock = buildNavigatorSessionBlock(activeTrack, selectedRoom, answers, summary);
    const project = ensureActiveProject({
      name: activeProject?.name?.trim() && activeProject.name.trim() !== "New Project" ? activeProject.name : suggestedName,
      customer: activeProject?.customer?.trim() || customerName,
      roomName: activeProject?.roomName?.trim() || selectedRoom.roomType,
      stage: "Discovery",
      status: activeProject?.status?.trim() || "Draft",
      notes: activeProject?.notes?.trim() || "",
    });

    setActiveProjectId(project.id);

    const mergedNotes = mergeNotes(project.notes, sessionBlock);
    const existingDiscovery = project.discovery ?? {
      customer: project.customer || customerName,
      site: project.site || "",
      roomName: project.roomName || selectedRoom.roomType,
      notes: project.notes || "",
      createdAt: project.createdAt,
    };

    updateProject(project.id, {
      name: project.name === "New Project" ? suggestedName : project.name,
      customer: project.customer || customerName,
      roomName: selectedRoom.roomType,
      stage: "Discovery",
      notes: mergedNotes,
      template: {
        market: selectedRoom.vertical,
        application: selectedRoom.roomType,
        tier: buildTemplateTier(selectedRoom),
        templateId: selectedRoom.id,
        summary: selectedRoom.summary,
        solutionSummary: selectedRoom.designPurpose,
        recommendedFamilies: summary.recommendedFamilies,
        assumptions: [
          `Inputs: ${selectedRoom.ioProfile.sources}`,
          `Outputs: ${selectedRoom.ioProfile.outputs}`,
          `Operators: ${selectedRoom.ioProfile.operators}`,
          ...selectedRoom.assumptions,
        ],
        includedSystems: selectedRoom.includedSystems,
        uplift: selectedRoom.uplift,
        nextTool: nextRoute,
        createdAt: project.template?.createdAt ?? project.createdAt,
      },
      discovery: {
        ...existingDiscovery,
        customer: existingDiscovery.customer || project.customer || customerName,
        roomName: selectedRoom.roomType,
        workflowTrack: activeTrack.title,
        projectScope: selectedRoom.vertical,
        applicationType: selectedRoom.roomType,
        customerOutcome: summary.summary,
        featureRequirements: summary.signals.join(" | "),
        sourceCount: String(selectedRoom.ioProfile.sourceCount),
        displayCount: String(selectedRoom.ioProfile.displayCount),
        notes: mergedNotes,
        recommendedFamilies: summary.recommendedFamilies,
        recommendedNextTool: nextRoute,
        createdAt: existingDiscovery.createdAt || project.createdAt,
      },
    });

    setSaveMessage(`Navigator summary saved to ${project.name}.`);

    if (route) {
      navigate(nextRoute);
    }
  }

  const left = (
    <div className="wm-workspace-stack wm-navx">
      <div className="wm-start-step">
        Choose the room first, then tell Wingman what kind of help you need right now.
      </div>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">1. Choose room type</h3>
          <p className="wm-workspace-card__copy">
            This keeps the next guidance anchored to a real AV space instead of a generic conversation.
          </p>
        </div>

        <div className="wm-navx__filter-grid">
          <div>
            <label htmlFor="navigator-room-category" className="wm-workspace-label">
              Room category
            </label>
            <select
              id="navigator-room-category"
              value={category}
              onChange={(event) => setCategory(event.target.value as (typeof ROOM_TEMPLATE_CATEGORY_ORDER)[number])}
            >
              {ROOM_TEMPLATE_CATEGORY_ORDER.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="navigator-room-query" className="wm-workspace-label">
              Search room
            </label>
            <input
              id="navigator-room-query"
              type="text"
              placeholder="Classroom, boardroom, sports bar..."
              value={roomQuery}
              onChange={(event) => setRoomQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="wm-workspace-list wm-navx__room-list">
          {visibleRooms.map((room) => (
            <button
              key={room.id}
              type="button"
              className={`wm-workspace-list-item${room.id === selectedRoom.id ? " wm-workspace-list-item--active" : ""}`}
              onClick={() => setRoomId(room.id)}
            >
              <span className="wm-workspace-list-item__eyebrow">{room.category}</span>
              <span className="wm-workspace-list-item__title">{room.roomType}</span>
              <span className="wm-workspace-list-item__copy">{room.summary}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">2. Choose what you need</h3>
          <p className="wm-workspace-card__copy">
            Pick the workflow that best matches where you are in the opportunity.
          </p>
        </div>

        <div className="wm-workspace-list">
          {TRACKS.map((track) => {
            const answered = countAnswers(track, answersByTrack[track.id]);
            return (
              <button
                key={track.id}
                type="button"
                className={`wm-workspace-list-item${track.id === trackId ? " wm-workspace-list-item--active" : ""}`}
                onClick={() => {
                  setTrackId(track.id);
                  setSaveMessage("");
                }}
              >
                <span className="wm-workspace-list-item__eyebrow">
                  {answered}/{track.questions.length} answered
                </span>
                <span className="wm-workspace-list-item__title">{track.title}</span>
                <span className="wm-workspace-list-item__copy">{track.subtitle}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">3. Add only the detail that matters</h3>
          <p className="wm-workspace-card__copy">{activeTrack.summary}</p>
        </div>

        <div className="wm-navx__question-stack">
          {activeTrack.questions.map((question, index) => {
            const value = answers[question.id];
            const isAnswered = question.type === "multi" ? arrayValue(value).length > 0 : Boolean(textValue(value).trim());
            const isCurrent = firstPending === -1 ? index === activeTrack.questions.length - 1 : index === firstPending;
            const isVisible = isAnswered || isCurrent || index === 0;

            if (!isVisible) return null;

            return (
              <section
                key={question.id}
                className={`wm-workspace-card wm-workspace-card--muted wm-navx__question${isCurrent ? " is-current" : ""}`}
              >
                <div className="wm-navx__question-head">
                  <span className="wm-navx__question-index">Q{index + 1}</span>
                  {isAnswered ? <span className="wm-workspace-tag">Captured</span> : null}
                </div>

                <div className="wm-workspace-card__header">
                  <h3 className="wm-workspace-card__title">{question.prompt}</h3>
                  <p className="wm-workspace-card__copy">{question.helper}</p>
                </div>

                {question.type === "single" ? (
                  <div className="wm-navx__option-grid">
                    {question.options?.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`wm-navx__option${textValue(value) === option ? " is-active" : ""}`}
                        onClick={() => setAnswer(question.id, option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}

                {question.type === "multi" ? (
                  <div className="wm-navx__option-grid">
                    {question.options?.map((option) => {
                      const selected = arrayValue(value).includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          className={`wm-navx__option${selected ? " is-active" : ""}`}
                          onClick={() => setAnswer(question.id, toggleMultiValue(value, option))}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {question.type === "text" ? (
                  <textarea
                    className="wm-navx__textarea"
                    value={textValue(value)}
                    placeholder={question.placeholder}
                    onChange={(event) => setAnswer(question.id, event.target.value)}
                  />
                ) : null}
              </section>
            );
          })}
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-grid-3">
          <div className="wm-workspace-metric">
            <span>Room</span>
            <strong>{selectedRoom.roomType}</strong>
          </div>
          <div className="wm-workspace-metric">
            <span>Answered</span>
            <strong>
              {answerCount}/{activeTrack.questions.length}
            </strong>
          </div>
          <div className="wm-workspace-metric">
            <span>Active project</span>
            <strong>{activeProject?.name?.trim() || "Will be created on save"}</strong>
          </div>
        </div>

        {saveMessage ? <div className="wm-workspace-empty">{saveMessage}</div> : null}

        <div className="wm-workspace-action-row">
          <button type="button" className="wm-btn-secondary" onClick={resetTrack}>
            Reset this workflow
          </button>
          <button type="button" className="wm-btn-secondary" onClick={() => persistNavigator()}>
            Save to project
          </button>
          <button type="button" className="wm-btn-primary" onClick={() => persistNavigator(primaryRoute)}>
            Save and open {labelNavigatorRoute(primaryRoute)}
          </button>
        </div>
      </section>
    </div>
  );

  const right = (
    <div className="wm-workspace-stack wm-navx">
      <section className="wm-workspace-card wm-workspace-card--muted">
        <div className="wm-workspace-card__header">
          <span className="wm-workspace-list-item__eyebrow">{selectedRoom.vertical}</span>
          <h3 className="wm-workspace-card__title">{summary.title}</h3>
          <p className="wm-workspace-card__copy">{summary.summary}</p>
        </div>

        <div className="wm-workspace-grid-3">
          <div className="wm-workspace-metric">
            <span>Best next tool</span>
            <strong>{labelNavigatorRoute(primaryRoute)}</strong>
          </div>
          <div className="wm-workspace-metric">
            <span>Families</span>
            <strong>{summary.recommendedFamilies.length || selectedRoom.recommendedFamilies.length}</strong>
          </div>
          <div className="wm-workspace-metric">
            <span>Project target</span>
            <strong>{activeProject?.name?.trim() || suggestProjectName(activeTrack, selectedRoom, answers)}</strong>
          </div>
        </div>

        <div className="wm-workspace-tag-row">
          {summary.recommendedFamilies.map((family) => (
            <span key={family} className="wm-workspace-tag">
              {family}
            </span>
          ))}
        </div>

        <div className="wm-next-step">{summary.routeReasoning}</div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Current readout</h3>
          <p className="wm-workspace-card__copy">
            This is the plain-language project summary that will be saved into the active project.
          </p>
        </div>

        <div className="wm-workspace-tag-row">
          {summary.signals.map((signal) => (
            <span key={signal} className="wm-workspace-tag">
              {signal}
            </span>
          ))}
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Ask next</h3>
          <p className="wm-workspace-card__copy">
            Use these to keep the conversation moving without reopening a full discovery workshop.
          </p>
        </div>

        <div className="wm-workspace-list">
          {summary.prompts.length > 0 ? (
            summary.prompts.map((prompt) => (
              <div key={prompt} className="wm-workspace-list-item">
                <span className="wm-workspace-list-item__title">Plain-English follow-up</span>
                <span className="wm-workspace-list-item__copy">{prompt}</span>
              </div>
            ))
          ) : (
            <div className="wm-workspace-empty">
              The room direction is already fairly clear. Save this summary and move into the next tool.
            </div>
          )}
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Open next tool</h3>
          <p className="wm-workspace-card__copy">
            Save the room summary first so the next workspace opens with the current direction attached to the project.
          </p>
        </div>

        <div className="wm-workspace-list">
          {summary.routes.map((route) => (
            <button
              key={route}
              type="button"
              className="wm-workspace-list-item"
              onClick={() => persistNavigator(route)}
            >
              <span className="wm-workspace-list-item__eyebrow">Recommended route</span>
              <span className="wm-workspace-list-item__title">{labelNavigatorRoute(route)}</span>
              <span className="wm-workspace-list-item__copy">
                Save this room-first readout and move straight into the next working surface.
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );

  return (
    <SplitWorkspaceFrame
      title="AV Navigator"
      subtitle="Choose the room, choose what kind of help you need, and let Wingman point you to the clearest next move."
      leftTitle="Room and Workflow"
      rightTitle="Readout and Next Move"
      left={left}
      right={right}
      top={(
        <div className="wm-workspace-tag-row">
          <span className="wm-workspace-tag">{selectedRoom.roomType}</span>
          <span className="wm-workspace-tag">{activeTrack.title}</span>
          <span className="wm-workspace-tag">{activeProject?.name?.trim() || "No active project"}</span>
        </div>
      )}
    />
  );
}
