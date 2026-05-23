import { SALES_CONVERSATION_TYPE_STORAGE_KEY, normalizeSalesConversationToneId, type SalesConversationToneId } from "../lib/salesConversationTone";

const INSTALL_FLAG = "wmCallCardsAudienceFramingInstalled";
const STYLE_ID = "wm-call-cards-audience-framing-style";

function getCurrentTone(): SalesConversationToneId {
  try {
    return normalizeSalesConversationToneId(window.localStorage.getItem(SALES_CONVERSATION_TYPE_STORAGE_KEY));
  } catch {
    return "trade";
  }
}

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normal(value: string) {
  return clean(value).toLowerCase();
}

function frameQuestion(originalQuestion: string, originalPrompt: string, tone: SalesConversationToneId) {
  const text = `${normal(originalQuestion)} ${normal(originalPrompt)}`;

  if (tone === "user") {
    if (text.includes("source") || text.includes("display")) {
      return {
        question: "What do users need to show, and where should people be able to see it?",
        prompt: "Use plain language first: laptops, signage, cameras or room PCs, and which screens people expect to use.",
      };
    }

    if (text.includes("usb") || text.includes("camera") || text.includes("microphone") || text.includes("audio")) {
      return {
        question: "What needs to work when someone joins a meeting or presents from their laptop?",
        prompt: "Capture the experience: camera, sound, touch, display and simple plug-in behaviour before talking product route.",
      };
    }

    if (text.includes("distance") || text.includes("cable") || text.includes("rack")) {
      return {
        question: "Where will people plug in, and where does the picture or sound need to appear?",
        prompt: "Use room locations rather than cable technology unless the customer already knows the infrastructure.",
      };
    }

    if (text.includes("wall") || text.includes("multiview") || text.includes("layout")) {
      return {
        question: "What should the wall or screen look like during normal use?",
        prompt: "Ask whether they expect one big image, different content in each area, or several items visible at the same time.",
      };
    }

    return {
      question: originalQuestion,
      prompt: originalPrompt || "Capture the desired user outcome before discussing technology or product route.",
    };
  }

  if (tone === "consultant") {
    if (text.includes("source") || text.includes("display")) {
      return {
        question: "Can we confirm source count, sink count, routing behaviour, resolution and physical endpoints?",
        prompt: "Capture I/O, locations, switching behaviour, cable-path assumptions and any scaling or EDID constraints.",
      };
    }

    if (text.includes("usb") || text.includes("camera") || text.includes("microphone") || text.includes("audio")) {
      return {
        question: "What are the USB/audio signal paths, host locations, bandwidth requirements and peripheral endpoints?",
        prompt: "Clarify USB 2.0 vs USB 3.x, host switching, camera bridge, DSP/AEC, Dante/AES67 and conferencing integration.",
      };
    }

    if (text.includes("distance") || text.includes("cable") || text.includes("rack")) {
      return {
        question: "What are the installed cable routes, distance bands, cable media and infrastructure constraints?",
        prompt: "Capture route length, cable type, containment, conduit, rack location, network availability and bandwidth/latency expectations.",
      };
    }

    if (text.includes("wall") || text.includes("multiview") || text.includes("layout")) {
      return {
        question: "Is the requirement single-canvas wall processing, routed per-display content, multiview, or mixed layouts?",
        prompt: "Confirm source count, visible windows, presets, wall geometry, LED/LCD resolution handling, latency and processor vs AVoIP trade-off.",
      };
    }

    return {
      question: originalQuestion,
      prompt: `${originalPrompt} Capture hard constraints, assumptions, dependencies and validation risks.`,
    };
  }

  if (text.includes("source") || text.includes("display")) {
    return {
      question: "Can we confirm the core source/display count and locations so the dealer quotes the right signal path?",
      prompt: "Trade confirmation: what is already being sold, what feeds it, where it is installed and what is missing from the quote.",
    };
  }

  if (text.includes("usb") || text.includes("camera") || text.includes("microphone") || text.includes("audio")) {
    return {
      question: "Can we confirm whether USB, camera, mic or audio needs adding to the trade quote?",
      prompt: "Frame this as attach-sale protection: avoid a display/UC quote missing the bridge, peripheral or transport needed to make it work.",
    };
  }

  if (text.includes("distance") || text.includes("cable") || text.includes("rack")) {
    return {
      question: "Can we confirm the install route, distance and cable type before the dealer commits to hardware?",
      prompt: "Focus on avoiding underquoting: cable route, receiver/transmitter requirement, containment, rack position and installation risk.",
    };
  }

  if (text.includes("wall") || text.includes("multiview") || text.includes("layout")) {
    return {
      question: "Can we confirm the wall behaviour so the dealer quotes the right processor or routing option?",
      prompt: "Confirm whether this is signage, one canvas, separate displays, multiview, preset layouts or a full AVoIP wall.",
    };
  }

  return {
    question: originalQuestion,
    prompt: originalPrompt || "Confirm the core requirement, missing information and next Wingman workflow.",
  };
}

function applyQuestionFraming() {
  if (!window.location.pathname.includes("/live-call-cards")) return;

  const tone = getCurrentTone();
  const rows = Array.from(document.querySelectorAll<HTMLElement>(".ccs-questionRow"));

  rows.forEach((row) => {
    const question = row.querySelector<HTMLElement>(".ccs-questionText h3");
    const prompt = row.querySelector<HTMLElement>(".ccs-questionText p");

    if (!question || !prompt) return;

    if (!question.dataset.wmOriginalQuestion) question.dataset.wmOriginalQuestion = clean(question.textContent || "");
    if (!prompt.dataset.wmOriginalPrompt) prompt.dataset.wmOriginalPrompt = clean(prompt.textContent || "");

    const framed = frameQuestion(question.dataset.wmOriginalQuestion, prompt.dataset.wmOriginalPrompt, tone);
    question.textContent = framed.question;
    prompt.textContent = framed.prompt;
    row.dataset.wmAudienceTone = tone;
  });

  const headerText = document.querySelector<HTMLElement>(".ccs-questionPanel .ccs-pageHeader p");
  if (headerText) {
    headerText.textContent =
      tone === "user"
        ? "Questions are framed around user outcomes and room experience."
        : tone === "consultant"
          ? "Questions are framed for technical validation, constraints and design risk."
          : "Questions are framed for distributor-to-dealer confirmation and attach-sale capture.";
  }
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .ccs-questionRow[data-wm-audience-tone="user"] { border-color: rgba(34, 197, 94, 0.22) !important; }
    .ccs-questionRow[data-wm-audience-tone="consultant"] { border-color: rgba(96, 165, 250, 0.24) !important; }
    .ccs-questionRow[data-wm-audience-tone="trade"] { border-color: rgba(251, 191, 36, 0.22) !important; }
  `;
  document.head.appendChild(style);
}

export function installCallCardsAudienceFraming(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (document.body.dataset[INSTALL_FLAG] === "true") return;

  document.body.dataset[INSTALL_FLAG] = "true";
  installStyles();

  const observer = new MutationObserver(() => applyQuestionFraming());
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener("wingman:sales-mode-request", () => window.setTimeout(applyQuestionFraming, 0));
  window.addEventListener("wingman:sales-mode-change", () => window.setTimeout(applyQuestionFraming, 0));
  document.addEventListener("click", () => window.setTimeout(applyQuestionFraming, 120), true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyQuestionFraming, { once: true });
    return;
  }

  applyQuestionFraming();
  window.setTimeout(applyQuestionFraming, 300);
}
