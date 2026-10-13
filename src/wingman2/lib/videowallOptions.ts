export type WallApplication = "lcd-direct" | "lcd-loop" | "led" | "projection";
export type WallLayout = "single" | "split" | "quad" | "nine" | "custom" | "independent";
export type WallRequirements = {
  application: WallApplication;
  columns: number;
  rows: number;
  sources: number;
  windows: number;
  layout: WallLayout;
  sourceLocation: "local" | "distributed";
  sourceResolution: "1080p" | "4k30" | "4k60";
  network: "any" | "none" | "1g" | "10g";
  orientation: "landscape" | "portrait";
};
export type WallEquipment = { sku: string; quantity: number; role: string };
export type WallOption = {
  id: string; title: string; summary: string; equipment: WallEquipment[];
  path: string[]; checks: string[]; blockers: string[]; sources: { label: string; url: string }[];
};
export const WALL_RESEARCH_DATE = "2026-10-13";
export const wallApplications: { value: WallApplication; title: string; description: string }[] = [
  { value: "lcd-direct", title: "LCD · feed per display", description: "A matrix output or AVoIP receiver drives each panel." },
  { value: "lcd-loop", title: "LCD · looped / tiled", description: "One canvas feeds the wall; the displays perform tiling." },
  { value: "led", title: "LED · processor input", description: "Compose an HDMI feed for a NovaStar-type processor." },
  { value: "projection", title: "Large single projection", description: "Switch full-screen, split-screen and multiview layouts." },
];
export const defaultWallRequirements: WallRequirements = {
  application: "lcd-direct", columns: 2, rows: 2, sources: 4, windows: 1,
  layout: "single", sourceLocation: "local", sourceResolution: "4k60", network: "any", orientation: "landscape",
};
const product = (sku: string, quantity: number, role: string): WallEquipment => ({ sku, quantity, role });
const source = (label: string, slug: string) => ({ label, url: `https://www.wyrestorm.com/${slug}` });
export function validateWallRequirements(r: WallRequirements): string[] {
  const errors: string[] = [];
  for (const [label, value, max] of [["Columns", r.columns, 16], ["Rows", r.rows, 16], ["Sources", r.sources, 64], ["Visible windows", r.windows, 16]] as const) {
    if (!Number.isInteger(value) || value < 1 || value > max) errors.push(`${label} must be a whole number from 1 to ${max}.`);
  }
  if (r.layout !== "independent" && r.windows > r.sources) errors.push("Visible windows cannot exceed the available source count.");
  const expected = { single: 1, split: 2, quad: 4, nine: 9 }[r.layout as "single" | "split" | "quad" | "nine"];
  if (expected && r.windows !== expected) errors.push(`This layout needs ${expected} visible windows.`);
  if (r.layout === "independent" && r.application !== "lcd-direct") errors.push("Independent screen sources need a separate feed to each LCD display.");
  return errors;
}

