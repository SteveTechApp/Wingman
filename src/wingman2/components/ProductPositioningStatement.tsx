import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

type ProductOption = {
  sku: string;
  family: string;
  description: string;
  fit: string;
  tags: string[];
};

type FamilyOption = {
  name: string;
  examples: string[];
};

const FAMILIES: FamilyOption[] = [
  {
    name: "Presentation switchers",
    examples: ["SW-620-TX-W", "SW-640-TX-W", "MX-0402-MST", "MX-0403-MST"],
  },
  {
    name: "NetworkHD",
    examples: ["NHD-120-TX", "NHD-120-RX", "NHD-500-TX", "NHD-500-RX", "NHD-600-TRX"],
  },
  {
    name: "Matrix / HDBaseT",
    examples: ["MX-0808-KIT", "MX-1007-HYB", "MX-0408-EDU"],
  },
  {
    name: "USB / UC",
    examples: ["APO-VX20-UC", "APO-DG2", "APO-210-UC"],
  },
  {
    name: "Video wall / multiview",
    examples: ["NHD-0401-MV", "NHD-150-RX", "SW-0206-VW", "SW-0204-VW"],
  },
];

const PRODUCTS: ProductOption[] = [
  {
    sku: "SW-620-TX-W",
    family: "Presentation switchers",
    description: "Wireless and wired presentation switcher for meeting and teaching spaces.",
    fit: "Use when the customer needs simple presentation, local source connection and easy room operation.",
    tags: ["presentation", "wireless", "meeting", "classroom"],
  },
  {
    sku: "SW-640-TX-W",
    family: "Presentation switchers",
    description: "Higher-capacity presentation switcher for rooms needing more input flexibility.",
    fit: "Use where there are more local sources or a more capable presentation workflow is needed.",
    tags: ["presentation", "wireless", "dual output", "teaching"],
  },
  {
    sku: "MX-0402-MST",
    family: "Presentation switchers",
    description: "Compact presentation matrix/switching option for smaller meeting and learning spaces.",
    fit: "Use where a simple fixed-room presentation system is required.",
    tags: ["meeting", "education", "switching"],
  },
  {
    sku: "MX-0403-MST",
    family: "Presentation switchers",
    description: "Presentation switching option for rooms needing multiple display paths.",
    fit: "Use where one room needs more than a basic single-display presentation flow.",
    tags: ["meeting", "education", "multi display"],
  },
  {
    sku: "NHD-120-TX",
    family: "NetworkHD",
    description: "NetworkHD 100-series encoder for flexible AV-over-IP distribution.",
    fit: "Use when a source needs to be placed onto a NetworkHD 100-series system.",
    tags: ["avoip", "encoder", "networkhd 100"],
  },
  {
    sku: "NHD-120-RX",
    family: "NetworkHD",
    description: "NetworkHD 100-series decoder for cost-effective AV-over-IP display endpoints.",
    fit: "Use when a display needs to receive content from a NetworkHD 100-series system.",
    tags: ["avoip", "decoder", "networkhd 100"],
  },
  {
    sku: "NHD-150-RX",
    family: "Video wall / multiview",
    description: "NetworkHD 100-series multiview decoder for showing multiple sources on one output.",
    fit: "Use where the requirement is a single display or output canvas showing multiple sources at once.",
    tags: ["avoip", "multiview", "networkhd 100"],
  },
  {
    sku: "NHD-500-TX",
    family: "NetworkHD",
    description: "NetworkHD 500-series encoder for premium 4K AV-over-IP applications.",
    fit: "Use where higher-performance NetworkHD 500 distribution is required.",
    tags: ["avoip", "encoder", "networkhd 500"],
  },
  {
    sku: "NHD-500-RX",
    family: "NetworkHD",
    description: "NetworkHD 500-series decoder for premium 4K AV-over-IP endpoints.",
    fit: "Use where a display endpoint is part of a NetworkHD 500 system.",
    tags: ["avoip", "decoder", "networkhd 500"],
  },
  {
    sku: "NHD-600-TRX",
    family: "NetworkHD",
    description: "NetworkHD 600-series transceiver for high-performance 10G AV-over-IP systems.",
    fit: "Use where the project needs the highest-performance NetworkHD architecture.",
    tags: ["avoip", "10g", "transceiver", "networkhd 600"],
  },
  {
    sku: "MX-0808-KIT",
    family: "Matrix / HDBaseT",
    description: "Matrix kit direction for fixed source-to-display routing over HDBaseT.",
    fit: "Use for contained projects where fixed I/O matrix routing is a better fit than AV-over-IP.",
    tags: ["matrix", "hdbaset", "hospitality"],
  },
  {
    sku: "MX-1007-HYB",
    family: "Matrix / HDBaseT",
    description: "Hybrid room solution direction for modern presentation and teaching spaces.",
    fit: "Use where local presentation, transport, USB and room integration need to be considered together.",
    tags: ["hybrid", "meeting", "education", "usb"],
  },
  {
    sku: "MX-0408-EDU",
    family: "Matrix / HDBaseT",
    description: "Education-focused matrix direction for teaching and learning environments.",
    fit: "Use where classroom-style source routing and display distribution are required.",
    tags: ["education", "matrix", "teaching"],
  },
  {
    sku: "APO-VX20-UC",
    family: "USB / UC",
    description: "BYOD/UC soundbar direction for small meeting and collaboration spaces.",
    fit: "Use where the room needs a simple camera, speaker and microphone experience.",
    tags: ["uc", "byod", "meeting", "camera"],
  },
  {
    sku: "APO-DG2",
    family: "USB / UC",
    description: "Wireless casting dongle option for supported WyreStorm presentation workflows.",
    fit: "Use when the customer needs a simple wireless presentation add-on.",
    tags: ["wireless", "casting", "presentation"],
  },
  {
    sku: "APO-210-UC",
    family: "USB / UC",
    description: "Tabletop UC audio direction for smaller meeting room audio capture and playback.",
    fit: "Use where a compact meeting room needs simple table audio support.",
    tags: ["uc", "audio", "meeting"],
  },
  {
    sku: "NHD-0401-MV",
    family: "Video wall / multiview",
    description: "4-input multiview processor for showing several sources on one HDMI output.",
    fit: "Use where the customer wants a single multiview image rather than a full matrix or AVoIP wall.",
    tags: ["multiview", "hdmi", "processor"],
  },
  {
    sku: "SW-0206-VW",
    family: "Video wall / multiview",
    description: "Dedicated video wall processor direction for non-AV-over-IP wall applications.",
    fit: "Use where a dedicated wall processor is cleaner than building the wall through AVoIP.",
    tags: ["video wall", "processor"],
  },
  {
    sku: "SW-0204-VW",
    family: "Video wall / multiview",
    description: "Simpler video wall processor direction for basic preset wall layouts.",
    fit: "Use where the wall requirement is straightforward and does not need a large AVoIP system.",
    tags: ["video wall", "processor", "preset"],
  },
];

