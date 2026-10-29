import { execFileSync, spawn } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
import { assertFreshBuild, buildSummaryLines, failedSummaryLines, refusedSummaryLines } from "./lib/build-freshness.mjs";
import { copyAndDeleteSplitFailure, describeBands } from "./lib/gallery-row-bands.mjs";
import {
  crmPanelClippedFailure,
  crmRemovalBodyMentionFailure,
  crmRemovalNoteDuplicateFailure,
  crmRemovalNoteMismatchFailure,
  crmRemovalNoteWrongShapeFailure,
  crmRemovalTouchedHistoryFailure,
  crmRowNameFailure,
  crmRowSplitFailure,
  crmShortRowBandsFailure,
  crmShortRowWrappedFailure,
  crmWidestRowMissingFailure,
  crmWidestRowNotWrappedFailure,
} from "./lib/crm-history-rows.mjs";
import {
  bandCountSequenceFailure,
  bandCountsClause,
  readBandCountSequence,
} from "./lib/gallery-band-counts.mjs";
import {
  HERO_VIEWPORTS,
  heroContainmentFailure,
  readHeroActionRow,
} from "./lib/hero-header-layout.mjs";
import { readRecentStripPick } from "./lib/recent-strip-pick.mjs";
import {
  WALL_START_VIEWPORTS,
  wallStartBriefLeadsFailure,
  wallStartReadoutFailure,
  wallStartStepFailure,
} from "./lib/wall-start-step.mjs";
import { SAVED_DESIGN_NAME_FLOOR, savedDesignNameFailure } from "./lib/saved-design-names.mjs";
import { stepCardFailure, stepCardStateFailure } from "./lib/proposal-step-cards.mjs";
import {
  recentChipLabelsFailure,
  recentColumnDivergenceFailure,
  recentColumnMatchFailure,
  recentDesignMissingFailure,
  recentDesignNameFailure,
  recentFlagCountFailure,
  recentFlagShareLineFailure,
  recentFlagStackFailure,
  recentPickFailure,
  recentRoleFailure,
  recentRowShapeFailure,
  recentShortChipFailure,
  recentSqueezeFailure,
} from "./lib/recent-strip-rows.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const port = Number(process.env.WINGMAN_BROWSER_SMOKE_PORT || 4177);
const previewCommand = process.platform === "win32" ? "cmd.exe" : "npx";
const previewArgs = process.platform === "win32"
  ? ["/d", "/s", "/c", `npx vite preview --host 127.0.0.1 --port ${port}`]
  : ["vite", "preview", "--host", "127.0.0.1", "--port", String(port)];

function stopWindowsPortListener() {
  if (process.platform !== "win32") return;

  const command = [
    `$ids = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue`,
    "| Select-Object -ExpandProperty OwningProcess -Unique;",
    "foreach ($id in $ids) {",
    "if ($id) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }",
    "}",
  ].join(" ");

  try {
    execFileSync("powershell.exe", ["-NoProfile", "-Command", command], { stdio: "ignore" });
  } catch {
    // Best-effort cleanup for stale local preview servers.
  }
}

async function waitForPreview() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/wingman/proposal`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  throw new Error("Vite preview did not become ready.");
}

async function assertPageText(page, pathname, expectedText) {
  await page.goto(`http://127.0.0.1:${port}${pathname}`, { waitUntil: "networkidle" });
  // Lazy routes can still be rendering after the network becomes idle.
  await expect(page.locator("body"), `Expected ${pathname} to render its page content`)
    .toContainText(expectedText, { ignoreCase: true, timeout: 15_000 });
}

/** How long a route's own chunk has to render before its load counts as hung. */
const ROUTE_RENDER_TIMEOUT = 15_000;

/**
 * What a page that died looks like: the app's own error boundary, and the data
 * router's default element, which stands in when a route's chunk never loads.
 * Returns why it died, or null when the page is alive.
 */
async function routeCrash(page) {
  const boundary = page.getByTestId("app-error-boundary");
  if ((await boundary.count()) > 0 && (await boundary.first().isVisible())) {
    const message = await boundary
      .first()
      .getByTestId("app-error-boundary-message")
      .innerText()
      .catch(() => "");
    return message.trim() ? `the error boundary: ${message.trim()}` : "the error boundary";
  }

  const routerError = page.getByText("Unexpected Application Error", { exact: false });
  if ((await routerError.count()) > 0 && (await routerError.first().isVisible())) {
    return "the router's default error element";
  }

  return null;
}

/**
 * Every route the manifest lists, loaded cold in the built app.
 *
 * A page that dies behind the error boundary is a page no rep can use, and only
 * a build shows it: `vite preview` serves the bundler's chunk graph, where each
 * route is its own entry, while the dev server loads one module at a time and
 * renders pages a build cannot. The schematic palette crash was found this way
 * on the one route a walk opened; this asks the same question of all of them,
 * so the next one fails here rather than in front of a rep.
 *
 * The list is read from the manifest instead of written out here, so a route is
 * covered the day it lands, and the routes that redirect to their consolidated
 * page are loaded too: the page a rep is handed still has to render.
 *
 * A manifest entry names a page's shape, not the addresses inside it, so a room's
 * record and a design's review are never asked to render by the manifest alone —
 * and the design review is the page the palette crash was found on. Those shapes
 * are read off the router (`registeredParameterisedRoutes`) and go through this
 * same loop, so they are held to everything a manifest route is, hero measurement
 * included.
 *
 * A load that ends on another address is read against the router's own redirect
 * list (`declaredRouteSuccessors`): a legacy address the app keeps on purpose lands
 * on the page that replaced it and is reported, while an address no page owns lands
 * on Home through the catch-all and fails — both change the pathname, and the
 * landing is what used to make them look alike.
 *
 * A load has to produce a page, not only a mounted app. `#root` having children
 * says `AppShell` rendered its topbar, navigation and page host for an address
 * under `/wingman` — all of which a rep sees around a page that never arrived —
 * so the reading that answers "did this address render" is the page host's own
 * outlet. An address the router matches to the layout but to no page inside it (a
 * splat whose remaining segment the page does not recognise, a page that returns
 * nothing for the param it was handed) leaves that outlet empty under a full
 * chrome, and the walk fails it by name. The journey strip under the page is the
 * shell's, not the page's, so it is not counted as content.
 */
async function assertManifestRoutesRender(page) {
  const manifestRoutes = JSON.parse(
    readFileSync(path.join(projectRoot, "src/wingman2/app/route-manifest.json"), "utf8"),
  );
  const parameterisedRoutes = registeredParameterisedRoutes();
  const successors = declaredRouteSuccessors();
  const routes = [...manifestRoutes, ...parameterisedRoutes];
  const failures = [];
  const replaced = [];
  const queryState = [];
  const heroRoutes = [];
  const pageErrors = [];
  const recordPageError = (error) => pageErrors.push(error.message || String(error));
  page.on("pageerror", recordPageError);

  try {
    for (const route of routes) {
      pageErrors.length = 0;
      // The shell renders before the route's own chunk does, so the network
      // going idle is what says the chunk was asked for and arrived.
      await page.goto(`http://127.0.0.1:${port}${route.path}`, { waitUntil: "networkidle" });
      const rendered = await page
        .getByTestId("route-loading-fallback")
        .waitFor({ state: "detached", timeout: ROUTE_RENDER_TIMEOUT })
        .then(() => true)
        .catch(() => false);
      const why = pageErrors.length ? ` (${pageErrors[0]})` : "";

      const crash = await routeCrash(page);
      if (crash) {
        failures.push(`${route.path} (${route.label}) died behind ${crash}${why}`);
        continue;
      }
      if (!rendered) {
        failures.push(`${route.path} (${route.label}) never replaced its loading fallback${why}`);
        continue;
      }
      if ((await page.locator("#root").first().evaluate((root) => root.childElementCount)) === 0) {
        failures.push(`${route.path} (${route.label}) rendered nothing into #root${why}`);
        continue;
      }

      // The shell is not the page. `AppShell` mounts its topbar, its navigation and
      // its page host for every address it matches, and the outlet inside that host
      // is where the route's own page lands — so `#root` having children proves the
      // layout mounted, not that the address rendered anything. An address the
      // router matches to the layout but to no page inside it (a splat whose
      // remaining segment the page does not recognise, a page that returns nothing
      // for the param it was handed) leaves an empty outlet under a full chrome,
      // which is the quietest way for a route to stop existing: every box above it
      // is still there, so a walk that counted children would report a render. The
      // journey strip is the shell's own, not the page's, so it does not count.
      const outlet = await page.evaluate(() => {
        const host = document.querySelector('[data-wingman-visual-root="true"]');
        if (!host) return { host: false, pages: [] };
        return {
          host: true,
          pages: [...host.children]
            .filter((child) => !child.matches(".wm-feature-journey"))
            .map((child) => child.tagName.toLowerCase()),
        };
      });
      if (!outlet.host) {
        failures.push(
          `${route.path} (${route.label}) rendered no page host, so the shell around it is not this app's${why}`,
        );
        continue;
      }
      if (!outlet.pages.length) {
        failures.push(
          `${route.path} (${route.label}) rendered the shell with an empty outlet — the address reached the layout and no ` +
            "page inside it, so the manifest or the router names an address this build does not own" +
            why,
        );
        continue;
      }

      // Where the load ends up is not a failure in itself — several routes hand a
      // rep to the page that replaced them, and a page may write its own query
      // state — but only a landing the router declares for that address is a
      // consolidation. Anything else is the catch-all, which is what an address no
      // page owns falls through to: it renders, and the outlet above it is full, so
      // a deleted page read as a route that had moved rather than as an address
      // nothing answers. The router's own redirect list is what tells the two
      // apart, so an address lands where the app declares or it fails here.
      const arrived = new URL(page.url());
      if (arrived.pathname !== route.path) {
        const landed = `${arrived.pathname}${arrived.search}`;
        const successor = successors.get(route.path) ?? null;
        if (successor === null || !arrivedAtDeclaredSuccessor(successor, arrived)) {
          failures.push(
            `${route.path} (${route.label}) landed on ${landed}, which the router does not declare as this `
              + "address's successor: no page owns the address, and the catch-all is what a rep following it reaches"
              + (successor ? ` (the route declares ${successor} instead).` : ".")
              + " Point the manifest at the page that replaced it, or declare the redirect in routes.tsx",
          );
          continue;
        }
        replaced.push(`${route.path} \u2192 ${landed.slice(0, 60)}`);
      } else if (arrived.search) {
        queryState.push(route.path);
      }

      // A route that handed the rep on is read where it lands, and the manifest
      // visits that page on its own: measuring here too would count one header
      // once per redirect that leads to it, and name the hop as its owner.
      if (arrived.pathname === route.path) {
        const heroCount = await assertRouteHeroes(page, route);
        if (heroCount) heroRoutes.push(`${route.path}${heroCount > 1 ? ` (${heroCount} heroes)` : ""}`);
      }
    }
  } finally {
    page.off("pageerror", recordPageError);
  }

  if (failures.length) {
    throw new Error(`Routes the walk loads did not render in the built app: ${failures.join("; ")}.`);
  }

  console.log(
    `[browser-smoke] All ${manifestRoutes.length} routes in the manifest and ${parameterisedRoutes.length} parameterised and splat addresses the router registers (${parameterisedRoutes.map((route) => `${route.label} \u2192 ${route.path}`).join(", ")}) rendered a page inside the shell in the built app, none behind the error boundary and none stopping at the chrome` +
      (replaced.length ? `; ${replaced.length} land on the successor the router declares for them (${replaced.join(", ")})` : "") +
      (queryState.length ? `; ${queryState.length} write their own query state (${queryState.join(", ")})` : "") +
      (heroRoutes.length ? `; ${heroRoutes.length} mount a hero header, measured at every hero width (${heroRoutes.join(", ")})` : "") +
      ".",
  );
}

/**
 * Every hero header a manifest route mounts, read by the rules the two named
 * surfaces are read by.
 *
 * The two passes above name their surfaces, which is what lets Settings' row be
 * held to its per-width contract. This sweep names none, so a page that starts
 * mounting a `.wm-polish-hero` header is measured the day its route lands rather
 * than the day someone remembers to add it to a list here. What it reads is the
 * half of the rules no page owns: the icon, the copy beside it and any third
 * child inside the header's own content box, that child's buttons on one line,
 * and the third child in a column of its own or on a line of its own. Which
 * column a page's own sheet gives its row stays that page's business.
 *
 * The widths are the hero widths, so a phone reading and the 981-1023px band the
 * shared template alone covers are both measured on every route that mounts a
 * hero, and the sweep's own width is put back afterwards: the next route has to
 * load in the layout the walk set, not in the last width this pass measured.
 */
const HERO_ANY_SELECTOR = ".wm-polish-hero";

async function assertRouteHeroes(page, route) {
  const count = await page.locator(HERO_ANY_SELECTOR).count();
  if (!count) return 0;
  const resting = page.viewportSize();
  try {
    for (let index = 0; index < count; index += 1) {
      const name = count > 1
        ? `${route.path} (${route.label}) hero ${index + 1}`
        : `${route.path} (${route.label})`;
      for (const viewport of HERO_VIEWPORTS) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const at = `${viewport.width}px`;
        const measured = await measureHeroBoxes(page, HERO_ANY_SELECTOR, index);
        assertHeroHeader(measured, { at, name, route: route.path });
      }
    }
  } finally {
    if (resting) await page.setViewportSize(resting);
  }
  return count;
}

async function assertCompareWorkflow(page) {
  await page.goto(`http://127.0.0.1:${port}/wingman/compare`, { waitUntil: "networkidle" });

  // Minimum-card Compare is a single manufacturer + SKU form.
  // Both controls are datalist-backed inputs and expose the combobox role.
  const manufacturerInput = page.getByRole("combobox", { name: /^Manufacturer$/i });
  const skuInput = page.getByRole("combobox", { name: /^Competitor SKU$/i });

  await manufacturerInput.fill("Crestron");
  await skuInput.fill("DM-NVX-350");

  // Exact known SKUs may auto-advance immediately. If they do not, the same
  // form retains an explicit Compare submit path for typed/unknown entries.
  const resultHeading = page.getByRole("heading", { name: "Comparison result" });

  if (!(await resultHeading.isVisible().catch(() => false))) {
    const compareButton = page.getByRole("button", { name: "Compare", exact: true });

    if (await compareButton.isVisible().catch(() => false)) {
      await compareButton.click();
    }
  }

  await resultHeading.waitFor({ state: "visible", timeout: 15_000 });

  const cards = page.locator('[aria-label="Compare product cards"]');
  await cards.waitFor({ state: "visible", timeout: 15_000 });

  const competitorCard = cards.locator('[aria-label="Competitor product card"]');
  const wyrestormCard = cards.locator('[aria-label="WyreStorm product card"]');

  await competitorCard.waitFor({ state: "visible", timeout: 10_000 });
  await wyrestormCard.waitFor({ state: "visible", timeout: 10_000 });

  const competitorText = await competitorCard.innerText();
  const wyrestormText = await wyrestormCard.innerText();
  const bodyText = await page.locator("body").innerText();

  if (!competitorText.includes("DM-NVX-350")) {
    throw new Error("Compare workflow did not retain the selected competitor SKU on the competitor card.");
  }

  if (bodyText.includes("Product data not loaded")) {
    throw new Error("Compare workflow could not load product data.");
  }

  if (!/NHD-|NetworkHD|WyreStorm/i.test(wyrestormText)) {
    throw new Error("Compare workflow did not render a sensible WyreStorm match on the primary product card.");
  }

  for (const blockedSku of ["APO-210-UC", "APO-SKY-MIC", "COM-MIC-HUB", "CAM-210-PTZ"]) {
    if (wyrestormText.includes(blockedSku)) {
      throw new Error(`Compare workflow rendered blocked non-equivalent candidate ${blockedSku}.`);
    }
  }
}

/**
 * Several long-named designs saved from one room, which is what the gallery
 * card's action row has to hold: three names longer than the column the card
 * sits in at every width this check measures.
 */
const GALLERY_TEMPLATE_NAMES = [
  "Northbridge Meeting Room Refresh — standard Teams room with dual 86 in displays",
  "Northbridge Meeting Room Refresh — east wing boardroom variant with ceiling microphones and Dante audio",
  "Northbridge Meeting Room Refresh — huddle room starter with single display and USB-C table connection",
];

const GALLERY_TEMPLATE_KEY = "wingman-custom-room-templates-v1";

/** The room the designs were saved from, and the room the conflict lands on. */
const GALLERY_ROOM_ID = "northbridge-meeting-room-refresh";
const GALLERY_ROOM_NAME = "Northbridge Meeting Room Refresh";

/**
 * The project a rep has created and not yet saved a design from — the row the
 * gallery shows first in any new workspace, and the one state the store has to
 * supply rather than the page.
 *
 * Written into the project store rather than saved through the page, because by
 * the time this pass runs every starter example it can reach has a design: a card
 * with nothing to open is a state only the store can show.
 */
const NO_DESIGN_PROJECT = {
  id: "riverside-briefing-room-fitout",
  name: "Riverside Briefing Room Fitout",
  owner: "Steve",
  stage: "Discovery",
  status: "",
  updated: "Just now",
  resumeTo: "/wingman/discovery",
  createdAt: "2026-10-27T09:00:00.000Z",
  updatedAt: "2026-10-27T09:00:00.000Z",
};

/**
 * A room with two short-named designs, which the starters cannot supply: all three
 * of them are a row of their own above, so a fifth shape needs a fifth room.
 *
 * Written into the project store the way `NO_DESIGN_PROJECT` is, and for the same
 * reason — the room has to exist before a design can be saved from it — while its
 * two designs are seeded from the list like every other state's.
 */
const TWO_SHORT_DESIGN_PROJECT = {
  id: "kingsway-training-room-refresh",
  name: "Kingsway Training Room Refresh",
  owner: "Steve",
  stage: "Proposal Builder",
  status: "recommended",
  updated: "Today",
  resumeTo: "/wingman/proposal",
  createdAt: "2026-10-27T09:00:00.000Z",
  updatedAt: "2026-10-27T09:00:00.000Z",
};

/**
 * The row shapes the gallery card's action row is held in, in one list.
 *
 * `assertGalleryCardActions` seeds and measures every entry here — the designs a
 * row carries, the link count it expects, the banner that rides the widest row,
 * the short name that is meant to share the trailing pair's line — and the
 * stylesheet rule that lays the row out points back at this list rather than
 * describing the shapes in its own comment. A fifth shape is therefore added in
 * this list, in the walk, instead of in the check and the stylesheet separately,
 * which is how the two came to describe the same row in different words.
 *
 * Every entry carries:
 *
 *   - `roomId` and `designs`: the names saved from that room, so the seed is the
 *     list too — a state with no designs seeds nothing, and a state that needs a
 *     room the starters do not have brings `project` to put it on the page, with
 *     or without designs, because a card is a store state rather than something
 *     the page can be clicked into;
 *   - `banner` / `sharesLine`: the two readings that only one state makes. The
 *     sync-conflict banner is written onto the designs' own room, so it rides the
 *     widest row; the short name is the row that must share Copy and Delete's
 *     line wherever the row leaves room for both;
 *   - `rowLines`: how many bands the row wraps over at the width where the card is
 *     as wide as a two-column card ever gets — the shape the state has, rather
 *     than only how wide the card is at that width. A row that keeps every box
 *     inside the card and still spreads over an extra band has spent a line of
 *     the card to say nothing, and no box check in this pass can see that. Every
 *     other two-column width is held to the same count, so the tablet's card — the
 *     same band on a narrower card — cannot lay the row out in a different shape
 *     without the walk naming it;
 *   - `headline`: the words this state's clause in the pass summary uses. The
 *     numbers in that clause are read off the page during the run and printed
 *     beside it, so no state carries a remembered measurement that could drift
 *     from the one the walk just took.
 */
const GALLERY_ROW_STATES = [
  {
    key: "several",
    roomId: GALLERY_ROOM_ID,
    room: GALLERY_ROOM_NAME,
    designs: GALLERY_TEMPLATE_NAMES,
    banner: true,
    rowLines: 5,
    headline: `the widest row — ${GALLERY_TEMPLATE_NAMES.length} long-named designs, the sync-conflict banner naming its lanes and Copy/Delete behind`,
  },
  {
    // The room a single save leaves behind, and the only row whose wrap cannot be
    // blamed on a list of designs. One of the gallery's own starter examples, so
    // the card is real rather than a fixture.
    key: "one",
    roomId: "harbour-retail-signage-rollout",
    room: "Harbour Retail Signage Rollout",
    designs: ["Harbour Retail Signage Rollout — single display, USB-C table connection and ceiling speakers"],
    rowLines: 3,
    headline: "the row a single save leaves, whose wrap cannot be blamed on a list of designs",
  },
  {
    // The row a rep reaches by naming a design plainly. The long-named row has to
    // wrap; this one must not, because a row that wraps where the name fits has
    // spent a line of the card on nothing.
    key: "short",
    roomId: "westbrook-classroom-standard",
    room: "Westbrook Classroom Standard",
    designs: ["Westbrook Classroom 75 in"],
    sharesLine: true,
    rowLines: 2,
    headline: "the row whose one design has a short name, which shares Copy and Delete's line wherever the row has room for both",
  },
  {
    // A second short name in the same row: one short name shares the pair's line
    // because it is the only entry, while two of them have each other to share the
    // design line with. The names stay short so the row's wrap is about the count
    // of entries rather than about their length, and the room is a store state
    // because the three starters are already a row each above.
    key: "two-short",
    roomId: TWO_SHORT_DESIGN_PROJECT.id,
    room: TWO_SHORT_DESIGN_PROJECT.name,
    designs: ["Kingsway Training 75 in", "Kingsway Training 86 in"],
    project: TWO_SHORT_DESIGN_PROJECT,
    rowLines: 3,
    headline: "the row two short-named designs share, which the single-short-name row cannot speak for",
  },
  {
    // The row that has to close the card's right edge with nothing in front of the
    // trailing pair.
    key: "none",
    roomId: NO_DESIGN_PROJECT.id,
    room: NO_DESIGN_PROJECT.name,
    designs: [],
    project: NO_DESIGN_PROJECT,
    rowLines: 1,
    headline: "the row with no saved designs, which closes the card's edge with no template link in front of the pair",
  },
];

/**
 * The widths the gallery card's action row is measured at, in one list.
 *
 * 1366px is the laptop layout, 390px and 360px are the phones. The interesting
 * widths are the middle ones: the gallery is three columns above 1150px, two down
 * to 761px and one at 760px and below, so 1151px / 1150px and 761px / 760px are
 * the pairs either side of those two changes — the card at 1150px is the widest
 * two-column card the gallery ever lays out. 1024px is the tablet reading inside
 * the same band. The two-column band used to run down to 581px, where a 250px card
 * gave its design entry 191px and the shared floor was held at 12 to match; the
 * band stops at 760px now, so the narrowest two-column card is a 370px one and the
 * floor can be what a name needs.
 *
 * A width that carries `columns` is a width the sharing promise is about, and the
 * count is what makes a pair a pair: if a breakpoint moves out from between them,
 * both halves of the pair read the same count, the card the pair exists for is never
 * measured, and the sharing check would still be green. Each of those widths also
 * prints its reading in the pass summary. 581px is read for its count alone: it is
 * the last two-column width, so its card is a narrow one that wraps over whatever its
 * own width gives it, and holding it to the widest card's shape would be asking a
 * 370px card for a 495px card's rows.
 *
 * `rowShape` marks the width a declared band count is read at, and 1150px is the
 * only width that can carry one: it is the widest a two-column card gets, so the
 * row there has the most room it will ever have while sharing its line with
 * another card. Reading a *declared* count at any other width would hold the row
 * to a number the layout gives that card — a narrow three-column one or a phone —
 * for reasons of width rather than of shape.
 *
 * `shape` marks a width whose band count is held to that widest card's rather than to
 * a number declared here, which is why the promise survives a re-seed. 1024px is held
 * to it exactly, in both directions: it is the same two-column band on a narrower
 * card, so a tablet row that differs either way is a rule scoped below 1150px that no
 * other width would catch. 580px is held to it as a ceiling: it is the top of the
 * single-column block, where the card is wider than the widest two-column one, so a
 * row that needs *more* bands there is a rule inside that block spending a line —
 * which is the one thing nothing measured before, since the phone widths below it are
 * already allowed their extra bands by the design-entry floor.
 */
