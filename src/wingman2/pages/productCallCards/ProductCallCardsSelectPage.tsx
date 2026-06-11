import { useEffect, useMemo, useState } from "react";
import { PRODUCT_CALL_PRODUCTS, loadCallContext, navigateCallCardPage, saveCallContext } from "./store";

type ProductCallProduct = (typeof PRODUCT_CALL_PRODUCTS)[number];

type ProductPath =
  | "All"
  | "AVoIP"
  | "Presentation switching"
  | "Matrix"
  | "Multiview / video wall"
  | "Audio"
  | "Camera / capture"
  | "Extension"
  | "Other";

function normalise(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === "string") {
    return [value];
  }

  return [];
}

function getRecord(product: ProductCallProduct): Record<string, unknown> {
  return product as unknown as Record<string, unknown>;
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(normalise(term)));
}

function getProductCoreText(product: ProductCallProduct): string {
  const record = getRecord(product);

  return normalise([
    product.sku,
    product.name,
    product.category,
    product.family,
    ...getStringList(record.tags),
  ].join(" "));
}

function getProductSearchText(product: ProductCallProduct): string {
  const record = getRecord(product);

  return normalise([
    product.sku,
    product.name,
    product.category,
    product.family,
    ...getStringList(record.tags),
    record.bestFor,
    record.whatItIs,
    record.whatItDoes,
    ...getStringList(record.goodFit),
    ...getStringList(record.salesAngles),
    ...getStringList(record.worthMentioning),
  ].join(" "));
}

function classifyProductPath(product: ProductCallProduct): ProductPath {
  const sku = normalise(product.sku);
  const coreText = getProductCoreText(product);

  if (sku.startsWith("nhd") || includesAny(coreText, ["networkhd", "avoip", "av over ip"])) {
    return "AVoIP";
  }

  if (includesAny(coreText, ["matrix", "mx"])) {
    return "Matrix";
  }

  if (includesAny(coreText, ["multiview", "video wall", "wall processor"])) {
    return "Multiview / video wall";
  }

  if (includesAny(coreText, ["camera", "capture", "ndi", "ptz", "cam"])) {
    return "Camera / capture";
  }

  if (includesAny(coreText, ["audio", "speaker", "microphone", "dante", "apo"])) {
    return "Audio";
  }

  if (includesAny(coreText, ["hdbaset", "extender", "extension", "usb"])) {
    return "Extension";
  }

  if (sku.startsWith("sw") || includesAny(coreText, ["presentation", "switcher", "wireless", "synergy"])) {
    return "Presentation switching";
  }

  return "Other";
}

function productMatchesPath(product: ProductCallProduct, path: ProductPath): boolean {
  if (path === "All") {
    return true;
  }

  return classifyProductPath(product) === path;
}

function inferPathFromContext(context: ReturnType<typeof loadCallContext>): ProductPath {
  const record = context as unknown as Record<string, unknown>;

  const contextText = normalise([
    record.selectedProductPath,
    record.productPath,
    record.technicalRequirement,
    record.productFamily,
    record.family,
    record.category,
    record.technology,
    record.selectedTechnology,
    record.selectedCategory,
    record.selectedFamily,
    record.application,
    record.environment,
    record.callMode,
  ].join(" "));

  if (includesAny(contextText, ["networkhd", "nhd", "avoip", "av over ip", "distribute av over network"])) {
    return "AVoIP";
  }

  if (includesAny(contextText, ["presentation", "switcher", "wireless", "byod", "byom"])) {
    return "Presentation switching";
  }

  if (includesAny(contextText, ["matrix", "routing"])) {
    return "Matrix";
  }

  if (includesAny(contextText, ["multiview", "video wall"])) {
    return "Multiview / video wall";
  }

  if (includesAny(contextText, ["audio", "microphone", "speaker", "dante"])) {
    return "Audio";
  }

  if (includesAny(contextText, ["camera", "capture", "ndi", "ptz"])) {
    return "Camera / capture";
  }

  if (includesAny(contextText, ["hdbaset", "extender", "extension", "usb"])) {
    return "Extension";
  }

  return "All";
}

function getPlaceholder(path: ProductPath): string {
  if (path === "AVoIP") {
    return "Type NHD, NetworkHD, 500, 600, multiview...";
  }

  if (path === "Presentation switching") {
    return "Type SW, wireless, USB-C, presentation...";
  }

  return "Type SKU, product name or application...";
}

