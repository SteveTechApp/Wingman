import { useMemo, useState } from "react";
import { saveVideowallToProject } from "../data/projectStore";

type WallType = "" | "led" | "lcd";

type Option = {
  value: string;
  label: string;
  note?: string;
};

type LedAnswers = {
  behaviour: string;
  windows: string;
  sourceLocation: string;
  output: string;
};

type LcdAnswers = {
  screenCount: string;
  customScreenCount: string;
  array: string;
  customArray: string;
  orientation: string;
  driveMethod: string;
  sourceCount: string;
  sourceLocation: string;
  behaviour: string;
};

type Recommendation = {
  id: string;
  title: string;
  architecture: string;
  products: string[];
  summary: string;
  askNext: string[];
  missing: string[];
  quoteSafety: string;
  avoid: string;
  customerSafe: string;
};

type AdviceCard = {
  id: string;
  title: string;
  direction: string;
  useWhen: string;
  askNext: string;
  avoid: string;
  customerSafe: string;
};

type DiagramStage = {
  label: string;
  title: string;
  notes: string[];
};

type VisualBundle = {
  sku: string;
  productTitle: string;
  productFamily: string;
  productForm: "rack" | "endpoint" | "controller";
  application: string;
  designTitle: string;
  designSummary: string;
  stages: DiagramStage[];
  notes: string[];
};

const ledBehaviourOptions: Option[] = [
  { value: "single-source", label: "Single full-screen source", note: "One image across the LED wall." },
  { value: "multi-source", label: "Several sources on one canvas", note: "More than one source visible." },
  { value: "fixed-multiview", label: "Fixed multiview layout", note: "Preset windows." },
  { value: "custom-windows", label: "Custom drag-and-drop windows", note: "Flexible operator layouts." },
  { value: "premium-quality", label: "High-quality / low-latency distribution", note: "Premium wall signal path." },
  { value: "led-processor", label: "Feed an LED processor", note: "Novastar-style processor input." },
];

const ledWindowOptions: Option[] = [
  { value: "one", label: "1 source only" },
  { value: "two-four", label: "2-4 sources" },
  { value: "fixed-nine", label: "Up to 9 fixed windows" },
  { value: "floating-six", label: "Up to 6 floating/custom windows" },
  { value: "more-than-nine", label: "More than 9 fixed windows" },
  { value: "unsure", label: "Unsure" },
];

const sourceLocationOptions: Option[] = [
  { value: "local", label: "Local sources", note: "Sources near rack/processor." },
  { value: "distributed", label: "Distributed sources", note: "Sources around the building." },
  { value: "mixed", label: "Mixed / unknown", note: "Not confirmed yet." },
];

const ledOutputOptions: Option[] = [
  { value: "single-hdmi-led-processor", label: "Single HDMI output to LED processor", note: "WyreStorm feeds the processor." },
  { value: "avoip-decoder", label: "AVoIP decoder output", note: "Part of a NetworkHD system." },
  { value: "unsure", label: "Unsure" },
];

const lcdScreenOptions: Option[] = [
  { value: "two", label: "2 screens" },
  { value: "four", label: "4 screens" },
  { value: "six", label: "6 screens" },
  { value: "nine", label: "9 screens" },
  { value: "twelve", label: "12 screens" },
  { value: "sixteen", label: "16 screens" },
  { value: "custom", label: "Custom" },
];

const lcdArrayOptions: Option[] = [
  { value: "1x2", label: "1x2" },
  { value: "2x2", label: "2x2" },
  { value: "3x2", label: "3x2" },
  { value: "3x3", label: "3x3" },
  { value: "1x4", label: "1x4" },
  { value: "4x4", label: "4x4" },
  { value: "custom", label: "Custom" },
];

const lcdOrientationOptions: Option[] = [
  { value: "landscape", label: "Landscape" },
  { value: "portrait", label: "Portrait" },
  { value: "mixed", label: "Mixed / unknown" },
];

const lcdDriveOptions: Option[] = [
  { value: "tile-mode", label: "Tile mode / single input", note: "Displays split image internally." },
  { value: "direct-drive", label: "Direct drive / input per screen", note: "Each display has its own feed." },
  { value: "unsure", label: "Unsure" },
];

const lcdSourceOptions: Option[] = [
  { value: "one", label: "1 source" },
  { value: "two", label: "2 sources" },
  { value: "three-four", label: "3-4 sources" },
  { value: "five-plus", label: "5+ sources" },
  { value: "unsure", label: "Unsure" },
];

const lcdBehaviourOptions: Option[] = [
  { value: "full-image", label: "One full image across wall", note: "Whole wall behaves as one canvas." },
  { value: "different-per-display", label: "Different content per display", note: "Screens may show different sources." },
  { value: "preset-layouts", label: "Preset layouts", note: "Fixed layouts recalled by user." },
  { value: "multiview", label: "Multiview", note: "Several sources on one output canvas." },
  { value: "flexible-routing", label: "Flexible routing / future expansion", note: "Part of wider AV distribution." },
];

const emptyLed: LedAnswers = {
  behaviour: "",
  windows: "",
  sourceLocation: "",
  output: "",
};

const emptyLcd: LcdAnswers = {
  screenCount: "",
  customScreenCount: "",
  array: "",
  customArray: "",
  orientation: "",
  driveMethod: "",
  sourceCount: "",
  sourceLocation: "",
  behaviour: "",
};

