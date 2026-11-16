import type { ProductSelectorDecision } from "../../lib/productSelectorEngine";
import { finderWorkflows } from "./productFinderWorkflows";

export type FinderNeed = "present" | "extend" | "duplicate" | "matrix" | "network" | "camera" | "wall" | "sound" | "usb" | "control" | "not-sure";
export type FinderConnection = "hdmi" | "usb-c" | "hdbaset" | "fibre" | "usb-kvm" | "network" | "dante" | "poe" | "control";

const needTerms: Record<FinderNeed, string[]> = {
  present: ["presentation", "wireless", "usb-c", "usbc", "byod", "switcher", "laptop sharing"],
  extend: ["extender", "hdbaset", "hdmi extension", "long distance", "transmitter", "receiver"],
  duplicate: ["splitter", "duplicator", "duplicate", "distribution amplifier", "1x2", "1x4"],
  matrix: ["matrix", "matrix switcher", "matrix routing", "routing matrix", "routed i/o", "multi-input matrix"],
  network: ["networkhd", "av over ip", "avoip", "encoder", "decoder", "network video", "ip video"],
  camera: ["camera", "ptz", "ndi camera", "webcam", "video bar"],
  wall: ["video wall", "videowall", "wall processor", "multiview", "multi-view"],
  sound: ["audio", "amplifier", "dante", "microphone", "speaker", "audio dsp"],
  // Generic USB connectors are common on switchers and cameras, but do not
  // establish that a product extends or switches USB devices.
  usb: ["kvm", "usb kvm", "usb extender", "usb extension", "usb switching", "usb switch", "usb over hdbaset", "usb over ip"],
  control: ["control", "controller", "rs-232", "rs232", "touchscreen", "automation"],
  "not-sure": [],
};

const connectionTerms: Record<FinderConnection, string[]> = {
  hdmi: ["hdmi"],
  "usb-c": ["usb-c", "usb c", "usbc"],
  hdbaset: ["hdbaset", "hdbase-t"],
  fibre: ["fibre", "fiber", "optical"],
  "usb-kvm": ["kvm", "usb kvm", "usb switching", "usb extender", "usb extension", "usb over hdbaset", "usb over ip"],
  network: ["networkhd", "av over ip", "avoip", "ethernet", "ip video"],
  dante: ["dante", "aes67"],
  poe: ["poe", "poh", "power over ethernet"],
  control: ["rs-232", "rs232", "ir control", "relay", "gpio", "control"],
};

export const finderConnectionLabels: Record<FinderConnection, string> = {
  hdmi: "HDMI",
  "usb-c": "USB-C video",
  hdbaset: "HDBaseT",
  fibre: "Fibre / optical",
  "usb-kvm": "USB / KVM",
  network: "AV over IP / network",
  dante: "Dante / AES67",
  poe: "PoE / PoH",
  control: "RS-232 / control",
};

type RankedFinderProduct = ProductSelectorDecision & { finderScore: number; finderReasons: string[]; finderHardFit: boolean };

function values(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(values);
  if (typeof value === "string" || typeof value === "number") return [String(value)];
  if (value && typeof value === "object") return Object.values(value).flatMap(values);
  return [];
}

