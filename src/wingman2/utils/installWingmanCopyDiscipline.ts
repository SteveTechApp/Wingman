import "../styles/wingman-copy-discipline.css";

type SupportItem = {
  context: string;
  text: string;
};

const MIN_SUPPORT_COPY_LENGTH = 110;
const MIN_CLAMP_COPY_LENGTH = 72;

const blockedSelectors = [
  "nav",
  "header",
  "footer",
  "aside",
  "button",
  "label",
  "input",
  "select",
  "textarea",
  "[contenteditable='true']",
  ".wm-copy-support-drawer",
  ".wm-copy-support-trigger",
  ".wm-copy-guru-action",
  "[class*='proposal' i]",
  "[class*='summary-output' i]",
  "[class*='result' i]",
  "[class*='answer' i]"
];

const heroSelectors = [
  "[class*='hero' i]",
  "[class*='Hero' i]",
  ".page-hero",
  ".wingman-page-hero"
];

function cleanText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[•\-\u2013\u2014]\s*/, "")
    .trim();
}

function isBlocked(element: Element): boolean {
  return blockedSelectors.some((selector) => Boolean(element.closest(selector)));
}

function isHeroCopy(element: Element): boolean {
  return heroSelectors.some((selector) => Boolean(element.closest(selector)));
}

function findContext(element: Element): string {
  const localHeading = element
    .closest("section, article, div")
    ?.querySelector("h1, h2, h3, h4, h5, h6");

  const localText = localHeading?.textContent;

  if (localText && cleanText(localText).length > 0) {
    return cleanText(localText);
  }

  const headings = Array.from(document.querySelectorAll("main h1, main h2, main h3, main h4"));
  const elementTop = element.getBoundingClientRect().top;

  const previous = headings
    .filter((heading) => heading.getBoundingClientRect().top <= elementTop)
    .pop();

  const previousText = previous?.textContent;

  if (previousText && cleanText(previousText).length > 0) {
    return cleanText(previousText);
  }

  return "Page guidance";
}

function shouldBecomeSupportCopy(element: Element, text: string): boolean {
  if (text.length < MIN_SUPPORT_COPY_LENGTH) {
    return false;
  }

  if (isBlocked(element)) {
    return false;
  }

  if (isHeroCopy(element)) {
    const heroParent = heroSelectors
      .map((selector) => element.closest(selector))
      .find(Boolean);

    if (!heroParent) {
      return false;
    }

    const heroParagraphs = Array.from(heroParent.querySelectorAll("p"));
    const firstHeroParagraph = heroParagraphs[0];

    if (firstHeroParagraph === element) {
      return false;
    }

    return true;
  }

  return true;
}

function shouldClampCopy(element: Element, text: string): boolean {
  if (text.length < MIN_CLAMP_COPY_LENGTH) {
    return false;
  }

  if (text.length >= MIN_SUPPORT_COPY_LENGTH) {
    return false;
  }

  if (isBlocked(element)) {
    return false;
  }

  if (isHeroCopy(element)) {
    return false;
  }

  return true;
}

function collectSupportItems(): SupportItem[] {
  const seen = new Set<string>();
  const items: SupportItem[] = [];

  const copyElements = Array.from(
    document.querySelectorAll("main p, main li")
  );

  copyElements.forEach((element) => {
    const text = cleanText(element.textContent ?? "");

    if (shouldClampCopy(element, text)) {
      element.classList.add("wm-copy-clamp-source");
    }

    if (!shouldBecomeSupportCopy(element, text)) {
      return;
    }

    element.classList.add("wm-copy-secondary-source");

    const key = text.toLowerCase();

    if (seen.has(key)) {
      return;
    }

    seen.add(key);

    items.push({
      context: findContext(element),
      text
    });
  });

  return items.slice(0, 24);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openGuru(): void {
  const trigger = document.querySelector<HTMLElement>(
    "[data-wingman-guru-trigger], [aria-label*='Guru' i], [class*='guru' i] button, button[class*='guru' i]"
  );

  if (trigger) {
    trigger.click();
    return;
  }

  window.dispatchEvent(new CustomEvent("wingman:openGuru"));
}

function renderSupportDrawer(items: SupportItem[]): void {
  let trigger = document.querySelector<HTMLButtonElement>(".wm-copy-support-trigger");
  let drawer = document.querySelector<HTMLElement>(".wm-copy-support-drawer");

  if (!trigger) {
    trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "wm-copy-support-trigger";
    trigger.textContent = "Support";
    document.body.appendChild(trigger);
  }

  if (!drawer) {
    drawer = document.createElement("section");
    drawer.className = "wm-copy-support-drawer";
    drawer.setAttribute("aria-label", "Wingman page support notes");
    document.body.appendChild(drawer);
  }

  const bodyHtml = items.length
    ? items.map((item) => {
        return `
          <article class="wm-copy-support-item">
            <p class="wm-copy-support-context">${escapeHtml(item.context)}</p>
            <p class="wm-copy-support-copy">${escapeHtml(item.text)}</p>
          </article>
        `;
      }).join("")
    : `<p class="wm-copy-support-empty">No extra page guidance was found. Use Guru for product or workflow help.</p>`;

  drawer.innerHTML = `
    <div class="wm-copy-support-head">
      <div>
        <p class="wm-copy-support-title">Support notes</p>
        <p class="wm-copy-support-subtitle">Extra guidance moved out of the main workflow to keep the page focused.</p>
      </div>
      <button class="wm-copy-support-close" type="button" aria-label="Close support notes">×</button>
    </div>
    <div class="wm-copy-support-body">${bodyHtml}</div>
    <button class="wm-copy-guru-action" type="button">Ask Guru for help with this page</button>
  `;

  trigger.onclick = () => {
    drawer?.classList.toggle("is-open");
  };

  drawer.querySelector<HTMLButtonElement>(".wm-copy-support-close")?.addEventListener("click", () => {
    drawer?.classList.remove("is-open");
  });

  drawer.querySelector<HTMLButtonElement>(".wm-copy-guru-action")?.addEventListener("click", () => {
    drawer?.classList.remove("is-open");
    openGuru();
  });

  if (items.length === 0) {
    trigger.style.display = "none";
    return;
  }

  trigger.style.display = "";
}

function refreshCopyDiscipline(): void {
  document.body.classList.add("wm-copy-discipline-mode");
  const items = collectSupportItems();
  renderSupportDrawer(items);
}

export function installWingmanCopyDiscipline(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (document.body.dataset.wmCopyDisciplineInstalled === "true") {
    return;
  }

  document.body.dataset.wmCopyDisciplineInstalled = "true";

  const run = () => {
    window.requestAnimationFrame(refreshCopyDiscipline);
  };

  run();

  const observer = new MutationObserver(() => {
    run();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  window.addEventListener("popstate", run);
  window.addEventListener("hashchange", run);
}