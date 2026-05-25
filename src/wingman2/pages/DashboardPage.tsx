import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  ClipboardList,
  FileText,
  GitCompare,
  Languages,
  LayoutTemplate,
  Search,
  Video,
} from "lucide-react";
import {
  buildSalesConversationToneCopy,
  DEFAULT_SALES_CONVERSATION_LOCALE,
  DEFAULT_SALES_CONVERSATION_TONE_ID,
  normalizeSalesConversationLocale,
  normalizeSalesConversationToneId,
  SALES_CONVERSATION_LOCALE_STORAGE_KEY,
  SALES_CONVERSATION_TYPE_STORAGE_KEY,
  salesConversationLocaleOptions,
  salesConversationToneOptions,
  type SalesConversationLocale,
  type SalesConversationToneId,
} from "../lib/salesConversationTone";

const launchItems = [
  {
    title: "Start guided discovery",
    description: "Ask one question at a time and let Wingman infer the likely AV route.",
    path: "/wingman/guided-discovery",
    Icon: ClipboardList,
  },
  {
    title: "Find a product",
    description: "Search by I/O, feature, family or SKU when the requirement is already clear.",
    path: "/wingman/finder",
    Icon: Search,
  },
  {
    title: "Compare competitor product",
    description: "Use a competitor SKU or link as a clue, then find the WyreStorm fit.",
    path: "/wingman/compare",
    Icon: GitCompare,
  },
  {
    title: "Build proposal",
    description: "Turn known requirements and shortlisted SKUs into a customer-safe output.",
    path: "/wingman/proposal",
    Icon: FileText,
  },
  {
    title: "Use a room template",
    description: "Start from a common room type instead of a blank discovery form.",
    path: "/wingman/templates",
    Icon: LayoutTemplate,
  },
  {
    title: "Video wall route",
    description: "Separate simple wall processing from AVoIP, multiview and canvas workflows.",
    path: "/wingman/videowall",
    Icon: Video,
  },
];

function readStoredTone(): SalesConversationToneId {
  if (typeof window === "undefined") {
    return DEFAULT_SALES_CONVERSATION_TONE_ID;
  }

  return normalizeSalesConversationToneId(window.localStorage.getItem(SALES_CONVERSATION_TYPE_STORAGE_KEY));
}

function readStoredLocale(): SalesConversationLocale {
  if (typeof window === "undefined") {
    return DEFAULT_SALES_CONVERSATION_LOCALE;
  }

  return normalizeSalesConversationLocale(window.localStorage.getItem(SALES_CONVERSATION_LOCALE_STORAGE_KEY));
}

function requestTone(toneId: SalesConversationToneId) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SALES_CONVERSATION_TYPE_STORAGE_KEY, toneId);
  window.dispatchEvent(new CustomEvent("wingman:sales-mode-request", { detail: { mode: toneId } }));
}

function requestLocale(locale: SalesConversationLocale) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SALES_CONVERSATION_LOCALE_STORAGE_KEY, locale);
  window.dispatchEvent(new CustomEvent("wingman:sales-locale-request", { detail: { locale } }));
}

export function DashboardPage() {
  const [activeToneId, setActiveToneId] = useState<SalesConversationToneId>(() => readStoredTone());
  const [activeLocale, setActiveLocale] = useState<SalesConversationLocale>(() => readStoredLocale());

  useEffect(() => {
    function handleToneChange(event: Event) {
      const requested = event instanceof CustomEvent ? event.detail?.mode : null;
      setActiveToneId(normalizeSalesConversationToneId(requested));
    }

    function handleLocaleChange(event: Event) {
      const requested = event instanceof CustomEvent ? event.detail?.locale : null;
      setActiveLocale(normalizeSalesConversationLocale(requested));
    }

    window.addEventListener("wingman:sales-mode-change", handleToneChange);
    window.addEventListener("wingman:sales-locale-change", handleLocaleChange);

    return () => {
      window.removeEventListener("wingman:sales-mode-change", handleToneChange);
      window.removeEventListener("wingman:sales-locale-change", handleLocaleChange);
    };
  }, []);

  const activeCopy = useMemo(() => {
    return buildSalesConversationToneCopy("salesHelper", activeToneId, activeLocale);
  }, [activeLocale, activeToneId]);

  return (
    <main className="wm-calm-page wm-calm-stack">
      <section className="wm-calm-hero">
        <div>
          <p className="wm-calm-kicker">WyreStorm Wingman</p>
          <h1>Start with the task, not the technology.</h1>
          <p>
            Choose the customer conversation, language and workflow. Wingman keeps the next step focused and only
            expands detail when it helps the sale.
          </p>
        </div>

        <div className="wm-calm-actions">
          <Link className="wm-calm-link-button primary" to="/wingman/guided-discovery">
            Start Discovery
          </Link>
          <Link className="wm-calm-link-button" to="/wingman/support">
            Ask Guru
          </Link>
        </div>
      </section>

      <section className="wm-calm-task-card wm-calm-conversation-panel">
        <div>
          <p className="wm-calm-kicker">Conversation setup</p>
          <h2>Make the wording match the person in front of you.</h2>
          <p className="wm-calm-muted">
            Switching audience or language changes the live opener, follow-up and handoff guidance.
          </p>
        </div>

        <div className="wm-calm-conversation-grid">
          <div>
            <p className="wm-calm-subhead">Audience mode</p>
            <div className="wm-calm-choice-grid wm-calm-compact-grid">
              {salesConversationToneOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={option.id === activeToneId ? "wm-calm-choice-card is-selected" : "wm-calm-choice-card"}
                  onClick={() => {
                    setActiveToneId(option.id);
                    requestTone(option.id);
                  }}
                  aria-pressed={option.id === activeToneId}
                >
                  <strong>{option.label}</strong>
                  <span>{option.shortDescription}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="wm-calm-subhead">
              <Languages aria-hidden="true" /> Language
            </p>
            <div className="wm-calm-segment-row" role="group" aria-label="Conversation language">
              {salesConversationLocaleOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={option.id === activeLocale ? "is-active" : ""}
                  onClick={() => {
                    setActiveLocale(option.id);
                    requestLocale(option.id);
                  }}
                  aria-pressed={option.id === activeLocale}
                >
                  <span>{option.shortLabel}</span>
                  <small>{option.label}</small>
                </button>
              ))}
            </div>

            <article className="wm-calm-copy-panel">
              <Bot aria-hidden="true" />
              <div>
                <h3>{activeCopy.title}</h3>
                <blockquote>{activeCopy.opener}</blockquote>
                <p>{activeCopy.followUp}</p>
                <small>{activeCopy.handoff}</small>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="wm-calm-launch-grid" aria-label="Wingman start actions">
        {launchItems.map(({ title, description, path, Icon }) => (
          <Link key={title} className="wm-calm-launch-card" to={path}>
            <Icon aria-hidden="true" />
            <strong>{title}</strong>
            <span>{description}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