function productText(product: ProductSelectorDecision["product"]): string {
  const row = product as Record<string, unknown>;
  return [
    row.sku, row.name, row.title, row.family, row.category, row.description,
    row.summary, row.technologies, row.features, row.connectors,
    row.technicalProfile, row.productClassification,
  ].flatMap(values).join(" ").toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function positiveNumber(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function videoPortCounts(decision: ProductSelectorDecision): { inputs?: number; outputs?: number } {
  const product = record(decision.product);
  const technicalProfile = record(product.technicalProfile);
  const io = record(technicalProfile.io);
  const entries = [
    ...(Array.isArray(io.video) ? io.video : []),
    ...(Array.isArray(io.ports) ? io.ports : []),
  ].map(record).filter((port) => {
    const connector = String(port.connector ?? "").toLowerCase();
    return String(port.category ?? "").toLowerCase() === "video" || /hdmi|displayport|dvi|sdi|video/.test(connector);
  });
  const unique = new Map<string, Record<string, unknown>>();
  entries.forEach((port) => unique.set(`${port.connector}|${port.direction}|${port.count}`, port));
  let inputs = 0;
  let outputs = 0;
  unique.forEach((port) => {
    const count = positiveNumber(port.count);
    const direction = String(port.direction ?? "").toLowerCase();
    if (!count) return;
    if (direction === "input" || direction === "bidirectional") inputs += count;
    if (direction === "output" || direction === "bidirectional") outputs += count;
  });
  const sku = `${decision.sku} ${String(product.sku ?? "")}`;
  const matrixSize = sku.match(/\bMX[-\s]?(\d{2})(\d{2})\b/i);
  if (matrixSize) {
    inputs ||= Number(matrixSize[1]);
    outputs ||= Number(matrixSize[2]);
  }
  const videoOutput = record(technicalProfile.videoOutput);
  const outputQuantity = positiveNumber(videoOutput.routedQuantity);
  if (!outputs && outputQuantity) outputs = outputQuantity;
  return { inputs: inputs || undefined, outputs: outputs || undefined };
}

function meetsCapacity(
  counts: { inputs?: number; outputs?: number },
  capacity: NonNullable<import("./productFinderWorkflows").FinderWorkflowOption["capacity"]>,
): boolean {
  const matches = ([key, range]: ["inputs" | "outputs", { min?: number; max?: number } | undefined]) => {
    if (!range) return true;
    const count = counts[key];
    return count !== undefined && (range.min === undefined || count >= range.min) && (range.max === undefined || count <= range.max);
  };
  const checks = (["inputs", "outputs"] as const).map((key) => [key, capacity[key]] as [typeof key, typeof capacity[typeof key]]).filter(([, range]) => Boolean(range));
  return capacity.mode === "any" ? checks.some(matches) : checks.every(matches);
}

function phraseMatches(text: string, phrase: string): boolean {
  const normalised = phrase.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return normalised.length > 2 && ` ${text} `.includes(` ${normalised} `);
}

export function rankProductFinderCandidates(
  products: ProductSelectorDecision[],
  need: FinderNeed,
  connections: FinderConnection[] = [],
  workflowAnswers: Record<string, string> = {},
): RankedFinderProduct[] {
  const selectedWorkflowOptions = (finderWorkflows[need] ?? []).flatMap((question) => {
    const selectedId = workflowAnswers[question.id];
    return selectedId ? question.options.filter((option) => option.id === selectedId) : [];
  });
  return products
    .filter((decision) => decision.eligible && !["accessory", "software"].includes(decision.profile.productRole))
    .map((decision) => {
      const text = productText(decision.product);
      const needMatch = needTerms[need].find((term) => phraseMatches(text, term));
      const connectionMatches = connections.filter((connection) =>
        connectionTerms[connection].some((term) => phraseMatches(text, term)),
      );
      const counts = videoPortCounts(decision);
      const workflowMatches = selectedWorkflowOptions.filter((option) =>
        (option.matchTerms ?? []).some((term) => phraseMatches(text, term)),
      );
      const workflowHardFailures = selectedWorkflowOptions.filter((option) => {
        const requiredTermsMet = !option.requiredProductTerms?.length || option.requiredProductTerms.some((term) => phraseMatches(text, term));
        const capacityMet = !option.capacity || meetsCapacity(counts, option.capacity);
        return !requiredTermsMet || !capacityMet;
      });
      const workflowRequirementMatches = selectedWorkflowOptions.filter((option) => {
        if (option.capacity) return meetsCapacity(counts, option.capacity);
        return Boolean(option.requiredProductTerms?.some((term) => phraseMatches(text, term)));
      });
      const workflowUnconfirmed = selectedWorkflowOptions.filter((option) =>
        Boolean(option.matchTerms?.length) && !workflowMatches.includes(option),
      );
      const finderScore = Number(Boolean(needMatch)) * 12 + connectionMatches.length * 8 + workflowMatches.length * 5 + (decision.profile.productRole === "primary" ? 2 : 0);
      const finderReasons = Array.from(new Set([
        ...(needMatch ? [`Matches the requested function: ${needMatch}.`] : []),
        ...workflowMatches.slice(0, 2).map((option) => `Product information supports: ${option.label}.`),
        ...workflowRequirementMatches.slice(0, 2).map((option) => option.capacity
          ? `Structured port data confirms ${counts.inputs ?? "unknown"} video inputs and ${counts.outputs ?? "unknown"} video outputs for the ${option.label} requirement.`
          : `Product-specific evidence confirms: ${option.label}.`),
        ...connectionMatches.slice(0, 2).map((connection) => `Supports a prioritised connection: ${finderConnectionLabels[connection]}.`),
        ...workflowUnconfirmed.slice(0, 2).map((option) => `The product record does not confirm: ${option.label}; verify before specifying it.`),
        ...connections.filter((connection) => !connectionMatches.includes(connection)).map((connection) =>
          `The product record does not confirm ${finderConnectionLabels[connection]}; verify before specifying it.`,
        ),
      ]));
      return { ...decision, finderScore, finderReasons, finderHardFit: workflowHardFailures.length === 0 };
    })
    // The primary-product tie-break contributes score, but cannot establish
    // function fit. For a specific function, require product text that names
    // that function; connection-only matches must not change the requested job.
    .filter((decision) => decision.finderHardFit && (need === "not-sure" || Boolean(needTerms[need].find((term) => phraseMatches(productText(decision.product), term)))))
    .sort((left, right) => right.finderScore - left.finderScore || right.score - left.score || left.sku.localeCompare(right.sku))
    .slice(0, 5);
}
