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

type PolishAccent = "aqua" | "blue" | "violet" | "magenta" | "amber" | "green";

type SalesHelperCard = {
  eyebrow: string;
  title: string;
  body: string;
  route: string;
  icon: LucideIcon;
  accent: PolishAccent;
};

const conversationCards: SalesHelperCard[] = [
  {
    eyebrow: "Meeting rooms, classrooms, training rooms or general AV enquiry",
    title: "Room requirement",
    body: "Use when the customer needs AV for a room but the system shape is not clear yet. Start with room purpose, displays, sources, USB, audio, control and distance.",
    route: "/wingman/discovery",
    icon: Building2,
    accent: "aqua",
  },
  {
    eyebrow: "Display, projector, signage, LED, LFD or refresh opportunity",
    title: "Display / projector / LED attach",
    body: "Use when the opportunity starts from screens, projectors, signage, LED, LFD or a video wall. Work backwards into signal management, switching, extension, control and content behaviour.",
    route: "/wingman/discovery",
    icon: Monitor,
    accent: "violet",
  },
  {
    eyebrow: "HDMI extender, switcher, splitter, matrix or signal product enquiry",
    title: "HDMI / extender / matrix enquiry",
    body: "Use when the customer asks for a signal product but has not provided enough design information. Capture I/O, distance, resolution, USB, audio and control needs.",
    route: "/wingman/finder",
    icon: Cable,
    accent: "blue",
  },
  {
    eyebrow: "UC, BYOD, BYOM, camera, microphone or USB device enquiry",
    title: "BYOD / conferencing / USB",
    body: "Use when Teams, Zoom, cameras, microphones, PTZ, touch panels or USB transport are involved. Keep video, USB and audio paths together.",
    route: "/wingman/discovery",
    icon: Video,
    accent: "magenta",
  },
  {
    eyebrow: "Competitor replacement, tender equivalence or channel product match",
    title: "Competitor SKU",
    body: "Use when the customer asks for a match to Extron, Kramer, AVPro Edge, Blustream, HDA, J+P or another brand. Compare architecture first, then product fit.",
    route: "/wingman/compare",
    icon: Scale,
    accent: "amber",
  },
  {
    eyebrow: "Account development, attach opportunity or sales enablement conversation",
    title: "Channel and customer growth conversation",
    body: "Use for account development, outbound calling, distributor enablement, customer conversations and opportunity shaping. Turn display, projector, LED or UC conversations into credible WyreStorm attachment questions.",
    route: "/wingman/call-coach",
    icon: TrendingUp,
    accent: "green",
  },
  {
    eyebrow: "After discovery, after a product shortlist, after a proposal draft or before escalation",
    title: "Proposal / closing follow-up",
    body: "Use when the call needs to end with clear actions, assumptions, next steps and quote-safe wording for a customer or internal handover.",
    route: "/wingman/proposal",
    icon: FileCheck2,
    accent: "amber",
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
          <p className="wm-sh-page-kicker wm-polish-eyebrow">Sales Helper</p>
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

                <span className="wm-polish-card-art" aria-hidden="true">
                  <Icon />
                </span>
              </button>
            );
          })}
        </div>

        <button
          className="wm-polish-tip"
          type="button"
          onClick={() => navigate("/wingman/discovery")}
        >
          <Sparkles aria-hidden="true" />
          <span>
            <strong>Not sure which route to use?</strong> Start with Room requirement and pivot as the
            conversation becomes clearer.
          </span>
          <ArrowRight aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}

export default SalesHelperPage;
