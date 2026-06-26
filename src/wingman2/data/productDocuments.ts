/**
 * Registered training documents, one-pagers, and competitor analyses for WyreStorm products.
 * Files are served from /product-docs/ (mirrored from the WyreStorm Product Info folder).
 * Videos are external YouTube/Vimeo URLs — not bundled.
 */

export type ProductDocumentType =
  | "training-brochure"
  | "one-pager"
  | "competitor-analysis"
  | "sales-training"
  | "installation-guide"
  | "datasheet";

export type ProductDocumentFormat = "pdf" | "pptx" | "xlsx" | "external-video";

export type ProductDocument = {
  title: string;
  type: ProductDocumentType;
  format: ProductDocumentFormat;
  /** Path relative to /product-docs/ or an external URL for videos */
  path: string;
  /** WyreStorm product version/revision if known */
  version?: string;
  /** ISO date string from the filename or document */
  dated?: string;
  /** Free-text note for the sales rep */
  note?: string;
};

export type ProductDocumentSet = {
  sku: string;
  productName: string;
  documents: ProductDocument[];
};

/**
 * Base path for locally-served product documents.
 * Adjust if the app is hosted under a sub-path.
 */
export const PRODUCT_DOCS_BASE = "/product-docs";

export function productDocPath(relativePath: string): string {
  return `${PRODUCT_DOCS_BASE}/${relativePath}`;
}