function startVoiceInput(): void {
  window.dispatchEvent(
    new CustomEvent("wingman:start-voice-input", {
      detail: { target: "product-call-card-search" },
    }),
  );
}

export function ProductCallCardsSelectPage() {
  const context = loadCallContext();
  const selectedPath = inferPathFromContext(context);

  const [query, setQuery] = useState("");

  const filteredProducts = useMemo(() => {
    const search = normalise(query);

    if (!search) {
      return [];
    }

    return PRODUCT_CALL_PRODUCTS
      .filter((product) => productMatchesPath(product, selectedPath))
      .filter((product) => getProductSearchText(product).includes(search))
      .slice(0, 12);
  }, [query, selectedPath]);

  const chooseProduct = (sku: string) => {
    const product = PRODUCT_CALL_PRODUCTS.find((item) => item.sku === sku);

    if (!product) {
      return;
    }

    saveCallContext({
      ...context,
      selectedSku: product.sku,
      selectedName: product.name,
    });

    navigateCallCardPage(`/product/${encodeURIComponent(product.sku)}`);
  };

  const hasSearch = query.trim().length > 0;

  // === WINGMAN PCC SELECT OLD FLOATING MIC CLEANUP START ===
  useEffect(() => {
    const hiddenElements: Array<{ element: HTMLElement; display: string; visibility: string; pointerEvents: string }> = [];

    function isGuruElement(element: HTMLElement): boolean {
      return Boolean(
        element.closest(".wingman-guru-fab") ||
        element.closest(".wingman-guru-drawer") ||
        element.classList.contains("wingman-guru-fab") ||
        element.className.toString().toLowerCase().includes("guru")
      );
    }

    function isLocalSearchMic(element: HTMLElement): boolean {
      return Boolean(
        element.closest(".wm-pcc-search-row-inline-test") ||
        element.className.toString().includes("wm-pcc-search-mic-direct")
      );
    }

    function shouldHideOldFloatingMic(element: HTMLElement): boolean {
      if (isGuruElement(element)) {
        return false;
      }

      if (isLocalSearchMic(element)) {
        return false;
      }

      if (element.id === "wingman-live-route-marker") {
        return true;
      }

      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const text = [
        element.getAttribute("aria-label"),
        element.getAttribute("title"),
        element.textContent,
        element.className.toString(),
      ]
        .join(" ")
        .toLowerCase();

      const isFixedOrAbsolute = style.position === "fixed" || style.position === "absolute";
      const isSmallCircle =
        rect.width >= 24 &&
        rect.width <= 72 &&
        rect.height >= 24 &&
        rect.height <= 72 &&
        Math.abs(rect.width - rect.height) <= 14;

      const isOldMicByLabel = /mic|microphone|voice|speech|dictat|listen|talk/.test(text);
      const isBottomRight = rect.left > window.innerWidth * 0.45 && rect.top > window.innerHeight * 0.45;
      const isIconOnly = element.querySelector("svg,img") !== null || element.innerHTML.toLowerCase().includes("svg");

      if (isOldMicByLabel && isFixedOrAbsolute) {
        return true;
      }

      if (isFixedOrAbsolute && isSmallCircle && isBottomRight && isIconOnly) {
        return true;
      }

      return false;
    }

    function hideOldFloatingMic(): void {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>("button, [role='button'], [aria-label], [title], div, span"));

      candidates.forEach((element) => {
        if (!shouldHideOldFloatingMic(element)) {
          return;
        }

        if (element.dataset.wmPccOldMicHidden === "true") {
          return;
        }

        hiddenElements.push({
          element,
          display: element.style.display,
          visibility: element.style.visibility,
          pointerEvents: element.style.pointerEvents,
        });

        element.dataset.wmPccOldMicHidden = "true";
        element.style.setProperty("display", "none", "important");
        element.style.setProperty("visibility", "hidden", "important");
        element.style.setProperty("pointer-events", "none", "important");
      });
    }

    hideOldFloatingMic();

    const timerOne = window.setTimeout(hideOldFloatingMic, 150);
    const timerTwo = window.setTimeout(hideOldFloatingMic, 500);

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(hideOldFloatingMic);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "aria-label", "title"],
    });

    return () => {
      window.clearTimeout(timerOne);
      window.clearTimeout(timerTwo);
      observer.disconnect();

      hiddenElements.forEach(({ element, display, visibility, pointerEvents }) => {
        element.style.display = display;
        element.style.visibility = visibility;
        element.style.pointerEvents = pointerEvents;
        delete element.dataset.wmPccOldMicHidden;
      });
    };
  }, []);
  // === WINGMAN PCC SELECT OLD FLOATING MIC CLEANUP END ===


  return (
    <div className="wm-pcc-page wm-pcc-select-simple" data-inline-layout-test="active">
      <section className="wm-pcc-hero">
        <p className="wm-pcc-eyebrow">Product call cards</p>
        <h1>Select one WyreStorm product</h1>
      </section>

      <div className="wm-pcc-stepper" aria-label="Product call card progress">
        <div className="wm-pcc-step">1. Setup <span>Voice</span></div>
        <div className="wm-pcc-step is-active">2. Select <span>SKU</span></div>
        <div className="wm-pcc-step">3. Call card <span>Use product</span></div>
        <div className="wm-pcc-step">4. Response <span>Copy wording</span></div>
      </div>

      <section
        className="wm-pcc-card wm-pcc-select-card"
        style={{
          maxWidth: "880px",
          minHeight: "350px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          className="wm-pcc-select-heading"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "8px 16px",
            alignItems: "center",
            marginBottom: "18px",
          }}
        >
          <p className="wm-pcc-eyebrow" style={{ gridColumn: "1 / -1", margin: 0 }}>
            Product selection
          </p>
          <h2 style={{ margin: 0, color: "#5df6ff", fontSize: "1.12rem" }}>
            Search and select the SKU
          </h2>
          {selectedPath !== "All" ? (
            <span
              style={{
                border: "1px solid rgba(93,246,255,.35)",
                borderRadius: "999px",
                padding: "7px 12px",
                color: "rgba(235,247,255,.86)",
                fontWeight: 900,
                fontSize: ".78rem",
              }}
            >
              {selectedPath}
            </span>
          ) : null}
        </div>

        <div
          className="wm-pcc-search-row-inline-test"
          style={{
            width: "100%",
            maxWidth: "760px",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 46px",
            gap: "12px",
            alignItems: "end",
          }}
        >
          <label className="wm-pcc-field" style={{ margin: 0, maxWidth: "none", width: "100%" }}>
            <span>Search SKU, product name or application</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={getPlaceholder(selectedPath)}
              autoFocus
              style={{ minHeight: "46px", width: "100%" }}
            />
          </label>

          <button
            type="button"
            aria-label="Use microphone for product search"
            title="Use microphone for product search"
            onClick={startVoiceInput}
            style={{
              width: "46px",
              height: "46px",
              minWidth: "46px",
              minHeight: "46px",
              borderRadius: "999px",
              border: "1px solid rgba(93,246,255,.48)",
              background: "rgba(245,250,255,.98)",
              color: "#061426",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 0 18px rgba(93,246,255,.24), 0 8px 22px rgba(0,0,0,.34)",
            }}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false" width="21" height="21">
              <path
                fill="currentColor"
                d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3Zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7Z"
              />
            </svg>
          </button>
        </div>

        {hasSearch && filteredProducts.length > 0 ? (
          <div className="wm-pcc-product-grid" style={{ maxWidth: "760px", marginTop: "18px" }}>
            {filteredProducts.map((product) => (
              <button
                key={product.sku}
                type="button"
                className="wm-pcc-product-card"
                onClick={() => chooseProduct(product.sku)}
              >
                <strong>{product.sku}</strong>
                <span>{product.name}</span>
                <small>{product.category}</small>
              </button>
            ))}
          </div>
        ) : null}

        {hasSearch && !filteredProducts.length ? (
          <div className="wm-pcc-empty-state" style={{ maxWidth: "760px", marginTop: "18px" }}>
            <h3>No matching product</h3>
            <p>Try another SKU, keyword or go back to setup to change the product type.</p>
          </div>
        ) : null}

        <div style={{ height: "76px", minHeight: "76px" }} aria-hidden="true" />

        <div className="wm-pcc-page-actions" style={{ marginTop: 0, paddingTop: 0, justifyContent: "flex-start" }}>
          <button
            type="button"
            className="wm-pcc-secondary-action"
            onClick={() => navigateCallCardPage("/setup")}
            style={{
              minHeight: "40px",
              padding: "9px 16px",
              borderRadius: "999px",
              border: "1px solid rgba(93,246,255,.3)",
              background: "rgba(7,26,45,.96)",
              color: "rgba(235,247,255,.9)",
              fontSize: ".84rem",
              fontWeight: 900,
            }}
          >
            Back to setup
          </button>
        </div>
      </section>
    </div>
  );
}

export default ProductCallCardsSelectPage;
