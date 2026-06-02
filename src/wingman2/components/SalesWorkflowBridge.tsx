type SalesWorkflowBridgeVariant = "salesHelper" | "callCards";

type SalesWorkflowBridgeProps = {
  variant: SalesWorkflowBridgeVariant;
};

function getWingmanHref(segment: string) {
  if (typeof window === "undefined") {
    return `/${segment}`;
  }

  const path = window.location.pathname;
  const basePath = path === "/wingman" || path.startsWith("/wingman/") ? "/wingman" : "";

  return `${basePath}/${segment}`.replace(/\/{2,}/g, "/");
}

export function SalesWorkflowBridge({ variant }: SalesWorkflowBridgeProps) {
  const callCardsHref = getWingmanHref("call-cards");
  const salesHelperHref = getWingmanHref("sales-helper");

  const isCallCards = variant === "callCards";

  const eyebrow = isCallCards ? "Live call workflow" : "Sales strategy workspace";
  const title = isCallCards ? "Use Call Cards when you are running the conversation." : "Use Sales Helper when you need positioning.";
  const body = isCallCards
    ? "Call Cards should capture answers from a real customer conversation and then hand the opportunity into Discovery, Finder, Compare or Proposal."
    : "Sales Helper should help reps choose the angle, handle objections, shape customer-safe language and decide how to position WyreStorm.";
  const primaryHref = isCallCards ? salesHelperHref : callCardsHref;
  const primaryLabel = isCallCards ? "Open Sales Helper" : "Start a Live Call Card";
  const secondaryText = isCallCards
    ? "Need objection handling, competitor positioning or proposal wording?"
    : "Already on the call and need structured questions with answer capture?";

  return (
    <section className={`swb-bridge swb-bridge-${variant}`} aria-label="Sales workflow guidance">
      <style>{bridgeStyles}</style>

      <div>
        <span>{eyebrow}</span>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>

      <div className="swb-bridgeAction">
        <small>{secondaryText}</small>
        <a href={primaryHref}>{primaryLabel}</a>
      </div>
    </section>
  );
}

export default SalesWorkflowBridge;

const bridgeStyles = `
.swb-bridge {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  max-width: 1120px;
  margin: 0 auto 12px;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.52);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.14);
}

.swb-bridge span {
  display: block;
  margin-bottom: 4px;
  color: rgba(251, 191, 36, 0.72);
  font-size: 0.66rem;
  font-weight: 680;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.swb-bridge strong {
  display: block;
  color: rgba(248, 250, 252, 0.92);
  font-size: 0.95rem;
  font-weight: 560;
  line-height: 1.2;
}

.swb-bridge p {
  max-width: 780px;
  margin: 5px 0 0;
  color: rgba(203, 213, 225, 0.66);
  font-size: 0.8rem;
  line-height: 1.38;
}

.swb-bridgeAction {
  display: grid;
  justify-items: end;
  gap: 6px;
}

.swb-bridgeAction small {
  color: rgba(203, 213, 225, 0.58);
  font-size: 0.72rem;
  line-height: 1.25;
  text-align: right;
}

.swb-bridgeAction a {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(251, 191, 36, 0.62);
  border-radius: 999px;
  padding: 0 12px;
  color: var(--wm-sweep-text) !important;
  background: #f59e0b;
  font-size: 0.76rem;
  font-weight: 700;
  text-decoration: none;
}

.swb-bridge-salesHelper {
  border-color: rgba(56, 189, 248, 0.16);
}

.swb-bridge-salesHelper span {
  color: rgba(56, 189, 248, 0.76);
}

.swb-bridge-callCards {
  border-color: rgba(245, 158, 11, 0.16);
}

@media (max-width: 900px) {
  .swb-bridge {
    grid-template-columns: 1fr;
  }

  .swb-bridgeAction {
    justify-items: start;
  }

  .swb-bridgeAction small {
    text-align: left;
  }
}
`;

