import { useMemo, useState, type ChangeEvent } from "react";
import {
  comparePriorityLabels,
  comparePriorityOrder,
  compareTechnologyLabels,
  compareTemplates,
  type CompareFieldType,
  type ComparePriority,
  type CompareTechnologyType,
  type CompareTemplateField
} from "./compareTemplates";

type EvidenceType = "datasheet" | "product_page" | "manual" | "sku_inferred" | "user_entered" | "missing";

type CompareResult =
  | "match"
  | "no_match"
  | "partial"
  | "missing_evidence"
  | "wyrestorm_extra";

type Side = "competitor" | "wyrestorm";

type StepId = "template" | "completeness" | "matrix" | "recommendation";

type FieldValue = {
  value: string;
  evidence: EvidenceType;
};

type ComparedRow = CompareTemplateField & {
  competitorValue: string;
  wyrestormValue: string;
  competitorEvidence: EvidenceType;
  wyrestormEvidence: EvidenceType;
  result: CompareResult;
};

type ParsedIo = {
  inputs: number | null;
  outputs: number | null;
};

const steps: Array<{ id: StepId; label: string; helper: string }> = [
  {
    id: "template",
    label: "1 Required Data",
    helper: "Template fields expected for the selected product type."
  },
  {
    id: "completeness",
    label: "2 Completeness",
    helper: "Shows whether there is enough evidence to compare safely."
  },
  {
    id: "matrix",
    label: "3 Technical Matrix",
    helper: "Field-by-field technical comparison."
  },
  {
    id: "recommendation",
    label: "4 Recommendation",
    helper: "Plain decision and next action."
  }
];

const evidenceLabels: Record<EvidenceType, string> = {
  datasheet: "Datasheet",
  product_page: "Product page",
  manual: "Manual",
  sku_inferred: "SKU inferred",
  user_entered: "User entered",
  missing: "Missing"
};

const resultLabels: Record<CompareResult, string> = {
  match: "✓ Match",
  no_match: "× No match",
  partial: "◐ Partial",
  missing_evidence: "? Evidence needed",
  wyrestorm_extra: "+ WyreStorm extra"
};

const technologyOptions = Object.keys(compareTechnologyLabels) as CompareTechnologyType[];

function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseNumber(value: string): number | null {
  const match = value.match(/\d+/);

  if (!match) {
    return null;
  }

  return Number.parseInt(match[0], 10);
}

function boolValue(value: string): boolean | null {
  const text = normalise(value);

  if (["yes", "true", "y", "supported", "included", "built-in", "built in", "present"].includes(text)) {
    return true;
  }

  if (["no", "false", "n", "not supported", "none", "absent"].includes(text)) {
    return false;
  }

  return null;
}

function parseIoFromSku(sku: string): ParsedIo {
  const upper = sku.toUpperCase();

  const matrixMatch = upper.match(/(?:MX|MATRIX|SW|VW|NHD)[-_]?(\\d{2})(\\d{2})/);

  if (matrixMatch) {
    return {
      inputs: Number.parseInt(matrixMatch[1], 10),
      outputs: Number.parseInt(matrixMatch[2], 10)
    };
  }

  const readableMatch = upper.match(/(\\d{1,2})\\s*[X×]\\s*(\\d{1,2})/);

  if (readableMatch) {
    return {
      inputs: Number.parseInt(readableMatch[1], 10),
      outputs: Number.parseInt(readableMatch[2], 10)
    };
  }

  return {
    inputs: null,
    outputs: null
  };
}

function inferTechnologyFromSku(sku: string): CompareTechnologyType {
  const upper = sku.toUpperCase();

  if (upper.includes("NHD-CTL")) {
    return "avoip_controller";
  }

  if (upper.includes("0401-MV") || upper.includes("MULTIVIEW") || upper.includes("MV")) {
    return "multiview_processor";
  }

  if (upper.includes("VW") || upper.includes("VIDEO WALL")) {
    return "video_wall_processor";
  }

  if (upper.includes("NHD-")) {
    return "avoip_endpoint";
  }

  if (upper.includes("HDBASET") || upper.includes("HDBT") || upper.includes("EX-") || upper.includes("-TX") || upper.includes("-RX")) {
    return "hdbaset_extender";
  }

  if (upper.includes("APO") || upper.includes("CAM") || upper.includes("USB") || upper.includes("UC") || upper.includes("BRG")) {
    return "usb_uc_device";
  }

  if (upper.includes("SW-") || upper.includes("PRESENTATION")) {
    return "presentation_switcher";
  }

  if (upper.includes("MX-") || upper.includes("MATRIX")) {
    return "matrix_switcher";
  }

  return "presentation_switcher";
}

