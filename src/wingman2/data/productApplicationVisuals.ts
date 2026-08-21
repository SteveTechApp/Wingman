export type ProductApplicationVisual = {
  url: string;
  title: string;
  description: string;
  alt: string;
  sourceUrl: string;
  kind: "layout" | "wiring" | "application";
};

const OFFICIAL_PRODUCT_APPLICATION_VISUALS: Record<string, ProductApplicationVisual[]> = {
  "NHD-0401-MV": [
    {
      url: "https://www.wyrestorm.com/wp-content/uploads/2022/10/NHD-0401-MV-6-768x503.jpg",
      title: "Picture in picture",
      description: "Keep one source full-size while a second source remains visible in an inset window.",
      alt: "NHD-0401-MV picture-in-picture layout with a main source and smaller inset source",
      sourceUrl: "https://www.wyrestorm.com/product/nhd-0401-mv/",
      kind: "layout",
    },
    {
      url: "https://www.wyrestorm.com/wp-content/uploads/2022/10/NHD-0401-MV-5-768x503.jpg",
      title: "Dual view",
      description: "Place two sources side by side for comparison, monitoring or shared viewing.",
      alt: "NHD-0401-MV dual-view layout showing two sources side by side",
      sourceUrl: "https://www.wyrestorm.com/product/nhd-0401-mv/",
      kind: "layout",
    },
    {
      url: "https://www.wyrestorm.com/wp-content/uploads/2022/10/NHD-0401-MV-7-1-768x503.jpg",
      title: "Master view",
      description: "Give the priority source most of the screen while three supporting sources remain visible.",
      alt: "NHD-0401-MV master-view layout with one large source and three smaller sources",
      sourceUrl: "https://www.wyrestorm.com/product/nhd-0401-mv/",
      kind: "layout",
    },
    {
      url: "https://www.wyrestorm.com/wp-content/uploads/2022/10/NHD-0401-MV-8-768x503.jpg",
      title: "Quad view",
      description: "Show four equally weighted sources together in a balanced two-by-two canvas.",
      alt: "NHD-0401-MV quad-view layout showing four sources in a two-by-two arrangement",
      sourceUrl: "https://www.wyrestorm.com/product/nhd-0401-mv/",
      kind: "layout",
    },
    {
      url: "https://www.wyrestorm.com/wp-content/uploads/2023/06/NHD-0401-MV_WiringDiagram_Standalone-1900x1007.png",
      title: "Standalone signal path",
      description: "Four local HDMI sources feed the processor, which creates one HDMI multiview output for the display.",
      alt: "NHD-0401-MV standalone wiring diagram with four HDMI sources and one composed display output",
      sourceUrl: "https://www.wyrestorm.com/product/nhd-0401-mv/",
      kind: "wiring",
    },
  ],
};

export function productApplicationVisualsForSku(sku: string): ProductApplicationVisual[] {
  return OFFICIAL_PRODUCT_APPLICATION_VISUALS[sku.trim().toUpperCase()] ?? [];
}
