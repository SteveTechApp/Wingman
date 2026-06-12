import { useMemo } from "react";
import { cleanCompareDisplayText, compactVerdictLabel } from "../../lib/compareDisplayText";
import { hydrateWyrestormCompareProfile } from "../../lib/knownWyrestormCompareProfiles";

type CellVerdict = "match" | "partial" | "no-match" | "check" | "plus";

interface CompactCompareMatrixProps {
  result: any;
  maxCandidates?: number;
}

interface CompactCandidate {
  sku: string;
  label: string;
  subtitle: string;
  outcome: string;
  confidence: number;
  product: Record<string, unknown>;
  match: Record<string, any>;
}

interface CompactRow {
  group: string;
  feature: string;
  competitor: string;
  values: Array<{
    value: string;
    verdict: CellVerdict;
  }>;
  evidence: string;
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function normalise(value: unknown): string {
  return cleanCompareDisplayText(value);
}

function lower(value: unknown): string {
  return normalise(value).toLowerCase();
}

function firstText(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value) && value.length) {
      return value.map((item) => normalise(item)).filter(Boolean).join(", ");
    }

    const text = normalise(typeof value === "object" && value !== null ? JSON.stringify(value) : value);

    if (text) {
      return text;
    }
  }

  return "";
}

function firstNumber(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }

    const text = normalise(value);
    const match = text.match(/\d+/);

    if (match) {
      return match[0];
    }
  }

  return "";
}

function matrixSize(record: Record<string, unknown>): string {
  const direct = firstText(record, ["matrixSize", "matrix_size", "size"]);

  if (/^\d+\s*x\s*\d+$/i.test(direct)) {
    return direct.toLowerCase();
  }

  const inputs = firstNumber(record, ["routedInputCount", "inputCount", "inputs", "sourceCount"]);
  const outputs = firstNumber(record, ["routedOutputCount", "outputCount", "outputs", "displayCount"]);

  if (inputs && outputs) {
    return `${inputs}x${outputs}`;
  }

  return direct;
}

function boolFeature(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key];

    if (value === true) {
      return "Yes";
    }

    if (value === false) {
      return "No";
    }

    const text = lower(value);

    if (["yes", "true", "supported", "included"].includes(text)) {
      return "Yes";
    }

    if (["no", "false", "not supported", "none"].includes(text)) {
      return "No";
    }

    if (text) {
      return normalise(value);
    }
  }

  return "";
}

function formatValue(value: string): string {
  const text = normalise(value);

  if (!text || text.toLowerCase() === "unknown") {
    return "Missing data";
  }

  return text;
}

function equivalent(a: string, b: string): boolean {
  const aa = lower(a).replace(/[^a-z0-9]+/g, "");
  const bb = lower(b).replace(/[^a-z0-9]+/g, "");

  if (!aa || !bb) {
    return false;
  }

  return aa === bb || aa.includes(bb) || bb.includes(aa);
}

function verdictFor(competitor: string, candidate: string): CellVerdict {
  const c = formatValue(competitor);
  const w = formatValue(candidate);

  if (w === "Missing data") {
    return "check";
  }

  if (c === "Missing data") {
    return "plus";
  }

  if (equivalent(c, w)) {
    return "match";
  }

  if (lower(c).includes("no") && lower(w).includes("yes")) {
    return "plus";
  }

  if (lower(c).includes("yes") && lower(w).includes("no")) {
    return "no-match";
  }

  return "partial";
}

function verdictIcon(verdict: CellVerdict): string {
  return compactVerdictLabel(verdict);
}

function competitorProfile(result: any): Record<string, unknown> {
  return asRecord(result?.competitor);
}