function deriveRoleFromSku(sku: string, technology: CompareTechnologyType): string {
  const upper = sku.toUpperCase();

  if (upper.includes("TRX")) {
    return "Transceiver";
  }

  if (upper.includes("-TX") || upper.includes("TRANSMITTER") || upper.includes("ENCODER")) {
    return technology === "avoip_endpoint" ? "Encoder" : "Transmitter";
  }

  if (upper.includes("-RX") || upper.includes("RECEIVER") || upper.includes("DECODER")) {
    return technology === "avoip_endpoint" ? "Decoder" : "Receiver";
  }

  if (upper.includes("CTL")) {
    return "Controller";
  }

  if (technology === "matrix_switcher") {
    return "Matrix";
  }

  if (technology === "presentation_switcher") {
    return "Presentation switcher";
  }

  if (technology === "multiview_processor") {
    return "Multiview processor";
  }

  if (technology === "video_wall_processor") {
    return "Video wall processor";
  }

  if (technology === "usb_uc_device") {
    return "USB / UC device";
  }

  return "Unknown";
}

function inferResolutionFromSku(sku: string): string {
  const upper = sku.toUpperCase();

  if (upper.includes("8K")) {
    return "8K";
  }

  if (upper.includes("4K60") || upper.includes("4K") || upper.includes("60")) {
    return "4K60";
  }

  if (upper.includes("1080")) {
    return "1080p";
  }

  return "";
}

function inferTransportFromTechnology(technology: CompareTechnologyType, sku: string): string {
  const upper = sku.toUpperCase();

  if (upper.includes("HDBASET") || upper.includes("HDBT")) {
    return "HDBaseT";
  }

  if (technology === "avoip_endpoint") {
    return "AVoIP";
  }

  if (technology === "matrix_switcher") {
    return "Matrix switching";
  }

  if (technology === "presentation_switcher") {
    return "Presentation switching";
  }

  if (technology === "usb_uc_device") {
    return "USB / UC";
  }

  return compareTechnologyLabels[technology];
}

function inferValueFromSku(field: CompareTemplateField, sku: string, technology: CompareTechnologyType): string {
  const upper = sku.toUpperCase();
  const parsedIo = parseIoFromSku(sku);

  if (field.id === "technology_type") {
    return compareTechnologyLabels[technology];
  }

  if (field.id === "product_role") {
    return deriveRoleFromSku(sku, technology);
  }

  if (field.id === "input_count" || field.id === "source_count") {
    return parsedIo.inputs === null ? "" : String(parsedIo.inputs);
  }

  if (field.id === "output_count") {
    return parsedIo.outputs === null ? "" : String(parsedIo.outputs);
  }

  if (field.id === "hdmi_inputs") {
    return parsedIo.inputs === null ? "" : String(parsedIo.inputs);
  }

  if (field.id === "hdmi_outputs") {
    return parsedIo.outputs === null ? "" : String(parsedIo.outputs);
  }

  if (field.id === "max_resolution") {
    return inferResolutionFromSku(sku);
  }

  if (field.id === "chroma" && upper.includes("4:4:4")) {
    return "4:4:4";
  }

  if (field.id === "hdr" && upper.includes("HDR")) {
    return "Yes";
  }

  if (field.id === "usb_version" && upper.includes("USB 3")) {
    return "USB 3.x";
  }

  if (field.id === "usb_version" && upper.includes("USB")) {
    return "USB";
  }

  if (field.id === "hdbaset_version" && upper.includes("HDBASET 3")) {
    return "HDBaseT 3.0";
  }

  if (field.id === "hdbaset_version" && (upper.includes("HDBASET") || upper.includes("HDBT"))) {
    return "HDBaseT";
  }

  if (field.id === "network_speed" && (upper.includes("600") || upper.includes("SDVOE"))) {
    return "10GbE";
  }

  if (field.id === "network_speed" && upper.includes("NHD")) {
    return "1GbE or series dependent";
  }

  if (field.id === "codec" && upper.includes("500")) {
    return "JPEG XS";
  }

  if (field.id === "codec" && upper.includes("600")) {
    return "SDVoE";
  }

  if (field.id === "avoip_family" && upper.includes("NHD-100")) {
    return "NetworkHD 100 series";
  }

  if (field.id === "avoip_family" && upper.includes("NHD-500")) {
    return "NetworkHD 500 series";
  }

  if (field.id === "avoip_family" && upper.includes("NHD-600")) {
    return "NetworkHD 600 series";
  }

  if (field.id === "signal_transport" || field.id === "transport") {
    return inferTransportFromTechnology(technology, sku);
  }

  return "";
}

