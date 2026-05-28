const hiddenCardTitles = ["Product Finder", "Video Wall Builder", "Proposal Builder"];

function textOf(element: HTMLElement): string {
  return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

function visible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
}

function dashboardPath(): boolean {
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, "");
  return path === "/wingman" || path === "/wingman/dashboard";
}

function inSidebar(element: HTMLElement): boolean {
  const holder = element.closest("aside,nav");
  if (!(holder instanceof HTMLElement)) return false;

  const rect = holder.getBoundingClientRect();
  return rect.left < 25 && rect.right < 350;
}

function inTopbar(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.top >= 0 && rect.top < 125 && rect.left > 220 && rect.height < 105;
}

function hide(element: HTMLElement | null): void {
  if (!element) return;

  element.setAttribute("aria-hidden", "true");
  element.style.setProperty("display", "none", "important");
}

function nearestSmallContainer(element: HTMLElement): HTMLElement {
  let current: HTMLElement | null = element;
  let depth = 0;

  while (current && current !== document.body && depth < 8) {
    const rect = current.getBoundingClientRect();

    if (rect.width > 0 && rect.width < 650 && rect.height > 0 && rect.height < 115 && !inSidebar(current)) {
      return current;
    }

    current = current.parentElement;
    depth += 1;
  }

  return element;
}

function nearestCard(element: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = element;
  let depth = 0;

  while (current && current !== document.body && depth < 10) {
    if (inSidebar(current)) return null;

    const rect = current.getBoundingClientRect();
    const isClickable = current.matches("a[href],button,[role='button']");
    const looksLikeCard = rect.left > 220 && rect.width > 240 && rect.height > 70 && rect.height < 250;

    if (isClickable && looksLikeCard) return current;

    if (looksLikeCard && /card|tile|action|rounded|shadow|border|panel/i.test(String(current.className ?? ""))) {
      return current;
    }

    current = current.parentElement;
    depth += 1;
  }

  return null;
}

function hideDashboardCards(): void {
  if (!dashboardPath()) return;

  const elements = Array.from(document.querySelectorAll<HTMLElement>("main *"));

  for (const element of elements) {
    if (!visible(element)) continue;

    const text = textOf(element);

    for (const title of hiddenCardTitles) {
      if (text !== title) continue;
      hide(nearestCard(element));
    }
  }
}

function hideTopbarModeAndSearch(): void {
  const elements = Array.from(document.querySelectorAll<HTMLElement>("button,a,span,div,input,kbd,[role='button']"));

  for (const element of elements) {
    if (!visible(element)) continue;
    if (!inTopbar(element)) continue;

    const text = textOf(element);
    const placeholder = element instanceof HTMLInputElement ? element.placeholder.toLowerCase() : "";

    if (/^(s\s*)?sales$/i.test(text) || /^(p\s*)?pitch$/i.test(text) || /^(t\s*)?tech(nical)?$/i.test(text)) {
      const clickable = element.closest("button,a,[role='button']");
      hide(clickable instanceof HTMLElement ? clickable : nearestSmallContainer(element));
      continue;
    }

    if (placeholder.includes("search")) {
      hide(nearestSmallContainer(element));
      continue;
    }

    if (/\bctrl\b/i.test(text)) {
      hide(nearestSmallContainer(element));
      continue;
    }
  }
}

function hideRightIconsAfterNewProject(): void {
  const clickables = Array.from(document.querySelectorAll<HTMLElement>("button,a,[role='button']"));
  let newProjectRight = 0;

  for (const element of clickables) {
    if (!visible(element)) continue;
    if (!inTopbar(element)) continue;
    if (!textOf(element).includes("New Project")) continue;

    newProjectRight = element.getBoundingClientRect().right;
  }

  if (newProjectRight <= 0) return;

  for (const element of clickables) {
    if (!visible(element)) continue;
    if (!inTopbar(element)) continue;
    if (textOf(element).includes("New Project")) continue;

    const rect = element.getBoundingClientRect();

    if (rect.left > newProjectRight + 8) {
      hide(element);
    }
  }
}

function run(): void {
  hideTopbarModeAndSearch();
  hideRightIconsAfterNewProject();
  hideDashboardCards();
}

let scheduled = false;

function schedule(): void {
  if (scheduled) return;

  scheduled = true;

  window.setTimeout(() => {
    scheduled = false;
    run();
  }, 80);
}

run();

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
});

window.addEventListener("resize", schedule);
window.addEventListener("popstate", schedule);

export {};