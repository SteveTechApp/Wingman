const handoffRoutes = [
  {
    title: "Open Call Coach",
    detail: "Use this during a live customer call when you need objection handling, prompts or quick sales guidance.",
    href: "/wingman/call-coach",
    tone: "primary"
  },
  {
    title: "Open Discovery",
    detail: "Use this to capture the room type, sources, displays, USB, audio, control and project requirements.",
    href: "/wingman/discovery",
    tone: "secondary"
  },
  {
    title: "Open Compare",
    detail: "Use this when the customer mentions a competitor product, existing system or possible replacement.",
    href: "/wingman/compare",
    tone: "secondary"
  },
  {
    title: "Open Product Call Cards",
    detail: "Use this for SKU-specific positioning, discovery prompts and customer-safe product guidance.",
    href: "/wingman/product-call-cards",
    tone: "secondary"
  }
];

export function CallCardsPage() {
  return (
    <main className="wingman-page-host wm-callcards-transition-page" data-wingman-page="call-cards-transition">
      <section className="wm-callcards-transition-hero">
        <p className="wm-callcards-transition-kicker">Live customer support</p>
        <h1>Use Call Coach during customer conversations</h1>
        <p>
          When you are on a call and need help shaping the next question, handling an objection,
          comparing a competitor product or moving the opportunity forward, start with Call Coach.
        </p>
      </section>

      <section className="wm-callcards-transition-panel" aria-label="Choose the right Wingman tool">
        <div className="wm-callcards-transition-copy">
          <h2>Choose the next sales action</h2>
          <p>
            Pick the route that best matches the conversation. Use Call Coach for live support,
            Discovery for structured requirements, Compare for competitor or replacement conversations,
            and Product Call Cards for SKU-specific sales positioning.
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
        <strong>Need SKU-specific help?</strong>
        <span>
          Product Call Cards remain available for product positioning, discovery prompts,
          customer-safe wording and sales guidance.
        </span>
      </section>
    </main>
  );
}

export default CallCardsPage;