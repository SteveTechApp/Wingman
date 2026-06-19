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
    eyebrow: "Display, signage, LED, LFD or refresh opportunity",
    title: "Display / signage attach",
    body: "Use when the opportunity starts from screens, signage, LED, LFD or a video wall. Work backwards into signal management, switching, control and content behaviour.",
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
    body: "Use for account development, distributor enablement, customer conversations and opportunity shaping. Turn display or UC conversations into WyreStorm attachment questions.",
    route: "/wingman/call-cards",
  },
  {
    eyebrow: "After discovery, after a product shortlist, after a proposal draft or before escalation",
    title: "Proposal / closing follow-up",
    body: "Use when the call needs to end with clear actions, assumptions, next steps and quote-safe wording for a customer or internal handover.",
    route: "/wingman/proposal",
  },
];

const workflowSteps = [
  "Conversation type",
  "Ask this next",
  "Capture detail",
  "Next action",
];

export function SalesHelperPage() {
  const navigate = useNavigate();

  return (
    <div className="wm-sh-page" data-wingman-page="sales-helper">
      <section className="wm-sh-page-hero" aria-labelledby="sales-helper-title">
        <div>
          <p className="wm-sh-page-kicker">Sales Helper</p>
          <h1 id="sales-helper-title">Guide the sales conversation one step at a time.</h1>
          <p>
            Choose the conversation type, ask the next useful question, capture only what matters,
            then move to the right Wingman tool.
          </p>
        </div>
      </section>

      <nav className="wm-sh-page-stepper" aria-label="Sales Helper workflow progress">
        {workflowSteps.map((step, index) => (
          <div className="wm-sh-page-step" key={step}>
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </div>
        ))}
      </nav>

      <section className="wm-sh-page-section" aria-labelledby="sales-helper-start-title">
        <div className="wm-sh-section-head">
          <p className="wm-sh-page-kicker">Step 1 / 4</p>
          <h2 id="sales-helper-start-title">Choose the conversation type</h2>
          <p>
            Pick the closest starting point. Wingman will narrow the next question and capture fields.
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
              <span className="wm-sh-choice-eyebrow">{card.eyebrow}</span>
              <span className="wm-sh-choice-title">{card.title}</span>
              <span className="wm-sh-choice-body">{card.body}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default SalesHelperPage;

