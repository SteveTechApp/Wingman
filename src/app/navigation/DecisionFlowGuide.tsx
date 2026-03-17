import * as React from "react";
import { useLocation } from "react-router-dom";

const FLOW_SECTION_CLASS = "wm-focus-flow__section";
const FLOW_ACTIVE_CLASS = "is-active-flow";
const FLOW_DIMMED_CLASS = "is-dimmed-flow";

const LAYOUT_CLASS_NAMES = [
  "wm-route-frame",
  "wm-route-frame__inner",
  "wm-page",
  "wm-dashboard",
  "wm-page-grid-sidebar",
  "wm-page-grid-2",
  "wm-section-stack",
  "wm-grid",
  "wm-grid-cards",
  "wm-project-overview-page__tab-body",
  "wm-video-wall-page__visual-workspace",
];

const INTERACTIVE_SELECTOR = [
  "input",
  "select",
  "textarea",
  "button",
  "details",
  "summary",
  "[role='tab']",
].join(",");

const SUMMARY_SELECTOR = [
  ".wm-summary-row",
  ".wm-video-wall-preview__meta-item",
  ".wm-project-overview-page__tab",
  "li",
].join(",");

function getScrollRoot(): HTMLElement | null {
  return document.querySelector(".wm-shell-main");
}

function getContentRoot(): HTMLElement | null {
  return document.querySelector(".wm-shell-content");
}

function isLayoutContainer(element: HTMLElement): boolean {
  return LAYOUT_CLASS_NAMES.some((name) => element.classList.contains(name));
}

function getSectionLabel(element: HTMLElement): string {
  const labelNode = element.querySelector<HTMLElement>(
    "h1, h2, h3, h4, .wm-card__title, .wm-section-title, .wm-dashboard__title, .wm-title-xl, .wm-title-lg, summary"
  );
  return labelNode?.innerText.trim() ?? "";
}

function isDecisionSection(element: HTMLElement): boolean {
  if (element.dataset.wmFlowIgnore === "true") return false;
  if (element.matches(".wm-dashboard__hero, .wm-hero, .wm-inline-actions, .wm-actions-row")) return false;
  if (element.closest("[data-wm-flow-ignore='true']")) return false;

  const looksLikeSection =
    element.hasAttribute("data-wm-flow-section") ||
    element.matches(".wm-card, .wm-section, .wm-work-card, article, section");
  if (!looksLikeSection) return false;

  const label = getSectionLabel(element);
  if (!label) return false;

  const interactiveCount = element.querySelectorAll(INTERACTIVE_SELECTOR).length;
  const summaryCount = element.querySelectorAll(SUMMARY_SELECTOR).length;
  const isCompact = element.offsetHeight > 0 && element.offsetHeight < 72;

  if (isCompact && interactiveCount === 0 && summaryCount < 2) return false;

  return interactiveCount > 0 || summaryCount >= 2 || element.querySelector(".wm-video-wall-preview") !== null;
}

function collectDecisionSections(root: HTMLElement): HTMLElement[] {
  const sections: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();

  function walk(container: HTMLElement, depth: number): void {
    if (depth > 5) return;

    Array.from(container.children).forEach((child) => {
      if (!(child instanceof HTMLElement)) return;
      if (child.dataset.wmFlowIgnore === "true") return;

      if (isDecisionSection(child)) {
        if (!seen.has(child)) {
          seen.add(child);
          sections.push(child);
        }
        return;
      }

      if (isLayoutContainer(child) || depth === 0) {
        walk(child, depth + 1);
      }
    });
  }

  walk(root, 0);
  return sections.filter((section) => !section.closest(`.${FLOW_SECTION_CLASS}`));
}

function findSectionIndex(sections: HTMLElement[], target: EventTarget | null): number {
  if (!(target instanceof HTMLElement)) return -1;
  return sections.findIndex((section) => section === target || section.contains(target));
}

