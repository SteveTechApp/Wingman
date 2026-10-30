import type { StoredDiscoveryBrief } from "../features/projects";

/** A room's saved market and space, and which of the two is not recorded. */
export type ProjectPositioning = {
  market: string;
  environment: string;
  /** The halves of Discovery's first step this room has no label for. */
  missing: Array<"market" | "environment">;
};

function label(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Where the customer's world sits in a room's saved answers.
 *
 * Discovery's lead-in records a market and the space inside it, and the interview
 * reads every question after that against the pair, so the brief carries both as
 * the labels the rep chose (`roomModel.market` / `roomModel.environment`). A
 * record with neither was answered without that frame — a room copied from a
 * template, or one reopened after the lead-in was skipped — and a record with one
 * was answered with half of it, which is the common shape: a template preset
 * names the market and leaves the space for the rep.
 *
 * A chosen label counts as recorded even when it says the rep was unsure
 * (`Other / not sure` is an answer, and the lead-in accepted it); only a missing
 * value is reported, because that is the one a rep can still supply.
 */
export function projectPositioning(
  brief: Pick<StoredDiscoveryBrief, "roomModel"> | null | undefined,
): ProjectPositioning {
  const roomModel = brief?.roomModel ?? {};
  const market = label(roomModel.market);
  const environment = label(roomModel.environment);
  const missing: ProjectPositioning["missing"] = [];

  if (!market) missing.push("market");
  if (!environment) missing.push("environment");

  return { market, environment, missing };
}

/**
 * Where a room sits, as the one line the project record prints.
 *
 * The pair is one sentence with two slots, and a slot the lead-in never recorded
 * says so in its own place rather than dropping out of the line: a positioned
 * room and the note about a missing half are then the same shape, so a rep
 * reading two records is comparing one sentence rather than learning two.
 */
export function projectPositioningLine(
  positioning: Pick<ProjectPositioning, "market" | "environment">,
): string {
  const market = positioning.market || "not recorded";
  const environment = positioning.environment || "not recorded";
  return `Market: ${market} · Environment: ${environment}`;
}