const ledAdvice: AdviceCard[] = [
  {
    id: "led-hdmi",
    title: "LED simple HDMI multiview",
    direction: "NHD-0401-MV",
    useWhen: "Use when the LED processor needs one simple HDMI feed with local source composition.",
    askNext: "How many HDMI sources must be visible, and what input format does the LED processor expect?",
    avoid: "Do not make this AVoIP unless source locations or routing flexibility justify it.",
    customerSafe: "WyreStorm can provide a simple composed HDMI output before the LED processor.",
  },
  {
    id: "led-nhd150",
    title: "LED NetworkHD 100 multiview",
    direction: "NHD-124-TX + NHD-150-RX + NHD-CTL-PRO",
    useWhen: "Use when sources are distributed and the LED wall needs a composed multiview output.",
    askNext: "Does the customer need up to 9 fixed windows or up to 6 floating/custom windows?",
    avoid: "Do not imply NetworkHD 100, 500 and 600 endpoints are interchangeable.",
    customerSafe: "This gives a flexible AVoIP source layer with a multiview output for the wall path.",
  },
  {
    id: "led-nhd600",
    title: "LED premium high-quality distribution",
    direction: "NetworkHD 600 / NHD-600-TRX direction",
    useWhen: "Use where the LED wall is quality-sensitive, latency-sensitive, or premium in value.",
    askNext: "Who owns the 10G network, and what does the final LED processor expect?",
    avoid: "Do not present this as the lowest-cost route or as final wall processing without confirmation.",
    customerSafe: "For premium LED walls, the signal layer should protect quality, latency and routing performance.",
  },
];

const lcdAdvice: AdviceCard[] = [
  {
    id: "lcd-tile",
    title: "LCD tile mode simple path",
    direction: "Switcher, extender or matrix direction",
    useWhen: "Use when the displays create the wall internally and one signal feeds the wall.",
    askNext: "Do the LCD displays definitely support tile mode, and how far is the source from the wall?",
    avoid: "Do not force a video wall processor if the displays already handle tile mode.",
    customerSafe: "If the screens create the wall internally, WyreStorm only needs to deliver the correct source signal.",
  },
  {
    id: "lcd-vw",
    title: "LCD dedicated video wall processor",
    direction: "SW-0204-VW or SW-0206-VW",
    useWhen: "Use for fixed LCD walls where each display needs its own driven output.",
    askNext: "What is the array size, how many sources are needed, and are presets enough?",
    avoid: "Do not overbuild with AVoIP if the wall is fixed and local.",
    customerSafe: "A dedicated processor is often the clearest route for a fixed LCD wall.",
  },
  {
    id: "lcd-matrix",
    title: "LCD scaling / seamless matrix path",
    direction: "Scaling matrix / SCL matrix direction",
    useWhen: "Use where the job is mainly source switching, scaling, fixed I/O or true multiview.",
    askNext: "How many routed inputs and outputs are required, and is true multiview required?",
    avoid: "Do not confuse multiple outputs with multiview unless the product has true multiview.",
    customerSafe: "A matrix path can be simpler when sources and displays are local and predictable.",
  },
  {
    id: "lcd-avoip",
    title: "LCD AVoIP wall path",
    direction: "NetworkHD 100 / 500 / 600 with NHD-CTL-PRO",
    useWhen: "Use when sources are distributed, routing is flexible, or expansion is likely.",
    askNext: "Who owns the network, and is the project 1G, 10G, or not yet known?",
    avoid: "Do not assume AVoIP is automatically better for a simple fixed wall.",
    customerSafe: "AVoIP is strongest when the wall is part of a wider routing system.",
  },
];

function labelFor(options: Option[], value: string): string {
  const found = options.find((option) => option.value === value);
  return found ? found.label : "Not captured";
}

function getStartRecommendation(): Recommendation {
  return {
    id: "start",
    title: "Choose LED or LCD to start",
    architecture: "Video wall discovery",
    products: [],
    summary: "Select the wall technology first so Wingman can ask the correct questions.",
    askNext: ["Is the project an LED wall or an LCD screen array?"],
    missing: ["Wall type"],
    quoteSafety: "Do not quote yet",
    avoid: "Avoid choosing AVoIP, matrix or video wall processing before wall type is known.",
    customerSafe: "We will first confirm the wall type, then choose the right signal path.",
  };
}

function getLedRecommendation(answers: LedAnswers): Recommendation {
  const missing = [
    !answers.behaviour ? "Wall behaviour" : "",
    !answers.windows ? "Visible window count" : "",
    !answers.sourceLocation ? "Source location" : "",
    !answers.output ? "Output requirement" : "",
  ].filter(Boolean);

  if (answers.behaviour === "premium-quality" || answers.windows === "more-than-nine") {
    return {
      id: "led-nhd600",
      title: "Premium LED wall distribution direction",
      architecture: "NetworkHD 600 high-performance 10G AVoIP direction",
      products: ["NHD-600-TRX", "10G AV network infrastructure", "NetworkHD control layer"],
      summary: "Use a NetworkHD 600 direction where the LED wall needs premium image quality, very low latency or high-performance routing.",
      askNext: ["Confirm LED processor input requirements.", "Confirm 10G network ownership.", "Confirm whether separate layout/window processing is required."],
      missing,
      quoteSafety: "Direction only - confirm with pre-sales",
      avoid: "Do not treat NetworkHD 600 as the final wall processor until the LED processor and layout requirement are confirmed.",
      customerSafe: "For a premium LED wall, the first priority is protecting image quality and latency before confirming the final processing path.",
    };
  }

  if (answers.behaviour === "custom-windows" || answers.windows === "fixed-nine" || answers.windows === "floating-six") {
    return {
      id: "led-nhd150",
      title: "LED AVoIP multiview direction",
      architecture: "NetworkHD 100 multiview workflow",
      products: ["NHD-124-TX", "NHD-150-RX", "NHD-CTL-PRO"],
      summary: "Use NetworkHD 100 multiview where the wall needs AVoIP source flexibility with fixed or custom multiview output.",
      askNext: ["Confirm required simultaneous windows.", "Confirm whether output feeds an LED processor.", "Confirm network switch suitability."],
      missing,
      quoteSafety: missing.length > 0 ? "Direction only - missing details remain" : "Ready for product direction",
      avoid: "Do not mix NetworkHD series or imply this is the same as a standalone HDMI multiviewer.",
      customerSafe: "This gives the wall a flexible source layer and a composed multiview output without forcing every source to be local.",
    };
  }

  if (answers.behaviour || answers.output === "single-hdmi-led-processor") {
    return {
      id: "led-hdmi",
      title: "Simple LED HDMI multiview direction",
      architecture: "Standalone HDMI multiview into LED processor",
      products: ["NHD-0401-MV"],
      summary: "Use NHD-0401-MV where the requirement is a simple local HDMI multiview or source composition feed before the LED processor.",
      askNext: ["Confirm how many HDMI sources need to be shown.", "Confirm LED processor input format.", "Confirm whether sources are local."],
      missing,
      quoteSafety: missing.length > 0 ? "Direction only - missing details remain" : "Ready for product direction",
      avoid: "Do not build AVoIP unless distributed source routing, expansion or remote source access is required.",
      customerSafe: "This keeps the LED processor responsible for the wall while WyreStorm provides source composition before it.",
    };
  }

  return {
    id: "start-led",
    title: "LED wall discovery in progress",
    architecture: "LED wall signal path not confirmed",
    products: [],
    summary: "Capture how the LED processor will be fed before selecting a product.",
    askNext: ["Is this one HDMI feed into an LED processor, or part of a routed AVoIP system?"],
    missing,
    quoteSafety: "Do not quote yet",
    avoid: "Avoid choosing product before the output path is known.",
    customerSafe: "We need to confirm how the LED processor is being fed before choosing the WyreStorm route.",
  };
}