export function assessVideowallOptions(r: WallRequirements): WallOption[] {
  const invalid = validateWallRequirements(r);
  const panels = r.columns * r.rows;
  const direct = r.application === "lcd-direct";
  const composed = !direct;
  const multiview = r.windows > 1 && r.layout !== "independent";
  const destination = r.application === "lcd-loop" ? "One HDMI canvas → validated display loop / distribution → panel tile mode"
    : r.application === "led" ? "HDMI → LED processor → receiving cards / LED cabinets"
    : r.application === "projection" ? "HDMI → one projector" : `${panels} separate HDMI feeds → ${panels} LCD panels`;
  const common = ["Confirm sink EDID, resolution, refresh rate, HDCP, cable distances and audio routing.",
    ...(r.application === "lcd-loop" ? ["Validate the display model's tile mode, loop interface, maximum chain length and bezel setup. One feed cannot independently switch panel sources."] : []),
    ...(r.application === "led" ? ["Confirm the exact LED processor input timing and pixel canvas. The processor retains LED mapping, receiving-card configuration and calibration; a 4K60 source is not proof of 4K60 processor input support."] : []),
    ...(r.application === "projection" ? ["Match projector native resolution, aspect ratio and text legibility. Lens geometry, warping and edge blending are outside this single-projector design."] : []),
  ];
  function option(id: string, title: string, summary: string, equipment: WallEquipment[], path: string[], checks: string[], blockers: string[], sources: WallOption["sources"]): WallOption {
    return { id, title, summary, equipment, path: [...path, destination], checks: [...checks, ...common], blockers: [...invalid, ...blockers], sources };
  }
  function networkBlock(speed: "1g" | "10g") {
    return r.network === "none" || (r.network !== "any" && r.network !== speed)
      ? [`This option requires a dedicated ${speed === "1g" ? "1GbE" : "10GbE"} AV network; change the network requirement to consider it.`] : [];
  }
  const matrix = (sku: string, inputs: number, outputs: number): WallOption => option(
    sku.toLowerCase(), sku, `Local ${inputs}-input / ${outputs}-output scaling matrix with video-wall processing.`,
    [product(sku, 1, "Local switching, scaling and wall processing")], ["Local HDMI sources", sku],
    [sku === "MX-0812-SCL" ? "Multiview uses up to four sources and is mirrored on outputs 1–4. Rotation is specified on outputs 9–12; validate operating mode and output allocation."
      : "Verify the selected video-wall and multiview modes, output allocation and supported array geometry in the current manual.",
    "Matrix scaling, independent output routing and composing multiple sources into one output are distinct functions."],
    [...(r.sources > inputs ? [`${r.sources} sources exceed ${inputs} physical inputs.`] : []),
      ...(direct && panels > outputs ? [`${panels} panels exceed ${outputs} physical outputs.`] : []),
      ...(r.sourceLocation === "distributed" ? ["Remote source transport is not included in this local HDMI option."] : []),
      ...(r.windows > 4 && multiview ? ["This option is limited to four simultaneous sources."] : []),
      ...(r.layout === "custom" ? ["Free-placement window requirements need model-specific validation; use a native multiview option below."] : []),
      ...(direct && multiview ? ["Simultaneous multiview composition and per-panel cropping need a confirmed mode/cascade design. Consider a looped wall or a dedicated composition stage."] : []),
      ...(direct && r.orientation === "portrait" ? ["Confirm rotation support on every used output before selecting this portrait-wall option."] : [])],
    [source(sku, `product/${sku.toLowerCase()}/`)],
  );
  const tx500 = product("NHD-500-TX", r.sources, "One current v2 encoder per source; catalogue family SKU");
  const control = product("NHD-CTL-PRO-V2", 1, "System controller");
  const dedicated = (outputs: 4 | 6) => {
    const sku = outputs === 4 ? "SW-0204-VW" : "SW-0206-VW";
    return option(sku.toLowerCase(), sku, "Dedicated local wall processor for one selected source across the array.",
      [product(sku, 1, "Two alternative HDMI inputs; one cropped output per panel")], ["Selected local HDMI source", sku],
      ["Two selectable inputs do not mean two simultaneous windows or independent sources per panel. Bezel setup and supported array/rotation modes must be confirmed."],
      [...(!direct ? ["This option is for direct LCD panel feeds, not a single composed processor/projector input."] : []),
        ...(panels > outputs ? [`${panels} panels exceed this unit's ${outputs} outputs; cascades require a separate design.`] : []),
        ...(r.sources > 2 ? ["More than two sources need upstream switching."] : []),
        ...(r.layout !== "single" ? ["This option spreads one selected source; it does not provide the requested composition or independent routing."] : []),
        ...(r.sourceLocation !== "local" ? ["Remote-source transport must be designed separately."] : []),
        ...(outputs === 4 && !((r.columns === 2 && r.rows === 2) || (r.columns === 4 && r.rows === 1)) ? ["The verified SW-0204-VW arrays are 2 × 2 or 4 columns × 1 row."] : []),
        ...(r.orientation === "portrait" ? ["Validate this processor's rotation mode with the requested portrait array."] : [])],
      [source(sku, `global/product/${sku.toLowerCase()}/`)]);
  };
  return [
    matrix("MX-0404-SCL", 4, 4),
    matrix("MX-0812-SCL", 8, 12),
    option("nhd500", "NetworkHD 500 · receiver per display", "A 1GbE distribution design for independent panels or a combined wall image.",
      [tx500, product("NHD-500-RX", direct ? panels : 1, "One current v2 receiver per destination; catalogue family SKU"), control],
      ["Source → 500-series encoder", "Managed 1GbE AV network", direct ? `${panels} × 500-series receivers (wall crop or independent routing)` : "500-series receiver"],
      ["Published wall capacity is 16 × 16 with bezel adjustment and rotation. Provide a managed AV switch, PoE budget and multicast/uplink design.", "The standard 500-series receiver does not natively compose a multiview canvas."],
      [...networkBlock("1g"), ...(multiview || r.layout === "custom" ? ["Add an external multiview stage; a standard NHD-500 receiver alone cannot compose these windows."] : [])],
      [source("500-series v2", "product/nhd-500-tx-rx-v2/")]),
    option("nhd150", "NHD-150-RX · low-bandwidth multiview", "A composed output for a tiled LCD loop, LED processor or projector using compatible 120-series sources.",
      [product(r.sourceLocation === "local" ? "NHD-124-TX" : "NHD-120-TX", r.sourceLocation === "local" ? Math.ceil(r.sources / 4) : r.sources, r.sourceLocation === "local" ? "Four local source inputs per encoder" : "One encoder per remote source"), product("NHD-150-RX", 1, "Multiview receiver / compositor"), control],
      ["120-series compatible encoders", "Managed 1GbE AV network", "NHD-150-RX · one composed HDMI output"],
      ["Up to nine 1080p streams or eight higher-resolution streams; the product description specifies 4K30 input streams. Verify the exact output timing and firmware layout support.", "Budget for codec latency: published 1080p modes are approximately 80–250 ms; 4K modes approximately 150–300 ms. Test live-camera use."],
      [...networkBlock("1g"), ...(!composed ? ["This one-output design needs display-owned tiling. It does not supply an independent feed to every LCD."] : []),
      ...(r.sourceResolution === "4k60" ? ["The selected 120-series encoder path does not support 4K60 sources at their requested rate."] : []),
      ...(r.windows > (r.sourceResolution === "1080p" ? 9 : 8) ? ["Visible windows exceed the NHD-150-RX limit for this source resolution."] : [])],
      [source("NHD-150-RX", "global/product/nhd-150-rx/"), source("NHD-124-TX", "global/product/nhd-124-tx/")]),
    option("nhd600", "NetworkHD 600 · SDVoE multiview", "A 10GbE option for source routing and up to 16 windows on one composed output.",
      [product("NHD-600-TRX", r.sources + (direct ? panels : 1), `${r.sources} source units + ${direct ? panels : 1} dedicated receiver units`), control],
      ["600-series source units", "Managed 10GbE AV network", direct ? `${panels} dedicated receive units` : "Dedicated receive unit · composed HDMI"],
      ["The 16-window claim is a maximum, not sixteen guaranteed native-4K windows. Validate stream scaling, window geometry and processing latency against the exact firmware.", "Use dedicated TX and RX roles for this estimate; do not rely on simultaneous encoding while decoding multiview. Confirm supported wall dimensions, synchronisation and rotation for a per-panel build."],
      [...networkBlock("10g"), ...(direct && (multiview || r.layout === "custom") ? ["A synchronised multiview canvas spanning per-panel receivers needs a validated composition/distribution design."] : [])],
      [source("NHD-600-TRX", "product/nhd-600-trx/")]),
    option("hdmi-multiview", "NHD-0401-MV · local HDMI layouts", "Four local HDMI inputs and one composed output; a simple option for switchable presentation layouts.",
      [product("NHD-0401-MV", 1, "Four-input HDMI multiview switcher")], ["Up to four local HDMI sources", "NHD-0401-MV"],
      ["Six preset layouts; validate the chosen split / picture-in-picture preset. This is an HDMI device, not an AVoIP decoder."],
      [...(!composed ? ["One HDMI output cannot directly drive every panel; use display tiling or a separate wall-distribution stage."] : []),
      ...(r.sources > 4 ? ["More than four local sources require upstream switching."] : []),
      ...(r.windows > 4 ? ["At most four simultaneous windows."] : []),
      ...(r.sourceLocation === "distributed" ? ["Remote sources require receivers or other HDMI transport."] : []),
      ...(r.layout === "custom" ? ["Uses preset layouts; arbitrary window placement is not established."] : [])],
      [source("NHD-0401-MV", "product/nhd-0401-mv/")]),
    option("nhd500-multiview", "NetworkHD 500 + HDMI multiview", "Add a four-window composition stage to a 500-series source network.",
      [tx500, product("NHD-500-RX", Math.min(r.sources, 4), "One decoder for each multiview HDMI input"), product("NHD-0401-MV", 1, "Composes decoded HDMI sources"), control],
      ["500-series encoders", "Managed 1GbE AV network", "Up to four 500-series decoders → NHD-0401-MV"],
      ["The multiviewer's Ethernet connection is for control. Its four HDMI inputs need decoded video; do not connect it as a native IP stream receiver."],
      [...networkBlock("1g"), ...(!composed ? ["This option ends in one canvas. Per-panel distribution would require an additional encoder and wall receivers."] : []),
      ...(r.windows > 4 || r.layout === "custom" ? ["This composition stage supports up to four sources in preset layouts."] : [])],
      [source("500-series v2", "product/nhd-500-tx-rx-v2/"), source("NHD-0401-MV", "product/nhd-0401-mv/")]),
    dedicated(4),
    dedicated(6),
  ];
}
