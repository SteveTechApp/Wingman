import {
  ArrowRight,
  Building2,
  Cable,
  FileCheck2,
  LayoutGrid,
  MessageSquare,
  Monitor,
  Scale,
  Sparkles,
  TrendingUp,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { routeCatalogByKey, type WingmanRouteKey } from "../app/routeCatalog";
import { HubCardArt, type HubCardArtKind } from "../components/HubCardArt";
import { writeDiscoveryHandoff, type DiscoveryHandoff } from "../lib/discoveryTemplateHandoff";

type PolishAccent = "aqua" | "blue" | "violet" | "magenta" | "amber" | "green";
type CardArtKind = HubCardArtKind;

type SalesHelperCard = {
  eyebrow: string;
  title: string;
  body: string;
  routeKey: WingmanRouteKey;
  discoverySeed?: string;
  // Used instead of discoverySeed when the card needs to do more than seed a
  // free-text note - e.g. pre-answering a question and jumping the wizard
  // forward to a specific question id, rather than just leaving context
  // for whichever question is currently showing.
  handoff?: DiscoveryHandoff;
  icon: LucideIcon;
  accent: PolishAccent;
  art: CardArtKind;
};

const callNotesStorageKey = "wingman:use-call-notes-in-discovery";

const roomRequirementSeed =
  "Sales Helper starting point: general room requirement. Confirm the room purpose, displays, sources, distances, USB, audio, control and network needs before selecting products.";

const conversationCards: SalesHelperCard[] = [
  {
    eyebrow: "Meeting rooms, classrooms, training rooms or general AV enquiry",
    title: "Room requirement",
    body: "Use when the customer needs AV for a room but the system shape is not clear yet. Start with room purpose, displays, sources, USB, audio, control and distance.",
    routeKey: "discovery",
    discoverySeed: roomRequirementSeed,
    icon: Building2,
    accent: "aqua",
    art: "room",
  },
  {
    eyebrow: "Display, projector, signage or LFD refresh opportunity",
    title: "Display / projector attach",
    body: "Use when the opportunity starts from screens, projectors, signage or LFDs and there is no video wall involved. Work backwards into signal management, switching, extension, control and content behaviour.",
    routeKey: "discovery",
    discoverySeed:
      "Sales Helper starting point: display-led opportunity. The customer is discussing displays, projectors, signage or LFDs. Work backwards into content behaviour, source count, routing, distance, control and processing.",
    icon: Monitor,
    accent: "violet",
    art: "display",
  },
  {
    eyebrow: "Video wall, LED wall, LCD wall or multiview canvas opportunity",
    title: "Video wall / LED wall",
    body: "Use when the opportunity is an LED or LCD wall. Opens the Video Wall Builder to size the canvas and get a processor recommendation before Discovery.",
    routeKey: "videowall",
    icon: LayoutGrid,
    accent: "violet",
    art: "videowall",
  },
  {
    eyebrow: "HDMI extender, switcher, splitter, matrix or signal product enquiry",
    title: "HDMI / extender / matrix enquiry",
    body: "Use when the customer asks for a signal product but has not provided enough design information. Capture I/O, distance, resolution, USB, audio and control needs before opening product recommendations.",
    routeKey: "discovery",
    discoverySeed:
      "Sales Helper starting point: HDMI, extender, splitter, switcher or matrix enquiry. Confirm the required input and routed output counts, source and display locations, cable distance, resolution, USB, audio and control before recommending a product.",
    icon: Cable,
    accent: "blue",
    art: "cable",
  },
  {
    eyebrow: "UC, BYOD, BYOM, camera, microphone or USB device enquiry",
    title: "BYOD / conferencing / USB",
    body: "Use when Teams, Zoom, cameras, microphones, PTZ, touch panels or USB transport are involved. Jumps straight to the UC requirement question instead of the full room-shape flow.",
    routeKey: "discovery",
    handoff: {
      mode: "standard",
      answers: {
        opportunity: "meeting-room",
      },
      notes: {
        opportunity:
          "Sales Helper starting point: UC, BYOD, BYOM, camera, microphone or USB enquiry. Keep the video, USB host ownership, camera, microphone, audio and display paths together throughout Discovery. Confirm the room shape afterwards if it isn't already known.",
      },
      startAtQuestionId: "uc-purpose",
    },
    icon: Video,
    accent: "magenta",
    art: "camera",
  },
  {
    eyebrow: "Competitor replacement, tender equivalence or channel product match",
    title: "Competitor SKU",
    body: "Use when the customer asks for a match to Extron, Kramer, AVPro Edge, Blustream, HDA, J+P or another brand. Compare architecture first, then product fit.",
    routeKey: "compare",
    icon: Scale,
    accent: "amber",
    art: "competitor",
  },
  {
    eyebrow: "Account development, attach opportunity or sales enablement conversation",
    title: "Channel and customer growth conversation",
    body: "Use the Products workspace to explore credible WyreStorm attachment routes, product families, known SKUs and competitor-led opportunities without looping back through Call Coach.",
    routeKey: "products",
    icon: TrendingUp,
    accent: "green",
    art: "growth",
  },
  {
    eyebrow: "After discovery, after a product shortlist, after a proposal draft or before escalation",
    title: "Proposal / closing follow-up",
    body: "Use when the call needs to end with clear actions, assumptions, next steps and quote-safe wording for a customer or internal handover.",
    routeKey: "proposal",
    icon: FileCheck2,
    accent: "amber",
    art: "proposal",
  },
];

export function SalesHelperPage() {
  const navigate = useNavigate();

  function openCard(card: SalesHelperCard) {
    if (card.handoff) {
      window.sessionStorage.removeItem(callNotesStorageKey);
      writeDiscoveryHandoff(card.handoff);
    } else if (card.discoverySeed) {
      window.sessionStorage.setItem(callNotesStorageKey, card.discoverySeed);
    } else {
      window.sessionStorage.removeItem(callNotesStorageKey);
    }

    navigate(routeCatalogByKey[card.routeKey].path);
  }

  function startRoomDiscovery() {
    window.sessionStorage.setItem(callNotesStorageKey, roomRequirementSeed);
    navigate(routeCatalogByKey.discovery.path);
  }

  return (
    <div className="wm-sh-page wm-polish-shell" data-wingman-page="sales-helper">
      <section className="wm-sh-page-hero wm-polish-hero wm-polish-aqua" aria-labelledby="sales-helper-title">
        <span className="wm-polish-hero-icon" aria-hidden="true">
          <MessageSquare />
        </span>

        <div className="wm-polish-hero-copy">
          <h1 id="sales-helper-title">Choose the conversation type</h1>
          <p>
            Pick the closest starting point. Wingman will carry that context into the next workflow,
            narrow the next question, and keep the conversation application-led.
          </p>
        </div>
      </section>

      <section className="wm-sh-page-section" aria-label="Sales conversation starting points">
        <div className="wm-sh-card-grid wm-polish-grid">
          {conversationCards.map((card) => {
            const Icon = card.icon;

            return (
              <button
                className={`wm-sh-choice-card wm-polish-card wm-polish-${card.accent}`}
                key={card.title}
                type="button"
                aria-label={`Open ${card.title} in Wingman`}
                onClick={() => openCard(card)}
              >
                <span className="wm-polish-card-icon" aria-hidden="true">
                  <Icon />
                </span>

                <span className="wm-sh-choice-content wm-polish-card-copy">
                  <span className="wm-sh-choice-eyebrow wm-polish-card-kicker">{card.eyebrow}</span>
                  <span className="wm-sh-choice-title wm-polish-card-title">{card.title}</span>
                  <span className="wm-sh-choice-body wm-polish-card-body">{card.body}</span>
                  <span className="wm-sh-choice-action wm-polish-card-link">
                    Open in Wingman
                    <ArrowRight aria-hidden="true" />
                  </span>
                </span>

                <span className={`wm-polish-card-art wm-polish-card-art-${card.art}`} aria-hidden="true">
                  <HubCardArt kind={card.art} />
                </span>
              </button>
            );
          })}
        </div>

        <button
          className="wm-polish-tip"
          type="button"
          aria-label="Start with Room requirement"
          onClick={startRoomDiscovery}
        >
          <Sparkles aria-hidden="true" />
          <span>
            <strong>Tip:</strong> Not sure which to pick? Start with{" "}
            <span className="wm-polish-tip-highlight">Room requirement.</span> You can always pivot as the
            conversation evolves.
          </span>
        </button>
      </section>
    </div>
  );
}

export default SalesHelperPage;