function getLcdRecommendation(answers: LcdAnswers): Recommendation {
  const missing = [
    !answers.screenCount ? "Number of screens" : "",
    !answers.array ? "Array configuration" : "",
    !answers.orientation ? "Orientation" : "",
    !answers.driveMethod ? "Drive method" : "",
    !answers.sourceCount ? "Source count" : "",
    !answers.sourceLocation ? "Source location" : "",
    !answers.behaviour ? "Required behaviour" : "",
  ].filter(Boolean);

  if (answers.behaviour === "flexible-routing" || answers.behaviour === "different-per-display" || answers.sourceLocation === "distributed") {
    return {
      id: "lcd-avoip",
      title: "LCD AVoIP video wall direction",
      architecture: "NetworkHD AVoIP wall and routing architecture",
      products: ["NetworkHD 100 / 500 / 600 direction", "NHD-CTL-PRO", "Suitable network switching"],
      summary: "Use AVoIP where the LCD wall is part of wider flexible routing or where sources are distributed.",
      askNext: ["Confirm 1G or 10G network.", "Confirm independent screen content or full-wall image.", "Confirm latency and image quality expectations."],
      missing,
      quoteSafety: missing.length > 0 ? "Direction only - missing details remain" : "Ready for product direction",
      avoid: "Do not select AVoIP purely because it is a video wall.",
      customerSafe: "AVoIP is right when the wall is part of a flexible distribution system rather than a fixed local wall only.",
    };
  }

  if (answers.driveMethod === "tile-mode" && (answers.sourceCount === "one" || answers.behaviour === "full-image")) {
    return {
      id: "lcd-tile",
      title: "LCD tile mode simple source path",
      architecture: "Simple source-to-wall transport path",
      products: ["Switcher / extender / matrix direction based on distance and source count"],
      summary: "Use a simple signal path when the displays perform tile mode internally and only need the correct input feed.",
      askNext: ["Confirm tile mode support.", "Confirm source-to-display distance.", "Confirm whether more sources may be added later."],
      missing,
      quoteSafety: missing.length > 0 ? "Direction only - missing details remain" : "Ready for product direction",
      avoid: "Do not force SW-0204-VW, SW-0206-VW or AVoIP where displays already handle wall layout.",
      customerSafe: "If the screens already create the wall internally, WyreStorm only needs to manage the source signal going in.",
    };
  }

  if (answers.behaviour === "multiview" || answers.sourceCount === "three-four" || answers.sourceCount === "five-plus") {
    return {
      id: "lcd-matrix",
      title: "LCD scaling / seamless matrix direction",
      architecture: "Fixed-I/O switching, scaling and possible SCL multiview direction",
      products: ["Scaling matrix direction", "SCL matrix direction where true multiview is required"],
      summary: "Use a scaling or seamless matrix direction where the main requirement is controlled switching, scaling or true multiview.",
      askNext: ["Confirm routed inputs and outputs.", "Confirm true multiview versus multiple outputs.", "Confirm seamless switching or scaling needs."],
      missing,
      quoteSafety: missing.length > 0 ? "Direction only - missing details remain" : "Ready for product direction",
      avoid: "Do not call multiple outputs multiview unless the product supports true multiview canvas output.",
      customerSafe: "A matrix path can keep the design simpler where the wall is local and the I/O count is predictable.",
    };
  }

  if (answers.driveMethod === "direct-drive" || answers.behaviour === "preset-layouts" || answers.behaviour === "full-image") {
    return {
      id: "lcd-vw",
      title: "LCD dedicated video wall processor direction",
      architecture: "Dedicated non-AVoIP LCD video wall processing",
      products: ["SW-0204-VW", "SW-0206-VW"],
      summary: "Use a dedicated video wall processor when each LCD screen needs its own driven output and the wall is a fixed local system.",
      askNext: ["Confirm whether SW-0204-VW is enough or SW-0206-VW is needed.", "Confirm array size.", "Confirm source count and control requirements."],
      missing,
      quoteSafety: missing.length > 0 ? "Direction only - missing details remain" : "Ready for product direction",
      avoid: "Do not overbuild with AVoIP unless flexibility, remote sources or expansion justify it.",
      customerSafe: "A dedicated processor is often the most straightforward route for a fixed LCD video wall with direct screen feeds.",
    };
  }

  return {
    id: "start-lcd",
    title: "LCD wall discovery in progress",
    architecture: "LCD wall signal path not confirmed",
    products: [],
    summary: "Capture the LCD layout, drive method and source behaviour before selecting a product path.",
    askNext: ["Is the wall using display tile mode or direct input per screen?"],
    missing,
    quoteSafety: "Do not quote yet",
    avoid: "Avoid selecting a video wall processor before confirming tile mode versus direct drive.",
    customerSafe: "We need to confirm whether the screens or a WyreStorm device will handle wall processing.",
  };
}

