import fs from "node:fs";
import path from "node:path";

/**
 * The route-owned page stylesheets split out of `wingman-route-overrides.css`.
 *
 * A rule belongs to one of these files only when every selector branch is scoped
 * to that page by the plumbing AppShell sets: `html[data-wingman-route="<key>"]`,
 * where the key is a live `WingmanRouteKey`, or `.wm-route-<segment>`, where the
 * segment comes from `route-manifest.json`. Blocks that also name another page, a
 * page markup attribute (`data-wingman-page`) or a route token no longer in the
 * catalogue stay in the legacy file, so a gate that reads "the route overrides"
 * has to read every file below or it will stop seeing rules that moved.
 *
 * `file` order is the order `src/main.tsx` imports them, which is the order the
 * browser applies them in. Page files load after the legacy file, so a rule that
 * would flip a tie with a later shared rule is left behind rather than moved.
 */
export const ROUTE_PAGE_STYLESHEETS = Object.freeze([
  { route: "call-coach", key: "callCoach", segment: "call-coach", file: "wingman-route-call-coach.css", label: "Call Coach" },
  { route: "compare", key: "compare", segment: "compare", file: "wingman-route-compare.css", label: "Compare" },
  { route: "dashboard", key: "dashboard", segment: "dashboard", file: "wingman-route-dashboard.css", label: "Dashboard" },
  { route: "discovery", key: "discovery", segment: "discovery", file: "wingman-route-discovery.css", label: "Discovery" },
  { route: "glossary", key: "glossary", segment: "glossary", file: "wingman-route-glossary.css", label: "Glossary" },
  { route: "projects", key: "projects", segment: "projects", file: "wingman-route-projects.css", label: "Projects" },
  { route: "sales-helper", key: "salesHelper", segment: "sales-helper", file: "wingman-route-sales-helper.css", label: "Sales Helper" },
  { route: "settings", key: "profile", segment: "settings", file: "wingman-route-settings.css", label: "Settings" },
  { route: "templates", key: "templates", segment: "templates", file: "wingman-route-templates.css", label: "Templates" },
]);

/** The shared remainder: every route block that no single page owns. */
export const LEGACY_ROUTE_OVERRIDES = "wingman-route-overrides.css";

/** Route-owned stylesheets in load order, legacy file first. */
export const ROUTE_STYLESHEETS = Object.freeze([
  LEGACY_ROUTE_OVERRIDES,
  ...ROUTE_PAGE_STYLESHEETS.map((page) => page.file),
]);

/**
 * The CSS imports `src/main.tsx` must declare, in this exact order. The design
 * system loads first, then the route overrides (shared remainder, then page
 * files), then the companion themes that finish the cascade.
 */
export const GOVERNED_MAIN_CSS_IMPORTS = Object.freeze([
  "./wingman2/styles/wingman-layer-tokens.css",
  "./wingman2/styles/wingman-layer-reset.css",
  "./wingman2/styles/wingman-layer-layout.css",
  "./wingman2/styles/wingman-layer-components.css",
  ...ROUTE_STYLESHEETS.map((file) => `./wingman2/styles/${file}`),
  "./wingman2/styles/wingman-reference-theme.css",
  "./wingman2/styles/wingman-workflow-theme.css",
  "./wingman2/styles/wingman-polish-navigation.css",
  "./wingman2/styles/wingman-reference-global.css",
  "./wingman2/styles/wingman-ui-consistency.css",
  "./wingman2/styles/wingman-sales-workspace.css",
  "./wingman2/styles/wingman-voice-capture.css",
  "./wingman2/components/diagramPresentation.css",
  "./wingman2/components/projectScopeSchedule.css",
  "./wingman2/components/technicalSchematic.css",
  "./wingman2/pages/project/project-workspace.css",
  "./wingman2/pages/templateLibraryLayout.css",
]);

/** Where the governed CSS files live, relative to the repo root. */
const STYLE_DIRECTORY = path.join("src", "wingman2", "styles");

/** Absolute paths of every route-owned stylesheet, legacy file first. */
export function routeStylesheetPaths(root = process.cwd()) {
  return ROUTE_STYLESHEETS.map((file) => path.join(root, STYLE_DIRECTORY, file));
}

/** Absolute path of one page's stylesheet. */
export function routePageStylesheetPath(route, root = process.cwd()) {
  const page = ROUTE_PAGE_STYLESHEETS.find((entry) => entry.route === route);

  if (!page) {
    throw new Error(`Unknown route stylesheet: ${route}`);
  }

  return path.join(root, STYLE_DIRECTORY, page.file);
}

/**
 * Reads every route-owned stylesheet as one string, in load order.
 *
 * Gates ask questions about "the route overrides" and a rule answers them from
 * whichever file now owns it, so the concatenation is the only reading that
 * survives the split.
 */
export function readRouteStyles(root = process.cwd()) {
  const files = routeStylesheetPaths(root);
  const missing = files.filter((file) => !fs.existsSync(file));

  if (missing.length > 0) {
    throw new Error(
      `Missing route stylesheet(s): ${missing
        .map((file) => path.relative(root, file).replaceAll("\\", "/"))
        .join(", ")}`,
    );
  }

  return {
    files: files.map((file) => path.relative(root, file).replaceAll("\\", "/")),
    text: files.map((file) => fs.readFileSync(file, "utf8")).join("\n"),
  };
}
