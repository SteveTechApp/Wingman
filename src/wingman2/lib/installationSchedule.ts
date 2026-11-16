import { wallTransportPlan, wallTransportRequirements, cleanDetailText, normalizeWallLinkDetail } from "./videowallTransport";
import type { WallRequirements } from "./videowallOptions";

/**
 * Installation and services as line items, derived from the site survey.
 *
 * A survey records the housing the display sits in, where each run enters and
 * the termination at the display end. A mount belongs to the display, so its
 * installation scope belongs in the system proposal, so it becomes schedule
 * lines rather than only notes beside a link: the same back box written on four
 * panels is one line with a quantity of four.
 *
 * Lines are grouped by what was written, not by link, so a letter-for-letter
 * difference in casing or spacing cannot split one job into two lines.
 */
export type InstallationLineCategory = "enclosure" | "mount" | "termination" | "entry";

export type InstallationLine = {
  /** Stable key a stored rate is filed under: `install-<category>-<detail>`. */
  id: string;
  category: InstallationLineCategory;
  /** What the survey wrote, as the first link wrote it. */
  detail: string;
  /** How many links need this item. */
  quantity: number;
  /** Links it applies to, so the schedule can point at them. */
  links: string[];
};

export type InstallationSchedule = {
  lines: InstallationLine[];
  /** Physical links in the wall design. */
  linkCount: number;
  /** One sentence naming what the survey recorded, for the schedule header. */
  text: string;
};

const CATEGORY_ORDER: InstallationLineCategory[] = ["enclosure", "mount", "termination", "entry"];

const CATEGORY_LABEL: Record<InstallationLineCategory, string> = {
  enclosure: "Display housing",
  mount: "Mount",
  termination: "Termination",
  entry: "Run entry",
};

/** The count sentence's words, because "run entrys" is not a plural. */
const CATEGORY_PLURAL: Record<InstallationLineCategory, string> = {
  enclosure: "display housings",
  mount: "mounts",
  termination: "terminations",
  entry: "run entries",
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "item";
}

/** A stable id for the same category and wording. */
export function installationLineId(category: InstallationLineCategory, detail: string) {
  return `install-${category}-${slug(detail)}`;
}

/** How the line reads in a schedule: "Display housing — Back box". */
export function installationLineLabel(line: InstallationLine) {
  return `${CATEGORY_LABEL[line.category]} — ${line.detail}`;
}

/** The survey cell this line came from: display housing, mount, termination or run entry. */
export function installationCategoryLabel(category: InstallationLineCategory) {
  return CATEGORY_LABEL[category];
}

/**
 * The installation table's column names, spelled once for every surface.
 *
 * Proposal surfaces share these scope headings so they cannot drift in wording.
 */
export type InstallationTableColumn =
  | "service"
  | "detail"
  | "links"
  | "quantity";

export const INSTALLATION_TABLE_COLUMN_LABELS: Record<InstallationTableColumn, string> = {
  service: "Service",
  detail: "Survey detail",
  links: "Links",
  quantity: "Qty",
};

/** A heading group: one column, or several the table prints in a single cell. */
export type InstallationColumnGroup = InstallationTableColumn | readonly InstallationTableColumn[];

/** One installation table's headings, in the order that table prints them. */
export function installationTableHeaders(groups: readonly InstallationColumnGroup[]) {
  return groups.map((group) =>
    (typeof group === "string" ? [group] : group)
      .map((column) => INSTALLATION_TABLE_COLUMN_LABELS[column])
      .join(" / "),
  );
}

/**
 * Group the survey's install detail into scope lines.
 *
 * A wall whose summary predates the layout answers has no costable links, so it
 * has no installation scope either — the caller must not invent one. A mount is
 * optional on the survey, but once it is written it is scope, so it is included.
 */
export function buildInstallationSchedule(
  requirements: WallRequirements | null | undefined,
): InstallationSchedule | null {
  const usable = wallTransportRequirements(requirements);
  if (!usable) return null;
  const plan = wallTransportPlan(usable);
  const byKey = new Map<string, InstallationLine>();
  const counted = { enclosure: 0, mount: 0, termination: 0, entry: 0 };

  for (const link of plan.allLinks) {
    const detail = normalizeWallLinkDetail(usable.linkDetails?.[link.id]);
    for (const category of CATEGORY_ORDER.filter((item) => item !== "mount")) {
      const value = cleanDetailText(detail[category]);
      if (!value) continue;
      counted[category] += 1;
      const key = `${category}|${value.toLowerCase()}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.quantity += 1;
        existing.links.push(link.label);
      } else {
        byKey.set(key, {
          id: installationLineId(category, value),
          category,
          detail: value,
          quantity: 1,
          links: [link.label],
        });
      }
    }
  }

  // A mount is a display line, not a cable line. Keep one quantity per
  // display even when the wall has separate source and return links.
  for (const [displayId, rawMount] of Object.entries(usable.displayMounts ?? {})) {
    const value = rawMount.trim().replace(/\s+/g, " ");
    if (!value) continue;
    const number = Number(displayId.match(/display-(\d+)$/)?.[1]);
    if (!Number.isInteger(number) || number < 1) continue;
    const key = `mount|${value.toLowerCase()}`;
    const existing = byKey.get(key);
    const displayLabel = usable.application === "projection" ? `Projector ${number}` : `Panel ${number}`;
    if (existing) {
      existing.quantity += 1;
      existing.links.push(displayLabel);
    } else {
      byKey.set(key, { id: installationLineId("mount", value), category: "mount", detail: value, quantity: 1, links: [displayLabel] });
    }
    counted.mount += 1;
  }

  if (byKey.size === 0) return null;
  const lines = [...byKey.values()].sort(
    (left, right) =>
      CATEGORY_ORDER.indexOf(left.category) - CATEGORY_ORDER.indexOf(right.category)
      || left.detail.localeCompare(right.detail),
  );
  const counts = CATEGORY_ORDER
    .filter((category) => counted[category] > 0)
    .map((category) => `${counted[category]} ${counted[category] === 1 ? CATEGORY_LABEL[category].toLowerCase() : CATEGORY_PLURAL[category]}`);
  const links = plan.allLinks.length;
  return {
    lines,
    linkCount: links,
    text: `Installation scope from the site survey: ${counts.join(", ")} across ${links} wall link${links === 1 ? "" : "s"}.`,
  };
}