const GALLERY_CARD_VIEWPORTS = [
  { width: 1366, height: 900 },
  { width: 1151, height: 900, columns: 3 },
  { width: 1150, height: 900, columns: 2, rowShape: true },
  { width: 1024, height: 768, columns: 2, shape: "same" },
  { width: 761, height: 800, columns: 2 },
  { width: 760, height: 800, columns: 1, shape: "atMost" },
  // The width the two-column band used to end at, where its 250px card left the
  // design entry 191px and 14 characters of a name. It is held to one column, so a
  // band that reached back down here fails the count instead of quietly printing a
  // stub that no declared promise covers.
  { width: 581, height: 800, columns: 1 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
];

/** PROJECT_STORE_KEY and PROJECT_STORE_EVENT, from projectRepository. */
const PROJECT_STORE_KEY = "wingman-project-store-v1";
const PROJECT_STORE_EVENT = "wingman:project-store-updated";

/**
 * Three lanes, because the card folds the rest: the banner prints two lane
 * labels and "+1 more", which is the longest form of it a rep ever sees.
 */
const GALLERY_CONFLICT_FIELDS = ["proposal", "requirements", "videowall"];

/**
 * The card's stylesheet gives the entry a floor of 30 characters of its own label
 * at phone width — the "Open template: " verb plus about fifteen characters of the
 * name — and the walk holds the characters the browser actually printed against
 * `SAVED_DESIGN_NAME_FLOOR`, the one number the Home strip's saved-design link is
 * held to as well. The names this walk seeds are 79 to 103 characters long, so no
 * phone width prints one whole: what is being held is that the entry shows a name
 * and not a letter.
 */

/**
 * The CRM send history, from crmWebhook's own store key.
 *
 * Seeded rather than sent: a history is what a browser accumulates, and the row
 * this walk is about — a failure that kept the body it POSTed — only exists
 * after an endpoint refused a send, which a preview build has no endpoint to do.
 */
const CRM_HISTORY_KEY = "wingman-crm-webhook-history";

/** The room whose record carries the CRM panel, which is the gallery walk's room too. */
const CRM_HISTORY_ROOM_ID = GALLERY_ROOM_ID;

/**
 * The last width at which the send-history row wraps, from the stylesheet's own
 * `@media (max-width: 560px)` rule. The row's name takes the first line there and
 * its controls flow under it; above this width the row is a single line.
 */
const CRM_HISTORY_ROW_WRAP_WIDTH = 560;

/** One failed send's stored body, in the shape a row keeps it. */
function crmHistoryPayload(projectId, projectName = GALLERY_ROOM_NAME) {
  return {
    projectId,
    projectName,
    customer: "Northbridge",
    site: "London HQ",
    stage: "Proposal Builder",
    products: [],
    generatedAt: "2026-10-27T09:00:00.000Z",
    source: "wingman",
  };
}

/**
 * The short-named send, whose row is the one-line case the wrap exists beside.
 *
 * Six characters, because the row's other cells are what decide whether it wraps:
 * the dot, the status, the time, the retry, the drop action and the expander are
 * the same on this row as on the long failed one, so the name is the only thing
 * that differs between the row that wraps and the row that does not.
 */
const CRM_HISTORY_SHORT_NAME = "Huddle";

/**
 * Two of this room's sends, one belonging to another, one short-named send and one
 * failure recorded before bodies were kept, which is the list a rep really reads:
 * the history is one list across every project, and its rows are as different as
 * the room names in it.
 *
 * The three failures that kept the body they POSTed carry the retry control beside
 * the drop action and the conversation expander — the widest a row gets, and the
 * state a refused send leaves behind. The long ones are named long on purpose: the
 * project name is the one thing in a row that can give ground, so a short one would
 * measure a row that never had to shrink. The short-named send is that opposite
 * case, and it is seeded as a failure too, so the two rows carry the same controls
 * and the name is the only thing between one line and three bands. The fifth row is
 * the history's third shape — a failure no body was kept for — which has a sentence
 * of its own to print when a rep would drop it. The order here is the history's own
 * (newest first) rather than something the walk leans on: which row is widest is
 * read off the page by what each row has to fit, so a seed that moves a row does not
 * move the reading with it.
 */
const CRM_HISTORY_ROWS = [
  {
    id: "wh-oversized",
    projectId: CRM_HISTORY_ROOM_ID,
    projectName: `${GALLERY_ROOM_NAME} — east wing boardroom with dual 86 in displays and Dante audio`,
    sentAt: "2026-10-27T09:00:00.000Z",
    status: "error",
    httpStatus: 500,
    errorMessage: "HTTP 500 Internal Server Error",
    payload: crmHistoryPayload(CRM_HISTORY_ROOM_ID),
    discoveryConversation: [
      {
        stepId: "opportunity",
        question: "What type of opportunity is this?",
        answer: "Meeting room / boardroom with two displays and ceiling microphones",
        note: "The exec boardroom on the top floor.",
        confirmed: true,
      },
      {
        stepId: "scale",
        question: "What is the approximate room or system scale?",
        answer: "Single large room",
        note: "",
      },
    ],
  },
  {
    id: "wh-delivered",
    projectId: CRM_HISTORY_ROOM_ID,
    projectName: `${GALLERY_ROOM_NAME} — huddle room with a single display and USB-C table connection`,
    sentAt: "2026-10-27T08:40:00.000Z",
    status: "success",
    httpStatus: 200,
  },
  {
    id: "wh-other-room",
    projectId: "southbank-huddle-room-refresh",
    projectName: "Southbank Huddle Room Refresh — single display, USB-C table connection and ceiling speakers",
    sentAt: "2026-10-27T08:20:00.000Z",
    status: "error",
    httpStatus: 502,
    errorMessage: "HTTP 502 Bad Gateway",
    payload: crmHistoryPayload("southbank-huddle-room-refresh"),
  },
  {
    id: "wh-short-room",
    projectId: "huddle-room-short",
    projectName: CRM_HISTORY_SHORT_NAME,
    sentAt: "2026-10-27T07:40:00.000Z",
    status: "error",
    httpStatus: 500,
    errorMessage: "HTTP 500 Internal Server Error",
    payload: crmHistoryPayload("huddle-room-short", CRM_HISTORY_SHORT_NAME),
  },
  {
    // The shape a history written before bodies were kept still holds: a failure,
    // and nothing to resend. Its row says so rather than reading as either of the
    // other two, which is why the walk reads its cost as well as theirs.
    id: "wh-failure-no-body",
    projectId: CRM_HISTORY_ROOM_ID,
    projectName: `${GALLERY_ROOM_NAME} — huddle room, recorded before bodies were kept`,
    sentAt: "2026-10-27T07:20:00.000Z",
    status: "error",
    httpStatus: 500,
    errorMessage: "HTTP 500 Internal Server Error",
  },
];

/**
 * What the store toolbar's conflict chip measures at the current viewport: the
 * chip's box against the row it shares with the reset button, and how much of
 * its label it printed.
 *
 * It is read the way the card's badge is read, because the two are one reading
 * at two sizes: a chip that fits by ellipsizing passes every box check while
 * hiding the lanes it exists to name.
 */
async function measureStoreConflictChip(page) {
  return page.evaluate(() => {
    const row = document.querySelector(".wm-projects-store-toolbar");
    const chipElement = [...(row?.querySelectorAll(".wm-status-chip") ?? [])]
      .find((chip) => chip.textContent.includes("Team changed"));
    if (!row || !chipElement) return null;
    const rowBox = row.getBoundingClientRect();
    const rowStyle = getComputedStyle(row);
    const chipBox = chipElement.getBoundingClientRect();
    const label = chipElement.querySelector(".wm-status-chip-label");
    return {
      escaped: chipBox.right > rowBox.right - parseFloat(rowStyle.paddingRight) + 1
        || chipBox.left < rowBox.left + parseFloat(rowStyle.paddingLeft) - 1,
      label: label ? { width: label.clientWidth, scroll: label.scrollWidth } : null,
    };
  });
}

/**
 * One gallery card's action row as the browser laid it out: the boxes that bound
 * it, the row's own scroll width, every action's box, and the sync-conflict
 * banner when the card carries one.
 *
 * Read from the geometry rather than from a style, because where a wrapped row
 * breaks its lines is only knowable from where its boxes ended up.
 */
async function measureCardActionRow(card) {
  return card.evaluate((element) => {
    const cardBox = element.getBoundingClientRect();
    const cardStyle = getComputedStyle(element);
    const row = element.querySelector(".wm-project-card-actions .wm-project-row-actions");
    const bannerElement = [...element.querySelectorAll(".wm-status-chip")]
      .find((chip) => chip.textContent.includes("Team changed"));
    const bannerLabel = bannerElement?.querySelector(".wm-status-chip-label");
    // The actions themselves, not the row's children: the row is now two groups
    // (the links that open the room, and the design line holding the entries and
    // the pair), and every reading below is about the boxes a rep can press.
    const actions = row ? [...row.querySelectorAll("a, button")] : [];
    const designGroup = row?.querySelector(".wm-project-row-designs") ?? null;
    const outside = (box, within) => box.right > within.right + 1 || box.left < within.left - 1;
    // The card clips what does not fit, so a banner wider than its column is
    // cut off rather than measured as overflow: compare it with the box the
    // card's padding leaves it, not with the card's border.
    const contentBox = {
      left: cardBox.left + parseFloat(cardStyle.paddingLeft),
      right: cardBox.right - parseFloat(cardStyle.paddingRight),
    };
    // The two icon buttons are the row's last two children, and they hold the
    // only two actions a rep cannot reach twice: a Copy or Delete that left the
    // card is a room that can no longer be copied or removed from the gallery.
    // Measured against the card's content box rather than its border, because
    // the card's own padding is where a wrapped row's last child disappears.
    const iconButtons = row
      ? [...row.querySelectorAll("button")].map((button) => {
        const box = button.getBoundingClientRect();
        return {
          label: button.getAttribute("aria-label") || "icon action",
          left: Math.round(box.left),
          right: Math.round(box.right),
          top: Math.round(box.top),
          bottom: Math.round(box.bottom),
          height: Math.round(box.height),
        };
      })
      : [];
    // How much of a design's name a rep can read. The entry prints "Open
    // template: <name>" on one ellipsized line, so its box says nothing about the
    // name: the characters the clip box left visible are counted one at a time,
    // and the verb is taken off the front.
    const printedNameCharacters = (label) => {
      const node = label?.firstChild;
      if (!label || !node || node.nodeType !== Node.TEXT_NODE) return null;
      const text = node.textContent || "";
      const box = label.getBoundingClientRect();
      const style = getComputedStyle(label);
      const clipRight = box.left + label.clientWidth - parseFloat(style.paddingRight);
      const range = document.createRange();
      let visible = 0;
      for (let index = 0; index < text.length; index += 1) {
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        const rect = range.getClientRects()[0];
        if (!rect) continue;
        if (rect.right > clipRight + 0.5) break;
        visible += 1;
      }
      return Math.max(0, visible - "Open template: ".length);
    };
    const designEntries = [...element.querySelectorAll(".wm-project-template-link")].map((link) => {
      const box = link.getBoundingClientRect();
      const label = link.querySelector(".wm-project-template-link-label");
      const name = (link.getAttribute("aria-label") || link.textContent || "").replace(/^Open template: /, "");
      return {
        name,
        // The label's own scroll width: the entry's box says what it was given, and
        // this says what its name needs before the ellipsis, which is what decides
        // whether the trailing pair could have shared its line at all.
        labelWidth: label ? label.scrollWidth : null,
        width: Math.round(box.width),
        left: Math.round(box.left),
        right: Math.round(box.right),
        top: Math.round(box.top),
        bottom: Math.round(box.bottom),
        nameCharacters: printedNameCharacters(label),
      };
    });
    // The row's lines, read by vertical overlap rather than by equal tops. Detail
    // and Resume are on one line but their boxes start a pixel apart, and a short
    // name sharing Copy and Delete's line is centred on it and sits two pixels
    // above — both read as two tops and one line to a rep, which is the count this
    // walk is holding. Grouping by overlap is the same rule
    // `entrySharesLineWithIconPair` asks of one entry and the pair.
    const actionBoxes = actions.map((action) => {
      const box = action.getBoundingClientRect();
      return {
        // The verb is the same on every entry, so it is dropped: a failure listing
        // three lines of "Open template: Northbrid…" would not say which design took
        // the band. The name comes from the link's accessible name rather than its
        // visible text, because the visible label is ellipsized inside its pill and
        // the three designs of one room share their first 33 characters — naming
        // bands by that text would print three identical lines, which is the reading
        // the old band tops at least told apart. Sixty characters keeps the room
        // prefix and the part that differs, without turning the sentence into a
        // paragraph.
        label: (() => {
          const name = (action.getAttribute("aria-label") || action.textContent || "")
            .trim()
            .replace(/^Open template:\s*/, "");
          return name.length > 60 ? `${name.slice(0, 60)}…` : name;
        })()
          || action.getAttribute("title")
          || "icon action",
        top: box.top,
        bottom: box.bottom,
      };
    });
    const bands = [];
    for (const item of actionBoxes) {
      const band = bands.find((candidate) => {
        const overlap = Math.min(candidate.bottom, item.bottom) - Math.max(candidate.top, item.top);
        const shortest = Math.min(candidate.bottom - candidate.top, item.bottom - item.top);
        return shortest > 0 && overlap >= shortest / 2;
      });
      if (!band) {
        bands.push({ top: item.top, bottom: item.bottom, actions: [item.label] });
        continue;
      }
      band.actions.push(item.label);
      band.top = Math.min(band.top, item.top);
      band.bottom = Math.max(band.bottom, item.bottom);
    }
    bands.forEach((band) => {
      band.top = Math.round(band.top);
      delete band.bottom;
    });
    bands.sort((left, right) => left.top - right.top);
    return {
      card: { width: element.clientWidth, scroll: element.scrollWidth },
      content: {
        left: Math.round(contentBox.left),
        right: Math.round(contentBox.right),
      },
      row: { width: row?.clientWidth ?? 0, scroll: row?.scrollWidth ?? 0 },
      // The design line's own width: what the entry and the pair have to share when
      // the row has moved it onto a line of its own.
      designGroup: designGroup ? { width: designGroup.clientWidth, scroll: designGroup.scrollWidth } : null,
      // How many lines the row wrapped over, and which actions share each: the
      // reading below is only about the wrapped case, so the walk prints which state
      // it measured, and a failure says which boxes took the extra line.
      lines: bands.length,
      bands,
      iconButtons,
      designEntries,
      actionCount: actions.length,
      escaped: actions
        .filter((action) => outside(action.getBoundingClientRect(), cardBox))
        .map((action) => action.textContent.trim().slice(0, 40)
          || action.getAttribute("title")
          || action.getAttribute("aria-label")
          || "icon action"),
      banner: bannerElement ? outside(bannerElement.getBoundingClientRect(), contentBox) : null,
      bannerLabel: bannerLabel ? { width: bannerLabel.clientWidth, scroll: bannerLabel.scrollWidth } : null,
    };
  });
}

/**
 * What every card's row is held to, whatever it carries: no action leaves the
 * card, neither the card nor its row scrolls sideways, the trailing pair shares
 * a line, and that line ends on the card's right edge. Returns how much of the
 * card's width the pair left over, which is what the caller prints.
 *
 * `expectedActions` is what a card that finished rendering carries — Detail,
 * Resume, one link per saved design, Copy and Delete — so a row caught mid-render
 * fails here rather than reading as a shorter row.
 */
/**
 * What a design entry owes the rep: enough of the design's name to be a name.
 *
 * The entry prints "Open template: <name>" on one ellipsized line, so its width is
 * the whole of what is readable — a row that fits by sharing a line with another
 * action prints the verb and one or two letters, which is the same card with the
 * name gone. The stylesheet gives an entry a floor at phone width and wraps it
 * onto a line of its own below that; this holds the floor to what the browser
 * printed rather than to the rule that was supposed to apply.
 */
function assertDesignEntryNames(measured, { at, room }) {
  if (!measured.designEntries.length) {
    throw new Error(`Gallery card for ${room} carries no design entry to measure at ${at}.`);
  }
  const stubs = measured.designEntries
    .filter((entry) => entry.nameCharacters === null || entry.nameCharacters < SAVED_DESIGN_NAME_FLOOR)
    .map((entry) => savedDesignNameFailure({
      surface: "gallery card",
      room,
      design: entry.name,
      visible: entry.nameCharacters === null ? 0 : entry.nameCharacters,
      characters: entry.name.length,
      floor: SAVED_DESIGN_NAME_FLOOR,
      at,
    }));
  if (stubs.length) throw new Error(stubs.join(" "));
}

function assertActionRowClose(measured, { at, room, expectedActions }) {
  if (measured.actionCount < expectedActions) {
    throw new Error(
      `Gallery card for ${room} rendered ${measured.actionCount} actions at ${at}; the action row was not on screen.`,
    );
  }
  if (measured.escaped.length) {
    throw new Error(`Gallery card actions left the card at ${at}: ${measured.escaped.join(", ")} (${room}).`);
  }
  if (measured.card.scroll > measured.card.width + 1) {
    throw new Error(`Gallery card overflows at ${at} (${measured.card.scroll} > ${measured.card.width}) (${room}).`);
  }
  if (measured.row.scroll > measured.row.width + 1) {
    throw new Error(`Gallery card action row overflows at ${at} (${measured.row.scroll} > ${measured.row.width}) (${room}).`);
  }
  if (measured.iconButtons.length !== 2) {
    throw new Error(
      `Gallery card for ${room} rendered ${measured.iconButtons.length} icon buttons at ${at}; Copy and Delete should close the action row.`,
    );
  }
  // Widest first, and said as one button rather than as a list — the rule the hero
  // header's children are held to. Copy and Delete share this line, so a pair pushed
  // out of the card is usually one defect seen twice: the box to change is whichever
  // runs furthest past the content box. A list of boxes left the reader to subtract
  // them and decide which one had actually gone, which is the work a failure should
  // have done. The rest are named without boxes, so the message says the pair came
  // apart without asking anyone to compare arithmetic.
  const lostIconButtons = measured.iconButtons
    .map((button) => ({
      button,
      past: Math.max(measured.content.left - button.left, button.right - measured.content.right),
    }))
    .filter((entry) => entry.past > 1)
    .sort((left, right) => right.past - left.past);
  if (lostIconButtons.length) {
    const [widest, ...also] = lostIconButtons;
    const quoted = (entry) => `"${entry.button.label}"`;
    throw new Error(
      `Gallery card for ${room} lets ${quoted(widest)} run ${widest.past}px past its own content box `
      + `(${measured.content.left}-${measured.content.right}px) at ${at}`
      + `${also.length ? `, the widest of ${lostIconButtons.length} controls that leave it (${also.map(quoted).join(", ")})` : ""}`
      + ": Copy and Delete have to close the row inside the card.",
    );
  }
  // Which line each of the pair landed on, from `copyAndDeleteSplitFailure` — the
  // same module whose `describeBands` prints the row's band lists, so this failure and
  // the band-count ones cannot describe one row two ways. The sentence names both
  // lines by the number the list uses and then prints the list under it, which says
  // what took each line; the pair is one item, so a break belongs between the design
  // line's entries and the pair, never through it.
  const splitFailure = copyAndDeleteSplitFailure({
    room,
    at,
    iconButtons: measured.iconButtons,
    bands: measured.bands,
  });
  if (splitFailure) throw new Error(splitFailure);
  // Closing the row's right edge: a row that wraps along the design links leaves
  // the trailing pair at the start of their own line unless something in front
  // of them takes the space, so the card's right edge would be set by whatever
  // wrapped above them — 289px of it at 1366px and 180px at 360px before this was
  // held. Copy and Delete are the last actions a rep reads, and a row they do not
  // close reads as an unfinished list.
  const iconInset = Math.min(
    ...measured.iconButtons.map((button) => measured.content.right - button.right),
  );
  if (iconInset > 1) {
    throw new Error(
      `Gallery card left Copy and Delete ${iconInset}px short of the card's content edge at ${at}: the trailing pair has to close the row's right edge (${room}).`,
    );
  }
  return iconInset;
}

/**
 * Whether a design entry and the trailing pair were laid out on the same line.
 *
 * Read from vertical overlap rather than from equal tops: the entry and the two
 * buttons are boxes of different heights, and the pair is centred on the line the
 * link shares, so equal tops would report a shared line as two. The row this
 * answers for is the short-named one — a name that fits beside Copy and Delete
 * must not be given a line of its own, because the row then costs the card a line
 * and breaks where nothing needed to.
 */
function entrySharesLineWithIconPair(entry, measured) {
  if (!entry || measured.iconButtons.length !== 2) return false;
  const pairTop = Math.min(...measured.iconButtons.map((button) => button.top));
  const pairBottom = Math.max(...measured.iconButtons.map((button) => button.bottom));
  const overlap = Math.min(entry.bottom, pairBottom) - Math.max(entry.top, pairTop);
  const shortest = Math.min(entry.bottom - entry.top, pairBottom - pairTop);
  return shortest > 0 && overlap >= shortest / 2;
}

/**
 * How many columns the gallery itself is laying out at the current width.
 *
 * Read from the grid the page computed rather than from a media query repeated
 * here: the short name's shared line is a promise about a card that is sharing its
 * row with another card, so the walk asks the layout whether that is the case
 * instead of assuming 1366px's three columns still hold at a phone width.
 */
async function measureGalleryColumns(page) {
  return page.locator(".wm-project-gallery").evaluate((element) => {
    const tracks = getComputedStyle(element).gridTemplateColumns;
    return tracks ? tracks.split(" ").filter(Boolean).length : 0;
  });
}

/**
 * The card's actions and its sync-conflict banner stay inside the card with
 * several long-named designs on it, and the row is measured in four states: one
 * saved design, the state a single save leaves behind; three, the widest the row
 * gets; one short-named design, the row where the link and the trailing pair are
 * meant to share a line; and no saved design, the row that has to close the card
 * with nothing in front of the pair. One is the row whose wrap cannot be blamed on
 * a list of designs, and the pair that closes the row has to close it in all four.
 *
 * The action row is where this came apart before: a design entry kept its content
 * width, so a room with two saved designs ran the second entry and the icon
 * buttons past the card, where the card's overflow clipped them. The designs are
 * seeded into the store the cards read — the state a rep accumulates, and the
 * only way to reach it without clicking Save as template once per design. The
 * banner arrives the same way: a team member's sync lands it on the store, so
 * the walk writes the store and publishes the event the app's own repository
 * uses, which is the state a rep's card carries after someone else's change.
 *
 * The banner is measured past its bounds too: a chip that fits by ellipsizing
 * its label passes every box check here while hiding the lanes it exists to
 * name, so the walk also fails when the label it printed was cut.
 *
 * The store's own line under the filter bar reads the same conflict from the
 * same stored flags, so it is measured here too, from the narrowest phone up:
 * the two chips are one reading at two sizes, and the line above is the one
 * sharing its row with a button.
 *
 * The design entries are read past their boxes as well, because the name they
 * carry is the one thing the card cannot give up to fit: each entry has to print
 * a name's worth of characters rather than the verb and a letter, whatever the
 * row does with the space. The long names seeded here are longer than any card
 * column, so those entries are always truncated and the reading is how much
 * survived; the short one is the opposite state, a name that fits beside the pair,
 * which is why it is read for sharing their line rather than for a wrap.
 *
 * The short name's shared line is the one promise with a width band rather than a
 * single reading, so the walk visits the band as well: the gallery is three
 * columns above 1150px, two down to 761px and one at 760px and below, and a walk
 * that jumped from 1366px to the phone measured the promise only where the card
 * has the most room. 1024px is the tablet width inside that middle band, and the
 * sharing check is asked of the gallery's own column count rather than of a
 * number in this file — a page that re-columns at a new breakpoint would otherwise
 * leave the check quietly measuring only the single-column case.
 *
 * The pair either side of the change is measured too, because the widest
 * two-column card is not the tablet's: 1151px is still three columns and 1150px is
 * the first two-column layout, where each card is as wide as a two-column card
 * ever gets. Both are asked for their column count as well as their action row, so
 * the pair is held as a pair — a breakpoint that moved out from between them
 * would leave the widest two-column card unmeasured while every box check in this
 * pass stayed green, because the sharing promise it carries would simply not have
 * been asked.
 *
 * 1150px then reads the row's shape and not only its width: each state declares
 * how many bands its action row wraps over, and the walk asks for that count at
 * the one width where the card has all the room a two-column card is ever given.
 * The boxes above cannot answer this. A row that spreads one group per line still
 * keeps every action inside the card, still closes its right edge with the pair and
 * still prints a design name; what it has done is spend a line of the card on
 * nothing, and the card's height is what pays for it. That is why the count is read
 * where the row has the most room — at 1151px or on a phone the same count could be
 * the layout giving a narrower card its bands rather than the state's own shape.
 *
 * Measured, those two widths say different things about the short name, which is
 * why the promise is asked as room rather than as a column count: at 1150px the
 * 495px card's 461px design line holds the 253px entry beside the pair, and at
 * 1151px the 323px card's 287px line cannot hold a 245px name plus the pair, so
 * the entry takes a line of its own there. 1150px is also where the row's own
 * defect lived: it fitted Detail, Resume and the entry in 461px, put Copy on that
 * line and wrapped Delete alone to the left of the next. The row is two groups
 * (`wm-project-row-links`, `wm-project-row-designs`) with the pair as one item
 * inside the second, so a break lands between groups and never through Copy and
 * Delete; this pass reads the leaves and the design line's width, so it holds both
 * the grouping and the placement.
 */
async function assertGalleryCardActions(page) {
  const base = `http://127.0.0.1:${port}`;
  await page.goto(`${base}/wingman/projects`, { waitUntil: "networkidle" });
  // Several saves, one save, a short-named save, two short-named saves and no save
  // at all are different rows, so every one of them is seeded from the one list. A
  // state gets one design per name in its entry, and one that needs a room of its
  // own brings the project with it.
  await page.evaluate(
    ([key, states]) => {
      const seed = (name, index, sourceProjectId) => ({
        id: `custom-smoke-${index + 1}`,
        name,
        vertical: "Corporate",
        application: "Meeting room",
        scale: "Single room",
        summary: "Saved from a room and seeded by the browser smoke check.",
        sourceProjectId,
        createdAt: "2026-10-20T10:00:00.000Z",
        updatedAt: "2026-10-20T10:00:00.000Z",
        schemaVersion: 4,
        discoveryAnswers: {},
        discoveryNotes: {},
      });
      const designs = [];
      for (const state of states) {
        for (const name of state.designs) designs.push(seed(name, designs.length, state.roomId));
      }
      window.localStorage.setItem(key, JSON.stringify(designs));
    },
    [
      GALLERY_TEMPLATE_KEY,
      GALLERY_ROW_STATES.map((state) => ({ roomId: state.roomId, designs: state.designs })),
    ],
  );
  // The rows that carry their own project land in the same store, before the
  // reload, so the card the width loop measures is on the page the designs are.
  await page.evaluate(
    ([key, projects]) => {
      const store = JSON.parse(window.localStorage.getItem(key) || "null");
      if (!store?.projects) {
        throw new Error("The project store is empty, so a row state with no saved designs has nowhere to land.");
      }
      let added = false;
      for (const project of projects) {
        if (store.projects.some((candidate) => candidate.id === project.id)) continue;
        store.projects.push(project);
        added = true;
      }
      if (added) window.localStorage.setItem(key, JSON.stringify(store));
    },
    [PROJECT_STORE_KEY, GALLERY_ROW_STATES.filter((state) => state.project).map((state) => state.project)],
  );
  await page.reload({ waitUntil: "networkidle" });
  // Every project, because the default tab is this browser's own rooms and the
  // card under test is whichever room produced the designs.
  await page.getByRole("tab", { name: /^All/ }).click();

  // One locator per row state, held by its key: everything below is a loop over the
  // same list, so a state added to it is measured by every rule the four here are,
  // and each failure names the state it came from.
  const cards = new Map();
  for (const state of GALLERY_ROW_STATES) {
    const card = page.locator(`article[aria-label="${state.room}"]`);
    await expect(card, `The projects gallery should show ${state.room}, the "${state.key}" row state`)
      .toBeVisible({ timeout: 15_000 });
    await expect(
      card.locator(".wm-project-template-link"),
      `The "${state.key}" row should print ${state.designs.length} design link(s)`,
    ).toHaveCount(state.designs.length, { timeout: 15_000 });
    cards.set(state.key, card);
  }

  // The banner rides the designs' own room, so which card carries it is the list's
  // answer rather than a second card lookup here.
  const bannerState = GALLERY_ROW_STATES.find((state) => state.banner);
  if (!bannerState) {
    throw new Error("No gallery row state carries the sync-conflict banner, so the banner reading has no card to land on.");
  }
  const card = cards.get(bannerState.key);

  // Written over the room the designs came from, so the one card under test
  // carries both. A reload would not do: the store is seeded on load, and the
  // published event is what makes the card re-read the document this wrote.
  await page.evaluate(
    ([key, eventName, roomId, fields]) => {
      const store = JSON.parse(window.localStorage.getItem(key) || "null");
      const room = store?.projects?.find((candidate) => candidate.id === roomId);
      if (!room) throw new Error(`${roomId} is not in the project store, so the conflict has nowhere to land.`);
      room.syncConflict = { fields, detectedAt: "2026-10-27T09:00:00.000Z" };
      window.localStorage.setItem(key, JSON.stringify(store));
      window.dispatchEvent(new Event(eventName));
    },
    [PROJECT_STORE_KEY, PROJECT_STORE_EVENT, GALLERY_ROOM_ID, GALLERY_CONFLICT_FIELDS],
  );

  const banner = card.locator(".wm-status-chip").filter({ hasText: "Team changed" });
  await expect(banner, "The card should carry the sync conflict its store holds")
    .toBeVisible({ timeout: 15_000 });
  await expect(banner, "The banner should name the lanes the conflict is on")
    .toContainText("Team changed: Proposal, Requirements", { timeout: 15_000 });

  const storeChip = page.locator(".wm-projects-store-toolbar .wm-status-chip").filter({ hasText: "Team changed" });
  await expect(storeChip, "The store toolbar should report the conflict the cards carry")
    .toBeVisible({ timeout: 15_000 });
  await expect(storeChip, "The store toolbar should name the same lanes the card names")
    .toContainText("Team changed: Proposal, Requirements", { timeout: 15_000 });

  // What each state read at the narrowest width, kept by key: the summary below is
  // built from this map and the same list the measurements come from, so a state
  // added to the list prints its own clause without a second edit here. `inset` is
  // how much room the trailing pair had left inside the card at 360px — zero means
  // Copy and Delete ended on the card's content edge.
  const readings = new Map(GALLERY_ROW_STATES.map((state) => [state.key, { inset: 0, lines: 0 }]));
  // 360px is the narrowest phone the store line above is measured at, and the cards
  // are what that line sits above: stopping the card's own badge and action row at
  // 390 left a 30px band where nothing measured them.
  let cardLabelAt360 = 0;
  // The short name's shared line inside a band that expects a column count, by
  // width: printed with the count that made it a multi-column case, because the
  // sharing is only promised where the gallery still lays out more than one card
  // per row.
  const sharedLineReadings = new Map();
  // The tightest saved-design name the run met, width by width and state by state.
  // The floor is one number for both surfaces, and the summary has to print the case
  // that comes closest to it rather than the widest phone: the narrowest two-column
  // card is at 761px, and the phone widths below are cards with a line of their own,
  // which is the opposite reading.
  const designNameReadings = [];
  for (const viewport of GALLERY_CARD_VIEWPORTS) {
    await page.setViewportSize(viewport);
    const at = `${viewport.width}px`;
    await expect(banner, `The sync-conflict banner should still be on the card at ${at}`).toBeVisible();
    // Asked of the gallery, not of a width: the promise is that a card sharing its
    // row with another card gives the short name the pair's line, and a single
    // column is the one case where the entry's phone floor wins that line instead.
    const columns = await measureGalleryColumns(page);
    // A width that states its column count is half of a promise about the layout:
    // the pair either side of the three-to-two change has to read 3 and then 2, or
    // the card it was added for — the widest two-column card — is not on screen.
    if (viewport.columns !== undefined && columns !== viewport.columns) {
      throw new Error(
        `The gallery laid out ${columns} columns at ${at}, where its three-to-two change puts ${viewport.columns}: `
          + "the widths either side of that change are what hold the widest two-column card, so a breakpoint "
          + "that moved out from between them leaves it unmeasured.",
      );
    }

    // Every state by the same rules, from the one list: a row that is added to it
    // is measured by the row fit, the link count, the entry names and its own
    // special reading without a second block here.
    for (const state of GALLERY_ROW_STATES) {
      const reading = readings.get(state.key);
      const measured = await measureCardActionRow(cards.get(state.key));
      const inset = assertActionRowClose(measured, {
        at,
        room: state.room,
        expectedActions: state.designs.length + 4,
      });

      // The state is part of the reading: a row carrying a link this state does not
      // have is not the row under test, whatever its boxes say.
      if (measured.designEntries.length !== state.designs.length) {
        throw new Error(
          `Gallery card for ${state.room} carries ${measured.designEntries.length} design `
            + `link${measured.designEntries.length === 1 ? "" : "s"} at ${at}; the "${state.key}" row has `
            + `${state.designs.length}, so the store state under test is not the one measured.`,
        );
      }
      // Every entry's name, because the name is what the entry is for and the row's
      // own fit is not allowed to be paid for with it. A state with no designs has
      // no name to read — and its clause above already proved there is nothing to.
      if (state.designs.length) {
        assertDesignEntryNames(measured, { at, room: state.room });
        const narrowestName = measured.designEntries.reduce(
          (tightest, candidate) => ((candidate.nameCharacters ?? 0) < (tightest.nameCharacters ?? 0)
            ? candidate
            : tightest),
          measured.designEntries[0],
        );
        designNameReadings.push({
          at,
          width: viewport.width,
          columns,
          room: state.room,
          printed: narrowestName.nameCharacters,
          characters: narrowestName.name.length,
          entry: narrowestName.width,
          // Whether that entry shared Copy and Delete's line, read off the page: the
          // summary has to say what the tightest case was, and which line the pair
          // took is not something a width name can promise.
          sharedLine: entrySharesLineWithIconPair(narrowestName, measured),
        });
      }

      if (state.sharesLine) {
        // The entry under test is the one with the least name to show, not the first
        // one the store lists. The two-short row has two entries, and picking by
        // position made this reading follow the seed's order: a seed written the
        // other way round would have measured the wider of the two and reported the
        // phone floor as holding the name that never needed it.
        const entry = measured.designEntries.reduce(
          (narrowest, candidate) => ((candidate.labelWidth ?? candidate.width) < (narrowest.labelWidth ?? narrowest.width)
            ? candidate
            : narrowest),
          measured.designEntries[0],
        );
        const sharesLine = entrySharesLineWithIconPair(entry, measured);
        // Whether the row had room for the pair beside the name, asked of the page:
        // the label's unellipsized width plus the pair's own, against the width the
        // row actually has. The column count alone was the wrong question — the
        // three-column card at 1151px is narrower than any two-column card, and at
        // 300px of row a 253px name and the 110px pair cannot share a line. There
        // the name takes a line of its own, which is the wrap the stylesheet
        // promises wherever the row cannot hold both.
        // The design line is what has to hold both — the row's whole width when the
        // line has one of its own, and less than that at 1151px, where the row is a
        // narrow three-column card.
        const room = measured.designGroup?.width ?? measured.content.right - measured.content.left;
        // The pair's span is the furthest right edge minus the furthest left one, not
        // the last child's right minus the first child's left: the group is what a
        // rep reads as the pair, and the width should not depend on which of the two
        // the DOM happens to list first.
        const pairWidth = measured.iconButtons.length === 2
          ? Math.max(...measured.iconButtons.map((button) => button.right))
            - Math.min(...measured.iconButtons.map((button) => button.left))
          : 0;
        const entryNeeds = (entry?.labelWidth ?? entry?.width ?? 0) + pairWidth;
        const hasRoom = entryNeeds <= room;
        if (columns > 1 && hasRoom && !sharesLine) {
          throw new Error(
            `Gallery card for ${state.room} gave its short design name a line of its own at ${at} `
              + `in a ${columns}-column gallery, where its design line has ${room}px for the ${entry?.labelWidth}px name `
              + `and the ${pairWidth}px pair: "${entry?.name}" is the row's narrowest entry at ${entry?.width}px `
              + `(${entry?.left}-${entry?.right}px) and the trailing pair starts at `
              + `${Math.min(...measured.iconButtons.map((button) => button.top))}px. `
              + "Where the card shares its row and has room for both, the link shares the line Copy and Delete are on.",
          );
        }
        // Every width that states a column count is printed, shared or not: at the
        // change the row is too narrow for both, and a summary that listed only the
        // widths where the line was shared would leave that width unaccounted for.
        if (viewport.columns !== undefined) {
          sharedLineReadings.set(viewport.width, {
            columns,
            sharedLine: sharesLine,
            entry: entry?.width ?? null,
            card: measured.card.width,
            room,
            needs: entryNeeds,
          });
        }
        if (viewport.width === 360) reading.sharedLine = sharesLine;
      }

      if (state.banner) {
        if (measured.banner === null) {
          throw new Error(`Gallery card lost its sync-conflict banner at ${at}.`);
        }
        if (measured.banner) {
          throw new Error(`Gallery card sync-conflict banner ran past the card at ${at}; its lane labels would be clipped.`);
        }
        // The lanes are the banner's payload, so a label that fits by being
        // ellipsized is the failure this walk is here for: the rep sees "Proposal,
        // Requi…" and a touch screen has no title to fall back on.
        if (measured.bannerLabel === null) {
          throw new Error(`Gallery card sync-conflict banner has no label to measure at ${at}.`);
        }
        if (measured.bannerLabel.scroll > measured.bannerLabel.width + 1) {
          throw new Error(`Gallery card sync-conflict banner truncated its lane labels at ${at}.`);
        }
        // How much of the line the lanes got at the narrowest width the store line
        // above is measured at: the check above proves the label was not clipped,
        // and this says what was left over when it was not.
        if (viewport.width === 360) {
          cardLabelAt360 = measured.bannerLabel.width;
          // The example the summary prints is the entry with the most name to lose,
          // not the first one the store lists. With three designs the first is
          // whichever the seed wrote first, so the printed number followed the
          // seed's order and could name any of them as if it were the worst case.
          reading.entry = measured.designEntries.reduce(
            (longest, candidate) => ((candidate.name?.length ?? 0) > (longest.name?.length ?? 0)
              ? candidate
              : longest),
            measured.designEntries[0],
          );
        }
      }

      if (viewport.width === 360) {
        reading.inset = inset;
        reading.lines = measured.lines;
      }
      // A width marked `shape` is compared with the widest card's band count once
      // every width has been measured — exactly for the tablet inside the same
      // two-column band, as a ceiling for the top of the single-column block. The
      // boxes cannot answer this on their own: a row that has spent a line still fits
      // the card and still closes its edge, and only the two counts together say what
      // shape the row took.
      if (viewport.shape) {
        reading.shapeComparisons = [
          ...(reading.shapeComparisons ?? []),
          {
            width: viewport.width,
            columns,
            hold: viewport.shape,
            lines: measured.lines,
            card: measured.card.width,
            bands: describeBands(measured.bands),
          },
        ];
      }
      // The row's bands at the width where its card is widest: the boxes above
      // already say nothing left the card, so a row that spreads over one band more
      // than its state has is the shape going wrong where nothing else could see it
      // — an entry given a line it did not need, or a group breaking through a pair.
      if (viewport.rowShape) {
        if (typeof state.rowLines !== "number") {
          throw new Error(
            `The "${state.key}" row state declares no row shape, so ${at} — the width where the card is as wide `
              + "as a two-column card gets — has no band count to hold it to. Declare `rowLines` on the state "
              + "or drop `rowShape` from the width.",
          );
        }
        if (measured.lines !== state.rowLines) {
          throw new Error(
            `Gallery card for ${state.room} wrapped its action row over ${measured.lines} lines at ${at}, where the `
              + `"${state.key}" row has ${state.rowLines}: the card there is ${measured.card.width}px wide, the widest `
              + `a two-column card gets, so the row has all the room its shape asks for. It printed `
              + `${describeBands(measured.bands)}.`,
          );
        }
        reading.row = {
          width: viewport.width,
          lines: measured.lines,
          card: measured.card.width,
          columns,
        };
      }
    }
  }

  // Every marked width is held to the band count the widest card has, so a card in
  // a band that wraps differently is named rather than left to its own boxes. The
  // number promised is always the widest card's, read off the page at 1150px: the
  // tablet's card is narrower than that one, so an extra band there is a line the row
  // spent on width alone and fewer is a rule scoped below 1150px; the top of the
  // single-column block is wider than it, so only more bands there says a rule inside
  // that block spends a line — a row with fewer bands has simply been given room.
  for (const state of GALLERY_ROW_STATES) {
    const reading = readings.get(state.key);
    const within = reading.row;
    for (const comparison of reading.shapeComparisons ?? []) {
      if (!within) {
        throw new Error(
          `The "${state.key}" row has no band count at the widest card's width, so the ${comparison.width}px `
            + "reading has nothing to be held to. Declare `rowShape` on that width or drop the comparison.",
        );
      }
      const held = comparison.hold === "same"
        ? comparison.lines === within.lines
        : comparison.lines <= within.lines;
      if (held) continue;
      const layout = comparison.columns === within.columns
        ? `both widths are inside the ${comparison.columns}-column band, so the shape of the row has to be the same one`
        : `the gallery lays out ${comparison.columns} column${comparison.columns === 1 ? "" : "s"} there against `
          + `${within.columns} at the widest card, and that card is ${comparison.card}px against ${within.card}px, so `
          + `${comparison.hold === "same" ? "the shape of the row has to be the same one" : "the row has at least the room the widest card's row had"}`;
      throw new Error(
        `Gallery card for ${state.room} wrapped its action row over ${comparison.lines} lines at ${comparison.width}px, `
          + `where the widest card at ${within.width}px has ${within.lines}: ${layout}. `
          + `At ${comparison.width}px it printed ${comparison.bands}.`,
      );
    }
  }

  // The store line is measured the same way at the same widths, so the chip on
  // the card and the chip on the line above it are held to one reading: a phone
  // is where a chip on one nowrap line loses the lanes it is there to name.
  let narrowestLabel = 0;
  for (const width of [1366, 390, 360]) {
    await page.setViewportSize({ width, height: width === 1366 ? 900 : 800 });
    const at = `${width}px`;
    await expect(storeChip, `The store toolbar should still report the conflict at ${at}`).toBeVisible();

    const measured = await measureStoreConflictChip(page);
    if (measured === null) {
      throw new Error(`The store toolbar lost its sync-conflict chip at ${at}.`);
    }
    if (measured.escaped) {
      throw new Error(`The store toolbar's sync-conflict chip ran past the toolbar at ${at}.`);
    }
    if (measured.label === null) {
      throw new Error(`The store toolbar's sync-conflict chip has no label to measure at ${at}.`);
    }
    if (measured.label.scroll > measured.label.width + 1) {
      throw new Error(`The store toolbar's sync-conflict chip truncated its lane labels at ${at}.`);
    }
    narrowestLabel = measured.label.width;
  }

  // The walks after this one read the laptop layout.
  await page.setViewportSize({ width: 1366, height: 900 });
  // Built from the same list the seeding and the measuring come from, so a state
  // added there prints its own clause instead of the walk keeping a sentence that
  // describes four shapes in prose it no longer measures.
  const rowClauses = GALLERY_ROW_STATES.map((state) => {
    const reading = readings.get(state.key);
    const lines = `${reading.lines} line${reading.lines === 1 ? "" : "s"}`;
    // Read off the page at the width that states a row shape, beside the 360px
    // reading: the phone says the row fits, and the widest two-column card says the
    // row is the shape its state has rather than one band longer.
    //
    // Every band count is reported as a number of its own, and the top of the
    // single-column block's sits beside the widest card's: those two are the pair a
    // reader compares — the wider card must not need more lines than the widest
    // two-column one — and stating only the hold left the second number to be found
    // in another clause. The tablet's count follows, because it is the same number
    // promised again rather than a second measurement to compare.
    // The sequence those counts print in comes from the promises themselves, not from
    // the order this function happens to list them: each width's own
    // `rowShape`/`shape` marker decides where its count goes, and within one promise
    // the wider width is printed first. That order and the words for it live in
    // `gallery-band-counts.mjs`, with a spec — the sentence is the one part of this
    // pass a green run cannot read, so the table is held without a browser.
    const sequence = readBandCountSequence({
      sources: [
        reading.row ? { promise: "declares", width: reading.row.width, lines: reading.row.lines } : null,
        ...(reading.shapeComparisons ?? []).map((comparison) => ({
          promise: comparison.hold,
          width: comparison.width,
          lines: comparison.lines,
        })),
      ].filter(Boolean),
    });
    if (!sequence.ok) {
      throw new Error(
        bandCountSequenceFailure({ unplaced: sequence.unplaced, promises: sequence.promises }),
      );
    }
    const bands = bandCountsClause(sequence.counts);
    const clause = `${state.headline}: ${reading.inset}px left over at 360px, wrapped over ${lines}${bands}`;
    return reading.sharedLine === undefined
      ? clause
      : `${clause}, where the entry's phone floor ${reading.sharedLine ? "still leaves the link on" : "takes"} Copy and Delete's line`;
  });
  // Every width that states a column count prints where the short name's line went,
  // widest first, so the two-column card at the change and the tablet's are read
  // side by side rather than one standing in for the other — and the width where the
  // row is too narrow for both says so, because a wrap there is the layout's answer
  // rather than a missing reading.
  const sharingClauses = [...sharedLineReadings.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([width, reading]) => {
      const columns = `${reading.columns} column${reading.columns === 1 ? "" : "s"}`;
      return reading.sharedLine
        ? `at ${width}px the gallery lays out ${columns} and its ${reading.card}px card gives the entry ${reading.entry}px, so the link shares Copy and Delete's line`
        : `at ${width}px the gallery lays out ${columns} and its design line has ${reading.room}px for a ${reading.needs}px name-plus-pair, so the name takes a line of its own there`;
    });
  const sharingClause = sharingClauses.length
    ? `The short name's line was read at every width that states a column count: ${sharingClauses.join("; ")}. `
    : "";
  const widthList = GALLERY_CARD_VIEWPORTS.map((viewport) => `${viewport.width}px`);
  const measuredWidths = `${widthList.slice(0, -1).join(", ")} and ${widthList[widthList.length - 1]}`;
  const firstEntry = readings.get(bannerState.key)?.entry;
  // The entry closest to the floor, so the printed evidence is the worst case the
  // browser met rather than the longest name on the widest phone — two different
  // cards, and only one of them says whether the floor is being kept.
  const tightestName = designNameReadings.reduce(
    (tightest, reading) => ((reading.printed ?? 0) < (tightest.printed ?? 0) ? reading : tightest),
    designNameReadings[0],
  );
  console.log(`[browser-smoke] ${GALLERY_ROW_STATES.length} gallery card row states hold their action rows at ${measuredWidths}, each one seeded and measured from the same list: ${rowClauses.join("; ")}. ${sharingClause}The store line above the cards names the same lanes at those widths: at 360px the card's lane label holds ${cardLabelAt360}px and the line's ${narrowestLabel}px. Each design entry prints at least ${SAVED_DESIGN_NAME_FLOOR} characters of the design's name — at 360px the longest-named entry ("${firstEntry?.name}") is ${firstEntry?.width}px and prints ${firstEntry?.nameCharacters} of ${firstEntry?.name.length} characters, and the tightest entry this run met was ${tightestName?.printed} of ${tightestName?.characters} on ${tightestName?.room}'s card at ${tightestName?.at} (a ${tightestName?.entry}px entry in a ${tightestName?.columns}-column gallery, ${tightestName?.sharedLine ? "the pair on its line" : "the pair below it"}).`);
}

/**
 * uiMode's own key. The guided reading of Home is the one that mounts the recent
 * strip, so the walk sets the mode rather than trusting whichever one is the
 * default today.
 */
const UI_MODE_KEY = "wingman-ui-mode-v1";

const DAY_MS = 86_400_000;

/**
 * The three rooms this pass seeds into the guided Home's recent strip.
 *
 * They are not the strip's cards by right. The strip prints `projects.slice(0, 3)`,
 * and the gallery pass before this one pushes its own rows onto the same store, so
 * which rooms arrive first is the store's order rather than this list's. This list is
 * the seed — the rooms whose survey reviews, leading chips and saved designs the
 * readings below are about — and the pass reads the cards that were actually printed
 * and holds them to it, so a store ordered another way fails naming the cards it
 * showed instead of measuring a room it never seeded.
 */
const RECENT_ROOM_IDS = [
  "northbridge-meeting-room-refresh",
  "harbour-retail-signage-rollout",
  "westbrook-classroom-standard",
];

/**
 * The three leading status chips the walk seeds apart, and the order it seeds them
 * in.
 *
 * A card's chip is its leading grid cell above the phone block, so that chip's
 * width is what decides how much of the row the copy column keeps — which means the
 * columns a strip prints are only worth judging separately if they differ. They
 * used to differ because the starter rooms happened to carry two different
 * statuses: a starter whose status changed to its neighbour's would have left both
 * columns the same width, every per-card check still green, and the pass measuring
 * one column twice while reporting it as two. So the walk writes the statuses
 * itself, and every one of them is a status its room did not arrive with —
 * `alternative` on the stale card, `recommended` on the cleared card beside it, and
 * `caution` on the third — so a chip that fell back to its starter is a duplicate
 * this pass can see rather than a value it happened to expect.
 *
 * `caution` is the shortest label, so the card wearing it keeps the widest column,
 * and it is the third card that wears it. That is the point of the order: the two
 * long labels are the same length, so the short chip is the only one here that moves
 * a column, and putting it on the card the strip was extended for is what makes the
 * divergence the third card's. Before that the third card wore `recommended` — the
 * status its own starter carried, and the same width as the stale card's chip — so
 * the strip's spread came from two cards while the summary called it three. The
 * widest survey reading (`alternative`, on the stale card) keeps a narrower column,
 * where it is held hardest.
 */
const RECENT_CARD_STATUSES = ["alternative", "recommended", "caution"];

/**
 * The one seeded chip whose label is shorter, and so the one whose card keeps the
 * widest copy column.
 */
const RECENT_SHORT_CHIP = "caution";

/**
 * One saved design per recent room, named longer than any card can print.
 *
 * The recent card prints a link per design below its survey flags, and the flag
 * readings never touched it: the flags are chips the row widens for, while a design
 * link is one nowrap line clipped by `max-width: 100%`, so a column that holds every
 * flag can still leave a name as `Open template: Northb…`. The three-column band is
 * where that bites — three cards share the strip, and 1181px gives the narrowest
 * one-line column any card has (316px against 378px at 1366px and 1014px once the
 * strip stacks) — so a design is seeded for every room and read there.
 *
 * The names are the room's own plus the variant, because the card prints them the
 * way the room is named: a shortened seed would print whole and say nothing.
 */
const RECENT_DESIGN_NAMES = {
  "northbridge-meeting-room-refresh":
    "Northbridge Meeting Room Refresh — east wing boardroom with dual 86 in displays and Dante audio",
  "harbour-retail-signage-rollout":
    "Harbour Retail Signage Rollout — shopfront window array with portrait panels and ceiling speakers",
  "westbrook-classroom-standard":
    "Westbrook Classroom Standard — teaching wall with interactive display and lectern input",
};

/**
 * The store the designs are saved in, so `templatesSavedFromProject` finds them.
 * The gallery pass seeds the same store for its own rooms first, so the recent
 * seed merges rather than replaces it — later passes read the library too.
 */
const RECENT_TEMPLATE_KEY = "wingman-custom-room-templates-v1";

/**
 * When the three designs were saved, which is older than anything the walk clicks.
 *
 * `assertTemplateSaveNotice` later saves a design through the page and reads the store's
 * newest row, so a seed stamped after that save would have it name this pass's design
 * instead of the one the click wrote. The stamp only has to be a fact about the seed —
 * `templatesSavedFromProject` finds a room's designs by their project, not by date.
 */
const RECENT_DESIGN_STAMP = "2026-10-24T10:00:00.000Z";

/**
 * How much of a design's name a recent card has to print, in characters.
 *
 * The link is one nowrap line carrying the verb and the name, ellipsised inside the
 * copy column. Measured, the band's columns print about 50 characters of the name at
 * 1366px and 42 at 1181px, so 24 is far under both and far above the two or three a
 * link squeezed by a rule would show — what it catches is a name reduced to a stub,
 * the same reading the gallery card's entries are held to.
 */
/** The floor is `SAVED_DESIGN_NAME_FLOOR`: the same number the gallery card's design links hold. */

/**
 * How far apart the seeded chips have to leave the widest and narrowest columns in
 * the band where the chip is the card's leading cell, in pixels.
 *
 * `alternative` and `caution` are four characters apart, which measures 18px on
 * this card at 561px. A floor of 8px is far enough under that to absorb the
 * runner's fallback font and close enough to catch a chip that stopped widening
 * its column at all — a chip given a fixed grid track, or one taken out of the
 * row above the block, leaves the columns equal and this reading is what says so.
 *
 * One floor serves both readings: the spread between the widest and narrowest
 * columns, and the margin by which the card wearing the short chip has to be the
 * widest of the three. They are two questions about one measurement — whether the
 * columns differ at all, and which card's chip they differ by — so a second number
 * would only be another thing to keep in step with the runners' fallback font.
 */
const RECENT_SEEDED_DIVERGENCE = 8;

/**
 * The width the strip stops laying its cards out as one row.
 *
 * The stylesheet stacks them below 1181px, one card per row, because a third of a
 * narrower strip cannot hold the widest reading a card carries beside its leading
 * chip; the walk reads both sides of it (1181px and 1180px) so a breakpoint moved
 * to another width fails here instead of leaving the row shape unmeasured.
 */
const RECENT_STRIP_STACK_BELOW = 1180;

/**
 * A worksheet review as a saved wall keeps it: the design is `project.videowall`
 * and the review lives inside its summary's requirements.
 *
 * Seeded rather than reviewed, because a flag only exists after someone has
 * applied a photo review and a preview build has no photo to read. Both states a
 * recent card can carry are here: a clean review old enough that the room may
 * have moved on, which is the widest reading the row holds, and a review that
 * cleared rows, which is the other chip the same row has to fit.
 */
function recentWallReview(ageDays, rows) {
  const stamp = new Date(Date.now() - ageDays * DAY_MS).toISOString();
  return {
    savedAt: stamp,
    wallType: "lcd",
    summary: {
      version: 2,
      requirements: {
        surveyReview: { reviewedAt: stamp, photoCount: 1, confidence: 0.8, rows },
      },
    },
  };
}

function recentReviewRows(clearedRows) {
  return [1, 2, 3, 4].map((index) => ({
    id: `display-${index}`,
    label: `Panel ${index}`,
    metres: index + 2,
    confidence: 0.9,
    decision: index <= clearedRows ? "rejected" : "accepted",
  }));
}

/** 335 days is the 11 months a stale clean reading names, the longest its age gets. */
const RECENT_SURVEY_CLEAN = recentWallReview(335, recentReviewRows(0));
const RECENT_SURVEY_CLEARED = recentWallReview(20, recentReviewRows(2));

/**
 * The recent strip's flag row holds its readings whole at phone widths.
 *
 * The card is a grid and the copy column is the cell that gives ground, so a
 * stale survey reading ("Survey reviewed" plus "11 months ago re-confirm", the
 * widest a card carries) came out ellipsised inside a 256px column at 360px and
 * overhung into the gap where the card's chevron sat. The phone block answers it
 * by letting the flags share a wrapping line, and the narrowest block by giving
 * the copy column the chevron's 28px.
 *
 * Both readings are measured on the three cards the strip prints, at the laptop
 * width and at 561px, 560px, 390px, 383px, 381px and 360px: the flags row has to
 * keep wrapping inside the phone block, no flag may leave the card, no flag may
 * fit by clipping its own box, and the copy column is recorded at every width so
 * the numbers are read rather than worked out. The label is read past its box as
 * well, the way the gallery card's banner and the store line's chip are, because
 * the words are the payload and a touch screen has no title to fall back on.
 *
 * 383px and 381px are the two sides of the chevron's edge, and they are measured
 * for the chevron as well as for the readings. 383px is the first width the
 * chevron comes back at (the rule hides it at 382 and below): the 28px returns
 * while the viewport gains only 2px, so the copy column is 279px — exactly the
 * widest stale reading, with nothing to spare. 381px is one pixel inside the band
 * that gives that 28px to the copy column. A rule that still showed the chevron at
 * 381 would leave the widest reading fitting by luck, and one that returned it
 * earlier than 383 would squeeze the reading it has to hold, so neither edge alone
 * is the whole promise.
 *
 * The two edges used to be the whole of the column reading, with the widths
 * between them inferred: while the chevron showed the column was said to be the
 * viewport minus 104px, so everything up to 560px had more room than 383px did and
 * 383 could stand for all of it. That is arithmetic about the stylesheet rather
 * than a reading of the page — a `max-width` on the copy, a wider gap between the
 * card's cells, a chip that grew with its own label would all narrow the column in
 * the middle of the band and leave both edges green. So the column is now measured
 * at every width the walk loads, and two of them are there for the band's own top:
 * 560px is the last width of the block that lets the flags share a line, and 561px
 * is the first above it, where the row returns to the stacked grid and the leading
 * status chip takes the card's first grid column back. Measured, the column is
 * 456px at 560px and 347px at 561px: the 109px between them is that chip and the
 * gap beside it, which is what makes the top of the block a width rather than a
 * number in a comment. 390px stays because it is the phone width the strip is most
 * often read at, and it is the number that would catch a rule scoped to the
 * ordinary phone range rather than to either edge.
 *
 * The column is judged per card rather than as one strip-wide reading, because the
 * cards do not leave their readings the same room: the copy column is what a card's
 * grid keeps after its leading status chip, its chevron and the two gaps between
 * them, and the cards carry three different statuses. The pass
 * used to record only the card with the least slack and print that card's reading,
 * which held the tighter case and left the other card's reading compared with
 * nothing — a wider column can hold a wider reading with room to spare, so a
 * divergence between the two would print a strip that read as verified everywhere
 * while the wide reading had never been checked against the column it sits in.
 * Every card's slack is now read against its own column at every width, and the
 * summary names the strip's widest reading — the widest flag any card prints —
 * beside the tightest column met, so both numbers a reader reasons with describe
 * the strip rather than one card in it.
 *
 * The divergence those columns have is seeded rather than inherited, because a
 * per-card reading is only worth making when the columns actually differ. The walk
 * now writes each card's leading status chip in the same pass that seeds the
 * survey reviews — `alternative` on the stale card, `caution` on the cleared card
 * that wears the shortest label, `recommended` on the third — and picks `caution` at
 * the short end of what the store allows, so the widest reading is the one sitting in
 * a narrower column. Before this the difference was whatever the starter rooms
 * happened to carry: the store's three statuses, which measure green, but a starter
 * edited to its neighbour's status would have left the columns equal with every
 * per-card check still passing, the pass measuring one column three times and the
 * summary printing it as three. The divergence is therefore read as well as used,
 * and held to the shape each band gives the chip: apart in the single-column band
 * between the phone block and the three-column one, where the chip is the card's
 * leading grid cell, and matched on either side of it, where the chip has a row of
 * its own and the columns are supposed to agree.
 *
 * Below the flags each card prints one link per design its room was saved as, and that
 * is the card's other bounded thing. `assertGalleryCardActions` seeds designs for these
 * same rooms — its widest row is one of them — so this pass seeds its own into the same
 * library and replaces the earlier rows for those three rooms rather than appending: a
 * card listing two designs would have the reading taken on whichever the store printed
 * first, and the summary naming a design this pass never wrote. The link is one nowrap
 * line ellipsised inside the copy column, so the characters it keeps are how much of
 * the design a rep can read before choosing between them; the count comes from a Range
 * walked one character at a time, because the text is the whole name whether the column
 * shows it or not. The three-column band is where that bites — 1181px gives the
 * narrowest one-line column any card has, 316px, against 378px at 1366px — so the name
 * is read at both of the band's widths and nowhere else: below it the strip stacks the
 * cards one per row and the column is wider, which would report a fit the band does not
 * give. The name is held to the store's row as well as measured for its length, and the
 * floor is far under what the band prints — measured, about 50 characters at 1366px and
 * 42 at 1181px against a floor of 24 — so a reading under it is a name reduced to a stub
 * rather than a long name in a column doing its job.
 *
 * The strip prints three cards, and its row shape is read as well, because one row
 * is the layout the third card was printed for: a breakpoint moved to another width
 * leaves every box above green — each card still fits the column it is given — and
 * only the number of rows says the third sat alone under the first two. 1366px and
 * 1181px are the row, 1180px and the phone widths are one card per row, and the
 * three-column band puts the leading chip on a row of its own, because a third of
 * the strip is narrower than the same card is in the single-column band and the
 * widest survey reading a card prints does not fit beside that chip there.
 *
 * The top is a shape reading as well, because the width alone cannot say what the
 * block buys. Those two flags are the widest row the card holds — the chip and the
 * action that settles it — and from the block's top at 560px they share one line,
 * while above it each has its own because the row is the stacked grid again. Lines
 * are counted by vertical overlap rather than equal tops: the action is a taller
 * box centred on the chip's row, so equal tops would read one line as two. A rule
 * that narrowed the copy column inside the block leaves every other reading green
 * — each flag still fits its own box and the row still fits its column, which is
 * what the probe with a 380px cap showed — and only the pair splitting says the
 * column stopped holding them beside each other.
 *
 * Which three rooms are measured is read off the cards rather than taken from the
 * store's slice. `RecentProjects` prints the store's first three projects and the
 * gallery pass before this one pushes its own rows onto that array, so the strip's
 * cards are the store's order and this seed only decides what those cards hold. The
 * pick is read first — the room by the id on the card's survey flag, the name by the
 * text its copy prints — and held to the seeded three before any box is measured: a
 * store whose first three are other rooms fails saying which cards it printed, where
 * a pass that indexed into its own seed measured whatever happened to be there and
 * reported a fit for cards it had never seeded. Every failure below names a card by
 * its own text, and the summary pairs each chip with the room the page put it on.
 */
async function assertGuidedRecentFlags(page) {
  const base = `http://127.0.0.1:${port}`;
  await page.goto(`${base}/wingman`, { waitUntil: "networkidle" });
  const seeded = await page.evaluate(
    ([storeKey, modeKey, roomIds, statuses, clean, cleared, templateKey, designNames, stamp]) => {
      window.localStorage.setItem(modeKey, "guided");
      const store = JSON.parse(window.localStorage.getItem(storeKey) || "null");
      const rooms = roomIds.map((id) => store?.projects?.find((candidate) => candidate.id === id));
      if (rooms.some((room) => !room)) {
        throw new Error(
          `${roomIds.join(", ")} are not in the project store, so the recent strip has no cards to measure.`,
        );
      }
      // The leading chip is part of the shape this walk measures, so it is written
      // rather than read off the starter store: the cards only differ in column
      // width because these statuses differ. One stale review and the rest cleared,
      // so every card carries a flag row and the stale one holds the widest of them.
      rooms.forEach((room, index) => {
        room.status = statuses[index];
        room.videowall = index === 0 ? clean : cleared;
      });
      window.localStorage.setItem(storeKey, JSON.stringify(store));
      // One saved design per room, in the library the recent card reads. The gallery
      // pass seeded its own designs for these same three rooms a moment ago — its
      // widest row is one of them — so the library is merged rather than replaced:
      // this pass's rows go in, an earlier save of the same room goes out, and the
      // designs belonging to rooms this pass does not measure stay for the passes
      // after it. Appending instead would leave a card printing two links, its
      // measured name beside the gallery's, and the column judged on whichever the
      // store happened to list first.
      const designs = roomIds.map((id, index) => ({
        id: `custom-recent-${index + 1}`,
        name: designNames[id],
        vertical: "Corporate",
        application: "Meeting room",
        scale: "Single room",
        summary: "Saved from a recent room and seeded by the browser smoke check.",
        sourceProjectId: id,
        createdAt: stamp,
        updatedAt: stamp,
        schemaVersion: 4,
        discoveryAnswers: {},
        discoveryNotes: {},
      }));
      const library = JSON.parse(window.localStorage.getItem(templateKey) || "[]");
      const kept = Array.isArray(library)
        ? library.filter((template) => !roomIds.includes(template?.sourceProjectId))
        : [];
      window.localStorage.setItem(templateKey, JSON.stringify([...kept, ...designs]));
      // The names the failures below print come from the store's own rooms rather
      // than from their ids, so a message reads about the room a rep knows.
      return rooms.map((room) => ({ id: room.id, name: typeof room.name === "string" ? room.name : room.id }));
    },
    [
      PROJECT_STORE_KEY,
      UI_MODE_KEY,
      RECENT_ROOM_IDS,
      RECENT_CARD_STATUSES,
      RECENT_SURVEY_CLEAN,
      RECENT_SURVEY_CLEARED,
      RECENT_TEMPLATE_KEY,
      RECENT_DESIGN_NAMES,
      RECENT_DESIGN_STAMP,
    ],
  );
  await page.reload({ waitUntil: "networkidle" });
  // Read at the laptop width, which is where all three cards share a row: the pick
  // is about which rooms the strip printed, not about how many fit, and the gallery
  // pass before this one leaves the viewport at whichever width it measured last.
  await page.setViewportSize({ width: 1366, height: 900 });

  // Which three rooms the strip printed, read off the cards themselves.
  //
  // `RecentProjects` prints the store's first three projects, and the gallery pass
  // before this one pushed its own rows onto that array, so which rooms arrive
  // first is the store's answer rather than this seed's — the strip was never
  // ``these three ids, in this order''. A card is named by the text its own copy
  // prints, and the room it belongs to by the id its survey flag carries (the only
  // handle on the page that ties a card to a stored room). The pick is held to the
  // seeded three here, before anything is measured: a store whose first three are
  // other rooms fails naming what it printed, rather than letting every lookup below
  // measure cards this pass never seeded and report them as if it had.
  const pick = await page.evaluate(() => {
    const strip = document.querySelector(".wm-guided-recent-list");
    const cards = strip ? [...strip.querySelectorAll("article.wm-guided-recent-card")] : [];
    return cards.map((card) => ({
      name: card.querySelector(".wm-guided-recent-copy strong")?.textContent?.trim() ?? null,
      room: card.querySelector("[data-survey-review-link]")?.getAttribute("data-survey-review-link") ?? null,
    }));
  });
  // The membership check lives in `readRecentStripPick`, which
  // `recent-strip-pick.test.mjs` holds against card lists written for each shape — the
  // seeded three, the same three reordered, an unseeded room, a card with no survey
  // flag, one room printed twice, and a strip that printed too few. What is left here
  // is the page read and the sentence.
  const pickReading = readRecentStripPick({ cards: pick, seeded });
  if (!pickReading.ok) {
    throw new Error(
      recentPickFailure({
        cards: pick,
        seeded: seeded.map((room) => room.name),
        repeated: pickReading.repeated,
      }),
    );
  }
  const pickedRooms = pickReading.pickedRooms;
  const roomName = (id) => seeded.find((room) => room.id === id)?.name ?? id;

  const staleChip = page.locator(`[data-survey-review-link="${RECENT_ROOM_IDS[0]}"]`);
  const clearedChip = page.locator(`[data-survey-review-link="${RECENT_ROOM_IDS[1]}"]`);
  await expect(staleChip, "The first recent room should carry the stale survey reading this walk measures")
    .toBeVisible({ timeout: 15_000 });
  await expect(clearedChip, "The second recent room should carry the cleared reading, which the strip also prints")
    .toBeVisible({ timeout: 15_000 });
  await expect(staleChip, "A clean reading past the stale threshold should say what to do about it")
    .toContainText("re-confirm", { timeout: 15_000 });
  await expect(clearedChip, "A review that cleared rows should count them")
    .toContainText("survey rows cleared", { timeout: 15_000 });
  await expect(
    page.locator(`[data-survey-reconfirm="${RECENT_ROOM_IDS[0]}"]`),
    "The stale reading is the one that is settled from the card, so the walk measures it too",
  ).toBeVisible({ timeout: 15_000 });

  // The seeded chips are read back rather than assumed: the columns are only
  // judged apart because these labels differ, so a status the store normalised away
  // would leave the readings below comparing a column with itself.
  const recentCard = (id) => page
    .locator("article.wm-guided-recent-card")
    .filter({ has: page.locator(`[data-survey-review-link="${id}"]`) });
  for (const [index, id] of RECENT_ROOM_IDS.entries()) {
    await expect(
      recentCard(id).locator(".wm-status-chip").first().locator(".wm-status-chip-label"),
      `The card for ${roomName(id)} should lead with the "${RECENT_CARD_STATUSES[index]}" chip this walk seeds. ` +
        "The strip's copy columns differ because their leading chips do, so a chip the store normalised " +
        "back to its starter status would leave the divergence unmeasured.",
    ).toHaveText(RECENT_CARD_STATUSES[index], { timeout: 15_000 });
  }

  // And they differ from each other, not only from the seed's expectation: a
  // constant written with the same status twice satisfies every per-card check
  // above and leaves the strip's divergence resting on two cards while the summary
  // calls it three. Each card's chip is read off the page, because that is what the
  // columns below are measured beside.
  const leadingChips = await page.evaluate((roomIds) => roomIds.map((id) => {
    const flag = document.querySelector(`[data-survey-review-link="${id}"]`);
    const card = flag ? flag.closest("article.wm-guided-recent-card") : null;
    const leading = card ? [...card.children].find((node) => node.classList.contains("wm-status-chip")) : null;
    return {
      name: card?.querySelector(".wm-guided-recent-copy strong")?.textContent?.trim() ?? id,
      chip: leading ? leading.textContent.trim() : null,
    };
  }), pickedRooms);
  const chipLabels = leadingChips.map((card) => card.chip);
  if (chipLabels.some((chip) => !chip) || new Set(chipLabels).size !== chipLabels.length) {
    throw new Error(recentChipLabelsFailure({ cards: leadingChips }));
  }

  // Every width that says something about the copy column: the laptop strip, both
  // sides of the block whose top lets the flags wrap (561 and 560), the phone width
  // the strip is most often read at (390), both sides of the chevron's own edge
  // (383 and 381) and the narrowest phone (360).
  const columnReadings = [];
  // What each card's saved-design link printed at the widths where three cards share
  // the strip, for the summary below.
  const designReadings = [];
  // How many lines a card's flags occupy, read by vertical overlap rather than by
  // equal tops: the chip is a shorter box than the re-confirm action beside it and
  // sits centred on the same row, so equal tops would read one line as two.
  const linesIn = (card) => {
    const bands = [];
    for (const flag of [...card.flags].sort((left, right) => left.top - right.top)) {
      if (bands.some((band) => flag.top < band.bottom - 1 && flag.bottom > band.top + 1)) continue;
      bands.push({ top: flag.top, bottom: flag.bottom });
    }
    return bands.length;
  };
  for (const width of [1366, 1181, 1180, 561, 560, 390, 383, 381, 360]) {
    await page.setViewportSize({ width, height: width >= 1180 ? 900 : 800 });
    const at = `${width}px`;
    await expect(staleChip, `The stale survey reading should still be on its card at ${at}`).toBeVisible();
    await expect(clearedChip, `The cleared survey reading should still be on its card at ${at}`).toBeVisible();

    const cards = await page.evaluate((roomIds) => {
      const outside = (box, within) => box.right > within.right + 1 || box.left < within.left - 1;
      const label = (node) => node.getAttribute("aria-label") || node.textContent.trim().slice(0, 40) || "flag";
      return roomIds.map((id) => {
        const chip = document.querySelector(`[data-survey-review-link="${id}"]`);
        const card = chip ? chip.closest("article.wm-guided-recent-card") : null;
        if (!card) return { id, name: null, missing: true, row: null, flags: [] };
        const cardBox = card.getBoundingClientRect();
        const cardStyle = getComputedStyle(card);
        // The card clips what does not fit, so a flag is compared with the box
        // the card's padding leaves it rather than with the card's border.
        const contentBox = {
          left: cardBox.left + parseFloat(cardStyle.paddingLeft),
          right: cardBox.right - parseFloat(cardStyle.paddingRight),
        };
        const row = card.querySelector(".wm-guided-recent-flags");
        const rowStyle = row ? getComputedStyle(row) : null;
        const arrow = card.querySelector(".wm-guided-recent-arrow");
        const copy = card.querySelector(".wm-guided-recent-copy");
        // The saved-design link, and how much of the design's name its column lets it
        // print. The characters are counted one at a time through a Range rather than
        // read off the text: the link is one nowrap line ellipsised inside its own box,
        // so the text is the whole name whether or not a rep can read it.
        const designLink = card.querySelector("a.wm-guided-recent-template");
        const design = designLink
          ? (() => {
              const linkBox = designLink.getBoundingClientRect();
              const nameNode = [...designLink.childNodes].find(
                (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
              );
              const characters = nameNode ? nameNode.length : 0;
              let visible = 0;
              if (nameNode) {
                const range = document.createRange();
                for (let index = 0; index < characters; index += 1) {
                  range.setStart(nameNode, index);
                  range.setEnd(nameNode, index + 1);
                  const rect = range.getBoundingClientRect();
                  if (!rect.width && !rect.height) continue;
                  if (rect.right > linkBox.right + 1) break;
                  visible += 1;
                }
              }
              return {
                // The tooltip is the store's name, which is why the name a card prints
                // is read here rather than parsed out of the label's wording.
                name: designLink.getAttribute("title") ?? (nameNode ? nameNode.textContent.trim() : null),
                visible,
                characters,
                clipped: designLink.scrollWidth - designLink.clientWidth,
                escaped: linkBox.right > contentBox.right + 1 || linkBox.left < contentBox.left - 1,
              };
            })()
          : null;
        return {
          id,
          missing: false,
          // The room's own name, as its card prints it: every failure below names the
          // card a rep would look at rather than the id this pass seeded.
          name: card.querySelector(".wm-guided-recent-copy strong")?.textContent?.trim() ?? id,
          // The design the card prints under its flags, and the characters of its name
          // its column leaves visible.
          design,
          // The card's own row, so the strip's column count is read off the page.
          top: Math.round(cardBox.top),
          arrow: arrow ? getComputedStyle(arrow).display : "missing",
          // Whether this card carries the action that settles its survey, which is
          // what makes it the stale card. Read off the row rather than taken from
          // the seed's order: the reading asks the page which card is which.
          settles: row ? row.querySelector("[data-survey-reconfirm]") !== null : false,
          copy: copy ? Math.round(copy.getBoundingClientRect().width) : null,
          // The card's own leading chip, not the survey flag inside the copy: that
          // one is what the columns are measured against.
          chip: (() => {
            const leading = [...card.children].find((node) => node.classList.contains("wm-status-chip"));
            return leading ? leading.textContent.trim() : null;
          })(),
          row: row
            ? {
                display: rowStyle.display,
                wrap: rowStyle.flexWrap,
                clipped: row.scrollWidth - row.clientWidth,
              }
            : null,
          flags: row
            ? [...row.children].map((flag) => {
                const flagLabel = flag.querySelector(".wm-status-chip-label");
                const flagBox = flag.getBoundingClientRect();
                return {
                  name: label(flag),
                  width: Math.round(flagBox.width),
                  top: Math.round(flagBox.top),
                  bottom: Math.round(flagBox.bottom),
                  escaped: outside(flagBox, contentBox),
                  // A chip is one nowrap line, so its own box covers the age span
                  // beside the state as well as the label.
                  clipped: flag.scrollWidth - flag.clientWidth,
                  label: flagLabel ? flagLabel.scrollWidth - flagLabel.clientWidth : 0,
                  labelText: flagLabel ? flagLabel.textContent.trim() : null,
                };
              })
            : [],
        };
      });
    }, pickedRooms);

    for (const card of cards) {
      if (card.missing) {
        throw new Error(`The recent strip lost the card for ${roomName(card.id)} at ${at}.`);
      }
      if (!card.row) {
        throw new Error(`The recent card for ${card.name} has no flag row to measure at ${at}.`);
      }
      if (card.row.clipped > 1) {
        throw new Error(
          `The recent card's flag row is ${card.row.clipped}px wider than its column at ${at}.`,
        );
      }
      if (width <= 560 && (card.row.display !== "flex" || card.row.wrap !== "wrap")) {
        throw new Error(
          `The recent card's flag row no longer wraps at ${at} (${card.row.display}/${card.row.wrap}), so a long reading is squeezed instead of moving to a second line.`,
        );
      }
      for (const flag of card.flags) {
        if (flag.escaped) {
          throw new Error(`A recent card flag left the card at ${at}: ${flag.name}.`);
        }
        if (flag.clipped > 1) {
          throw new Error(`A recent card flag is ${flag.clipped}px wider than its own box at ${at}: ${flag.name}.`);
        }
        if (flag.label > 1) {
          throw new Error(
            `A recent card flag truncated its label at ${at}: ${flag.name} printed ${JSON.stringify(flag.labelText)}.`,
          );
        }
      }
    }

    // The saved-design link, read at every width the strip is measured at. It is the
    // one cell on the card whose payload is a design's name, and it is a single nowrap
    // line clipped by the copy column — but the reading used to stop at the stacked
    // band's edge, on the argument that the column widens there, which left the phone
    // with no reading at all: a rule that squeezed the link under 1181px passed
    // silently. The stylesheet's own floor (`min-width: min(30ch, 100%)` on the link)
    // makes the promise at every width, so this asks it at every width. The band's
    // columns are where the floor is closest to biting and the phone is where the verb
    // is dropped and the whole line is the name, so both are measured rather than one
    // standing in for the other. The name is held to the store's own row rather than
    // only measured for its length: `assertGalleryCardActions` seeds designs for these
    // same rooms, and a merge that appended instead of replacing would have this
    // reading taken on the earlier save.
    if (cards.length) {
      for (const card of cards) {
        const expected = RECENT_DESIGN_NAMES[card.id];
        if (!card.design) {
          throw new Error(recentDesignMissingFailure({ room: card.name, expected, at }));
        }
        if (card.design.name !== expected) {
          throw new Error(
            recentDesignNameFailure({ room: card.name, expected, printed: card.design.name, at }),
          );
        }
        if (card.design.escaped) {
          throw new Error(
            `The recent card for ${card.name} printed its saved-design link outside the card at ${at}.`,
          );
        }
        if (card.design.visible < SAVED_DESIGN_NAME_FLOOR) {
          throw new Error(
            savedDesignNameFailure({
              surface: "recent card",
              room: card.name,
              design: expected,
              visible: card.design.visible,
              characters: expected.length,
              floor: SAVED_DESIGN_NAME_FLOOR,
              at,
            }),
          );
        }
      }
      designReadings.push({
        width,
        cards: cards.map((card) => ({
          room: card.name,
          visible: card.design.visible,
          characters: card.design.characters,
        })),
      });
    }

    // The copy column, read after the per-card checks so a card that clips its
    // label is reported as that rather than as a column width. It is read at every
    // width the walk loads and not only at the two edges of a band, because the
    // band's shape used to be arithmetic: while the chevron showed, the column was
    // the viewport minus 104px, so 383px was said to be the tightest and the top of
    // the phone block the widest with neither measured. 390px puts a number on the
    // middle of that range.
    //
    // Each card is judged against its own column. The column is what that card's
    // grid keeps after its leading status chip, its chevron and the two gaps
    // between them, and those chips are not the same width on a stale card and a
    // cleared one — so the strip can print a wider reading in a wider column. This
    // used to record only the card with the least slack and report its reading,
    // which held the tightest case and left the other card's reading compared with
    // nothing: a divergence between the two columns would keep one reading 1px
    // inside its own column while the number the pass printed belonged to the
    // other card, and the strip would read as verified where the wide reading had
    // never been measured.
    const widestReading = (card) =>
      card.flags.reduce((widest, flag) => (flag.width > widest.width ? { ...flag, width: flag.width } : widest), {
        width: 0,
        name: "no reading",
      });
    const cardReadings = cards.map((card) => {
      const reading = widestReading(card);
      const copy = card.copy ?? 0;
      return {
        id: card.id,
        // The room the card is for, as the card prints it, and the flag the reading
        // belongs to, kept apart because the summary prints both.
        room: card.name,
        chip: card.chip,
        copy,
        widest: reading.width,
        reading: reading.name,
        slack: copy - reading.width,
      };
    });
    // The strip's widest reading, for the summary: the summary reports what the
    // strip prints, not what the tightest card happens to print, because the two
    // are different numbers once the columns diverge.
    const widestInStrip = cardReadings.reduce((widest, card) => (card.widest > widest.widest ? card : widest));
    const tightestHere = cardReadings.reduce((min, card) => (card.slack < min.slack ? card : min));
    for (const card of cardReadings) {
      if (card.slack >= -1) continue;
      // One pixel over is tolerated, the way every other box in this walk is:
      // the app names `Geist Variable`, `Geist` and `Inter` in `--wm-font` with
      // no `@font-face` in the tree, so the runner's fallback can move a chip by
      // a pixel. Measured 0px to spare at the chevron's edge, so a squeeze of 2px
      // or more is a real one.
      throw new Error(
        recentSqueezeFailure({
          room: card.room,
          reading: card.reading,
          widest: card.widest,
          copy: card.copy,
          slack: card.slack,
          width,
          at,
        }),
      );
    }
    // Which card is the stale one, and which are the cleared ones, is read off the
    // page rather than taken from the seed's order. Naming them `cards[0]` and
    // `cards[1]` made the role follow `RECENT_ROOM_IDS`: a list written the other way
    // round measured a cleared card as the stale one, and the flags count reported
    // that as a missing action rather than as the seed being ordered differently. The
    // card carrying the action that settles its survey is the stale one, and the
    // strip holds exactly one; every other card is a cleared review.
    const stale = cards.find((card) => card.settles);
    const cleared = cards.filter((card) => !card.settles);
    if (!stale || !cleared.length || cards.filter((card) => card.settles).length !== 1) {
      throw new Error(
        recentRoleFailure({
          cards: cards.map((card) => ({ name: card.name, settles: card.settles, flags: card.flags.length })),
          at,
        }),
      );
    }
    // The strip's own row shape: three cards on one row above the width it
    // stacks at, one card per row below it. A breakpoint moved to another width
    // leaves every reading above green — each card still fits the column it is
    // given — and only this says the third card stopped sitting beside the other
    // two, which is the row it was printed for.
    const rows = new Set(cards.map((card) => card.top)).size;
    const stacked = width <= RECENT_STRIP_STACK_BELOW;
    if (stacked ? rows !== cards.length : rows !== 1) {
      throw new Error(
        recentRowShapeFailure({ cards, rows, at, stacked, stackBelow: RECENT_STRIP_STACK_BELOW }),
      );
    }

    // The divergence the columns have is the walk's own seeding, and it is read
    // instead of assumed: a chip that stopped widening its card's column above the
    // block would leave every column the same width with every check above still
    // green, which is one column measured three times and reported as three. Below
    // the block the same reading runs the other way, because the chip has a row of
    // its own there (`grid-column: 1 / -1`) and the divergence is supposed to be gone.
    const copies = cardReadings.map((card) => card.copy);
    const divergence = Math.max(...copies) - Math.min(...copies);
    // Which shape the strip gives the leading chip is read with the widths, not
    // assumed: it has a row of its own in the phone block and in the three-column
    // band, where a card is narrower than the strip, and it is the card's leading
    // grid cell in the single-column band between them. The divergence is held to
    // that shape — apart where the chip is a cell, matched where it is out of the
    // row — so a rule that moved either edge of either band is reported as the
    // columns it actually printed.
    const chipInOwnRow = width <= 560 || width >= RECENT_STRIP_STACK_BELOW + 1;
    if (!chipInOwnRow && divergence < RECENT_SEEDED_DIVERGENCE) {
      throw new Error(
        recentColumnDivergenceFailure({
          columns: cardReadings,
          divergence,
          chips: cardReadings.map((card) => JSON.stringify(card.chip)),
          seededDivergence: RECENT_SEEDED_DIVERGENCE,
          at,
        }),
      );
    }
    if (chipInOwnRow && divergence > 1) {
      throw new Error(
        recentColumnMatchFailure({
          columns: cardReadings,
          divergence,
          chips: cardReadings.map((card) => JSON.stringify(card.chip)),
          at,
        }),
      );
    }

    // Where the width came from, which the max-to-min reading above cannot say: the
    // two long labels are the same length, so the only column the seed decides here
    // is the short chip's, and it belongs to the third card. If that card's chip
    // stopped widening its column the spread above would still show — the two long
    // labels leave the columns unequal on their own — so the ordering is read
    // instead of the spread: the card wearing `caution` keeps the widest column, and
    // each of the two wearing an eleven-character label keeps a narrower one.
    if (!chipInOwnRow) {
      const shortCard = cardReadings.find((card) => card.chip === RECENT_SHORT_CHIP);
      const longCards = cardReadings.filter((card) => card.chip !== RECENT_SHORT_CHIP);
      const narrowBy = shortCard && longCards.length === cardReadings.length - 1
        ? Math.min(...longCards.map((card) => shortCard.copy - card.copy))
        : null;
      if (narrowBy === null || narrowBy < RECENT_SEEDED_DIVERGENCE) {
        throw new Error(
          recentShortChipFailure({
            columns: cardReadings,
            at,
            shortChip: RECENT_SHORT_CHIP,
            seededDivergence: RECENT_SEEDED_DIVERGENCE,
            narrowBy,
          }),
        );
      }
    }
    columnReadings.push({ width, cards: cardReadings, widest: widestInStrip, tightest: tightestHere, divergence });
    // The block's top is read rather than assumed. A block moved one pixel up would
    // leave the row wrapping at its old top with every box still fitting — the
    // widths below it would keep their shape and the columns still hold their
    // readings — so the shape is read at each width instead: above the block the row
    // is the stacked grid again, one flag per line, because that is what the block
    // gave up.
    if (width > 560) {
      for (const card of cards) {
        if (card.row.display !== "grid") {
          throw new Error(
            `The recent card's flag row is still ${card.row.display}/${card.row.wrap} at ${at}, above the block ` +
              "that lets the flags share a line: its top is where the row goes back to one flag per row, so a width " +
              "above it has to read as the stacked grid.",
          );
        }
      }
    }

    // The chevron is decorative — the whole card is one hit area — so the narrow
    // band gives its 28px to the copy column, which is what lets the widest
    // reading print whole at the band's edge. It is read after the readings so a
    // card that clips its label is reported as that, not as a chevron.
    for (const card of cards) {
      if (width <= 382 && card.arrow !== "none") {
        throw new Error(
          `The recent card kept its chevron at ${at} (display: ${card.arrow}), where the copy column needs its 28px.`,
        );
      }
      if (width > 382 && card.arrow === "none") {
        throw new Error(`The recent card dropped its chevron at ${at}, where there is room for both.`);
      }
    }

    // The stale card is the widest row the strip holds - its chip and the action
    // that settles it - and a cleared review is rows to work rather than a date
    // to renew, so a walk that measured anything less would report a fit it never
    // met.
    if (stale.flags.length !== 2) {
      throw new Error(
        recentFlagCountFailure({ role: "stale", room: stale.name, count: stale.flags.length, at }),
      );
    }
    const crowded = cleared.find((card) => card.flags.length !== 1);
    if (crowded) {
      throw new Error(
        recentFlagCountFailure({ role: "cleared", room: crowded.name, count: crowded.flags.length, at }),
      );
    }

    // What the top of the phone block buys, read there and on the other side of it
    // rather than inferred from the width: at 560px, the block's last width, the
    // stale card's chip and the action that settles it share one line, and at 561px
    // each has a line of its own because the row is the stacked grid again. A rule
    // that narrowed the copy column inside the block leaves every other reading
    // green — each flag still fits its own box and the row still fits its column —
    // and only the pair splitting says the column stopped holding them beside each
    // other, which is the row the block exists to save.
    if (width === 560 && linesIn(stale) !== 1) {
      throw new Error(recentFlagShareLineFailure({ lines: linesIn(stale), at }));
    }
    if (width === 561 && (linesIn(stale) !== 2 || cleared.some((card) => linesIn(card) !== 1))) {
      throw new Error(
        recentFlagStackFailure({
          stale: linesIn(stale),
          cleared: cleared.map((card) => ({ ...card, lines: linesIn(card) })),
          at,
        }),
      );
    }
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  const columnAt = (wanted) => columnReadings.find((entry) => entry.width === wanted);
  const [at1366, at1181, at1180, at560, at561, at390, at383, at381] = [1366, 1181, 1180, 560, 561, 390, 383, 381].map((wanted) => columnAt(wanted));
  const widths = columnReadings.map((entry) => `${entry.width}px`);
  const measuredWidths = `${widths.slice(0, -1).join(", ")} and ${widths[widths.length - 1]}`;
  // Per card, because the cards' columns are not the same and neither are their
  // readings: the number a reader checks a squeeze against is the one belonging to
  // the card it happens on.
  const describe = (entry) => entry.cards
    .map((card) => `${card.copy}px holding a ${card.widest}px reading (${card.slack}px to spare)`)
    .join(", ");
  // What the seeding bought, read off the page at the widths that say it: the gap
  // between the columns in the single-column band, where each card's chip is its
  // own grid cell, and the absence of a gap where the chip takes a row of its own
  // and every card keeps the same column. The chips are paired with the rooms in the
  // order the strip printed the cards, not in the order this pass seeded them: the
  // strip prints the store's first three projects, so the pairing a reader checks
  // against the page is the page's.
  const seededApart = at561.cards.map((card) => `${card.chip} on ${card.room}`).join(", ");
  // Which card the divergence belongs to, read off 561px's own columns: the short
  // chip is the only seeded width a column can come from, and the pass above holds
  // every card wearing an eleven-character label narrower than it.
  const shortAt561 = at561.cards.find((card) => card.chip === RECENT_SHORT_CHIP);
  const shortMargin = shortAt561
    ? Math.min(...at561.cards.filter((card) => card !== shortAt561).map((card) => shortAt561.copy - card.copy))
    : 0;
  const shortClause = shortAt561
    ? `the short ${RECENT_SHORT_CHIP} chip on ${shortAt561.room} keeps the widest column there, ${shortMargin}px wider than the nearest of the two wearing an eleven-character label`
    : `no card was wearing the short ${RECENT_SHORT_CHIP} chip`;

  // What the design links printed, read off the page at every width the strip is
  // measured at: the numbers are this run's, so a name that lost characters to a
  // squeezed column is named by the room it belongs to rather than summarised as a
  // pass. The band's two widths are the tightest columns and the phones are where the
  // verb is dropped, so neither lot can stand in for the other.
  const designClause = designReadings
    .map((entry) => `${entry.width}px: ${entry.cards.map((card) => `${card.visible} of ${card.characters} on ${card.room}`).join(", ")}`)
    .join("; ")
    || "no card printed a design";

  const widestAnywhere = columnReadings.reduce(
    (widest, entry) => (entry.widest.widest > widest.widest ? entry.widest : widest),
    { width: 0, widest: 0, reading: "no reading", room: "no card" },
  );
  // The rooms the strip measured, as their own cards name them at the widest width
  // the pass loads: the three the walk prints at the head of its summary are the
  // cards the page showed, which is the fact the pick above holds to the seed.
  const measuredRooms = at1366.cards.map((card) => card.room).join(", ");
  const tightestAnywhere = columnReadings.reduce(
    (min, entry) => (entry.tightest.slack < min.tightest.slack ? entry : min),
  );
  console.log(
    `[browser-smoke] The guided Home's three recent cards — ${measuredRooms} — held a stale survey reading and cleared ones whole, with the re-confirm action beside the chip, at ${measuredWidths}, and each card's own reading fit the copy column that card prints it in at every one of them — `
    + `the strip's widest reading is the ${widestAnywhere.widest}px one on ${widestAnywhere.room}, and the tightest column it met was ${tightestAnywhere.tightest.copy}px at ${tightestAnywhere.width}px (${tightestAnywhere.tightest.slack}px to spare); the cards' leading chips are seeded apart (${seededApart}), so in the single-column band, where the chip is the card's leading cell, the widest and narrowest columns sit ${at561.divergence}px apart at 561px and ${at1180.divergence}px at 1180px (${shortClause}), while where it has a row of its own — at 560px and below, and from 1181px up — all three keep the same column; each card's saved-design link named the design its room was saved as, and its column kept at least ${SAVED_DESIGN_NAME_FLOOR} characters of every name at every width the strip was measured at (${designClause}); the strip's row is three cards wide at 1366px, ${describe(at1366)}, and still at 1181px, the last width above the stack, ${describe(at1181)}, while at 1180px each card has a row of its own, ${describe(at1180)}; at 560px, the top of the block that lets the flags wrap, ${describe(at560)}; at 561px, where the row is the stacked grid again, ${describe(at561)}; at 390px, ${describe(at390)}; at 383px, where the chevron comes back, ${describe(at383)}; and at 381px, where that 28px is the column's, ${describe(at381)}.`,
  );
}

/**
 * The journey strip's opened entries hold their words inside their own column.
 *
 * `FeatureJourneyStrip` is a `<details>` under every route's page content, so the
 * list of next tools is a state a rep reaches by opening "More tools" — a walk
 * that measured the closed strip would measure a summary. Each entry is a flex row:
 * a copy column holding the label (`strong`) over its reason (`small`), then a
 * chevron. The copy column is the item that gives ground, and both ways of giving
 * it are read here — an entry that fits by overflowing puts its chevron outside
 * its own box, where the strip's border clips it, and one that fits by squeezing
 * the sentence prints `Review the selected SKU in…`. So the reason is read past its
 * box as well as inside it: a truncation passes every containment check while
 * hiding the half a rep chooses by.
 *
 * The projects page is the tightest strip the app prints, which is why it is the
 * one measured. The page keeps its own inset, so at 360px this strip holds 286px of
 * content with 254px entries, against 338px holding 306px entries on the templates,
 * ingest and recommendations pages; at 1366px it is 1260px against their 1296px. A
 * pass on one of those pages would report room this row does not have.
 *
 * Measured, 1366px gives the strip 1260px, each entry 402px and the copy column 212
 * to 267px; 360px gives it 286px, entries of 254px and a 196px column, where the
 * same labels print whole over more lines rather than being cut.
 *
 * Neither end is the tightest column, which is why the pass sweeps for it instead of
 * assuming the phone is: the entry grid is `repeat(auto-fit, minmax(210px, 1fr))`, so
 * the narrowest entry is the one just before an extra 210px track fits, and where
 * that lands depends on the page's own inset and the shell's sidebar rather than on a
 * breakpoint anyone wrote down. One pixel at a time from 360px to 1366px, the
 * narrowest copy column is 152px at 537px — a 463px strip holding 210px entries,
 * against 196px at 360px — and the box rules are asked there as well as at the two
 * ends. The sweep reads only the widths it compares, because it runs at all 1007 of
 * them; the containment and truncation rules run at the width it points to, so a page
 * that re-columns its entries somewhere in between is measured where it squeezes.
 */
/**
 * The widths the journey strip is swept one pixel at a time, both ends included.
 *
 * A sweep rather than a list of breakpoints, because the entry grid is
 * `repeat(auto-fit, minmax(210px, 1fr))`: the column count changes wherever a
 * whole extra 210px track fits, so the newsprint width — the entry just before
 * that track appears — moves with the page's own insets and the shell's sidebar
 * rather than with a breakpoint anyone wrote down. 360px and 1366px are the ends
 * a rep reads at, not necessarily the tightest place in between.
 */
const JOURNEY_SWEEP = { from: 360, to: 1366 };

/**
 * The strip's widths at whatever viewport is set — no boxes per part.
 *
 * The sweep runs this at every width it compares, so it reads only what the
 * comparison needs; the containment and truncation rules run afterwards, at the
 * one width the sweep points to.
 */
async function readJourneyStripWidths(page) {
  return page.evaluate(() => {
    const stripElement = document.querySelector("details.wm-feature-journey");
    const actions = stripElement?.querySelector(".wm-feature-journey__actions");
    const entries = [...(actions ? actions.children : [])];
    const copyWidths = entries.map((entry) => {
      const copy = entry.querySelector("span");
      return copy ? Math.round(copy.getBoundingClientRect().width) : 0;
    });
    const entryWidths = entries.map((entry) => Math.round(entry.getBoundingClientRect().width));
    return entries.length
      ? {
        strip: stripElement.clientWidth,
        entry: Math.min(...entryWidths),
        copyMin: Math.min(...copyWidths),
        copyMax: Math.max(...copyWidths),
      }
      : null;
  });
}

/**
 * The width whose copy column is narrowest, found one pixel at a time.
 *
 * The narrowest column is where the promise the pass makes is hardest to keep —
 * a label or a reason is cut by the box it is in, so the smallest box is the one
 * that would cut — and the pass used to assume that was 360px. A tie keeps the
 * narrowest width that reached the minimum: a plateau of identical columns is
 * one reading, and the phone end of it is the screen a rep holds.
 */
async function findTightestJourneyWidth(page) {
  let tightest = null;
  for (let width = JOURNEY_SWEEP.from; width <= JOURNEY_SWEEP.to; width += 1) {
    // The height only has to be a page: what the sweep compares is laid out by
    // width, and switching it at every step would resize twice for one reading.
    await page.setViewportSize({ width, height: width <= 480 ? 800 : 900 });
    const read = await readJourneyStripWidths(page);
    if (!read || !read.copyMin) continue;
    if (!tightest || read.copyMin < tightest.copyMin) tightest = { width, ...read };
  }
  return tightest;
}

async function assertOpenedFeatureJourney(page) {
  const base = `http://127.0.0.1:${port}`;
  await page.goto(`${base}/wingman/projects`, { waitUntil: "networkidle" });

  const strip = page.locator("details.wm-feature-journey");
  await expect(strip, "The projects page should carry the journey strip under its content")
    .toHaveCount(1, { timeout: 15_000 });
  // The state, not the markup: a rep sees these entries only after opening the
  // strip, so a strip that arrived open would be a different reading.
  if (await strip.evaluate((element) => element.open)) {
    throw new Error(
      'The journey strip is open as soon as its page loads; this pass measures the strip a rep opens, so it has to start closed.',
    );
  }
  await strip.locator("summary").click();

  const entries = strip.locator(".wm-feature-journey__action");
  await expect(entries.first(), "Opening the journey strip should print the next tools it lists")
    .toBeVisible({ timeout: 10_000 });
  const count = await entries.count();
  if (count < 2) {
    throw new Error(
      `The opened journey strip printed ${count} entry, so the walk measured a list that had not finished rendering.`,
    );
  }

  // Where the column is actually narrowest, before the rules are asked anything:
  // the sweep is the reading that decides which width the rest of this pass
  // measures, so a page that re-columns its entries somewhere in between is
  // measured where it squeezes rather than at the two ends a rep happens to use.
  const tightest = await findTightestJourneyWidth(page);
  if (!tightest) {
    throw new Error(
      `The journey strip printed no copy column at any width from ${JOURNEY_SWEEP.from}px to ${JOURNEY_SWEEP.to}px, so there is no entry to measure.`,
    );
  }

  const readings = [];
  // 1366px and 360px because they are the ends a rep reads at, and the sweep's
  // width because it is the tightest the layout gets between them. A sweeps width
  // that lands on either end is measured once.
  const measuredWidths = [{ width: 1366, height: 900 }, { width: tightest.width, height: 900 }, { width: 360, height: 800 }]
    .filter((viewport, index, all) => all.findIndex((other) => other.width === viewport.width) === index);
  for (const viewport of measuredWidths) {
    await page.setViewportSize(viewport);
    const at = `${viewport.width}px`;

    const measured = await page.evaluate(() => {
      const stripElement = document.querySelector("details.wm-feature-journey");
      const actions = stripElement.querySelector(".wm-feature-journey__actions");
      const contentBox = (node) => {
        const style = getComputedStyle(node);
        const box = node.getBoundingClientRect();
        return {
          left: box.left + parseFloat(style.paddingLeft),
          right: box.right - parseFloat(style.paddingRight),
        };
      };
      const read = (node) => {
        if (!node) return null;
        const box = node.getBoundingClientRect();
        return {
          width: Math.round(box.width),
          // A label or reason that fits by ellipsising its own text keeps its box,
          // so the box is not the whole reading: the scroll width says what it cut.
          clipped: node.scrollWidth - node.clientWidth,
        };
      };
      return {
        strip: { width: stripElement.clientWidth, scroll: stripElement.scrollWidth },
        actions: actions ? { width: actions.clientWidth, scroll: actions.scrollWidth } : null,
        entries: [...(actions ? actions.children : [])].map((entry) => {
          const content = contentBox(entry);
          const outside = (node) => {
            if (!node) return false;
            const box = node.getBoundingClientRect();
            return box.right > content.right + 1 || box.left < content.left - 1;
          };
          const label = entry.querySelector("strong");
          const reason = entry.querySelector("small");
          const arrow = entry.querySelector("svg");
          return {
            label: label ? label.textContent.trim() : "",
            reason: reason ? reason.textContent.trim() : "",
            box: read(entry),
            copy: read(entry.querySelector("span")),
            labelBox: read(label),
            reasonBox: read(reason),
            escaped: [label, reason, arrow].filter(outside).length,
            arrow: Boolean(arrow),
          };
        }),
      };
    });

    if (measured.strip.scroll > measured.strip.width + 1) {
      throw new Error(
        `The journey strip scrolls sideways at ${at} (${measured.strip.scroll} > ${measured.strip.width}), so an entry is wider than the page that holds it.`,
      );
    }
    if (!measured.actions) {
      throw new Error(`The opened journey strip has no entry grid to measure at ${at}.`);
    }
    if (measured.actions.scroll > measured.actions.width + 1) {
      throw new Error(
        `The journey strip's entries overflow their own grid at ${at} (${measured.actions.scroll} > ${measured.actions.width}).`,
      );
    }
    if (measured.entries.length !== count) {
      throw new Error(
        `The journey strip showed ${measured.entries.length} entries at ${at} where it printed ${count} when it opened.`,
      );
    }

    for (const entry of measured.entries) {
      const name = entry.label || "(an entry with no label)";
      if (!entry.label) {
        throw new Error(`A journey strip entry prints no label at ${at}, so the row cannot say where it goes.`);
      }
      if (!entry.reason) {
        throw new Error(`The journey strip's "${name}" entry prints no reason at ${at}.`);
      }
      if (!entry.arrow) {
        throw new Error(`The journey strip's "${name}" entry lost its chevron at ${at}.`);
      }
      // The entry's own box is the column the grid gave it: content that pushed it
      // wider shows up here even when the label's box still fits.
      if (entry.box.clipped > 1) {
        throw new Error(
          `The journey strip's "${name}" entry is ${entry.box.clipped}px wider than its own box at ${at}, so the chevron sits outside the column.`,
        );
      }
      if (entry.escaped) {
        throw new Error(
          `The journey strip let "${name}" print ${entry.escaped} of its parts outside its column at ${at}; the label, the reason and the chevron stay inside the entry.`,
        );
      }
      if (entry.labelBox.clipped > 1) {
        throw new Error(
          `The journey strip cut "${name}" at ${at}, which spends the label a rep chooses the tool by.`,
        );
      }
      if (entry.reasonBox.clipped > 1) {
        throw new Error(
          `The journey strip cut the reason under "${name}" at ${at}, so the entry fits by dropping the sentence that says why to use it.`,
        );
      }
    }

    const widths = measured.entries.map((entry) => entry.copy?.width ?? 0);
    readings.push({
      at,
      width: viewport.width,
      strip: measured.strip.width,
      entry: Math.min(...measured.entries.map((entry) => entry.box.width)),
      copyMin: Math.min(...widths),
      copyMax: Math.max(...widths),
    });
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  const laptop = readings.find((reading) => reading.width === 1366);
  const phone = readings.find((reading) => reading.width === 360);
  const tight = readings.find((reading) => reading.width === tightest.width);
  const column = (reading) =>
    !reading
      ? "no reading"
      : reading.copyMin === reading.copyMax
        ? `${reading.copyMin}px`
        : `${reading.copyMin} to ${reading.copyMax}px`;
  const ends = [laptop, phone]
    .filter(Boolean)
    .map((reading) => `at ${reading.at} a ${reading.strip}px strip holds ${reading.entry}px entries with ${column(reading)} of copy column`);
  const swept = JOURNEY_SWEEP.to - JOURNEY_SWEEP.from + 1;
  console.log(
    `[browser-smoke] The journey strip's ${count} entries held their label and reason inside their own column once opened from "More tools" on the projects page — `
    + `${ends.join(", and ")}. Swept one pixel at a time across all ${swept} widths from ${JOURNEY_SWEEP.from}px to ${JOURNEY_SWEEP.to}px, the narrowest copy column the strip has is `
    + `at ${tight?.at}: ${column(tight)} in a ${tight?.strip}px strip holding ${tight?.entry}px entries, where the rules were asked again`
    + (tight?.width === 360 || tight?.width === 1366 ? ` — the same width as one of the ends, so that end is the tightest` : "") + ".",
  );
}

/**
 * The CRM send history's rows stay inside the panel at phone widths.
 *
 * The panel is a grid item in the project record's handoff stack, and the send
 * history is the widest thing in it: a project name is one nowrap line beside the
 * row's controls. Without `min-width: 0` on the panel it took its widest row's
 * width — 411px inside a 273px column at 390px — and the page host's own
 * `overflow` clipped the row's trailing actions: the conversation expander, and
 * after it the drop action. Both are reached from the row's right-hand end, so a
 * row that fits by losing them fits by hiding the two controls a rep uses to
 * resolve an oversized failed send — which is the whole reason the drop action
 * exists.
 *
 * The rows are seeded, not sent: the state a rep accumulates is a history, and the
 * row under test is a failure that kept the body it POSTed. The walk opens the
 * handoff section by its address, which is how a link into the record reaches this
 * panel, and opens the conversation first, because an open conversation is the
 * most a row can carry under it.
 *
 * Both shapes of the row are seeded, because the widest one cannot speak for the
 * narrow one: the long-named failures are the rows that wrap, and a six-character
 * name is the row that does not. Reading only the wide row would leave the wrap's
 * own promise unmeasurable — a rule that wrapped every row would still show three
 * bands on a name that could never fit — so the short send is held to one line
 * where the row has room for its controls, and to no more than the name's band
 * plus one control band below 560px, where the dot, the status, the time and the
 * three controls are wider than the row before the name is counted at all.
 */
/**
 * Opens the send view and the history list, wherever the panel is mounted.
 *
 * Both mounts render one component, so the controls that reach the list are the
 * same two: the send button, then the history toggle. It matters that this is one
 * function rather than two sequences — a mount that reached the list another way
 * would be measuring a different state than the other one reports.
 */
async function openCrmHistoryPanel(page, expected = CRM_HISTORY_ROWS.length) {
  const panel = page.locator(".wm-crm-share-panel");
  await expect(panel, "The CRM panel should be on screen to measure its send history")
    .toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Send to CRM via Webhook/ }).click();
  await page.locator('button[title="Webhook send history"]').click();

  const rows = panel.locator(".wm-crm-webhook-history-item");
  // The default is the whole seeded list; a pass that dropped a row asks for the
  // count it left behind, so the helper's own assertion stays a reading of what
  // the store holds rather than a constant every caller has to share.
  await expect(rows, "Every seeded send should reach the history list")
    .toHaveCount(expected, { timeout: 15_000 });

  return { panel, rows };
}

/**
 * The seeded send that actually carried a discovery conversation, found in the
 * seed's own content rather than at a position in it.
 *
 * The expander only has a body to open on a row that sent one, so the reading this
 * pass takes is about that row and no other. It used to be `CRM_HISTORY_ROWS[0]`,
 * which was the conversation send only for as long as the seed kept it first: the
 * seed's order is the history's (newest first) and nothing about it promises which
 * send carried the conversation, so a reorder there left the pass measuring a row
 * that never had one while the page was correct.
 */
const CRM_HISTORY_CONVERSATION_ROW =
  CRM_HISTORY_ROWS.find((row) => (row.discoveryConversation ?? []).length > 0) ?? null;

/**
 * Opens the conversation on the row that carries one, which is the tallest block a
 * row holds, before the widths are measured: a panel has to hold that too.
 *
 * The row is reached through its own control — the expander whose label names the
 * project it opens — rather than through its position in the list, because a row
 * identified by what it does is the same row wherever the seed puts it, while
 * `rows.first()` is whatever send happens to be newest. Clicking another row's
 * expander opens a conversation that row never sent, so the assertion below would
 * fail on a page that was laid out correctly.
 */
async function expandCrmHistoryConversation(panel) {
  if (!CRM_HISTORY_CONVERSATION_ROW) {
    throw new Error(
      "No seeded CRM send carries a discovery conversation, so there is nothing for the expander to open "
      + "and the pass would be measuring a panel without its tallest block.",
    );
  }
  const { id, projectName } = CRM_HISTORY_CONVERSATION_ROW;
  const expanded = panel.getByTestId(`crm-history-conversation-${id}`);
  if (!(await expanded.isVisible().catch(() => false))) {
    const expander = panel.getByRole("button", {
      name: `View conversation sent to CRM for ${projectName}`,
      exact: true,
    });
    await expect(
      expander,
      `The send that carried a discovery conversation ("${projectName}") should still offer its expander, `
      + "because that is the row whose open conversation this pass measures",
    ).toHaveCount(1, { timeout: 10_000 });
    await expander.click();
  }
  await expect(expanded, "The row's expander should open the conversation it sent")
    .toBeVisible({ timeout: 10_000 });
}

/**
 * The panel's history rows at the laptop width and at 390px and 360px, in
 * whichever mount the caller has open.
 *
 * One set of rules for both mounts, because the panel is one component: the
 * record's handoff stack and the response wizard's step card put it in different
 * columns, and only the mount is allowed to differ. Every failure names the
 * mount it was measured in, so a report says which of the two came apart.
 */
async function measureCrmHistoryPanel(page, mount) {
  const panel = page.locator(".wm-crm-share-panel");

  // 560px is the last width the row's wrap rule covers, so it is measured
  // rather than inferred: above it the row is one line, and at it the widest
  // row is two, which is the shape the stylesheet promises.
  const shapes = [];
  // Which row is the widest, decided once at the first width and then followed by
  // name. It is a question about content, not position, so a seed that reorders
  // the list cannot quietly substitute a shorter row for the one these readings
  // are about; and it is asked at 1366px because that is where every row is a
  // single line and a name's text is its whole demand — below the wrap width the
  // name cell hands every long name the same width, so re-asking there would let
  // the seed's order decide a tie between rows that are equally wide.
  let widestName = null;
  for (
    const viewport of [
      { width: 1366, height: 900 },
      { width: 560, height: 900 },
      { width: 390, height: 844 },
      { width: 360, height: 800 },
    ]
  ) {
    await page.setViewportSize(viewport);
    const at = `${viewport.width}px`;

    const measured = await panel.evaluate((element) => {
      const panelBox = element.getBoundingClientRect();
      const panelStyle = getComputedStyle(element);
      // The box that clips the panel: the nearest ancestor that hides its
      // overflow. A control past that box is drawn nowhere, however well it fits
      // the panel, which is the failure this walk exists for.
      let clip = null;
      for (let node = element.parentElement; node; node = node.parentElement) {
        const nodeStyle = getComputedStyle(node);
        if (nodeStyle.overflowX !== "visible" || nodeStyle.overflowY !== "visible") {
          clip = node.getBoundingClientRect();
          break;
        }
      }
      const outside = (box, within) => box.right > within.right + 1 || box.left < within.left - 1;
      const contentBox = {
        left: panelBox.left + parseFloat(panelStyle.paddingLeft),
        right: panelBox.right - parseFloat(panelStyle.paddingRight),
      };
      const label = (node) =>
        node.getAttribute("aria-label") ||
        node.getAttribute("title") ||
        node.textContent.trim().slice(0, 40) ||
        "icon control";

      // How many lines a row's controls occupy, read from where they sit rather
      // than from the rule that should have put them there. Controls on one line
      // share a vertical centre, because the row centres its items: the dot is
      // 8px tall, the name about 14 and the buttons 12, so one line's centres
      // are at most 3px apart while a wrapped row's are a line's height apart.
      const countLines = (controls) =>
        controls.reduce((centres, control) => {
          const rect = control.getBoundingClientRect();
          const centre = rect.top + rect.height / 2;
          if (!centres.some((seen) => Math.abs(seen - centre) <= 6)) centres.push(centre);
          return centres;
        }, []).length;

      // The panel's own chain of boxes, from the panel up to the document: a
      // panel wider than the box that clips it is a statement about two boxes,
      // and which ancestor stopped giving it room is not visible from here. It
      // is reported only when that check fails, where the message alone leaves
      // the reader guessing which box to change.
      const tree = [];
      for (let node = element; node; node = node.parentElement) {
        const nodeStyle = getComputedStyle(node);
        tree.push({
          node: `${node.tagName.toLowerCase()}${node.classList.length ? `.${[...node.classList].slice(0, 3).join(".")}` : ""}`,
          width: node.clientWidth,
          scroll: node.scrollWidth,
          display: nodeStyle.display,
          columns: nodeStyle.gridTemplateColumns,
          overflowX: nodeStyle.overflowX,
        });
      }

      return {
        panel: { width: element.clientWidth, scroll: element.scrollWidth },
        tree,
        clipped: clip
          ? panelBox.right > clip.right + 1 || panelBox.left < clip.left - 1
          : null,
        rows: [...element.querySelectorAll(".wm-crm-webhook-history-item")].map((row) => {
          const entry = row.querySelector(".wm-crm-webhook-history-entry");
          const controls = entry ? [...entry.children] : [];
          const name = row.querySelector(".wm-crm-webhook-history-name");
          return {
            count: controls.length,
            escaped: controls
              .filter((control) => outside(control.getBoundingClientRect(), contentBox))
              .map(label),
            overflow: entry ? entry.scrollWidth - entry.clientWidth : 0,
            drop: Boolean(row.querySelector('[data-testid^="crm-webhook-remove-"]')),
            expander: Boolean(row.querySelector('[aria-label^="View conversation"]')),
            name: name ? Math.round(name.getBoundingClientRect().width) : null,
            // The full name, not the truncated box: it is how the walk finds the
            // one short-named row among the long ones it also measures.
            nameText: name ? name.textContent.trim() : null,
            // What the row has to fit on one line: the name's own text plus the
            // controls that never give ground. The name is measured through a Range
            // rather than by its box, because the box is the cell the row gives it —
            // a short name in a wide row would read as a wide one, and that is the
            // row the widest pick would then make of it. The text's own width is
            // the demand the row is answering, whether or not the cell has already
            // clipped it. This is the row as content rather than as position, which
            // is what picks the widest row below: the same row at a different index
            // is still the same row.
            content: Math.round(
              (() => {
                if (!name) return 0;
                const range = document.createRange();
                range.selectNodeContents(name);
                const width = range.getBoundingClientRect().width;
                range.detach?.();
                return width;
              })() +
                controls
                  .filter((control) => !control.matches(".wm-crm-webhook-history-name"))
                  .reduce((sum, control) => sum + control.getBoundingClientRect().width, 0),
            ),
            lines: controls.length ? countLines(controls) : 0,
          };
        }),
      };
    });

    if (measured.clipped === null) {
      throw new Error(`${mount}: the CRM panel has no box that clips it to measure against at ${at}.`);
    }
    if (measured.clipped) {
      throw new Error(crmPanelClippedFailure({ mount, at, tree: measured.tree }));
    }
    if (measured.panel.scroll > measured.panel.width + 1) {
      throw new Error(
        `${mount}: the CRM panel scrolls sideways at ${at} (${measured.panel.scroll} > ${measured.panel.width}).`,
      );
    }
    if (measured.rows.length !== CRM_HISTORY_ROWS.length) {
      throw new Error(
        `${mount}: CRM history showed ${measured.rows.length} rows at ${at}; the walk measured a list that had not finished rendering.`,
      );
    }

    for (const row of measured.rows) {
      // The dot, the name, the status, the time, the drop action and the
      // expander: fewer means the walk measured a row that was not on screen.
      if (row.count < 6) {
        throw new Error(`${mount}: a CRM history row rendered ${row.count} controls at ${at}.`);
      }
      if (!row.drop || !row.expander) {
        throw new Error(`${mount}: a CRM history row lost its drop action or its conversation expander at ${at}.`);
      }
      if (row.escaped.length) {
        throw new Error(`${mount}: CRM history row controls left the panel at ${at}: ${row.escaped.join(", ")}.`);
      }
      if (row.overflow > 1) {
        throw new Error(`${mount}: a CRM history row is ${row.overflow}px wider than the row's own box at ${at}.`);
      }
      // The name is the one thing in the row that can give ground, and the row
      // is what gives it up first: a row that fits by collapsing it fits by
      // hiding which send each line is about.
      if (!row.name || row.name < 32) {
        throw new Error(crmRowNameFailure({ mount, at, name: row.name }));
      }
    }

    // The row's own shape, which is the breakpoint's promise rather than the
    // card's: above 560px the row is one line, and at 560px and below the name
    // takes the first line with the controls under it. Counting the bands the
    // controls actually occupy is what holds the breakpoint — a walk that only
    // measured the boxes would stay green with the wrap rule moved off 560px,
    // because a nowrap row shrinks its name instead of wrapping and the name
    // floor is 8ch. The row under test is the widest one *measured* rather than
    // the first seeded: the walk used to take `rows[0]`, which was the failed send
    // that kept its body only for as long as the seed kept it first, so a reorder
    // there silently measured a different row — a shorter name or a missing retry
    // control would have read as the widest row still holding one line. The
    // comparison is by what the row has to fit, so the row that wraps first is the
    // row that is asked, whatever order the seed writes them in, and the same row
    // is followed by name at every narrower width — one row's shape, read four
    // times, rather than four widths that might each pick a different row. The
    // summary and every failure name it so a reader can see which row was measured.
    widestName ??= measured.rows.reduce((wide, row) => (row.content > wide.content ? row : wide), measured.rows[0]).nameText;
    const widest = measured.rows.find((row) => row.nameText === widestName);
    if (!widest) {
      throw new Error(crmWidestRowMissingFailure({ mount, at, name: widestName }));
    }
    const short = measured.rows.find((row) => row.nameText === CRM_HISTORY_SHORT_NAME);
    if (!short) {
      throw new Error(
        `${mount}: the short-named send's row is not in the history at ${at}, so the one-liner case has nothing to measure.`,
      );
    }
    shapes.push({ at, lines: widest.lines, name: widest.nameText, content: widest.content, short: short.lines });
    if (viewport.width > CRM_HISTORY_ROW_WRAP_WIDTH) {
      const split = measured.rows.filter((row) => row.lines !== 1);
      if (split.length) {
        throw new Error(crmRowSplitFailure({ mount, at, rows: split }));
      }
    } else if (widest.lines < 2) {
      throw new Error(
        crmWidestRowNotWrappedFailure({ mount, at, name: widest.nameText, content: widest.content }),
      );
    }

    // The one-liner case, which the widest row cannot speak for: its name is long
    // enough that no phone width holds it, so a rule that wrapped every row would
    // leave that reading unchanged. This row carries the same controls as the
    // widest one — a failure that kept its body, so the retry sits beside the drop
    // action — and a six-character name, so it says what the wrap is for: one line
    // where the row has room, and no more than the name's band plus a band of
    // controls where it does not. Measured, 1366px and 560px hold it on one line —
    // 560px is the last width the wrap rule covers, and the row has 207px to spare
    // there — while 390px and 360px give it two bands, because at 360px the dot,
    // the status, the time and the three controls are wider than the row before the
    // name is counted at all.
    if (viewport.width >= CRM_HISTORY_ROW_WRAP_WIDTH && short.lines !== 1) {
      throw new Error(
        crmShortRowWrappedFailure({ mount, at, lines: short.lines, nameLength: CRM_HISTORY_SHORT_NAME.length }),
      );
    }
    if (viewport.width < CRM_HISTORY_ROW_WRAP_WIDTH && short.lines > 2) {
      throw new Error(crmShortRowBandsFailure({ mount, at, lines: short.lines }));
    }
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  const [wide, ...narrow] = shapes;
  const shortShape = (shape) => `${shape.at} (${shape.short} line${shape.short === 1 ? "" : "s"})`;
  console.log(
    `[browser-smoke] ${CRM_HISTORY_ROWS.length} CRM send-history rows, one with its conversation open, stay inside the panel at 1366px, 560px, 390px and 360px in ${mount}; `
    + `the widest row ("${wide.name}", ${wide.content}px of content) is one line at ${wide.at} and wrapped at ${narrow.map((shape) => `${shape.at} (${shape.lines} lines)`).join(", ")}; `
    + `the short-named "${CRM_HISTORY_SHORT_NAME}" send keeps one line at ${shortShape(wide)} and ${narrow.map(shortShape).join(", ")}.`,
  );
}

/**
 * The panel in the project record's handoff stack, reached by the address a link
 * into the record uses.
 */
async function assertCrmHistoryRows(page) {
  const base = `http://127.0.0.1:${port}`;
  await page.goto(
    `${base}/wingman/projects/${CRM_HISTORY_ROOM_ID}?view=handoff#project-handoff`,
    { waitUntil: "networkidle" },
  );
  await page.evaluate(
    ([key, rows]) => window.localStorage.setItem(key, JSON.stringify(rows)),
    [CRM_HISTORY_KEY, CRM_HISTORY_ROWS],
  );
  await page.reload({ waitUntil: "networkidle" });

  const { panel } = await openCrmHistoryPanel(page);
  await expandCrmHistoryConversation(panel);
  await measureCrmHistoryPanel(page, "the project record");
}

/**
 * The response builder with a project active: the state a rep is in when they
 * open a room and build its response. `activeProjectId` is written the way the
 * app writes it and the page is reloaded, because the wizard reads the store as
 * it mounts — without an active project it shows the prompt to open one instead,
 * and nothing on a step card is there to measure.
 *
 * The step is left to the caller: opening a step is clicking its rail button,
 * which is how a rep reaches it, and which step a walk wants is the walk's
 * question rather than the entry's.
 */
async function enterResponseWizard(page) {
  const base = `http://127.0.0.1:${port}`;
  await page.goto(`${base}/wingman/proposal`, { waitUntil: "networkidle" });
  await page.evaluate(
    ([key, roomId]) => {
      const store = JSON.parse(window.localStorage.getItem(key) || "null");
      if (!store?.projects?.some((project) => project.id === roomId)) {
        throw new Error(
          `${roomId} is not in the project store, so the wizard has no active project to build a response for.`,
        );
      }
      store.activeProjectId = roomId;
      window.localStorage.setItem(key, JSON.stringify(store));
    },
    [PROJECT_STORE_KEY, CRM_HISTORY_ROOM_ID],
  );
  await page.reload({ waitUntil: "networkidle" });
  await expect(
    page.locator(".wm-proposal-step-card"),
    "The response builder should open on a step card once a project is active",
  ).toBeVisible({ timeout: 15_000 });
}

/**
 * The same panel's other mount, which the record's walk does not reach: the
 * response wizard's Push to CRM section.
 *
 * The panel is a grid item in both places, but the columns are not the same — the
 * record hands it the handoff stack, and the wizard hands it a step card — so the
 * rows answer the same question about a different box, and a panel that fits one
 * of them says nothing about the other. The rows are not seeded again: the send
 * history is one list per browser, which is the same fact the panel is built
 * around, so what a rep sent while building the response at the record is the
 * list they read here.
 *
 * The wizard is step-based and renders the panel in its last step, and only once
 * a project is active, which `enterResponseWizard` supplies. The step is opened
 * by the label on its own rail button, which is how a rep reaches it.
 */
async function assertCrmHistoryRowsInResponseWizard(page) {
  await enterResponseWizard(page);

  await page.getByRole("button", { name: /Review and export/ }).click();

  const { panel } = await openCrmHistoryPanel(page);
  await expandCrmHistoryConversation(panel);
  await measureCrmHistoryPanel(page, "the response wizard");
}

/**
 * What each row says dropping it costs, read on the rows themselves.
 *
 * The history's rows are not one shape, and what a rep gives up differs by row: a
 * failure that kept the body it POSTed is the last copy of a snapshot the CRM
 * never received, a failure recorded before bodies were kept has only this
 * browser's record of the attempt, and a send the endpoint accepted costs only
 * that record. `historyRemovalNote` holds those three sentences apart and the row
 * prints one of them behind the first click — so the reading is the text of the
 * note, not that a note is there: a row printing one sentence for every shape
 * would satisfy a visibility check while telling a rep that dropping the only
 * copy of a body costs nothing.
 *
 * The three shapes come from the seed rather than being named here, so editing the
 * seed cannot leave the pass reading a row that is not in it: which row is which is
 * a question about the status and payload of the entries the walk seeds. All three
 * are seeded — a failure holding a body, a failure that stored none, and a send the
 * endpoint accepted — because the third sentence is about a row a rep can really
 * have, and a sentence nobody reads the text of is free to drift from the row it
 * describes.
 *
 * Nothing is dropped. Each cost is read, then put away by moving focus, and the
 * stored history is read back to prove arming a row is not a step already taken —
 * which it would have to be for a note to be worth reading before the second
 * click. The list is left as it was seeded for the passes after this one.
 */
async function assertCrmHistoryRemovalNotes(page) {
  const base = `http://127.0.0.1:${port}`;
  const keptBody = CRM_HISTORY_ROWS.find((entry) => entry.status === "error" && entry.payload);
  const bodyless = CRM_HISTORY_ROWS.find((entry) => entry.status === "error" && !entry.payload);
  const delivered = CRM_HISTORY_ROWS.find((entry) => entry.status === "success" && !entry.payload);
  if (!keptBody || !bodyless || !delivered) {
    throw new Error(
      "The seeded send history is the three shapes this pass reads — a failure that kept the body it POSTed, a failure that stored none, and a send the CRM accepted — and one of them is missing, so there is no cost to read.",
    );
  }

  await page.goto(
    `${base}/wingman/projects/${CRM_HISTORY_ROOM_ID}?view=handoff#project-handoff`,
    { waitUntil: "networkidle" },
  );
  await page.evaluate(
    ([key, rows]) => window.localStorage.setItem(key, JSON.stringify(rows)),
    [CRM_HISTORY_KEY, CRM_HISTORY_ROWS],
  );
  await page.reload({ waitUntil: "networkidle" });

  const { panel, rows } = await openCrmHistoryPanel(page);

  /** The note behind a row's first click, as one line of text. */
  const readCost = async (entry) => {
    const button = panel.getByTestId(`crm-webhook-remove-${entry.id}`);
    await expect(button, `The send for ${entry.projectName} should be in the list this pass reads`)
      .toBeVisible();
    await button.click();
    const note = panel.getByTestId(`crm-webhook-remove-note-${entry.id}`);
    await expect(note, "A row should say what dropping it costs before the second click drops it")
      .toBeVisible({ timeout: 10_000 });
    return { button, note, text: ((await note.textContent()) ?? "").replace(/\s+/g, " ").trim() };
  };

  /** Puts the cost away the way a rep does — by moving on — and reads the row back. */
  const putCostAway = async (entry, cost) => {
    await page.keyboard.press("Tab");
    await expect(
      cost.note,
      `Moving focus off ${entry.projectName}'s drop action should put its cost away rather than leaving the row armed`,
    ).toHaveCount(0, { timeout: 10_000 });
    await expect(cost.button, `Reading a row's cost must not drop the row: ${entry.projectName}`).toBeVisible();
  };

  const bodyCost = await readCost(keptBody);
  if (!/body/i.test(bodyCost.text) || !/cannot be sent again/i.test(bodyCost.text)) {
    throw new Error(
      crmRemovalNoteMismatchFailure({
        row: "A failure that kept the body it POSTed",
        says: "dropping it loses the only copy a resend could post",
        text: bodyCost.text,
      }),
    );
  }
  if (/keeps what it accepted/i.test(bodyCost.text)) {
    throw new Error(
      crmRemovalNoteWrongShapeFailure({
        row: "A failure that kept its body",
        forbidden: "a send the CRM accepted",
        text: bodyCost.text,
      }),
    );
  }
  await putCostAway(keptBody, bodyCost);

  const legacyCost = await readCost(bodyless);
  if (!/record of the failure/i.test(legacyCost.text) || !/stored no body/i.test(legacyCost.text)) {
    throw new Error(
      crmRemovalNoteMismatchFailure({
        row: "A failure recorded before bodies were kept",
        says: "dropping it costs this browser's record of the failure and that nothing here could be resent",
        text: legacyCost.text,
      }),
    );
  }
  if (/keeps what it accepted/i.test(legacyCost.text) || /takes the body kept/i.test(legacyCost.text)) {
    throw new Error(
      crmRemovalNoteWrongShapeFailure({
        row: "A failure that stored no body",
        forbidden: "a send the CRM accepted or as a failure with a body to lose",
        text: legacyCost.text,
      }),
    );
  }
  await putCostAway(bodyless, legacyCost);

  const deliveredCost = await readCost(delivered);
  if (!/keeps what it accepted/i.test(deliveredCost.text) || !/record of the send/i.test(deliveredCost.text)) {
    throw new Error(
      crmRemovalNoteMismatchFailure({
        row: "A send the CRM accepted",
        says: "dropping it costs only this browser's record of it",
        text: deliveredCost.text,
      }),
    );
  }
  if (/body/i.test(deliveredCost.text)) {
    throw new Error(crmRemovalBodyMentionFailure({ text: deliveredCost.text }));
  }
  await putCostAway(delivered, deliveredCost);

  // Three shapes, three sentences. Every per-row check above is satisfied by the
  // sentence the right row prints, so a note that printed one of them for all three
  // would pass them all; only comparing the texts catches it.
  const costs = [
    { what: "the failure that kept its body", text: bodyCost.text },
    { what: "the failure recorded before bodies were kept", text: legacyCost.text },
    { what: "the delivered send", text: deliveredCost.text },
  ];
  for (let left = 0; left < costs.length; left += 1) {
    for (let right = left + 1; right < costs.length; right += 1) {
      if (costs[left].text !== costs[right].text) continue;
      throw new Error(
        crmRemovalNoteDuplicateFailure({
          first: costs[left].what,
          second: costs[right].what,
          text: costs[left].text,
        }),
      );
    }
  }

  const stored = await page.evaluate(
    (key) => JSON.parse(window.localStorage.getItem(key) || "[]").length,
    CRM_HISTORY_KEY,
  );
  if (stored !== CRM_HISTORY_ROWS.length) {
    throw new Error(
      crmRemovalTouchedHistoryFailure({ stored, seeded: CRM_HISTORY_ROWS.length }),
    );
  }
  await expect(rows, "The seeded list should still be whole after all three costs were read").toHaveCount(
    CRM_HISTORY_ROWS.length,
  );

  console.log(
    `[browser-smoke] Every shape in the send history named what dropping it costs before the second click: the failure that kept its body said "${bodyCost.text}", the failure recorded before bodies were kept said "${legacyCost.text}", the delivered send said "${deliveredCost.text}", `
    + `and each cost was put away by moving off the row, which left all ${stored} sends in the browser's history.`,
  );
}

/**
 * The two sends this pass drops, one from each mount, taken from the list the
 * passes above seeded so a change to the seed cannot leave it naming a row that
 * is not there. Neither is the widest row: that one is what the layout readings
 * above are about, and this pass runs after them.
 */
const CRM_DISMISSED_IN_RECORD = CRM_HISTORY_ROWS.at(-1);
const CRM_DISMISSED_IN_WIZARD = CRM_HISTORY_ROWS[2];

/**
 * A dropped send leaves both mounts, walked in both directions.
 *
 * The send history is one list per browser, and the panel that prints it is
 * mounted twice: in the project record's handoff stack and in the response
 * builder's last step. Both read the same store, so a row a rep drops in one
 * mount has to be gone from the other — and the first direction alone does not
 * prove that, because a mount that had merely stopped printing a row it kept in
 * its own state would pass it just as well. So each mount drops a row and the
 * other is opened fresh to read the result: the builder through
 * `enterResponseWizard`, which reloads the page, and the record by its address.
 * That is the same shape as the dropped-sends note's two-way dismissal, and for
 * the same reason — one store with two surfaces must be read from both ends.
 *
 * The pass restores the seeded list afterwards, because the readings that follow
 * it (the builder's step cards, then the note) expect the history it was given.
 */
async function assertCrmHistoryRowDismissal(page) {
  const base = `http://127.0.0.1:${port}`;
  const seedHistory = () =>
    page.evaluate(
      ([key, rows]) => window.localStorage.setItem(key, JSON.stringify(rows)),
      [CRM_HISTORY_KEY, CRM_HISTORY_ROWS],
    );
  const removeTestId = (entry) => `crm-webhook-remove-${entry.id}`;

  /** The row's own drop action, clicked twice: it arms, then it confirms. */
  const dropRow = async (panel, entry) => {
    const button = panel.getByTestId(removeTestId(entry));
    await expect(button, `The send for ${entry.projectName} should be in the list this mount reads`)
      .toBeVisible();
    await button.click();
    await expect(
      panel.getByTestId(`crm-webhook-remove-note-${entry.id}`),
      "A row should say what dropping it costs before the second click drops it",
    ).toBeVisible({ timeout: 10_000 });
    await button.click();
    await expect(panel.getByTestId(removeTestId(entry)), "The dropped row should leave the list")
      .toHaveCount(0, { timeout: 10_000 });
  };

  await page.goto(
    `${base}/wingman/projects/${CRM_HISTORY_ROOM_ID}?view=handoff#project-handoff`,
    { waitUntil: "networkidle" },
  );
  await seedHistory();
  await page.reload({ waitUntil: "networkidle" });

  // The record drops one of its own rows.
  const record = await openCrmHistoryPanel(page);
  await dropRow(record.panel, CRM_DISMISSED_IN_RECORD);
  await expect(
    record.rows,
    "Dropping one send should leave the rest of the history in place, not clear the list",
  ).toHaveCount(CRM_HISTORY_ROWS.length - 1);

  // The builder, opened on a fresh page load, no longer prints it.
  await enterResponseWizard(page);
  await page.getByRole("button", { name: /Review and export/ }).click();
  const wizard = await openCrmHistoryPanel(page, CRM_HISTORY_ROWS.length - 1);
  await expect(
    wizard.panel.getByTestId(removeTestId(CRM_DISMISSED_IN_RECORD)),
    "A send dropped in the project record should be gone from the response builder: the history is one list, so the other mount reads the same store",
  ).toHaveCount(0);

  // The builder drops its own, and the record reads that back.
  await dropRow(wizard.panel, CRM_DISMISSED_IN_WIZARD);
  await expect(wizard.rows, "The builder should print only the sends neither mount dropped")
    .toHaveCount(CRM_HISTORY_ROWS.length - 2);

  await page.goto(
    `${base}/wingman/projects/${CRM_HISTORY_ROOM_ID}?view=handoff#project-handoff`,
    { waitUntil: "networkidle" },
  );
  const reopened = await openCrmHistoryPanel(page, CRM_HISTORY_ROWS.length - 2);
  for (const entry of [CRM_DISMISSED_IN_RECORD, CRM_DISMISSED_IN_WIZARD]) {
    await expect(
      reopened.panel.getByTestId(removeTestId(entry)),
      `A send dropped in the response builder should be gone from the project record too: ${entry.projectName}`,
    ).toHaveCount(0);
  }

  // The passes after this one measure the list as it was seeded.
  await seedHistory();
  await page.reload({ waitUntil: "networkidle" });
  console.log(
    `[browser-smoke] A send dropped in the project record's send history left the response builder's list (${CRM_DISMISSED_IN_RECORD.projectName}), `
    + `one dropped in the builder left the record's (${CRM_DISMISSED_IN_WIZARD.projectName}), each armed on its own row first, `
    + `and both mounts printed ${CRM_HISTORY_ROWS.length - 2} of the ${CRM_HISTORY_ROWS.length} seeded sends before the list was restored.`,
  );
}

/** The five steps of the response builder, by the label each rail button carries. */
const PROPOSAL_STEPS = [
  "Customer and project",
  "Requirements review",
  "Proposed solution",
  "Commercial and delivery",
  "Review and export",
];

/** The step whose card mounts the CRM panel, where the send history can be opened. */
const CRM_HISTORY_STEP = "Review and export";

/**
 * Every step card lays its content out at the width the card has.
 *
 * The card is a grid used as a stacker, and its single `auto` track used to be
 * sized by the widest child's max-content: at 390px the card was 368px while its
 * children were laid out at ~500px, and the page host's own `overflow` cut the
 * right-hand ~130px off. Declaring `grid-template-columns: minmax(0, 1fr)` fixed
 * the step the CRM panel was found on, and the same card renders all five steps —
 * so the fix is only proved when every step's content is inside the card, which
 * is one child at a time and which nothing reads today.
 *
 * A child that fits is measured against the card's content box, the way the CRM
 * panel's rows are measured against the panel's. A subtree is reported once, at
 * the node that first leaves the box, because everything inside it is left by the
 * same amount and the outermost name is the one to change. Three things are
 * skipped rather than measured through: content inside a scroller, which is
 * reached by scrolling rather than cut by the card; a box anchored to the
 * viewport, which the card did not place; and content the browser is not
 * rendering at all — a closed `<details>` body keeps its computed `display` and
 * a layout rect, and only `checkVisibility` says it is not on screen, which is
 * the difference between this walk reporting the card and reporting a collapsed
 * section's own body.
 */
async function measureProposalStepCard(page, step) {
  return page.evaluate((stepLabel) => {
    const card = document.querySelector(".wm-proposal-step-card");
    if (!card) return null;

    const cardBox = card.getBoundingClientRect();
    const cardStyle = getComputedStyle(card);
    const contentBox = {
      left: cardBox.left + parseFloat(cardStyle.paddingLeft),
      right: cardBox.right - parseFloat(cardStyle.paddingRight),
    };
    const outside = (box, within) => box.left < within.left - 1 || box.right > within.right + 1;
    const name = (node) =>
      `${node.tagName.toLowerCase()}${node.classList.length ? `.${[...node.classList].slice(0, 2).join(".")}` : ""}`;

    let clip = null;
    for (let node = card.parentElement; node; node = node.parentElement) {
      const nodeStyle = getComputedStyle(node);
      if (nodeStyle.overflowX !== "visible" || nodeStyle.overflowY !== "visible") {
        clip = node.getBoundingClientRect();
        break;
      }
    }

    const tree = [];
    for (let node = card; node; node = node.parentElement) {
      const nodeStyle = getComputedStyle(node);
      tree.push({
        node: `${node.tagName.toLowerCase()}${node.classList.length ? `.${[...node.classList].slice(0, 3).join(".")}` : ""}`,
        width: node.clientWidth,
        scroll: node.scrollWidth,
        display: nodeStyle.display,
        columns: nodeStyle.gridTemplateColumns,
        overflowX: nodeStyle.overflowX,
      });
    }

    const escaped = [];
    let widest = 0;
    const walk = (node) => {
      for (const child of node.children) {
        const childStyle = getComputedStyle(child);
        const childBox = child.getBoundingClientRect();
        // A drawer or an overlay is anchored to the viewport, so its box says
        // nothing about where the card put it.
        if (childStyle.position === "fixed") continue;
        // A closed `<details>` body is not on screen: it keeps its computed
        // display and its layout rect, so nothing but checkVisibility says so.
        // The fallback is for a browser without it, where an unrendered box is
        // the zero-area one.
        const rendered = typeof child.checkVisibility === "function"
          ? child.checkVisibility({ checkVisibilityCSS: true })
          : childBox.width > 0 && childBox.height > 0;
        if (!rendered) continue;
        widest = Math.max(widest, Math.round(childBox.width));
        // A box that scrolls or clips answers for its own content, and the
        // content inside it is reached rather than cut.
        if (childStyle.overflowX !== "visible") continue;
        if (outside(childBox, contentBox)) {
          escaped.push({
            name: name(child),
            width: Math.round(childBox.width),
            past: Math.round(childBox.right - contentBox.right),
            before: Math.round(contentBox.left - childBox.left),
          });
          continue;
        }
        walk(child);
      }
    };
    walk(card);

    return {
      step: stepLabel,
      card: { width: card.clientWidth, scroll: card.scrollWidth },
      content: Math.round(contentBox.right - contentBox.left),
      widest,
      tree,
      clipped: clip ? outside(cardBox, clip) : null,
      escaped,
      // What the card was holding, read from the subtree that was walked: a step
      // measured with the send history open is a different reading from the same
      // step measured closed, and only the card can say which one this is.
      history: {
        rows: card.querySelectorAll(".wm-crm-webhook-history-item").length,
        open: Boolean(card.querySelector('[data-testid^="crm-history-conversation-"]')),
      },
    };
  }, step);
}

/**
 * Every step of the response builder, at the laptop width, at 560px, and at 390px
 * and 360px, with nothing of the card's own left outside it.
 *
 * The card is one component and five bodies of content, so the reading is per
 * step: a step whose content fits says nothing about the next one, and the phone
 * widths are where each body is the narrowest it ever is. The seeded project is
 * the room the other passes use, so the Discovery-derived step 2 and the BOM on
 * step 3 carry the content a rep sees rather than empty fields.
 *
 * The last step mounts the CRM panel, and it is measured in the state that panel
 * is widest in — send history open, the row that carried a conversation expanded —
 * rather than however the step happens to open. That is the state the record's pass
 * found the panel broken in (a row's name, status, time, retry, drop action and
 * expander standing beside an open conversation), and it is the only state in
 * which this card holds it: measured closed, the one step whose content can outgrow
 * the card would be the one step whose widest layout was never laid out. The rows
 * are the ones the record's pass seeded above, because the send history is one
 * list per browser rather than a fixture each mount creates.
 *
 * 560px is read because it is where the send-history row changes shape: its own
 * rule is `@media (max-width: 560px)`, so that width is the last one at which the
 * name takes the row's first line and the status, time and controls flow below it.
 * The phone widths sit on that same wrapped side, so without this reading the narrow
 * row's effect on the card is only ever measured where the card has little else to
 * hold, and the unwrapped row only at 1366px. A rule that moved to 480px would leave
 * every reading here passing while the card was never laid out on the wrapped row at
 * a width the app actually gives it.
 */
async function assertProposalStepCards(page) {
  await enterResponseWizard(page);

  const readings = [];

  for (const [index, step] of PROPOSAL_STEPS.entries()) {
    // What this card is, from the card itself: the number on the heading says
    // which step's body was measured, so five readings of one card cannot be
    // green under five labels.
    const heading = `Step ${index + 1} of 5`;
    const name = `step ${index + 1} (${step})`;
    const rail = page.getByRole("button", { name: new RegExp(step) });
    await rail.click();
    await expect(
      rail,
      `The response builder should mark ${name} as the step it is on`,
    ).toHaveAttribute("aria-current", "step", { timeout: 15_000 });
    await expect(
      page.locator(".wm-proposal-step-heading > span"),
      `The card under ${name} should say which step it is`,
    ).toHaveText(heading, { timeout: 15_000 });

    // The CRM panel's widest state, opened the way the record's pass opens it: the
    // same two controls reach the list in either mount, so this cannot measure a
    // state a rep cannot produce. Opening it once at the laptop width is enough —
    // the list and the expanded conversation survive a resize, and the widths
    // below are reads rather than clicks.
    const withHistory = step === CRM_HISTORY_STEP;
    const described = `${name} card${withHistory ? " with the CRM send history open" : ""}`;
    if (withHistory) {
      const { panel } = await openCrmHistoryPanel(page);
      await expandCrmHistoryConversation(panel);
    }

    for (const viewport of [
      { width: 1366, height: 900 },
      { width: 560, height: 800 },
      { width: 390, height: 844 },
      { width: 360, height: 800 },
    ]) {
      await page.setViewportSize(viewport);
      const at = `${viewport.width}px`;
      const measured = await measureProposalStepCard(page, step);
      if (measured === null) {
        throw new Error(`The response builder left ${name} without a step card at ${at}.`);
      }
      if (measured.clipped === null) {
        throw new Error(
          `The response builder's ${name} card has no box that clips it to measure against at ${at}.`,
        );
      }
      // Reading the state back is what separates this step's measurement from the
      // same card measured closed: the history is opened by a click, and a card
      // that never received it would report a fit for content that was not there.
      // What the boxes mean is `lib/proposal-step-cards.mjs`; this pass owns the
      // reading itself, which only a browser can take.
      const expectedRows = withHistory ? CRM_HISTORY_ROWS.length : 0;
      const stateFailure = stepCardStateFailure(measured, { at, described, expectedRows, withHistory });
      if (stateFailure) throw new Error(stateFailure);
      if (viewport.width === 360 || viewport.width === 560) {
        readings.push(`${heading} ${step}${withHistory ? " with history open" : ""}: card ${measured.card.width}px with ${measured.content}px of content, widest box ${measured.widest}px`);
      }
      // The box that escaped is named before the card's own scroll reading: the
      // leaking child is the thing to change, and the card is only as wide as
      // its widest one. One call, so a caller cannot ask one rule and forget the
      // others.
      const failure = stepCardFailure(measured, { at, described });
      if (failure) throw new Error(failure);
    }
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  console.log(
    `[browser-smoke] All ${PROPOSAL_STEPS.length} response-builder step cards keep their content inside the card at 1366px, 560px, 390px and 360px, the last one with the CRM send history open and a conversation expanded; at 560px and 360px — ${readings.join("; ")}.`,
  );
}

/**
 * The guided wall wizard's start step, measured: the card's box, every block it
 * lays out, the brief against the common walls, and the read-out against the two
 * canvas fields.
 *
 * What those boxes mean is `lib/wall-start-step.mjs`; this is the `page.evaluate`
 * that produces them, which only a browser can take. The brief is measured where
 * the step mounts it rather than by a selector of its own internals, so a control
 * that moved inside the brief would answer here as a narrower brief instead of a
 * passing reading.
 */
async function measureWallStartStep(page) {
  return page.evaluate(() => {
    const card = document.querySelector('[data-testid="videowall-wizard-step-job"]');
    if (!card) return null;

    const cardBox = card.getBoundingClientRect();
    const cardStyle = getComputedStyle(card);
    const contentBox = {
      left: cardBox.left + parseFloat(cardStyle.paddingLeft),
      right: cardBox.right - parseFloat(cardStyle.paddingRight),
    };
    const outside = (box, within) => box.left < within.left - 1 || box.right > within.right + 1;
    const name = (node) =>
      `${node.tagName.toLowerCase()}${node.classList.length ? `.${[...node.classList].slice(0, 2).join(".")}` : ""}`;
    const rect = (node) => {
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return {
        left: Math.round(box.left),
        right: Math.round(box.right),
        top: Math.round(box.top),
        bottom: Math.round(box.bottom),
        width: Math.round(box.width),
        height: Math.round(box.height),
      };
    };

    let clip = null;
    for (let node = card.parentElement; node; node = node.parentElement) {
      const nodeStyle = getComputedStyle(node);
      if (nodeStyle.overflowX !== "visible" || nodeStyle.overflowY !== "visible") {
        clip = node.getBoundingClientRect();
        break;
      }
    }

    const tree = [];
    for (let node = card; node; node = node.parentElement) {
      const nodeStyle = getComputedStyle(node);
      tree.push({
        node: `${node.tagName.toLowerCase()}${node.classList.length ? `.${[...node.classList].slice(0, 3).join(".")}` : ""}`,
        width: node.clientWidth,
        scroll: node.scrollWidth,
        display: nodeStyle.display,
        columns: nodeStyle.gridTemplateColumns,
        overflowX: nodeStyle.overflowX,
      });
    }

    const escaped = [];
    let widest = 0;
    const walk = (node) => {
      for (const child of node.children) {
        const childStyle = getComputedStyle(child);
        const childBox = child.getBoundingClientRect();
        // A drawer or an overlay is anchored to the viewport, so its box says
        // nothing about where the card put it.
        if (childStyle.position === "fixed") continue;
        // A closed disclosure keeps its computed display and a layout rect, so
        // nothing but checkVisibility says it is off screen.
        const rendered = typeof child.checkVisibility === "function"
          ? child.checkVisibility({ checkVisibilityCSS: true })
          : childBox.width > 0 && childBox.height > 0;
        if (!rendered) continue;
        widest = Math.max(widest, Math.round(childBox.width));
        // A box that scrolls or clips answers for its own content, and the
        // content inside it is reached rather than cut.
        if (childStyle.overflowX !== "visible") continue;
        if (outside(childBox, contentBox)) {
          escaped.push({
            name: name(child),
            node: name(child),
            width: Math.round(childBox.width),
            past: Math.round(childBox.right - contentBox.right),
          });
          continue;
        }
        walk(child);
      }
    };
    walk(card);

    const brief = document.querySelector('[data-testid="videowall-led-brief"]');
    const readout = document.querySelector('[data-testid="videowall-led-brief-readout"]');
    const walls = [...document.querySelectorAll('[data-testid^="videowall-preset-"]')];
    // The heading over the list, found by its own words: it is the block the
    // brief has to end above, and a step that lost it is a failure rather than a
    // comparison against nothing.
    const commonWalls = [...card.querySelectorAll("h2")]
      .find((heading) => (heading.textContent ?? "").trim() === "Common walls") ?? null;
    const questions = [...card.querySelectorAll("button")]
      .find((button) => /Answer the questions instead/.test(button.textContent ?? "")) ?? null;
    const canvasInputs = [...(brief?.querySelectorAll('input[type="number"]') ?? [])];

    return {
      card: { width: card.clientWidth, scroll: card.scrollWidth },
      content: Math.round(contentBox.right - contentBox.left),
      widest,
      tree,
      clipped: clip ? outside(cardBox, clip) : null,
      escaped,
      brief: rect(brief),
      commonWalls: rect(commonWalls),
      questions: rect(questions),
      firstWall: rect(walls[0] ?? null),
      rows: walls.length,
      readout: readout
        ? { ...rect(readout), scroll: readout.scrollWidth, text: (readout.textContent ?? "").trim() }
        : null,
      canvas: {
        width: Number(canvasInputs[0]?.value ?? 0),
        height: Number(canvasInputs[1]?.value ?? 0),
      },
    };
  });
}

/**
 * The guided wall wizard's start step, at the laptop width and on both phones.
 *
 * The step was reordered so an LED design begins with its own brief — canvas,
 * pitch, cabinet array — instead of a wall someone else answered, and that
 * ordering is what this pass holds: the brief's box ends above the common walls,
 * the way past those walls sits above the first of them, and the read-out states
 * the canvas the fields hold. The card's own containment is read in the same
 * sweep, because the phone widths are where a row of chips is widest against the
 * card.
 *
 * The step is opened by its address rather than by clicking through the wizard:
 * it is step one, which is where the route lands, so the reading cannot be taken
 * on a step a rep had to answer three questions to reach.
 */
async function assertWallWizardStartStep(page) {
  await page.goto(`http://127.0.0.1:${port}/wingman/videowall`, { waitUntil: "networkidle" });
  await expect(
    page.getByTestId("videowall-wizard-step-job"),
    "The wall wizard should open on its start step",
  ).toBeVisible({ timeout: 15_000 });

  const readings = [];
  for (const viewport of WALL_START_VIEWPORTS) {
    await page.setViewportSize(viewport);
    const at = `${viewport.width}px`;
    const measured = await measureWallStartStep(page);
    const failure = wallStartStepFailure(measured, { at })
      ?? wallStartBriefLeadsFailure(measured, { at })
      ?? wallStartReadoutFailure(measured, { at });
    if (failure) throw new Error(failure);
    readings.push(
      `${at}: card ${measured.card.width}px holding ${measured.content}px,`
      + ` brief ${measured.brief.width}×${measured.brief.height}px above ${measured.rows} walls,`
      + ` read-out ${measured.readout.width}px, widest block ${measured.widest}px`,
    );
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  console.log(
    `[browser-smoke] The guided wall wizard's start step leads with the LED brief and holds it at 1366px, 390px and 360px — ${readings.join("; ")}.`,
  );
}
/**
 * The one hero in the app whose header carries an action row, and the actions it
 * carries: three buttons is the most a phone-width row has to hold on one line.
 *
 * Settings is the surface the shared hero template exists for. Its header mounts
 * three children — icon, copy, action row — while a two-child hero mounts the
 * first two and keeps its cards in a sibling section.
 */
const HERO_ROUTE = "/wingman/settings";
const HERO_ACTION_LABELS = ["Save", "Print this page", "Reset"];

// The widths a hero is read at, and where its action row is promised a column at
// each of them, are the rule rather than the walk: `HERO_VIEWPORTS` lives with the
// containment and action-row readings in `lib/hero-header-layout.mjs`, so the table
// and the rule that reads it cannot drift.

/**
 * The hero headers that mount icon + copy only, so an action row added to one of
 * them later is a row this walk already measures.
 *
 * The rules are written over the header's boxes rather than over the template of
 * one page, which is what lets the two-child heroes go through the same reading:
 * what a hero must keep is the shape of its children, not the sheet that laid
 * them out. Sales Helper is the one a walk can load — `/wingman/call-coach`
 * renders it, and the `salesHelper` and `callCards` routes both redirect there.
 * The hub pages mount the same two-child hero, `HubPage` in
 * `pages/NavigationHubPages.tsx`, but no route renders it, so there is no page to
 * visit here; the manifest sweep measures a hero wherever a route mounts one, so a
 * hub page that gains a route is held by these rules without an entry in this
 * list. Settings' header is a `header` and these are `section`s, which is why each
 * entry carries its own selector.
 */
const HERO_TWO_CHILD_SURFACES = [
  { name: "Sales Helper", path: "/wingman/call-coach", selector: "section.wm-polish-hero" },
];

/**
 * A hero's own box and its children's, read at whatever width is set.
 *
 * One read serves every hero: a child the page has pushed outside the header is
 * in the list either way, and the third child — the action row — is simply absent
 * from a header that mounts two. Buttons are collected from the third child with
 * `querySelectorAll`, so a row that wraps its buttons in a container of its own,
 * the shape a hub hero would grow, is measured like Settings' row, which holds
 * its three directly. `index` picks which hero of a page that mounts more than one
 * is read, so a route with two headers is measured twice rather than once. The
 * header's own box comes back with the box that clips it — its nearest ancestor
 * hiding its overflow — because what its children do says nothing about whether
 * the header itself was laid out at the width the page has.
 *
 * Each child comes back with the element it is as well as its text, because a
 * failure has to be able to name the child it is about: the icon is a `<span>`
 * with no words in it, so its text alone would name it "". The name is built the
 * same way the clipping host's is, so one failure reads as one vocabulary.
 */
async function measureHeroBoxes(page, selector, index = 0) {
  return page.evaluate(({ heroSelector, heroIndex }) => {
    const heroElement = document.querySelectorAll(heroSelector)[heroIndex];
    if (!heroElement) {
      throw new Error(`No hero ${heroIndex} matches ${heroSelector}, so there is no hero header to measure.`);
    }
    const heroStyle = getComputedStyle(heroElement);
    const heroBox = heroElement.getBoundingClientRect();
    const box = (node) => {
      const measured = node.getBoundingClientRect();
      return {
        left: Math.round(measured.left),
        right: Math.round(measured.right),
        top: Math.round(measured.top),
        bottom: Math.round(measured.bottom),
        width: Math.round(measured.width),
        height: Math.round(measured.height),
      };
    };
    // What the header's own padding leaves its children: a child past this box is
    // drawn outside the header, however wide the header itself measures.
    const content = {
      left: heroBox.left + parseFloat(heroStyle.paddingLeft),
      right: heroBox.right - parseFloat(heroStyle.paddingRight),
    };
    const isGrid = heroStyle.display.includes("grid");
    // What a node is, as a reader would point at it: the tag and the first classes.
    const nodeName = (node) =>
      `${node.tagName.toLowerCase()}${node.classList.length ? `.${[...node.classList].slice(0, 2).join(".")}` : ""}`;
    // A child's own words, on one line and cut where it stops being a name. It has
    // to be `innerText` rather than `textContent`: a child that holds the action row
    // has no text of its own, and its `textContent` runs the three button labels
    // together into one word ("SavePrint this pageReset") that names nothing.
    const childText = (node) => {
      const words = (node.innerText || "").replace(/\s+/g, " ").trim();
      return words.length > 40 ? `${words.slice(0, 40)}…` : words;
    };
    // The page host that clips the header: the nearest ancestor hiding its
    // overflow. A header wider than that host is drawn nowhere, however well its
    // own children fit the box it reports.
    let clip = null;
    for (let node = heroElement.parentElement; node; node = node.parentElement) {
      const nodeStyle = getComputedStyle(node);
      if (nodeStyle.overflowX !== "visible" || nodeStyle.overflowY !== "visible") {
        clip = {
          ...box(node),
          node: `${nodeName(node)} (${nodeStyle.overflowX})`,
        };
        break;
      }
    }
    return {
      display: heroStyle.display,
      template: heroStyle.gridTemplateColumns,
      // Each track is used width, so this counts the columns the hero laid out. A
      // flex header has no tracks to count, and "none" is not one.
      tracks: isGrid ? heroStyle.gridTemplateColumns.split(" ").filter(Boolean).length : 0,
      content: { left: Math.round(content.left), right: Math.round(content.right) },
      children: [...heroElement.children].map((node) => ({
        label: childText(node),
        node: nodeName(node),
        ...box(node),
        buttons: [...node.querySelectorAll("button, a")].map((button) => ({
          label: (button.textContent || "").trim(),
          ...box(button),
        })),
      })),
      heroScroll: heroElement.scrollWidth - heroElement.clientWidth,
      // The header's own box, read against the host that clips it: the children
      // above are measured against the header, which says nothing about where the
      // header itself landed.
      hero: box(heroElement),
      clip,
    };
  }, { heroSelector: selector, heroIndex: index });
}

/**
 * The reporter's half of the hero readings: the walk measures, the lib decides, and
 * this turns a decision into the failure the run stops on.
 *
 * One call rather than two, because the two rules are asked at every width and every
 * hero: containment first — a header whose children are outside it is the bigger
 * fault — and then the action row where the header mounts one. `present` is the
 * third child's existence, which the two-child pass prints instead of treating as a
 * defect: adding a row to one of those headers is a design decision, not a
 * regression, and the row it adds is already held by the rules that run here.
 */
function assertHeroHeader(measured, options) {
  const containment = heroContainmentFailure(measured, options);
  if (containment) throw new Error(containment);
  const { present, failure } = readHeroActionRow(measured, options);
  if (failure) throw new Error(failure);
  return { present };
}

/**
 * A hero keeps its action row on one line, in its own third column from 981px and
 * on a line of its own below it.
 *
 * The shared template is `.wm-polish-hero:has(> :nth-child(3))`, and it has to
 * live in two places: the rule in the polish-navigation sheet, and a `:has()`
 * companion beside the reference layer's `!important` two-column template at
 * 1024px, because an important rule can only be outranked by another one. A hero
 * of three children read through a two-column template puts its third — the
 * action row — into the icon column: that is what a 49px strip did at desktop
 * while a phone squeezed "Print this page" across three lines and pushed Reset
 * out of the row.
 *
 * Measured at 360px and 980px, where the row takes a line of its own, and at
 * 1024px and 1280px, where it holds the third column — the second of those
 * through the reference layer's companion. A page-level override that put this
 * hero back to two columns, the per-page rules this template replaced, fails
 * here. So does dropping either half of the template, which is why 1000px is
 * measured as well: the shared rule is the only thing that gives the row a third
 * column between 981px and 1023px, since above that the companion does and below
 * it the row has its own line.
 */
async function assertHeroActionRow(page) {
  const base = `http://127.0.0.1:${port}`;
  await page.goto(`${base}${HERO_ROUTE}`, { waitUntil: "networkidle" });

  const hero = page.locator("header.wm-polish-hero");
  await expect(hero, "The Settings header should be the shared polish hero")
    .toBeVisible({ timeout: 15_000 });
  const actions = hero.locator(":scope > :nth-child(3)");
  await expect(actions, "The hero's third child should be its action row")
    .toBeVisible({ timeout: 15_000 });
  for (const label of HERO_ACTION_LABELS) {
    await expect(actions.getByRole("button", { name: label, exact: true }), `The row should carry ${label}`)
      .toBeVisible({ timeout: 15_000 });
  }

  const readings = [];
  for (const viewport of HERO_VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const at = `${viewport.width}px`;
    await expect(actions, `The action row should stay on the header at ${at}`).toBeVisible();

    const measured = await measureHeroBoxes(page, "header.wm-polish-hero");
    const row = measured.children[2];

    assertHeroHeader(measured, {
      at,
      name: "Settings",
      route: HERO_ROUTE,
      expectsColumn: viewport.thirdColumn,
    });
    readings.push(
      `${at}: ${measured.tracks} columns, row ${row.width}px with ${row.buttons.length} buttons on one line, `
      + `header ${measured.hero.width}px inside a ${measured.clip.width}px page host`,
    );
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  console.log(
    `[browser-smoke] The Settings hero kept its action row on one line, inside the header's own box and inside the page host that clips it, at every width: ${readings.join("; ")}.`,
  );
}

/**
 * The headers that mount icon + copy only, read at the same widths and by the
 * same rules as the hero that carries a row.
 *
 * Both shapes go through one measurement and one set of box rules, which is the
 * point: the header a page grows a row onto later is a header this walk already
 * visits, so the row arrives measured — its buttons on one line inside the header
 * and the row itself out of the icon column — instead of being the header nobody
 * had a rule for. A row that appears is reported in the reading rather than
 * changing the shape the walk expects, because adding a row to a hub header is a
 * design decision, not a defect.
 */
async function assertTwoChildHero(page, surface) {
  const base = `http://127.0.0.1:${port}`;
  await page.goto(`${base}${surface.path}`, { waitUntil: "networkidle" });

  const hero = page.locator(surface.selector);
  await expect(hero, `The ${surface.name} header should mount the shared polish hero`)
    .toBeVisible({ timeout: 15_000 });

  const readings = [];
  for (const viewport of HERO_VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const at = `${viewport.width}px`;
    await expect(hero, `The ${surface.name} header should stay on the page at ${at}`).toBeVisible();

    const measured = await measureHeroBoxes(page, surface.selector);
    const { present: row } = assertHeroHeader(measured, { at, name: surface.name, route: surface.path });
    const [icon, copy] = measured.children;
    const columns = measured.tracks ? `, ${measured.tracks} columns` : "";
    readings.push(
      row
        ? `${at}: ${measured.display} header${columns}, icon ${icon.width}px + copy ${copy.width}px, header ${measured.hero.width}px inside a ${measured.clip.width}px page host, and a third child now measured as its action row`
        : `${at}: ${measured.display} header${columns}, icon ${icon.width}px + copy ${copy.width}px, header ${measured.hero.width}px inside a ${measured.clip.width}px page host, no action row`,
    );
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  console.log(
    `[browser-smoke] The ${surface.name} hero held its icon + copy header inside the page host that clips it at every width: ${readings.join("; ")}.`,
  );
}

/**
 * Every hero header in the app, at every width a rep reads one at.
 *
 * Both passes are needed because the two shapes are one template: the two-child
 * heroes mount it with one child fewer, so a row added there is laid out by the
 * same shared rule and has to be held to the same placement. Measuring only the
 * header that carries the row today would leave the next one to whoever wrote it,
 * which is why the manifest sweep reads a hero on every route it loads; these two
 * passes are the ones that also name their surface and hold its row to a
 * width-by-width contract.
 */
/**
 * Both boot sweeps' numbers reach the load after the one that took the space back,
 * in one strip.
 *
 * Two sweeps give space back at boot and both report into
 * `wingman-retired-storage-reclaim-v1`: `sweepRetiredStorage` removes stores no
 * build reads any more, and `sweepWebhookHistory` gives up the CRM send history's
 * delivered bodies and the oldest sends over its size. The size they leave is read
 * by the following load to print, because boot runs before any surface exists to
 * say so. That handoff is two loads wide and its failure modes are invisible in a
 * unit test of either half: a load that printed its own sweep's number would be
 * reporting space the rep has not had yet, a report that outlived its reading would
 * print the same reclamation on every visit, and a history reporting into a store
 * of its own would leave the strip naming the retired copy's share alone — or, on a
 * browser whose only reclaimable storage was a send history, saying nothing. So the
 * walk seeds both sources, reads the load that took them (silent, with both stores
 * already shrunk), the next load (one strip naming the total and each source's
 * share of it) and the one after that (gone, even though the rep dismissed the
 * strip in the load before rather than waiting for it to expire).
 *
 * The retired key and the report are removed before the seeding, so the pass does
 * not depend on what earlier passes left. The history is set to the one row this
 * pass needs rather than added to, so what the sweep has to clean is this pass's own
 * seed: a body still held on a send a resend already delivered, which is exactly
 * the space that sweep exists to give back. Both sizes are derived from the
 * documents the walk wrote and from what the sweep left, never assumed — a sweep
 * that measured a key's name instead of its contents, or one whose share did not
 * add up to the strip's total, prints a number this derives differently.
 */
async function assertRetiredStorageNote(page) {
  const base = `http://127.0.0.1:${port}`;
  const retiredKey = "wingman:video-wall-last-summary";
  const reportKey = "wingman-retired-storage-reclaim-v1";
  const historyKey = "wingman-crm-webhook-history";
  // A wall summary shape, padded to the size a real one held — large enough to
  // land in the kilobytes the note has to name.
  const value = JSON.stringify({
    savedAt: "2026-07-02T09:00:00.000Z",
    wallType: "lcd",
    summary: { room: "harbour retail signage", notes: "x".repeat(30_000) },
  });
  const retiredBytes = (retiredKey.length + value.length) * 2;
  // A send the CRM accepted and a resend already delivered, still holding the body
  // it POSTed — the round trip in which the old build marked the row without
  // clearing it. It is what the CRM sweep has to clean, and it is worth the
  // kilobytes that make its share of the strip worth naming.
  const delivery = crmHistoryPayload(CRM_HISTORY_ROOM_ID);
  const history = JSON.stringify([
    {
      id: "wh-strip-delivered",
      projectId: CRM_HISTORY_ROOM_ID,
      projectName: `${GALLERY_ROOM_NAME} — huddle room, delivered and still holding its body`,
      sentAt: "2026-10-27T09:30:00.000Z",
      status: "error",
      httpStatus: 500,
      errorMessage: "HTTP 500 Internal Server Error",
      retriedAt: "2026-10-27T10:00:00.000Z",
      payload: {
        ...delivery,
        discoveryBriefAttachment: {
          filename: "brief.html",
          mimeType: "text/html;charset=utf-8",
          content: "A".repeat(20_000),
        },
      },
    },
  ]);
  // The strip's own units, spelled from the same rule `formatStorageBytes` uses so
  // the pass can name the numbers it expects rather than wait to be told them.
  const asSize = (count) => (count < 1024
    ? `${count} B`
    : count < 1024 * 1024
      ? `${Math.round(count / 1024)} KB`
      : `${(count / (1024 * 1024)).toFixed(1)} MB`);
  const note = page.getByTestId("storage-reclaim-note");

  await page.goto(`${base}/wingman/projects`, { waitUntil: "networkidle" });
  await page.evaluate(([key, report, stored, crmKey, seeded]) => {
    window.localStorage.removeItem(report);
    window.localStorage.setItem(key, stored);
    window.localStorage.setItem(crmKey, seeded);
  }, [retiredKey, reportKey, value, historyKey, history]);

  // The load that takes the space back: it may not report it, because the write
  // for that report happens after this load's take.
  await page.reload({ waitUntil: "networkidle" });
  await expect(note, "The sweep's own load should not print the space it is still taking back")
    .toHaveCount(0, { timeout: 15_000 });
  const swept = await page.evaluate(([key, report, crmKey]) => ({
    retired: window.localStorage.getItem(key),
    report: window.localStorage.getItem(report),
    history: window.localStorage.getItem(crmKey),
  }), [retiredKey, reportKey, historyKey]);
  if (swept.retired !== null) {
    throw new Error("The retired wall summary copy outlived the load that should have removed it.");
  }
  if (!swept.report) {
    throw new Error("The sweep removed the retired copy but left no report of how much space it took back.");
  }
  const historyAfter = swept.history ?? "";
  if (historyAfter.includes("discoveryBriefAttachment")) {
    throw new Error(
      "The boot sweep left a delivered send's body in the CRM history it should have cleared, so there was no second share for the strip to report.",
    );
  }
  // Both sizes are read off the two entries as the browser holds them, so a sweep
  // that reported something other than the space it freed prints a number this
  // pass computes differently.
  const historyBytes = (historyKey.length + history.length) * 2 - (historyKey.length + historyAfter.length) * 2;
  if (!(historyBytes > 0)) {
    throw new Error(
      `The CRM history should have shrunk when the sweep cleared the delivered body, but it was ${historyAfter.length} characters before and after.`,
    );
  }
  const totalBytes = retiredBytes + historyBytes;
  const size = asSize(retiredBytes);
  const historySize = asSize(historyBytes);

  // The next load: one strip, naming the size the sweep measured.
  await page.reload({ waitUntil: "networkidle" });
  await expect(note, "The load after a sweep should say how much browser storage came back").toBeVisible({ timeout: 15_000 });
  const text = (await note.innerText()).replace(/\s+/g, " ").trim();
  await expect(note, "Both boot sweeps' space belongs in one strip, not one each")
    .toHaveCount(1);
  if (!text.includes(`took back ${asSize(totalBytes)} of browser storage`)) {
    throw new Error(
      `The storage note should say the ${asSize(totalBytes)} both boot sweeps gave back (${retiredBytes} bytes of retired copy and ${historyBytes} of send history), but it read ${JSON.stringify(text)}.`,
    );
  }
  if (!text.includes(`${size} in copies an older build left behind`)) {
    throw new Error(
      `The note should name the ${size} the retired wall summary held as its own share (${retiredBytes} bytes), but it read ${JSON.stringify(text)}.`,
    );
  }
  if (!text.includes(`${historySize} from the CRM send history`)) {
    throw new Error(
      `The note should name the ${historySize} the send history gave back (${historyBytes} bytes), so one load tells a rep everything boot returned, but it read ${JSON.stringify(text)}.`,
    );
  }
  if (!text.includes("Nothing a project holds went with it")) {
    throw new Error(
      `A rep reading that storage was cleared needs to know nothing of theirs went with it, but the note read ${JSON.stringify(text)}.`,
    );
  }
  const afterReading = await page.evaluate((report) => window.localStorage.getItem(report), reportKey);
  if (afterReading !== null) {
    throw new Error("The report is still in storage after the load that printed it, so a later load would print it again.");
  }

  // Dismissed in the load that read it, and gone on the next load as well: the
  // number came out of storage before the strip was on screen, so there is no
  // second copy to find.
  await page.getByTestId("storage-reclaim-dismiss").click();
  await expect(note, "Dismissing the storage note should take the strip away").toHaveCount(0);
  await page.reload({ waitUntil: "networkidle" });
  await expect(note, "The storage note should not return on a later load").toHaveCount(0, { timeout: 15_000 });

  console.log(
    `[browser-smoke] A load that found a retired wall summary copy of ${retiredBytes} bytes and a delivered CRM send still holding its ${historyBytes} byte body removed both without saying so, the next load printed one strip — "took back ${asSize(totalBytes)} of browser storage", ${size} in copies an older build left behind and ${historySize} from the CRM send history — and the strip did not come back after it was dismissed or after the following load.`,
  );
}

async function assertHeroHeaders(page) {
  await assertHeroActionRow(page);
  for (const surface of HERO_TWO_CHILD_SURFACES) {
    await assertTwoChildHero(page, surface);
  }
}
/**
 * The template review page's save notice, held at the two widths a rep reads it at.
 *
 * The page has two saves — the room design as a project, and as a custom template
 * — and the notice prints a line for each plus the app's one link to a template,
 * which names the design it opens. That name is the point: a rep who has saved two
 * designs from two rooms otherwise reads two links saying "Open template" with
 * nothing to tell them apart. The notice is a wrapping flex row
 * (`.wm-template-save-notice`), which is what lets a phone hold four children —
 * two sentences and two links — without one of them leaving the box.
 *
 * Both saves are clicked rather than seeded, because both are this page's own
 * buttons and both write the browser's store: no endpoint is involved, so a
 * preview build reaches the state a rep does. The name the link has to print is
 * read back from the store the save wrote, so this says the notice names the
 * design it just saved rather than a name the walk assumed, and a saved design
 * renamed by someone else cannot make the check fail for the wrong reason.
 *
 * Both ends are measured because the notice's own width is what changes: 945px of
 * row on a desktop and 314px on a phone, three lines against five. The wrap is the
 * one thing holding the named link in — it is the widest child in the row, 431px
 * of it in a 314px notice once the row stopped wrapping — so a child that stays
 * inside a 945px notice says nothing about the same child in a 314px one.
 */
const TEMPLATE_REVIEW_ROUTE = "/wingman/templates/corporate-huddle-apollo";
const TEMPLATE_COPY_STORE_KEY = "wingman-custom-room-templates-v1";

/**
 * A concrete value for each `:param` the router registers, so a derived address is
 * a page with content on it rather than an id the walk invented.
 *
 * All three are reachable in a preview build: the record is the first starter room,
 * which the gallery pass has already seeded designs onto; the review is the design
 * `TEMPLATE_REVIEW_ROUTE` names, which the save-notice pass clicks through before
 * the sweep runs; the family is the first guide `ProductFamilyPage` prints. A param
 * with no entry here is still visited — its address is built from the param's own
 * name — so a new detail shape is swept the day it lands and shows its own
 * not-found state instead of being skipped for want of a literal here.
 */
const SAMPLE_ROUTE_PARAMS = {
  projectId: CRM_HISTORY_ROOM_ID,
  templateId: TEMPLATE_REVIEW_ROUTE.split("/").filter(Boolean).pop(),
  familyId: "networkhd-100",
};

/**
 * What a splat route's `*` becomes, so a page *under* the base path is loaded:
 * one address per fill, in the order the list gives them.
 *
 * The card page opens by SKU, so the first sample is a SKU the seeded catalogue
 * carries: a made-up one would render the page's not-found state, which is a
 * render but not the card a rep deep-links to. The second is a page *under* that
 * card's address, because the splat covers every depth under its base and the
 * card alone only ever loads one: a page that reads its address by taking the
 * last segment is exercised at the depth a rep can deep-link to, and a page that
 * assumed a single segment would hang, blank or die on the deeper one rather than
 * on the card. `select` is the segment the page already reads for itself —
 * `getSkuFromPath` treats a trailing `select` as "no card chosen" — so the deeper
 * address lands on the choose-a-product view rather than on the card page's
 * not-found state.
 *
 * A splat with no entry here is still visited — as `/sample` — so a new one is
 * swept the day it lands and whatever it prints has to render.
 */
const SPLAT_ROUTE_SAMPLES = {
  "product-call-cards": ["MX-0404-HDMI", "MX-0404-HDMI/select"],
};

/**
 * Every parameterised route shape the router registers, read from the router.
 *
 * The manifest lists a page's address, not the ids inside it, so the addresses a
 * rep reaches by clicking through — a room's record, a design's review and its
 * editor, a product family — used to be two written out here by hand. A third
 * detail page registered in `routes.tsx` was therefore swept only when someone
 * remembered to add its address, which is exactly the page nobody had opened. The
 * shapes are read off the router's own `path:` literals instead, and every param is
 * filled from `SAMPLE_ROUTE_PARAMS` or its own name, so registering a detail route
 * is what puts it in this sweep.
 *
 * The reading fails closed. Finding no shape at all is a moved or renamed router
 * rather than a router with no detail pages, and a shape written by interpolation
 * cannot be turned into an address without executing the module, so both throw
 * here instead of quietly sweeping less than the app registers.
 *
 * A splat (`product-call-cards/*`) is read too, because the manifest lists the
 * base path and the page a rep deep-links to lives under it: the `*` is filled
 * from `SPLAT_ROUTE_SAMPLES`, and `routes.tsx` writes that shape as a path
 * literal for this reading — as an interpolated template it could not be turned
 * into an address, and the sweep would go back to loading only the base path
 * that the manifest already covers.
 */
function registeredParameterisedRoutes() {
  const routerSource = readFileSync(
    path.join(projectRoot, "src/wingman2/app/routes.tsx"),
    "utf8",
  );

  const interpolated = [...routerSource.matchAll(/\bpath:\s*`([^`]*)`/g)]
    .map((match) => match[1])
    .filter((literal) => literal.includes(":") && literal.includes("${"));
  if (interpolated.length) {
    throw new Error(
      `The router builds parameterised route shapes by interpolation (${interpolated.join(", ")}), `
        + "which this sweep cannot turn into an address without executing the module. "
        + "Write the shape as a path literal so a walk can load it.",
    );
  }

  const shapes = [];
  for (const pattern of [
    /\bpath:\s*"([^"]*:[A-Za-z][^"]*)"/g,
    /\bpath:\s*`([^`]*:[A-Za-z][^`]*)`/g,
    /\bpath:\s*"([^"]*\/\*[^"]*)"/g,
    /\bpath:\s*`([^`]*\/\*[^`]*)`/g,
  ]) {
    for (const match of routerSource.matchAll(pattern)) {
      const shape = match[1].trim();
      if (shape.includes("/") && !shapes.includes(shape)) shapes.push(shape);
    }
  }
  if (!shapes.length) {
    throw new Error(
      "No parameterised route shapes were found in src/wingman2/app/routes.tsx, so a detail page "
        + "would never be swept: check the router still registers its shapes as path literals.",
    );
  }

  const routes = [];
  for (const shape of shapes) {
    const params = [...shape.matchAll(/:([A-Za-z][A-Za-z0-9_]*)/g)].map((match) => match[1]);
    const segment = shape.split("/").filter(Boolean)[0] ?? "";
    // A splat covers every depth under its base, so it is swept once per fill and
    // a deeper one is what holds it to being a splat; a param shape is one
    // address, because the id inside it is what the shape is.
    let fills = [null];
    if (shape.includes("*")) {
      const samples = SPLAT_ROUTE_SAMPLES[segment];
      if (samples === undefined) {
        fills = ["sample"];
      } else if (!Array.isArray(samples) || !samples.length) {
        // Fail closed: an empty list would leave the splat swept at no address at
        // all, which reads as a green walk rather than as a missing one.
        throw new Error(
          `SPLAT_ROUTE_SAMPLES["${segment}"] should be a non-empty list of addresses for ${shape}; `
            + "as written the splat would be swept at none.",
        );
      } else {
        fills = samples;
      }
    }
    for (const fill of fills) {
      const substituted = fill === null ? shape : shape.replace(/\*/g, fill);
      const filled = substituted
        .replace(/:([A-Za-z][A-Za-z0-9_]*)/g, (_, name) => SAMPLE_ROUTE_PARAMS[name] ?? name);
      // The label is the shape rather than a page name, because this list is not
      // written by hand: a failure then names the registration a person edits, and
      // the path beside it says which address of that shape failed.
      routes.push({
        key: `shape:${shape}${fill === null ? "" : `#${fill}`}`,
        path: shape.startsWith("/") ? filled : `/wingman/${filled}`,
        label: shape,
        params,
      });
    }
  }
  return routes;
}

/**
 * The successor the router declares for each address it no longer serves, read from
 * the router itself.
 *
 * A load that ends somewhere other than the address it asked for is two different
 * things, and the landing cannot tell them apart: a legacy address the app keeps on
 * purpose lands on the page that replaced it, and an address nothing owns lands on
 * Home because the catch-all sends it there (through the dashboard redirect). Both
 * change the pathname, so "the path changed" was enough to be reported as a route
 * that had moved — which is how an address whose page had been deleted read as a
 * consolidation the app had chosen.
 *
 * What separates them is a fact about the router rather than about the landing:
 * whether `routes.tsx` declares a redirect for that path. Taking the `path` and `to`
 * of every `Navigate` and `LegacyTaskRedirect` entry makes the honoured set the
 * app's own list of legacy addresses instead of one written out here — a redirect
 * added to the router is a consolidation the day it lands, and one removed takes its
 * address out of the honoured set with it.
 *
 * The catch-all (`path: "*"`) is skipped when it appears here: it is the thing being
 * told apart from a declared successor, so honouring it would make every unowned
 * address legitimate. And an entry whose destination is built rather than written
 * fails closed: a `to` this cannot read would vanish from the map, and the address it
 * serves would be failed as unowned rather than honoured. The read is per route
 * entry, not over the whole file, because `LegacyTaskRedirect` is a component that
 * renders a `<Navigate to={…}>` of its own — the interpolation is the component doing
 * its job, and only an entry's own destination is a declaration.
 */
function declaredRouteSuccessors() {
  const routerSource = readFileSync(
    path.join(projectRoot, "src/wingman2/app/routes.tsx"),
    "utf8",
  );

  const successors = new Map();
  // One route entry at a time: `[^{}]*?` keeps the search inside the entry, so a
  // destination belonging to the next route cannot be paired with this one's path.
  for (const match of routerSource.matchAll(
    /\{\s*path:\s*"([^"]+)"[^{}]*?element:\s*<(?:Navigate|LegacyTaskRedirect)\b([^{}]*?)\/?>/g,
  )) {
    const [, segment, attributes] = match;
    if (segment === "*") continue;
    if (/\bto=\{/.test(attributes)) {
      throw new Error(
        `The router builds the destination of its "${segment}" redirect by interpolation, which this sweep `
          + "cannot read: write the `to` as a string literal so a walk can tell a declared successor from the "
          + "address the catch-all takes.",
      );
    }
    const destination = /\bto="([^"]+)"/.exec(attributes);
    if (!destination) {
      throw new Error(
        `The router's "${segment}" entry renders a redirect with no readable destination, so the sweep cannot `
          + "tell a declared successor from the address the catch-all takes. Write the `to` as a string literal.",
      );
    }
    successors.set(segment.startsWith("/") ? segment : `/wingman/${segment}`, destination[1]);
  }
  return successors;
}

/**
 * Whether the address a load ended on is the one the router declares for it.
 *
 * The declared target can carry a query (`/wingman/compare?mode=battle-cards`), and
 * the arrival can carry more than the declaration names: `LegacyTaskRedirect` keeps
 * every parameter except `mode`, so an address followed with its own query lands on
 * the successor plus that query. The pathname has to be the declared one, and the
 * declared query — when it has one — has to be present in the arrival; anything more
 * is the address's own state rather than a different page.
 */
function arrivedAtDeclaredSuccessor(declared, arrived) {
  const target = new URL(declared, "http://127.0.0.1");
  if (target.pathname !== arrived.pathname) return false;
  if (!target.search) return true;
  const arrivedParams = new URLSearchParams(arrived.search);
  for (const [key, value] of new URLSearchParams(target.search)) {
    if (arrivedParams.get(key) !== value) return false;
  }
  return true;
}

async function assertTemplateSaveNotice(page) {
  const base = `http://127.0.0.1:${port}`;
  await page.goto(`${base}${TEMPLATE_REVIEW_ROUTE}`, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Save as project" }).click();
  await page.locator("details.wm-template-overflow > summary").click();
  await page.getByRole("button", { name: "Save as template" }).click();

  const notice = page.locator(".wm-template-save-notice");
  await expect(notice, "The template page should confirm the project save")
    .toContainText("Room design saved as a project.", { timeout: 15_000 });
  await expect(notice, "The template page should confirm the template save")
    .toContainText("Room design saved as a custom template.");

  const savedName = await page.evaluate((key) => {
    const stored = JSON.parse(window.localStorage.getItem(key) || "[]");
    // The design the page just saved is the newest one in the store, picked by the
    // timestamp it recorded rather than by its place in the array: `stored[0]` read
    // the store's own ordering promise, so a store that listed an older design first
    // would have named a save the notice never made.
    const newest = stored.reduce((latest, template) => (
      !latest || String(template.updatedAt ?? "") > String(latest.updatedAt ?? "") ? template : latest
    ), null);
    return newest?.name ?? "";
  }, TEMPLATE_COPY_STORE_KEY);
  if (!savedName) {
    throw new Error("Saving a design as a template stored nothing, so the notice has no name to print.");
  }

  // The whole wording, both ways round: the visible label is what a rep reads,
  // and the accessible name is what they hear, so the link has to carry the name
  // in the text it prints rather than only in the heading or a title.
  const namedLink = notice.getByRole("link", { name: `Open template: ${savedName}` });
  await expect(namedLink, "The notice's link should name the design the save wrote")
    .toHaveText(`Open template: ${savedName}`, { timeout: 15_000 });

  const readings = [];
  for (const viewport of [{ width: 1280, height: 900 }, { width: 360, height: 800 }]) {
    await page.setViewportSize(viewport);
    const at = `${viewport.width}px`;
    await expect(namedLink, `The save notice should still name the design at ${at}`).toBeVisible();

    const measured = await notice.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      // What the notice's own padding leaves its children: a child past this is
      // drawn outside the green box, which is where the clip starts.
      const content = {
        left: box.left + parseFloat(style.paddingLeft),
        right: box.right - parseFloat(style.paddingRight),
      };
      const children = [...element.children].map((child) => {
        const childBox = child.getBoundingClientRect();
        return {
          text: child.textContent.trim().slice(0, 32),
          left: Math.round(childBox.left),
          right: Math.round(childBox.right),
          top: Math.round(childBox.top),
        };
      });
      // The link is a flex item, so it is blockified: client and scroll width say
      // whether the label it prints was cut, which an inline label cannot report.
      const link = element.querySelector("a[aria-label^='Open template']");
      return {
        content: { left: Math.round(content.left), right: Math.round(content.right) },
        notice: { width: element.clientWidth, scroll: element.scrollWidth },
        children,
        // Distinct tops: one means the row never had to wrap.
        lines: new Set(children.map((child) => child.top)).size,
        link: link ? { width: link.clientWidth, scroll: link.scrollWidth } : null,
      };
    });

    readings.push(`${at}: notice ${measured.notice.width}px over ${measured.lines} line${measured.lines === 1 ? "" : "s"}`);

    const lost = measured.children
      .filter((child) => child.left < measured.content.left - 1 || child.right > measured.content.right + 1)
      .map((child) => `"${child.text}" (${child.left}-${child.right}px outside ${measured.content.left}-${measured.content.right}px)`);
    if (lost.length) {
      throw new Error(`The template save notice let a child leave its box at ${at}: ${lost.join(", ")}.`);
    }
    if (measured.notice.scroll > measured.notice.width + 1) {
      throw new Error(
        `The template save notice overflows at ${at} (${measured.notice.scroll} > ${measured.notice.width}): it has to wrap rather than grow.`,
      );
    }
    if (measured.link === null) {
      throw new Error(`The template save notice has no link to the saved design to measure at ${at}.`);
    }
    if (measured.link.scroll > measured.link.width + 1) {
      throw new Error(
        `The template save notice cut the design's name at ${at} (${measured.link.scroll}px of label in ${measured.link.width}px); a phone has no title to fall back on.`,
      );
    }
    if (viewport.width === 360 && measured.lines < 2) {
      throw new Error(
        "The template save notice did not wrap at 360px: two sentences and two links cannot share one line on a phone, so a single line means the row grew past the notice instead.",
      );
    }
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  console.log(
    `[browser-smoke] The template save notice named the design it saved ("Open template: ${savedName}") and wrapped inside its own box: ${readings.join("; ")}.`,
  );
}

/**
 * What the boot sweep dropped, on both surfaces that print it.
 *
 * One component prints this note in two places: the project record's activity log,
 * which is where a rep who never opens the CRM panel reads what happened to their
 * room, and the CRM panel itself, above the send preview. The panel's copy alone
 * left the biggest rows sitting in the storage of exactly the browsers whose rep was
 * never told, which is why the activity log got one; the panel's copy is the one a
 * rep meets while sending, so both are held here rather than one standing in for the
 * other. The note is the widest sentence on the activity log because it names the
 * count, whose history it was and what survived, and none of that is one short line.
 *
 * Both mounts are read through `measureDroppedSendsNote`, so the rules are the
 * component's and only the mount differs; each failure names the mount it came
 * from. The panel's copy is measured in this pass rather than an earlier one
 * because the count is seeded here — a note standing in the panel while the CRM
 * passes above run would put a line into the boxes they measure.
 *
 * Seeded rather than swept: the count is what a boot sweep leaves after it trims a
 * history the browser held, and a preview build has none to trim. The number the
 * note has to name is read back from the store the seed wrote, so the reading says
 * it named the count that is stored rather than a number the walk assumed — a
 * sweep that dropped a row of its own would still pass.
 *
 * Both ends are measured because the note reads differently at each: one row at
 * 1280px, with the sentence and its action side by side, and wrapped lines at 360px,
 * where the action takes a line of its own and the sentence keeps the note's whole
 * width. The wide reading says nothing about the narrow one, which is where a row
 * that fits by squeezing the sentence beside the icon and the button would leave the
 * count unreadable.
 *
 * One acknowledgement settles both: the two copies are one component reading one
 * key, and `Dismiss` removes that key rather than marking it read for the mount it
 * was pressed on. That is the half no measurement can show — both copies could fit
 * perfectly and still leave the record telling a rep about sends they had already
 * dismissed — so the walk presses a dismissal, reads the key back, and opens the
 * other mount again: a copy that returned there would be one the store still held,
 * not one this page failed to un-mount.
 *
 * Both directions are walked. Dismissing on the panel and reading the record is the
 * one a rep who sends meets, and dismissing in the record and reading the panel is
 * the one a rep who never sends meets — which is the reason the record's copy
 * exists. One direction does not prove the other: a `Dismiss` that settled the
 * mount it was pressed on and left the other would pass either check alone, and the
 * panel is where a rep sends next, so a count left standing there would describe
 * sends they had already read. Each direction is seeded again before it runs,
 * because the check before it consumed the count.
 */
const CRM_WEBHOOK_DROPS_KEY = "wingman-crm-webhook-history-drops-v1";
const DROPPED_SENDS_SEED = 3;

async function assertDroppedSendsNoteInProjectRecord(page) {
  const base = `http://127.0.0.1:${port}`;
  await page.goto(
    `${base}/wingman/projects/${CRM_HISTORY_ROOM_ID}?view=audit#project-activity`,
    { waitUntil: "networkidle" },
  );
  await page.evaluate(
    ([key, count]) => window.localStorage.setItem(key, JSON.stringify({ droppedRows: count })),
    [CRM_WEBHOOK_DROPS_KEY, DROPPED_SENDS_SEED],
  );
  await page.reload({ waitUntil: "networkidle" });

  // Scoped to the activity log, so this reads the record's copy of the note rather
  // than the CRM panel's, which sits on another section of this page.
  const activity = page.locator("#project-activity");
  await expect(activity, "The record should open on its activity log")
    .toBeVisible({ timeout: 15_000 });
  const note = activity.getByTestId("crm-webhook-history-drops");
  await expect(
    note,
    "The activity log should print what the boot sweep dropped from this browser's send history",
  ).toBeVisible({ timeout: 15_000 });

  const dropped = await page.evaluate(
    (key) => JSON.parse(window.localStorage.getItem(key) || "null")?.droppedRows ?? 0,
    CRM_WEBHOOK_DROPS_KEY,
  );
  if (!dropped) {
    throw new Error("The activity log's note has no stored count to name, so the walk measured nothing.");
  }
  await expect(note, "the note should name the count the sweep left")
    .toContainText(`dropped ${dropped} older send`);
  await expect(note, "the note should name whose history it was")
    .toContainText("CRM send history");

  const readings = await measureDroppedSendsNote(page, {
    note,
    mount: "the record's activity log",
  });

  // The same component's other mount: the CRM panel, where a rep sends and where this
  // note sits above the send preview. It is measured in this pass rather than an earlier
  // one because the count is seeded here — a note in the panel while the passes above
  // run would put a line into the boxes they measure.
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(
    `${base}/wingman/projects/${CRM_HISTORY_ROOM_ID}?view=handoff#project-handoff`,
    { waitUntil: "networkidle" },
  );
  await page.getByRole("button", { name: /Send to CRM via Webhook/ }).click();
  const panelNote = page
    .locator(".wm-crm-share-panel")
    .getByTestId("crm-webhook-history-drops");
  await expect(
    panelNote,
    "The CRM panel should print the same note above the send preview",
  ).toBeVisible({ timeout: 15_000 });
  await expect(panelNote, "The panel's copy should name the count the sweep left")
    .toContainText(`dropped ${dropped} older send`);
  const panelReadings = await measureDroppedSendsNote(page, {
    note: panelNote,
    mount: "the CRM panel",
  });

  // Dismissed where a rep sends, and read where a rep who never sends would meet it.
  // The count is storage rather than page state, so the record is opened again rather
  // than switched to: what is being held is that the acknowledgement reached both
  // surfaces, and a fresh load is the only reading that separates "settled" from
  // "this page happened to have un-mounted its copy".
  await page.setViewportSize({ width: 1366, height: 900 });
  await panelNote.getByTestId("crm-webhook-history-drops-dismiss").click();
  await expect(
    panelNote,
    "The CRM panel's copy of the dropped-sends note should close when its dismissal is pressed",
  ).toBeHidden({ timeout: 15_000 });
  const settled = await page.evaluate((key) => window.localStorage.getItem(key), CRM_WEBHOOK_DROPS_KEY);
  if (settled !== null) {
    throw new Error(
      `The dropped-sends note was dismissed on the CRM panel but ${CRM_WEBHOOK_DROPS_KEY} still holds `
      + `${settled}; both mounts read that key, so the record would print it again.`,
    );
  }

  await page.goto(
    `${base}/wingman/projects/${CRM_HISTORY_ROOM_ID}?view=audit#project-activity`,
    { waitUntil: "networkidle" },
  );
  // The section is read before the note's absence, or a page that had not painted yet
  // would satisfy an empty count without the record having decided anything.
  await expect(page.locator("#project-activity"), "The record should reopen on its activity log")
    .toBeVisible({ timeout: 15_000 });
  const recordAfterDismissal = page
    .locator("#project-activity")
    .getByTestId("crm-webhook-history-drops");
  await expect(
    recordAfterDismissal,
    "Dismissing the dropped-sends note on the CRM panel should settle the record's copy too, "
    + "but the activity log still prints it",
  ).toHaveCount(0, { timeout: 15_000 });

  // The reverse direction, which the panel-first check cannot stand in for: the record
  // is the mount a rep who never opens the CRM panel reads, so a dismissal pressed
  // there has to settle the copy a rep meets while sending. The count is written again
  // because the check above consumed it — an absent key reads as settled on both
  // mounts, which is exactly the state that would make this half pass without testing
  // anything.
  await page.evaluate(
    ([key, count]) => window.localStorage.setItem(key, JSON.stringify({ droppedRows: count })),
    [CRM_WEBHOOK_DROPS_KEY, DROPPED_SENDS_SEED],
  );
  await page.reload({ waitUntil: "networkidle" });
  const reseeded = page.locator("#project-activity").getByTestId("crm-webhook-history-drops");
  await expect(
    reseeded,
    "The record's copy should print again once a sweep has left a count to report",
  ).toBeVisible({ timeout: 15_000 });
  await reseeded.getByTestId("crm-webhook-history-drops-dismiss").click();
  await expect(
    reseeded,
    "The record's copy of the dropped-sends note should close when its own dismissal is pressed",
  ).toBeHidden({ timeout: 15_000 });
  const settledFromRecord = await page.evaluate((key) => window.localStorage.getItem(key), CRM_WEBHOOK_DROPS_KEY);
  if (settledFromRecord !== null) {
    throw new Error(
      `The dropped-sends note was dismissed in the record's activity log but ${CRM_WEBHOOK_DROPS_KEY} still holds `
      + `${settledFromRecord}; the CRM panel reads that key, so the next send would print it again.`,
    );
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(
    `${base}/wingman/projects/${CRM_HISTORY_ROOM_ID}?view=handoff#project-handoff`,
    { waitUntil: "networkidle" },
  );
  await page.getByRole("button", { name: /Send to CRM via Webhook/ }).click();
  // The panel itself is read before its copy's absence, so a panel that had not
  // painted would not satisfy an empty count without anything having been decided.
  const reopenedPanel = page.locator(".wm-crm-share-panel");
  await expect(reopenedPanel, "The CRM panel should reopen so its copy of the note can be read")
    .toBeVisible({ timeout: 15_000 });
  await expect(
    reopenedPanel.getByTestId("crm-webhook-history-drops"),
    "Dismissing the dropped-sends note in the record's activity log should settle the CRM panel's copy too, "
    + "but the panel still prints it",
  ).toHaveCount(0, { timeout: 15_000 });

  await page.setViewportSize({ width: 1366, height: 900 });
  console.log(
    `[browser-smoke] The dropped-sends note named the ${dropped} sends the sweep left out of this browser's CRM send history on both of its mounts, inside the note at 1280px and 360px — the record's activity log: ${readings.join("; ")}; the CRM panel: ${panelReadings.join("; ")} — and its dismissal settled both, from the panel into the record and from the record into the panel.`,
  );
}

/**
 * The note's two shapes, one per width.
 *
 * Both ends are measured because the note reads differently at each: one row at
 * 1280px, with the sentence and its action side by side, and wrapped lines at 360px,
 * where the action takes a line of its own and the sentence keeps the note's whole
 * width. The wide reading says nothing about the narrow one, which is where a row that
 * fits by squeezing the sentence beside the icon and the button would leave the count
 * unreadable.
 */
const DROPPED_SENDS_SHAPES = [
  { width: 1280, height: 900, actionSharesTheLine: true },
  { width: 360, height: 800, actionSharesTheLine: false },
];

/**
 * One mount's copy of the dropped-sends note, at both of its shapes.
 *
 * The component prints in two places — the record's activity log and the CRM panel —
 * and the rules below are the component's, so only the mount may differ. Every failure
 * names the mount it was measured in, because "the note" would not say which copy came
 * apart, and the two columns are not the same box.
 */
async function measureDroppedSendsNote(page, { note, mount, shapes = DROPPED_SENDS_SHAPES }) {
  const readings = [];
  for (const shape of shapes) {
    await page.setViewportSize({ width: shape.width, height: shape.height });
    const at = `${shape.width}px`;
    await expect(note, `${mount}: the dropped-sends note should still be visible at ${at}`).toBeVisible();

    const measured = await note.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      // What the note's own padding leaves its children: a child past this is
      // drawn outside the note, which is where the clip starts.
      const content = {
        left: box.left + parseFloat(style.paddingLeft),
        right: box.right - parseFloat(style.paddingRight),
      };
      const child = (selector) => {
        const node = element.querySelector(selector);
        if (!node) return null;
        const childBox = node.getBoundingClientRect();
        return {
          tag: node.tagName.toLowerCase(),
          text: node.textContent.trim().slice(0, 24),
          left: Math.round(childBox.left),
          right: Math.round(childBox.right),
          top: Math.round(childBox.top),
          bottom: Math.round(childBox.bottom),
          width: node.clientWidth,
          scroll: node.scrollWidth,
        };
      };
      // The box that clips the note: the nearest ancestor that hides its
      // overflow. A note past that box is drawn nowhere, however well it fits
      // the panel it sits in.
      let clip = null;
      for (let node = element.parentElement; node; node = node.parentElement) {
        const nodeStyle = getComputedStyle(node);
        if (nodeStyle.overflowX !== "visible" || nodeStyle.overflowY !== "visible") {
          clip = node.getBoundingClientRect();
          break;
        }
      }
      const tree = [];
      for (let node = element; node; node = node.parentElement) {
        const nodeStyle = getComputedStyle(node);
        tree.push({
          node: `${node.tagName.toLowerCase()}${node.classList.length ? `.${[...node.classList].slice(0, 3).join(".")}` : ""}`,
          width: node.clientWidth,
          scroll: node.scrollWidth,
          display: nodeStyle.display,
          overflowX: nodeStyle.overflowX,
        });
      }
      const noteBox = { left: Math.round(content.left), right: Math.round(content.right) };
      const children = [child("svg"), child(":scope > span"), child("button")].filter(Boolean);
      const outside = children.filter((entry) => entry.left < noteBox.left - 1 || entry.right > noteBox.right + 1);
      // Which children share a line, read by vertical overlap rather than by equal
      // tops: the dismissal is a taller box than the sentence beside it, so it sits
      // at the row's centre with a smaller `top` while sharing that line.
      const bands = [];
      for (const entry of [...children].sort((a, b) => a.top - b.top)) {
        const band = bands[bands.length - 1];
        if (band && entry.top < band.bottom - 1) {
          band.bottom = Math.max(band.bottom, entry.bottom);
          band.members.push(entry.tag);
        } else {
          bands.push({ bottom: entry.bottom, members: [entry.tag] });
        }
      }
      const bandOf = (tag) => bands.findIndex((band) => band.members.includes(tag));
      return {
        content: noteBox,
        contentWidth: Math.round(content.right - content.left),
        note: { width: element.clientWidth, scroll: element.scrollWidth },
        children,
        sentenceBand: bandOf("span"),
        actionBand: bandOf("button"),
        lines: bands.length,
        escaped: outside.map((entry) => `the ${entry.tag} "${entry.text}" (${entry.left}-${entry.right}px outside ${noteBox.left}-${noteBox.right}px)`),
        clipped: clip
          ? box.right > clip.right + 1 || box.left < clip.left - 1
          : null,
        tree,
      };
    });

    const sentence = measured.children.find((entry) => entry.tag === "span");
    const action = measured.children.find((entry) => entry.tag === "button");
    readings.push(
      `${at}: note ${measured.note.width}px, sentence ${sentence ? sentence.width : 0}px of ${measured.contentWidth}px`,
    );

    if (measured.clipped === null) {
      throw new Error(`${mount}: the dropped-sends note has no box that clips it to measure against at ${at}.`);
    }
    if (measured.clipped) {
      throw new Error(
        `${mount}: the dropped-sends note is wider than the box that clips it at ${at}.\n`
        + measured.tree.map((entry) => `  ${entry.width}/${entry.scroll}${entry.overflowX !== "visible" ? " clipped" : ""} ${entry.display} ${entry.node}`).join("\n"),
      );
    }
    if (measured.note.scroll > measured.note.width + 1) {
      throw new Error(
        `${mount}: the dropped-sends note overflows at ${at} (${measured.note.scroll} > ${measured.note.width}): it has to wrap rather than grow.`,
      );
    }
    if (measured.escaped.length) {
      throw new Error(`${mount}: the dropped-sends note let a child leave its box at ${at}: ${measured.escaped.join(", ")}.`);
    }
    if (!sentence || !action) {
      throw new Error(
        `${mount}: the dropped-sends note is missing ${sentence ? "its sentence" : "its wording"} or its dismissal at ${at}.`,
      );
    }
    // The sentence is a flex item, so it is blockified: client and scroll width say
    // whether the sentence it prints was cut, which an inline span cannot report.
    if (sentence.scroll > sentence.width + 1) {
      throw new Error(
        `${mount}: the dropped-sends note cut its own sentence at ${at} (${sentence.scroll}px of wording in ${sentence.width}px).`,
      );
    }
    // What the sentence is worth where it sits: a note that fits by shrinking it
    // beside the icon and the dismissal fits by hiding the count it exists for.
    const share = sentence.width / measured.contentWidth;
    if (share < (shape.actionSharesTheLine ? 0.6 : 0.8)) {
      throw new Error(
        `${mount}: the dropped-sends note left its sentence ${Math.round(share * 100)}% of the note at ${at} `
        + `(${sentence.width}px of ${measured.contentWidth}px); the count is the sentence, so it keeps the width it needs.`,
      );
    }
    const sharesTheLine = measured.sentenceBand === measured.actionBand && measured.sentenceBand !== -1;
    if (sharesTheLine !== shape.actionSharesTheLine) {
      throw new Error(
        shape.actionSharesTheLine
          ? `${mount}: the dropped-sends note wrapped its dismissal onto a line of its own at ${at} (${measured.lines} lines), where the row has room for both.`
          : `${mount}: the dropped-sends note kept its dismissal on the sentence's line at ${at}, where the note has to wrap: a phone fits the action by shrinking the count.`,
      );
    }
  }

  return readings;
}

// The walk measures the built app: `vite preview` serves `dist/`, so a stylesheet
// edited after the last build is measured in its previous form. A fresh bundle is
// the gate the build is supposed to be, and a stale one is refused here — before a
// preview is started — rather than measured, because a check that reads the wrong
// bundle reports a rule the tree no longer has as present. Freshness is the
// content-hash manifest the build wrote, not a file time: an edit that a checkout
// left with an old timestamp still changes bytes, and bytes are what the bundle
// read. `npm run build` is the way through, and CI builds in the same job
// immediately before this walk.
let build;
try {
  build = assertFreshBuild(projectRoot);
} catch (error) {
  // A precondition rather than a measurement: the run never began, so it is said
  // as a sentence and stopped, without the stack a failed assertion would print.
  console.error(`[browser-smoke] ${error instanceof Error ? error.message : error}`);
  // And it is said on the run page too, because a red check is read there before
  // anyone opens the log that holds the reason: the commit the refused bundle came
  // from and the files that moved since, or — when there is no bundle to name —
  // that instead. The refusal carries those fields rather than the walk re-reading
  // the tree, so the page cannot describe a build the walk did not refuse.
  recordRefusalOnRunSummary(error);
  process.exit(1);
}
// Which bundle every reading below was taken against: the one fact a green run
// cannot show by itself. The revision is the build's rather than the checkout's —
// a clone that has moved on since still measured that commit — and `-dirty` says
// the commit does not contain all of what was measured. A build made where there
// is no `.git` (an image's build stage, a source archive) has none to name, so the
// sentence says when instead.
function buildIdentity(bundle) {
  const revision = bundle.revision ? `at ${bundle.revision}, written ` : "written ";
  return `the build ${revision}${new Date(bundle.builtAt).toISOString()}`;
}
console.log(
  `[browser-smoke] Reading ${buildIdentity(build)}; all ${build.inputs} files it was made from hash to what it recorded.`,
);

/**
 * The text this run put on the page for its build, so a failed walk can take it
 * back and write the one merged section in its place.
 */
let buildSectionOnRunPage = null;

/**
 * The build this run measured, on the CI run page instead of only in the log.
 *
 * A green Browser Smoke job says the built app renders; which commit it rendered
 * was only in the log, hundreds of lines deep, so the run page answered "did it
 * pass" and not "what passed". `$GITHUB_STEP_SUMMARY` is the file GitHub renders
 * under the job, and it is written here — before the walk starts — because a run
 * that dies without reaching either write (killed by the runner, out of memory)
 * still owes the page the build it was measuring.
 *
 * A run that does reach the failure path replaces this section rather than
 * appending beside it — see `recordFailureOnRunSummary` — so the page names the
 * build once whether the walk passed or failed.
 *
 * Outside CI the variable is unset and this does nothing. A summary that cannot
 * be written is said and stepped over rather than thrown: the file is a
 * convenience, and the walk's verdict must not turn on whether a runner let it
 * write there.
 */
function recordBuildOnRunSummary(bundle) {
  buildSectionOnRunPage = writeRunSummary(buildSummaryLines(bundle));
}

/**
 * The refusal, on the same run page the accepted build writes to.
 *
 * The passing job's summary answers "what did this measure"; a refused one has to
 * answer "what did it refuse, and against which tree", which is the question a red
 * check leaves open. Both go through `writeRunSummary` because the file is the same
 * one and one failure to write it should read the same either way.
 */
function recordRefusalOnRunSummary(error) {
  const refusal = error && typeof error === "object" ? error.refusal : null;
  if (!refusal) return;
  writeRunSummary(refusedSummaryLines(refusal));
}

/**
 * A failed assertion, on the same run page the accepted build writes to.
 *
 * The build's table is already there — it is written before the walk — and it
 * answers "what did this run measure" but says nothing about the failure, which is
 * the sentence a red check is opened for. The two are written as one section: the
 * build's own heading, table and sentence, with the assertion quoted under a
 * sub-heading. Writing the failure as a second section left the page naming the
 * build twice, so a red run read like two runs stapled together, and the top of the
 * page still read as a green one's.
 */
function recordFailureOnRunSummary(error, bundle) {
  const message = error instanceof Error ? error.message : String(error);
  if (bundle) writeRunSummary(failedSummaryLines(bundle, message), { replaces: buildSectionOnRunPage });
}

/**
 * Appends a section to the run page, or swaps out a section this run wrote earlier.
 *
 * `replaces` is the exact text `recordBuildOnRunSummary` added before the walk: the
 * failed page names the build once, so that section is removed and the merged one
 * takes its place. It is matched as the text that was appended rather than by
 * heading, so nothing another step wrote is touched; a page this run did not write
 * (or one a later step rewrote) does not contain it, and the new section is simply
 * appended.
 *
 * The body is returned so the caller can hold on to what it added, which is the
 * only way the replacement can be exact.
 */
function writeRunSummary(lines, { replaces = null } = {}) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return null;
  const body = `${lines.join("\n")}\n\n`;
  try {
    const written = replaces ? readFileSync(summaryPath, "utf8") : null;
    const at = written === null ? -1 : written.lastIndexOf(replaces);
    if (written === null || at === -1) {
      appendFileSync(summaryPath, body);
    } else {
      writeFileSync(summaryPath, `${written.slice(0, at)}${written.slice(at + replaces.length)}${body}`);
    }
    return body;
  } catch (error) {
    console.error(
      `[browser-smoke] Could not write the run summary to ${summaryPath}: ${error instanceof Error ? error.message : error}`,
    );
    return null;
  }
}

recordBuildOnRunSummary(build);

stopWindowsPortListener();

const preview = spawn(previewCommand, previewArgs, {
  cwd: projectRoot,
  env: {
    ...process.env,
    WINGMAN_UI_PORT: String(port),
  },
  stdio: "ignore",
  windowsHide: true,
});

let browser;
try {
  await waitForPreview();
  browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  page.on("pageerror", error => console.error(error.stack));
  await assertPageText(page, "/wingman/ingest", "Decode the incoming request");
  await assertPageText(page, "/wingman/compare", "Competitor Compare");
  await assertCompareWorkflow(page);

  // A fresh browser context has no active project, so the response builder
  // prompts the salesperson to open one before preparing customer output.
  await assertPageText(page, "/wingman/proposal", "Open a project before building a response");

  // The record's Requirements panel is one of its section panels, and a cold
  // start opens the first one, so this walk asserts the project name instead:
  // what the step is really for is that the route resolves and seeded project
  // data loads.
  await assertPageText(page, "/wingman/projects/northbridge-meeting-room-refresh", "Northbridge Meeting Room Refresh");

  await assertGalleryCardActions(page);

  await assertGuidedRecentFlags(page);

  await assertOpenedFeatureJourney(page);

  await assertCrmHistoryRows(page);

  await assertCrmHistoryRowsInResponseWizard(page);

  await assertProposalStepCards(page);

  await assertCrmHistoryRemovalNotes(page);

  await assertCrmHistoryRowDismissal(page);

  // Last of the CRM passes: the note it seeds is browser-wide storage, and the
  // CRM panel prints it too, so seeding earlier would put a line into the panels
  // and cards the passes above measure.
  await assertDroppedSendsNoteInProjectRecord(page);

  await assertRetiredStorageNote(page);

  await assertHeroHeaders(page);

  // Before the expert view is opened below: the guided start step is what a rep
  // sees first, and switching the page to the expert reading leaves it unmeasured.
  await assertWallWizardStartStep(page);

  await assertPageText(page, "/wingman/videowall", "Start from the job");
  await page.getByTestId("videowall-wizard-expert").click();
  await expect(page.getByRole("heading", { name: "One wall. The right signal path.", exact: true }))
    .toBeVisible({ timeout: 15_000 });
  // The design pass reads as folded lines: an answer stays closed until a rep
  // opens it, so the controls this walk sets are reached the way a rep reaches
  // them - open the two questions it answers, then choose.
  for (const index of [1, 2]) {
    const step = page.getByTestId(`videowall-step-${index}`);
    if (!(await step.evaluate((element) => element.open))) {
      await step.locator("summary").click();
    }
  }
  await page.getByRole("group", { name: "Panel array", exact: true })
    .getByRole("button", { name: /^3 × 3/ }).click();
  await expect(page.getByRole("button", { name: /^MX-0404-SCL/ })).toBeDisabled();
  await page.getByRole("button", { name: /^NetworkHD 500 · receiver per display/ }).click();
  const receiverRow = page.locator("tr").filter({ hasText: "NHD-500-RX" });
  if ((await receiverRow.locator("td").first().innerText()) !== "9") {
    throw new Error("A 3-by-3 direct LCD wall must have nine receivers.");
  }
  for (const name of [/^LCD · looped/, /^LED · processor input/, /^Large single projection/]) {
    await page.getByRole("button", { name }).click();
    if ((await page.getByRole("button", { name }).getAttribute("aria-pressed")) !== "true") {
      throw new Error("Video wall application selection did not update.");
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const wallSize = await page.locator(".vw-builder").evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth }));
  if (wallSize.scroll > wallSize.width + 1) throw new Error("Video wall builder overflows on mobile.");

  await assertTemplateSaveNotice(page);

  await assertManifestRoutesRender(page);

  console.log("[browser-smoke] Verified built app pages, Compare workflow, project detail route, video wall options, and every manifest route in a real browser.");
} catch (error) {
  // A failure is pasted into an issue or a review, and every reading here is a
  // reading of one build: two runs against different bundles disagree for that
  // reason alone, so the text has to say which one it measured. The error is
  // printed here rather than rethrown, because only that puts the identity after
  // it: Playwright's expectation errors carry a stack of their own and a
  // `matcherResult` object Node appends when it prints them, so a line written
  // into the message lands in the middle of that block and a line written before
  // the throw is above a paste that starts at the error. Printed last, it survives
  // a copy that takes the failure as it appears.
  const identity = `${buildIdentity(build)} from ${build.inputs} hashed inputs`;
  console.error(error);
  console.error(`[browser-smoke] The failure above was measured against ${identity}.`);
  // And the run page says it too: a red check is read there before anyone opens
  // this log, so the build section written before the walk began is replaced by one
  // that names the same build and quotes the assertion under it — one section, one
  // commit, rather than a red heading stacked above a green one.
  recordFailureOnRunSummary(error, build);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  preview.kill("SIGTERM");
  stopWindowsPortListener();
}
