import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type Product = {
  id: string;
  sku: string;
  name: string;
  commercialFamily?: string;
  routingClass?: string;
  functionalRole?: string;
  category?: string;
  summary?: string;
  featureTags?: string[];
  applicationTags?: string[];
  tags?: string[];
};

type RankedProduct = {
  product: Product;
  score: number;
  reasons: string[];
  series: string;
  family: string;
};

type ProjectRequirements = {
  application: string;
  roomType: string;
  sourceCount: number;
  displayCount: number;
  usbRequired: boolean;
  audioRequired: boolean;
  controlRequired: boolean;
};

type ProjectHandoffItem = {
  id: string;
  sku: string;
  name: string;
  family: string;
  series: string;
  category: string;
  score: number;
  reasons: string[];
  summary: string;
  addedAt: string;
  source: "catalogue_v2";
};

type EndpointChoice = {
  encoderSku: string;
  decoderSku: string;
  transceiverSku: string;
  specialistSku: string;
  encoderQty: number;
  decoderQty: number;
  transceiverQty: number;
  specialistQty: number;
};

type ProjectHandoffPayload = {
  requirements: ProjectRequirements;
  items: ProjectHandoffItem[];
  endpointChoice: EndpointChoice;
  updatedAt: string;
};

const pageStyle: CSSProperties = {
  display: "grid",
  gridTemplateRows: "auto auto auto auto auto 1fr",
  gap: 10,
  height: "100%",
  overflow: "hidden",
};

const panelStyle: CSSProperties = {
  border: "1px solid rgba(148,163,184,0.15)",
  borderRadius: 12,
  padding: 10,
  background: "rgba(15,23,42,0.6)",
};

const rowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const buttonStyle: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#1f2937",
  color: "white",
  cursor: "pointer",
  fontSize: 12,
};

const activeButton: CSSProperties = {
  ...buttonStyle,
  background: "#f97316",
};

const primaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "rgba(249,115,22,0.18)",
  border: "1px solid rgba(249,115,22,0.32)",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(2,6,23,0.75)",
  color: "white",
  fontSize: 13,
};

const selectStyle: CSSProperties = {
  ...inputStyle,
};

const cardStyle: CSSProperties = {
  padding: 10,
  borderRadius: 10,
  background: "rgba(2,6,23,0.42)",
  border: "1px solid rgba(148,163,184,0.12)",
  display: "grid",
  gap: 8,
};

const pillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 8px",
  borderRadius: 999,
  fontSize: 11,
  background: "rgba(30,41,59,0.72)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const scorePillStyle: CSSProperties = {
  ...pillStyle,
  background: "rgba(249,115,22,0.16)",
  border: "1px solid rgba(249,115,22,0.28)",
};