export default function DecisionFlowGuide() {
  const location = useLocation();

  React.useEffect(() => {
    const scrollRoot = getScrollRoot();
    const contentRoot = getContentRoot();
    if (!scrollRoot || !contentRoot) return;

    let sections: HTMLElement[] = [];
    let activeIndex = -1;
    let scrollFrame = 0;
    let rescanTimer = 0;
    let autoScrollUntil = 0;

    const clearSectionClasses = () => {
      sections.forEach((section) => {
        section.classList.remove(FLOW_SECTION_CLASS, FLOW_ACTIVE_CLASS, FLOW_DIMMED_CLASS);
        delete section.dataset.wmFlowIndex;
      });
    };

    const setActiveSection = (index: number) => {
      if (index < 0 || index >= sections.length || index === activeIndex) return;

      activeIndex = index;
      sections.forEach((section, sectionIndex) => {
        section.classList.add(FLOW_SECTION_CLASS);
        section.classList.toggle(FLOW_ACTIVE_CLASS, sectionIndex === index);
        section.classList.toggle(FLOW_DIMMED_CLASS, sections.length > 1 && sectionIndex !== index);
      });
    };

    const focusFirstInteractive = (section: HTMLElement) => {
      const focusTarget = section.querySelector<HTMLElement>(
        "input, select, textarea, button, [role='tab'], summary"
      );
      focusTarget?.focus({ preventScroll: true });
    };

    const scrollToSection = (index: number) => {
      if (index < 0 || index >= sections.length) return;

      const section = sections[index];
      const rootRect = scrollRoot.getBoundingClientRect();
      const sectionRect = section.getBoundingClientRect();
      const top = scrollRoot.scrollTop + (sectionRect.top - rootRect.top) - 88;

      autoScrollUntil = Date.now() + 900;
      setActiveSection(index);
      scrollRoot.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      window.setTimeout(() => focusFirstInteractive(section), 260);
    };

    const updateActiveFromScroll = () => {
      if (Date.now() < autoScrollUntil || sections.length < 2) return;

      const rootRect = scrollRoot.getBoundingClientRect();
      const focusLine = rootRect.top + Math.min(220, rootRect.height * 0.24);

      let nextIndex = sections.findIndex((section) => section.getBoundingClientRect().bottom > focusLine);
      if (nextIndex === -1) {
        nextIndex = sections.length - 1;
      }
      setActiveSection(nextIndex);
    };

    const scheduleScrollUpdate = () => {
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      scrollFrame = window.requestAnimationFrame(updateActiveFromScroll);
    };

    const rescan = () => {
      clearSectionClasses();

      const routeRoot = Array.from(contentRoot.children).find(
        (child): child is HTMLElement => child instanceof HTMLElement && child.offsetParent !== null
      );
      if (!routeRoot) {
        sections = [];
        activeIndex = -1;
        return;
      }

      sections = collectDecisionSections(routeRoot);
      sections.forEach((section, index) => {
        section.classList.add(FLOW_SECTION_CLASS);
        section.dataset.wmFlowIndex = String(index);
      });

      if (sections.length < 2) {
        activeIndex = -1;
        return;
      }

      setActiveSection(0);
      scheduleScrollUpdate();
    };

    const advanceIfRelevant = (target: EventTarget | null, mode: "change" | "click") => {
      const index = findSectionIndex(sections, target);
      if (index === -1) return;

      setActiveSection(index);
      const targetElement = target instanceof HTMLElement ? target : null;
      if (!targetElement || index >= sections.length - 1) return;
      const sectionInteractiveCount = sections[index].querySelectorAll("input, select, textarea").length;

      const shouldAdvance =
        mode === "change"
          ? sectionInteractiveCount <= 2 && targetElement.matches("select, input[type='checkbox'], input[type='radio']")
          : Boolean(targetElement.closest(".wm-btn--primary, .wm-btn-primary, [data-wm-flow-next='true']"));

      if (!shouldAdvance) return;

      window.clearTimeout(rescanTimer);
      rescanTimer = window.setTimeout(() => scrollToSection(index + 1), 180);
    };

    const handleFocusIn = (event: FocusEvent) => {
      const index = findSectionIndex(sections, event.target);
      if (index >= 0) setActiveSection(index);
    };

    const handleClick = (event: MouseEvent) => {
      advanceIfRelevant(event.target, "click");
    };

    const handleChange = (event: Event) => {
      advanceIfRelevant(event.target, "change");
    };

    const mutationObserver = new MutationObserver(() => {
      window.clearTimeout(rescanTimer);
      rescanTimer = window.setTimeout(rescan, 80);
    });

    mutationObserver.observe(contentRoot, { childList: true, subtree: true });
    contentRoot.addEventListener("focusin", handleFocusIn);
    contentRoot.addEventListener("click", handleClick, true);
    contentRoot.addEventListener("change", handleChange, true);
    scrollRoot.addEventListener("scroll", scheduleScrollUpdate, { passive: true });

    rescan();

    return () => {
      window.clearTimeout(rescanTimer);
      mutationObserver.disconnect();
      contentRoot.removeEventListener("focusin", handleFocusIn);
      contentRoot.removeEventListener("click", handleClick, true);
      contentRoot.removeEventListener("change", handleChange, true);
      scrollRoot.removeEventListener("scroll", scheduleScrollUpdate);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      clearSectionClasses();
    };
  }, [location.pathname]);

  return null;
}
