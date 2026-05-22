type StoredPitchResult = {
  sku: string;
  title: string;
  html: string;
  savedAt: number;
};

const STORAGE_KEY = "wingman.productPitch.selectedResult";

function normaliseText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function isProductPitchPage(): boolean {
  const path = window.location.pathname.toLowerCase();
  const bodyText = normaliseText(document.body.textContent).toLowerCase();

  if (path.includes("product-pitch")) return true;
  if (path.includes("pitch") && bodyText.includes("create a one-page wyrestorm product pitch")) return true;
  if (bodyText.includes("create a one-page wyrestorm product pitch")) return true;

  return false;
}

function isResultView(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get("pitchView") === "result";
}

function resultSkuFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return normaliseText(params.get("pitchSku")).toUpperCase();
}

function findShell(): HTMLElement {
  return document.querySelector<HTMLElement>(".wingman-shell") ?? document.body;
}

function findSmallestContainerContaining(root: HTMLElement, requiredTerms: string[]): HTMLElement | null {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>("section,article,div")).filter((element) => {
    const text = normaliseText(element.textContent).toLowerCase();
    return requiredTerms.every((term) => text.includes(term.toLowerCase()));
  });

  candidates.sort((a, b) => normaliseText(a.textContent).length - normaliseText(b.textContent).length);

  return candidates[0] ?? null;
}

function findChooseProductSection(): HTMLElement | null {
  const root = findShell();
  return findSmallestContainerContaining(root, ["Choose the product", "Pitch setup"]);
}

function findPitchResultSection(): HTMLElement | null {
  const root = findShell();

  const candidates = Array.from(root.querySelectorAll<HTMLElement>("section,article,div")).filter((element) => {
    const text = normaliseText(element.textContent).toLowerCase();

    if (text.includes("choose the product")) return false;

    const score = [
      "overview",
      "positioning",
      "best fit",
      "talk track",
      "questions to ask",
      "feature cues",
      "useful feature points",
    ].reduce((count, term) => {
      if (text.includes(term)) return count + 1;
      return count;
    }, 0);

    if (score < 4) return false;
    if (text.length < 350) return false;

    return true;
  });

  candidates.sort((a, b) => normaliseText(a.textContent).length - normaliseText(b.textContent).length);

  return candidates[0] ?? null;
}

function findSearchInput(scope: HTMLElement): HTMLInputElement | null {
  const inputs = Array.from(scope.querySelectorAll<HTMLInputElement>("input"));

  return inputs.find((input) => {
    const identity = normaliseText([
      input.getAttribute("aria-label"),
      input.placeholder,
      input.name,
      input.id,
    ].filter(Boolean).join(" ")).toLowerCase();

    if (identity.includes("sku")) return true;
    if (identity.includes("requirement")) return true;
    if (identity.includes("search")) return true;

    return false;
  }) ?? null;
}

function getSelectContext(select: HTMLSelectElement): string {
  const label = select.closest("label");
  const wrapper = label ?? select.parentElement;

  return normaliseText([
    select.getAttribute("aria-label"),
    select.name,
    select.id,
    wrapper?.textContent,
  ].filter(Boolean).join(" ")).toLowerCase();
}

function isAudienceSelect(select: HTMLSelectElement): boolean {
  const context = getSelectContext(select);
  const selectedText = normaliseText(select.selectedOptions?.[0]?.textContent || select.value).toLowerCase();

  if (context.includes("pitch audience")) return true;
  if (context.includes("audience")) return true;
  if (context.includes("conversation")) return true;
  if (context.includes("sell to")) return true;
  if (selectedText.includes("trade / dealer")) return true;
  if (selectedText.includes("technical consultant")) return true;

  return false;
}

function isInactiveSelectValue(select: HTMLSelectElement): boolean {
  const value = normaliseText(select.value).toLowerCase();
  const label = normaliseText(select.selectedOptions?.[0]?.textContent || "").toLowerCase();

  if (value === "") return true;
  if (value === "all") return true;
  if (label === "all") return true;
  if (label.includes("all")) return true;
  if (label.includes("any")) return true;
  if (label.includes("not known")) return true;
  if (label.includes("select")) return true;
  if (label.includes("choose")) return true;

  return false;
}