const statusStyle: CSSProperties = {
  ...panelStyle,
  padding: "8px 10px",
  fontSize: 12,
  lineHeight: 1.45,
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function inferFamily(product: Product): string {
  const sku = normalizeText(product.sku).toUpperCase();
  const familyText = normalizeText(product.commercialFamily).toLowerCase();
  const nameText = normalizeText(product.name).toLowerCase();
  const categoryText = normalizeText(product.category).toLowerCase();

  if (sku.startsWith("NHD-")) return "NHD";
  if (familyText.includes("presentation") || nameText.includes("presentation")) return "Presentation";
  if (familyText.includes("matrix") || categoryText.includes("matrix")) return "Matrix";
  if (familyText.includes("apollo") || nameText.includes("apollo") || categoryText.includes("uc")) return "Apollo";
  if (familyText.includes("video wall") || categoryText.includes("video wall") || sku.includes("-VW")) return "Video Wall";
  if (familyText) return normalizeText(product.commercialFamily);
  return "Other";
}

function inferSeries(product: Product): string {
  const sku = normalizeText(product.sku).toUpperCase();

  if (
    sku.startsWith("NHD-100") ||
    sku.startsWith("NHD-110") ||
    sku.startsWith("NHD-120") ||
    sku.startsWith("NHD-128") ||
    sku.startsWith("NHD-140") ||
    sku.startsWith("NHD-150")
  ) {
    return "NHD-100 Series";
  }

  if (sku.startsWith("NHD-500")) {
    return "NHD-500 Series";
  }

  if (sku.startsWith("NHD-600")) {
    return "NHD-600 Series";
  }

  return inferFamily(product);
}

function inferEndpointRole(product: Product): "encoder" | "decoder" | "transceiver" | "specialist" | "other" {
  const sku = normalizeText(product.sku).toUpperCase();
  const name = normalizeText(product.name).toLowerCase();
  const category = normalizeText(product.category).toLowerCase();
  const summary = normalizeText(product.summary).toLowerCase();

  const text = [sku, name, category, summary].join(" ").toLowerCase();

  if (text.includes("transceiver") || sku.includes("-TRX")) return "transceiver";
  if (text.includes("decoder") || sku.includes("-RX")) return "decoder";
  if (text.includes("encoder") || sku.includes("-TX")) return "encoder";

  if (
    text.includes("bridge") ||
    text.includes("ndi") ||
    text.includes("controller") ||
    text.includes("multiview") ||
    text.includes("video wall")
  ) {
    return "specialist";
  }

  return "other";
}

function getAllTags(product: Product): string[] {
  return [
    ...asStringArray(product.featureTags),
    ...asStringArray(product.applicationTags),
    ...asStringArray(product.tags),
  ];
}

function scoreProduct(product: Product, family: string, series: string, application: string, query: string): RankedProduct {
  let score = 0;
  const reasons: string[] = [];

  const sku = normalizeText(product.sku);
  const name = normalizeText(product.name);
  const summary = normalizeText(product.summary);
  const routingClass = normalizeText(product.routingClass);
  const functionalRole = normalizeText(product.functionalRole);
  const productFamily = inferFamily(product);
  const productSeries = inferSeries(product);
  const tags = getAllTags(product).map((tag) => tag.toLowerCase());

  const q = query.trim().toLowerCase();
  const app = application.trim().toLowerCase();

  if (family && productFamily === family) {
    score += 40;
    reasons.push(`Matches family: ${family}`);
  }

  if (series && productSeries === series) {
    score += 55;
    reasons.push(`Matches series: ${series}`);
  }

  if (app) {
    const appMatched =
      tags.some((tag) => tag.includes(app)) ||
      summary.toLowerCase().includes(app) ||
      name.toLowerCase().includes(app);

    if (appMatched) {
      score += 24;
      reasons.push(`Fits application: ${application}`);
    }
  }

  if (q) {
    if (sku.toLowerCase() === q) {
      score += 150;
      reasons.push("Exact SKU match");
    } else if (sku.toLowerCase().includes(q)) {
      score += 70;
      reasons.push("SKU match");
    }

    if (name.toLowerCase().includes(q)) {
      score += 35;
      reasons.push("Name match");
    }

    if (summary.toLowerCase().includes(q)) {
      score += 12;
      reasons.push("Summary match");
    }

    if (routingClass.toLowerCase().includes(q) || functionalRole.toLowerCase().includes(q)) {
      score += 16;
      reasons.push("Role / routing match");
    }

    if (tags.some((tag) => tag.includes(q))) {
      score += 20;
      reasons.push("Feature / application tag match");
    }
  }

  if (productSeries === "NHD-100 Series") {
    if (q.includes("ndi") || q.includes("camera") || q.includes("ptz") || q.includes("bridge") || app.includes("ndi")) {
      score += 34;
      reasons.push("Best fit for NDI / camera / bridge workflows");
    }

    if (q.includes("low bandwidth") || q.includes("ir") || q.includes("value")) {
      score += 18;
      reasons.push("Aligned to value / low-bandwidth / IR requirement");
    }
  }

  if (productSeries === "NHD-500 Series") {
    if (q.includes("hdmi 2.0") || q.includes("usb") || q.includes("dante") || q.includes("economy")) {
      score += 34;
      reasons.push("Best fit for mainstream 4K / USB / Dante workflows");
    }
  }

  if (productSeries === "NHD-600 Series") {
    if (q.includes("10g") || q.includes("no compromise") || q.includes("highest quality") || q.includes("multiview") || q.includes("premium")) {
      score += 40;
      reasons.push("Best fit for premium 10Gb / no-compromise workflows");
    }
  }

  if (reasons.length === 0) {
    reasons.push("General catalogue relevance");
  }

  return {
    product,
    score,
    reasons: reasons.slice(0, 3),
    series: productSeries,
    family: productFamily,
  };
}

function getActiveProjectId(): string {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get("projectId") || localStorage.getItem("wm:activeProjectId") || "global";
  } catch {
    return "global";
  }
}

