import { useEffect } from "react";

function setImportant(element: HTMLElement, property: string, value: string): void {
  element.style.setProperty(property, value, "important");
}

function isInsideSidebar(element: Element): boolean {
  return Boolean(
    element.closest("aside") ||
      element.closest("nav[aria-label*='navigation' i]") ||
      element.closest("[class*='sidebar' i]")
  );
}

function findUsefulPanel(start: HTMLElement): HTMLElement {
  let current: HTMLElement | null = start;
  let best = start;

  for (let depth = 0; depth < 6; depth += 1) {
    if (!current || current === document.body) {
      break;
    }

    const rect = current.getBoundingClientRect();

    if (rect.width > 520 && rect.height > 70 && !isInsideSidebar(current)) {
      best = current;
    }

    current = current.parentElement;
  }

  return best;
}

function markHeroPanels(): void {
  const headings = Array.from(document.querySelectorAll("h1")) as HTMLElement[];

  headings.forEach((heading) => {
    if (isInsideSidebar(heading)) {
      return;
    }

    const text = heading.textContent?.trim().toLowerCase() ?? "";

    if (!text) {
      return;
    }

    const looksLikeWingmanHero =
      text.includes("choose a room template") ||
      text.includes("opportunity navigator") ||
      text.includes("find the right") ||
      text.includes("proposal") ||
      text.includes("competitor") ||
      text.includes("video wall") ||
      text.includes("product pitch") ||
      text.includes("visual studio") ||
      text.includes("discovery");

    if (!looksLikeWingmanHero) {
      return;
    }

    const panel = findUsefulPanel(heading);
    panel.classList.add("wm-runtime-hero-compact");

    setImportant(panel, "min-height", "0");
    setImportant(panel, "max-height", "88px");
    setImportant(panel, "padding", "12px 18px");
    setImportant(panel, "margin-top", "6px");
    setImportant(panel, "margin-bottom", "10px");
    setImportant(panel, "overflow", "hidden");
    setImportant(panel, "border-radius", "18px");

    setImportant(heading, "font-size", "clamp(1.45rem, 2.15vw, 2.25rem)");
    setImportant(heading, "line-height", "0.98");
    setImportant(heading, "margin", "0");

    const paragraphs = Array.from(panel.querySelectorAll("p")) as HTMLElement[];
    paragraphs.forEach((paragraph) => {
      setImportant(paragraph, "display", "none");
    });
  });
}

function markWorkspacePanels(): void {
  const candidates = Array.from(document.querySelectorAll("h1,h2,h3,p,span")) as HTMLElement[];

  candidates.forEach((candidate) => {
    if (isInsideSidebar(candidate)) {
      return;
    }

    const text = candidate.textContent?.trim().toLowerCase() ?? "";

    const looksLikeWorkspace =
      text.includes("wingman workspace") ||
      text === "choose a room template" ||
      text === "guided product finder" ||
      text.includes("all templates") ||
      text.includes("search templates");

    if (!looksLikeWorkspace) {
      return;
    }

    const panel = findUsefulPanel(candidate);
    panel.classList.add("wm-runtime-workspace-compact");

    setImportant(panel, "margin-top", "8px");
    setImportant(panel, "padding", "10px");
    setImportant(panel, "border-radius", "18px");
    setImportant(panel, "min-height", "calc(100vh - 292px)");
  });
}

function releaseTemplateResultArea(): void {
  const path = window.location.pathname.toLowerCase();

  if (!path.includes("/wingman/templates")) {
    return;
  }

  document.body.classList.add("wm-runtime-template-density");

  const inputs = Array.from(document.querySelectorAll("input")) as HTMLInputElement[];
  const searchInput = inputs.find((input) => {
    const placeholder = input.placeholder.toLowerCase();
    return placeholder.includes("search") && placeholder.includes("template");
  });

  if (!searchInput) {
    return;
  }

  setImportant(searchInput, "height", "30px");
  setImportant(searchInput, "min-height", "30px");
  setImportant(searchInput, "padding-top", "4px");
  setImportant(searchInput, "padding-bottom", "4px");

  const searchPanel = findUsefulPanel(searchInput);
  searchPanel.classList.add("wm-runtime-template-panel");
  setImportant(searchPanel, "min-height", "calc(100vh - 300px)");
  setImportant(searchPanel, "max-height", "none");
  setImportant(searchPanel, "overflow", "visible");

  const descendants = Array.from(searchPanel.querySelectorAll("div,section,article")) as HTMLElement[];

  descendants.forEach((element) => {
    const rect = element.getBoundingClientRect();

    if (rect.height > 120 || element.scrollHeight > rect.height + 20) {
      setImportant(element, "max-height", "none");
    }

    const overflowY = window.getComputedStyle(element).overflowY;

    if (overflowY === "auto" || overflowY === "scroll") {
      setImportant(element, "overflow-y", "visible");
    }
  });

  const cards = Array.from(searchPanel.querySelectorAll("article, [class*='card' i], [class*='template' i]")) as HTMLElement[];

  cards.forEach((card) => {
    if (card === searchPanel) {
      return;
    }

    const rect = card.getBoundingClientRect();

    if (rect.width < 220 || rect.height < 80) {
      return;
    }

    card.classList.add("wm-runtime-template-card");
    setImportant(card, "min-height", "0");
    setImportant(card, "border-radius", "14px");
  });

  const images = Array.from(searchPanel.querySelectorAll("img")) as HTMLImageElement[];

  images.forEach((image) => {
    setImportant(image, "max-height", "118px");
    setImportant(image, "object-fit", "cover");
  });
}

function compactSidebar(): void {
  const sidebar = document.querySelector("aside") as HTMLElement | null;

  if (!sidebar) {
    return;
  }

  sidebar.classList.add("wm-runtime-sidebar-compact");

  const navItems = Array.from(sidebar.querySelectorAll("a,button")) as HTMLElement[];

  navItems.forEach((item) => {
    setImportant(item, "min-height", "32px");
    setImportant(item, "padding-top", "6px");
    setImportant(item, "padding-bottom", "6px");
  });

  const images = Array.from(sidebar.querySelectorAll("img")) as HTMLImageElement[];

  images.forEach((image) => {
    setImportant(image, "max-height", "58px");
    setImportant(image, "object-fit", "contain");
  });
}

function applyWingmanRuntimeDensity(): void {
  document.body.classList.add("wm-runtime-density-active");

  markHeroPanels();
  markWorkspacePanels();
  releaseTemplateResultArea();
  compactSidebar();
}

export default function WingmanRuntimeDensityController() {
  useEffect(() => {
    applyWingmanRuntimeDensity();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(applyWingmanRuntimeDensity);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.addEventListener("resize", applyWingmanRuntimeDensity);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", applyWingmanRuntimeDensity);
    };
  }, []);

  return null;
}