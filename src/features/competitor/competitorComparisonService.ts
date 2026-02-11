
import { supabase } from "@/lib/supabase";

export type Category = "AVOIP" | "HDBT_EXTENDER" | "PRESENTATION_SWITCHER";

export type ProductRow = {
  id: string;
  brand: string;
  sku: string;
  category: Category;
  role: string;
  status: string;
  short_desc: string | null;
};

export type SpecsRow = {
  product_id: string;
  max_video: "1080P60" | "4K30" | "4K60_420" | "4K60_444" | null;
  hdr: boolean;
  hdcp: "1_4" | "2_2" | "2_3" | null;
  scaler: boolean;

  hdmi_in: number;
  hdmi_out: number;
  usb_c: number;
  dp_in: number;
  usb_host: number;
  usb_device_ports: number;
  analog_audio_in: number;
  analog_audio_out: number;
  digital_audio_out: "NONE" | "SPDIF" | "ARC" | "DANTE" | "AES67";
  lan: number;

  rs232: boolean;
  ir: boolean;
  cec: boolean;

  transport: "HDBASET" | "AVOIP" | "LOCALONLY" | null;
  max_distance_m: number | null;
  avoip_bw: "1G" | "10G" | null;
  multicast_required: boolean;

  power_mode: string[];
  poe_class: "AF" | "AT" | "BT" | "PROPRIETARY" | "NA";
  external_psu_required: boolean;
  external_psu_included: boolean;

  rack_mount: boolean;
  wallplate: boolean;
  known_weak_points: string[];
  warranty_years: number | null;
  support: "DIRECT" | "DISTRO_FIRST" | "INTEGRATOR_ONLY";
};

export type ProductWithSpecs = ProductRow & { product_specs: SpecsRow | null };

export type MatchResult = {
  wyrestormSku: string;
  score: number;
  why: string[];
  differences: string[];
  flags: string[];
  verify: string[];
};

function classifyCategoryFromText(q: string): Category {
  const t = q.toLowerCase();
  if (t.includes("hdbaset") || t.includes("extender") || t.includes("70m") || t.includes("100m")) return "HDBT_EXTENDER";
  if (t.includes("presentation") || t.includes("switcher") || t.includes("wireless") || t.includes("usb-c") || t.includes("usbc")) return "PRESENTATION_SWITCHER";
  // default
  return "AVOIP";
}

function safeNum(n: number | null | undefined) { return typeof n === "number" ? n : 0; }

function scorePorts(comp: SpecsRow | null, wr: SpecsRow | null): { score: number; why: string[]; diffs: string[]; verify: string[] } {
  const why: string[] = [];
  const diffs: string[] = [];
  const verify: string[] = [];

  if (!wr) return { score: 0, why, diffs: ["Missing WyreStorm specs (needs entry)"], verify };
  if (!comp) {
    verify.push("Competitor specs unknown: scoring based on limited info");
    return { score: 0.6, why: ["WyreStorm candidate selected (competitor specs not loaded)"], diffs: [], verify };
  }

  // simple port match: compare a small set
  const fields: Array<[keyof SpecsRow, string, number]> = [
    ["hdmi_in", "HDMI In", 1],
    ["hdmi_out", "HDMI Out", 1],
    ["usb_c", "USB-C", 1],
    ["usb_host", "USB Host", 1],
    ["usb_device_ports", "USB Device Ports", 1],
    ["lan", "LAN", 1],
    ["analog_audio_in", "Analog Audio In", 0.5],
    ["analog_audio_out", "Analog Audio Out", 0.5],
  ];

  let totalW = 0;
  let gotW = 0;

  for (const [k, label, w] of fields) {
    totalW += w;
    const c = safeNum(comp[k] as any);
    const r = safeNum(wr[k] as any);

    if ((comp[k] as any) === null || (comp[k] as any) === undefined) {
      verify.push(`${label} unknown on competitor`);
      continue;
    }

    if (c === r) {
      gotW += w;
      why.push(`${label} matches (${r})`);
    } else if (r > c) {
      gotW += w;
      why.push(`${label}: WyreStorm provides more (${r} vs ${c})`);
    } else {
      // r < c
      const ratio = c === 0 ? 0 : Math.max(0, r / c);
      gotW += w * ratio;
      diffs.push(`${label}: WyreStorm has fewer (${r} vs ${c})`);
    }
  }

  const score = totalW === 0 ? 0 : gotW / totalW;
  return { score, why, diffs, verify };
}

