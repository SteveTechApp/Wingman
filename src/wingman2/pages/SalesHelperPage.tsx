import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Copy,
  Eraser,
  MessageSquareText,
  MoveRight,
  Save,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { PageHero } from "../components/PageHero";
import { SalesToneQuickSetter } from "../components/SalesToneQuickSetter";
import { SectionCard } from "../components/SectionCard";
import { routeCatalogByKey } from "../app/routeCatalog";
import { getCurrentWorkflowProject, readProjectStore } from "../data/projectStore";
import { buildSalesReadinessPackage } from "../lib/salesReadiness";

type CoachingCard = {
  id: string;
  title: string;
  plainPurpose: string;
  usefulWhen: string;
  opener: string;
  questions: string[];
  listenFor: string[];
  nextMove: string;
};

const STORAGE_KEY = "wingman.salesHelper.callReplies.v2";

const coachingCards: CoachingCard[] = [
  {
    id: "room-fit",
    title: "Understand the room",
    plainPurpose: "Get a quick feel for the space before talking products.",
    usefulWhen: "The customer says they need a meeting room, classroom, boardroom, venue, or general AV upgrade.",
    opener: "Before I suggest hardware, can I get a quick picture of the room and how people use it?",
    questions: [
      "What kind of room is this, and how many people normally use it?",
      "What does a good session in this room need to feel like for the user?",
      "Is this mainly for presenting, video calls, teaching, events, signage, or a mix of those?",
      "What is frustrating people about the room today?",
    ],
    listenFor: [
      "Room type",
      "User experience",
      "Current pain point",
      "Simple vs flexible system",
    ],
    nextMove: "Use the room type and user pain point to choose whether Discovery, Finder, or Templates is the next best step.",
  },
  {
    id: "sources-displays",
    title: "Map sources and displays",
    plainPurpose: "Find out what needs to connect to what.",
    usefulWhen: "The customer mentions screens, laptops, media players, signage, TV boxes, lecterns, or multiple displays.",
    opener: "Let me map the signal flow so we do not over-spec or miss anything obvious.",
    questions: [
      "What sources need to be shown, and where are they physically located?",
      "How many displays are there, and do they all show the same thing or different things?",
      "Does anyone need to switch sources during use, or is it normally set-and-forget?",
      "Are any cable runs likely to be long, awkward, or going between rooms?",
    ],
    listenFor: [
      "Source count",
      "Display count",
      "Same or different content",
      "Distance and cable path",
    ],
    nextMove: "Use this to decide between a simple switcher, HDBaseT, matrix, AVoIP, or video wall route.",
  },
  {
    id: "usb-conferencing",
    title: "Check USB and conferencing",
    plainPurpose: "Avoid missing cameras, microphones, speakers, and laptop USB needs.",
    usefulWhen: "The room has Teams, Zoom, BYOD, cameras, PTZ, microphones, or USB peripherals.",
    opener: "For calls, the video path is only half the story. I also need to understand the USB and room-peripheral side.",
    questions: [
      "Will users bring their own laptop, use a room PC, or both?",
      "Which camera, microphone, speaker, or USB devices need to be shared?",
      "Where is the USB host - at the table, lectern, rack, display, or somewhere else?",
      "Does the customer need wired USB, wireless conferencing, or both?",
    ],
    listenFor: [
      "BYOD or room PC",
      "USB host location",
      "Camera and mic path",
      "Wireless conferencing need",
    ],
    nextMove: "Use this to validate Apollo, USB extension, NetworkHD USB, camera bridge, or conferencing accessory choices.",
  },
  {
    id: "network-av",
    title: "Check the network angle",
    plainPurpose: "Work out whether AVoIP is suitable before recommending it.",
    usefulWhen: "The job may use NetworkHD, multiple rooms, central racks, flexible routing, or IT-managed infrastructure.",
    opener: "If this goes onto the network, it needs to be simple for the customer and safe for IT.",
    questions: [
      "Is there a dedicated AV network, or would this share the customer network?",
      "Who owns the network setup - the integrator, IT team, or someone else?",
      "Do they already have suitable switches, VLANs, multicast setup, and PoE budget?",
      "Is low latency or very high image quality a hard requirement?",
    ],
    listenFor: [
      "AV network ownership",
      "Switch readiness",
      "PoE and multicast",
      "Latency requirement",
    ],
    nextMove: "Use this to validate whether NetworkHD 100, 500, or 600 is appropriate, and whether a Netgear AVLine switch should be proposed.",
  },
  {
    id: "budget-risk",
    title: "Handle budget naturally",
    plainPurpose: "Talk about cost without sounding defensive or salesy.",
    usefulWhen: "The customer asks for a cheaper option, compares brands, or seems unsure about value.",
    opener: "We can usually look at a few ways to do this. The important bit is knowing where we can simplify without creating problems later.",
    questions: [
      "Is the priority lowest upfront cost, easiest installation, best user experience, or long-term flexibility?",
      "What would be more painful: spending a little more now, or having to redesign it later?",
      "Are there any parts of the system that must be premium, and any areas where a simpler option is acceptable?",
      "Do you want a good/better/best option so the customer can choose the right level?",
    ],
    listenFor: [
      "Budget pressure",
      "Must-have areas",
      "Where to value-engineer",
      "Good/better/best appetite",
    ],
    nextMove: "Use this to build Bronze, Silver, Gold positioning without making the cheaper option sound poor.",
  },
  {
    id: "competitor",
    title: "When a competitor SKU is mentioned",
    plainPurpose: "Use the competitor product as a clue, not as the whole design brief.",
    usefulWhen: "The customer, dealer, or consultant asks for a direct match to another manufacturer.",
    opener: "I can look for the closest WyreStorm fit, but I also want to check what role that product is playing in the system.",
    questions: [
      "Is that competitor SKU a fixed requirement, or just an example of the kind of product they had in mind?",
      "What part of that product matters most - I/O count, distance, USB, network, scaling, audio, or control?",
      "Is the customer replacing one product, or are they trying to solve a bigger room workflow?",
      "Would it help if I gave you a closest match plus a safer alternative?",
    ],
    listenFor: [
      "Spec anchor or example",
      "Feature that matters",
      "One-SKU or system sale",
      "Risk of false match",
    ],
    nextMove: "Open Compare for product matching, then use Finder if the actual requirement points to a different WyreStorm family.",
  },
  {
    id: "video-wall",
    title: "Video wall quick check",
    plainPurpose: "Separate simple walls from routing-heavy or multiview designs.",
    usefulWhen: "The customer mentions LCD wall, LED wall, feature wall, signage wall, multiview, or control room display.",
    opener: "Video walls can be simple or quite involved, so I need to check the behaviour before suggesting the route.",
    questions: [
      "Is this an LCD wall, LED wall, or a group of standard displays?",
      "Is it mainly one big image, repeated signage, independent content, or multiview?",
      "How many sources feed the wall, and do they need to change often?",
      "Is this a fixed feature wall, or does it need to be part of a wider routed AV system?",
    ],
    listenFor: [
      "LCD vs LED",
      "Canvas vs multiview",
      "Source count",
      "Processor vs AVoIP",
    ],
    nextMove: "Use this to choose between SW-0204/0206-VW, seamless matrix, NetworkHD 500 with multiview, or NetworkHD 600.",
  },
  {
    id: "close-next-step",
    title: "Confirm the next step",
    plainPurpose: "End the call with clear actions instead of vague follow-up.",
    usefulWhen: "You have enough information to move into Finder, Proposal, Compare, or pre-sales review.",
    opener: "Let me play that back so I can check I have understood it properly.",
    questions: [
      "Have I got the main requirement right?",
      "What information is still missing before this can be proposed safely?",
      "Who needs to approve the direction - end user, consultant, dealer, IT, or finance?",
      "Would you like the next output to be a product shortlist, a room template, or a proposal-style summary?",
    ],
    listenFor: [
      "Decision maker",
      "Missing information",
      "Output needed",
      "Urgency",
    ],
    nextMove: "Copy the captured notes, then move into Finder, Templates, Compare, or Customer Proposal Builder.",
  },
];

