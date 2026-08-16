import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import {
  governedProfilesHumanVerifiedExcept,
  governedProfilesWithoutSkus,
} from "../lib/testHelpers/governedProfilesHarness";
import { specCriticalFieldLabel, type SpecCriticalField } from "../lib/governedConfirmationBacklog";
import { normaliseSkuKey } from "../lib/skuAliasResolver";
import { CatalogBrowserPage } from "./CatalogBrowserPage";
import ComparePageNew from "./ComparePageNew";
import { ProductPitchPage } from "./ProductPitchPage";

// The profiles import below resolves to the SAME mocked payload the pages see
// (vi.mock intercepts the module for every importer in this graph), so the
// sweep can derive each card's expected confirmed-field set from the data
// that actually drove the render.
import governedProfilesMocked from "../../../data/governance/wyrestorm-technical-profiles.json";

// ---------------------------------------------------------------------------
// App-wide copy-consistency sweep for the missing tier.
//
// The resolver's statusLabel for a product with no data at all must read
// "Technical data not resolved" on EVERY surface - the same canonical copy the
// shared GovernedDataBadge renders. The legacy wording ("Technical data
// missing") must never surface anywhere.
//
// Surfaces that render resolver labels: Compare (badge + evidence panel),
// Product Pitch (badge AND raw text in the Technical Overview spec table, the
// one path that bypasses the badge component), Catalog (badge per product).
// Product Call Cards and the Data Manager render no governed badges or
// resolver labels (verified by source scan below), so they are trivially
// consistent - and the static scan would catch them if that ever changed.
//
// The reviewer-trail contract rides along in the Catalog sweep: the shared
// GovernedReviewerTrail element may render ONLY alongside a verified badge,
// and the fields it claims must equal exactly the profile's confirmed set -
// never a field the reviewer did not sign off.
// ---------------------------------------------------------------------------

// Each test drives a surface with the mutable index, so a genuine "no data at
// all" product (no governed profile AND no official-page technical data AND no
// catalogue evidence) can be injected - the only state that resolves to the
// missing tier. Reading lazily at call time means every index load inside a
// page (some pages load it more than once) sees the same payload.
let indexForSweep: typeof index = index;

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockImplementation(() => Promise.resolve(indexForSweep)),
}));

// Remove the two matrix profiles the sweep drives to the missing tier, and
// mark every remaining profile human-confirmed (`verifiedBy`) so the compare
// surface's "other cards keep their verified badge" contract tests the real
// verified path - machine-transcribed profiles would render at the
// official-structured tier, not verified (see governedProfilesHarness.ts).
vi.mock("../../../data/governance/wyrestorm-technical-profiles.json", async () => {
  const actual = (await vi.importActual(
    "../../../data/governance/wyrestorm-technical-profiles.json",
  )) as { default: { profiles: Array<{ sku: string }> } };
  return {
    default: governedProfilesHumanVerifiedExcept(
      governedProfilesWithoutSkus(actual.default, ["MX-0402-MST", "MX-0404-SCL"]),
      ["MX-0402-MST", "MX-0404-SCL"],
    ),
  };
});

// The Catalog surface needs a workspace session (mirrors the Catalog test).
// The Compare surface auto-runs a live competitor lookup in its evidence
// panel; every api call resolves successfully so that lookup settles inside
// the test instead of rejecting asynchronously after unmount (which vitest
// reports as an unhandled rejection).
vi.mock("../api/wingmanApi", () => ({
  getWingmanSession: vi.fn().mockResolvedValue({
    ok: true,
    session: { workspaceRole: "sales", permissions: { canManageWorkspace: false } },
  }),
  getWingmanJson: vi.fn().mockResolvedValue({ ok: true }),
  postWingmanJson: vi.fn().mockResolvedValue({ ok: true, record: null }),
  runCompetitorLookup: vi.fn().mockResolvedValue({ ok: true, record: null }),
  // The Compare surface also mounts the decision review queue; resolve its
  // fetch so the sweep's surfaces settle without unhandled rejections.
  fetchCompetitorDecisionQueue: vi.fn().mockResolvedValue({
    ok: true,
    total: 0,
    pending: 0,
    approved: 0,
    queue: [],
  }),
  fetchApprovedCompetitorDecisions: vi.fn().mockResolvedValue({
    ok: true,
    total: 0,
    approved: 0,
    decisions: [],
  }),
  approveCompetitorDecision: vi.fn().mockResolvedValue({ ok: true }),
  WingmanApiError: class WingmanApiError extends Error {},
}));

