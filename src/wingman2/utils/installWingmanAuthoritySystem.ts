const ROUTE_PREFIX = "wm-route-";

function routeKeyFromPath(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? "dashboard";

  return last
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "dashboard";
}

function removeRouteClasses(): void {
  Array.from(document.body.classList).forEach((className) => {
    if (className.startsWith(ROUTE_PREFIX)) {
      document.body.classList.remove(className);
    }
  });
}

function updateRouteState(): void {
  const routeKey = routeKeyFromPath(window.location.pathname);

  document.body.classList.add("wm-authority-system");
  document.body.dataset.wmRoute = routeKey;

  removeRouteClasses();
  document.body.classList.add(`${ROUTE_PREFIX}${routeKey}`);
}

function openGuru(): void {
  const directTrigger = document.querySelector<HTMLButtonElement>(
    "[data-wingman-guru-trigger], .wingman-guru-fab button, button[aria-label*='Guru' i], button[aria-label*='WyreStorm expert' i]"
  );

  if (directTrigger) {
    directTrigger.click();
    return;
  }

  const textTrigger = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) => {
    const text = button.textContent?.toLowerCase() ?? "";
    return text.includes("guru") || text.includes("wyrestorm expert");
  });

  if (textTrigger) {
    textTrigger.click();
    return;
  }

  window.dispatchEvent(new CustomEvent("wingman:openGuru"));
}

function ensureSupportButton(): void {
  const oldCopyButton = document.querySelector<HTMLButtonElement>(".wm-copy-support-trigger");

  if (oldCopyButton) {
    oldCopyButton.remove();
  }

  const existing = document.querySelector<HTMLButtonElement>(".wm-authority-support-trigger");

  if (existing) {
    existing.onclick = openGuru;
    return;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "wm-authority-support-trigger";
  button.textContent = "Support";
  button.setAttribute("aria-label", "Ask Guru for page support");
  button.onclick = openGuru;

  document.body.appendChild(button);
}

function patchHistoryMethod(methodName: "pushState" | "replaceState"): void {
  const original = window.history[methodName];

  window.history[methodName] = function patchedHistoryMethod(...args) {
    const result = original.apply(this, args);
    window.requestAnimationFrame(updateRouteState);
    window.requestAnimationFrame(ensureSupportButton);
    return result;
  };
}

export function installWingmanAuthoritySystem(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (document.body.dataset.wmAuthoritySystemInstalled === "true") {
    updateRouteState();
    ensureSupportButton();
    return;
  }

  document.body.dataset.wmAuthoritySystemInstalled = "true";

  updateRouteState();
  ensureSupportButton();

  patchHistoryMethod("pushState");
  patchHistoryMethod("replaceState");

  window.addEventListener("popstate", updateRouteState);
  window.addEventListener("hashchange", updateRouteState);
}

