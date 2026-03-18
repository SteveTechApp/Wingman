import type {
  AvailabilityValue,
  CompetitorItem,
  Confidence,
  PartialCompetitorSeed,
  ResolutionValue,
  SpecField,
  TransportValue
} from "./types";

function lower(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function field<T>(value: T | undefined, confidence: Confidence, source?: string): SpecField<T | undefined> {
  return value === undefined
    ? { confidence, source }
    : { value, confidence, source };
}

export function normaliseResolution(value: unknown): SpecField<ResolutionValue | undefined> {
  const v = lower(value);

  if (!v) return field<ResolutionValue>(undefined, "low");
  if (v.includes("8k")) return field<ResolutionValue>("8K", "high", "parsed");
  if (v.includes("4k") && (v.includes("60") || v.includes("@60"))) return field<ResolutionValue>("4K60", "high", "parsed");
  if (v.includes("4k")) return field<ResolutionValue>("4K30", "medium", "parsed");
  if (v.includes("1080")) return field<ResolutionValue>("1080p", "medium", "parsed");

  return field<ResolutionValue>(undefined, "low", "unparsed");
}

export function normaliseTransport(value: unknown): SpecField<TransportValue | undefined> {
  const v = lower(value);

  if (!v) return field<TransportValue>("Unknown", "low");
  if (v.includes("hdbaset")) return field<TransportValue>("HDBaseT", "high", "parsed");
  if (v.includes("avoip") || v.includes("av over ip")) return field<TransportValue>("AVoIP", "high", "parsed");
  if (v.includes("dtp")) return field<TransportValue>("DTP", "high", "parsed");
  if (v.includes("sdvoe")) return field<TransportValue>("SDVoE", "high", "parsed");

  return field<TransportValue>("Unknown", "low", "unparsed");
}

export function normaliseAvailability(value: unknown): SpecField<AvailabilityValue | undefined> {
  const v = lower(value);

  if (!v) return field<AvailabilityValue>("unknown", "low");
  if (v.includes("stock")) return field<AvailabilityValue>("stocked", "medium", "parsed");
  if (v.includes("special")) return field<AvailabilityValue>("special-order", "medium", "parsed");
  if (v.includes("end") || v.includes("eol")) return field<AvailabilityValue>("end-of-life", "high", "parsed");

  return field<AvailabilityValue>("unknown", "low", "unparsed");
}

export function parseStringList(value: unknown): string[] {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  return raw
    .split(/[;,|]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export function mergeSpecField<T>(
  current: SpecField<T | undefined> | undefined,
  incoming: SpecField<T | undefined> | undefined
): SpecField<T | undefined> {
  if (!current && incoming) return incoming;
  if (current && !incoming) return current;
  if (!current && !incoming) return { confidence: "low" };

  const confidenceWeight: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };
  const currentWeight = confidenceWeight[current!.confidence];
  const incomingWeight = confidenceWeight[incoming!.confidence];

  return incomingWeight >= currentWeight ? incoming! : current!;
}

export function createBlankCompetitor(): CompetitorItem {
  return {
    id: "",
    brand: "",
    sku: "",
    name: "",
    category: "",
    family: "",
    lifecycle: "draft",
    notes: "",
    sourceSummary: "",
    lastUpdated: new Date().toISOString(),
    video: {
      maxResolution: field<ResolutionValue>(undefined, "low"),
      bandwidthGbps: field<number>(undefined, "low"),
      hdcp: field<string>(undefined, "low"),
      hdr: field<boolean>(undefined, "low")
    },
    connectivity: {
      inputs: field<string[]>([], "low"),
      outputs: field<string[]>([], "low"),
      transport: field<TransportValue>("Unknown", "low"),
      poe: field<boolean>(undefined, "low")
    },
    distance: {
      maxMeters1080p: field<number>(undefined, "low"),
      maxMeters4k: field<number>(undefined, "low")
    },
    audio: {
      audioFormats: field<string[]>([], "low"),
      analogBreakout: field<boolean>(undefined, "low")
    },
    commercial: {
      estimatedStreetPriceGbp: field<number>(undefined, "low"),
      availability: field<AvailabilityValue>("unknown", "low")
    }
  };
}

export function cloneFromBase(base: CompetitorItem, overrides: PartialCompetitorSeed): CompetitorItem {
  return {
    ...base,
    ...overrides,
    video: {
      ...(base.video ?? {}),
      ...(overrides.video ?? {})
    },
    connectivity: {
      ...(base.connectivity ?? {}),
      ...(overrides.connectivity ?? {})
    },
    distance: {
      ...(base.distance ?? {}),
      ...(overrides.distance ?? {})
    },
    audio: {
      ...(base.audio ?? {}),
      ...(overrides.audio ?? {})
    },
    commercial: {
      ...(base.commercial ?? {}),
      ...(overrides.commercial ?? {})
    }
  };
}

export function normaliseRawRecord(record: Record<string, unknown>): CompetitorItem {
  const blank = createBlankCompetitor();

  const brand = String(record.brand ?? "").trim();
  const sku = String(record.sku ?? "").trim();
  const category = String(record.category ?? "").trim();
  const name = String(record.name ?? record.title ?? sku).trim();

  const hdrRaw = String(record.hdr ?? "").trim().toLowerCase();
  const poeRaw = String(record.poe ?? "").trim().toLowerCase();
  const analogRaw = String(record.analogBreakout ?? "").trim().toLowerCase();

  return {
    ...blank,
    id: `${brand}-${sku}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    brand,
    sku,
    name,
    category,
    family: String(record.family ?? "").trim(),
    lifecycle: "active",
    notes: String(record.notes ?? "").trim(),
    sourceSummary: String(record.sourceSummary ?? record.source ?? "").trim(),
    lastUpdated: new Date().toISOString(),
    video: {
      maxResolution: normaliseResolution(record.maxResolution ?? record.resolution),
      bandwidthGbps: field<number>(parseNumber(record.bandwidthGbps ?? record.bandwidth), record.bandwidthGbps ? "medium" : "low", "import"),
      hdcp: field<string>(String(record.hdcp ?? "").trim() || undefined, record.hdcp ? "medium" : "low", "import"),
      hdr: field<boolean>(hdrRaw ? hdrRaw === "true" : undefined, "low", "import")
    },
    connectivity: {
      inputs: field<string[]>(parseStringList(record.inputs), parseStringList(record.inputs).length ? "medium" : "low", "import"),
      outputs: field<string[]>(parseStringList(record.outputs), parseStringList(record.outputs).length ? "medium" : "low", "import"),
      transport: normaliseTransport(record.transport),
      poe: field<boolean>(poeRaw ? poeRaw === "true" : undefined, record.poe ? "medium" : "low", "import")
    },
    distance: {
      maxMeters1080p: field<number>(parseNumber(record.maxMeters1080p), record.maxMeters1080p ? "medium" : "low", "import"),
      maxMeters4k: field<number>(parseNumber(record.maxMeters4k), record.maxMeters4k ? "medium" : "low", "import")
    },
    audio: {
      audioFormats: field<string[]>(parseStringList(record.audioFormats), parseStringList(record.audioFormats).length ? "low" : "low", "import"),
      analogBreakout: field<boolean>(
        analogRaw ? analogRaw === "true" : undefined,
        "low",
        "import"
      )
    },
    commercial: {
      estimatedStreetPriceGbp: field<number>(parseNumber(record.estimatedStreetPriceGbp ?? record.priceGbp), record.estimatedStreetPriceGbp ? "low" : "low", "import"),
      availability: normaliseAvailability(record.availability)
    }
  };
}