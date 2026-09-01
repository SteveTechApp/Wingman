import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  IDB family product data                                           */
/* ------------------------------------------------------------------ */

interface IdbOption {
  sku: string;
  name: string;
  formFactor: "compact" | "cable-retractor" | "flip-up";
  inputs: string[];
  features: string[];
  bestFor: string;
  portSummary: string;
}

const IDB_OPTIONS: IdbOption[] = [
  {
    sku: "IDB-200-MS",
    name: "Compact In-Desk Connectivity",
    formFactor: "compact",
    inputs: ["1× HDMI", "1× USB-C"],
    features: ["USB charging", "Multi-standard mains outlet"],
    bestFor: "Single-source huddle tables and hot desks",
    portSummary: "1 HDMI + 1 USB-C passthrough",
  },
  {
    sku: "IDB-300",
    name: "Dual Channel CableBox",
    formFactor: "cable-retractor",
    inputs: ["Retractable HDMI", "Retractable USB-C"],
    features: ["Cable retraction", "Clean desk when not in use"],
    bestFor: "Meeting tables where cables retract when not needed",
    portSummary: "Dual retractable cable channels",
  },
  {
    sku: "IDB-300-BTN",
    name: "Dual Channel CableBox with Button Control",
    formFactor: "cable-retractor",
    inputs: ["Retractable HDMI", "Retractable USB-C"],
    features: [
      "Cable retraction",
      "Button source selection",
      "60W USB-C PD",
      "Ethernet passthrough",
    ],
    bestFor: "Meeting tables needing source switching at the table",
    portSummary:
      "Dual retractable channels + button control + USB-C PD + Ethernet",
  },
  {
    sku: "IDB-400-MS",
    name: "Flip-Up In-Desk Connectivity",
    formFactor: "flip-up",
    inputs: ["2× HDMI", "1× USB-C"],
    features: [
      "USB charging",
      "RJ-45 Ethernet",
      "Multi-standard mains outlet",
    ],
    bestFor: "Boardrooms with multiple sources and network need",
    portSummary: "2 HDMI + 1 USB-C + RJ-45 + mains",
  },
  {
    sku: "IDB-400-MS-C",
    name: "Flip-Up In-Desk (Custom Ports)",
    formFactor: "flip-up",
    inputs: ["Customized port configuration"],
    features: ["USB charging", "Mains outlet", "Custom ports"],
    bestFor: "Installations needing a specific port mix",
    portSummary: "Configurable — confirm port layout with WyreStorm",
  },
];

/* ------------------------------------------------------------------ */
/*  Config wizard questions                                           */
/* ------------------------------------------------------------------ */

interface WizardAnswers {
  formFactor: "" | "compact" | "cable-retractor" | "flip-up";
  sourceCount: "" | "1" | "2" | "3+";
  needsEthernet: "" | "yes" | "no";
  needsSourceSwitching: "" | "yes" | "no";
  needsUsbPd: "" | "yes" | "no";
}

const EMPTY_ANSWERS: WizardAnswers = {
  formFactor: "",
  sourceCount: "",
  needsEthernet: "",
  needsSourceSwitching: "",
  needsUsbPd: "",
};

/* ------------------------------------------------------------------ */
/*  Recommendation logic                                              */
/* ------------------------------------------------------------------ */

