const FIELD_SELECTOR = "input, select, textarea";
const ASSIGNED_ATTR = "data-wm-field-identity";
const CLEAN_ID_PATTERN = /[^a-zA-Z0-9_-]+/g;

function routeKey() {
  const route = document.body.getAttribute("data-wm-route");

  if (route && route.trim().length > 0) {
    return route.trim();
  }

  const match = Array.from(document.body.classList).find((className) => className.startsWith("wm-route-"));

  if (match) {
    return match.replace("wm-route-", "");
  }

  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] || "wingman";
}

function cleanIdentifier(value: string) {
  const clean = value
    .trim()
    .replace(CLEAN_ID_PATTERN, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  if (clean.length > 0) {
    return clean.slice(0, 48);
  }

  return "field";
}

function fieldHint(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, index: number) {
  const existingName = field.getAttribute("name");
  const existingId = field.getAttribute("id");
  const aria = field.getAttribute("aria-label");
  const placeholder = field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
    ? field.getAttribute("placeholder")
    : "";
  const value =
    existingName ||
    existingId ||
    aria ||
    placeholder ||
    field.closest("label")?.textContent ||
    field.tagName.toLowerCase();

  return `${cleanIdentifier(value || "field")}-${index + 1}`;
}

function applyFieldIdentities() {
  const fields = Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(FIELD_SELECTOR));

  if (fields.length === 0) {
    return;
  }

  const route = cleanIdentifier(routeKey());
  const idCounts = new Map<string, number>();

  for (const field of fields) {
    const id = field.getAttribute("id");

    if (!id) {
      continue;
    }

    idCounts.set(id, (idCounts.get(id) || 0) + 1);
  }

  const usedIds = new Set<string>();

  fields.forEach((field, index) => {
    const currentId = field.getAttribute("id");
    const currentName = field.getAttribute("name");
    const hasDuplicateId = currentId ? (idCounts.get(currentId) || 0) > 1 : false;
    const needsId = !currentId || hasDuplicateId;
    const needsName = !currentName || currentName.trim().length === 0;

    if (!needsId && !needsName) {
      usedIds.add(currentId);
      return;
    }

    const assigned = field.getAttribute(ASSIGNED_ATTR);
    const hint = assigned || fieldHint(field, index);
    let nextId = `wm-${route}-${hint}`;
    let suffix = 2;

    while (usedIds.has(nextId)) {
      nextId = `wm-${route}-${hint}-${suffix}`;
      suffix += 1;
    }

    usedIds.add(nextId);
    field.setAttribute(ASSIGNED_ATTR, hint);

    if (needsId) {
      field.setAttribute("id", nextId);
    }

    if (needsName) {
      field.setAttribute("name", nextId);
    }
  });
}

export function installWingmanFormFieldIdentityGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const run = () => {
    applyFieldIdentities();
    window.setTimeout(applyFieldIdentities, 50);
    window.setTimeout(applyFieldIdentities, 250);
    window.setTimeout(applyFieldIdentities, 750);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  }

  if (document.readyState !== "loading") {
    run();
  }

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(applyFieldIdentities);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.addEventListener("popstate", run);
  window.addEventListener("hashchange", run);
  document.addEventListener("click", () => window.setTimeout(applyFieldIdentities, 50), true);
}