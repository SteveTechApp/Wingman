import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  Monitor,
  Network,
  SlidersHorizontal,
  WandSparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/context/ProjectContext";
import "./wingman-dashboard.css";

type ArchitectureKey = "matrix" | "avoip" | "video-wall";

type ArchitectureOption = {
  key: ArchitectureKey;
  title: string;
  subtitle: string;
  descriptor: string;
  badge: string;
};

type ProductRecommendation = {
  name: string;
  detail: string;
};

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferRecommendedArchitecture(project: any): ArchitectureKey {
  if (project?.discovery?.videoWall) return "video-wall";

  const sources = toNumber(project?.discovery?.sources ?? project?.discovery?.sourceCount);
  const displays = toNumber(project?.discovery?.displays ?? project?.discovery?.displayCount);
  const distance = toNumber(
    project?.discovery?.distanceM ?? project?.discovery?.distance ?? project?.distanceM,
  );

  if (project?.discovery?.networkReady || displays >= 4 || sources >= 4 || distance >= 20) {
    return "avoip";
  }

  return "matrix";
}

const architectureOptions: ArchitectureOption[] = [
  {
    key: "matrix",
    title: "Matrix Switch",
    subtitle: "Fixed I/O Routing",
    descriptor: "Direct switching for compact spaces and predictable signal paths.",
    badge: "Best for boardrooms and classroom cores",
  },
  {
    key: "avoip",
    title: "AV over IP",
    subtitle: "Flexible & Scalable",
    descriptor: "Modular transport for distributed rooms, long distances, and future growth.",
    badge: "Recommended for enterprise network-ready projects",
  },
  {
    key: "video-wall",
    title: "Video Wall Processor",
    subtitle: "Multiview & Control",
    descriptor: "Canvas processing for composed layouts, presets, and operator control.",
    badge: "Best for control rooms and presentation walls",
  },
];

