export type WingmanTier = "Bronze" | "Silver" | "Gold";

export type BomItem = {
  sku: string;
  qty: number;
  role: string;
  description: string;
};

export function buildTieredBom(
  architecture: string,
  tier: WingmanTier,
  inputs: {
    sources: number;
    displays: number;
  }
): BomItem[] {
  const sources = Math.max(1, Number(inputs.sources || 0));
  const displays = Math.max(1, Number(inputs.displays || 0));

  if (architecture.includes("AV over IP")) {
    const encoder = tier === "Gold" ? "NHD-500-TX" : "AVoIP-TX";
    const decoder = tier === "Gold" ? "NHD-500-RX" : "AVoIP-RX";

    const bom: BomItem[] = [
      {
        sku: encoder,
        qty: sources,
        role: "Encoder",
        description: "Encodes each source onto the AVoIP network.",
      },
      {
        sku: decoder,
        qty: displays,
        role: "Decoder",
        description: "Decodes network video for each display endpoint.",
      },
      {
        sku: "NHD-CTL-PRO",
        qty: 1,
        role: "Controller",
        description: "Provides AVoIP system control and routing management.",
      },
    ];

    if (tier !== "Bronze") {
      bom.push({
        sku: "SYN-TOUCH10",
        qty: 1,
        role: "User control",
        description: "Provides a simple touch interface for room control.",
      });
    }

    return bom;
  }

  if (architecture.includes("Video Wall")) {
    if (tier === "Bronze") {
      return [
        {
          sku: "SW-0206-VW",
          qty: 1,
          role: "Processor",
          description: "Dedicated video wall processor for fixed-layout wall applications.",
        },
      ];
    }

    if (tier === "Silver") {
      return [
        {
          sku: "SW-0206-VW",
          qty: 1,
          role: "Processor",
          description: "Dedicated video wall processor for practical multi-screen wall layouts.",
        },
        {
          sku: "AVoIP-TX",
          qty: sources,
          role: "Source feed",
          description: "Feeds source content into the wall workflow.",
        },
      ];
    }

    return [
      {
        sku: "NHD-500-TX",
        qty: sources,
        role: "Encoder",
        description: "Encodes source signals for advanced wall distribution.",
      },
      {
        sku: "NHD-500-RX",
        qty: displays,
        role: "Decoder",
        description: "Decodes content at each wall destination or display zone.",
      },
      {
        sku: "NHD-CTL-PRO",
        qty: 1,
        role: "Controller",
        description: "Provides routing and control for advanced wall systems.",
      },
      {
        sku: "SYN-TOUCH10",
        qty: 1,
        role: "User control",
        description: "Provides a premium touch control interface for wall operation.",
      },
    ];
  }

  if (architecture.includes("Matrix")) {
    const bom: BomItem[] = [
      {
        sku: "MX-0402-MST",
        qty: 1,
        role: "Matrix",
        description: "Core presentation matrix for multi-source room switching.",
      },
    ];

    if (tier !== "Bronze") {
      bom.push({
        sku: "SYN-TOUCH10",
        qty: 1,
        role: "User control",
        description: "Provides a simple touch interface for source selection and room control.",
      });
    }

    if (tier === "Gold") {
      bom.push({
        sku: "APO-VX20-UC v2",
        qty: 1,
        role: "Collaboration",
        description: "Adds enhanced conferencing and collaboration capability.",
      });
    }

    return bom;
  }

  const defaultBom: BomItem[] = [
    {
      sku: "SW-510-TX",
      qty: 1,
      role: "Transmitter",
      description: "Transmits source signal over the chosen transport path.",
    },
    {
      sku: "SW-515-RX",
      qty: 1,
      role: "Receiver",
      description: "Receives and outputs the signal at the display end.",
    },
  ];

  if (tier === "Gold") {
    defaultBom.push({
      sku: "SYN-TOUCH10",
      qty: 1,
      role: "User control",
      description: "Provides a more complete user control experience.",
    });
  }

  return defaultBom;
}