const styles: Record<string, CSSProperties> = {
  shell: {
    width: "100%",
    height: "calc(100vh - 6.5rem)",
    minHeight: 0,
    boxSizing: "border-box",
    display: "grid",
    gridTemplateRows: "auto 1fr",
    gap: "0.75rem",
    overflow: "hidden",
    padding: "1rem 1.15rem",
    color: "#ffffff",
  },
  header: {
    border: "1px solid rgba(77, 227, 255, 0.22)",
    borderRadius: "1.1rem",
    background: "linear-gradient(135deg, rgba(7, 24, 39, 0.94), rgba(7, 31, 49, 0.86))",
    padding: "0.85rem 1rem",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: "1rem",
  },
  eyebrow: {
    margin: 0,
    fontSize: "0.72rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#67e8f9",
    fontWeight: 800,
  },
  title: {
    margin: "0.1rem 0 0",
    fontSize: "1.85rem",
    lineHeight: 1.05,
    color: "#67e8f9",
    fontWeight: 800,
  },
  subtitle: {
    margin: "0.25rem 0 0",
    color: "rgba(226, 242, 255, 0.76)",
    fontSize: "0.9rem",
  },
  main: {
    minHeight: 0,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
    gap: "0.75rem",
    overflow: "hidden",
  },
  card: {
    minHeight: 0,
    border: "1px solid rgba(77, 227, 255, 0.2)",
    borderRadius: "1rem",
    background: "rgba(4, 21, 35, 0.86)",
    padding: "0.9rem",
    boxShadow: "0 18px 42px rgba(0, 0, 0, 0.22)",
  },
  leftCard: {
    display: "grid",
    gridTemplateRows: "auto auto 1fr",
    gap: "0.75rem",
    overflow: "hidden",
  },
  search: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: "0.85rem",
    border: "1px solid rgba(103, 232, 249, 0.28)",
    background: "rgba(2, 13, 24, 0.92)",
    color: "#ffffff",
    padding: "0.8rem 0.95rem",
    fontSize: "0.95rem",
    outline: "none",
  },
  familyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: "0.5rem",
  },
  familyButton: {
    minHeight: "4.1rem",
    borderRadius: "0.9rem",
    border: "1px solid rgba(103, 232, 249, 0.22)",
    background: "rgba(5, 25, 42, 0.9)",
    color: "#ffffff",
    padding: "0.55rem",
    textAlign: "left",
    cursor: "pointer",
  },
  familyButtonActive: {
    borderColor: "#67e8f9",
    boxShadow: "inset 0 0 0 1px rgba(103, 232, 249, 0.28)",
    background: "linear-gradient(135deg, rgba(10, 104, 126, 0.42), rgba(5, 30, 50, 0.92))",
  },
  familyName: {
    display: "block",
    fontWeight: 800,
    fontSize: "0.78rem",
    lineHeight: 1.2,
  },
  familyExamples: {
    display: "block",
    marginTop: "0.35rem",
    color: "rgba(226, 242, 255, 0.62)",
    fontSize: "0.68rem",
    lineHeight: 1.2,
  },
  productList: {
    minHeight: 0,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "0.5rem",
    overflow: "auto",
    paddingRight: "0.25rem",
  },
  productButton: {
    borderRadius: "0.85rem",
    border: "1px solid rgba(103, 232, 249, 0.18)",
    background: "rgba(2, 14, 25, 0.88)",
    color: "#ffffff",
    padding: "0.7rem",
    textAlign: "left",
    cursor: "pointer",
  },
  productButtonActive: {
    borderColor: "#67e8f9",
    background: "rgba(13, 87, 110, 0.36)",
  },
  sku: {
    display: "block",
    color: "#67e8f9",
    fontSize: "0.95rem",
    fontWeight: 900,
  },
  meta: {
    display: "block",
    marginTop: "0.2rem",
    color: "rgba(226, 242, 255, 0.68)",
    fontSize: "0.76rem",
  },
  description: {
    margin: "0.35rem 0 0",
    color: "rgba(226, 242, 255, 0.82)",
    fontSize: "0.78rem",
    lineHeight: 1.35,
  },
  preview: {
    minHeight: 0,
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
    gap: "0.75rem",
    overflow: "hidden",
  },
  previewPanel: {
    borderRadius: "0.9rem",
    border: "1px solid rgba(103, 232, 249, 0.18)",
    background: "rgba(2, 14, 25, 0.62)",
    padding: "0.85rem",
    overflow: "hidden",
  },
  label: {
    margin: 0,
    color: "rgba(226, 242, 255, 0.62)",
    fontSize: "0.72rem",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    fontWeight: 800,
  },
  previewSku: {
    margin: "0.15rem 0 0",
    color: "#67e8f9",
    fontSize: "1.45rem",
    fontWeight: 900,
  },
  sectionTitle: {
    margin: "0 0 0.35rem",
    color: "#ffffff",
    fontSize: "0.92rem",
    fontWeight: 850,
  },
  body: {
    margin: 0,
    color: "rgba(226, 242, 255, 0.78)",
    fontSize: "0.86rem",
    lineHeight: 1.45,
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.5rem",
  },
  primaryButton: {
    border: "1px solid rgba(103, 232, 249, 0.5)",
    borderRadius: "0.85rem",
    background: "linear-gradient(135deg, #5eeaf7, #228be6)",
    color: "#ffffff",
    fontWeight: 900,
    padding: "0.78rem 0.9rem",
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid rgba(103, 232, 249, 0.24)",
    borderRadius: "0.85rem",
    background: "rgba(5, 25, 42, 0.95)",
    color: "#ffffff",
    fontWeight: 850,
    padding: "0.78rem 0.9rem",
    cursor: "pointer",
  },
  disabledButton: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  empty: {
    borderRadius: "0.9rem",
    border: "1px dashed rgba(103, 232, 249, 0.28)",
    padding: "1rem",
    color: "rgba(226, 242, 255, 0.7)",
    background: "rgba(2, 14, 25, 0.42)",
  },
  tagRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.35rem",
    marginTop: "0.65rem",
  },
  tag: {
    borderRadius: "999px",
    border: "1px solid rgba(103, 232, 249, 0.22)",
    background: "rgba(103, 232, 249, 0.09)",
    color: "#ffffff",
    fontSize: "0.7rem",
    padding: "0.22rem 0.5rem",
  },
};

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