function hasActiveProductCriteria(section: HTMLElement): boolean {
  const searchInput = findSearchInput(section);
  const searchValue = normaliseText(searchInput?.value);

  if (searchValue.length >= 2) return true;

  const selects = Array.from(section.querySelectorAll<HTMLSelectElement>("select"));

  return selects.some((select) => {
    if (isAudienceSelect(select)) return false;
    if (isInactiveSelectValue(select)) return false;

    return true;
  });
}

function extractSkuFromText(text: string): string {
  const match = normaliseText(text).match(/[A-Z0-9]{2,}(?:-[A-Z0-9]+)+/);
  return normaliseText(match?.[0]).toUpperCase();
}

function looksLikeProductCard(element: HTMLElement): boolean {
  const text = normaliseText(element.textContent);

  if (text.length < 8) return false;
  if (text.length > 280) return false;
  if (!extractSkuFromText(text)) return false;

  const tagName = element.tagName.toLowerCase();
  const className = String(element.className || "").toLowerCase();

  if (tagName === "button") return true;
  if (element.getAttribute("role") === "button") return true;
  if (tagName === "article") return true;
  if (className.includes("card")) return true;
  if (className.includes("product")) return true;

  return false;
}

function getProductCards(section: HTMLElement): HTMLElement[] {
  const rawCards = Array.from(section.querySelectorAll<HTMLElement>("button,[role='button'],article,div"))
    .filter(looksLikeProductCard);

  return rawCards.filter((card) => {
    const hasCardAncestor = rawCards.some((other) => {
      if (other === card) return false;
      if (!other.contains(card)) return false;

      return true;
    });

    return !hasCardAncestor;
  });
}

function setHidden(element: HTMLElement | null, hidden: boolean): void {
  if (!element) return;

  element.hidden = hidden;

  if (!hidden) {
    element.classList.remove("wm-product-pitch-route-hidden");
    element.style.removeProperty("display");
    element.style.removeProperty("visibility");
    return;
  }

  element.classList.add("wm-product-pitch-route-hidden");
  element.style.setProperty("display", "none", "important");
  element.style.setProperty("visibility", "hidden", "important");
}

function setCardVisibility(card: HTMLElement, visible: boolean): void {
  card.dataset.wmProductPitchCard = "true";
  setHidden(card, !visible);
}

function ensureLandingEmptyState(section: HTMLElement): HTMLElement {
  const existing = section.querySelector<HTMLElement>(".wm-product-pitch-empty-state");

  if (existing) return existing;

  const emptyState = document.createElement("div");
  emptyState.className = "wm-product-pitch-empty-state";
  emptyState.innerHTML = `
    <div class="wm-product-pitch-empty-icon">⌕</div>
    <div>
      <strong>Start with a SKU, product family, or requirement.</strong>
      <p>No product cards are shown until the user searches or filters. This page is for choosing the product only.</p>
    </div>
  `;

  const searchInput = findSearchInput(section);
  const searchWrapper = searchInput?.closest("div");

  if (searchWrapper?.parentElement) {
    searchWrapper.parentElement.insertBefore(emptyState, searchWrapper.nextSibling);
    return emptyState;
  }

  section.appendChild(emptyState);
  return emptyState;
}

function ensureLandingInstruction(section: HTMLElement): HTMLElement {
  const existing = document.querySelector<HTMLElement>(".wm-product-pitch-result-empty");

  if (existing) return existing;

  const prompt = document.createElement("section");
  prompt.className = "wm-product-pitch-result-empty";

  section.insertAdjacentElement("afterend", prompt);

  return prompt;
}

