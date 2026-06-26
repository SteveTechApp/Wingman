function normaliseWingmanText(value: string | null | undefined): string {
 return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function isProductCallCardsRoute(): boolean {
 return window.location.pathname.includes("/wingman/product-call-cards");
}

function getPageHost(): HTMLElement | null {
 return document.querySelector(".wingman-page-host");
}

function findSmallPanelFromText(searchText: string): HTMLElement | null {
 const host = getPageHost();

 if (!host) {
 return null;
 }

 const target = searchText.toLowerCase();

 const matches = Array.from(host.querySelectorAll<HTMLElement>("*")).filter((element) => normaliseWingmanText(element.textContent).includes(target)).sort((a, b) => (a.textContent || "").length - (b.textContent || "").length);

 const match = matches[0];

 if (!match) {
 return null;
 }

 let current: HTMLElement | null = match;

 for (let i = 0; i < 5; i += 1) {
 if (!current || current === host) {
 return match.parentElement;
 }

 const style = window.getComputedStyle(current);
 const hasPanelShape =
 current.matches("section, article") ||
 style.borderTopWidth!== "0px" ||
 style.borderLeftWidth!== "0px" ||
 style.borderRightWidth!== "0px" ||
 style.borderBottomWidth!== "0px" ||
 style.borderRadius!== "0px";

 const rect = current.getBoundingClientRect();

 if (hasPanelShape && rect.height > 36 && rect.width > 160) {
 return current;
 }

 current = current.parentElement;
 }

 return match.parentElement;
}

function makeDisclosure(label: string, target: HTMLElement, key: string): void {
 const existing = target.previousElementSibling;

 if (existing?.classList.contains("wm-pcc-disclosure-button")) {
 return;
 }

 const button = document.createElement("button");
 button.type = "button";
 button.className = "wm-pcc-disclosure-button";

 const saved = window.localStorage.getItem(key);
 const open = saved === "open";

 target.classList.add("wm-pcc-collapsible-panel");
 target.hidden =!open;

 function render(): void {
 button.textContent = target.hidden? `Show ${label}`: `Hide ${label}`;
 }

 button.addEventListener("click", () => {
 target.hidden =!target.hidden;
 window.localStorage.setItem(key, target.hidden? "closed": "open");
 render();
 });

 render();
 target.insertAdjacentElement("beforebegin", button);
}

function simplifyButton(button: HTMLButtonElement, label: string, helper?: string): void {
 if (button.dataset.wmPccSimplified === "true") {
 return;
 }

 button.dataset.wmPccSimplified = "true";
 button.replaceChildren();

 const labelElement = document.createElement("strong");
 labelElement.textContent = label;
 button.appendChild(labelElement);

 if (helper) {
 const helperElement = document.createElement("span");
 helperElement.textContent = helper;
 button.appendChild(helperElement);
 }
}

function simplifyProductCallCardsButtons(): void {
 const host = getPageHost();

 if (!host) {
 return;
 }

 const buttons = Array.from(host.querySelectorAll<HTMLButtonElement>("button"));

 buttons.forEach((button) => {
 const text = normaliseWingmanText(button.textContent);

 if (text.includes("1. setup")) {
 simplifyButton(button, "1. Setup", "Voice");
 }

 if (text.includes("2. select")) {
 simplifyButton(button, "2. Select", "SKU");
 }

 if (text.includes("3. call card")) {
 simplifyButton(button, "3. Call card", "Use product");
 }

 if (text.includes("4. response")) {
 simplifyButton(button, "4. Response", "Copy wording");
 }

 if (text.startsWith("simple")) {
 simplifyButton(button, "Simple", "Plain wording");
 }

 if (text.startsWith("normal")) {
 simplifyButton(button, "Normal", "Balanced sales wording");
 }

 if (text.startsWith("advanced")) {
 simplifyButton(button, "Advanced", "Technical AV wording");
 }

 if (text.startsWith("sell this product")) {
 simplifyButton(button, "Sell this product");
 }

 if (text.startsWith("dealer enablement")) {
 simplifyButton(button, "Dealer enablement");
 }

 if (text.startsWith("consultant")) {
 simplifyButton(button, "Consultant / technical");
 }

 if (text.startsWith("end-user benefits")) {
 simplifyButton(button, "End-user benefits");
 }
 });
}

function compactProductCallCards(): void {
 if (!isProductCallCardsRoute()) {
 return;
 }

 const host = getPageHost();

 if (!host) {
 return;
 }

 host.classList.add("wm-pcc-compact-mode");

 const workflowPanel = findSmallPanelFromText("workflow rule");

 if (workflowPanel) {
 workflowPanel.classList.add("wm-pcc-hidden-panel");
 }

 const callModePanel = findSmallPanelFromText("call mode");

 if (callModePanel) {
 makeDisclosure("optional call context", callModePanel, "wingman-pcc-call-context");
 }

 const knownRequirementPanel = findSmallPanelFromText("known requirement");

 if (knownRequirementPanel) {
 makeDisclosure("known requirement", knownRequirementPanel, "wingman-pcc-known-requirement");
 }

 simplifyProductCallCardsButtons();
}

compactProductCallCards();

const wingmanProductCallCardsObserver = new MutationObserver(() => {
 window.requestAnimationFrame(compactProductCallCards);
});

wingmanProductCallCardsObserver.observe(document.body, {
 childList: true,
 subtree: true,
});

window.addEventListener("popstate", compactProductCallCards);
window.addEventListener("resize", compactProductCallCards);

export {};
