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
type CardArtKind = "room" | "display" | "cable" | "camera" | "competitor" | "growth" | "proposal";

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
    route: "/wingman/finder",
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

function CardArtwork({ kind }: { kind: CardArtKind }) {
  if (kind === "room") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 24h175l25 98H43L20 24Z" opacity="0.42" />
        <path d="M20 24 43 122M195 24l25 98M64 24v25m66-25v25" opacity="0.35" />
        <rect x="140" y="43" width="43" height="27" rx="3" fill="currentColor" opacity="0.08" />
        <rect x="140" y="43" width="43" height="27" rx="3" />
        <path d="M79 79h61l18 19H62l17-19Z" fill="currentColor" opacity="0.08" />
        <path d="M79 79h61l18 19H62l17-19Zm-8 19-5 20m83-20 6 20" />
        <path d="M52 68h20v28H47V77c0-5 2-9 5-9Zm116 7h18v25h-23V84c0-5 2-9 5-9Z" opacity="0.72" />
        <path d="M91 48h35M34 113h166" opacity="0.28" />
      </svg>
    );
  }

  if (kind === "display") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M45 28 211 17v99L45 126V28Z" fill="currentColor" opacity="0.055" />
        <path d="M45 28 211 17v99L45 126V28Z" />
        <path d="M86 25v98m42-101v98m42-101v98M45 60l166-8M45 92l166-9" opacity="0.82" />
        <path d="m54 49 23-11 17 12 24-16 25 19 23-16 37 17" opacity="0.5" />
        <path d="M25 131h196" opacity="0.25" />
        <path d="M71 112 53 126m79-19-12 14m66-18-18 14" opacity="0.35" />
      </svg>
    );
  }

  if (kind === "cable") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 112c45-51 74-18 104-51 22-24 37-36 83-27" opacity="0.48" />
        <path d="M22 111c43-42 74-12 103-46 25-29 42-37 81-27" opacity="0.2" />
        <g transform="translate(24 78) rotate(-18)">
          <rect width="58" height="31" rx="5" fill="currentColor" opacity="0.08" />
          <rect width="58" height="31" rx="5" />
          <path d="M58 8h17v15H58M12 10h21m-21 7h15" />
        </g>
        <g transform="translate(142 26) rotate(12)">
          <rect width="57" height="32" rx="5" fill="currentColor" opacity="0.08" />
          <rect width="57" height="32" rx="5" />
          <path d="M57 8h18v16H57M13 10h20m-20 8h13" />
        </g>
        <path d="M31 125h167" opacity="0.22" />
      </svg>
    );
  }

  if (kind === "camera") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="42" y="30" width="75" height="62" rx="15" fill="currentColor" opacity="0.07" />
        <rect x="42" y="30" width="75" height="62" rx="15" />
        <circle cx="80" cy="60" r="20" fill="currentColor" opacity="0.08" />
        <circle cx="80" cy="60" r="20" />
        <circle cx="80" cy="60" r="8" />
        <path d="M64 93v14h33V93m-47 29h61" />
        <rect x="145" y="22" width="43" height="94" rx="7" fill="currentColor" opacity="0.06" />
        <rect x="145" y="22" width="43" height="94" rx="7" />
        <path d="M157 40h19m-19 15h19m-19 15h19m-19 15h19" opacity="0.62" />
        <rect x="126" y="99" width="78" height="24" rx="6" />
        <path d="M142 111h26m10 0h10" />
      </svg>
    );
  }

  if (kind === "competitor") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M121 19 184 40v39c0 31-20 48-63 62-43-14-63-31-63-62V40l63-21Z" fill="currentColor" opacity="0.055" />
        <path d="M121 19 184 40v39c0 31-20 48-63 62-43-14-63-31-63-62V40l63-21Z" />
        <path d="M121 45v56m-27-36h54M99 65 84 91h30L99 65Zm44 0-15 26h30l-15-26ZM105 107h32" />
        <path d="m83 43 38-13 39 13" opacity="0.35" />
      </svg>
    );
  }

  if (kind === "growth") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M35 124h180" opacity="0.3" />
        <rect x="50" y="91" width="21" height="33" rx="3" fill="currentColor" opacity="0.08" />
        <rect x="84" y="76" width="21" height="48" rx="3" fill="currentColor" opacity="0.08" />
        <rect x="118" y="58" width="21" height="66" rx="3" fill="currentColor" opacity="0.08" />
        <rect x="152" y="39" width="21" height="85" rx="3" fill="currentColor" opacity="0.08" />
        <rect x="186" y="21" width="21" height="103" rx="3" fill="currentColor" opacity="0.08" />
        <path d="M50 91h21v33H50V91Zm34-15h21v48H84V76Zm34-18h21v66h-21V58Zm34-19h21v85h-21V39Zm34-18h21v103h-21V21Z" />
        <path d="m45 89 38-20 31 5 39-27 46-24" />
        <path d="m190 22 14-3-4 14" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="66" y="23" width="108" height="116" rx="10" fill="currentColor" opacity="0.055" />
      <rect x="66" y="23" width="108" height="116" rx="10" />
      <path d="M96 23v-8h48v8m-55 30h56" />
      <path d="m86 74 7 7 12-15m-19 37 7 7 12-15" />
      <path d="M117 75h37m-37 29h37M84 125h70" opacity="0.75" />
      <path d="m160 111 22-22 12 12-22 22-17 5 5-17Z" fill="currentColor" opacity="0.07" />
      <path d="m160 111 22-22 12 12-22 22-17 5 5-17Z" />
    </svg>
  );
}

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
                  <CardArtwork kind={card.art} />
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