function updateLandingView(): void {
  const chooseSection = findChooseProductSection();
  const pitchSection = findPitchResultSection();

  if (!chooseSection) return;

  setHidden(chooseSection, false);
  setHidden(pitchSection, true);

  const hasCriteria = hasActiveProductCriteria(chooseSection);
  const cards = getProductCards(chooseSection);
  const emptyState = ensureLandingEmptyState(chooseSection);
  const instruction = ensureLandingInstruction(chooseSection);

  chooseSection.dataset.wmProductPitchHasCriteria = hasCriteria ? "true" : "false";

  cards.forEach((card) => {
    setCardVisibility(card, hasCriteria);
  });

  emptyState.hidden = hasCriteria;

  instruction.hidden = false;

  if (!hasCriteria) {
    instruction.innerHTML = `
      <strong>No product selected yet.</strong>
      <p>Search by SKU, product family, or requirement. Matching product cards will appear here.</p>
    `;
    return;
  }

  instruction.innerHTML = `
    <strong>Select one product card.</strong>
    <p>Click a SKU above. Wingman will open the product pitch on a separate result page.</p>
  `;
}

function cleanStoredResultHtml(section: HTMLElement, sku: string): string {
  const clone = section.cloneNode(true) as HTMLElement;

  clone.hidden = false;
  clone.classList.remove("wm-product-pitch-route-hidden");
  clone.style.removeProperty("display");
  clone.style.removeProperty("visibility");

  clone.querySelectorAll<HTMLElement>(".wm-product-pitch-route-hidden").forEach((element) => {
    element.classList.remove("wm-product-pitch-route-hidden");
    element.hidden = false;
    element.style.removeProperty("display");
    element.style.removeProperty("visibility");
  });

  clone.dataset.wmPitchResultSku = sku;

  return clone.outerHTML;
}