function scoreVideo(comp: SpecsRow | null, wr: SpecsRow | null): { score: number; why: string[]; diffs: string[]; verify: string[] } {
  const why: string[] = [];
  const diffs: string[] = [];
  const verify: string[] = [];

  if (!wr) return { score: 0, why, diffs: ["Missing WyreStorm specs (needs entry)"], verify };
  if (!comp) return { score: 0.6, why: ["Competitor video specs unknown"], diffs: [], verify };

  const order = ["1080P60","4K30","4K60_420","4K60_444"] as const;
  const idx = (v: any) => v ? order.indexOf(v) : -1;

  if (!comp.max_video) verify.push("Competitor max video unknown");
  if (!wr.max_video) diffs.push("WyreStorm max video not set");

  const cV = idx(comp.max_video);
  const rV = idx(wr.max_video);

  let s = 0.5;

  if (cV >= 0 && rV >= 0) {
    if (rV === cV) { s = 1; why.push(`Max video matches (${wr.max_video})`); }
    else if (rV > cV) { s = 1; why.push(`Max video advantage (${wr.max_video} vs ${comp.max_video})`); }
    else { s = Math.max(0, rV / (cV || 1)); diffs.push(`Max video lower (${wr.max_video} vs ${comp.max_video})`); }
  }

  // HDCP
  if (comp.hdcp && wr.hdcp) {
    const hdcpOrder = ["1_4","2_2","2_3"] as const;
    const c = hdcpOrder.indexOf(comp.hdcp);
    const r = hdcpOrder.indexOf(wr.hdcp);
    if (r >= c) why.push(`HDCP OK (${wr.hdcp})`);
    else diffs.push(`HDCP lower (${wr.hdcp} vs ${comp.hdcp})`);
  } else {
    verify.push("HDCP comparison incomplete");
  }

  // HDR
  if (comp.hdr && !wr.hdr) diffs.push("HDR missing on WyreStorm");
  if (!comp.hdr && wr.hdr) why.push("HDR supported (advantage)");

  return { score: s, why, diffs, verify };
}

function scorePower(comp: SpecsRow | null, wr: SpecsRow | null): { score: number; flags: string[]; verify: string[] } {
  const flags: string[] = [];
  const verify: string[] = [];

  if (!wr) return { score: 0, flags: ["Missing WyreStorm specs (needs entry)"], verify };
  if (!comp) { verify.push("Competitor power specs unknown"); return { score: 0.6, flags, verify }; }

  let s = 0.7;

  if (comp.external_psu_required && !wr.external_psu_required) {
    flags.push("Reduced failure risk: no external PSU required");
    s = 1;
  }
  if (comp.poe_class === "BT" && (wr.poe_class === "AT" || wr.poe_class === "AF")) {
    flags.push("Lower PoE switch cost: competitor needs higher PoE class");
    s = Math.max(s, 0.95);
  }

  return { score: s, flags, verify };
}

function weights(category: Category) {
  if (category === "AVOIP") return { ports: 35, video: 20, power: 10, other: 35 };
  if (category === "HDBT_EXTENDER") return { ports: 40, video: 20, power: 10, other: 30 };
  return { ports: 40, video: 20, power: 10, other: 30 };
}

export async function findWyreStormMatches(query: string): Promise<{ category: Category; matches: MatchResult[] }> {
  const q = query.trim();
  const category = classifyCategoryFromText(q);

  // Attempt SKU lookup (any brand) first
  const skuLookup = await supabase
    .from("products")
    .select("id, brand, sku, category, role, status, short_desc, product_specs:product_specs(*)")
    .eq("sku", q)
    .maybeSingle();

  const comp = (skuLookup.data?.product_specs as unknown as SpecsRow | null) ?? null;
  const resolvedCategory: Category = (skuLookup.data?.category as Category) ?? category;

  // Load WyreStorm candidates (same category)
  const wrRes = await supabase
    .from("products")
    .select("id, brand, sku, category, role, status, short_desc, product_specs:product_specs(*)")
    .eq("brand", "WyreStorm")
    .eq("category", resolvedCategory);

  const wrItems = (wrRes.data ?? []) as unknown as ProductWithSpecs[];

  const w = weights(resolvedCategory);

  const scored: MatchResult[] = wrItems.map((p) => {
    const wr = (p.product_specs as unknown as SpecsRow | null) ?? null;

    const ports = scorePorts(comp, wr);
    const video = scoreVideo(comp, wr);
    const power = scorePower(comp, wr);

    // "other" is reserved for later: network/distance/control/support
    const total =
      ports.score * w.ports +
      video.score * w.video +
      power.score * w.power +
      0.6 * w.other;

    const flags = [...power.flags];
    const why = [...ports.why, ...video.why].slice(0, 6);
    const differences = [...ports.diffs, ...video.diffs].slice(0, 6);
    const verify = [...ports.verify, ...video.verify, ...power.verify].slice(0, 6);

    // network complexity hint
    if (comp?.multicast_required) flags.push("Competitor may require multicast (managed switching + config)");

    return {
      wyrestormSku: p.sku,
      score: Math.max(0, Math.min(100, Math.round(total))),
      why,
      differences,
      flags,
      verify,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return { category: resolvedCategory, matches: scored.slice(0, 3) };
}