export const PRODUCT_DOCUMENT_SETS: ProductDocumentSet[] = [
  // ──────────────────────────────────────────────
  // AUDIO
  // ──────────────────────────────────────────────
  {
    sku: "HALO 80",
    productName: "HALO 80 Ceiling Speaker",
    documents: [
      {
        title: "HALO 80 Product Training Brochure",
        type: "training-brochure",
        format: "pdf",
        path: "Audio/Product Training Brochure/HALO 80 Product Training Brochure_V1.0_2025.9.25.pdf",
        version: "V1.0",
        dated: "2025-09-25",
      },
    ],
  },
  {
    sku: "COM-MIC-HUB",
    productName: "COM-MIC-HUB Conferencing Microphone Hub",
    documents: [
      {
        title: "COM-MIC-HUB Product Brochure",
        type: "training-brochure",
        format: "pdf",
        path: "Audio/Product Training Brochure/Product Brochure -COM-MIC-HUB_V1.1_2025.3.31.pdf",
        version: "V1.1",
        dated: "2025-03-31",
      },
    ],
  },

  // ──────────────────────────────────────────────
  // CONTROL SYSTEM
  // ──────────────────────────────────────────────
  {
    sku: "SYN-CTL-HUB",
    productName: "SYN-CTL-HUB Synapse Control Hub",
    documents: [
      {
        title: "SYN-CTL-HUB Product Training Brochure",
        type: "training-brochure",
        format: "pdf",
        path: "Control System/Product Training Brochure/SYN-CTL-HUB Product Training Brochure_V1.0_2025.3.5.pdf",
        version: "V1.0",
        dated: "2025-03-05",
      },
    ],
  },

  // ──────────────────────────────────────────────
  // MATRIX SOLUTION
  // ──────────────────────────────────────────────
  {
    sku: "MX-0812-SCL",
    productName: "MX-0812-SCL 8×12 Seamless HDMI Matrix",
    documents: [
      {
        title: "MX-0812-SCL One Pager",
        type: "one-pager",
        format: "pdf",
        path: "Matrix Solution/One Pager/MX-0812-SCL.pdf",
      },
      {
        title: "MX-0812-SCL Product Brochure",
        type: "training-brochure",
        format: "pdf",
        path: "Matrix Solution/Product Training Brochure/Product Brochure -MX-0812-SCL V1.0_2025.3.13.pdf",
        version: "V1.0",
        dated: "2025-03-13",
      },
    ],
  },
  {
    sku: "MX-1007-HYB",
    productName: "MX-1007-HYB Hybrid Matrix",
    documents: [
      {
        title: "WyreStorm MX-1007-HYB & MX-0804-EDC Competitor Analysis",
        type: "competitor-analysis",
        format: "pptx",
        path: "Matrix Solution/Competitor Analysis/WyreStorm MX-1007-HYB & MX-0804-EDC.pptx",
        note: "Covers both MX-1007-HYB and MX-0804-EDC",
      },
    ],
  },
  {
    sku: "MX-0804-EDC",
    productName: "MX-0804-EDC Education Matrix",
    documents: [
      {
        title: "WyreStorm MX-1007-HYB & MX-0804-EDC Competitor Analysis",
        type: "competitor-analysis",
        format: "pptx",
        path: "Matrix Solution/Competitor Analysis/WyreStorm MX-1007-HYB & MX-0804-EDC.pptx",
        note: "Covers both MX-1007-HYB and MX-0804-EDC",
      },
    ],
  },

  // ──────────────────────────────────────────────
  // NETWORKH D AV OVER IP — 100 SERIES
  // ──────────────────────────────────────────────
  {
    sku: "NHD-128-NDI-TRX",
    productName: "NHD-128-NDI-TRX NetworkHD 100 NDI Transceiver",
    documents: [
      {
        title: "NHD-128-NDI-TRX Product Training Brochure",
        type: "training-brochure",
        format: "pdf",
        path: "NetworkHD AV over IP/NHD 100s/Product Training Brochure/NHD-128-NDI-TRX Product Training Brochure_V1.0_2025.9.9.pdf",
        version: "V1.0",
        dated: "2025-09-09",
      },
    ],
  },

  // ──────────────────────────────────────────────
  // NETWORKH D AV OVER IP — 500 SERIES
  // ──────────────────────────────────────────────
  {
    sku: "NHD-500-TX",
    productName: "NHD-500-TX NetworkHD 500 Encoder",
    documents: [
      {
        title: "NHD-500 Series One Pager",
        type: "one-pager",
        format: "pdf",
        path: "NetworkHD AV over IP/NHD 500s/One Pager/NHD-500.pdf",
        note: "Covers the full NHD-500 series (TX and RX)",
      },
      {
        title: "NHD-510 vs NVX363 Competitor Comparison",
        type: "competitor-analysis",
        format: "xlsx",
        path: "NetworkHD AV over IP/NHD 500s/Competitor Analysis/NHD500 vs NVX363 Comparison (version 1).xlsx",
      },
    ],
  },
  {
    sku: "NHD-500-RX",
    productName: "NHD-500-RX NetworkHD 500 Decoder",
    documents: [
      {
        title: "NHD-500 Series One Pager",
        type: "one-pager",
        format: "pdf",
        path: "NetworkHD AV over IP/NHD 500s/One Pager/NHD-500.pdf",
        note: "Covers the full NHD-500 series (TX and RX)",
      },
    ],
  },
  {
    sku: "NHD-510-TX",
    productName: "NHD-510-TX NetworkHD 510 Encoder",
    documents: [
      {
        title: "WyreStorm NHD-510 Competitor Analysis",
        type: "competitor-analysis",
        format: "pptx",
        path: "NetworkHD AV over IP/NHD 500s/Competitor Analysis/WyreStorm NHD-510.pptx",
      },
      {
        title: "NHD-510 vs NVX363 Competitor Comparison",
        type: "competitor-analysis",
        format: "xlsx",
        path: "NetworkHD AV over IP/NHD 500s/Competitor Analysis/NHD500 vs NVX363 Comparison (version 1).xlsx",
      },
    ],
  },

  // ──────────────────────────────────────────────
  // NETWORKH D AV OVER IP — 600 SERIES
  // ──────────────────────────────────────────────
  {
    sku: "NHD-600-E-TX",
    productName: "NHD-600-E-TX NetworkHD 600 E-series Encoder",
    documents: [
      {
        title: "NHD-600-E Product Training Brochure",
        type: "training-brochure",
        format: "pdf",
        path: "NetworkHD AV over IP/NHD 600s/Product Training Brochure/NHD-600-E Product Training Brochure_V1.0_2026.4.pdf",
        version: "V1.0",
        dated: "2026-04-01",
        note: "Brochure covers NHD-600-E-TX and NHD-600-E-RX",
      },
    ],
  },
  {
    sku: "NHD-600-E-RX",
    productName: "NHD-600-E-RX NetworkHD 600 E-series Decoder",
    documents: [
      {
        title: "NHD-600-E Product Training Brochure",
        type: "training-brochure",
        format: "pdf",
        path: "NetworkHD AV over IP/NHD 600s/Product Training Brochure/NHD-600-E Product Training Brochure_V1.0_2026.4.pdf",
        version: "V1.0",
        dated: "2026-04-01",
        note: "Brochure covers NHD-600-E-TX and NHD-600-E-RX",
      },
    ],
  },
  {
    sku: "NHD-600-TRX",
    productName: "NHD-600-TRX NetworkHD 600 Transceiver",
    documents: [
      {
        title: "NHD-600-E Product Training Brochure",
        type: "training-brochure",
        format: "pdf",
        path: "NetworkHD AV over IP/NHD 600s/Product Training Brochure/NHD-600-E Product Training Brochure_V1.0_2026.4.pdf",
        version: "V1.0",
        dated: "2026-04-01",
        note: "Brochure covers NHD-600-E / NHD-600 series",
      },
    ],
  },
  {
    sku: "NHD-610-TX-V2",
    productName: "NHD-610-TX-V2 NetworkHD 600 Encoder",
    documents: [
      {
        title: "NHD-600-E Product Training Brochure",
        type: "training-brochure",
        format: "pdf",
        path: "NetworkHD AV over IP/NHD 600s/Product Training Brochure/NHD-600-E Product Training Brochure_V1.0_2026.4.pdf",
        version: "V1.0",
        dated: "2026-04-01",
        note: "Brochure covers NHD-600-E / NHD-600 series",
      },
    ],
  },
  {
    sku: "NHD-610-RX",
    productName: "NHD-610-RX NetworkHD 600 Decoder",
    documents: [
      {
        title: "NHD-600-E Product Training Brochure",
        type: "training-brochure",
        format: "pdf",
        path: "NetworkHD AV over IP/NHD 600s/Product Training Brochure/NHD-600-E Product Training Brochure_V1.0_2026.4.pdf",
        version: "V1.0",
        dated: "2026-04-01",
        note: "Brochure covers NHD-600-E / NHD-600 series",
      },
    ],
  },

  // ──────────────────────────────────────────────
  // NETWORKH D AV OVER IP — AVoIP COMPETITOR ANALYSIS
  // ──────────────────────────────────────────────
  {
    sku: "NHD-500-TX",
    productName: "NHD-500 / NHD-600 AVoIP Range",
    documents: [
      {
        title: "WyreStorm AVoIP HDMI 2.0 Specs Comparison",
        type: "competitor-analysis",
        format: "xlsx",
        path: "NetworkHD AV over IP/Competitor Analysis/Wyrestorm AVoIP HDMI2.0 specs Comparison v4.0_250625.xlsx",
        version: "v4.0",
        dated: "2025-06-25",
        note: "Cross-range AVoIP competitor comparison (NHD-100/500/600 vs competitors)",
      },
    ],
  },

  // ──────────────────────────────────────────────
  // PRESENTATION AND CONFERENCING
  // ──────────────────────────────────────────────
  {
    sku: "CAM-420-PTZ",
    productName: "CAM-420-PTZ PTZ Camera",
    documents: [
      {
        title: "CAM-420-PTZ One Pager",
        type: "one-pager",
        format: "pdf",
        path: "Presentation and Conferencing/One Pager/CAM-420-PTZ.pdf",
      },
      {
        title: "CAM-420-PTZ Product Training Brochure",
        type: "training-brochure",
        format: "pdf",
        path: "Presentation and Conferencing/Product Training Brochure/CAM-420-PTZ Product Traning Brochure_V1.0_2025.12.pdf",
        version: "V1.0",
        dated: "2025-12-01",
      },
    ],
  },
  {
    sku: "CAM-0402-BRG",
    productName: "CAM-0402-BRG USB Camera Bridge",
    documents: [
      {
        title: "CAM-0402-NDI-BRG & CAM-0402-BRG One Pager",
        type: "one-pager",
        format: "pdf",
        path: "Presentation and Conferencing/One Pager/CAM-0402-NDI-BRG & CAM-0402-BRG.pdf",
        note: "Covers both CAM-0402-BRG and CAM-0402-NDI-BRG",
      },
      {
        title: "CAM-0402-BRG Product Training Brochure",
        type: "training-brochure",
        format: "pdf",
        path: "Presentation and Conferencing/Product Training Brochure/CAM-0402-BRG Product Training Brochure_V1.0_2025.8.8.pdf",
        version: "V1.0",
        dated: "2025-08-08",
      },
    ],
  },
  {
    sku: "CAM-0402-NDI-BRG",
    productName: "CAM-0402-NDI-BRG NDI Camera Bridge",
    documents: [
      {
        title: "CAM-0402-NDI-BRG & CAM-0402-BRG One Pager",
        type: "one-pager",
        format: "pdf",
        path: "Presentation and Conferencing/One Pager/CAM-0402-NDI-BRG & CAM-0402-BRG.pdf",
        note: "Covers both CAM-0402-BRG and CAM-0402-NDI-BRG",
      },
    ],
  },
  {
    sku: "MX-0403-H3-MST",
    productName: "MX-0403-H3-MST Conference Presentation Switcher",
    documents: [
      {
        title: "MX-0403-H3-MST Product Training Brochure",
        type: "training-brochure",
        format: "pdf",
        path: "Presentation and Conferencing/Product Training Brochure/MX-0403-H3-MST Product Training Brochure_V1.0_2025.10.28.pdf",
        version: "V1.0",
        dated: "2025-10-28",
      },
    ],
  },
  {
    sku: "SW-620-TX-W",
    productName: "SW-620-TX-W Wireless Presentation System",
    documents: [
      {
        title: "SW-620-TX-W Product Training Brochure",
        type: "training-brochure",
        format: "pdf",
        path: "Presentation and Conferencing/Product Training Brochure/SW-620-TX-W Product Training Brochure V1.0_2025.12.pdf",
        version: "V1.0",
        dated: "2025-12-01",
      },
    ],
  },
  {
    sku: "SW-640L-TX-W",
    productName: "SW-640L-TX-W Wireless Presentation & Conferencing System",
    documents: [
      {
        title: "SW-640L-TX-W with APO-DG2 One Pager",
        type: "one-pager",
        format: "pdf",
        path: "Presentation and Conferencing/One Pager/SW-640L-TX-W with DG2.pdf",
      },
      {
        title: "SW-640L-TX-W Product Training Brochure",
        type: "training-brochure",
        format: "pdf",
        path: "Presentation and Conferencing/Product Training Brochure/SW-640L-TX-W Product Training Brochure V1.0_2024.11.25.pdf",
        version: "V1.0",
        dated: "2024-11-25",
      },
      {
        title: "SW-640L-TX-W vs APO-DG2 Competitor Comparison",
        type: "competitor-analysis",
        format: "pdf",
        path: "Presentation and Conferencing/Competitor Analysis/SW-640L-TX-W & APO-DG2 Competition Comparison Chart.pdf",
      },
      {
        title: "SW-640L-TX-W Marketing FAQ",
        type: "competitor-analysis",
        format: "pdf",
        path: "Presentation and Conferencing/Competitor Analysis/SW-640L-TX-W Marketing FAQ 20240403.pdf",
        dated: "2024-04-03",
        note: "FAQ comparing SW-640L-TX-W to competitors",
      },
    ],
  },

  // ──────────────────────────────────────────────
  // UNIFIED COMMUNICATION
  // ──────────────────────────────────────────────
  {
    sku: "APO-VX20-UC-V2",
    productName: "APO-VX20-UC v2 Apollo Unified Communications Bar",
    documents: [
      {
        title: "APO-VX20-UC v2 Product Training Brochure",
        type: "training-brochure",
        format: "pdf",
        path: "Unified Communication/Product Training Brochure/APO-VX20-UC v2 Product Training Brochure_V1.0_2026.4.pdf",
        version: "V1.0",
        dated: "2026-04-01",
      },
      {
        title: "APO-VX20 & APO-DG2 Competitor Comparison",
        type: "competitor-analysis",
        format: "pdf",
        path: "Unified Communication/Competitor Analysis/APO-VX20 & APO-DG2 Competition Comparison Chart.pdf",
      },
    ],
  },

  // ──────────────────────────────────────────────
  // USB EXTENDER
  // ──────────────────────────────────────────────
  {
    sku: "NHD-USB-TRX",
    productName: "NHD-USB-TRX NetworkHD USB Transceiver",
    documents: [
      {
        title: "NHD-USB-TRX Product Training Brochure",
        type: "training-brochure",
        format: "pdf",
        path: "USB Extender/Product Training Brochure/NHD-USB-TRX Product Training Brochure V1.0 2024.12.13.pdf",
        version: "V1.0",
        dated: "2024-12-13",
      },
    ],
  },

  // ──────────────────────────────────────────────
  // VIDEO PROCESSOR
  // ──────────────────────────────────────────────
  {
    sku: "SW-0206-VW",
    productName: "SW-0206-VW Video Wall Processor",
    documents: [
      {
        title: "SW-0206-VW Product Brochure",
        type: "training-brochure",
        format: "pdf",
        path: "Video Processor/Product Training Brochure/Product Brochure--SW-0206-VW_V1.1_2025.3.31.pdf",
        version: "V1.1",
        dated: "2025-03-31",
      },
    ],
  },
];

/** Build a lookup map: normalised SKU → document set */
export const PRODUCT_DOCUMENT_LOOKUP: Record<string, ProductDocumentSet> =
  PRODUCT_DOCUMENT_SETS.reduce<Record<string, ProductDocumentSet>>((acc, entry) => {
    const key = entry.sku.trim().toUpperCase().replace(/\s+/g, "");
    // Merge if same SKU appears more than once (e.g. NHD-500-TX has two entries above)
    if (acc[key]) {
      acc[key].documents = [...acc[key].documents, ...entry.documents];
    } else {
      acc[key] = entry;
    }
    return acc;
  }, {});

export function getProductDocuments(sku: string): ProductDocument[] {
  const key = sku.trim().toUpperCase().replace(/\s+/g, "");
  return PRODUCT_DOCUMENT_LOOKUP[key]?.documents ?? [];
}

export function hasProductDocuments(sku: string): boolean {
  return getProductDocuments(sku).length > 0;
}
