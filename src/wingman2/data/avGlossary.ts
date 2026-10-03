// A reference table: the version/standard/grade breakdown a user comes to the
// glossary to look up (HDMI versions, USB data rates, cable grades and so on).
// Kept deliberately generic so any term can carry the comparison that actually
// matters for it, rather than forcing every technology into the same columns.
export type AvGlossaryReferenceTable = {
  caption: string;
  // Heading for the row-label column - "Version" for HDMI, "Grade" for cable,
  // "Format" for chroma. Named per table because the thing being compared
  // differs by technology.
  rowLabel: string;
  columns: string[];
  rows: Array<{
    label: string;
    cells: string[];
    note?: string;
  }>;
  footnote?: string;
};

export type AvGlossaryTerm = {
  id: string;
  term: string;
  acronym?: string;
  category: string;
  aliases: string[];
  plainEnglish: string;
  whyItMatters: string;
  // What the term actually means once it is in a real room - the "so what"
  // that a spec sheet never says. Optional: only present where the plain
  // meaning alone still leaves the practical consequence unclear.
  inReality?: string;
  reference?: AvGlossaryReferenceTable;
  cautions: string[];
  related: string[];
};

export const AV_GLOSSARY_TERMS: AvGlossaryTerm[] = [
  {
    id: "avoip",
    term: "AV-over-IP",
    acronym: "AVoIP",
    category: "Network AV",
    aliases: ["AV over IP", "networked AV", "IP video", "NetworkHD"],
    plainEnglish: "Audio and video are carried across a network instead of through a fixed matrix or point-to-point extender path.",
    whyItMatters: "It is useful when a customer wants flexible routing, many displays, future expansion or multi-room distribution.",
    cautions: [
      "Do not lead with AV-over-IP when a simple extender or small matrix solves the job.",
      "Network readiness matters: switches, VLANs, multicast and commissioning access can decide success.",
    ],
    related: ["NetworkHD", "encoder", "decoder", "multicast", "IGMP", "latency"],
  },
  {
    id: "hdbaset",
    term: "HDBaseT",
    category: "Signal Transport",
    aliases: ["HDBT", "HDBaseT extender", "HDBaseT matrix"],
    plainEnglish: "A way to send HDMI-style video, audio, control and sometimes power over structured cable between AV devices.",
    whyItMatters: "It is often the cleanest choice for reliable point-to-point extension from a rack to a display or room position.",
    inReality: "One structured cable replaces a bundle. The headline 100m is the best case - full 4K needs good quality shielded Cat6/6a, and the distance you can actually trust drops as resolution, colour depth and cable quality get worse. HDBaseT is a dedicated link between two devices; it is not sharing a customer network.",
    reference: {
      caption: "HDBaseT specifications and distance classes",
      rowLabel: "Specification",
      columns: ["Carries", "Distance", "Notes"],
      rows: [
        {
          label: "Spec 1.0",
          cells: ["10.2 Gbps - 4K30 class video", "Up to 100m", "The original 5Play set: video, audio, Ethernet, control, power"],
        },
        {
          label: "Spec 2.0",
          cells: ["10.2 Gbps - 4K30 class video", "Up to 100m", "Adds USB 2.0 and richer control over the same link"],
        },
        {
          label: "Spec 3.0",
          cells: ["18 Gbps class - 4K60 4:4:4", "Up to 100m", "Visually lossless compression to fit 4K60 down the link"],
        },
        {
          label: "Class A",
          cells: ["Full feature set", "Up to 100m", "The figure quoted on most commercial extenders and matrices"],
        },
        {
          label: "Class B",
          cells: ["Reduced feature set", "Up to 70m", "Lower-cost implementation; check what it drops before quoting"],
        },
      ],
      footnote: "Distance figures assume solid-core shielded cable on a clean, correctly terminated run. Patch panels, stranded patch leads and poor terminations all cost distance.",
    },
    cautions: [
      "Not every transmitter and receiver pairing is interchangeable.",
      "Resolution, colour depth and cable quality affect the safe distance.",
    ],
    related: ["receiver", "transmitter", "PoH", "RS-232", "IR", "CAT cable"],
  },
  {
    id: "hdmi",
    term: "HDMI",
    category: "Signal Transport",
    aliases: ["High Definition Multimedia Interface"],
    plainEnglish: "The common digital connection used between sources, switchers and displays for video and audio.",
    whyItMatters: "Most AV conversations start with HDMI, but the sales requirement is usually routing, distance, reliability or control rather than the connector alone.",
    inReality: "The version number is really a bandwidth number. What a device can actually show is decided by resolution multiplied by refresh rate multiplied by colour - so 4K60 in full colour needs 18Gbps, and a 10.2Gbps device can only reach 4K at 30Hz. Every device in the chain, including the cable, has to carry the highest number you are promising.",
    reference: {
      caption: "HDMI versions - bandwidth and what it actually reaches",
      rowLabel: "Version",
      columns: ["Bandwidth", "Realistic maximum", "Introduced"],
      rows: [
        {
          label: "HDMI 1.4",
          cells: ["10.2 Gbps", "4K at 30Hz, or 1080p60 in full colour", "ARC, 3D, HDMI Ethernet channel"],
          note: "Still common on older sources, UC devices and some entry-level extenders. It cannot do 4K60.",
        },
        {
          label: "HDMI 2.0",
          cells: ["18 Gbps", "4K at 60Hz with 4:4:4 8-bit colour", "The mainstream commercial AV baseline"],
          note: "4K60 HDR at 10-bit needs colour to drop to 4:2:0 within this bandwidth.",
        },
        {
          label: "HDMI 2.0a / 2.0b",
          cells: ["18 Gbps", "As 2.0", "HDR10 (2.0a), then HLG broadcast HDR (2.0b)"],
          note: "Same bandwidth as 2.0 - these revisions add HDR signalling, not capacity.",
        },
        {
          label: "HDMI 2.1",
          cells: ["48 Gbps", "8K60 or 4K120, and 4K60 HDR with headroom", "eARC, VRR, ALLM, FRL signalling, DSC"],
          note: "Uses FRL rather than TMDS signalling, so it needs Ultra High Speed certified cable.",
        },
      ],
      footnote: "A source, a display and a cable can each claim a different version. The system runs at the lowest one in the path.",
    },
    cautions: [
      "A simple HDMI cable is rarely the right answer for longer or commercial installs.",
      "HDMI version numbers can mislead; confirm the actual resolution, refresh rate and colour requirement.",
    ],
    related: ["HDCP", "EDID", "4K60", "matrix", "switcher", "extender"],
  },
  {
    id: "edid",
    term: "EDID",
    category: "Signal Management",
    aliases: ["Extended Display Identification Data"],
    plainEnglish: "The display tells the source what formats it can accept, such as resolution and audio capability.",
    whyItMatters: "Wrong or unstable EDID can cause blank screens, wrong resolution or audio issues.",
    cautions: [
      "Mixed display systems need careful EDID handling.",
      "EDID is not the same as HDCP, even though both affect HDMI behaviour.",
    ],
    related: ["HDMI", "HDCP", "scaling", "matrix", "handshake"],
  },
  {
    id: "hdcp",
    term: "HDCP",
    category: "Signal Management",
    aliases: ["High-bandwidth Digital Content Protection", "copy protection"],
    plainEnglish: "Copy protection used by many HDMI sources, especially media players, set-top boxes and protected content.",
    whyItMatters: "If one device in the chain does not support the required HDCP level, the customer may see a blank screen.",
    cautions: [
      "Do not promise protected-content behaviour without confirming every device in the path.",
      "HDCP problems can look like cable or resolution problems.",
    ],
    related: ["HDMI", "EDID", "4K", "source", "display"],
  },
  {
    id: "chroma-subsampling",
    term: "Chroma subsampling",
    category: "Video Quality",
    aliases: ["chroma", "colour subsampling", "4:4:4 4:2:2 4:2:0", "chroma sampling"],
    plainEnglish: "A way of saving bandwidth by storing full brightness detail for every pixel but sharing colour information between neighbouring pixels.",
    whyItMatters: "It is the single biggest reason two products both badged '4K60' can look noticeably different on the same screen.",
    inReality: "The eye notices brightness detail far more than colour detail, so throwing away colour data is nearly invisible on camera footage and film - and very visible on a spreadsheet, a CAD drawing or white text on a coloured background, where thin coloured edges start to smear or fringe. If the content is a laptop screen, ask for 4:4:4. If it is video, 4:2:0 will usually look fine and costs a quarter of the colour data.",
    reference: {
      caption: "What the three numbers actually mean",
      rowLabel: "Format",
      columns: ["Colour detail kept", "Bandwidth", "Right for"],
      rows: [
        {
          label: "4:4:4",
          cells: ["Full colour for every pixel", "Highest", "Computer content, text, CAD, control rooms, signage with fine type"],
          note: "The only format that reproduces thin coloured text exactly as the source drew it.",
        },
        {
          label: "4:2:2",
          cells: ["Colour halved horizontally", "About two thirds of 4:4:4", "Broadcast, production, video-led content, most digital signage"],
          note: "The usual professional compromise - a real bandwidth saving that is very hard to see on moving images.",
        },
        {
          label: "4:2:0",
          cells: ["Colour halved horizontally and vertically", "Half of 4:4:4", "Film, streaming, camera and conferencing content"],
          note: "A quarter of the colour data of 4:4:4. Fine for video, visibly soft on small text.",
        },
      ],
      footnote: "The numbers describe a 4-pixel-wide sample: how many carry their own colour on the top row, then the bottom row.",
    },
    cautions: [
      "A product badged '4K60' may only reach it at 4:2:0 - check the format, not the resolution.",
      "Match the format to the content: paying for 4:4:4 to show camera footage is wasted, and specifying 4:2:0 for a spreadsheet is a complaint waiting to happen.",
    ],
    related: ["4:4:4 chroma", "4:2:2 chroma", "4:2:0 chroma", "bandwidth", "colour depth", "HDMI"],
  },
  {
    id: "four-four-four",
    term: "4:4:4 chroma",
    category: "Video Quality",
    aliases: ["4:4:4", "RGB", "full chroma"],
    plainEnglish: "A colour sampling format that keeps fine text and graphics cleaner than reduced chroma formats.",
    whyItMatters: "It matters for detailed computer content, spreadsheets, control rooms and high-quality presentation spaces.",
    inReality: "Every pixel carries its own colour, exactly as the source drew it. This is what stops thin coloured text and fine lines from smearing or growing coloured fringes. It is the format to insist on whenever the screen is showing a laptop rather than a camera.",
    cautions: [
      "4K60 4:4:4 needs more bandwidth than 4K30 or 4:2:0.",
      "Do not assume a product supports every 4K format just because it says 4K.",
    ],
    related: ["chroma subsampling", "4:2:2 chroma", "4K60", "bandwidth", "HDR", "HDMI", "AV-over-IP"],
  },
  {
    id: "four-two-two",
    term: "4:2:2 chroma",
    category: "Video Quality",
    aliases: ["4:2:2", "half chroma"],
    plainEnglish: "A colour sampling format that keeps full brightness detail but stores colour for every second pixel across the line.",
    whyItMatters: "It is the middle option: a genuine bandwidth saving over 4:4:4 that is very hard to see on video content.",
    inReality: "This is the format broadcast and production work has used for years, and it is a sensible landing point when a system cannot carry full 4:4:4. On moving images almost nobody sees the difference. On a static spreadsheet, a careful viewer can just start to see it on coloured text edges.",
    cautions: [
      "It is still a compromise on text-heavy computer content - do not offer it as equivalent to 4:4:4 for a control room.",
      "Some products list 4:2:2 only at higher colour depths; confirm the exact combination of resolution, refresh rate, chroma and bit depth.",
    ],
    related: ["chroma subsampling", "4:4:4 chroma", "4:2:0 chroma", "bandwidth", "colour depth"],
  },
  {
    id: "four-two-zero",
    term: "4:2:0 chroma",
    category: "Video Quality",
    aliases: ["4:2:0", "reduced chroma"],
    plainEnglish: "A lower-bandwidth colour sampling format that can be fine for video but less ideal for small text.",
    whyItMatters: "It can make a system more achievable over limited bandwidth, but the customer must accept the visual trade-off.",
    inReality: "Colour is shared across blocks of four pixels, so it carries a quarter of the colour data of 4:4:4. This is what streaming services, Blu-ray and video calls already use, and it looks fine on that content. Put a spreadsheet or fine coloured text on the screen and it looks soft.",
    cautions: [
      "Do not use reduced chroma language as a substitute for checking real product capability.",
      "Customers may notice the difference on text-heavy content.",
    ],
    related: ["chroma subsampling", "4:2:2 chroma", "4:4:4 chroma", "bandwidth", "4K60", "compression"],
  },
  {
    id: "hdr",
    term: "HDR",
    category: "Video Quality",
    aliases: ["High Dynamic Range", "Dolby Vision", "HLG"],
    plainEnglish: "Video with wider brightness and colour range than standard dynamic range content.",
    whyItMatters: "It is important for premium visual quality, but every device in the signal chain must support the required format.",
    cautions: [
      "HDR support is format-specific.",
      "A non-HDR device in the chain can remove the benefit.",
    ],
    related: ["HDMI", "4K60", "bandwidth", "display"],
  },
  {
    id: "latency",
    term: "Latency",
    category: "Video Quality",
    aliases: ["delay", "lag", "response time"],
    plainEnglish: "The delay between a source action and the picture or sound appearing at the destination.",
    whyItMatters: "Low latency matters for live control, interactive rooms, production, gaming, KVM and some conferencing workflows.",
    cautions: [
      "Signage can tolerate more latency than KVM or live monitoring.",
      "Compression, scaling and network transport can all add delay.",
    ],
    related: ["AV-over-IP", "compression", "KVM", "NetworkHD 600", "multiview"],
  },
  {
    id: "bandwidth",
    term: "Bandwidth",
    category: "Network AV",
    aliases: ["data rate", "Gbps", "throughput"],
    plainEnglish: "How much data the signal or network path must carry.",
    whyItMatters: "Bandwidth decides whether a cable, extender, switch or network can safely carry the desired resolution and quality.",
    cautions: [
      "More bandwidth is not automatically better if the application does not need it.",
      "Bandwidth claims must match the real signal format.",
    ],
    related: ["4K60", "4:4:4 chroma", "compression", "1G", "10G"],
  },
  {
    id: "compression",
    term: "Compression",
    category: "Network AV",
    aliases: ["codec", "encoding", "JPEG2000", "H.264", "H.265"],
    plainEnglish: "The signal is reduced in size so it can travel over a lower-bandwidth path.",
    whyItMatters: "Compression can make larger systems practical, but it may affect latency, image detail or suitability for the application.",
    cautions: [
      "Compression is application-dependent.",
      "Avoid promising lossless performance from a compressed system.",
    ],
    related: ["bandwidth", "latency", "AV-over-IP", "NetworkHD", "10G"],
  },
  {
    id: "multicast",
    term: "Multicast",
    category: "Network AV",
    aliases: ["one-to-many network stream"],
    plainEnglish: "One network stream can be received by multiple destinations instead of sending a separate stream to each one.",
    whyItMatters: "Many AV-over-IP systems rely on multicast to distribute sources efficiently across many displays.",
    cautions: [
      "Poor multicast setup can flood a network.",
      "Do not place AV multicast on a customer network without approval and design.",
    ],
    related: ["IGMP", "VLAN", "AV-over-IP", "NetworkHD", "managed switch"],
  },
  {
    id: "igmp",
    term: "IGMP",
    category: "Network AV",
    aliases: ["Internet Group Management Protocol", "IGMP snooping", "IGMP querier"],
    plainEnglish: "A network method that helps switches send multicast AV traffic only where it is needed.",
    whyItMatters: "It is one of the key network settings that makes AV-over-IP behave properly.",
    cautions: [
      "Unmanaged switches are usually a red flag for serious AVoIP.",
      "IGMP settings vary by switch vendor and network design.",
    ],
    related: ["multicast", "VLAN", "managed switch", "AV-over-IP"],
  },
  {
    id: "vlan",
    term: "VLAN",
    category: "Network AV",
    aliases: ["virtual LAN", "network segmentation"],
    plainEnglish: "A way to separate traffic on a network so AV, corporate data and other services can be managed independently.",
    whyItMatters: "It can protect performance and make customer IT teams more comfortable with AV-over-IP.",
    cautions: [
      "A VLAN is not a full design by itself.",
      "Routing between VLANs can affect control and discovery.",
    ],
    related: ["IGMP", "multicast", "DHCP", "static IP", "managed switch"],
  },
  {
    id: "poe",
    term: "PoE / PoH / PoC",
    category: "Power",
    aliases: ["Power over Ethernet", "Power over HDBaseT", "Power over Cable"],
    plainEnglish: "Power is sent along the same cable used for network or AV transport, reducing the need for a local power supply.",
    whyItMatters: "It can simplify installation, but source, cable, endpoint and power budget must all match.",
    cautions: [
      "PoE, PoH and PoC are not automatically interchangeable.",
      "Power budget can be the hidden reason an endpoint fails.",
    ],
    related: ["HDBaseT", "AV-over-IP", "receiver", "transmitter", "CAT cable"],
  },
  {
    id: "encoder",
    term: "Encoder",
    category: "Network AV",
    aliases: ["transmitter", "TX"],
    plainEnglish: "A source-side device that puts video, audio or USB onto an AV-over-IP network.",
    whyItMatters: "It is the part of the system connected to the source, such as a laptop, media player or camera feed.",
    cautions: [
      "Do not confuse source-side encoders with display-side decoders.",
      "Some transceiver products can act as either, but the design role still matters.",
    ],
    related: ["decoder", "AV-over-IP", "NetworkHD", "source", "transceiver"],
  },
  {
    id: "decoder",
    term: "Decoder",
    category: "Network AV",
    aliases: ["receiver", "RX"],
    plainEnglish: "A display-side device that receives a network AV stream and outputs it to a screen or other destination.",
    whyItMatters: "It is the part of an AV-over-IP system that usually sits behind a display or at a destination point.",
    cautions: [
      "A decoder count is not the same as a source count.",
      "Check whether video wall, multiview or scaling features are endpoint-specific.",
    ],
    related: ["encoder", "receiver", "AV-over-IP", "display", "video wall"],
  },
  {
    id: "matrix",
    term: "Matrix switcher",
    category: "Switching",
    aliases: ["matrix", "router", "fixed I/O switcher"],
    plainEnglish: "A central device that routes multiple inputs to multiple outputs.",
    whyItMatters: "A matrix can be simpler and cleaner than AV-over-IP when the system size is fixed and predictable.",
    cautions: [
      "Do not undersize the I/O count.",
      "Check receiver compatibility where HDBaseT outputs are involved.",
    ],
    related: ["switcher", "HDBaseT", "scaling", "seamless switching", "AV-over-IP"],
  },
  {
    id: "switcher",
    term: "Switcher",
    category: "Switching",
    aliases: ["presentation switcher", "input switcher"],
    plainEnglish: "A device that selects between sources, usually for one room or presentation space.",
    whyItMatters: "It is often the core of a meeting room, classroom or BYOD presentation workflow.",
    cautions: [
      "Input count alone does not define the right switcher.",
      "USB and conferencing needs can change the product class.",
    ],
    related: ["matrix", "USB-C", "BYOD", "scaling", "HDBaseT"],
  },
  {
    id: "scaler",
    term: "Scaler",
    category: "Processing",
    aliases: ["scaling", "upscaling", "downscaling"],
    plainEnglish: "A processor that changes the video resolution or format to suit the display or system.",
    whyItMatters: "Scaling can solve mixed-source and mixed-display problems, especially in boardrooms, classrooms and video walls.",
    cautions: [
      "Scaling can add processing delay.",
      "Scaling does not fix every HDCP or EDID issue.",
    ],
    related: ["EDID", "seamless switching", "video wall", "matrix"],
  },
  {
    id: "seamless-switching",
    term: "Seamless switching",
    category: "Processing",
    aliases: ["fast switching", "clean switching"],
    plainEnglish: "Switching between sources without an obvious blank screen or long resync.",
    whyItMatters: "It makes executive rooms, training spaces and live presentation systems feel more polished.",
    cautions: [
      "Seamless switching usually depends on processing, not just the button press.",
      "It may affect cost and product selection.",
    ],
    related: ["scaler", "matrix", "switcher", "EDID"],
  },
  {
    id: "multiview",
    term: "Multiview",
    category: "Processing",
    aliases: ["multi-view", "windowing", "quad view"],
    plainEnglish: "Showing multiple sources on one display at the same time.",
    whyItMatters: "It is valuable for control rooms, monitoring, teaching, operations and premium meeting spaces.",
    cautions: [
      "Multiview is different from video wall processing.",
      "Window count and layout flexibility vary by product.",
    ],
    related: ["video wall processor", "NetworkHD", "latency", "scaling"],
  },
  {
    id: "video-wall-processor",
    term: "Video wall processor",
    category: "Processing",
    aliases: ["wall processor", "LCD wall processor", "LED wall processing"],
    plainEnglish: "A processor that maps sources across multiple displays or a wall canvas.",
    whyItMatters: "It decides how the content appears across the wall, not just how the signal gets there.",
    cautions: [
      "A splitter is not a video wall processor.",
      "LED walls may involve separate LED processing outside the AV switch path.",
    ],
    related: ["multiview", "scaler", "matrix", "AV-over-IP", "LED wall"],
  },
  {
    id: "mst",
    term: "MST",
    acronym: "MST",
    category: "USB and Workstations",
    aliases: ["Multi-Stream Transport", "dual display over USB-C", "DisplayPort MST"],
    plainEnglish: "A DisplayPort technology that can carry multiple display streams from one compatible source.",
    whyItMatters: "It is useful for dual-display laptop rooms, but support depends heavily on the laptop, dock, display path and operating system.",
    cautions: [
      "Some Mac workflows do not support MST in the same way as Windows.",
      "MST is not the same as a generic HDMI splitter.",
    ],
    related: ["USB-C", "DisplayPort", "EDID", "dual display", "BYOD"],
  },
  {
    id: "usb-c",
    term: "USB-C",
    category: "USB and Workstations",
    aliases: ["Type-C", "USB Type-C", "USB-C Alt Mode"],
    plainEnglish: "A connector that can carry data, charging and sometimes video, depending on the devices and cable.",
    whyItMatters: "USB-C is a user-friendly connection, but the connector alone does not guarantee video, USB speed or charging.",
    cautions: [
      "Not all USB-C ports support video.",
      "Not all USB-C cables support the same speed, charging or display capability.",
    ],
    related: ["USB Power Delivery", "MST", "BYOD", "USB 3.x", "DisplayPort"],
  },
  {
    id: "usb-pd",
    term: "USB Power Delivery",
    acronym: "USB PD",
    category: "USB and Workstations",
    aliases: ["Power Delivery", "PD charging", "USB-C charging"],
    plainEnglish: "USB-C charging where the source and device negotiate how much power is delivered.",
    whyItMatters: "Meeting-room users often expect one cable to present, connect USB devices and charge their laptop.",
    cautions: [
      "60W may not satisfy every laptop.",
      "Charging behaviour depends on device, cable and product capability.",
    ],
    related: ["USB-C", "BYOD", "USB 3.x", "Alt Mode"],
  },
  {
    id: "usb-2",
    term: "USB 2.0",
    category: "USB and Workstations",
    aliases: ["USB2", "480 Mbps"],
    plainEnglish: "A common USB speed that is often enough for keyboard, mouse, touch and many conferencing peripherals.",
    whyItMatters: "USB 2.0 can be the right answer for many rooms, but not for high-bandwidth USB cameras or specialist devices.",
    cautions: [
      "USB 2.0 is not enough for every camera.",
      "USB speed and USB connector type are different questions.",
    ],
    related: ["USB 3.x", "KVM", "BYOD", "USB routing"],
  },
  {
    id: "usb-3",
    term: "USB 3.x",
    category: "USB and Workstations",
    aliases: ["USB 3.0", "USB 3.1", "USB 3.2", "SuperSpeed"],
    plainEnglish: "Higher-speed USB used by some cameras, capture devices and data-heavy peripherals.",
    whyItMatters: "It can be essential for certain USB camera and device workflows, but it changes product choice and distance options.",
    inReality: "USB naming has been renamed twice, so the same 5Gbps link has three different official names and marketing will use whichever sounds best. Ignore the badge and ask for the data rate in Gbps. The practical point for AV is distance: USB 2.0 runs about 5m on passive cable and USB 3.x only about 3m, so anything beyond a table needs a real extension product, not a longer cable.",
    reference: {
      caption: "USB generations - what the names actually mean",
      rowLabel: "Generation",
      columns: ["Data rate", "Also sold as", "Practical passive cable"],
      rows: [
        {
          label: "USB 2.0",
          cells: ["480 Mbps", "High Speed", "Around 5m"],
          note: "Still enough for most room microphones, speakerphones and many 1080p conferencing cameras.",
        },
        {
          label: "USB 3.0",
          cells: ["5 Gbps", "USB 3.1 Gen 1, USB 3.2 Gen 1, SuperSpeed", "Around 3m"],
          note: "Three names, one speed. This is the most common source of spec-sheet confusion.",
        },
        {
          label: "USB 3.1 Gen 2",
          cells: ["10 Gbps", "USB 3.2 Gen 2, SuperSpeed 10Gbps", "Around 3m"],
          note: "The usual requirement for 4K cameras and high-resolution capture.",
        },
        {
          label: "USB 3.2 Gen 2x2",
          cells: ["20 Gbps", "SuperSpeed 20Gbps", "Around 1m"],
          note: "USB-C connector only - it uses both data lanes in the cable.",
        },
        {
          label: "USB4",
          cells: ["20 or 40 Gbps", "USB4 Gen 2x2 / Gen 3x2", "Around 0.8m at full rate"],
          note: "USB-C only, and shares its lineage with Thunderbolt.",
        },
      ],
      footnote: "Distances are for passive copper. Active optical cable and dedicated USB extenders go much further - that is what they are for.",
    },
    cautions: [
      "Do not assume USB 3.x over long distances without the correct extension product.",
      "USB 3.x can affect cable length and compatibility.",
    ],
    related: ["USB 2.0", "USB-C", "KVM", "camera", "BYOD"],
  },
  {
    id: "kvm",
    term: "KVM",
    category: "USB and Workstations",
    aliases: ["Keyboard Video Mouse", "keyboard mouse switching", "USB extension"],
    plainEnglish: "A setup where a keyboard, display and mouse control a computer that may be remote or switchable.",
    whyItMatters: "It matters in control rooms, education, broadcast, workstations and any room where USB control must follow the video.",
    cautions: [
      "KVM is not just video extension.",
      "USB speed and latency can make or break the experience.",
    ],
    related: ["USB 2.0", "USB 3.x", "latency", "switcher", "control room"],
  },
  {
    id: "byod",
    term: "BYOD",
    category: "Collaboration",
    aliases: ["Bring Your Own Device", "laptop presentation"],
    plainEnglish: "Users bring their own laptop or device into the room and connect to present or collaborate.",
    whyItMatters: "It affects input locations, USB-C, charging, wireless presentation, cable access and user experience.",
    cautions: [
      "BYOD can mean presentation only or full conferencing.",
      "Wireless BYOD and wired USB-C BYOD are different user experiences.",
    ],
    related: ["BYOM", "USB-C", "USB routing", "wireless presentation", "MTR"],
  },
  {
    id: "byom",
    term: "BYOM",
    category: "Collaboration",
    aliases: ["Bring Your Own Meeting", "laptop conferencing"],
    plainEnglish: "Users run the meeting from their own laptop but use the room camera, microphone, speaker or display.",
    whyItMatters: "BYOM adds USB routing and device ownership questions to a normal presentation room.",
    cautions: [
      "Do not treat BYOM as just HDMI presentation.",
      "USB compatibility and user flow need to be clear.",
    ],
    related: ["BYOD", "USB routing", "USB-C", "camera", "speakerphone"],
  },
  {
    id: "uc",
    term: "Unified Communications",
    acronym: "UC",
    category: "Collaboration",
    aliases: ["video conferencing", "Teams", "Zoom", "soft codec"],
    plainEnglish: "The meeting platform and room devices used for calls, sharing and collaboration.",
    whyItMatters: "UC projects combine AV, USB, control, audio and user workflow, so a product-only answer can miss the real need.",
    cautions: [
      "UC is not a single product category.",
      "Audio and USB details are often the real risk.",
    ],
    related: ["BYOD", "BYOM", "MTR", "USB-C", "DSP"],
  },
  {
    id: "mtr",
    term: "Microsoft Teams Rooms",
    acronym: "MTR",
    category: "Collaboration",
    aliases: ["Teams Room", "room PC", "Microsoft room"],
    plainEnglish: "A dedicated Microsoft Teams room setup, usually with a room computer, certified peripherals and a fixed meeting workflow.",
    whyItMatters: "MTR changes the conversation from bring-your-own laptop to a managed room system, though BYOD/BYOM may still be needed.",
    cautions: [
      "Do not assume a Teams Room removes the need for laptop presentation.",
      "Certified peripheral and platform requirements may sit outside the AV switcher decision.",
    ],
    related: ["UC", "BYOM", "USB routing", "camera", "speakerphone"],
  },
  {
    id: "ptz",
    term: "PTZ camera",
    category: "Collaboration",
    aliases: ["pan tilt zoom camera", "room camera"],
    plainEnglish: "A camera that can pan, tilt and zoom to frame people, rooms or presenters.",
    whyItMatters: "It affects USB, HDMI, NDI, control and mounting decisions in conferencing, lecture and capture spaces.",
    cautions: [
      "Camera output type affects the whole room architecture.",
      "Control and mounting can be as important as image quality.",
    ],
    related: ["USB 3.x", "NDI", "UC", "RS-232", "IP control"],
  },
  {
    id: "ndi",
    term: "NDI",
    category: "Network AV",
    aliases: ["Network Device Interface", "network video production"],
    plainEnglish: "A network video technology often used for cameras, production and software-based video workflows.",
    whyItMatters: "It can bridge AV, broadcast and conferencing needs, especially where cameras and software tools are involved.",
    cautions: [
      "NDI is not the same as generic AV-over-IP distribution.",
      "Network design and software compatibility need checking.",
    ],
    related: ["PTZ camera", "AV-over-IP", "bandwidth", "multicast", "latency"],
  },
  {
    id: "dante",
    term: "Dante",
    category: "Audio",
    aliases: ["Dante audio", "audio over IP"],
    plainEnglish: "A network audio technology used to route audio between compatible devices over Ethernet.",
    whyItMatters: "It is common in installed audio, education, conferencing and larger systems where flexible audio routing is needed.",
    cautions: [
      "Dante needs compatible devices and proper network setup.",
      "Audio networking is not automatically covered by video networking.",
    ],
    related: ["AES67", "DSP", "amplifier", "network", "clocking"],
  },
  {
    id: "aes67",
    term: "AES67",
    category: "Audio",
    aliases: ["audio interoperability standard", "network audio standard"],
    plainEnglish: "A standard that can help different audio-over-IP systems pass audio between each other.",
    whyItMatters: "It matters when a project needs interoperability between different network audio ecosystems.",
    cautions: [
      "AES67 support does not mean every feature crosses between platforms.",
      "Configuration detail matters.",
    ],
    related: ["Dante", "DSP", "multicast", "network audio"],
  },
  {
    id: "dsp",
    term: "DSP",
    category: "Audio",
    aliases: ["Digital Signal Processing", "audio processing"],
    plainEnglish: "Audio processing such as mixing, EQ, delay, echo control, filtering and level management.",
    whyItMatters: "DSP can decide whether a conferencing or installed audio system sounds professional and behaves reliably.",
    cautions: [
      "A product with audio inputs is not automatically a full DSP solution.",
      "Poor audio design can undermine the whole room experience.",
    ],
    related: ["Dante", "AES67", "microphone", "amplifier", "UC"],
  },
  {
    id: "arc-earc",
    term: "ARC / eARC",
    category: "Audio",
    aliases: ["Audio Return Channel", "enhanced Audio Return Channel", "display audio return"],
    plainEnglish: "A way for a display to send audio back down an HDMI connection to an audio system.",
    whyItMatters: "It matters when the display's built-in apps or tuner need to feed external audio.",
    cautions: [
      "ARC/eARC behaviour can depend on CEC and display settings.",
      "Commercial displays may behave differently from consumer TVs.",
    ],
    related: ["HDMI", "CEC", "audio breakout", "display"],
  },
  {
    id: "rs232",
    term: "RS-232",
    category: "Control",
    aliases: ["serial control", "COM port"],
    plainEnglish: "A wired serial control method used to send commands to AV devices.",
    whyItMatters: "It is still common for controlling displays, matrices, projectors and specialist AV equipment.",
    cautions: [
      "RS-232 wiring and settings must match the device.",
      "Pass-through support varies by product.",
    ],
    related: ["IR", "IP control", "CEC", "relay", "HDBaseT"],
  },
  {
    id: "ir",
    term: "IR control",
    category: "Control",
    aliases: ["infrared", "remote control pass-through"],
    plainEnglish: "Control using infrared commands, similar to a handheld remote.",
    whyItMatters: "It can be a simple control path for displays and sources, but it is less robust than deeper control methods.",
    cautions: [
      "IR is usually one-way.",
      "Placement and line-of-sight can affect reliability.",
    ],
    related: ["RS-232", "CEC", "IP control", "HDBaseT"],
  },
  {
    id: "cec",
    term: "CEC",
    category: "Control",
    aliases: ["Consumer Electronics Control", "HDMI control"],
    plainEnglish: "Control commands sent over HDMI, often used for basic display or source control.",
    whyItMatters: "It can simplify small systems but can be inconsistent across devices and brands.",
    cautions: [
      "CEC behaviour is device-specific.",
      "It is rarely the right control foundation for complex rooms.",
    ],
    related: ["HDMI", "ARC/eARC", "RS-232", "IR", "IP control"],
  },
  {
    id: "ip-control",
    term: "IP control",
    category: "Control",
    aliases: ["network control", "API", "web UI", "LAN control"],
    plainEnglish: "Devices are controlled through network commands, web interfaces or APIs.",
    whyItMatters: "It is common in modern AV systems and can support routing, monitoring, presets and integration.",
    cautions: [
      "Network access and credentials can block commissioning.",
      "API capability varies by product and firmware.",
    ],
    related: ["RS-232", "CEC", "VLAN", "static IP", "control system"],
  },
  {
    id: "cat-cable",
    term: "Cat cable grades",
    acronym: "Cat5e / Cat6 / Cat6a",
    category: "Cabling and Distance",
    aliases: ["category cable", "structured cable", "twisted pair", "Cat5e", "Cat6", "Cat6a", "Cat7", "UTP", "STP"],
    plainEnglish: "The grades of twisted-pair structured cable used for both networks and AV extension.",
    whyItMatters: "The cable grade, and whether it is shielded and solid-core, decides the distance and resolution an HDBaseT or AV-over-IP link can actually deliver.",
    inReality: "The cable is the part of the system nobody budgets for and everybody blames. Existing cable in a building is frequently unshielded Cat5e run past fluorescent lighting, terminated by a different trade years ago - which is fine for a phone and marginal for 4K AV. Always ask whether the cable is already installed, what grade it is, and whether anyone has tested it.",
    reference: {
      caption: "Cable grades and what they support",
      rowLabel: "Grade",
      columns: ["Bandwidth", "Ethernet distance", "Use for AV extension"],
      rows: [
        {
          label: "Cat5e",
          cells: ["100 MHz", "1 Gbps to 100m", "Workable for 1080p and some 4K30 links; the usual cause of marginal 4K"],
        },
        {
          label: "Cat6",
          cells: ["250 MHz", "10 Gbps to 55m, 1 Gbps to 100m", "The sensible minimum for new 4K HDBaseT and AV-over-IP"],
        },
        {
          label: "Cat6a",
          cells: ["500 MHz", "10 Gbps to 100m", "The safe specification for full-distance 4K and 10G AV-over-IP"],
        },
        {
          label: "Cat7 / Cat7a",
          cells: ["600 - 1000 MHz", "10 Gbps to 100m", "Fully shielded; specify only where the environment genuinely demands it"],
        },
      ],
      footnote: "For AV, prefer solid-core shielded cable with shielded connectors, and keep patch leads short. Stranded patch lead on a long run is a common and avoidable distance killer.",
    },
    cautions: [
      "Do not assume installed cable is fit for 4K - grade, shielding, termination quality and route all matter.",
      "Cable that passes a network test can still fail an AV link; ask whether it was certified, not just 'it works'.",
    ],
    related: ["HDBaseT", "AV-over-IP", "bandwidth", "PoE / PoH / PoC", "active optical cable"],
  },
  {
    id: "hdmi-cable-types",
    term: "HDMI cable categories",
    category: "Cabling and Distance",
    aliases: ["High Speed HDMI", "Premium High Speed", "Ultra High Speed HDMI", "HDMI cable certification"],
    plainEnglish: "The certification tiers that state how much bandwidth an HDMI cable is actually rated to carry.",
    whyItMatters: "HDMI cables are not interchangeable at 4K and above - the cable is a bandwidth-limited part of the signal path, not just a lead.",
    inReality: "Passive copper HDMI gets unreliable with length very quickly at high bandwidth: around 5m is a sensible practical ceiling for 18Gbps and around 3m for 48Gbps. Beyond that, use an active optical cable or an extender. A failing HDMI cable rarely fails cleanly - it sparkles, drops out on a resolution change, or works until the source is swapped.",
    reference: {
      caption: "HDMI cable certifications",
      rowLabel: "Certification",
      columns: ["Rated bandwidth", "Supports", "Sensible passive length"],
      rows: [
        {
          label: "Standard",
          cells: ["4.95 Gbps", "1080i / 720p", "Legacy only - do not specify"],
        },
        {
          label: "High Speed",
          cells: ["10.2 Gbps", "1080p60, 4K30", "Up to around 7m"],
        },
        {
          label: "Premium High Speed",
          cells: ["18 Gbps", "4K60 4:4:4, HDR", "Up to around 5m"],
          note: "The realistic minimum for any modern 4K commercial install.",
        },
        {
          label: "Ultra High Speed",
          cells: ["48 Gbps", "8K60, 4K120, HDMI 2.1 features", "Up to around 3m"],
          note: "Required for HDMI 2.1 FRL signalling - an older cable will not carry it.",
        },
        {
          label: "Active optical (AOC)",
          cells: ["18 or 48 Gbps depending on type", "As the rated tier", "15m to 100m"],
          note: "Directional - the source and display ends are not interchangeable.",
        },
      ],
    },
    cautions: [
      "An uncertified 'supports 4K' cable is a claim, not a rating. Specify the certification tier.",
      "Active optical cable is directional and usually cannot be re-terminated - confirm the route and length before ordering.",
    ],
    related: ["HDMI", "bandwidth", "4:4:4 chroma", "active optical cable", "HDBaseT"],
  },
  {
    id: "active-optical-cable",
    term: "Active optical cable",
    acronym: "AOC",
    category: "Cabling and Distance",
    aliases: ["AOC", "fibre HDMI", "optical HDMI", "hybrid cable"],
    plainEnglish: "A cable with fibre inside and electronics in the connectors, used to carry HDMI or USB much further than copper can.",
    whyItMatters: "It is often the simplest answer to a single long run where an extender pair and structured cable would be overkill.",
    inReality: "It gets you 15m to 100m on one part number without a rack, a receiver or a power supply at the far end. The trade-offs are that it is directional, it needs a route large enough to pull a fixed connector through, and it cannot be shortened or re-terminated on site - so measure the actual cable path, not the straight-line distance.",
    cautions: [
      "Directional: check which end goes to the source before it is installed in a wall.",
      "Connectors are fixed, so the containment and any conduit bend radius must take the plug.",
    ],
    related: ["HDMI cable categories", "HDBaseT", "USB 3.x", "bandwidth"],
  },
  {
    id: "resolution-refresh",
    term: "Resolution and refresh rate",
    category: "Video Quality",
    aliases: ["1080p", "4K", "8K", "60Hz", "30Hz", "frame rate", "2160p", "UHD", "4K60", "4K30", "4K120", "8K60", "1080p60"],
    plainEnglish: "How many pixels the picture contains, and how many times per second the screen is redrawn.",
    whyItMatters: "Together with chroma and colour depth these decide the bandwidth, and therefore which products and cables can carry the signal.",
    inReality: "4K30 and 4K60 are not the same requirement - 4K60 is double the data. 30Hz is acceptable for static signage and slides, but a mouse pointer moving across a 4K30 screen looks visibly stuttery, so anything interactive or laptop-driven should be 4K60. That single choice often decides whether HDMI 2.0 class products are enough.",
    reference: {
      caption: "Common formats and what they demand",
      rowLabel: "Format",
      columns: ["Pixels", "Uncompressed bandwidth (4:4:4 8-bit)", "Typically needs"],
      rows: [
        { label: "1080p60", cells: ["1920 x 1080", "Around 4.5 Gbps", "Almost anything, including HDMI 1.4 and Cat5e"] },
        { label: "4K30", cells: ["3840 x 2160", "Around 9 Gbps", "HDMI 1.4 class products and HDBaseT spec 1.0/2.0"] },
        { label: "4K60", cells: ["3840 x 2160", "Around 18 Gbps", "HDMI 2.0 class products, Cat6/6a, Premium High Speed cable"] },
        { label: "4K120 / 8K60", cells: ["3840 x 2160 / 7680 x 4320", "Up to 48 Gbps", "HDMI 2.1, Ultra High Speed cable, often with compression"] },
      ],
      footnote: "Reducing chroma or colour depth lowers these figures - which is exactly how products fit 4K60 HDR into an 18 Gbps link.",
    },
    cautions: [
      "'4K' on a datasheet without a refresh rate is an incomplete claim - always confirm 4K30 or 4K60.",
      "The display, the source and every device between them must all support the format, not just the screen.",
    ],
    related: ["chroma subsampling", "colour depth", "bandwidth", "HDMI", "HDR"],
  },
  {
    id: "colour-depth",
    term: "Colour depth",
    acronym: "Bit depth",
    category: "Video Quality",
    aliases: ["bit depth", "8-bit", "10-bit", "12-bit", "deep colour"],
    plainEnglish: "How many steps of each colour the signal can describe, usually quoted as 8-bit, 10-bit or 12-bit.",
    whyItMatters: "It is the third multiplier in the bandwidth calculation, and it is the part most often quietly dropped to make a format fit.",
    inReality: "8-bit gives 256 steps per colour, 10-bit gives 1024. The visible difference is banding - the stepped bands you see across a sunset, a gradient background or a corporate slide with a soft-faded panel. HDR effectively assumes 10-bit, so a product offering 4K60 HDR within 18Gbps is nearly always reducing chroma to make room.",
    cautions: [
      "4K60 10-bit HDR does not fit in 18 Gbps at 4:4:4 - if a product claims all of it, find out what is being reduced.",
      "Banding complaints on gradients are usually a colour-depth problem, not a display fault.",
    ],
    related: ["chroma subsampling", "HDR", "bandwidth", "resolution and refresh rate", "HDMI"],
  },
];

export const AV_GLOSSARY_CATEGORIES = Array.from(
  new Set(AV_GLOSSARY_TERMS.map((term) => term.category)),
).sort((left, right) => left.localeCompare(right));