function getVisualBundle(wallType: WallType, recommendation: Recommendation): VisualBundle | null {
  if (!wallType || !recommendation.id || recommendation.id === "start" || recommendation.products.length === 0) {
    return null;
  }

  if (recommendation.id === "led-hdmi") {
    return {
      sku: "NHD-0401-MV",
      productTitle: "4K Multiview Processor",
      productFamily: "NetworkHD / direct HDMI multiview",
      productForm: "rack",
      application: "Corporate lobby LED wall or control room LED canvas with simple source composition.",
      designTitle: "Typical LED wall design - simple HDMI multiview before LED processor",
      designSummary: "Use the NHD-0401-MV as a simple composition stage, then feed one output into the LED wall processor.",
      stages: [
        { label: "Sources", title: "HDMI sources", notes: ["PC", "Media player", "Camera feed"] },
        { label: "Compose", title: "NHD-0401-MV", notes: ["Simple multiview", "Local rack install"] },
        { label: "Process", title: "LED processor", notes: ["Novastar style", "Single HDMI input"] },
        { label: "Display", title: "LED wall", notes: ["Main presentation canvas"] },
      ],
      notes: [
        "Best where sources are local.",
        "Good for simple direct-view LED compositions.",
        "Avoid if the customer really needs distributed AVoIP routing.",
      ],
    };
  }

  if (recommendation.id === "led-nhd150") {
    return {
      sku: "NHD-150-RX",
      productTitle: "NetworkHD 100 Multiview Decoder",
      productFamily: "NetworkHD 100",
      productForm: "endpoint",
      application: "Distributed LED wall where multiple networked sources must be shown together on one processor input.",
      designTitle: "Typical LED wall design - NetworkHD 100 multiview workflow",
      designSummary: "Bring distributed sources into the network, compose them at the NHD-150-RX, then feed the LED processor or wall input.",
      stages: [
        { label: "Sources", title: "HDMI sources", notes: ["PCs", "Signage players", "Camera bridge"] },
        { label: "Encode", title: "NHD-124-TX", notes: ["Source on-ramp", "1G AVoIP"] },
        { label: "Control", title: "NHD-CTL-PRO", notes: ["System routing", "Setup and control"] },
        { label: "Multiview", title: "NHD-150-RX", notes: ["Up to 9 fixed windows", "Up to 6 floating/custom windows"] },
        { label: "Display", title: "LED processor / LED wall", notes: ["Single display output path"] },
      ],
      notes: [
        "Best where source flexibility matters.",
        "Good for a controlled multiview wall output.",
        "Keep NetworkHD series consistent.",
      ],
    };
  }

  if (recommendation.id === "led-nhd600") {
    return {
      sku: "NHD-600-TRX",
      productTitle: "10G SDVoE Transceiver",
      productFamily: "NetworkHD 600",
      productForm: "endpoint",
      application: "Premium LED wall or high-performance visual space where latency and image quality are critical.",
      designTitle: "Typical LED wall design - premium 10G NetworkHD 600 signal layer",
      designSummary: "Use a premium 10G transport layer for high-performance routing before the wall processor or endpoint.",
      stages: [
        { label: "Sources", title: "High-value sources", notes: ["4K content", "Live feeds", "Control room sources"] },
        { label: "Transport", title: "NHD-600-TRX", notes: ["Encode / decode", "High-quality path"] },
        { label: "Network", title: "10G AV switch", notes: ["AV VLAN", "Low-latency routing"] },
        { label: "Process", title: "LED processor", notes: ["Final wall processing confirmed separately"] },
        { label: "Display", title: "Premium LED wall", notes: ["High-quality visual surface"] },
      ],
      notes: [
        "Best where image quality and low latency are primary.",
        "Confirm whether separate layout processing is also required.",
        "Network design must be confirmed early.",
      ],
    };
  }

  if (recommendation.id === "lcd-tile") {
    return {
      sku: "Switcher / Matrix path",
      productTitle: "Simple source delivery path",
      productFamily: "HDBaseT / matrix / switcher direction",
      productForm: "rack",
      application: "Retail signage wall or control room LCD wall using the displays’ own tile mode.",
      designTitle: "Typical LCD wall design - tile mode with simple source delivery",
      designSummary: "Feed the first display or wall input correctly, then let the LCD panels handle the wall split internally.",
      stages: [
        { label: "Sources", title: "Source devices", notes: ["PC", "Player", "Presentation source"] },
        { label: "Route", title: "Switcher / Matrix", notes: ["Based on source count", "Based on distance"] },
        { label: "Drive", title: "Tile-mode display input", notes: ["Single wall feed", "Displays handle tiling"] },
        { label: "Display", title: "LCD wall", notes: ["Whole wall image"] },
      ],
      notes: [
        "Use when displays already support tile mode.",
        "Avoid unnecessary video wall processing.",
        "Confirm signal path distance and source count.",
      ],
    };
  }

  if (recommendation.id === "lcd-vw") {
    return {
      sku: "SW-0206-VW",
      productTitle: "Dedicated Video Wall Processor",
      productFamily: "WyreStorm VW processor family",
      productForm: "rack",
      application: "Fixed LCD videowall in a lobby, control room, signage space or operations environment.",
      designTitle: "Typical LCD wall design - dedicated video wall processor",
      designSummary: "Use a dedicated VW processor when each LCD panel requires its own direct driven output and the wall is largely fixed.",
      stages: [
        { label: "Sources", title: "Input sources", notes: ["PC", "Player", "Control system feed"] },
        { label: "Process", title: "SW-0204-VW / SW-0206-VW", notes: ["Wall layouts", "Panel output management"] },
        { label: "Outputs", title: "Per-screen outputs", notes: ["Direct feed per panel", "Wall mapping"] },
        { label: "Display", title: "LCD wall array", notes: ["2x2", "3x3", "Custom array"] },
      ],
      notes: [
        "Good for fixed, local wall designs.",
        "Often easier to quote and explain.",
        "Choose SW-0204-VW vs SW-0206-VW based on the required behaviour.",
      ],
    };
  }

  if (recommendation.id === "lcd-matrix") {
    return {
      sku: "Scaling Matrix / SCL direction",
      productTitle: "Seamless matrix workflow",
      productFamily: "Matrix / SCL direction",
      productForm: "rack",
      application: "LCD wall needing fixed I/O switching, scaling, or multiview-capable source presentation.",
      designTitle: "Typical LCD wall design - scaling matrix workflow",
      designSummary: "Use a matrix path where source switching, scaling and fixed I/O are more important than full AVoIP flexibility.",
      stages: [
        { label: "Sources", title: "Multiple local sources", notes: ["Presentation", "Cameras", "Media"] },
        { label: "Switch", title: "Scaling / SCL matrix", notes: ["Fixed I/O", "Possible multiview"] },
        { label: "Route", title: "Wall feed path", notes: ["Local outputs", "Scaled destinations"] },
        { label: "Display", title: "LCD wall", notes: ["Single wall view", "Managed layout"] },
      ],
      notes: [
        "Good where local switching is the priority.",
        "Do not confuse multiple outputs with multiview.",
        "Useful when the I/O count is predictable.",
      ],
    };
  }

  if (recommendation.id === "lcd-avoip") {
    return {
      sku: "NetworkHD AVoIP direction",
      productTitle: "Flexible AVoIP wall system",
      productFamily: "NetworkHD 100 / 500 / 600",
      productForm: "endpoint",
      application: "Large distributed LCD wall environment with flexible routing or future growth.",
      designTitle: "Typical LCD wall design - AVoIP wall and routing system",
      designSummary: "Use AVoIP where sources are distributed, routing is flexible, or the wall is part of a wider AV estate.",
      stages: [
        { label: "Sources", title: "Distributed source endpoints", notes: ["Local rooms", "Shared sources", "Campus feeds"] },
        { label: "Encode", title: "NetworkHD encoders", notes: ["Series selected by need", "Keep series aligned"] },
        { label: "Network", title: "AV network + NHD-CTL-PRO", notes: ["Routing", "Control", "Expansion"] },
        { label: "Decode", title: "Display endpoints", notes: ["Wall destinations", "Local display feeds"] },
        { label: "Display", title: "LCD wall system", notes: ["Flexible content strategy"] },
      ],
      notes: [
        "Best where routing flexibility is important.",
        "Include controller and network readiness.",
        "Select 100, 500 or 600 based on performance and quality needs.",
      ],
    };
  }

  return null;
}

