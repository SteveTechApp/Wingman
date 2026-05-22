type OutputCardInfo = {
  card: HTMLElement;
  typeText: string;
  locationText: string;
  behaviourText: string;
  distanceText: string;
  connectedFromText: string;
};

function normaliseText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function selectedText(select: HTMLSelectElement | undefined): string {
  if (!select) return "Not specified";
  const option = select.selectedOptions?.[0];
  return normaliseText(option?.textContent || select.value || "Not specified");
}

function findWingmanShell(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".wingman-shell");
}

function elementHasExactText(element: Element, text: string): boolean {
  return normaliseText(element.textContent).toUpperCase() === text.toUpperCase();
}

function findOutputMarkers(shell: HTMLElement): Element[] {
  return Array.from(shell.querySelectorAll("*")).filter((element) => {
    if (element.children.length > 0) return false;
    return elementHasExactText(element, "OUTPUT TYPE");
  });
}

function findOutputCard(marker: Element, shell: HTMLElement): HTMLElement | null {
  let node = marker.parentElement;

  while (node && node !== shell) {
    const text = normaliseText(node.textContent);
    const hasOutputNotes = text.includes("OUTPUT NOTES");
    const hasRemoveOutput = text.includes("Remove output");
    const hasConnectedFrom = text.includes("CONNECTED FROM");

    if (hasOutputNotes && hasRemoveOutput && hasConnectedFrom) {
      return node;
    }

    node = node.parentElement;
  }

  return null;
}

function readOutputCard(card: HTMLElement): OutputCardInfo {
  const selects = Array.from(card.querySelectorAll("select")) as HTMLSelectElement[];

  return {
    card,
    typeText: selectedText(selects[0]),
    locationText: selectedText(selects[1]),
    behaviourText: selectedText(selects[2]),
    distanceText: selectedText(selects[3]),
    connectedFromText: selectedText(selects[4]),
  };
}

function outputCountFor(info: OutputCardInfo): number {
  const type = info.typeText.toLowerCase();
  const behaviour = info.behaviourText.toLowerCase();

  if (type.includes("dual")) return 2;
  if (type.includes("two")) return 2;
  if (type.includes("duplicated")) return 2;
  if (behaviour.includes("duplicated") && type.includes("display")) return 2;
  if (behaviour.includes("mirror") && type.includes("display")) return 2;

  return 1;
}

function behaviourLabel(info: OutputCardInfo, count: number): string {
  const behaviour = info.behaviourText.toLowerCase();

  if (count > 1 && behaviour.includes("duplicated")) {
    return "Duplicated image — both displays match";
  }

  if (count > 1 && behaviour.includes("mirror")) {
    return "Mirrored image — both displays match";
  }

  if (count > 1) {
    return "Linked display pair";
  }

  return info.behaviourText;
}

function displayName(index: number, count: number): string {
  if (count === 1) return "Display output";
  return `Display ${index + 1}`;
}

function renderPreview(info: OutputCardInfo): string {
  const count = outputCountFor(info);
  const tiles = Array.from({ length: count }, (_, index) => {
    const title = displayName(index, count);

    return `
      <div class="wm-output-preview-tile">
        <div class="wm-output-preview-screen">
          <span>${title}</span>
        </div>
        <div class="wm-output-preview-meta">
          <strong>${title}</strong>
          <span>${info.locationText}</span>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="wm-output-preview-heading">
      <div>
        <span>Physical display outputs</span>
        <strong>x${count}</strong>
      </div>
      <p>${behaviourLabel(info, count)}</p>
    </div>

    <div class="wm-output-preview-tiles" data-count="${count}">
      ${tiles}
    </div>

    <div class="wm-output-preview-flow">
      <span>Fed from</span>
      <strong>${info.connectedFromText}</strong>
      <span>Approx. route</span>
      <strong>${info.distanceText}</strong>
    </div>
  `;
}

function updateCard(card: HTMLElement): void {
  const info = readOutputCard(card);
  let preview = card.querySelector<HTMLElement>(".wm-output-preview-panel");

  if (!preview) {
    preview = document.createElement("div");
    preview.className = "wm-output-preview-panel";
    preview.setAttribute("aria-hidden", "true");
    card.appendChild(preview);
  }

  card.setAttribute("data-wm-output-preview-host", "true");
  card.setAttribute("data-wm-output-preview-count", String(outputCountFor(info)));
  preview.innerHTML = renderPreview(info);
}

function reconcileOutputPreviews(): void {
  const shell = findWingmanShell();
  if (!shell) return;

  const markers = findOutputMarkers(shell);
  const cards = new Set<HTMLElement>();

  markers.forEach((marker) => {
    const card = findOutputCard(marker, shell);
    if (!card) return;
    cards.add(card);
  });

  cards.forEach(updateCard);
}

function scheduleReconcile(): void {
  window.requestAnimationFrame(() => {
    reconcileOutputPreviews();
  });
}

export function installDiscoveryOutputPreviewEnhancer(): void {
  if (typeof window === "undefined") return;

  const alreadyInstalled = document.body.dataset.wmDiscoveryOutputPreviewInstalled === "true";
  if (alreadyInstalled) return;

  document.body.dataset.wmDiscoveryOutputPreviewInstalled = "true";

  document.addEventListener("change", scheduleReconcile, true);
  document.addEventListener("input", scheduleReconcile, true);

  const observer = new MutationObserver(scheduleReconcile);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleReconcile, { once: true });
    return;
  }

  scheduleReconcile();
}