function candidateList(result: any, maxCandidates: number): CompactCandidate[] {
  const matches = Array.isArray(result?.matches) ? result.matches : [];
  const rejected = Array.isArray(result?.rejected) ? result.rejected : [];
  const source = [...matches, ...rejected].slice(0, maxCandidates);

  return source.map((match: any) => {
    const matchRecord = asRecord(match);
    const wyrestormRecord = asRecord(matchRecord.wyrestorm);
    const decision = asRecord(matchRecord.decision);
    const rawSku = normalise(matchRecord.sku || wyrestormRecord.sku || wyrestormRecord.model || wyrestormRecord.partNumber);

    const baseProduct = {
      ...matchRecord,
      ...wyrestormRecord,
      sku: rawSku || normalise(wyrestormRecord.sku),
      name: normalise(wyrestormRecord.name || wyrestormRecord.title || matchRecord.name || rawSku),
      family: normalise(wyrestormRecord.family || matchRecord.family || wyrestormRecord.category),
    };

    const hydratedProduct = hydrateWyrestormCompareProfile(baseProduct);
    const sku = normalise(hydratedProduct.sku || rawSku);
    const title = normalise(hydratedProduct.name || hydratedProduct.title || sku);

    return {
      sku,
      label: sku || "WyreStorm option",
      subtitle: title || firstText(hydratedProduct, ["family", "category"]),
      outcome: normalise(decision.outcome || "CHECK"),
      confidence: Number(decision.confidence || 0),
      product: hydratedProduct,
      match: matchRecord,
    };
  });
}

function productClass(record: Record<string, unknown>): string {
  return firstText(record, ["productClass", "domain", "category", "family", "type"]);
}

function systemRole(record: Record<string, unknown>): string {
  return firstText(record, ["systemRole", "role", "application", "useCase"]);
}

function transport(record: Record<string, unknown>): string {
  return firstText(record, ["transport", "outputTransport", "outputTypes", "technologyFamily", "technology"]);
}

function routedInputs(record: Record<string, unknown>): string {
  const count = firstNumber(record, ["routedInputCount", "inputCount", "inputs", "sourceCount"]);
  const types = firstText(record, ["inputTypes", "inputsType", "inputTransport"]);

  if (count && types) return `${count} ${types}`;
  return count || types;
}

function routedOutputs(record: Record<string, unknown>): string {
  const count = firstNumber(record, ["routedOutputCount", "outputCount", "outputs", "displayCount"]);
  const types = firstText(record, ["routedOutputTypes", "outputTypes", "outputTransport"]);

  if (count && types) return `${count} ${types}`;
  return count || types;
}

function mirroredOutputs(record: Record<string, unknown>): string {
  const count = firstNumber(record, ["mirroredOutputCount", "mirroredOutputs"]);
  const types = firstText(record, ["mirroredOutputTypes"]);

  if (count && count !== "0" && types) return `${count} ${types}`;
  if (count && count !== "0") return count;
  return boolFeature(record, ["mirroredOutputs", "mirroredHdmi", "parallelHdmi"]);
}

function loopOutputs(record: Record<string, unknown>): string {
  const count = firstNumber(record, ["loopOutputCount", "loopOutputs"]);
  const types = firstText(record, ["loopOutputTypes"]);

  if (count && count !== "0" && types) return `${count} ${types}`;
  if (count && count !== "0") return count;
  return boolFeature(record, ["loopOut", "loopOutput", "daisyChain"]);
}

function receiverPackage(record: Record<string, unknown>): string {
  return firstText(record, ["receiverPackage", "includedItems", "packageContents", "kitIncludes", "endpointRole", "commercialPackageType"]);
}