function recommendIdb(answers: WizardAnswers): IdbOption[] {
  let candidates = [...IDB_OPTIONS];

  // Filter by form factor if specified
  if (answers.formFactor) {
    candidates = candidates.filter(
      (o) => o.formFactor === answers.formFactor,
    );
  }

  // Filter by source count
  if (answers.sourceCount === "1") {
    candidates = candidates.filter((o) => o.inputs.length <= 2);
  } else if (answers.sourceCount === "2" || answers.sourceCount === "3+") {
    candidates = candidates.filter(
      (o) => o.formFactor === "flip-up" || o.sku === "IDB-300-BTN",
    );
  }

  // Filter by Ethernet need
  if (answers.needsEthernet === "yes") {
    candidates = candidates.filter(
      (o) =>
        o.features.some((f) => f.toLowerCase().includes("ethernet") || f.toLowerCase().includes("rj-45")) ||
        o.sku === "IDB-300-BTN",
    );
  }

  // Filter by source switching need
  if (answers.needsSourceSwitching === "yes") {
    candidates = candidates.filter((o) => o.sku === "IDB-300-BTN");
  }

  // Filter by USB-C PD need
  if (answers.needsUsbPd === "yes") {
    candidates = candidates.filter(
      (o) =>
        o.features.some((f) => f.includes("PD") || f.includes("60W")) ||
        o.sku === "IDB-300-BTN",
    );
  }

  return candidates.length > 0 ? candidates : IDB_OPTIONS;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface InDeskConnectivityWizardProps {
  onSelect?: (sku: string) => void;
  selectedSku?: string;
}

export function InDeskConnectivityWizard({
  onSelect,
  selectedSku,
}: InDeskConnectivityWizardProps) {
  const [answers, setAnswers] = useState<WizardAnswers>(EMPTY_ANSWERS);
  const [showAll, setShowAll] = useState(false);

  const recommendations = recommendIdb(answers);
  const hasFilters = Object.values(answers).some((v) => v !== "");

  return (
    <div className="wm-idb-wizard">
      <div className="wm-idb-wizard__header">
        <h4>In-Desk Connectivity Selector</h4>
        <p className="wm-idb-wizard__subtitle">
          Choose the right IDB model for the desk or table
        </p>
      </div>

      {/* Config questions */}
      <div className="wm-idb-wizard__questions">
        <div className="wm-idb-wizard__field">
          <label htmlFor="wm-idb-form-factor">Form factor</label>
          <select
            id="wm-idb-form-factor"
            value={answers.formFactor}
            onChange={(e) =>
              setAnswers((prev) => ({
                ...prev,
                formFactor: e.target.value as WizardAnswers["formFactor"],
              }))
            }
          >
            <option value="">Any</option>
            <option value="compact">Compact (sits flush in desk)</option>
            <option value="cable-retractor">
              Cable retractor (cables retract into desk)
            </option>
            <option value="flip-up">Flip-up (pops out of desk)</option>
          </select>
        </div>

        <div className="wm-idb-wizard__field">
          <label htmlFor="wm-idb-source-count">Number of sources to connect</label>
          <select
            id="wm-idb-source-count"
            value={answers.sourceCount}
            onChange={(e) =>
              setAnswers((prev) => ({
                ...prev,
                sourceCount: e.target.value as WizardAnswers["sourceCount"],
              }))
            }
          >
            <option value="">Any</option>
            <option value="1">1 source</option>
            <option value="2">2 sources</option>
            <option value="3+">3 or more</option>
          </select>
        </div>

        <div className="wm-idb-wizard__field">
          <label htmlFor="wm-idb-ethernet">Needs wired Ethernet at the table?</label>
          <select
            id="wm-idb-ethernet"
            value={answers.needsEthernet}
            onChange={(e) =>
              setAnswers((prev) => ({
                ...prev,
                needsEthernet: e.target.value as WizardAnswers["needsEthernet"],
              }))
            }
          >
            <option value="">Any</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        <div className="wm-idb-wizard__field">
          <label htmlFor="wm-idb-source-switching">Needs source switching at the table?</label>
          <select
            id="wm-idb-source-switching"
            value={answers.needsSourceSwitching}
            onChange={(e) =>
              setAnswers((prev) => ({
                ...prev,
                needsSourceSwitching: e.target
                  .value as WizardAnswers["needsSourceSwitching"],
              }))
            }
          >
            <option value="">Any</option>
            <option value="yes">Yes — button to switch sources</option>
            <option value="no">No</option>
          </select>
        </div>

        <div className="wm-idb-wizard__field">
          <label htmlFor="wm-idb-usb-pd">Needs USB-C Power Delivery?</label>
          <select
            id="wm-idb-usb-pd"
            value={answers.needsUsbPd}
            onChange={(e) =>
              setAnswers((prev) => ({
                ...prev,
                needsUsbPd: e.target.value as WizardAnswers["needsUsbPd"],
              }))
            }
          >
            <option value="">Any</option>
            <option value="yes">Yes — charge laptop from table port</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="wm-idb-wizard__results">
        <div className="wm-idb-wizard__results-header">
          <span>
            {hasFilters
              ? `${recommendations.length} matching model${recommendations.length !== 1 ? "s" : ""}`
              : `${IDB_OPTIONS.length} models in IDB family`}
          </span>
          {hasFilters && (
            <button
              className="wm-idb-wizard__clear"
              onClick={() => setAnswers(EMPTY_ANSWERS)}
              type="button"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="wm-idb-wizard__cards">
          {(showAll ? IDB_OPTIONS : recommendations).map((option) => (
            <button
              key={option.sku}
              type="button"
              className={`wm-idb-wizard__card ${selectedSku === option.sku ? "wm-idb-wizard__card--selected" : ""}`}
              onClick={() => onSelect?.(option.sku)}
            >
              <div className="wm-idb-wizard__card-header">
                <span className="wm-idb-wizard__sku">{option.sku}</span>
                <span className="wm-idb-wizard__form-factor">
                  {option.formFactor}
                </span>
              </div>
              <div className="wm-idb-wizard__card-name">{option.name}</div>
              <div className="wm-idb-wizard__card-ports">
                {option.portSummary}
              </div>
              <div className="wm-idb-wizard__card-features">
                {option.features.map((f) => (
                  <span key={f} className="wm-idb-wizard__feature-tag">
                    {f}
                  </span>
                ))}
              </div>
              <div className="wm-idb-wizard__card-best">
                Best for: {option.bestFor}
              </div>
            </button>
          ))}
        </div>

        {!showAll && hasFilters && recommendations.length < IDB_OPTIONS.length && (
          <button
            className="wm-idb-wizard__show-all"
            onClick={() => setShowAll(true)}
            type="button"
          >
            Show all {IDB_OPTIONS.length} IDB models
          </button>
        )}
      </div>
    </div>
  );
}
