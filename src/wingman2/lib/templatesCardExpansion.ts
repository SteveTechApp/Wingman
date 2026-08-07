declare global {
  interface Window {
    __wingmanTemplateCardExpansionInstalled?: boolean;
  }
}

function isTemplatesRoute(): boolean {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return false;
  }

  const path = window.location.pathname.replace(/\/+$/, "");
  return path === "/wingman/templates" && Boolean(document.querySelector('[data-wingman-page="templates"]'));
}

function getTemplateArticles(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.wm-templates-page .wm-solution-card')).filter((article) => {
    if (!isTemplatesRoute()) {
      return false;
    }

    const hasTemplateText =
      article.textContent?.toLowerCase().includes("template") ||
      article.querySelector("button, a");

    const hasTitle = Boolean(article.querySelector("h3, h4"));

    return Boolean(hasTemplateText && hasTitle);
  });
}

function ensureCloseButton(article: HTMLElement): HTMLButtonElement {
  let button = article.querySelector<HTMLButtonElement>(":scope > .wm-template-card-close");

  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "wm-template-card-close";
    button.setAttribute("aria-label", "Close expanded template card");
    button.textContent = "Close";
    article.appendChild(button);
  }

  return button;
}

function closeExpandedTemplateCards(): void {
  for (const article of getTemplateArticles()) {
    article.removeAttribute("data-wm-template-card-expanded");
    article.removeAttribute("aria-expanded");
  }

  document.documentElement.removeAttribute("data-wm-template-card-open");
}

function expandTemplateCard(article: HTMLElement): void {
  for (const otherArticle of getTemplateArticles()) {
    if (otherArticle !== article) {
      otherArticle.removeAttribute("data-wm-template-card-expanded");
      otherArticle.removeAttribute("aria-expanded");
    }
  }

  ensureCloseButton(article);
  article.setAttribute("data-wm-template-card-expanded", "true");
  article.setAttribute("aria-expanded", "true");
  document.documentElement.setAttribute("data-wm-template-card-open", "true");
}

export function installTemplateCardExpansionController(): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  if (window.__wingmanTemplateCardExpansionInstalled) {
    return;
  }

  window.__wingmanTemplateCardExpansionInstalled = true;

  document.addEventListener("click", (event) => {
    if (!isTemplatesRoute()) {
      return;
    }

    const target = event.target as HTMLElement | null;

    if (!target) {
      return;
    }

    const closeButton = target.closest<HTMLButtonElement>(".wm-template-card-close");

    if (closeButton) {
      event.preventDefault();
      event.stopPropagation();
      closeExpandedTemplateCards();
      return;
    }

    const article = target.closest<HTMLElement>("main article");

    if (!article) {
      return;
    }

    const clickedInteractiveElement = target.closest("button, a, input, select, textarea, summary");

    if (
      clickedInteractiveElement &&
      clickedInteractiveElement !== article &&
      article.getAttribute("data-wm-template-card-expanded") === "true"
    ) {
      return;
    }

    event.preventDefault();
    expandTemplateCard(article);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isTemplatesRoute()) {
      closeExpandedTemplateCards();
    }
  });
}

export {};
