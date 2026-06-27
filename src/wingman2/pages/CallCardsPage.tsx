const handoffRoutes = [
  {
    title: "Open Call Coach",
    detail: "Use this for live conversation support, objection handling and quick guidance during a call.",
    href: "/wingman/call-coach",
    tone: "primary"
  },
  {
    title: "Open Discovery",
    detail: "Use this when the requirement needs structured room, source, display, USB, audio and control capture.",
    href: "/wingman/discovery",
    tone: "secondary"
  },
  {
    title: "Open Compare",
    detail: "Use this when the customer mentions a competitor product or an existing system to replace.",
    href: "/wingman/compare",
    tone: "secondary"
  },
  {
    title: "Open Product Call Cards",
    detail: "Use this for SKU-specific sales positioning, discovery prompts and customer-safe product guidance.",
    href: "/wingman/product-call-cards",
    tone: "secondary"
  }
];

export function CallCardsPage() {
  return (
    <main className="wingman-page-host wm-callcards-transition-page" data-wingman-page="call-cards-transition">
      <section className="wm-callcards-transition-hero">
        <p className="wm-callcards-transition-kicker">Workflow consolidated</p>
        <h1>Live Call Cards has moved into Call Coach</h1>
        <p>
          The old Live Call Cards workflow overlapped with Call Coach, Discovery, Compare and Proposal.
          Use the clearer workflow below so the user always knows where to go next.
        </p>
      </section>

      <section className="wm-callcards-transition-panel" aria-label="Recommended Wingman workflow">
        <div className="wm-callcards-transition-copy">
          <h2>Use the right Wingman tool for the job</h2>
          <p>
            Call Coach now handles live conversation support. Discovery captures structured project
            requirements. Compare handles competitor or replacement conversations. Product Call Cards
            remain available for SKU-specific sales guidance.
          </p>
        </div>

        <div className="wm-callcards-transition-grid">
          {handoffRoutes.map((route) => (
            <a
              key={route.href}
              className={`wm-callcards-transition-card wm-callcards-transition-card--${route.tone}`}
              href={route.href}
            >
              <span>{route.title}</span>
              <small>{route.detail}</small>
            </a>
          ))}
        </div>
      </section>

      <section className="wm-callcards-transition-note">
        <strong>Product Call Cards are still active.</strong>
        <span>
          Only the confusing live-call capture page has been demoted. Product positioning cards and
          SKU call-card workflows remain part of Wingman.
        </span>
      </section>
    </main>
  );
}

export default CallCardsPage;