function readStoredReplies(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

function replyKey(cardId: string, questionIndex: number) {
  return `${cardId}.${questionIndex}`;
}

export function SalesHelperPage() {
  const [activeCardId, setActiveCardId] = useState(coachingCards[0].id);
  const [replies, setReplies] = useState<Record<string, string>>(() => readStoredReplies());
  const [copied, setCopied] = useState(false);

  const projectGuidance = useMemo(() => {
    const project = getCurrentWorkflowProject(readProjectStore());
    const roomModel = project?.discoveryBrief?.roomModel ?? {};
    const discovery = {
      projectTitle: String(roomModel.roomType || project?.name || "Standalone sales conversation"),
      summary: String(project?.discoveryBrief?.inference?.summary || "Use discovery and Finder context to strengthen the sales conversation."),
      roomSize: String(roomModel.roomSize || "Not confirmed"),
      displays: String(roomModel.displayArrangement || "Not confirmed"),
      usb: String(roomModel.usbTransport || "Not confirmed"),
      distance: String(roomModel.longestRun || "Not confirmed"),
      budget: String(roomModel.budgetStyle || "Not confirmed"),
    };
    const assumptions = [
      ...(project?.ingest?.unknowns ?? []),
      ...(project?.compareRuns?.[0]?.warnings ?? []),
    ];

    return buildSalesReadinessPackage({
      products: project?.productSelections ?? [],
      discovery,
      assumptions,
      ingest: project?.ingest,
      compareRun: project?.compareRuns?.[0] ?? null,
    });
  }, []);

  const activeCard = coachingCards.find((card) => card.id === activeCardId) ?? coachingCards[0];

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(replies));
  }, [replies]);

  const callNotes = useMemo(() => {
    const lines: string[] = [];

    lines.push("Wingman Sales Helper call notes");
    lines.push("");
    lines.push(`Readiness: ${projectGuidance.readinessScore}%`);
    lines.push(`Motion: ${projectGuidance.outputPurpose.motion}`);
    lines.push(`Suggested output: ${projectGuidance.outputPurpose.customerOutput}`);
    lines.push("");

    coachingCards.forEach((card) => {
      const answeredQuestions = card.questions
        .map((question, questionIndex) => ({
          question,
          answer: replies[replyKey(card.id, questionIndex)]?.trim() ?? "",
        }))
        .filter((item) => item.answer.length > 0);

      if (answeredQuestions.length < 1) return;

      lines.push(card.title);
      answeredQuestions.forEach((item) => {
        lines.push(`Q: ${item.question}`);
        lines.push(`A: ${item.answer}`);
      });
      lines.push("");
    });

    return lines.join("\n");
  }, [projectGuidance.outputPurpose.customerOutput, projectGuidance.outputPurpose.motion, projectGuidance.readinessScore, replies]);

  const hasNotes = callNotes.includes("A:");

  function updateReply(cardId: string, questionIndex: number, event: ChangeEvent<HTMLTextAreaElement>) {
    const key = replyKey(cardId, questionIndex);
    const value = event.target.value;

    setReplies((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function copyNotes() {
    try {
      await navigator.clipboard.writeText(callNotes);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function clearNotes() {
    setReplies({});
    setCopied(false);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Sales Helper"
        title="Live call coaching, not sales theatre."
        purpose="Use this during a customer or dealer call to ask better questions, capture the replies, and move into the right Wingman workflow without sounding scripted."
        nextMove="Choose the call angle, ask the open questions, write the customer replies, then copy the notes into Finder, Compare, Templates, or Customer Proposal Builder."
        actions={[
          { label: "Open finder", to: routeCatalogByKey.finder.path },
          { label: "Open compare", to: routeCatalogByKey.compare.path, variant: "secondary" },
          { label: "Open proposal", to: routeCatalogByKey.proposal.path, variant: "secondary" },
        ]}
      />

      <SalesToneQuickSetter context="salesHelper" />

      <div className="space-y-5">
        <SectionCard
          title="In-call coaching board"
          subtitle="Larger working cards with natural language, open questions, and reply capture."
        >
          <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-slate-500">
                <ClipboardList className="h-4 w-4" />
                Call angle
              </div>

              <div className="mt-4 space-y-2">
                {coachingCards.map((card) => {
                  const active = activeCard.id === card.id;
                  const answeredCount = card.questions.filter((_, index) => {
                    const answer = replies[replyKey(card.id, index)]?.trim();
                    return Boolean(answer);
                  }).length;

                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setActiveCardId(card.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        active
                          ? "border-amber-300 bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                          : "border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-black">{card.title}</span>
                        {answeredCount > 0 ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-black ${active ? "bg-amber-400 text-slate-950" : "bg-emerald-100 text-emerald-800"}`}>
                            {answeredCount}
                          </span>
                        ) : null}
                      </div>
                      <p className={`mt-1 line-clamp-2 text-xs leading-5 ${active ? "text-slate-300" : "text-slate-500"}`}>
                        {card.plainPurpose}
                      </p>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-amber-900">
                      Active card
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      Use during the call
                    </span>
                  </div>

                  <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">{activeCard.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{activeCard.usefulWhen}</p>

                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-900">Natural opener</p>
                    <p className="mt-2 text-lg font-black leading-7 text-slate-950">"{activeCard.opener}"</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                    <Search className="h-4 w-4 text-amber-500" />
                    Listen for
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeCard.listenFor.map((item) => (
                      <span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {activeCard.questions.map((question, questionIndex) => {
                  const key = replyKey(activeCard.id, questionIndex);

                  return (
                    <div key={question} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 rounded-full bg-slate-950 p-2 text-white">
                          <MessageSquareText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Ask</p>
                          <p className="mt-1 text-base font-black leading-6 text-slate-950">{question}</p>
                        </div>
                      </div>

                      <label className="mt-4 block">
                        <span className="text-xs font-black uppercase tracking-[0.14em] text-amber-800">Capture the reply</span>
                        <textarea
                          value={replies[key] ?? ""}
                          onChange={(event) => updateReply(activeCard.id, questionIndex, event)}
                          rows={4}
                          placeholder="Type the customer's answer here..."
                          className="mt-2 min-h-[116px] w-full resize-y rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                        />
                      </label>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-900">Next best move</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">{activeCard.nextMove}</p>
                </div>
                <MoveRight className="h-6 w-6 text-sky-700" />
              </div>
            </section>
          </div>
        </SectionCard>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.55fr)]">
          <SectionCard
            title="Project-aware guidance"
            subtitle="A compact view of what Wingman already knows from Discovery, Finder, Compare, or Proposal context."
          >
            <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
              <div
                className={`rounded-2xl border p-5 ${
                  projectGuidance.reviewRequired
                    ? "border-amber-200 bg-amber-50 text-amber-950"
                    : "border-emerald-200 bg-emerald-50 text-emerald-950"
                }`}
              >
                <p className="text-sm font-black uppercase tracking-[0.14em]">Readiness</p>
                <p className="mt-3 text-4xl font-black">{projectGuidance.readinessScore}%</p>
                <p className="mt-2 text-sm leading-6">
                  {projectGuidance.reviewRequired
                    ? "Use this as call guidance. Validate before sending final customer output."
                    : "Good enough to move toward a draft, with final checks before issue."}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
                  <p className="flex items-center gap-2 font-black text-slate-900">
                    <Users className="h-4 w-4 text-amber-500" />
                    {projectGuidance.outputPurpose.motion}
                  </p>
                  <p className="mt-2">{projectGuidance.outputPurpose.customerOutput}</p>
                </div>
                {projectGuidance.repGuidance.slice(0, 3).map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Captured call notes"
            subtitle="Saved locally while you work. Copy them into the next Wingman step."
            rightSlot={
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyNotes}
                  disabled={!hasNotes}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={clearNotes}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  <Eraser className="h-4 w-4" />
                  Clear
                </button>
              </div>
            }
          >
            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-slate-100">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-amber-300">
                <Save className="h-4 w-4" />
                Live notes
              </div>
              <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap text-sm leading-6 text-slate-200">
                {hasNotes ? callNotes : "No replies captured yet. Use the coaching card text boxes above during the call."}
              </pre>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Simple conversation rule"
          subtitle="Keep the language calm and practical."
        >
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Ask first",
                text: "Do not jump straight to a SKU. Ask what the room needs to do and what is not working today.",
              },
              {
                title: "Repeat back",
                text: 'Use plain language: "So the main issue is getting laptop, camera and display working without fuss - correct?"',
              },
              {
                title: "Move clearly",
                text: "Finish with a next step: shortlist, compare match, room template, or proposal summary.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h3 className="text-lg font-black text-slate-950">{item.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
