import { useMemo, useState } from "react";
import { getTemplateDiscoverySeed } from "../lib/templateDiscoverySeeds";
import type { TemplateDiscoverySeed } from "../lib/templateDiscoverySeeds";

type TemplateStatus = "Discovery ready" | "Advisory ready" | "Pre-sales review";

type Template = {
  id: string;
  vertical: string;
  application: string;
  title: string;
  summary: string;
  technology: string;
  roomType: string;
  direction: string;
  askNext: string[];
  dependencies: string[];
  status: TemplateStatus;
};

const templates: Template[] = [
  {
    id: "corp-boardroom-nhd500",
    vertical: "Corporate",
    application: "Boardroom",
    title: "Executive Boardroom - NetworkHD 500",
    summary: "Premium meeting space with multiple sources, several displays, conferencing and expansion requirements.",
    technology: "NetworkHD 500",
    roomType: "Boardroom / divisible meeting room",
    direction: "Use NetworkHD 500 where flexible 4K60 routing, USB planning and expansion are required.",
    askNext: ["How many sources and displays?", "Is USB conferencing required?", "Is the AV network dedicated?"],
    dependencies: ["NHD-CTL-PRO v2", "Managed network switch", "USB path review"],
    status: "Pre-sales review"
  },
  {
    id: "corp-huddle-byod",
    vertical: "Corporate",
    application: "Meeting room",
    title: "Huddle Room - BYOD Presentation",
    summary: "Small meeting room where a user laptop drives presentation and room USB devices.",
    technology: "Apollo / UC presentation",
    roomType: "Small BYOD meeting room",
    direction: "Use a compact presentation/UC route rather than unnecessary AV-over-IP.",
    askNext: ["BYOD, room PC or Teams appliance?", "USB-C or HDMI?", "Which camera and audio devices?"],
    dependencies: ["USB camera/speakerphone", "Display connection", "USB ownership check"],
    status: "Discovery ready"
  },
  {
    id: "corp-training-room",
    vertical: "Corporate",
    application: "Training",
    title: "Corporate Training Room - Multi-Source Presentation",
    summary: "Trainer laptop, room PC, guest input and one or two displays for teaching or staff training.",
    technology: "Presentation switcher / HDBaseT",
    roomType: "Training room",
    direction: "Use local switching with HDBaseT extension if the display is beyond practical HDMI distance.",
    askNext: ["Display cable distance?", "How many user inputs?", "Any USB camera, touch or recording requirement?"],
    dependencies: ["Display receiver if extended", "Control method", "Audio output path"],
    status: "Discovery ready"
  },
  {
    id: "edu-classroom-hdbaset",
    vertical: "Education",
    application: "Classroom",
    title: "Standard Classroom - Front-of-Room HDBaseT",
    summary: "Lectern-led classroom with local inputs extended to a projector or teaching display.",
    technology: "HDBaseT",
    roomType: "Teaching room / classroom",
    direction: "Use HDBaseT extender or switcher for reliable point-to-point transport.",
    askNext: ["Lectern-to-display distance?", "HDMI, USB-C or both?", "Interactive display or USB touch?"],
    dependencies: ["HDBaseT receiver", "Control path", "Audio extraction if required"],
    status: "Discovery ready"
  },
  {
    id: "edu-lecture-theatre-nhd500",
    vertical: "Education",
    application: "Lecture theatre",
    title: "Lecture Theatre - NetworkHD 500",
    summary: "Large teaching space with lectern sources, confidence displays, capture feeds and flexible routing.",
    technology: "NetworkHD 500",
    roomType: "Lecture theatre",
    direction: "Use NetworkHD 500 where routing flexibility, display quality and future expansion matter.",
    askNext: ["Lecture capture required?", "Confidence monitor required?", "Any USB camera or annotation workflow?"],
    dependencies: ["NHD-CTL-PRO v2", "Managed network switch", "Capture/streaming review"],
    status: "Pre-sales review"
  },
  {
    id: "edu-active-learning",
    vertical: "Education",
    application: "Active learning",
    title: "Active Learning Classroom - Multi-Display Routing",
    summary: "Collaborative teaching room where groups share content to local and main displays.",
    technology: "NetworkHD 500 / matrix",
    roomType: "Collaborative classroom",
    direction: "Use NetworkHD 500 for flexible many-to-many routing; use matrix if fixed and local.",
    askNext: ["How many group tables?", "Can any table show on any display?", "Is touchback or USB needed?"],
    dependencies: ["Control interface", "NHD-CTL-PRO v2 if AVoIP", "Display receiver count"],
    status: "Pre-sales review"
  },
  {
    id: "hospitality-pub-matrix",
    vertical: "Hospitality",
    application: "Pub / bar",
    title: "Local Pub - Matrix TV Distribution",
    summary: "Small venue with fixed source and display count where a matrix is simpler than AV-over-IP.",
    technology: "HDMI / HDBaseT matrix",
    roomType: "Small pub / local bar",
    direction: "Use an MX-0808-KIT-style matrix direction where I/O is fixed and distances suit.",
    askNext: ["How many displays need independent source choice?", "Are sources in one rack?", "Cable distances to displays?"],
    dependencies: ["Receivers if required", "Control method", "Audio breakout if needed"],
    status: "Discovery ready"
  },
  {
    id: "hospitality-sportsbar-nhd100",
    vertical: "Hospitality",
    application: "Sports bar",
    title: "Sports Bar - NetworkHD 100 Distribution",
    summary: "Multi-screen venue where several live sports or signage feeds route to different zones.",
    technology: "NetworkHD 100",
    roomType: "Sports bar / multi-zone venue",
    direction: "Use NetworkHD 100 with NHD-CTL-PRO v2 for cost-effective flexible AV distribution.",
    askNext: ["How many screens and sources?", "Are screens grouped into zones?", "Who controls source changes?"],
    dependencies: ["NHD-CTL-PRO v2", "Managed switch with multicast support", "Simple control interface"],
    status: "Discovery ready"
  },
  {
    id: "hospitality-casino-led",
    vertical: "Hospitality",
    application: "Casino / gaming",
    title: "Casino LED Wall - Multiview or Premium Feed",
    summary: "Large LED feature wall for sports, gaming, promotions or live venue content.",
    technology: "NHD-0401-MV / NetworkHD 600",
    roomType: "Casino floor / entertainment venue",
    direction: "Use NHD-0401-MV for multiview feed, or NetworkHD 600 for premium zero-latency routing.",
    askNext: ["LED processor input count?", "Fixed layout or floating windows?", "Is zero latency required?"],
    dependencies: ["LED processor", "Resolution/scaling review", "Control method"],
    status: "Pre-sales review"
  },
  {
    id: "hospitality-ballroom",
    vertical: "Hospitality",
    application: "Hotel events",
    title: "Hotel Ballroom - Divisible Room AV",
    summary: "Events space with movable walls, multiple room modes, sources and display/audio zones.",
    technology: "Matrix / NetworkHD 500",
    roomType: "Hotel ballroom",
    direction: "Use matrix for fixed I/O; use NetworkHD 500 when room combinations change frequently.",
    askNext: ["How many divide modes?", "Do sources move with rooms?", "Hybrid meeting support required?"],
    dependencies: ["Room-combine control", "Audio DSP", "Display endpoint count"],
    status: "Pre-sales review"
  },
  {
    id: "retail-signage",
    vertical: "Retail",
    application: "Digital signage",
    title: "Retail Signage Rollout - Multi-Display Distribution",
    summary: "Repeatable signage design for customer-facing screens, departments or store zones.",
    technology: "NetworkHD 100 / HDMI distribution",
    roomType: "Retail store / showroom",
    direction: "Use NetworkHD 100 for flexible store routing or simple distribution for repeated content.",
    askNext: ["Same content on every display?", "Displays grouped by department?", "Media players local or centralised?"],
    dependencies: ["Media players", "Network switch if AVoIP", "Display power and mounting"],
    status: "Discovery ready"
  },
  {
    id: "retail-qsr",
    vertical: "Retail",
    application: "QSR / menu boards",
    title: "QSR Menu Boards - Reliable Display Feed",
    summary: "Menu board system using fixed signage players and displays across a food-service counter.",
    technology: "HDMI / HDBaseT extension",
    roomType: "QSR / restaurant",
    direction: "Use HDMI or HDBaseT extension where players are centralised away from displays.",
    askNext: ["Players behind displays or centralised?", "How many displays?", "One canvas or independent menu screens?"],
    dependencies: ["Media players", "Cable path validation", "Display mounting/power"],
    status: "Discovery ready"
  },
  {
    id: "public-courtroom",
    vertical: "Public sector",
    application: "Courtroom",
    title: "Courtroom - Evidence Presentation",
    summary: "Controlled evidence presentation to judge, witness, counsel and public displays.",
    technology: "Matrix / NetworkHD 500",
    roomType: "Courtroom / hearing room",
    direction: "Use matrix for fixed rooms; use NetworkHD 500 where flexible display routing is needed.",
    askNext: ["Who can see each source?", "Blanking/privacy needed?", "Recording or remote hearing support?"],
    dependencies: ["Control system", "Display routing rules", "Audio/conferencing integration"],
    status: "Pre-sales review"
  },
  {
    id: "public-council",
    vertical: "Public sector",
    application: "Council chamber",
    title: "Council Chamber - Presentation and Streaming",
    summary: "Civic meeting room with presentation, microphones, capture, streaming and public displays.",
    technology: "NetworkHD 500 / presentation switching",
    roomType: "Council chamber",
    direction: "Use NetworkHD 500 where several displays, capture feeds and operator views are required.",
    askNext: ["Streaming required?", "Public versus operator-only displays?", "Camera format: HDMI, USB, SDI or NDI?"],
    dependencies: ["Audio DSP", "Capture/streaming device", "Camera workflow review"],
    status: "Pre-sales review"
  },
  {
    id: "health-consultation",
    vertical: "Healthcare",
    application: "Consultation",
    title: "Healthcare Consultation Room - BYOD Display and USB",
    summary: "Clinical meeting room for laptop presentation, remote consultation and USB camera/audio.",
    technology: "Apollo / UC presentation",
    roomType: "Consultation room",
    direction: "Use compact BYOD presentation and USB device access.",
    askNext: ["Video consultation required?", "USB-C or HDMI plus USB?", "Any IT lockdown restrictions?"],
    dependencies: ["USB camera/speakerphone", "Display", "IT security review"],
    status: "Discovery ready"
  },
  {
    id: "health-simulation",
    vertical: "Healthcare",
    application: "Simulation",
    title: "Medical Simulation Suite - Capture and Observation",
    summary: "Simulation space with cameras, observation displays and recording or streaming.",
    technology: "NetworkHD 500 / NDI workflow",
    roomType: "Simulation lab",
    direction: "Use NetworkHD 500 for AV routing; include NDI bridge/camera direction where required.",
    askNext: ["Are cameras HDMI, USB or NDI?", "Is recording required?", "Multiple observer views needed?"],
    dependencies: ["Camera workflow", "Audio capture", "NHD-CTL-PRO v2 if AVoIP"],
    status: "Pre-sales review"
  },
  {
    id: "worship-overflow",
    vertical: "House of worship",
    application: "Sanctuary",
    title: "House of Worship - Sanctuary and Overflow",
    summary: "Main service AV routed to sanctuary displays, overflow rooms and streaming systems.",
    technology: "NetworkHD 100 / 500",
    roomType: "Worship space",
    direction: "Use NetworkHD 100 for cost-effective distribution or NetworkHD 500 for lower-latency premium routing.",
    askNext: ["Is IMAG latency critical?", "How many overflow displays?", "Camera format and streaming workflow?"],
    dependencies: ["Network switching", "NHD-CTL-PRO v2", "Audio/camera integration"],
    status: "Pre-sales review"
  },
  {
    id: "leisure-bingo",
    vertical: "Leisure",
    application: "Bingo / club",
    title: "Bingo Hall - Multi-Zone Display Distribution",
    summary: "Venue distribution for caller feed, signage, entertainment and area-specific screens.",
    technology: "NetworkHD 100 / matrix",
    roomType: "Bingo hall / social club",
    direction: "Use NetworkHD 100 where flexible zoning is needed; use matrix where zones are fixed.",
    askNext: ["How many zones?", "Fixed daily presets?", "One-button staff control needed?"],
    dependencies: ["Control interface", "Audio zoning", "Managed switch if AVoIP"],
    status: "Discovery ready"
  },
  {
    id: "leisure-gym",
    vertical: "Leisure",
    application: "Gym / fitness",
    title: "Gym and Fitness Venue - TV and Signage Distribution",
    summary: "Fitness venue with TV feeds, class content and promotional signage across zones.",
    technology: "NetworkHD 100 / HDMI distribution",
    roomType: "Gym / leisure centre",
    direction: "Use NetworkHD 100 for flexible source routing across different workout areas.",
    askNext: ["Displays grouped by area?", "Audio muted, local or zoned?", "Who changes sources?"],
    dependencies: ["Control method", "Network switch if AVoIP", "Audio zoning review"],
    status: "Discovery ready"
  },
  {
    id: "visitor-museum",
    vertical: "Visitor attraction",
    application: "Museum / exhibition",
    title: "Museum Exhibition - Scheduled AV Displays",
    summary: "Exhibition AV with media players, projectors, displays and timed or interactive content.",
    technology: "HDBaseT / NetworkHD",
    roomType: "Museum / visitor attraction",
    direction: "Use HDBaseT for fixed exhibits or NetworkHD where central routing/flexibility is needed.",
    askNext: ["Media players local or centralised?", "Interactive content?", "Synchronised or independent displays?"],
    dependencies: ["Media players", "Control/scheduling", "Cable path validation"],
    status: "Discovery ready"
  },
  {
    id: "vw-lcd",
    vertical: "Video wall",
    application: "LCD wall",
    title: "LCD Video Wall - Retail, Lobby or Control Space",
    summary: "LCD wall for signage, branding, source display or simple multi-window layouts.",
    technology: "SW-0204-VW / SW-0206-VW / NetworkHD",
    roomType: "LCD video wall",
    direction: "Use SW-0204-VW for simple preset walls, SW-0206-VW for more processing, or AVoIP for flexible routing.",
    askNext: ["Wall size and layout?", "Full canvas or per-screen content?", "Do displays support tile mode?"],
    dependencies: ["Wall processor or receivers", "Control method", "Source resolution validation"],
    status: "Pre-sales review"
  },
  {
    id: "vw-led",
    vertical: "Video wall",
    application: "LED wall",
    title: "LED Video Wall - Venue Feed and Multiview",
    summary: "LED wall where WyreStorm provides source routing or multiview before the LED processor.",
    technology: "NHD-0401-MV / NetworkHD 600",
    roomType: "LED video wall",
    direction: "Use NHD-0401-MV for four-source multiview feed; use NetworkHD 600 for premium zero-latency routing.",
    askNext: ["One processor feed or several?", "Fixed or operator-controlled layouts?", "Zero latency required?"],
    dependencies: ["LED processor", "Resolution/scaling review", "Control method"],
    status: "Pre-sales review"
  },
  {
    id: "control-room-nhd600-command-led",
    vertical: "Control room",
    application: "Command & control",
    title: "Large Command & Control Room - NetworkHD 600 LED Wall",
    summary: "Premium command and control room using NetworkHD 600 with a large LED multiview wall via NovaStar processing.",
    technology: "NetworkHD 600 / NovaStar LED processor",
    roomType: "Large command and control room",
    direction: "Use NetworkHD 600 as the high-performance 10G AV-over-IP layer for the main control room, with LED wall feed design through the NovaStar processor.",
    askNext: ["How many data sources?", "How many gold and silver command displays?", "Does NovaStar need one feed or multiple feeds?"],
    dependencies: ["NetworkHD 600 endpoints", "NHD-CTL-PRO v2", "10G managed switch", "NovaStar processor"],
    status: "Pre-sales review"
  },
  {
    id: "security-office-nhd100-monitoring",
    vertical: "Control room",
    application: "Security monitoring",
    title: "Security Office Monitoring - NetworkHD 100 Multiview",
    summary: "Security office monitoring system using NHD-124-TX source encoders and NHD-150-RX multiview receivers.",
    technology: "NetworkHD 100 / NHD-124-TX / NHD-150-RX",
    roomType: "Security office / monitoring room",
    direction: "Use NHD-124-TX and NHD-150-RX as a separate NetworkHD 100 monitoring subsystem.",
    askNext: ["How many feeds?", "How many monitoring displays?", "Fixed or user-selectable multiview layouts?"],
    dependencies: ["NHD-124-TX", "NHD-150-RX", "NHD-CTL-PRO v2", "1GbE managed switch"],
    status: "Pre-sales review"
  },
  {
    id: "ops-centre-50pc-nhd500-kvm",
    vertical: "Control room",
    application: "Operations centre",
    title: "Control Desk Ops Centre - 50 Central PCs / 12 Monitors / USB-KVM",
    summary: "Operations centre with 50 centralised PCs, four USB-KVM operator positions and eight view-only monitors using NetworkHD 500.",
    technology: "NetworkHD 500",
    roomType: "Operations centre / control desk",
    direction: "Use NHD-500-TX x50, NHD-500-E-RX x8 and USB-capable NetworkHD 500 receiver endpoints for the four KVM positions.",
    askNext: ["Can all users access all 50 PCs?", "Are KVM positions single-screen or multi-screen?", "Are view-only screens fixed or routable?"],
    dependencies: ["NHD-500-TX x50", "NHD-500-E-RX x8", "NHD-500-RX x4 assumed", "NHD-CTL-PRO v2"],
    status: "Pre-sales review"
  }
];