function valueKey(fieldId: string, side: Side): string {
  return `${side}.${fieldId}`;
}

function getFieldValue(
  field: CompareTemplateField,
  side: Side,
  sku: string,
  technology: CompareTechnologyType,
  manualValues: Record<string, string>
): FieldValue {
  const key = valueKey(field.id, side);
  const manual = manualValues[key];

  if (typeof manual === "string" && manual.trim().length > 0) {
    return {
      value: manual,
      evidence: "user_entered"
    };
  }

  const inferred = inferValueFromSku(field, sku, technology);

  if (inferred.trim().length > 0) {
    return {
      value: inferred,
      evidence: "sku_inferred"
    };
  }

  return {
    value: "",
    evidence: "missing"
  };
}

function compareValues(field: CompareTemplateField, competitorValue: string, wyrestormValue: string): CompareResult {
  const competitorText = normalise(competitorValue);
  const wyrestormText = normalise(wyrestormValue);

  if (competitorText.length < 1 || wyrestormText.length < 1) {
    return "missing_evidence";
  }

  if (field.fieldType === "number" || field.fieldType === "port_count") {
    const competitorNumber = parseNumber(competitorValue);
    const wyrestormNumber = parseNumber(wyrestormValue);

    if (competitorNumber === null || wyrestormNumber === null) {
      return "missing_evidence";
    }

    if (wyrestormNumber > competitorNumber) {
      return "wyrestorm_extra";
    }

    if (wyrestormNumber === competitorNumber) {
      return "match";
    }

    return "no_match";
  }

  if (field.fieldType === "boolean") {
    const competitorBool = boolValue(competitorValue);
    const wyrestormBool = boolValue(wyrestormValue);

    if (competitorBool === null || wyrestormBool === null) {
      return "missing_evidence";
    }

    if (competitorBool === wyrestormBool) {
      return "match";
    }

    if (!competitorBool && wyrestormBool) {
      return "wyrestorm_extra";
    }

    return "no_match";
  }

  if (competitorText === wyrestormText) {
    return "match";
  }

  if (field.blocksRecommendation) {
    return "no_match";
  }

  return "partial";
}

function inputTypeForField(fieldType: CompareFieldType): string {
  if (fieldType === "number" || fieldType === "port_count") {
    return "number";
  }

  return "text";
}

function buildRows(
  template: CompareTemplateField[],
  competitorSku: string,
  wyrestormSku: string,
  technology: CompareTechnologyType,
  manualValues: Record<string, string>
): ComparedRow[] {
  return template.map((field) => {
    const competitor = getFieldValue(field, "competitor", competitorSku, technology, manualValues);
    const wyrestorm = getFieldValue(field, "wyrestorm", wyrestormSku, technology, manualValues);

    return {
      ...field,
      competitorValue: competitor.value,
      wyrestormValue: wyrestorm.value,
      competitorEvidence: competitor.evidence,
      wyrestormEvidence: wyrestorm.evidence,
      result: compareValues(field, competitor.value, wyrestorm.value)
    };
  });
}

function resultClass(result: CompareResult): string {
  return `wm-compare-result-${result.replace("_", "-")}`;
}

function priorityClass(priority: ComparePriority): string {
  return `wm-compare-priority-${priority.replace("_", "-")}`;
}

function groupRows(rows: ComparedRow[]): Array<{ priority: ComparePriority; rows: ComparedRow[] }> {
  return comparePriorityOrder
    .map((priority) => ({
      priority,
      rows: rows.filter((row) => row.priority === priority)
    }))
    .filter((group) => group.rows.length > 0);
}

