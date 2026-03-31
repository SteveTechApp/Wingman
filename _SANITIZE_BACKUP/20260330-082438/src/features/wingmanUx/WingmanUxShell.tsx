import * as React from "react";
import { useWingmanUxPipeline } from "./useWingmanUxPipeline";
import type { WingmanShellInput } from "./types";
import { WingmanWorkflowShell } from "./WingmanWorkflowShell";
import "./wingman-ux.css";

type WingmanStage =
  | "discovery"
  | "room-definition"
  | "technology"
  | "product-selection"
  | "architecture"
  | "bom"
  | "proposal";

function toSeverity(
  recommendation: any,
  topology: any,
  projectState: WingmanShellInput,
): Array<{ title: string; value: string; level: "good" | "warn" | "info" }> {
  const items: Array<{ title: string; value: string; level: "good" | "warn" | "info" }> = [];

  const networkReady =
    projectState.avGuide?.control?.toLowerCase().includes("network") ||
    projectState.application?.toLowerCase().includes("ip");

  items.push({
    title: "Bandwidth Check",
    value: topology?.bandwidthEstimate || "Unknown bandwidth profile",
    level: "info",
  });

  items.push({
    title: "Network Capacity",
    value:
      topology?.transport === "AVoIP"
        ? networkReady
          ? "Managed network assumed"
          : "Confirm managed AV network"
        : "Local switching path",
    level:
      topology?.transport === "AVoIP"
        ? networkReady
          ? "good"
          : "warn"
        : "good",
  });

  items.push({
    title: "Qualification",
    value:
      Array.isArray(recommendation?.whatsMissing) && recommendation.whatsMissing.length > 0
        ? recommendation.whatsMissing[0]
        : "Sufficient for current direction",
    level:
      Array.isArray(recommendation?.whatsMissing) && recommendation.whatsMissing.length > 0
        ? "warn"
        : "good",
  });

  return items;
}

function buildDecisionCards(projectState: WingmanShellInput, topology: any) {
  const displays = Number(projectState.displayCount ?? 0);
  const sources = Number(projectState.sourceCount ?? 0);
  const distance = Number(projectState.distanceM ?? 0);
  const videoWall = projectState.videoWall?.wallType?.length;

  const matrixRecommended =
    displays <= 4 && sources <= 4 && distance <= 30 && !videoWall;

  const avoipRecommended = topology?.transport === "AVoIP";
  const processorRecommended = Boolean(videoWall) || displays >= 4;

  return [
    {
      key: "matrix",
      title: "Matrix Switch",
      subtitle: "Fixed I/O Routing",
      selected: !avoipRecommended && matrixRecommended,
      summary:
        "Best when routing is bounded, the room is stable, and switching remains local.",
      stats: [
        `Sources ${sources}`,
        `Displays ${displays}`,
        distance > 0 ? `${distance}m run` : "Room-scale transport",
      ],
    },
    {
      key: "avoip",
      title: "AV over IP",
      subtitle: "Flexible & Scalable",
      selected: avoipRecommended,
      summary:
        "Best when scale, endpoint distribution, network flexibility, or growth matter.",
      stats: [
        `Sources ${sources}`,
        `Displays ${displays}`,
        topology?.switchRecommendation || "Managed switch path",
      ],
    },
    {
      key: "processor",
      title: "Video Wall Processor",
      subtitle: "Multiview & Control",
      selected: processorRecommended,
      summary:
        "Use when display canvas behavior, wall layouts, or advanced presentation modes drive the design.",
      stats: [
        videoWall ? "Wall mode enabled" : "Optional processor path",
        displays >= 4 ? "High display count" : "Standard display count",
        "Presentation control",
      ],
    },
  ];
}

function normalizeNodeName(name: string) {
  if (/^Source \d+$/i.test(name)) return "Video Source";
  if (/^Encoder \d+$/i.test(name)) return "AVoIP Transmitter";
  if (/^Decoder \d+$/i.test(name)) return "AVoIP Receiver";
  return name;
}

function groupSignalLinks(links: Array<{ from: string; to: string }>) {
  const map = new Map<string, Set<string>>();

  for (const link of links) {
    const from = normalizeNodeName(link.from);
    const to = normalizeNodeName(link.to);
    if (!map.has(from)) map.set(from, new Set<string>());
    map.get(from)!.add(to);
  }

  return Array.from(map.entries()).map(([from, values]) => ({
    from,
    to: Array.from(values),
  }));
}

export type WingmanUxShellProps = {
  projectState: WingmanShellInput;
};