function buildRows(result: any, candidates: CompactCandidate[]): CompactRow[] {
  const competitor = competitorProfile(result);

  const rowDefs = [
    { group: "Identity", feature: "Product class", comp: () => productClass(competitor), cand: (candidate: CompactCandidate) => productClass(candidate.product), evidence: "Core category gate." },
    { group: "Identity", feature: "System role", comp: () => systemRole(competitor), cand: (candidate: CompactCandidate) => systemRole(candidate.product), evidence: "Checks job-to-be-done before feature scoring." },
    { group: "Topology", feature: "Matrix size", comp: () => matrixSize(competitor), cand: (candidate: CompactCandidate) => matrixSize(candidate.product), evidence: "Must use routed matrix I/O, not mirrored or loop outputs." },
    { group: "Topology", feature: "Routed inputs", comp: () => routedInputs(competitor), cand: (candidate: CompactCandidate) => routedInputs(candidate.product), evidence: "Independent source inputs." },
    { group: "Topology", feature: "Routed outputs", comp: () => routedOutputs(competitor), cand: (candidate: CompactCandidate) => routedOutputs(candidate.product), evidence: "Independent destination outputs." },
    { group: "Topology", feature: "Mirrored outputs", comp: () => mirroredOutputs(competitor), cand: (candidate: CompactCandidate) => mirroredOutputs(candidate.product), evidence: "Feature only. Does not increase matrix size." },
    { group: "Topology", feature: "Loop outputs", comp: () => loopOutputs(competitor), cand: (candidate: CompactCandidate) => loopOutputs(candidate.product), evidence: "Daisy-chain/expansion feature only." },
    { group: "Transport", feature: "Transport", comp: () => transport(competitor), cand: (candidate: CompactCandidate) => transport(candidate.product), evidence: "HDMI, HDBaseT, IP, fibre or USB-C path." },
    { group: "Video", feature: "Resolution", comp: () => firstText(competitor, ["maxResolution", "resolution"]), cand: (candidate: CompactCandidate) => firstText(candidate.product, ["maxResolution", "resolution"]), evidence: "Capability must be confirmed before external positioning." },
    { group: "Video", feature: "Chroma", comp: () => firstText(competitor, ["chroma", "colourSampling", "colorSampling"]), cand: (candidate: CompactCandidate) => firstText(candidate.product, ["chroma", "colourSampling", "colorSampling"]), evidence: "4:4:4 / 4:2:0 differences matter." },
    { group: "Video", feature: "HDMI / HDCP", comp: () => [firstText(competitor, ["hdmiVersion"]), firstText(competitor, ["hdcpVersion"])].filter(Boolean).join(" / "), cand: (candidate: CompactCandidate) => [firstText(candidate.product, ["hdmiVersion"]), firstText(candidate.product, ["hdcpVersion"])].filter(Boolean).join(" / "), evidence: "Version compatibility check." },
    { group: "Distance", feature: "Distance class", comp: () => firstText(competitor, ["distanceClass", "distance", "distance4K", "distance1080p"]), cand: (candidate: CompactCandidate) => firstText(candidate.product, ["distanceClass", "distance", "distance4K", "distance1080p"]), evidence: "Cable distance and HDBaseT class." },
    { group: "Control", feature: "Control", comp: () => firstText(competitor, ["control", "controlFeatures"]), cand: (candidate: CompactCandidate) => firstText(candidate.product, ["control", "controlFeatures"]), evidence: "IR, RS-232, LAN/IP and CEC." },
    { group: "Audio", feature: "Audio", comp: () => firstText(competitor, ["audio", "audioFeatures", "audioDeEmbed"]), cand: (candidate: CompactCandidate) => firstText(candidate.product, ["audio", "audioFeatures", "audioDeEmbed"]), evidence: "Embed/de-embed and breakout support." },
    { group: "Power", feature: "Power", comp: () => firstText(competitor, ["power", "powerFeatures"]), cand: (candidate: CompactCandidate) => firstText(candidate.product, ["power", "powerFeatures"]), evidence: "PoC, PoH, PoE or PSU requirements." },
    { group: "Package", feature: "Receiver package", comp: () => receiverPackage(competitor), cand: (candidate: CompactCandidate) => receiverPackage(candidate.product), evidence: "KIT packages and included receivers must be explicit." },
  ];

  return rowDefs.map((row) => {
    const competitorValue = formatValue(row.comp());

    return {
      group: row.group,
      feature: row.feature,
      competitor: competitorValue,
      values: candidates.map((candidate) => {
        const value = formatValue(row.cand(candidate));

        return {
          value,
          verdict: verdictFor(competitorValue, value),
        };
      }),
      evidence: row.evidence,
    };
  });
}

function outcomeClass(outcome: string): string {
  const normalised = lower(outcome);

  if (normalised.includes("good")) return "wm-compact-outcome-good";
  if (normalised.includes("partial") || normalised.includes("verify")) return "wm-compact-outcome-partial";
  if (normalised.includes("no")) return "wm-compact-outcome-no";
  return "wm-compact-outcome-check";
}