function ChoiceGrid(props: {
  eyebrow: string;
  title: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <section className="vw2-question wm-ui-section">
      <p className="vw2-eyebrow wm-ui-copy wm-ui-kicker">{props.eyebrow}</p>
      <h3 className="wm-ui-title">{props.title}</h3>
      <div className="vw2-chip-grid">
        {props.options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`vw2-chip ${props.value === option.value ? "is-selected" : ""}`}
            onClick={() => props.onChange(option.value)}
          >
            <span>{option.label}</span>
            {option.note ? <small>{option.note}</small> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

function FieldRow(props: { label: string; value: string }) {
  return (
    <div className="vw2-field-row wm-ui-card">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function AdviceCardView(props: { card: AdviceCard; active: boolean }) {
  return (
    <article className={`vw2-advice-card ${props.active ? "is-active" : ""}`}>
      <p className="vw2-eyebrow wm-ui-copy wm-ui-kicker">{props.active ? "Recommended path" : "Option"}</p>
      <h4>{props.card.title}</h4>
      <strong>{props.card.direction}</strong>
      <dl>
        <dt>Use when</dt>
        <dd>{props.card.useWhen}</dd>
        <dt>Ask next</dt>
        <dd>{props.card.askNext}</dd>
        <dt>Avoid</dt>
        <dd>{props.card.avoid}</dd>
      </dl>
      <p className="vw2-safe-copy wm-ui-copy">{props.card.customerSafe}</p>
    </article>
  );
}

function ProductVisualCard(props: { bundle: VisualBundle }) {
  const isRack = props.bundle.productForm === "rack";
  const isEndpoint = props.bundle.productForm === "endpoint";

  return (
    <article className="vw2-visual-card wm-ui-card">
      <div className="vw2-visual-card-head wm-ui-card">
        <p className="vw2-eyebrow wm-ui-copy wm-ui-kicker">WyreStorm product visual</p>
        <h3 className="wm-ui-title">{props.bundle.sku}</h3>
        <span>{props.bundle.productTitle}</span>
      </div>

      <div className="vw2-product-render">
        <svg viewBox="0 0 640 260" role="img" aria-label={props.bundle.sku}>
          <defs>
            <linearGradient id="panelGlow" x1="0" x2="1">
              <stop offset="0%" stopColor="#0f2236" />
              <stop offset="100%" stopColor="#143654" />
            </linearGradient>
            <linearGradient id="panelEdge" x1="0" x2="1">
              <stop offset="0%" stopColor="#0a1522" />
              <stop offset="100%" stopColor="#1b4566" />
            </linearGradient>
          </defs>

          <rect x="60" y="40" rx="20" ry="20" width="520" height={isRack ? 130 : 110} fill="url(#panelEdge)" stroke="#4fd8ff" strokeWidth="2" />
          <rect x="85" y="62" rx="14" ry="14" width="470" height={isRack ? 86 : 68} fill="url(#panelGlow)" stroke="#2e9bc0" strokeWidth="1.5" />

          <text x="112" y="98" fill="#75ddff" fontSize="24" fontWeight="700">WyreStorm</text>
          <text x="112" y="126" fill="#ffffff" fontSize="28" fontWeight="800">{props.bundle.sku}</text>
          <text x="112" y="150" fill="#a8eaff" fontSize="14">{props.bundle.productFamily}</text>

          {Array.from({ length: isRack ? 10 : 6 }).map((_, index) => (
            <circle
              key={`led-${index}`}
              cx={isRack ? 430 + index * 12 : 468 + index * 12}
              cy="95"
              r="3.5"
              fill={index % 2 === 0 ? "#55ffbd" : "#62d8ff"}
            />
          ))}

          {Array.from({ length: isEndpoint ? 4 : 6 }).map((_, index) => (
            <rect
              key={`port-${index}`}
              x={isRack ? 388 + index * 24 : 410 + index * 28}
              y={isRack ? 120 : 112}
              rx="3"
              ry="3"
              width={isRack ? 16 : 20}
              height="12"
              fill="#0a1118"
              stroke="#5bcfff"
              strokeWidth="1"
            />
          ))}

          <rect x="94" y={isRack ? 170 : 156} rx="10" ry="10" width="452" height="42" fill="rgba(7,18,29,0.78)" stroke="#1f5d82" />
          <text x="110" y={isRack ? 196 : 182} fill="#dff8ff" fontSize="18" fontWeight="700">{props.bundle.application}</text>
        </svg>
      </div>

      <div className="vw2-badge-row wm-ui-card">
        <span className="vw2-badge">{props.bundle.productFamily}</span>
        <span className="vw2-badge">{props.bundle.productTitle}</span>
      </div>
    </article>
  );
}

function SchematicCard(props: { bundle: VisualBundle }) {
  return (
    <article className="vw2-visual-card wm-ui-card">
      <div className="vw2-visual-card-head wm-ui-card">
        <p className="vw2-eyebrow wm-ui-copy wm-ui-kicker">Real-world design schematic</p>
        <h3 className="wm-ui-title">{props.bundle.designTitle}</h3>
        <span>{props.bundle.designSummary}</span>
      </div>

      <div className="vw2-schematic-flow">
        {props.bundle.stages.map((stage, index) => (
          <div key={`${stage.label}-${index}`} className="vw2-schematic-stage-wrap wm-ui-card">
            <div className="vw2-schematic-stage wm-ui-card">
              <span className="vw2-schematic-label">{stage.label}</span>
              <strong>{stage.title}</strong>
              <ul>
                {stage.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
            {index < props.bundle.stages.length - 1 ? <div className="vw2-schematic-arrow">→</div> : null}
          </div>
        ))}
      </div>

      <div className="vw2-visual-notes">
        <h4>Design notes</h4>
        <ul>
          {props.bundle.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export function VideoWallPage() {
  const [wallType, setWallType] = useState<WallType>("");
  const [ledAnswers, setLedAnswers] = useState<LedAnswers>(emptyLed);
  const [lcdAnswers, setLcdAnswers] = useState<LcdAnswers>(emptyLcd);
  const [message, setMessage] = useState("");

  const recommendation = useMemo(() => {
    if (wallType === "led") {
      return getLedRecommendation(ledAnswers);
    }

    if (wallType === "lcd") {
      return getLcdRecommendation(lcdAnswers);
    }

    return getStartRecommendation();
  }, [wallType, ledAnswers, lcdAnswers]);

  const adviceCards = wallType === "lcd" ? lcdAdvice : ledAdvice;
  const visualBundle = useMemo(() => getVisualBundle(wallType, recommendation), [wallType, recommendation]);

  function chooseWall(nextWallType: WallType) {
    setWallType(nextWallType);
    setMessage("");
  }

  function updateLed(key: keyof LedAnswers, value: string) {
    setLedAnswers((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  function updateLcd(key: keyof LcdAnswers, value: string) {
    setLcdAnswers((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  function restart() {
    setWallType("");
    setLedAnswers(emptyLed);
    setLcdAnswers(emptyLcd);
    setMessage("");
  }

  function persist() {
    const payload = {
      source: "wingman-video-wall-workflow",
      wallType,
      ledAnswers,
      lcdAnswers,
      recommendation,
      visualBundle,
      updatedAt: new Date().toISOString(),
    };

    window.sessionStorage.setItem("wingman:video-wall-discovery", JSON.stringify(payload, null, 2));
    window.sessionStorage.setItem("wingman:use-video-wall-in-discovery", "1");
    window.localStorage.setItem("wingman:video-wall-last-summary", JSON.stringify(payload, null, 2));
  }

  function sendTo(path: string) {
    persist();
    window.location.assign(path);
  }

  function saveToProject() {
    persist();

    const payload = {
      source: "wingman-video-wall-workflow",
      wallType,
      ledAnswers,
      lcdAnswers,
      recommendation,
      visualBundle,
      updatedAt: new Date().toISOString(),
    };

    saveVideowallToProject({ wallType: wallType || "unknown", summary: payload });
    setMessage("Saved to your project. Open Projects or continue into Discovery to keep building it out.");
  }

  function openProduct() {
    const primaryProduct = recommendation.products[0];

    if (!primaryProduct) {
      setMessage("Complete the missing discovery questions before opening a product.");
      return;
    }

    persist();
    window.location.assign(`/wingman/products?search=${encodeURIComponent(primaryProduct)}`);
  }

  function copySummary() {
    const text = [
      "Wingman video wall discovery",
      `Wall type: ${wallType || "Not selected"}`,
      `Recommended direction: ${recommendation.title}`,
      `Architecture: ${recommendation.architecture}`,
      `Products: ${recommendation.products.length ? recommendation.products.join(" + ") : "Not ready"}`,
      `Quote safety: ${recommendation.quoteSafety}`,
      visualBundle ? `Visual SKU: ${visualBundle.sku}` : "",
      visualBundle ? `Typical application: ${visualBundle.application}` : "",
      "",
      "Ask next:",
      ...recommendation.askNext.map((item) => `- ${item}`),
      "",
      "Missing information:",
      ...(recommendation.missing.length ? recommendation.missing.map((item) => `- ${item}`) : ["- None"]),
      "",
      "Customer-safe wording:",
      recommendation.customerSafe,
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(text).then(
      () => setMessage("Copied video wall summary."),
      () => setMessage("Copy failed. Use the visible summary instead.")
    );
  }

  return (
    <main className="vw2-page wm-ui-page wingman-page-host">
      <section className="vw2-hero wm-ui-section wm-ui-hero">
        <div>
          <p className="vw2-eyebrow wm-ui-copy wm-ui-kicker">LED / LCD videowall workflow</p>
          <h1 className="wm-ui-title">Build the video wall route before choosing the product path.</h1>
          <p className="wm-ui-copy">
            Start with LED or LCD, then work through the key discovery questions. Wingman will
            separate LED processor feeds, LCD tile mode, direct-drive walls, dedicated wall
            processors, scaling matrix paths and AVoIP architectures.
          </p>
        </div>
        <div className="vw2-hero-actions wm-ui-hero">
          <button type="button" className="vw2-button wm-ui-button wm-ui-button-secondary" onClick={() => sendTo("/wingman/discovery")}>
            Send to discovery
          </button>
          <button type="button" className="vw2-button wm-ui-button wm-ui-button-secondary" onClick={() => sendTo("/wingman/proposal")}>
            Send to proposal
          </button>
        </div>
      </section>

      <section className="vw2-path-grid wm-ui-section">
        <button
          type="button"
          className={`vw2-path-card ${wallType === "led" ? "is-selected" : ""}`}
          onClick={() => chooseWall("led")}
        >
          <span>LED videowall</span>
          <strong>Start LED wall discovery</strong>
          <small>NHD-0401-MV, NHD-150-RX workflow, or NetworkHD 600 direction.</small>
        </button>

        <button
          type="button"
          className={`vw2-path-card ${wallType === "lcd" ? "is-selected" : ""}`}
          onClick={() => chooseWall("lcd")}
        >
          <span>LCD videowall</span>
          <strong>Start LCD wall discovery</strong>
          <small>Tile mode, direct drive, SW-0204-VW / SW-0206-VW, matrix or AVoIP.</small>
        </button>
      </section>

      <section className="vw2-workspace wm-ui-section">
        <div className="vw2-wizard-panel wm-ui-card">
          {!wallType ? (
            <div className="vw2-empty-state">
              <p className="vw2-eyebrow wm-ui-copy wm-ui-kicker">Start here</p>
              <h2 className="wm-ui-title">Select LED or LCD</h2>
              <p className="wm-ui-copy">
                LED starts around the processor feed and windowing. LCD starts around screen
                count, array configuration, tile mode versus direct drive, and source behaviour.
              </p>
            </div>
          ) : null}

          {wallType === "led" ? (
            <>
              <div className="vw2-panel-title wm-ui-card wm-ui-title">
                <p className="vw2-eyebrow wm-ui-copy wm-ui-kicker">LED discovery</p>
                <h2 className="wm-ui-title">Confirm how the LED wall needs to be fed.</h2>
              </div>

              <ChoiceGrid eyebrow="Step 1" title="What does the customer need the LED wall to show?" options={ledBehaviourOptions} value={ledAnswers.behaviour} onChange={(value) => updateLed("behaviour", value)} />
              <ChoiceGrid eyebrow="Step 2" title="How many visible windows are required?" options={ledWindowOptions} value={ledAnswers.windows} onChange={(value) => updateLed("windows", value)} />
              <ChoiceGrid eyebrow="Step 3" title="Where are the sources?" options={sourceLocationOptions} value={ledAnswers.sourceLocation} onChange={(value) => updateLed("sourceLocation", value)} />
              <ChoiceGrid eyebrow="Step 4" title="What output does the wall path need?" options={ledOutputOptions} value={ledAnswers.output} onChange={(value) => updateLed("output", value)} />
            </>
          ) : null}

          {wallType === "lcd" ? (
            <>
              <div className="vw2-panel-title wm-ui-card wm-ui-title">
                <p className="vw2-eyebrow wm-ui-copy wm-ui-kicker">LCD discovery</p>
                <h2 className="wm-ui-title">Confirm array, drive method and source behaviour.</h2>
              </div>

              <ChoiceGrid eyebrow="Step 1" title="How many screens are in the LCD wall?" options={lcdScreenOptions} value={lcdAnswers.screenCount} onChange={(value) => updateLcd("screenCount", value)} />

              {lcdAnswers.screenCount === "custom" ? (
                <label className="vw2-input-label wm-ui-kicker">
                  Custom screen count
                  <input className="wm-ui-input" value={lcdAnswers.customScreenCount} onChange={(event) => updateLcd("customScreenCount", event.target.value)} placeholder="Example: 15 screens" />
                </label>
              ) : null}

              <ChoiceGrid eyebrow="Step 2" title="What is the screen array?" options={lcdArrayOptions} value={lcdAnswers.array} onChange={(value) => updateLcd("array", value)} />

              {lcdAnswers.array === "custom" ? (
                <label className="vw2-input-label wm-ui-kicker">
                  Custom array
                  <input className="wm-ui-input" value={lcdAnswers.customArray} onChange={(event) => updateLcd("customArray", event.target.value)} placeholder="Example: 5x3" />
                </label>
              ) : null}

              <ChoiceGrid eyebrow="Step 3" title="What is the orientation?" options={lcdOrientationOptions} value={lcdAnswers.orientation} onChange={(value) => updateLcd("orientation", value)} />
              <ChoiceGrid eyebrow="Step 4" title="How is the LCD wall driven?" options={lcdDriveOptions} value={lcdAnswers.driveMethod} onChange={(value) => updateLcd("driveMethod", value)} />
              <ChoiceGrid eyebrow="Step 5" title="How many sources feed the wall?" options={lcdSourceOptions} value={lcdAnswers.sourceCount} onChange={(value) => updateLcd("sourceCount", value)} />
              <ChoiceGrid eyebrow="Step 6" title="Where are the sources?" options={sourceLocationOptions} value={lcdAnswers.sourceLocation} onChange={(value) => updateLcd("sourceLocation", value)} />
              <ChoiceGrid eyebrow="Step 7" title="What does the wall need to do?" options={lcdBehaviourOptions} value={lcdAnswers.behaviour} onChange={(value) => updateLcd("behaviour", value)} />
            </>
          ) : null}
        </div>

        <aside className="vw2-result-panel wm-ui-card">
          <div className="vw2-result-head wm-ui-card">
            <p className="vw2-eyebrow wm-ui-copy wm-ui-kicker">Recommended direction</p>
            <h3 className="wm-ui-title">{recommendation.title}</h3>
            <span className="vw2-status">{recommendation.quoteSafety}</span>
          </div>

          <p className="wm-ui-copy">{recommendation.summary}</p>

          <div className="vw2-summary-list wm-ui-card wm-ui-copy">
            <FieldRow label="Wall type" value={wallType ? wallType.toUpperCase() : "Not selected"} />
            <FieldRow label="Architecture" value={recommendation.architecture} />
            <FieldRow label="Suggested products" value={recommendation.products.length ? recommendation.products.join(" + ") : "Not ready"} />
          </div>

          <div className="vw2-mini-section">
            <h4>Ask this next</h4>
            <ul>
              {recommendation.askNext.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>

          <div className="vw2-mini-section">
            <h4>Missing information</h4>
            {recommendation.missing.length ? (
              <ul>
                {recommendation.missing.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : (
              <p className="wm-ui-copy">No critical discovery gaps for product direction.</p>
            )}
          </div>

          <div className="vw2-mini-section">
            <h4>Customer-safe wording</h4>
            <p className="wm-ui-copy">{recommendation.customerSafe}</p>
          </div>

          <div className="vw2-action-grid">
            <button type="button" className="vw2-button vw2-button-primary wm-ui-button wm-ui-button-primary" onClick={() => sendTo("/wingman/discovery")}>Send to Discovery</button>
            <button type="button" className="vw2-button wm-ui-button wm-ui-button-secondary" onClick={() => sendTo("/wingman/proposal")}>Send to Proposal</button>
            <button type="button" className="vw2-button wm-ui-button wm-ui-button-primary" onClick={saveToProject}>Save to Project</button>
            <button type="button" className="vw2-button wm-ui-button wm-ui-button-secondary" onClick={copySummary}>Copy summary</button>
            <button type="button" className="vw2-button wm-ui-button wm-ui-button-secondary" onClick={openProduct} disabled={!recommendation.products.length}>Open product</button>
            <button type="button" className="vw2-button vw2-button-danger wm-ui-button wm-ui-button-primary" onClick={restart}>Restart</button>
          </div>

          {message ? <p className="vw2-saved-message wm-ui-copy">{message}</p> : null}
        </aside>
      </section>

      {visualBundle ? (
        <section className="vw2-visual-grid wm-ui-section">
          <ProductVisualCard bundle={visualBundle} />
          <SchematicCard bundle={visualBundle} />
        </section>
      ) : null}

      {wallType ? (
        <section className="vw2-context-grid wm-ui-section">
          <article className="vw2-capture-card wm-ui-card">
            <p className="vw2-eyebrow wm-ui-copy wm-ui-kicker">Captured answers</p>
            <h3 className="wm-ui-title">Current wall summary</h3>

            {wallType === "led" ? (
              <div className="vw2-summary-list wm-ui-card wm-ui-copy">
                <FieldRow label="Wall behaviour" value={labelFor(ledBehaviourOptions, ledAnswers.behaviour)} />
                <FieldRow label="Visible windows" value={labelFor(ledWindowOptions, ledAnswers.windows)} />
                <FieldRow label="Source location" value={labelFor(sourceLocationOptions, ledAnswers.sourceLocation)} />
                <FieldRow label="Output requirement" value={labelFor(ledOutputOptions, ledAnswers.output)} />
              </div>
            ) : null}

            {wallType === "lcd" ? (
              <div className="vw2-summary-list wm-ui-card wm-ui-copy">
                <FieldRow label="Screen count" value={lcdAnswers.screenCount === "custom" ? lcdAnswers.customScreenCount || "Custom not entered" : labelFor(lcdScreenOptions, lcdAnswers.screenCount)} />
                <FieldRow label="Array" value={lcdAnswers.array === "custom" ? lcdAnswers.customArray || "Custom not entered" : labelFor(lcdArrayOptions, lcdAnswers.array)} />
                <FieldRow label="Orientation" value={labelFor(lcdOrientationOptions, lcdAnswers.orientation)} />
                <FieldRow label="Drive method" value={labelFor(lcdDriveOptions, lcdAnswers.driveMethod)} />
                <FieldRow label="Source count" value={labelFor(lcdSourceOptions, lcdAnswers.sourceCount)} />
                <FieldRow label="Source location" value={labelFor(sourceLocationOptions, lcdAnswers.sourceLocation)} />
                <FieldRow label="Required behaviour" value={labelFor(lcdBehaviourOptions, lcdAnswers.behaviour)} />
              </div>
            ) : null}
          </article>

          <article className="vw2-capture-card wm-ui-card">
            <p className="vw2-eyebrow wm-ui-copy wm-ui-kicker">Sales guidance</p>
            <h3 className="wm-ui-title">What to avoid</h3>
            <p className="wm-ui-copy">{recommendation.avoid}</p>
            <h3 className="wm-ui-title">Customer-safe explanation</h3>
            <p className="wm-ui-copy">{recommendation.customerSafe}</p>
            {visualBundle ? (
              <>
                <h3 className="wm-ui-title">Typical application</h3>
                <p className="wm-ui-copy">{visualBundle.application}</p>
              </>
            ) : null}
          </article>
        </section>
      ) : null}

      {wallType ? (
        <section className="vw2-advice-grid wm-ui-section">
          {adviceCards.map((card) => (
            <AdviceCardView key={card.id} card={card} active={card.id === recommendation.id} />
          ))}
        </section>
      ) : null}
    </main>
  );
}

export const VideoWallBuilderPage = VideoWallPage;
export const VideowallBuilderPage = VideoWallPage;
export const VideowallPage = VideoWallPage;
export const VideoWallWizardPage = VideoWallPage;
export const VideoWallBuilder = VideoWallPage;
export const VideoWall = VideoWallPage;

export default VideoWallPage;