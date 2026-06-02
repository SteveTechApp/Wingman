export type AVSignalFlowMode =
  | "av-over-ip"
  | "matrix"
  | "video-wall"
  | "uc-presentation"
  | "wireless"
  | "extension"
  | "usb"
  | "proposal"
  | "discovery"
  | "generic"
  | string;

type AVSignalNode = {
  label: string;
  title: string;
  detail: string;
};

type AVSignalFlowDiagramProps = {
  mode?: AVSignalFlowMode;
  title?: string;
  subtitle?: string;
  compact?: boolean;
};

function normaliseMode(mode?: AVSignalFlowMode) {
  const text = String(mode || "generic").toLowerCase();

  if (text.includes("networkhd") || text.includes("av-over-ip") || text.includes("avoip") || text.includes("network")) return "av-over-ip";
  if (text.includes("matrix") || text.includes("routing")) return "matrix";
  if (text.includes("wall")) return "video-wall";
  if (text.includes("uc") || text.includes("presentation") || text.includes("teams") || text.includes("meeting") || text.includes("education")) return "uc-presentation";
  if (text.includes("wireless") || text.includes("airplay") || text.includes("miracast")) return "wireless";
  if (text.includes("usb")) return "usb";
  if (text.includes("extension") || text.includes("hdbaset") || text.includes("hdbt")) return "extension";
  if (text.includes("proposal")) return "proposal";
  if (text.includes("discovery")) return "discovery";

  return "generic";
}

function getNodes(mode?: AVSignalFlowMode): AVSignalNode[] {
  const resolved = normaliseMode(mode);

  if (resolved === "av-over-ip") {
    return [
      { label: "SRC", title: "Sources", detail: "Laptop, signage, media, camera or room PC" },
      { label: "TX", title: "Encode", detail: "NetworkHD transmitter / source endpoint" },
      { label: "NET", title: "AV network", detail: "Switching, VLAN, multicast and control" },
      { label: "RX", title: "Displays", detail: "Decoder, room display, wall or endpoint" },
    ];
  }

  if (resolved === "matrix") {
    return [
      { label: "IN", title: "Inputs", detail: "Sky, HDMI, PC, signage or local sources" },
      { label: "MX", title: "Matrix", detail: "Fixed routing, scaling or HDBaseT outputs" },
      { label: "CAT", title: "Transport", detail: "HDMI / Cat6 / HDBaseT cable path" },
      { label: "OUT", title: "Displays", detail: "Screens, zones, bars or presentation areas" },
    ];
  }

  if (resolved === "video-wall") {
    return [
      { label: "SRC", title: "Content", detail: "Signage, HDMI source, player or live feed" },
      { label: "VW", title: "Wall processing", detail: "Canvas, layout, scaling or multiview" },
      { label: "OUT", title: "Panel feeds", detail: "Per-display outputs or processor feed" },
      { label: "WALL", title: "Visual surface", detail: "LCD wall, LED processor or display array" },
    ];
  }

  if (resolved === "uc-presentation") {
    return [
      { label: "USER", title: "User device", detail: "USB-C, HDMI, wireless or room PC" },
      { label: "USB", title: "UC path", detail: "Camera, mic, speakerphone and touch" },
      { label: "SW", title: "Room core", detail: "Presentation switcher or hybrid system" },
      { label: "ROOM", title: "Room output", detail: "Display, audio and Teams / Zoom workflow" },
    ];
  }

  if (resolved === "wireless") {
    return [
      { label: "BYOD", title: "Personal device", detail: "Laptop, tablet or mobile sharing" },
      { label: "WIFI", title: "Wireless policy", detail: "AirPlay, Miracast, guest access and IT rules" },
      { label: "SW", title: "Room switching", detail: "Wireless plus wired fallback where needed" },
      { label: "DSP", title: "Display output", detail: "Presentation, signage or meeting display" },
    ];
  }

  if (resolved === "usb") {
    return [
      { label: "CAM", title: "USB device", detail: "Camera, touch, mic, speakerphone or KVM" },
      { label: "USB", title: "USB transport", detail: "USB 2 / USB 3 / extension requirement" },
      { label: "HOST", title: "Host ownership", detail: "Laptop, room PC or appliance" },
      { label: "CALL", title: "Meeting workflow", detail: "Teams, Zoom, BYOD or support path" },
    ];
  }

  if (resolved === "extension") {
    return [
      { label: "SRC", title: "Source", detail: "One local HDMI / USB / control source" },
      { label: "TX", title: "Transmit", detail: "HDBaseT, HDMI or USB extension" },
      { label: "CAT", title: "Transport", detail: "Distance, cable quality and termination" },
      { label: "RX", title: "Remote display", detail: "Point-to-point output or room endpoint" },
    ];
  }

  if (resolved === "proposal") {
    return [
      { label: "REQ", title: "Requirement", detail: "Customer wording and confirmed evidence" },
      { label: "FIT", title: "Architecture", detail: "Recommended WyreStorm direction" },
      { label: "RISK", title: "Validation", detail: "Assumptions, dependencies and gaps" },
      { label: "OUT", title: "Safe output", detail: "Follow-up, proposal starter and next steps" },
    ];
  }

  return [
    { label: "ASK", title: "Discovery", detail: "What is the customer trying to achieve?" },
    { label: "PATH", title: "Signal path", detail: "Video, USB, audio, network and control" },
    { label: "FIT", title: "Product route", detail: "Architecture family before SKU selection" },
    { label: "CHECK", title: "Validate", detail: "Dependencies and missing information before quote" },
  ];
}

function classForMode(mode?: AVSignalFlowMode) {
  return `wm-av-flow--${normaliseMode(mode).replace(/[^a-z0-9]+/g, "-")}`;
}

export function AVSignalFlowDiagram({
  mode = "generic",
  title = "AV signal path",
  subtitle = "Use this visual flow to explain the system shape before choosing products.",
  compact = false,
}: AVSignalFlowDiagramProps) {
  const nodes = getNodes(mode);

  return (
    <details
      className={`wm-av-flow-shell ${compact ? "is-compact" : ""}`}
      data-wingman-optional-visual-support="true"
    >
      <summary>
        <span>Optional visual support</span>
        <strong>Show AV system shape</strong>
        <small>{title}</small>
      </summary>

      <section
        className={`wm-av-flow ${classForMode(mode)}${compact ? " is-compact" : ""}`}
        data-wingman-av-flow="true"
        aria-label={title}
      >
        <header className="wm-av-flow-header">
          <span>Visual system shape</span>
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </header>

        <div className="wm-av-flow-track">
          {nodes.map((node, index) => (
            <div className="wm-av-flow-step" key={`${node.label}-${node.title}`}>
              <article className="wm-av-flow-node">
                <span className="wm-av-flow-glyph">{node.label}</span>
                <strong>{node.title}</strong>
                <small>{node.detail}</small>
              </article>

              {index < nodes.length - 1 ? <div className="wm-av-flow-arrow" aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
      </section>
    </details>
  );
}

export default AVSignalFlowDiagram;