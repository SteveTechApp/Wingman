import {
  ArrowRight,
  Building2,
  Cable,
  FileCheck2,
  MessageSquare,
  Monitor,
  Scale,
  Sparkles,
  TrendingUp,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HubCardArt, type HubCardArtKind } from "../components/HubCardArt";

type PolishAccent = "aqua" | "blue" | "violet" | "magenta" | "amber" | "green";
type CardArtKind = HubCardArtKind;

type SalesHelperCard = {
  eyebrow: string;
  title: string;
  body: string;
  route: string;
  icon: LucideIcon;
  accent: PolishAccent;
  art: CardArtKind;
};

const conversationCards: SalesHelperCard[] = [
  {
    eyebrow: "Meeting rooms, classrooms, training rooms or general AV enquiry",
    title: "Room requirement",
    body: "Use when the customer needs AV for a room but the system shape is not clear yet. Start with room purpose, displays, sources, USB, audio, control and distance.",
    route: "/wingman/discovery",
    icon: Building2,
    accent: "aqua",
    art: "room",
  },
  {
    eyebrow: "Display, projector, signage, LED, LFD or refresh opportunity",
    title: "Display / projector / LED attach",
    body: "Use when the opportunity starts from screens, projectors, signage, LED, LFD or a video wall. Work backwards into signal management, switching, extension, control and content behaviour.",
    route: "/wingman/discovery",
    icon: Monitor,
    accent: "violet",
    art: "display",
  },
  {
    eyebrow: "HDMI extender, switcher, splitter, matrix or signal product enquiry",
    title: "HDMI / extender / matrix enquiry",
    body: "Use when the customer asks for a signal product but has not provided enough design information. Capture I/O, distance, resolution, USB, audio and control needs.",
    route: "/wingman/recommendations",
    icon: Cable,
    accent: "blue",
    art: "cable",
  },
  {
    eyebrow: "UC, BYOD, BYOM, camera, microphone or USB device enquiry",
    title: "BYOD / conferencing / USB",
    body: "Use when Teams, Zoom, cameras, microphones, PTZ, touch panels or USB transport are involved. Keep video, USB and audio paths together.",
    route: "/wingman/discovery",
    icon: Video,
    accent: "magenta",
    art: "camera",
  },
  {
    eyebrow: "Competitor replacement, tender equivalence or channel product match",
    title: "Competitor SKU",
    body: "Use when the customer asks for a match to Extron, Kramer, AVPro Edge, Blustream, HDA, J+P or another brand. Compare architecture first, then product fit.",
    route: "/wingman/compare",
    icon: Scale,
    accent: "amber",
    art: "competitor",
  },
  {
    eyebrow: "Account development, attach opportunity or sales enablement conversation",
    title: "Channel and customer growth conversation",
    body: "Use for account development, outbound calling, distributor enablement, customer conversations and opportunity shaping. Turn display, projector, LED or UC conversations into credible WyreStorm attachment questions.",
    route: "/wingman/call-coach",
    icon: TrendingUp,
    accent: "green",
    art: "growth",
  },
  {
    eyebrow: "After discovery, after a product shortlist, after a proposal draft or before escalation",
    title: "Proposal / closing follow-up",
    body: "Use when the call needs to end with clear actions, assumptions, next steps and quote-safe wording for a customer or internal handover.",
    route: "/wingman/proposal",
    icon: FileCheck2,
    accent: "amber",
    art: "proposal",
  },
];

export function SalesHelperPage() {
  const navigate = useNavigate();

  return (
    <div className="wm-sh-page wm-polish-shell" data-wingman-page="sales-helper">
      <section className="wm-sh-page-hero wm-polish-hero wm-polish-aqua" aria-labelledby="sales-helper-title">
        <span className="wm-polish-hero-icon" aria-hidden="true">
          <MessageSquare />
        </span>

        <div className="wm-polish-hero-copy">
          <h1 id="sales-helper-title">Choose the conversation type</h1>
          <p>
            Pick the closest starting point. Wingman will narrow the next question, keep the
            conversation application-led, and help you surface viable WyreStorm solution directions.
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
                onClick={() => navigate(card.route)}
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
          onClick={() => navigate("/wingman/discovery")}
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
