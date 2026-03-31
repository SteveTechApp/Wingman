import "./wingman-dashboard.css";
import DashboardArchitectureCanvas from "./components/DashboardArchitectureCanvas";

export default function DashboardPage() {
  return (
    <div className="wm-architecture-page">

      {/* HEADER STRIP (LIGHTER, LIKE REFERENCE) */}
      <div className="wm-architecture-header">
        <div>
          <div className="wm-architecture-eyebrow">
            SYSTEM ARCHITECTURE
          </div>
          <h1 className="wm-architecture-title">
            System Architecture Design
          </h1>
          <p className="wm-architecture-sub">
            Select your transport model, validate signal flow, and generate BOM.
          </p>
        </div>

        <div className="wm-architecture-actions">
          <button className="wm-btn-primary">
            Continue to Proposal
          </button>
          <button className="wm-btn-secondary">
            Review Product Set
          </button>
        </div>
      </div>

      {/* CONFIGURATION CHOICES (LIKE IMAGE) */}
      <div className="wm-architecture-modes">
        <button className="wm-mode-card">
          <strong>Matrix Switch</strong>
          <span>Fixed I/O routing</span>
        </button>

        <button className="wm-mode-card wm-mode-card--active">
          <strong>AV over IP</strong>
          <span>Flexible & scalable</span>
        </button>

        <button className="wm-mode-card">
          <strong>Video Wall Processor</strong>
          <span>Multiview & control</span>
        </button>
      </div>

      {/* MAIN WORK AREA */}
      <div className="wm-architecture-body">

        {/* LEFT â€” WORKFLOW (SLIMMED) */}
        <aside className="wm-architecture-sidebar">
          <button className="wm-step active">Discovery</button>
          <button className="wm-step">Room Definition</button>
          <button className="wm-step">Tech Selection</button>
          <button className="wm-step">Product Selection</button>
          <button className="wm-step active">System Architecture</button>
          <button className="wm-step">Bill of Materials</button>
          <button className="wm-step">Proposal Output</button>
        </aside>

        {/* CENTER â€” SCHEMATIC (PRIMARY FOCUS) */}
        <main className="wm-architecture-canvas">
          <DashboardArchitectureCanvas
            title="AVoIP Network Layout"
            sourceCount={4}
            displayCount={6}
            distanceLabel="50m validated"
          />
        </main>

        {/* RIGHT â€” INTELLIGENCE PANEL */}
        <aside className="wm-architecture-right">

          <div className="wm-panel">
            <div className="wm-panel-title">Suggested Products</div>
            <div className="wm-product">
              AVoIP Transmitter TX-300
              <span>4K Encoder</span>
            </div>
            <div className="wm-product">
              AVoIP Receiver RX-500
              <span>4K Decoder</span>
            </div>
          </div>

          <div className="wm-panel wm-panel--alert">
            <div className="wm-panel-title">Validation</div>
            <div className="wm-alert">
              âš  Bandwidth Check
              <div className="wm-alert-sub">
                Network capacity OK â€” latency low
              </div>
            </div>
          </div>

        </aside>
      </div>

      {/* BOTTOM CTA */}
      <div className="wm-architecture-footer">
        <button className="wm-btn-primary">
          Generate Bill of Materials
        </button>
      </div>
    </div>
  );
}