function verdictClass(verdict: CellVerdict): string {
  return `wm-compact-verdict wm-compact-verdict-${verdict}`;
}

export function CompactCompareMatrix({ result, maxCandidates = 4 }: CompactCompareMatrixProps) {
  const candidates = useMemo(() => candidateList(result, maxCandidates), [result, maxCandidates]);
  const rows = useMemo(() => buildRows(result, candidates), [result, candidates]);
  const competitor = competitorProfile(result);
  const competitorLabel = [firstText(competitor, ["brand", "manufacturer"]), firstText(competitor, ["sku"])].filter(Boolean).join(" ") || "Competitor product";
  const competitorSubtitle = firstText(competitor, ["title", "domain", "role"]) || "Resolved competitor profile";

  if (!candidates.length) {
    return (
      <section className="wm-compact-compare" data-wingman-compact-compare="true">
        <div className="wm-compact-empty">
          No WyreStorm candidate columns are available yet. Resolve the competitor profile and candidate pool first.
        </div>
      </section>
    );
  }

  return (
    <section className="wm-compact-compare" data-wingman-compact-compare="true">
      <div className="wm-compact-compare-toolbar">
        <div>
          <p className="wm-compact-kicker">Replacement comparison grid</p>
          <h2>Compare {competitorLabel} against WyreStorm options</h2>
        </div>

        <div className="wm-compact-toolbar-actions">
          <span>{candidates.length} option{candidates.length === 1 ? "" : "s"}</span>
          <span>{normalise(result?.topOutcome || "CHECK")}</span>
        </div>
      </div>

      <div className="wm-compact-compare-scroll">
        <table className="wm-compact-compare-table">
          <thead>
            <tr className="wm-compact-product-row">
              <th className="wm-compact-feature-head">
                <span className="wm-compact-arrow">Replace product</span>
              </th>
              <th className="wm-compact-competitor-head">
                <span className="wm-compact-column-title">{competitorLabel}</span>
                <span className="wm-compact-column-subtitle">{competitorSubtitle}</span>
              </th>
              {candidates.map((candidate) => (
                <th key={candidate.sku} className="wm-compact-candidate-head">
                  <span className="wm-compact-column-title">{candidate.label}</span>
                  <span className="wm-compact-column-subtitle">{candidate.subtitle || "WyreStorm candidate"}</span>
                  <span className={`wm-compact-outcome ${outcomeClass(candidate.outcome)}`}>
                    {candidate.outcome || "CHECK"} - {candidate.confidence || 0}%
                  </span>
                </th>
              ))}
              <th className="wm-compact-evidence-head">Evidence</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => {
              const previous = rows[index - 1];
              const showGroup = !previous || previous.group !== row.group;

              return (
                <tr key={`${row.group}-${row.feature}`} className={showGroup ? "wm-compact-group-start" : undefined}>
                  <th className="wm-compact-feature-cell">
                    {showGroup ? <span className="wm-compact-group-label">{row.group}</span> : null}
                    <span>{row.feature}</span>
                  </th>

                  <td className="wm-compact-value-cell wm-compact-competitor-cell">{row.competitor}</td>

                  {row.values.map((value, valueIndex) => (
                    <td key={`${row.feature}-${candidates[valueIndex]?.sku}`} className={`wm-compact-value-cell wm-compact-cell-${value.verdict}`}>
                      <span className={verdictClass(value.verdict)}>{verdictIcon(value.verdict)}</span>
                      <span>{value.value}</span>
                    </td>
                  ))}

                  <td className="wm-compact-evidence-cell">{row.evidence}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="wm-compact-legend">
        <span><b className="wm-legend-match">OK</b> Match</span>
        <span><b className="wm-legend-partial">CHK</b> Check / partial</span>
        <span><b className="wm-legend-no">NO</b> No match</span>
        <span><b className="wm-legend-plus">+</b> WyreStorm extra</span>
      </div>
    </section>
  );
}