// Built dynamically so the sweep's own assertions can never trip the static
// source scan below.
const LEGACY_COPY = ["Technical", "data", "missing"].join(" ");
const CANONICAL_COPY = "Technical data not resolved";

function indexWithNoData(sku: string): typeof index {
  return {
    ...index,
    products: index.products.map((p) =>
      p.sku === sku ? { ...p, technicalProfile: undefined, sourceCatalog: undefined } : p,
    ),
  } as typeof index;
}

// Roots the static scan walks: app code, docs, and the raw data sources. The
// scan is the automated replacement for a manual repo-wide grep of the legacy
// wording.
const SCAN_ROOTS = ["src/wingman2", "docs", "data-sources"];

// Intentional occurrences of the legacy wording that must stay:
// - the badge contract test's drift guard, which deliberately feeds the
//   legacy string in to prove the component still canonicalizes it;
// - the audit doc's historical entries, which record what the old behavior
//   WAS - rewriting them would falsify the audit timeline.
const ALLOWED_LEGACY_FILES = new Set([
  "src/wingman2/components/GovernedDataBadge.test.tsx",
  "docs/AUDIT-2026-08-FUNCTIONAL-ACCURACY.md",
]);

// Text-ish extensions the scan reads. Docs are markdown, data-sources are
// CSV/JSON, app code is TS/TSX, scripts are MJS.
const SCAN_TEXT_EXTENSION = /\.(ts|tsx|js|mjs|md|json|csv|html|txt)$/i;

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkFiles(full, out);
    } else if (SCAN_TEXT_EXTENSION.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("app-wide missing-tier copy consistency sweep", () => {
  it("product pitch shows the canonical label as raw text for a product with no data at all", async () => {
    indexForSweep = indexWithNoData("MX-0402-MST");

    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch?sku=MX-0402-MST"]}>
        <ProductPitchPage />
      </MemoryRouter>,
    );

    // The workspace hero badge reads the canonical copy for the missing tier.
    await screen.findByText(CANONICAL_COPY);
    expect(document.body.textContent ?? "").not.toContain(LEGACY_COPY);

    // The Technical Overview tab renders the resolver's statusLabel as raw
    // text ("<status> - <completeness>% complete") - the one path that
    // bypasses the badge component. It must show the canonical copy too.
    fireEvent.click(screen.getByRole("tab", { name: "Technical Overview" }));

    await waitFor(
      () => {
        expect(document.body.textContent ?? "").toContain(`${CANONICAL_COPY} - `);
      },
      { timeout: 5000 },
    );
    expect(document.body.textContent ?? "").not.toContain(LEGACY_COPY);
  });

  it("catalog renders the canonical label on unprofiled accessory cards", async () => {
    indexForSweep = index;

    render(
      <MemoryRouter initialEntries={["/wingman/catalog-browser"]}>
        <CatalogBrowserPage />
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        expect(document.querySelectorAll(".wm-catalog-product-card").length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    // The catalogue contains real unprofiled accessories, so the canonical
    // missing-tier badge must actually render on the Catalog surface.
    const canonicalBadges = Array.from(
      document.querySelectorAll(".wm-catalog-product-card .compare-native-governance-badge"),
    ).filter((badge) => badge.textContent === CANONICAL_COPY);
    expect(canonicalBadges.length).toBeGreaterThan(0);
    expect(document.body.textContent ?? "").not.toContain(LEGACY_COPY);
  });

  it("renders reviewer trails only alongside verified badges and never claims fields outside the confirmed set", async () => {
    indexForSweep = index;

    render(
      <MemoryRouter initialEntries={["/wingman/catalog-browser"]}>
        <CatalogBrowserPage />
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        expect(document.querySelectorAll(".wm-catalog-product-card").length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    // The mocked payload marks every governed profile human-confirmed (except
    // the two stripped SKUs), so this is the full bidirectional contract over
    // every rendered card: trail <-> verified badge, and trail fields == the
    // profile's confirmedFields.
    const confirmedFieldsBySku = new Map(
      (governedProfilesMocked as { profiles: Array<{ sku: string; confirmedFields?: string[] }> }).profiles.map(
        (profile) => [normaliseSkuKey(profile.sku), profile.confirmedFields ?? []],
      ),
    );

    let verifiedCards = 0;
    for (const card of Array.from(document.querySelectorAll(".wm-catalog-product-card"))) {
      const sku = normaliseSkuKey(card.querySelector(".wm-catalog-product-sku")?.textContent ?? "");
      const badge = card.querySelector(".compare-native-governance-badge");
      const trail = card.querySelector(".wm-governed-reviewer-trail");
      const isVerified = badge?.className.includes("is-verified") ?? false;

      if (isVerified) {
        verifiedCards += 1;
        // Every verified card carries its trail...
        expect(trail, `verified card ${sku} carries its reviewer trail`).not.toBeNull();
        // ...and the fields it claims are EXACTLY the confirmed set - never a
        // field the reviewer did not sign off, never a missing one.
        const confirmedFields = confirmedFieldsBySku.get(sku) ?? [];
        const expectedLabels = confirmedFields
          .map((field) => specCriticalFieldLabel(field as SpecCriticalField))
          .join(" · ");
        const fieldsEl = trail!.querySelector(".wm-governed-reviewer-trail__fields");
        if (confirmedFields.length === 0) {
          expect(fieldsEl, `${sku} never claims a field outside the confirmed set`).toBeNull();
        } else {
          expect(fieldsEl?.textContent, `${sku} trail fields equal the confirmed set`).toBe(expectedLabels);
        }
      } else {
        // The trail never renders without a verified badge.
        expect(trail, `unverified card ${sku} has no reviewer trail`).toBeNull();
      }
    }
    // The scenario genuinely surfaces human-verified cards with trails.
    expect(verifiedCards).toBeGreaterThan(0);
  });

  it("compare shows the canonical label on a candidate with no data at all while verified cards stay verified", async () => {
    indexForSweep = indexWithNoData("MX-0404-SCL");

    render(
      <MemoryRouter
        initialEntries={[
          "/wingman/compare?brand=Kramer&sku=VS-42H&context=4x2+4K+HDMI+matrix+switcher",
        ]}
      >
        <ComparePageNew />
      </MemoryRouter>,
    );

    await screen.findByLabelText(/Main WyreStorm match:/i);

    await waitFor(
      () => {
        const badges = document.querySelectorAll(".compare-native-governance-badge");
        expect(
          Array.from(badges).some((badge) => (badge.textContent ?? "").includes(CANONICAL_COPY)),
        ).toBe(true);
      },
      { timeout: 5000 },
    );

    expect(document.body.textContent ?? "").not.toContain(LEGACY_COPY);

    // The no-data candidate is honest (canonical, never verified) and every
    // other card keeps its verified badge.
    const badges = document.querySelectorAll(".compare-native-governance-badge");
    const noDataSkus = new Set<string>();
    for (const badge of badges) {
      const text = badge.textContent ?? "";
      if (text.includes(CANONICAL_COPY)) {
        expect(text, "no-data badge copy").toBe(CANONICAL_COPY);
        expect(badge.className, "no-data badge class").not.toContain("is-verified");
        const card = badge.closest(
          ".compare-native-option-card, .compare-compact-result__product--wyrestorm",
        );
        noDataSkus.add((card?.textContent ?? "").split("\n")[1]?.trim() || "unknown");
      } else {
        expect(text, "governed badge copy").toContain("Verified governed data");
        expect(badge.className, "governed badge class").toContain("is-verified");
      }
    }
    // Exactly one product has no data in this scenario (it may appear on more
    // than one card surface, e.g. shortlist + evidence panel).
    expect(noDataSkus.size).toBe(1);
  });

  it("no file outside the allowed intentional occurrences can emit the legacy wording", () => {
    const root = process.cwd();
    const offenders: string[] = [];
    for (const scanRoot of SCAN_ROOTS) {
      for (const file of walkFiles(join(root, scanRoot))) {
        const text = readFileSync(file, "utf8");
        if (text.includes(LEGACY_COPY)) {
          offenders.push(relative(root, file).split("\\").join("/"));
        }
      }
    }
    expect(offenders.filter((file) => !ALLOWED_LEGACY_FILES.has(file))).toEqual([]);
  });
});