const productMap: Record<ArchitectureKey, ProductRecommendation[]> = {
  matrix: [
    { name: "MX-240 Matrix Core", detail: "8x8 presentation switcher" },
    { name: "HDMI Receiver RX-110", detail: "Display endpoint" },
  ],
  avoip: [
    { name: "AVoIP Transmitter TX-300", detail: "4K encoder" },
    { name: "AVoIP Receiver RX-500", detail: "4K decoder" },
  ],
  "video-wall": [
    { name: "Wall Processor VP-840", detail: "4K multiview processor" },
    { name: "Control Surface CS-16", detail: "Preset and layout recall" },
  ],
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { projectData } = useProjectContext();
  const project = projectData.activeProject;

  const sourceCount = toNumber(
    project?.discovery?.sources ?? project?.discovery?.sourceCount ?? 4,
  );
  const displayCount = toNumber(
    project?.discovery?.displays ?? project?.discovery?.displayCount ?? 6,
  );
  const distanceM = toNumber(
    project?.discovery?.distanceM ?? project?.discovery?.distance ?? project?.distanceM ?? 50,
  );

  const recommendedArchitecture = useMemo(
    () => inferRecommendedArchitecture(project),
    [project],
  );
  const [selectedArchitecture, setSelectedArchitecture] =
    useState<ArchitectureKey>(recommendedArchitecture);

  useEffect(() => {
    setSelectedArchitecture(recommendedArchitecture);
  }, [recommendedArchitecture]);

  const selectedOption =
    architectureOptions.find((option) => option.key === selectedArchitecture) ??
    architectureOptions[1];

  const recommendations = productMap[selectedArchitecture];
  const diagramLabels =
    selectedArchitecture === "matrix"
      ? {
          core: "Matrix Core",
          transport: "Matrix Outputs",
          outputs: "Display Endpoints",
          audio: "Audio Breakout",
        }
      : selectedArchitecture === "video-wall"
        ? {
            core: "Processing Core",
            transport: "Wall Controllers",
            outputs: "Display Zones",
            audio: "Audio DSP",
          }
        : {
            core: "Core Network Switch",
            transport: "AVoIP Transmitters",
            outputs: "AVoIP Receivers",
            audio: "Audio DSP",
          };

  const alerts = [
    {
      title: "Bandwidth Check",
      detail: project?.discovery?.networkReady
        ? "Network capacity: OK"
        : "Managed switch confirmation needed",
      status: project?.discovery?.networkReady ? "good" : "warn",
    },
    {
      title: "Latency",
      detail: selectedArchitecture === "matrix" ? "Low" : "Low with QoS policy",
      status: "good" as const,
    },
    {
      title: "USB Extension",
      detail: project?.discovery?.usbRequired ? "Required in BOM" : "Not requested",
      status: project?.discovery?.usbRequired ? "info" : "good",
    },
  ];

  return (
    <div className="wingman-dashboard">
      <section className="wingman-dashboard__main">
        <header className="wingman-dashboard__header">
          <h1>System Architecture Design</h1>
          <p>
            Select the transport model, validate the signal flow, and move straight
            into BOM generation.
          </p>
        </header>

        <section className="wingman-dashboard__panel">
          <div className="wingman-dashboard__section-heading">
            <h2>Select Your Configuration</h2>
          </div>

          <div className="wingman-dashboard__architecture-grid">
            {architectureOptions.map((option) => {
              const active = option.key === selectedArchitecture;
              return (
                <button
                  key={option.key}
                  type="button"
                  className={`wingman-dashboard__architecture-card${active ? " is-active" : ""}`}
                  onClick={() => setSelectedArchitecture(option.key)}
                >
                  <div className="wingman-dashboard__architecture-copy">
                    <strong>{option.title}</strong>
                    <span>{option.subtitle}</span>
                  </div>

                  <div
                    className={`wingman-dashboard__device-art wingman-dashboard__device-art--${option.key}`}
                    aria-hidden="true"
                  >
                    <span className="wingman-dashboard__device-shell" />
                    <span className="wingman-dashboard__device-lights" />
                    <span className="wingman-dashboard__device-vents" />
                    {option.key === "avoip" ? (
                      <>
                        <span className="wingman-dashboard__signal wingman-dashboard__signal--blue" />
                        <span className="wingman-dashboard__signal wingman-dashboard__signal--orange" />
                      </>
                    ) : null}
                  </div>

                  <p>{option.descriptor}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="wingman-dashboard__recommendation">
          <span>Recommended:</span>
          <strong>{selectedOption.title} Configuration</strong>
          <small>{selectedOption.badge}</small>
        </section>

        <section className="wingman-dashboard__diagram-panel">
          <div className="wingman-dashboard__diagram-head">
            <div>
              <h2>{selectedOption.title} Network Layout</h2>
              <p>
                {sourceCount} sources feeding {displayCount} displays across {distanceM}m.
              </p>
            </div>
            <div className="wingman-dashboard__diagram-dots">•••</div>
          </div>

          <div className="wingman-dashboard__diagram">
            <svg
              className="wingman-dashboard__wiring"
              viewBox="0 0 1000 520"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M148 120 H360" />
              <path d="M148 230 H300 V315 H430" />
              <path d="M148 310 H270 V360 H430" />
              <path d="M505 125 V188" />
              <path d="M552 125 V188" />
              <path d="M602 125 V188" />
              <path d="M634 120 H828" />
              <path d="M632 250 H705 V265 H820" />
              <path d="M632 360 H712 V355 H820" />
              <path d="M505 328 V420" />
              <path d="M568 328 V420" />
              <path d="M612 328 V420" />
            </svg>

            <div className="wingman-dashboard__diagram-grid">
              <div className="wingman-dashboard__zone wingman-dashboard__zone--sources">
                <div className="wingman-dashboard__zone-label">Video Sources</div>
                <div className="wingman-dashboard__rack-device" />
                <div className="wingman-dashboard__rack-device" />
                <div className="wingman-dashboard__rack-device" />
                <div className="wingman-dashboard__control-box" />
                <div className="wingman-dashboard__source-base" />
              </div>

              <div className="wingman-dashboard__zone wingman-dashboard__zone--core">
                <div className="wingman-dashboard__zone-label">{diagramLabels.core}</div>
                <div className="wingman-dashboard__hero-device wingman-dashboard__hero-device--core" />
                <div className="wingman-dashboard__hero-device wingman-dashboard__hero-device--tx">
                  <span>{diagramLabels.transport}</span>
                </div>
                <div className="wingman-dashboard__controller-strip" />
              </div>

              <div className="wingman-dashboard__zone wingman-dashboard__zone--outputs">
                <div className="wingman-dashboard__zone-label">{diagramLabels.outputs}</div>
                <div className="wingman-dashboard__display-stack">
                  <div className="wingman-dashboard__display-tile" />
                  <div className="wingman-dashboard__display-tile" />
                  <div className="wingman-dashboard__display-tile" />
                  <div className="wingman-dashboard__display-tile" />
                  <div className="wingman-dashboard__display-tile" />
                  <div className="wingman-dashboard__display-tile" />
                </div>
                <div className="wingman-dashboard__audio-node">
                  <span>{diagramLabels.audio}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="wingman-dashboard__diagram-actions">
            <button
              type="button"
              className="wingman-dashboard__primary-button"
              onClick={() => navigate("/app/tools/proposal")}
            >
              <WandSparkles size={18} strokeWidth={1.9} />
              Generate Bill of Materials
            </button>
          </div>
        </section>
      </section>

      <aside className="wingman-dashboard__rail">
        <section className="wingman-dashboard__rail-panel">
          <div className="wingman-dashboard__rail-header">
            <h2>System Recommendations</h2>
            <span>•••</span>
          </div>

          <div className="wingman-dashboard__rail-subheading">Suggested Products:</div>
          <div className="wingman-dashboard__product-list">
            {recommendations.map((product) => (
              <article key={product.name} className="wingman-dashboard__product-card">
                <div className="wingman-dashboard__product-thumb" aria-hidden="true" />
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.detail}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="wingman-dashboard__rail-panel">
          <div className="wingman-dashboard__rail-header">
            <h2>Alerts</h2>
            <span>•••</span>
          </div>

          <div className="wingman-dashboard__alert-stack">
            {alerts.map((alert) => (
              <article key={alert.title} className="wingman-dashboard__alert-card">
                <div className="wingman-dashboard__alert-title">
                  {alert.status === "warn" ? (
                    <AlertTriangle size={18} strokeWidth={1.9} />
                  ) : alert.status === "info" ? (
                    <Gauge size={18} strokeWidth={1.9} />
                  ) : (
                    <CheckCircle2 size={18} strokeWidth={1.9} />
                  )}
                  <strong>{alert.title}</strong>
                </div>
                <span
                  className={`wingman-dashboard__alert-status wingman-dashboard__alert-status--${alert.status}`}
                >
                  {alert.detail}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="wingman-dashboard__rail-panel wingman-dashboard__rail-panel--summary">
          <div className="wingman-dashboard__mini-stat">
            <span>Selected Architecture</span>
            <strong>{selectedOption.title}</strong>
          </div>
          <div className="wingman-dashboard__mini-stat">
            <span>Project Scope</span>
            <strong>
              {sourceCount} inputs / {displayCount} outputs
            </strong>
          </div>
          <div className="wingman-dashboard__rail-actions">
            <button type="button" onClick={() => navigate("/app/tools/discovery")}>
              <Monitor size={16} strokeWidth={1.9} />
              Refine Discovery
            </button>
            <button type="button" onClick={() => navigate("/app/tools/navigator")}>
              <SlidersHorizontal size={16} strokeWidth={1.9} />
              Review Tech Fit
            </button>
            <button type="button" onClick={() => navigate("/app/tools/proposal")}>
              <Network size={16} strokeWidth={1.9} />
              Open Proposal
              <ArrowRight size={16} strokeWidth={1.9} />
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}