export function WingmanUxShell({ projectState }: WingmanUxShellProps) {
  const [stage, setStage] = React.useState<WingmanStage>("architecture");
  const data = useWingmanUxPipeline(projectState);

  if (!data) {
    return (
      <div className="wmx-loading-card">
        <div className="wmx-loading-title">Running Wingman engines…</div>
        <div className="wmx-loading-copy">
          Resolving recommendation, topology, signal path, BOM, and proposal.
        </div>
      </div>
    );
  }

  const recommendation = data.recommendation;
  const topology = data.topology;
  const signalPath = data.signalPath;
  const room = data.room;
  const proposal = data.proposal;

  const decisionCards = buildDecisionCards(projectState, topology);
  const alertItems = toSeverity(recommendation, topology, projectState);
  const groupedLinks = groupSignalLinks(Array.isArray(signalPath?.links) ? signalPath.links : []);

  const activeRecommendationTitle =
    topology?.transport === "AVoIP"
      ? "AVoIP Network Configuration"
      : topology?.architecture || "System Configuration";

  const suggestedProducts = Array.isArray(room?.suggestedBom)
    ? room.suggestedBom.slice(0, 3)
    : [];

  const rightRail = (
    <>
      <section className="wmx-right-panel">
        <div className="wmx-right-title">System Recommendations</div>
        <div className="wmx-right-subtitle">Suggested Products</div>

        <div className="wmx-product-list">
          {suggestedProducts.length > 0 ? (
            suggestedProducts.map((item: any, index: number) => (
              <div key={`${item.sku || index}`} className="wmx-product-item">
                <div className="wmx-product-thumb">
                  <div className="wmx-device">
                    <div className="wmx-device-lights">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="wmx-device-lines" />
                  </div>
                </div>
                <div className="wmx-product-copy">
                  <strong>{item.sku || item.name || "Suggested product"}</strong>
                  <span>{item.description || item.role || "Recommended device class"}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="wmx-product-item">
              <div className="wmx-product-copy">
                <strong>No suggested products</strong>
                <span>Run the pipeline with qualifying inputs.</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="wmx-right-panel">
        <div className="wmx-right-title">Alerts</div>

        <div className="wmx-alert-list">
          {alertItems.map((item) => (
            <div key={item.title} className="wmx-alert-item">
              <div className={`wmx-alert-dot wmx-alert-dot--${item.level}`} />
              <div className="wmx-alert-copy">
                <strong>{item.title}</strong>
                <span>{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="wmx-right-panel">
        <div className="wmx-right-title">Recommendation Summary</div>
        <div className="wmx-summary-metric">
          <span>Primary family</span>
          <strong>{recommendation?.primaryFamily || "—"}</strong>
        </div>
        <div className="wmx-summary-metric">
          <span>Confidence</span>
          <strong>{recommendation?.confidenceScore ?? 0}</strong>
        </div>
        <div className="wmx-summary-metric">
          <span>Next tool</span>
          <strong>{room?.nextTool || "—"}</strong>
        </div>
      </section>
    </>
  );

  return (
    <WingmanWorkflowShell
      activeStage={stage}
      projectName={projectState.projectName}
      sourceCount={projectState.sourceCount}
      displayCount={projectState.displayCount}
      distanceM={projectState.distanceM}
      systemType={topology?.transport}
      rightRail={rightRail}
    >
      <section className="wmx-section">
        <div className="wmx-section-header">
          <h1>System Architecture Design</h1>
          <p>Select your configuration</p>
        </div>

        <div className="wmx-card-row">
          {decisionCards.map((card) => (
            <article
              key={card.key}
              className={`wmx-config-card${card.selected ? " is-selected" : ""}`}
            >
              <div className="wmx-config-visual">
                <div className="wmx-device wmx-device--large">
                  <div className="wmx-device-lights">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="wmx-device-lines" />
                </div>
              </div>

              <div className="wmx-config-title">{card.title}</div>
              <div className="wmx-config-subtitle">{card.subtitle}</div>
              <div className="wmx-config-copy">{card.summary}</div>

              <div className="wmx-config-stats">
                {card.stats.map((stat) => (
                  <span key={stat}>{stat}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="wmx-section">
        <div className="wmx-recommended-bar">
          <span className="wmx-recommended-label">Recommended:</span>
          <strong>{activeRecommendationTitle}</strong>
        </div>

        <div className="wmx-architecture-panel">
          <div className="wmx-panel-header">
            <div className="wmx-panel-title">
              {topology?.transport === "AVoIP" ? "AVoIP Network Layout" : "System Signal Layout"}
            </div>
            <div className="wmx-panel-dots">•••</div>
          </div>

          <div className="wmx-architecture-grid">
            <div className="wmx-column">
              <div className="wmx-node-label">Video Sources</div>
              <div className="wmx-node-stack">
                {Array.from({ length: Math.max(1, Number(projectState.sourceCount ?? 0)) }).map(
                  (_, index) => (
                    <div key={index} className="wmx-node-card">
                      <div className="wmx-device">
                        <div className="wmx-device-lights">
                          <span />
                          <span />
                          <span />
                        </div>
                        <div className="wmx-device-lines" />
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="wmx-column">
              <div className="wmx-node-label">
                {topology?.transport === "AVoIP" ? "Core Network Switch" : "Core Switching"}
              </div>
              <div className="wmx-core-stack">
                <div className="wmx-core-card">
                  <div className="wmx-device wmx-device--core">
                    <div className="wmx-device-lights">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="wmx-device-lines" />
                  </div>
                  <div className="wmx-core-copy">
                    <strong>{topology?.switchRecommendation || "Core switch recommendation"}</strong>
                    <span>{topology?.bandwidthEstimate || "Unknown bandwidth estimate"}</span>
                  </div>
                </div>

                {topology?.transport === "AVoIP" && (
                  <div className="wmx-core-card">
                    <div className="wmx-device">
                      <div className="wmx-device-lights">
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className="wmx-device-lines" />
                    </div>
                    <div className="wmx-core-copy">
                      <strong>AVoIP Transmitters</strong>
                      <span>{topology?.encoders ?? 0} encoder endpoints</span>
                    </div>
                  </div>
                )}

                <div className="wmx-core-card">
                  <div className="wmx-device">
                    <div className="wmx-device-lights">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="wmx-device-lines" />
                  </div>
                  <div className="wmx-core-copy">
                    <strong>Audio / Control Layer</strong>
                    <span>
                      {projectState.avGuide?.control || "Room control path not specified"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="wmx-column">
              <div className="wmx-node-label">
                {topology?.transport === "AVoIP" ? "AVoIP Receivers" : "Display Endpoints"}
              </div>
              <div className="wmx-display-grid">
                {Array.from({ length: Math.max(1, Number(projectState.displayCount ?? 0)) }).map(
                  (_, index) => (
                    <div key={index} className="wmx-display-card">
                      <div className="wmx-screen" />
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>

          <div className="wmx-link-summary">
            <div className="wmx-link-summary-title">Signal path summary</div>
            <div className="wmx-link-list">
              {groupedLinks.length > 0 ? (
                groupedLinks.slice(0, 8).map((group) => (
                  <div key={`${group.from}-${group.to.join("-")}`} className="wmx-link-item">
                    <strong>{group.from}</strong>
                    <span>→</span>
                    <span>{group.to.join(", ")}</span>
                  </div>
                ))
              ) : (
                <div className="wmx-link-item">
                  <strong>No signal links</strong>
                  <span>→</span>
                  <span>No generated path available</span>
                </div>
              )}
            </div>
          </div>

          <div className="wmx-panel-action">
            <button type="button" className="wmx-primary-btn" onClick={() => setStage("bom")}>
              Generate Bill of Materials
            </button>
          </div>
        </div>
      </section>

      {stage === "bom" && (
        <section className="wmx-section">
          <div className="wmx-section-header">
            <h2>Bill of Materials</h2>
            <p>Suggested hardware set derived from the live design pipeline</p>
          </div>

          <div className="wmx-data-panel">
            <table className="wmx-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(room?.suggestedBom) && room.suggestedBom.length > 0 ? (
                  room.suggestedBom.map((item: any, index: number) => (
                    <tr key={`${item.sku || "item"}-${index}`}>
                      <td>{item.sku || "—"}</td>
                      <td>{item.name || item.description || "Unnamed item"}</td>
                      <td>{item.qty || item.quantity || 1}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3}>No BOM returned.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {stage === "proposal" && (
        <section className="wmx-section">
          <div className="wmx-section-header">
            <h2>Proposal Output</h2>
            <p>Customer-facing output driven by the same live project state</p>
          </div>

          <div className="wmx-data-panel">
            <div className="wmx-proposal-title">{proposal?.title || "Proposal draft"}</div>
            <div className="wmx-proposal-list">
              {Array.isArray(proposal?.sections) && proposal.sections.length > 0 ? (
                proposal.sections.map((section: any, index: number) => (
                  <article key={index} className="wmx-proposal-card">
                    <h3>{section.heading}</h3>
                    <p>{section.content}</p>
                  </article>
                ))
              ) : (
                <article className="wmx-proposal-card">
                  <h3>No proposal sections</h3>
                  <p>The proposal service returned no sections.</p>
                </article>
              )}
            </div>
          </div>
        </section>
      )}
    </WingmanWorkflowShell>
  );
}