const verticals = ["All", ...Array.from(new Set(templates.map((template) => template.vertical)))];

function TemplatesPage() {
  const [query, setQuery] = useState("");
  const [vertical, setVertical] = useState("All");
  const [stagedId, setStagedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    return templates.reduce<Record<string, number>>((acc, template) => {
      acc.All = (acc.All ?? 0) + 1;
      acc[template.vertical] = (acc[template.vertical] ?? 0) + 1;
      return acc;
    }, { All: 0 });
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return templates.filter((template) => {
      const verticalMatch = vertical === "All" || template.vertical === vertical;
      const searchText = [
        template.vertical,
        template.application,
        template.title,
        template.summary,
        template.technology,
        template.roomType,
        template.direction
      ].join(" ").toLowerCase();

      return verticalMatch && (!search || searchText.includes(search));
    });
  }, [query, vertical]);

  function stageTemplate(template: Template) {
    const fallbackSeed: TemplateDiscoverySeed = {
      templateId: template.id,
      source: "Templates",
      application: template.application,
      vertical: template.vertical,
      roomType: template.roomType,
      physicalScale: "Project scale to be confirmed",
      confidence: "assumed",
      editableAssumptions: {
        transport: template.technology,
        productFamily: template.technology,
        usbRequired: template.technology.toLowerCase().includes("usb") || template.direction.toLowerCase().includes("usb"),
        controlNeed: "Control requirement to be confirmed.",
        networkNeed: template.technology.toLowerCase().includes("networkhd") ? "Managed network required." : "Network requirement to be confirmed."
      },
      likelySources: [],
      likelyDisplays: [],
      wyrestormDirection: template.direction,
      productDirection: [template.direction],
      dependencies: template.dependencies,
      missingInformation: [
        "Final display count",
        "Final source count",
        "Cable distances",
        "Control method",
        "Audio requirement",
        "Network ownership"
      ],
      nextQuestions: template.askNext
    };

    const seed = getTemplateDiscoverySeed(template.id) ?? fallbackSeed;window.sessionStorage.setItem("wingman:selected-template", JSON.stringify(template));
    window.sessionStorage.setItem("wingman:template-discovery-seed", JSON.stringify(seed));
    window.sessionStorage.removeItem("wingman:template-discovery-seed-updated");
    setStagedId(template.id);
  }

  return (
    <main
      className="wm-templates-page wm-ui-page wingman-page-host"
      data-wingman-page="templates"
      data-template-selection={stagedId ? "staged" : "idle"}
    >
      <section className="wm-template-hero wm-ui-hero wingman-surface wm-ui-section">
        <div>
          <p className="wm-template-kicker wm-ui-kicker wm-ui-copy">Wingman / Templates</p>
          <h1 className="wm-ui-title">Start from a real AV application, not a blank form.</h1>
          <p className="wm-ui-copy">
            Choose a vertical-market template to seed discovery, architecture direction,
            WyreStorm product thinking, dependencies and the next sales questions.
          </p>
        </div>
      </section>

      <section className="wm-template-filter-panel wm-ui-section wingman-surface wm-ui-card">
        <label className="wm-template-search wm-ui-form-field wm-ui-card">
          <span>Search templates</span>
          <input
            className="wm-ui-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search room, vertical, product family, application or technology..."
          />
        </label>

        <div className="wm-template-filter-grid">
          {verticals.map((item) => (
            <button
              key={item}
              type="button"
              className={item === vertical ? "is-active" : ""}
              onClick={() => setVertical(item)}
            >
              <span>{item}</span>
              <strong>{counts[item] ?? 0}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="wm-template-results-header wm-ui-section wm-ui-card-header">
        <div>
          <p className="wm-template-kicker wm-ui-kicker wm-ui-copy">Template library</p>
          <h2 className="wm-ui-title">{filtered.length} options</h2>
        </div>
        <p className="wm-ui-copy">Choose a starting point. Review before quotation.</p>
      </section>

      <section className="wm-template-card-grid wm-ui-grid wm-ui-section wm-ui-card">
        {filtered.map((template) => {
          const isStaged = stagedId === template.id;
          const isMuted = stagedId !== null && !isStaged;

          return (
          <article key={template.id} data-template-staged={isStaged ? "true" : "false"} className="wm-template-card wm-ui-card wingman-surface">
            <div className="wm-template-card-top wm-ui-card">
              <span>{template.vertical}</span>
              <span>{template.application}</span>
            </div>

            <h3 className="wm-ui-title">{template.title}</h3>
            <p className="wm-template-summary wm-ui-copy wm-ui-card">{template.summary}</p>
            <p className="wm-template-direction wm-ui-copy">{template.direction}</p>

            <div className="wm-template-actions wm-ui-action-row wm-ui-card">
              <button
                type="button"
                className={`wm-ui-button ${isStaged ? "wm-ui-button-selected wm-ui-decision-sweep" : isMuted ? "wm-ui-button-muted" : "wm-ui-button-secondary"}`}
                data-template-staged-pill="true"
                onClick={() => stageTemplate(template)}
              >
                {isStaged ? "Selected" : "Use"}
              </button>
              <a
                className={`wm-ui-button ${isMuted ? "wm-ui-button-muted" : "wm-ui-button-forward"}${isStaged ? " wm-ui-decision-sweep" : ""}`}
                href="/wingman/discovery"
                data-template-build-pack="true"
                onClick={() => stageTemplate(template)}
              >
                Build pack
              </a>
            </div>
          </article>
          );
        })}
      </section>
    </main>
  );
}

export { TemplatesPage };
export default TemplatesPage;