function getProjectStorageKey(projectId: string): string {
  return `wm:catalog-handoff:project:${projectId}`;
}

function defaultRequirements(): ProjectRequirements {
  return {
    application: "",
    roomType: "Meeting room",
    sourceCount: 2,
    displayCount: 1,
    usbRequired: false,
    audioRequired: false,
    controlRequired: false,
  };
}

function defaultEndpointChoice(): EndpointChoice {
  return {
    encoderSku: "",
    decoderSku: "",
    transceiverSku: "",
    specialistSku: "",
    encoderQty: 2,
    decoderQty: 1,
    transceiverQty: 0,
    specialistQty: 0,
  };
}

function readProjectPayload(projectId: string): ProjectHandoffPayload {
  try {
    const raw = localStorage.getItem(getProjectStorageKey(projectId));
    if (!raw) {
      return {
        requirements: defaultRequirements(),
        items: [],
        endpointChoice: defaultEndpointChoice(),
        updatedAt: new Date().toISOString(),
      };
    }

    const parsed = JSON.parse(raw);
    return {
      requirements: parsed?.requirements ?? defaultRequirements(),
      items: Array.isArray(parsed?.items) ? parsed.items : [],
      endpointChoice: parsed?.endpointChoice ?? defaultEndpointChoice(),
      updatedAt: parsed?.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return {
      requirements: defaultRequirements(),
      items: [],
      endpointChoice: defaultEndpointChoice(),
      updatedAt: new Date().toISOString(),
    };
  }
}

function writeProjectPayload(projectId: string, payload: ProjectHandoffPayload): void {
  localStorage.setItem(getProjectStorageKey(projectId), JSON.stringify(payload));
}

function toHandoffItem(entry: RankedProduct): ProjectHandoffItem {
  return {
    id: normalizeText(entry.product.id) || normalizeText(entry.product.sku),
    sku: normalizeText(entry.product.sku),
    name: normalizeText(entry.product.name),
    family: entry.family,
    series: entry.series,
    category: normalizeText(entry.product.category) || "Product",
    score: entry.score,
    reasons: entry.reasons,
    summary: normalizeText(entry.product.summary),
    addedAt: new Date().toISOString(),
    source: "catalogue_v2",
  };
}

function upsertProjectItem(
  projectId: string,
  item: ProjectHandoffItem,
  requirements: ProjectRequirements,
  endpointChoice: EndpointChoice,
): ProjectHandoffPayload {
  const current = readProjectPayload(projectId);
  const items = [item, ...current.items.filter((existing) => existing.id !== item.id)];
  const next = {
    requirements,
    items,
    endpointChoice,
    updatedAt: new Date().toISOString(),
  };
  writeProjectPayload(projectId, next);
  return next;
}

export default function CataloguePageV2() {
  const [products, setProducts] = useState<Product[]>([]);
  const [family, setFamily] = useState("");
  const [series, setSeries] = useState("");
  const [application, setApplication] = useState("");
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<RankedProduct | null>(null);
  const [actionMessage, setActionMessage] = useState("");

  const [roomType, setRoomType] = useState("Meeting room");
  const [sourceCount, setSourceCount] = useState(2);
  const [displayCount, setDisplayCount] = useState(1);
  const [usbRequired, setUsbRequired] = useState(false);
  const [audioRequired, setAudioRequired] = useState(false);
  const [controlRequired, setControlRequired] = useState(false);

  const [encoderSku, setEncoderSku] = useState("");
  const [decoderSku, setDecoderSku] = useState("");
  const [transceiverSku, setTransceiverSku] = useState("");
  const [specialistSku, setSpecialistSku] = useState("");
  const [specialistQty, setSpecialistQty] = useState(0);

  useEffect(() => {
    fetch("/api/product-intelligence")
      .then((r) => r.json())
      .then((data) => {
        const src = Array.isArray(data?.records) ? data.records : [];
        setProducts(src);
      })
      .catch(() => {
        setProducts([]);
      });
  }, []);

  const ranked = useMemo(() => {
    return products
      .map((product) => scoreProduct(product, family, series, application, query))
      .filter((entry) => {
        if (!family && !series && !application && !query.trim()) return true;
        return entry.score > 0;
      })
      .sort((a, b) => b.score - a.score || normalizeText(a.product.sku).localeCompare(normalizeText(b.product.sku)));
  }, [products, family, series, application, query]);

  useEffect(() => {
    if (!selectedProduct && ranked.length > 0) {
      setSelectedProduct(ranked[0]);
      return;
    }

    if (selectedProduct) {
      const refreshed = ranked.find((item) => item.product.id === selectedProduct.product.id);
      if (refreshed) {
        setSelectedProduct(refreshed);
      } else if (ranked.length > 0) {
        setSelectedProduct(ranked[0]);
      } else {
        setSelectedProduct(null);
      }
    }
  }, [ranked, selectedProduct]);

  const nhdCandidates = useMemo(() => {
    return products
      .filter((product) => inferFamily(product) === "NHD")
      .filter((product) => !series || inferSeries(product) === series)
      .sort((a, b) => normalizeText(a.sku).localeCompare(normalizeText(b.sku)));
  }, [products, series]);

  const encoderOptions = useMemo(() => nhdCandidates.filter((product) => inferEndpointRole(product) === "encoder"), [nhdCandidates]);
  const decoderOptions = useMemo(() => nhdCandidates.filter((product) => inferEndpointRole(product) === "decoder"), [nhdCandidates]);
  const transceiverOptions = useMemo(() => nhdCandidates.filter((product) => inferEndpointRole(product) === "transceiver"), [nhdCandidates]);
  const specialistOptions = useMemo(() => nhdCandidates.filter((product) => inferEndpointRole(product) === "specialist"), [nhdCandidates]);

  useEffect(() => {
    if (family !== "NHD") {
      setEncoderSku("");
      setDecoderSku("");
      setTransceiverSku("");
      setSpecialistSku("");
      setSpecialistQty(0);
      return;
    }

    if (!encoderSku && encoderOptions.length > 0) {
      setEncoderSku(normalizeText(encoderOptions[0].sku));
    }

    if (!decoderSku && decoderOptions.length > 0) {
      setDecoderSku(normalizeText(decoderOptions[0].sku));
    }

    if (!transceiverSku && transceiverOptions.length > 0 && !encoderOptions.length && !decoderOptions.length) {
      setTransceiverSku(normalizeText(transceiverOptions[0].sku));
    }
  }, [family, encoderSku, decoderSku, transceiverSku, encoderOptions, decoderOptions, transceiverOptions]);

  function currentRequirements(): ProjectRequirements {
    return {
      application,
      roomType,
      sourceCount,
      displayCount,
      usbRequired,
      audioRequired,
      controlRequired,
    };
  }

  function currentEndpointChoice(): EndpointChoice {
    const encoderQty = transceiverSku ? 0 : sourceCount;
    const decoderQty = transceiverSku ? 0 : displayCount;
    const transceiverQty = transceiverSku ? Math.max(sourceCount, displayCount) : 0;

    return {
      encoderSku,
      decoderSku,
      transceiverSku,
      specialistSku,
      encoderQty,
      decoderQty,
      transceiverQty,
      specialistQty,
    };
  }

  function handleAddToProject(): void {
    if (!selectedProduct) return;
    const projectId = getActiveProjectId();
    const item = toHandoffItem(selectedProduct);
    const next = upsertProjectItem(projectId, item, currentRequirements(), currentEndpointChoice());
    setActionMessage(`Added ${item.sku} to project handoff. ${next.items.length} saved item${next.items.length === 1 ? "" : "s"} ready for downstream tools.`);
  }

  function handleOpenProposal(): void {
    if (!selectedProduct) return;
    const projectId = getActiveProjectId();
    const item = toHandoffItem(selectedProduct);
    upsertProjectItem(projectId, item, currentRequirements(), currentEndpointChoice());
    setActionMessage(`Prepared ${item.sku} and endpoint selections for Proposal Builder.`);
    window.location.href = `/app/tools/proposal?projectId=${encodeURIComponent(projectId)}`;
  }

  function handleAskGuru(): void {
    if (!selectedProduct) return;
    const projectId = getActiveProjectId();
    const item = toHandoffItem(selectedProduct);
    upsertProjectItem(projectId, item, currentRequirements(), currentEndpointChoice());
    localStorage.setItem(
      "wm:guru:catalog-context",
      JSON.stringify({
        source: "catalogue_v2",
        requirements: currentRequirements(),
        endpointChoice: currentEndpointChoice(),
        product: item,
        prompt: `Explain why ${item.sku} is a fit for this opportunity. Focus on ${item.family}, ${item.series}, endpoint selection, and these reasons: ${item.reasons.join(", ")}.`,
      }),
    );
    setActionMessage(`Sent ${item.sku} and endpoint selection context to Guru.`);
    window.location.href = `/app/tools/guru?projectId=${encodeURIComponent(projectId)}`;
  }

  return (
    <div style={pageStyle}>
      <section style={panelStyle}>
        <strong>Search</strong>
        <div style={{ marginTop: 8 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SKU, NDI, HDMI 2.0, Dante, 10Gb, PTZ, multiview..."
            style={inputStyle}
          />
        </div>
      </section>

      <section style={panelStyle}>
        <strong>Requirement Inputs</strong>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 8, marginTop: 8 }}>
          <select value={application} onChange={(e) => setApplication(e.target.value)} style={selectStyle}>
            <option value="">Select application</option>
            <option value="Meeting room">Meeting room</option>
            <option value="Boardroom">Boardroom</option>
            <option value="Classroom">Classroom</option>
            <option value="Control room">Control room</option>
            <option value="Video wall">Video wall</option>
            <option value="NDI">NDI</option>
            <option value="BYOD">BYOD</option>
            <option value="Teams room">Teams room</option>
          </select>

          <select value={roomType} onChange={(e) => setRoomType(e.target.value)} style={selectStyle}>
            <option value="Meeting room">Meeting room</option>
            <option value="Boardroom">Boardroom</option>
            <option value="Classroom">Classroom</option>
            <option value="Control room">Control room</option>
            <option value="Lobby">Lobby</option>
          </select>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input
              type="number"
              min={1}
              value={sourceCount}
              onChange={(e) => setSourceCount(Math.max(1, Number(e.target.value) || 1))}
              style={inputStyle}
            />
            <input
              type="number"
              min={1}
              value={displayCount}
              onChange={(e) => setDisplayCount(Math.max(1, Number(e.target.value) || 1))}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ ...rowStyle, marginTop: 8 }}>
          <button type="button" onClick={() => setUsbRequired(!usbRequired)} style={usbRequired ? activeButton : buttonStyle}>USB</button>
          <button type="button" onClick={() => setAudioRequired(!audioRequired)} style={audioRequired ? activeButton : buttonStyle}>Audio</button>
          <button type="button" onClick={() => setControlRequired(!controlRequired)} style={controlRequired ? activeButton : buttonStyle}>Control</button>
        </div>
      </section>

      <section style={panelStyle}>
        <strong>Product Family</strong>
        <div style={{ ...rowStyle, marginTop: 8 }}>
          {["NHD", "Matrix", "Presentation", "Video Wall", "Apollo"].map((f) => (
            <button
              key={f}
              onClick={() => {
                setFamily(f === family ? "" : f);
                if (f !== "NHD") {
                  setSeries("");
                }
              }}
              style={family === f ? activeButton : buttonStyle}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      {family === "NHD" && (
        <section style={panelStyle}>
          <strong>NHD Power of Three</strong>
          <div style={{ ...rowStyle, marginTop: 8 }}>
            {["NHD-100 Series", "NHD-500 Series", "NHD-600 Series"].map((s) => (
              <button key={s} onClick={() => setSeries(series === s ? "" : s)} style={series === s ? activeButton : buttonStyle}>
                {s}
              </button>
            ))}
          </div>
        </section>
      )}

      {family === "NHD" && series && (
        <section style={panelStyle}>
          <strong>Series Endpoint Selection</strong>
          <div style={{ fontSize: 12, opacity: 0.78, marginTop: 6 }}>
            Choose the exact devices inside {series}. Wingman will carry these encoder / decoder selections into the proposal BOM.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginTop: 10 }}>
            <div style={cardStyle}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Encoder</div>
              <select value={encoderSku} onChange={(e) => setEncoderSku(e.target.value)} style={selectStyle}>
                <option value="">Select encoder</option>
                {encoderOptions.map((product) => (
                  <option key={product.id} value={normalizeText(product.sku)}>
                    {normalizeText(product.sku)} - {normalizeText(product.name)}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 12, opacity: 0.74 }}>Qty: {transceiverSku ? 0 : sourceCount}</div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Decoder</div>
              <select value={decoderSku} onChange={(e) => setDecoderSku(e.target.value)} style={selectStyle}>
                <option value="">Select decoder</option>
                {decoderOptions.map((product) => (
                  <option key={product.id} value={normalizeText(product.sku)}>
                    {normalizeText(product.sku)} - {normalizeText(product.name)}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 12, opacity: 0.74 }}>Qty: {transceiverSku ? 0 : displayCount}</div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Transceiver</div>
              <select value={transceiverSku} onChange={(e) => setTransceiverSku(e.target.value)} style={selectStyle}>
                <option value="">Select transceiver</option>
                {transceiverOptions.map((product) => (
                  <option key={product.id} value={normalizeText(product.sku)}>
                    {normalizeText(product.sku)} - {normalizeText(product.name)}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 12, opacity: 0.74 }}>Qty: {transceiverSku ? Math.max(sourceCount, displayCount) : 0}</div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Specialist / Optional</div>
              <select value={specialistSku} onChange={(e) => setSpecialistSku(e.target.value)} style={selectStyle}>
                <option value="">Select specialist device</option>
                {specialistOptions.map((product) => (
                  <option key={product.id} value={normalizeText(product.sku)}>
                    {normalizeText(product.sku)} - {normalizeText(product.name)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                value={specialistQty}
                onChange={(e) => setSpecialistQty(Math.max(0, Number(e.target.value) || 0))}
                style={{ ...inputStyle, marginTop: 8 }}
              />
            </div>
          </div>

          <div style={{ ...rowStyle, marginTop: 8 }}>
            {encoderSku ? <span style={pillStyle}>Encoder: {encoderSku}</span> : null}
            {decoderSku ? <span style={pillStyle}>Decoder: {decoderSku}</span> : null}
            {transceiverSku ? <span style={pillStyle}>Transceiver: {transceiverSku}</span> : null}
            {specialistSku ? <span style={pillStyle}>Specialist: {specialistSku} x{specialistQty}</span> : null}
          </div>
        </section>
      )}

      {actionMessage ? <section style={statusStyle}>{actionMessage}</section> : null}

      <section style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 10, height: "100%" }}>
        <div style={{ ...panelStyle, overflow: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <strong>{ranked.length} Products</strong>
            <div style={{ fontSize: 12, opacity: 0.72 }}>
              {family || "All families"} {series ? "• " + series : ""} {application ? "• " + application : ""}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {ranked.slice(0, 50).map((entry) => (
              <div
                key={entry.product.id}
                onClick={() => setSelectedProduct(entry)}
                style={{
                  ...cardStyle,
                  cursor: "pointer",
                  border: selectedProduct?.product.id === entry.product.id
                    ? "1px solid #f97316"
                    : "1px solid rgba(148,163,184,0.12)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{entry.product.sku}</div>
                    <div style={{ fontSize: 13, opacity: 0.88 }}>{entry.product.name}</div>
                  </div>
                  <div style={scorePillStyle}>Score {entry.score}</div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={pillStyle}>{entry.family}</span>
                  <span style={pillStyle}>{entry.series}</span>
                  {entry.product.category ? <span style={pillStyle}>{entry.product.category}</span> : null}
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {entry.reasons.map((reason) => (
                    <span key={reason} style={pillStyle}>{reason}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...panelStyle, position: "sticky", top: 0, height: "100%", overflow: "auto" }}>
          {!selectedProduct ? (
            <div style={{ opacity: 0.6 }}>Select a product to view details</div>
          ) : (
            <>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{selectedProduct.product.sku}</div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>{selectedProduct.product.name}</div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                <span style={pillStyle}>{selectedProduct.family}</span>
                <span style={pillStyle}>{selectedProduct.series}</span>
                {selectedProduct.product.functionalRole ? <span style={pillStyle}>{selectedProduct.product.functionalRole}</span> : null}
                {selectedProduct.product.routingClass ? <span style={pillStyle}>{selectedProduct.product.routingClass}</span> : null}
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Why this product</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {selectedProduct.reasons.map((r) => (
                    <span key={r} style={pillStyle}>{r}</span>
                  ))}
                </div>
              </div>

              {selectedProduct.product.summary ? (
                <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.5 }}>
                  {selectedProduct.product.summary}
                </div>
              ) : null}

              <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Current requirement handoff</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={pillStyle}>{application || "No application"}</span>
                  <span style={pillStyle}>{roomType}</span>
                  <span style={pillStyle}>{sourceCount} sources</span>
                  <span style={pillStyle}>{displayCount} displays</span>
                  {usbRequired ? <span style={pillStyle}>USB</span> : null}
                  {audioRequired ? <span style={pillStyle}>Audio</span> : null}
                  {controlRequired ? <span style={pillStyle}>Control</span> : null}
                </div>
              </div>

              {family === "NHD" && series ? (
                <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Endpoint mix for {series}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {encoderSku ? <span style={pillStyle}>{encoderSku} x{sourceCount}</span> : null}
                    {decoderSku ? <span style={pillStyle}>{decoderSku} x{displayCount}</span> : null}
                    {transceiverSku ? <span style={pillStyle}>{transceiverSku} x{Math.max(sourceCount, displayCount)}</span> : null}
                    {specialistSku && specialistQty > 0 ? <span style={pillStyle}>{specialistSku} x{specialistQty}</span> : null}
                  </div>
                </div>
              ) : null}

              <div style={{ marginTop: 14, display: "grid", gap: 6 }}>
                <button type="button" style={primaryButtonStyle} onClick={handleAddToProject}>Add to Project</button>
                <button type="button" style={buttonStyle} onClick={handleOpenProposal}>Open in Proposal</button>
                <button type="button" style={buttonStyle} onClick={handleAskGuru}>Ask Guru</button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}