function buildSummary(rows: ComparedRow[]) {
  const blockingRows = rows.filter((row) => row.priority === "blocking");
  const coreRows = rows.filter((row) => row.priority === "core");

  const blockingNoMatches = blockingRows.filter((row) => row.result === "no_match");
  const blockingMissing = blockingRows.filter((row) => row.result === "missing_evidence");
  const coreIssues = coreRows.filter((row) => row.result === "no_match" || row.result === "partial" || row.result === "missing_evidence");
  const knownRows = rows.filter((row) => row.result !== "missing_evidence");
  const matchRows = rows.filter((row) => row.result === "match" || row.result === "wyrestorm_extra");

  const completeness = rows.length < 1 ? 0 : Math.round((knownRows.length / rows.length) * 100);
  const matchRate = rows.length < 1 ? 0 : Math.round((matchRows.length / rows.length) * 100);

  let verdict = "GOOD MATCH";
  let reason = "The available template fields do not show a blocking mismatch.";

  if (coreIssues.length > 0) {
    verdict = "PARTIAL MATCH";
    reason = "The main product type is plausible, but one or more core fields need checking or do not fully align.";
  }

  if (blockingMissing.length > 0) {
    verdict = "EVIDENCE NEEDED";
    reason = "One or more blocking fields are missing. Do not position this as equivalent until the missing evidence is confirmed.";
  }

  if (blockingNoMatches.length > 0) {
    verdict = "NO MATCH";
    reason = "One or more blocking fields do not match. This is not a safe equivalent.";
  }

  return {
    verdict,
    reason,
    completeness,
    matchRate,
    blockingNoMatches,
    blockingMissing,
    coreIssues
  };
}

function evidenceClass(evidence: EvidenceType): string {
  return `wm-evidence-${evidence.replace("_", "-")}`;
}

function CompareValueInput({
  field,
  side,
  value,
  onChange
}: {
  field: ComparedRow;
  side: Side;
  value: string;
  onChange: (fieldId: string, side: Side, value: string) => void;
}) {
  return (
    <input
      aria-label={`${side} ${field.label}`}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(field.id, side, event.target.value)}
      placeholder="Missing"
      type={inputTypeForField(field.fieldType)}
      value={value}
    />
  );
}