function productMatches(product: ProductOption, query: string): boolean {
  const q = normalise(query);

  if (!q) {
    return true;
  }

  const haystack = [
    product.sku,
    product.family,
    product.description,
    product.fit,
    ...product.tags,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

function openPath(path: string): void {
  window.location.assign(path);
}

export function ProductCallCardsSelectPage() {
  const [query, setQuery] = useState("");
  const [activeFamily, setActiveFamily] = useState("All");
  const [selectedSku, setSelectedSku] = useState<string>("");

  const filteredProducts = useMemo(() => {
    let list = PRODUCTS;

    if (activeFamily !== "All") {
      list = list.filter((product) => product.family === activeFamily);
    }

    return list.filter((product) => productMatches(product, query)).slice(0, 12);
  }, [activeFamily, query]);

  const selectedProduct = useMemo(() => {
    return PRODUCTS.find((product) => product.sku === selectedSku);
  }, [selectedSku]);

  const visibleFamilies: FamilyOption[] = [
    {
      name: "All",
      examples: ["Search all WyreStorm call cards"],
    },
    ...FAMILIES,
  ];

  function openSelectedCallCard(): void {
    if (!selectedProduct) {
      return;
    }

    openPath(`/wingman/product-call-cards/${encodeURIComponent(selectedProduct.sku)}`);
  }

  function openSelectedPitch(): void {
    if (!selectedProduct) {
      return;
    }

    openPath(`/wingman/product-pitch?sku=${encodeURIComponent(selectedProduct.sku)}`);
  }

  return (
    <section className="wm-pcc-select-shell" style={styles.shell}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Wingman workspace</p>
          <h1 style={styles.title}>Product Call Cards</h1>
          <p style={styles.subtitle}>Choose a product or SKU to open a sales support card.</p>
        </div>

        <input
          aria-label="Search WyreStorm SKU or product name"
          placeholder="Search SKU, product family, use case or keyword..."
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          style={{ ...styles.search, maxWidth: "25rem" }}
        />
      </header>

      <main style={styles.main}>
        <section style={{ ...styles.card, ...styles.leftCard }}>
          <div style={styles.familyGrid}>
            {visibleFamilies.map((family) => (
              <button
                key={family.name}
                type="button"
                onClick={() => setActiveFamily(family.name)}
                style={{
                  ...styles.familyButton,
                  ...(activeFamily === family.name ? styles.familyButtonActive : {}),
                }}
              >
                <span style={styles.familyName}>{family.name}</span>
                <span style={styles.familyExamples}>{family.examples.join(" · ")}</span>
              </button>
            ))}
          </div>

          <div>
            <p style={styles.label}>Suggested products</p>
          </div>

          <div style={styles.productList}>
            {filteredProducts.map((product) => (
              <button
                key={product.sku}
                type="button"
                onClick={() => setSelectedSku(product.sku)}
                style={{
                  ...styles.productButton,
                  ...(selectedSku === product.sku ? styles.productButtonActive : {}),
                }}
              >
                <span style={styles.sku}>{product.sku}</span>
                <span style={styles.meta}>{product.family}</span>
                <p style={styles.description}>{product.description}</p>
              </button>
            ))}

            {filteredProducts.length === 0 && (
              <div style={styles.empty}>
                No matching product call cards found. Try a SKU, product family or application keyword.
              </div>
            )}
          </div>
        </section>

        <aside style={{ ...styles.card, ...styles.preview }}>
          <div>
            <p style={styles.label}>Selected product preview</p>

            {selectedProduct && (
              <h2 style={styles.previewSku}>{selectedProduct.sku}</h2>
            )}
          </div>

          {selectedProduct && (
            <div style={styles.previewPanel}>
              <p style={styles.sectionTitle}>{selectedProduct.family}</p>
              <p style={styles.body}>{selectedProduct.description}</p>

              <div style={{ marginTop: "0.9rem" }}>
                <p style={styles.sectionTitle}>Main application fit</p>
                <p style={styles.body}>{selectedProduct.fit}</p>
              </div>

              <div style={styles.tagRow}>
                {selectedProduct.tags.map((tag) => (
                  <span key={tag} style={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!selectedProduct && (
            <div style={styles.empty}>
              Search for a SKU or choose a product family to begin. The preview will show the sales support direction before you open the call card.
            </div>
          )}

          <div style={styles.actions}>
            <button
              type="button"
              onClick={openSelectedCallCard}
              disabled={!selectedProduct}
              style={{
                ...styles.primaryButton,
                ...(!selectedProduct ? styles.disabledButton : {}),
              }}
            >
              Open call card
            </button>

            <button
              type="button"
              onClick={openSelectedPitch}
              disabled={!selectedProduct}
              style={{
                ...styles.secondaryButton,
                ...(!selectedProduct ? styles.disabledButton : {}),
              }}
            >
              Open Product Pitch
            </button>
          </div>
        </aside>
      </main>
    </section>
  );
}

export { ProductCallCardsSelectPage as ProductCallCardSelectPage };
export { ProductCallCardsSelectPage as ProductCallCardsSelect };
export { ProductCallCardsSelectPage as ProductCallCardSelect };
export { ProductCallCardsSelectPage as ProductCallCardsProductSelectPage };

export default ProductCallCardsSelectPage;