import { useNavigate } from "react-router-dom";

type SalesHelperCard = {
  eyebrow: string;
  title: string;
  body: string;
  route: string;
};

const conversationCards: SalesHelperCard[] = [
  {
    eyebrow: "Meeting rooms, classrooms, training rooms or general AV enquiry",
    title: "Room requirement",
    body: "Use when the customer needs AV for a room but the system shape is not clear yet. Start with room purpose, displays, sources, USB, audio, control and distance.",
    route: "/wingman/discovery",
  },
  {
    eyebrow: "Display, projector, signage, LED, LFD or refresh opportunity",
    title: "Display / projector / LED attach",
    body: "Use when the opportunity starts from screens, projectors, signage, LED, LFD or a video wall. Work backwards into signal management, switching, extension, control and content behaviour.",
    route: "/wingman/discovery",
  },
  {
    eyebrow: "HDMI extender, switcher, splitter, matrix or signal product enquiry",
    title: "HDMI / extender / matrix enquiry",
    body: "Use when the customer asks for a signal product but has not provided enough design information. Capture I/O, distance, resolution, USB, audio and control needs.",
    route: "/wingman/finder",
  },
  {
    eyebrow: "UC, BYOD, BYOM, camera, microphone or USB device enquiry",
    title: "BYOD / conferencing / USB",
    body: "Use when Teams, Zoom, cameras, microphones, PTZ, touch panels or USB transport are involved. Keep video, USB and audio paths together.",
    route: "/wingman/discovery",
  },
  {
    eyebrow: "Competitor replacement, tender equivalence or channel product match",
    title: "Competitor SKU",
    body: "Use when the customer asks for a match to Extron, Kramer, AVPro Edge, Blustream, HDA, J+P or another brand. Compare architecture first, then product fit.",
    route: "/wingman/compare",
  },
  {
    eyebrow: "Account development, attach opportunity or sales enablement conversation",
    title: "Channel and customer growth conversation",
    body: "Use for account development, outbound calling, distributor enablement, customer conversations and opportunity shaping. Turn display, projector, LED or UC conversations into credible WyreStorm attachment questions.",
    route: "/wingman/call-coach",
  },
  {
    eyebrow: "After discovery, after a product shortlist, after a proposal draft or before escalation",
    title: "Proposal / closing follow-up",
    body: "Use when the call needs to end with clear actions, assumptions, next steps and quote-safe wording for a customer or internal handover.",
    route: "/wingman/proposal",
  },
];

export function SalesHelperPage() {
  const navigate = useNavigate();

  return (
    <div className="wm-sh-page" data-wingman-page="sales-helper">
      <section className="wm-sh-page-hero" aria-labelledby="sales-helper-title">
        <div>
          <p className="wm-sh-page-kicker">Sales Helper</p>
          <h1 id="sales-helper-title">Find the right Wingman tool for this conversation.</h1>
          <p>
            Choose the closest conversation type below and Wingman opens the tool that asks the next
            question, captures the detail, and moves you to the next action - Discovery, Finder,
            Compare, Call Coach, or Proposal.
          </p>
        </div>
      </section>

      <section className="wm-sh-page-section" aria-labelledby="sales-helper-start-title">
        <div className="wm-sh-section-head">
          <h2 id="sales-helper-start-title">Choose the conversation type</h2>
          <p>
            Pick the closest starting point. Wingman will narrow the next question, keep the conversation application-led, and help you surface viable WyreStorm solution directions.
          </p>
        </div>

        <div className="wm-sh-card-grid">
          {conversationCards.map((card) => (
            <button
              className="wm-sh-choice-card"
              key={card.title}
              type="button"
              onClick={() => navigate(card.route)}
            >
              <div className="wm-sh-choice-head">
                <span className="wm-sh-choice-eyebrow">{card.eyebrow}</span>
                <span className="wm-sh-choice-title">{card.title}</span>
              </div>

              <span className="wm-sh-choice-body">{card.body}</span>

              <span className="wm-sh-choice-action">Open in Wingman</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default SalesHelperPage;
