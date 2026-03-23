import type { CatalogProduct } from "@/catalog/types";
import type { ComparisonDomain, ComparisonUseCase } from "@/competitor/fit/comparisonRules";
import type { DiscoveryProductFamily } from "@/features/projects/projectStore";

import { sanitizeCompetitorForMatching } from "./matchingSupport";

export type CompetitorKnowledgeState =
  | "presentation-switcher"
  | "matrix"
  | "multiview"
  | "avoip"
  | "extender"
  | "wall-processor"
  | "generic";

export type CompetitorKnowledgeProfile = {
  state: CompetitorKnowledgeState;
  title: string;
  summary: string;
  recommendedFamilies: DiscoveryProductFamily[];
  caveats: string[];
  comparisonDomain?: ComparisonDomain;
  comparisonUseCase?: ComparisonUseCase;
};

type CompetitorLike = Pick<
  CatalogProduct,
  "sku" | "name" | "family" | "category" | "subcategory" | "summary" | "transport" | "features" | "control" | "audio" | "notes"
> & {
  brand?: string;
};

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function textBlob(product: CompetitorLike): string {
  return [
    product.brand,
    product.sku,
    product.name,
    product.family,
    product.category,
    product.subcategory,
    product.summary,
    product.transport,
    ...(product.features ?? []),
    ...(product.control ?? []),
    ...(product.audio ?? []),
  ]
    .map((entry) => tidy(entry).toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function buildProfile(
  state: CompetitorKnowledgeState,
  title: string,
  summary: string,
  recommendedFamilies: DiscoveryProductFamily[],
  caveats: string[],
  comparisonDomain?: ComparisonDomain,
  comparisonUseCase?: ComparisonUseCase,
): CompetitorKnowledgeProfile {
  const defaults =
    state === "matrix"
      ? { comparisonDomain: "MATRIX" as const, comparisonUseCase: "ROUTING" as const }
      : state === "presentation-switcher"
        ? { comparisonDomain: "PRESENTATION" as const, comparisonUseCase: "COLLABORATION" as const }
        : state === "avoip"
          ? { comparisonDomain: "AVOIP" as const, comparisonUseCase: "DISTRIBUTION" as const }
          : state === "extender"
            ? { comparisonDomain: "EXTENDER" as const, comparisonUseCase: "EXTENSION" as const }
            : state === "wall-processor"
              ? { comparisonDomain: "VIDEO_WALL" as const, comparisonUseCase: "WALL_PROCESSING" as const }
              : { comparisonDomain: "UNKNOWN" as const, comparisonUseCase: "UNKNOWN" as const };

  return {
    state,
    title,
    summary,
    recommendedFamilies,
    caveats,
    comparisonDomain: comparisonDomain ?? defaults.comparisonDomain,
    comparisonUseCase: comparisonUseCase ?? defaults.comparisonUseCase,
  };
}

function genericProfile(product: CompetitorLike): CompetitorKnowledgeProfile {
  const blob = textBlob(product);
  const recommendedFamilies: DiscoveryProductFamily[] = [];

  if (blob.includes("presentation") || blob.includes("switcher") || blob.includes("byod")) {
    recommendedFamilies.push("Apollo");
  }
  if (blob.includes("matrix")) recommendedFamilies.push("Matrix");
  if (blob.includes("hdbaset") || blob.includes("dtp")) recommendedFamilies.push("HDBaseT");
  if (blob.includes("avoip") || blob.includes("networkhd") || blob.includes("ip")) {
    recommendedFamilies.push("AVoIP");
  }
  if (blob.includes("multiview") || blob.includes("windowall") || blob.includes("video wall")) {
    recommendedFamilies.push("Video Wall");
  }
  if (blob.includes("usb")) recommendedFamilies.push("USB Extension");

  const families = Array.from(new Set(recommendedFamilies));
  const state: CompetitorKnowledgeState =
    families.includes("AVoIP")
      ? "avoip"
      : families.includes("Matrix")
        ? "matrix"
        : families.includes("Video Wall")
          ? "multiview"
          : families.includes("HDBaseT")
            ? "extender"
            : families.includes("Apollo")
              ? "presentation-switcher"
              : "generic";

  return buildProfile(
    state,
    "Generic AV signal chain",
    "Use the product's actual topology, I/O, and transport before choosing a WyreStorm family.",
    families.length > 0 ? families : ["Apollo"],
    [
      "Check whether the product is a processor, matrix, endpoint, or extender before comparing it.",
    ],
  );
}

function matrixProfile(
  title: string,
  summary: string,
  families: DiscoveryProductFamily[] = ["Matrix"],
  caveats: string[] = [],
): CompetitorKnowledgeProfile {
  return buildProfile(
    "matrix",
    title,
    summary,
    families,
    caveats.length > 0 ? caveats : ["Compare raw I/O, audio breakaway, scaling, and routing behavior."],
  );
}

function presentationProfile(
  title: string,
  summary: string,
  families: DiscoveryProductFamily[] = ["Apollo"],
  caveats: string[] = [],
): CompetitorKnowledgeProfile {
  return buildProfile(
    "presentation-switcher",
    title,
    summary,
    families,
    caveats.length > 0 ? caveats : ["Treat USB-C, scaling, BYOD, and room control as first-class requirements."],
  );
}

function avoipProfile(
  title: string,
  summary: string,
  families: DiscoveryProductFamily[] = ["AVoIP"],
  caveats: string[] = [],
): CompetitorKnowledgeProfile {
  return buildProfile(
    "avoip",
    title,
    summary,
    families,
    caveats.length > 0 ? caveats : ["Use encoder, decoder, controller, bandwidth, and endpoint roles as the primary comparison inputs."],
  );
}

function extenderProfile(
  title: string,
  summary: string,
  families: DiscoveryProductFamily[] = ["HDBaseT"],
  caveats: string[] = [],
): CompetitorKnowledgeProfile {
  return buildProfile(
    "extender",
    title,
    summary,
    families,
    caveats.length > 0 ? caveats : ["Compare one source to one display or transmitter/receiver distance rather than routing features."],
  );
}

function wallProfile(
  title: string,
  summary: string,
  families: DiscoveryProductFamily[] = ["Video Wall", "AVoIP"],
  caveats: string[] = [],
): CompetitorKnowledgeProfile {
  return buildProfile(
    "wall-processor",
    title,
    summary,
    families,
    caveats.length > 0 ? caveats : ["Treat multiview, wall-feed composition, and per-panel decoding as separate design states."],
  );
}

function extronProfile(product: CompetitorLike): CompetitorKnowledgeProfile {
  const blob = textBlob(product);

  if (/\bnav\b/.test(blob)) {
    const is10g = /\b10g\b|\b10e\b|\b10sd\b/.test(blob);
    return avoipProfile(
      is10g ? "Extron NAV 10G distributed AVoIP" : "Extron NAV distributed AVoIP",
      is10g
        ? "NAV 10G should be treated as a high-bandwidth endpoint-based AV over IP ecosystem with encoder / decoder / controller roles, not as a fixed matrix."
        : "NAV should be treated as an endpoint-based AV over IP ecosystem with encoder / decoder / controller roles, not as a fixed matrix.",
      ["AVoIP"],
      [
        is10g ? "Treat 10G bandwidth and fiber transport as a core decision point." : "Use encoder / decoder counts and network speed when comparing NAV designs.",
        "Distinguish controller, encoder, and decoder roles before mapping to WyreStorm.",
      ],
    );
  }

  if (/\bmgp\b|\bwindowall\b/.test(blob)) {
    return wallProfile(
      "Extron multiview processor",
      "MGP and WindoWall behave like canvas processors for one-screen or one-wall compositions, not like simple switchers.",
      ["Video Wall", "Apollo"],
      [
        "Compare against wall processors and multiview workflows, not against plain matrices.",
        "Treat windowing and scaling as first-class requirements.",
      ],
    );
  }

  if (/\bcrosspoint\b/.test(blob)) {
    return matrixProfile(
      "Extron CrossPoint matrix",
      "CrossPoint products are presentation matrices with scaling and extension layers, so they should be matched as matrix-led systems.",
      ["Matrix", "HDBaseT"],
      [
        "Separate the matrix core from any DTP extension endpoints when comparing BOMs.",
        "Scaled outputs and audio/control features matter as much as raw I/O count.",
      ],
    );
  }

  if (/\bin\d{4}\b|\bdtp(?:3)?\s+t\s+usw\b/.test(blob)) {
    return presentationProfile(
      "Extron presentation switcher",
      "IN-series and DTP USW products are room switchers with presentation staging and extension, which maps most closely to Apollo-style workflows.",
      ["Apollo", "HDBaseT"],
      [
        "Use input mix, scaling, USB-C, and extension behavior before calling it a matrix.",
        "These are presentation workflows first, not generic source selectors.",
      ],
    );
  }

  if (/\bdtp(?:3)?\s+[tr]\b/.test(blob)) {
    return extenderProfile(
      "Extron DTP extender",
      "DTP transmitters and receivers should be handled as point-to-point HDBaseT extension, not as switching or wall-processing products.",
      ["HDBaseT"],
      ["Compare distance, loop-through, and control passthrough rather than treating them as source switchers."],
    );
  }

  return genericProfile(product);
}

function crestronProfile(product: CompetitorLike): CompetitorKnowledgeProfile {
  const blob = textBlob(product);

  if (/\bairmedia\b|\bam-\d+/i.test(blob)) {
    return presentationProfile(
      "Crestron AirMedia collaboration",
      "AirMedia is a wireless presentation and conferencing family, so compare it against collaboration workflows rather than fixed matrices.",
      ["Apollo"],
      [
        "Wireless sharing, conferencing, and transmitter / receiver roles matter more than raw I/O.",
        "Do not map AirMedia into an AVoIP wall architecture.",
      ],
    );
  }

  if (/\bdm-nvx\b/.test(blob)) {
    return avoipProfile(
      "Crestron DM NVX distributed AVoIP",
      "DM NVX is an enterprise AV-over-IP ecosystem with encoders, decoders, and management roles, so it should be compared on transport, director topology, and endpoint behavior.",
      ["AVoIP"],
      [
        "Use encoder, decoder, and director roles when mapping the product.",
        "Treat bandwidth, latency, and wall or room scaling as first-class decision points.",
      ],
    );
  }

  if (/\bhd-ps\b|\bdmps3\b/.test(blob)) {
    return presentationProfile(
      "Crestron presentation system",
      "HD-PS and DMPS3 units are presentation systems with scaling, control, and room routing rather than plain matrices.",
      ["Apollo", "Matrix"],
      [
        "Audio, scaling, USB, and control integration should stay in the foreground.",
        "Treat mirrored outputs and room staging as part of the design state.",
      ],
    );
  }

  if (/\bdm-md\d+x\d+\b/.test(blob)) {
    return matrixProfile(
      "Crestron DigitalMedia matrix",
      "DM-MD chassis products are modular matrix systems and should be compared like enterprise routing platforms.",
      ["Matrix"],
      [
        "Use exact I/O, card layout, and control integration rather than fixed switcher assumptions.",
        "Modularity matters as much as port count.",
      ],
    );
  }

  if (/\bnvx\b/.test(blob)) {
    return avoipProfile(
      "Crestron NVX distributed AVoIP",
      "NVX is Crestron's AV-over-IP ecosystem and should be compared on endpoint counts, transport performance, control, and scaling behavior.",
      ["AVoIP"],
      [
        "Separate pure encoders / decoders from director and management roles.",
        "USB, scaling, and video wall behavior can materially change the correct candidate.",
      ],
    );
  }

  return genericProfile(product);
}

function kramerProfile(product: CompetitorLike): CompetitorKnowledgeProfile {
  const blob = textBlob(product);

  if (/\bvia\b/.test(blob)) {
    return presentationProfile(
      "Kramer VIA collaboration",
      "VIA is a wireless collaboration family, so compare it against BYOD and meeting-room workflows.",
      ["Apollo"],
      ["Wireless sharing and conferencing are the primary differentiators."],
    );
  }

  if (/\bvs-\d+h2a\b/.test(blob)) {
    return matrixProfile(
      "Kramer HDMI matrix",
      "VS matrix products are fixed HDMI routing platforms and should be compared to matrix switchers, not to collaboration systems.",
      ["Matrix"],
      ["Treat audio breakaway and EDID handling as key routing details."],
    );
  }

  if (/\bkds\b/.test(blob)) {
    return avoipProfile(
      "Kramer KDS AVoIP",
      "KDS is Kramer’s AV-over-IP family and should be scored on encoder / decoder roles, transport, and endpoint features.",
      ["AVoIP"],
      ["USB, IR, RS-232, and audio embedding should be captured when available."],
    );
  }

  if (/\btp-?\s?580t\b/.test(blob)) {
    return extenderProfile(
      "Kramer HDBaseT extender",
      "TP-580T is a point-to-point long-reach extender and should be treated as transport, not a routing core.",
      ["HDBaseT"],
      ["Distance and signal class are the important comparison dimensions."],
    );
  }

  return genericProfile(product);
}

function lightwareProfile(product: CompetitorLike): CompetitorKnowledgeProfile {
  const blob = textBlob(product);

  if (/\bucx\b/.test(blob)) {
    return presentationProfile(
      "Lightware UCX collaboration matrix",
      "UCX is a collaboration matrix with USB-C, host switching, and optional audio/network integration, so it should compare as a premium meeting-space system.",
      ["Apollo"],
      [
        "USB host/device routing and collaboration posture are first-class requirements.",
        "Do not compare UCX as if it were a plain HDMI matrix.",
      ],
    );
  }

  if (/\bubex\b/.test(blob) || /\bvinx\b/.test(blob)) {
    return avoipProfile(
      "Lightware AV-over-IP family",
      "UBEX and VINX are premium AVoIP families and should be compared using transport, endpoint type, and latency rather than matrix port counts.",
      ["AVoIP"],
      ["Treat 10G or 1G transport class as a core decision point."],
    );
  }

  if (/\bmx2\b/.test(blob)) {
    return matrixProfile(
      "Lightware matrix switching",
      "MX2 is a standalone HDMI matrix family and should be compared against other fixed matrices.",
      ["Matrix"],
      ["Use I/O count, audio breakaway, and scaling as the main criteria."],
    );
  }

  if (/\btpx\b|\btps\b/.test(blob)) {
    return extenderProfile(
      "Lightware extender / transport",
      "TPX and TPS are long-reach transport families and belong in the extender comparison set.",
      ["HDBaseT"],
      ["Compare end-to-end reach, not matrix routing features."],
    );
  }

  return genericProfile(product);
}

function atlonaProfile(product: CompetitorLike): CompetitorKnowledgeProfile {
  const blob = textBlob(product);

  if (/\bomni\b/.test(blob)) {
    return avoipProfile(
      "Atlona OmniStream AVoIP",
      "OmniStream is Atlona's AV-over-IP family and should be compared on endpoint density, codec family, and transport behavior.",
      ["AVoIP"],
      ["Differentiate encoder, decoder, and multiview roles before choosing a WyreStorm family."],
    );
  }

  if (/\bome\b|\bomega\b/.test(blob)) {
    return presentationProfile(
      "Atlona OME presentation switcher",
      "OME and Omega products are presentation systems with USB-C, BYOD, scaling, and room-control behavior, so they should compare as collaboration-first room solutions.",
      ["Apollo", "Matrix"],
      [
        "Treat collaboration and room staging as the core use case.",
        "Do not compare OME products as if they were pure matrix chassis.",
      ],
    );
  }

  return genericProfile(product);
}

function barcoProfile(product: CompetitorLike): CompetitorKnowledgeProfile {
  const blob = textBlob(product);

  if (/\bclickshare\b|\bvideo bar pro\b/.test(blob)) {
    return presentationProfile(
      "Barco ClickShare collaboration",
      "ClickShare is a BYOD / conferencing family and belongs in the collaboration lane rather than in switching or AVoIP routing.",
      ["Apollo"],
      [
        "Wireless sharing, conferencing, and room simplicity are the main comparison points.",
        "Do not rank it against matrix products unless the room state is explicitly collaboration-first.",
      ],
    );
  }

  return genericProfile(product);
}

export function inferCompetitorKnowledgeProfile(product: CompetitorLike): CompetitorKnowledgeProfile {
  const sanitizedProduct = sanitizeCompetitorForMatching(product);
  const brand = tidy(sanitizedProduct.brand).toLowerCase();

  if (brand.includes("extron")) return extronProfile(sanitizedProduct);
  if (brand.includes("crestron")) return crestronProfile(sanitizedProduct);
  if (brand.includes("kramer")) return kramerProfile(sanitizedProduct);
  if (brand.includes("lightware")) return lightwareProfile(sanitizedProduct);
  if (brand.includes("atlona")) return atlonaProfile(sanitizedProduct);
  if (brand.includes("barco")) return barcoProfile(sanitizedProduct);

  return genericProfile(sanitizedProduct);
}