export function Compare() {
  const [competitorSku, setCompetitorSku] = useState("DN-NVX350");
  const [wyrestormSku, setWyrestormSku] = useState("");
  const [selectedTechnology, setSelectedTechnology] = useState<CompareTechnologyType>("avoip_endpoint");
  const [activeStep, setActiveStep] = useState<StepId>("template");
  const [manualValues, setManualValues] = useState<Record<string, string>>({});

  const detectedTechnology = useMemo(() => inferTechnologyFromSku(competitorSku), [competitorSku]);
  const template = compareTemplates[selectedTechnology];

  const rows = useMemo(
    () => buildRows(template, competitorSku, wyrestormSku, selectedTechnology, manualValues),
    [template, competitorSku, wyrestormSku, selectedTechnology, manualValues]
  );

  const groupedRows = useMemo(() => groupRows(rows), [rows]);
  const summary = useMemo(() => buildSummary(rows), [rows]);

  function updateValue(fieldId: string, side: Side, value: string): void {
    setManualValues((current) => {
      const next = { ...current };
      const key = valueKey(fieldId, side);

      if (value.trim().length < 1) {
        delete next[key];
        return next;
      }

      next[key] = value;
      return next;
    });
  }

  function useDetectedTechnology(): void {
    setSelectedTechnology(detectedTechnology);
    setActiveStep("template");
  }

  function clearManualValues(): void {
    setManualValues({});
  }

  return (
    <div className="wm-compare-redesign">
      <header className="wm-compare-redesign-hero">
        <div>
          <p className="wm-compare-kicker">Competitor comparison / technical data template</p>
          <h1>Compare products by required technical evidence, not SKU similarity.</h1>
          <p>
            Select the product technology type first. Wingman then shows the expected data fields for that device class,
            highlights missing evidence and only then presents a safe technical comparison.
          </p>
        </div>

        <div className={`wm-compare-verdict-card wm-compare-verdict-${summary.verdict.toLowerCase().replace(/\s+/g, "-")}`}>
          <span>Current decision</span>
          <strong>{summary.verdict}</strong>
          <small>{summary.completeness}% evidence complete</small>
        </div>
      </header>

      <section className="wm-compare-intake">
        <label>
          <span>Competitor SKU</span>
          <input value={competitorSku} onChange={(event) => setCompetitorSku(event.target.value)} />
        </label>

        <label>
          <span>WyreStorm SKU</span>
          <input placeholder="Enter WyreStorm SKU or leave blank" value={wyrestormSku} onChange={(event) => setWyrestormSku(event.target.value)} />
        </label>

        <label>
          <span>Technology type</span>
          <select value={selectedTechnology} onChange={(event) => setSelectedTechnology(event.target.value as CompareTechnologyType)}>
            {technologyOptions.map((technology) => (
              <option key={technology} value={technology}>
                {compareTechnologyLabels[technology]}
              </option>
            ))}
          </select>
        </label>

        <div className="wm-compare-intake-actions">
          <button type="button" onClick={useDetectedTechnology}>
            Use inferred type: {compareTechnologyLabels[detectedTechnology]}
          </button>
          <button type="button" onClick={clearManualValues}>
            Clear entered values
          </button>
        </div>
      </section>

      <nav className="wm-compare-steps" aria-label="Compare workflow steps">
        {steps.map((step) => (
          <button
            aria-pressed={activeStep === step.id}
            key={step.id}
            onClick={() => setActiveStep(step.id)}
            title={step.helper}
            type="button"
          >
            <strong>{step.label}</strong>
            <span>{step.helper}</span>
          </button>
        ))}
      </nav>

      {activeStep === "template" && (
        <section className="wm-compare-panel wm-compare-template-panel">
          <div className="wm-compare-section-heading">
            <div>
              <p className="wm-compare-kicker">Step 1 / Required technical data</p>
              <h2>{compareTechnologyLabels[selectedTechnology]} template</h2>
              <p>
                These are the technical fields Wingman expects before it can compare a competitor product with a
                WyreStorm product safely.
              </p>
            </div>
          </div>

          <div className="wm-compare-template-summary">
            {comparePriorityOrder.map((priority) => {
              const count = rows.filter((row) => row.priority === priority).length;

              return (
                <article className={priorityClass(priority)} key={priority}>
                  <span>{comparePriorityLabels[priority]}</span>
                  <strong>{count}</strong>
                  <small>{priority === "blocking" ? "Can block recommendation" : "Comparison detail"}</small>
                </article>
              );
            })}
          </div>

          <div className="wm-compare-template-list">
            {groupedRows.map((group) => (
              <article key={group.priority}>
                <h3>{comparePriorityLabels[group.priority]}</h3>
                <div className="wm-compare-template-field-grid">
                  {group.rows.map((row) => (
                    <div key={row.id} className="wm-compare-template-field">
                      <strong>{row.label}</strong>
                      <p>{row.expectedForType}</p>
                      <small>{row.whyItMatters}</small>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeStep === "completeness" && (
        <section className="wm-compare-panel">
          <div className="wm-compare-section-heading">
            <div>
              <p className="wm-compare-kicker">Step 2 / Data completeness</p>
              <h2>Evidence status before comparison</h2>
              <p>{summary.reason}</p>
            </div>
          </div>

          <div className="wm-compare-readiness-grid">
            <article>
              <span>Evidence complete</span>
              <strong>{summary.completeness}%</strong>
            </article>
            <article>
              <span>Field match rate</span>
              <strong>{summary.matchRate}%</strong>
            </article>
            <article>
              <span>Blocking gaps</span>
              <strong>{summary.blockingMissing.length}</strong>
            </article>
            <article>
              <span>Blocking no-match</span>
              <strong>{summary.blockingNoMatches.length}</strong>
            </article>
          </div>

          <div className="wm-compare-gap-columns">
            <article>
              <h3>Missing blocking evidence</h3>
              {summary.blockingMissing.length > 0 ? (
                <ul>
                  {summary.blockingMissing.map((row) => (
                    <li key={row.id}>
                      <strong>{row.label}</strong>
                      <span>{row.expectedForType}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No missing blocking fields.</p>
              )}
            </article>

            <article>
              <h3>Blocking no-match fields</h3>
              {summary.blockingNoMatches.length > 0 ? (
                <ul>
                  {summary.blockingNoMatches.map((row) => (
                    <li key={row.id}>
                      <strong>{row.label}</strong>
                      <span>
                        Competitor: {row.competitorValue || "Missing"} / WyreStorm: {row.wyrestormValue || "Missing"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No known blocking no-match fields.</p>
              )}
            </article>
          </div>
        </section>
      )}

      {activeStep === "matrix" && (
        <section className="wm-compare-panel wm-compare-matrix-panel">
          <div className="wm-compare-section-heading">
            <div>
              <p className="wm-compare-kicker">Step 3 / Technical matrix</p>
              <h2>Field-by-field comparison</h2>
              <p>
                Enter or correct the competitor and WyreStorm values. Inferred values are low-confidence until confirmed
                from a datasheet, product page or manual.
              </p>
            </div>
          </div>

          <div className="wm-compare-matrix-scroll">
            <table>
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Field</th>
                  <th>Expected for this type</th>
                  <th>Competitor value</th>
                  <th>WyreStorm value</th>
                  <th>Result</th>
                  <th>Why it matters</th>
                </tr>
              </thead>
              <tbody>
                {groupedRows.map((group) => (
                  <>
                    <tr className="wm-compare-group-row" key={`${group.priority}-header`}>
                      <td colSpan={7}>{comparePriorityLabels[group.priority]}</td>
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <span className={`wm-priority-pill ${priorityClass(row.priority)}`}>
                            {comparePriorityLabels[row.priority]}
                          </span>
                        </td>
                        <td>
                          <strong>{row.label}</strong>
                          {row.blocksRecommendation && <small>Blocks recommendation</small>}
                        </td>
                        <td>{row.expectedForType}</td>
                        <td>
                          <CompareValueInput field={row} side="competitor" value={row.competitorValue} onChange={updateValue} />
                          <span className={`wm-evidence-pill ${evidenceClass(row.competitorEvidence)}`}>
                            {evidenceLabels[row.competitorEvidence]}
                          </span>
                        </td>
                        <td>
                          <CompareValueInput field={row} side="wyrestorm" value={row.wyrestormValue} onChange={updateValue} />
                          <span className={`wm-evidence-pill ${evidenceClass(row.wyrestormEvidence)}`}>
                            {evidenceLabels[row.wyrestormEvidence]}
                          </span>
                        </td>
                        <td>
                          <span className={`wm-result-pill ${resultClass(row.result)}`}>{resultLabels[row.result]}</span>
                        </td>
                        <td>{row.whyItMatters}</td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeStep === "recommendation" && (
        <section className="wm-compare-panel">
          <div className="wm-compare-section-heading">
            <div>
              <p className="wm-compare-kicker">Step 4 / Recommendation</p>
              <h2>{summary.verdict}</h2>
              <p>{summary.reason}</p>
            </div>
          </div>

          <div className="wm-compare-recommendation-grid">
            <article>
              <h3>Commercially safe position</h3>
              <p>
                {summary.verdict === "NO MATCH"
                  ? "Do not present this as an equivalent. Use the blocking mismatch rows to explain why."
                  : summary.verdict === "EVIDENCE NEEDED"
                    ? "Do not recommend yet. Collect datasheet or product-page evidence for the blocking fields first."
                    : summary.verdict === "PARTIAL MATCH"
                      ? "Position as a possible alternative only if the customer accepts the listed differences."
                      : "Position as a strong technical match, subject to datasheet validation."}
              </p>
            </article>

            <article>
              <h3>Next action</h3>
              <p>
                {summary.blockingMissing.length > 0
                  ? `Collect evidence for: ${summary.blockingMissing.map((row) => row.label).join(", ")}.`
                  : summary.blockingNoMatches.length > 0
                    ? `Resolve blocking mismatch: ${summary.blockingNoMatches.map((row) => row.label).join(", ")}.`
                    : "Validate the entered fields against official product data before using this with a customer."}
              </p>
            </article>
          </div>
        </section>
      )}
    </div>
  );
}

export function ComparePage() {
  return <Compare />;
}

export default Compare;
