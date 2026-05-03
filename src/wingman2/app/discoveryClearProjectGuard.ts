const DISCOVERY_PATH_PATTERN = /(?:^|\/)(wingman\/discovery|app\/tools\/discovery|discovery)(?:\/|$)/i;
const MODAL_ID = "wm-clear-project-confirm-modal";

function isDiscoveryPath(): boolean {
  return DISCOVERY_PATH_PATTERN.test(window.location.pathname);
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function isClearCurrentProjectButton(element: Element | null): boolean {
  if (!element) {
    return false;
  }

  const button = element.closest("button");

  if (!button) {
    return false;
  }

  const label = normalize(button.textContent).toLowerCase();

  return label.includes("clear current project");
}

function shouldClearStorageKey(key: string): boolean {
  const normalizedKey = key.toLowerCase();

  if (normalizedKey.includes("discovery")) {
    return true;
  }

  if (normalizedKey.includes("currentproject")) {
    return true;
  }

  if (normalizedKey.includes("current-project")) {
    return true;
  }

  if (normalizedKey.includes("activeproject")) {
    return true;
  }

  if (normalizedKey.includes("active-project")) {
    return true;
  }

  if (normalizedKey.includes("projectdraft")) {
    return true;
  }

  if (normalizedKey.includes("project-draft")) {
    return true;
  }

  if (normalizedKey.includes("answermemory")) {
    return true;
  }

  if (normalizedKey.includes("answer-memory")) {
    return true;
  }

  if (normalizedKey.includes("brief-so-far")) {
    return true;
  }

  if (normalizedKey.includes("briefsofar")) {
    return true;
  }

  return false;
}

function removeMatchingStorageKeys(storage: Storage): void {
  const keys: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);

    if (!key) {
      continue;
    }

    if (!shouldClearStorageKey(key)) {
      continue;
    }

    keys.push(key);
  }

  keys.forEach((key) => storage.removeItem(key));
}

function clearVisibleDiscoveryFields(): void {
  const main = document.querySelector("main");

  if (!main) {
    return;
  }

  const fields = main.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    "input, select, textarea"
  );

  fields.forEach((field) => {
    if (field instanceof HTMLSelectElement) {
      field.selectedIndex = 0;
      field.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) {
      field.checked = false;
      field.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    field.value = "";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function clearCurrentProject(): void {
  removeMatchingStorageKeys(window.sessionStorage);
  removeMatchingStorageKeys(window.localStorage);

  window.sessionStorage.removeItem("wm.discovery.answerMemory.v1");
  window.sessionStorage.removeItem("wm.discovery.answerMemory.v2");
  window.localStorage.removeItem("wm.discovery.answerMemory.v1");
  window.localStorage.removeItem("wm.discovery.answerMemory.v2");

  clearVisibleDiscoveryFields();

  window.dispatchEvent(new Event("wm:clear-current-project"));
  window.dispatchEvent(new Event("wm:navigation"));

  window.setTimeout(() => {
    window.location.reload();
  }, 120);
}

function closeModal(): void {
  document.getElementById(MODAL_ID)?.remove();
  document.body.classList.remove("wm-clear-project-modal-open");
}

function showConfirmModal(): void {
  document.getElementById(MODAL_ID)?.remove();

  const modal = document.createElement("div");
  modal.id = MODAL_ID;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "wm-clear-project-title");

  modal.innerHTML = `
    <div class="wm-clear-project-backdrop" data-wm-clear-cancel></div>
    <section class="wm-clear-project-panel">
      <div class="wm-clear-project-icon">!</div>
      <div class="wm-clear-project-copy">
        <p class="wm-clear-project-kicker">Clear current project</p>
        <h2 id="wm-clear-project-title">Are you sure?</h2>
        <p>This will clear the current Discovery project and reset the answers captured in this working session.</p>
      </div>
      <div class="wm-clear-project-actions">
        <button type="button" class="wm-clear-project-secondary" data-wm-clear-cancel>No, keep it</button>
        <button type="button" class="wm-clear-project-danger" data-wm-clear-confirm>Yes, clear it</button>
      </div>
    </section>
  `;

  document.body.appendChild(modal);
  document.body.classList.add("wm-clear-project-modal-open");

  modal.querySelector("[data-wm-clear-cancel]")?.addEventListener("click", closeModal);

  modal.querySelector("[data-wm-clear-confirm]")?.addEventListener("click", () => {
    closeModal();
    clearCurrentProject();
  });

  window.setTimeout(() => {
    const cancelButton = modal.querySelector<HTMLButtonElement>("[data-wm-clear-cancel]");
    cancelButton?.focus();
  }, 0);
}

function handleDocumentClick(event: MouseEvent): void {
  if (!isDiscoveryPath()) {
    return;
  }

  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  if (!isClearCurrentProjectButton(target)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  showConfirmModal();
}

function handleDocumentKeyDown(event: KeyboardEvent): void {
  if (event.key !== "Escape") {
    return;
  }

  if (!document.getElementById(MODAL_ID)) {
    return;
  }

  event.preventDefault();
  closeModal();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", handleDocumentClick, true);
  document.addEventListener("keydown", handleDocumentKeyDown, true);
}

export {};