function savePitchResultFromCurrentPage(card: HTMLElement): StoredPitchResult | null {
  const sku = extractSkuFromText(card.textContent || "");

  if (!sku) return null;

  const resultSection = findPitchResultSection();

  if (!resultSection) return null;

  const title = normaliseText(card.textContent).slice(0, 140);
  const stored: StoredPitchResult = {
    sku,
    title,
    html: cleanStoredResultHtml(resultSection, sku),
    savedAt: Date.now(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

  return stored;
}

function readStoredPitchResult(): StoredPitchResult | null {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredPitchResult;

    if (!parsed.sku) return null;
    if (!parsed.html) return null;

    return parsed;
  } catch {
    return null;
  }
}

function navigateToResultPage(stored: StoredPitchResult): void {
  const url = new URL(window.location.href);
  url.searchParams.set("pitchView", "result");
  url.searchParams.set("pitchSku", stored.sku);

  window.location.assign(url.toString());
}

function handleProductCardClick(event: MouseEvent): void {
  if (!isProductPitchPage()) return;
  if (isResultView()) return;

  const chooseSection = findChooseProductSection();

  if (!chooseSection) return;

  const target = event.target;

  if (!(target instanceof HTMLElement)) return;

  const cards = getProductCards(chooseSection);
  const clickedCard = cards.find((card) => card.contains(target)) ?? null;

  if (!clickedCard) return;

  window.setTimeout(() => {
    const stored = savePitchResultFromCurrentPage(clickedCard);

    if (!stored) return;

    navigateToResultPage(stored);
  }, 260);
}

function backToLanding(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("pitchView");
  url.searchParams.delete("pitchSku");

  window.location.assign(url.toString());
}

function copyResultSummary(): void {
  const body = document.querySelector<HTMLElement>(".wm-product-pitch-result-body");

  if (!body) return;

  const text = normaliseText(body.innerText || body.textContent);

  if (!text) return;

  void navigator.clipboard.writeText(text);
}

function ensureResultRouteContainer(): HTMLElement {
  const existing = document.querySelector<HTMLElement>(".wm-product-pitch-result-route");

  if (existing) return existing;

  const container = document.createElement("section");
  container.className = "wm-product-pitch-result-route";

  const chooseSection = findChooseProductSection();

  if (chooseSection) {
    chooseSection.insertAdjacentElement("beforebegin", container);
    return container;
  }

  findShell().appendChild(container);
  return container;
}

function renderResultView(): void {
  const chooseSection = findChooseProductSection();
  const livePitchSection = findPitchResultSection();

  setHidden(chooseSection, true);
  setHidden(livePitchSection, true);

  const route = ensureResultRouteContainer();
  const stored = readStoredPitchResult();
  const urlSku = resultSkuFromUrl();

  if (!stored || stored.sku !== urlSku) {
    route.innerHTML = `
      <div class="wm-product-pitch-result-header">
        <div>
          <span>Product Pitch</span>
          <h2>No pitch result available</h2>
          <p>Return to the Product Pitch landing page and select a product card.</p>
        </div>
        <button type="button" class="wm-product-pitch-back">Back to product picker</button>
      </div>
    `;

    route.querySelector<HTMLButtonElement>(".wm-product-pitch-back")?.addEventListener("click", backToLanding);
    return;
  }

  route.innerHTML = `
    <div class="wm-product-pitch-result-header">
      <div>
        <span>Product Pitch Result</span>
        <h2>${stored.sku}</h2>
        <p>${stored.title}</p>
      </div>
      <div class="wm-product-pitch-result-actions">
        <button type="button" class="wm-product-pitch-copy">Copy summary</button>
        <button type="button" class="wm-product-pitch-back">Back to product picker</button>
      </div>
    </div>
    <div class="wm-product-pitch-result-body">
      ${stored.html}
    </div>
  `;

  route.querySelector<HTMLButtonElement>(".wm-product-pitch-back")?.addEventListener("click", backToLanding);
  route.querySelector<HTMLButtonElement>(".wm-product-pitch-copy")?.addEventListener("click", copyResultSummary);
}

function splitPitchSections(root: HTMLElement): void {
  const blocks = Array.from(root.querySelectorAll<HTMLElement>("div, article, section")).filter((element) => {
    const text = normaliseText(element.textContent);

    if (text.length < 60) return false;
    if (text.length > 1800) return false;
    if (element.querySelector(".wm-pitch-section-label")) return false;

    return true;
  });

  blocks.forEach((block) => {
    const text = normaliseText(block.textContent).toLowerCase();
    let label = "";

    if (text.includes("overview") || text.includes("positioning")) {
      label = "1. Positioning";
    }

    if (text.includes("best fit") || text.includes("use when")) {
      label = "2. Best-fit use case";
    }

    if (text.includes("talk track") || text.includes("what to say")) {
      label = "3. Talk track";
    }

    if (text.includes("questions to ask")) {
      label = "4. Qualification questions";
    }

    if (text.includes("feature") || text.includes("useful feature")) {
      label = "5. Feature cues";
    }

    if (!label) return;

    block.classList.add("wm-pitch-output-section");

    const badge = document.createElement("div");
    badge.className = "wm-pitch-section-label";
    badge.textContent = label;
    block.insertBefore(badge, block.firstChild);
  });
}

function reconcileProductPitchPage(): void {
  if (!isProductPitchPage()) return;

  if (isResultView()) {
    renderResultView();

    const route = document.querySelector<HTMLElement>(".wm-product-pitch-result-route");
    if (route) splitPitchSections(route);

    return;
  }

  const resultRoute = document.querySelector<HTMLElement>(".wm-product-pitch-result-route");

  if (resultRoute) {
    resultRoute.remove();
  }

  updateLandingView();
}

let reconcileQueued = false;

function scheduleReconcile(): void {
  if (reconcileQueued) return;

  reconcileQueued = true;

  window.requestAnimationFrame(() => {
    reconcileQueued = false;
    reconcileProductPitchPage();
  });
}

export function installProductPitchPageEnhancer(): void {
  if (typeof window === "undefined") return;

  const alreadyInstalled = document.body.dataset.wmProductPitchEnhancerInstalled === "true";

  if (alreadyInstalled) return;

  document.body.dataset.wmProductPitchEnhancerInstalled = "true";

  document.addEventListener("input", scheduleReconcile, true);
  document.addEventListener("change", scheduleReconcile, true);
  document.addEventListener("click", handleProductCardClick, true);

  window.addEventListener("popstate", scheduleReconcile);
  window.addEventListener("hashchange", scheduleReconcile);

  const observer = new MutationObserver(scheduleReconcile);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleReconcile, { once: true });
    return;
  }

  scheduleReconcile();
}