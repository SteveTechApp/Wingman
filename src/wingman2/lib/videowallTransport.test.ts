import { describe, expect, it } from "vitest";
import { defaultWallRequirements, type WallRequirements } from "./videowallOptions";
import { applyWallTransportFix, wallLinkBandwidthGbps, wallTransportFixLabel, wallTransportPlan, withMeasuredRun, withMeasuredRuns } from "./videowallTransport";

function requirements(overrides: Partial<WallRequirements> = {}): WallRequirements {
  return { ...defaultWallRequirements, ...overrides };
}

describe("wallLinkBandwidthGbps", () => {
  it("returns the uncompressed 24-bit payload for a timing", () => {
    expect(wallLinkBandwidthGbps({ width: 1920, height: 1080 }, 60)).toBe(3);
    expect(wallLinkBandwidthGbps({ width: 3840, height: 2160 }, 60)).toBe(11.9);
    expect(wallLinkBandwidthGbps({ width: 3840, height: 2160 }, 30)).toBe(6);
  });
});

describe("wallTransportPlan for a grouped LCD wall", () => {
  const grouped = (overrides: Partial<WallRequirements> = {}) => requirements({
    application: "lcd-grouped",
    layout: "single",
    columns: 3,
    rows: 3,
    windows: 1,
    sources: 2,
    displayResolution: "4k",
    sourceResolution: "4k60",
    sourceLocation: "local",
    ...overrides,
  });

  it("quotes one head end per feed and loops the rest of each group", () => {
    const plan = wallTransportPlan(grouped({ displayFeeds: 3 }));

    // A panel is either a feed's head end or a hop inside one, so the wall still
    // accounts for every display it has.
    expect(plan.displayCount).toBe(9);
    const feeds = plan.links.filter((link) => link.id.startsWith("feed-"));
    expect(feeds.map((link) => link.id)).toEqual(["feed-1", "feed-2", "feed-3"]);
    expect(feeds.map((link) => link.label)).toEqual([
      "Feed 1 · panels 1–3",
      "Feed 2 · panels 4–6",
      "Feed 3 · panels 7–9",
    ]);
    // The head end carries the programmed feed canvas, not the array total.
    expect(feeds[0].resolution).toBe("3840 × 720 @ 60 Hz");
    const hops = plan.links.filter((link) => link.id.startsWith("display-"));
    expect(hops.map((link) => link.id)).toEqual([
      "display-2", "display-3", "display-5", "display-6", "display-8", "display-9",
    ]);
    expect(hops[0]).toMatchObject({
      label: "Panel 2",
      cable: "HDMI loop-through (panel to panel)",
      resolution: "3840 × 720 @ 60 Hz",
    });
  });

  it("keeps a measured run on the feed it was measured on", () => {
    const plan = wallTransportPlan(grouped({ displayFeeds: 3, measuredRuns: { "feed-2": 30 } }));

    expect(plan.links.find((link) => link.id === "feed-2")!.length).toContain("30 m measured");
    expect(plan.links.find((link) => link.id === "feed-1")!.length).not.toContain("30 m");
  });
});

describe("wallTransportPlan", () => {
  it("estimates a local 1080p wall with every link inside its transport limit", () => {
    const plan = wallTransportPlan(requirements({
      application: "lcd-direct",
      layout: "independent",
      columns: 2,
      rows: 2,
      sources: 4,
      displayResolution: "1080p",
      sourceResolution: "1080p",
      sourceLocation: "local",
      network: "any",
    }));

    expect(plan.sourceCount).toBe(4);
    expect(plan.displayCount).toBe(4);
    expect(plan.headline).toBe("4 source links and 4 display links. Every link fits its transport.");
    expect(plan.counts).toEqual({ ok: 8, watch: 0, limit: 0 });
    expect(plan.flags).toEqual([]);
    expect(plan.links[0]).toMatchObject({
      group: "source",
      label: "Source 1",
      resolution: "1920 × 1080 @ 60 Hz",
      bandwidth: "3.0 Gbps",
      cable: "HDMI 2.0 copper (passive)",
      length: "≈2 m · 15 m passive limit",
      status: "ok",
    });
    expect(plan.links[4]).toMatchObject({
      group: "display",
      label: "Panel 1",
      length: "≈5 m · 15 m passive limit",
      status: "ok",
    });
  });

  it("watches the display runs when 4K60 sits at the passive HDMI limit", () => {
    const plan = wallTransportPlan(requirements({
      application: "lcd-direct",
      layout: "independent",
      columns: 2,
      rows: 2,
      sources: 4,
      displayResolution: "4k",
      sourceResolution: "4k60",
      sourceLocation: "local",
    }));

    expect(plan.counts).toEqual({ ok: 4, watch: 4, limit: 0 });
    expect(plan.headline).toBe("4 source links and 4 display links. 4 need a closer look.");
    expect(plan.links[0]).toMatchObject({ bandwidth: "11.9 Gbps", status: "ok", length: "≈2 m · 5 m passive limit" });
    expect(plan.links[4]).toMatchObject({ status: "watch", length: "≈5 m · 5 m passive limit" });
    expect(plan.flags).toEqual([
      "Panels 1–4 — This run sits at the 5 m passive HDMI limit at this timing; specify an active or fibre cable for headroom.",
    ]);
  });

  it("flags a 1GbE network that cannot carry 4K60 without heavy compression", () => {
    const plan = wallTransportPlan(requirements({
      application: "lcd-direct",
      layout: "independent",
      columns: 2,
      rows: 2,
      sources: 4,
      displayResolution: "4k",
      sourceResolution: "4k60",
      sourceLocation: "distributed",
      network: "1g",
    }));

    expect(plan.counts).toEqual({ ok: 0, watch: 0, limit: 8 });
    expect(plan.headline).toBe("4 source links and 4 display links. 8 exceed a transport limit.");
    expect(plan.links[0]).toMatchObject({
      bandwidth: "11.9 Gbps",
      cable: "Cat6A · 1GbE → encoder",
      length: "≤100 m drop",
      status: "limit",
    });
    expect(plan.links[4]).toMatchObject({
      cable: "Cat6A · 1GbE → decoder + 2 m HDMI",
      length: "≤100 m drop + 2 m HDMI",
      status: "limit",
    });
    expect(plan.flags).toEqual([
      "Sources 1–4 — 1GbE cannot carry 11.9 Gbps without heavy compression; move this link to 10GbE or step the source down.",
      "Panels 1–4 — 1GbE cannot carry 11.9 Gbps without heavy compression; move this link to 10GbE or step the source down.",
    ]);
  });

  it("watches light compression on 10GbE and keeps loop hops inside the HDMI limit", () => {
    const plan = wallTransportPlan(requirements({
      application: "lcd-loop",
      layout: "single",
      columns: 2,
      rows: 2,
      sources: 2,
      displayResolution: "4k",
      sourceResolution: "4k60",
      sourceLocation: "distributed",
      network: "10g",
    }));

    expect(plan.counts).toEqual({ ok: 3, watch: 3, limit: 0 });
    expect(plan.links[0]).toMatchObject({ bandwidth: "11.9 Gbps", status: "watch" });
    expect(plan.links[2]).toMatchObject({
      label: "Panel 1",
      resolution: "3840 × 2160 @ 60 Hz",
      cable: "Cat6A or fibre · 10GbE → decoder + 2 m HDMI",
      status: "watch",
    });
    expect(plan.links[3]).toMatchObject({
      label: "Panel 2",
      cable: "HDMI loop-through (panel to panel)",
      length: "≈3 m per hop · ≈5 m chain · 5 m limit per hop",
      status: "ok",
    });
    expect(plan.links[5]).toMatchObject({ label: "Panel 4", length: "≈3 m per hop · ≈11 m chain · 5 m limit per hop" });
    expect(plan.flags).toHaveLength(2);
  });

  it("treats an LED canvas and a projector as one display link", () => {
    const led = wallTransportPlan(requirements({
      application: "led",
      sources: 1,
      sourceResolution: "4k60",
      ledCanvasWidth: 3840,
      ledCanvasHeight: 1080,
    }));

    expect(led.displayCount).toBe(1);
    expect(led.links[1]).toMatchObject({
      label: "LED processor",
      resolution: "3840 × 1080 @ 60 Hz",
      bandwidth: "6.0 Gbps",
      length: "≈5 m · 15 m passive limit",
      status: "ok",
    });

    const projector = wallTransportPlan(requirements({
      application: "projection",
      sources: 1,
      sourceResolution: "4k60",
      displayResolution: "4k",
    }));

    expect(projector.links[1]).toMatchObject({
      label: "Projector 1",
      bandwidth: "11.9 Gbps",
      status: "watch",
    });
  });

  it("uses the programmed canvas for a looped wall, including a scaled array", () => {
    const plan = wallTransportPlan(requirements({
      application: "lcd-loop",
      layout: "single",
      columns: 2,
      rows: 3,
      sources: 1,
      displayResolution: "4k",
      sourceResolution: "4k60",
      sourceLocation: "local",
    }));

    // The native 7680 × 6480 array is scaled to 2560 × 2160 for one 4K output.
    expect(plan.links[1]).toMatchObject({
      label: "Panel 1",
      resolution: "2560 × 2160 @ 60 Hz",
      bandwidth: "8.0 Gbps",
      status: "ok",
    });
    expect(plan.displayCount).toBe(6);
  });

  it("estimates custom source pixels at the selected timing", () => {
    const plan = wallTransportPlan(requirements({
      application: "lcd-direct",
      layout: "independent",
      sources: 1,
      sourceCustom: true,
      sourceWidth: 2560,
      sourceHeight: 1440,
      sourceResolution: "4k60",
      displayResolution: "1080p",
      sourceLocation: "local",
    }));

    expect(plan.links[0]).toMatchObject({
      resolution: "2560 × 1440 @ 60 Hz",
      bandwidth: "5.3 Gbps",
      status: "ok",
    });
  });

  it("uses fibre extenders when no AV network is allowed", () => {
    const plan = wallTransportPlan(requirements({
      application: "lcd-direct",
      layout: "independent",
      columns: 1,
      rows: 1,
      sources: 1,
      displayResolution: "4k",
      sourceResolution: "4k60",
      sourceLocation: "distributed",
      network: "none",
    }));

    expect(plan.links[0]).toMatchObject({
      cable: "HDMI-to-fibre extender",
      length: "≤300 m",
      status: "ok",
    });
    expect(plan.links[1]).toMatchObject({
      cable: "HDMI-to-fibre extender + 2 m HDMI",
      length: "≤300 m + 2 m HDMI",
      status: "ok",
    });
  });

  it("folds a large array into one grouped display row", () => {
    const plan = wallTransportPlan(requirements({
      application: "lcd-direct",
      layout: "independent",
      columns: 4,
      rows: 4,
      sources: 4,
      displayResolution: "1080p",
      sourceResolution: "1080p",
    }));

    expect(plan.displayCount).toBe(16);
    expect(plan.counts.ok).toBe(20);
    expect(plan.links).toHaveLength(16);
    expect(plan.links.at(-1)).toMatchObject({ label: "Panel 12–16" });
  });

  it("states its assumptions alongside the numbers", () => {
    const plan = wallTransportPlan(requirements());
    expect(plan.assumptions).toHaveLength(3);
    expect(plan.assumptions[0]).toContain("1GbE (0.95 Gbps)");
    expect(plan.assumptions[2]).toContain("5 m at 4K60");
  });
});

describe("measured wall links", () => {
  it("replaces the allowance with a measured run and names the exact over-limit link", () => {
    const plan = wallTransportPlan(requirements({
      application: "lcd-direct",
      layout: "independent",
      columns: 3,
      rows: 1,
      sources: 2,
      displayResolution: "4k",
      sourceResolution: "4k60",
      measuredRuns: { "display-2": 12, "source-1": 3 },
    }));

    expect(plan.links.find((link) => link.label === "Panel 2")).toMatchObject({
      basis: "measured",
      runMetres: 12,
      limitMetres: 5,
      status: "limit",
      length: "12 m measured · 5 m passive limit",
      memberIds: ["display-2"],
    });
    // A measured run inside the limit clears the allowance's watch state.
    expect(plan.links.find((link) => link.label === "Source 1")).toMatchObject({
      basis: "measured",
      status: "ok",
      length: "3 m measured · 5 m passive limit",
    });
    expect(plan.flags).toContain(
      "Panel 2 — The measured 12 m run exceeds the 5 m passive HDMI limit at this timing; use an active cable, fibre or an extender.",
    );
    expect(plan.measuredCount).toBe(2);
    expect(plan.assumptions[1]).toBe("2 of 5 links use a cable run measured on site; the rest are design allowances to confirm.");
  });

  it("flags a measured copper drop that exceeds the 100 m limit", () => {
    const plan = wallTransportPlan(requirements({
      application: "lcd-direct",
      layout: "independent",
      columns: 2,
      rows: 1,
      sources: 1,
      sourceResolution: "1080p",
      displayResolution: "1080p",
      sourceLocation: "distributed",
      network: "1g",
      measuredRuns: { "source-1": 120 },
    }));

    expect(plan.links[0]).toMatchObject({
      label: "Source 1",
      basis: "measured",
      runMetres: 120,
      limitMetres: 100,
      status: "limit",
      length: "120 m measured drop · 100 m copper limit",
    });
    expect(plan.flags[0]).toBe(
      "Source 1 — The measured 120 m drop exceeds the 100 m copper limit; add a fibre segment or an intermediate switch.",
    );
  });

  it("flags a measured fibre run beyond the extender limit", () => {
    const plan = wallTransportPlan(requirements({
      application: "lcd-direct",
      layout: "independent",
      columns: 2,
      rows: 1,
      sources: 1,
      sourceResolution: "1080p",
      displayResolution: "1080p",
      sourceLocation: "distributed",
      network: "none",
      measuredRuns: { "source-1": 320 },
    }));

    expect(plan.links[0]).toMatchObject({ basis: "measured", status: "limit", length: "320 m measured · 300 m fibre limit" });
    expect(plan.flags[0]).toBe(
      "Source 1 — The measured 320 m run exceeds the 300 m fibre extender limit; add a second hop.",
    );
  });

  it("carries a measured loop hop into the chain allowance", () => {
    const plan = wallTransportPlan(requirements({
      application: "lcd-loop",
      layout: "single",
      columns: 2,
      rows: 2,
      sources: 1,
      displayResolution: "4k",
      measuredRuns: { "display-2": 4 },
    }));

    expect(plan.links.find((link) => link.label === "Panel 2")).toMatchObject({
      basis: "measured",
      runMetres: 4,
      length: "4 m measured per hop · ≈9 m chain · 5 m limit per hop",
      status: "ok",
    });
  });

  it("covers every member of a folded row so a group measurement reaches each link", () => {
    const plan = wallTransportPlan(requirements({
      application: "lcd-direct",
      layout: "independent",
      columns: 4,
      rows: 4,
      sources: 1,
      displayResolution: "1080p",
      measuredRuns: { "display-13": 2 },
    }));
    const folded = plan.links.at(-1);

    expect(folded).toMatchObject({ label: "Panel 12–16" });
    expect(folded?.memberIds).toEqual(["display-12", "display-13", "display-14", "display-15", "display-16"]);
    expect(plan.measuredCount).toBe(1);
  });

  it("flags a measured over-limit link inside a folded row by name", () => {
    const plan = wallTransportPlan(requirements({
      application: "lcd-direct",
      layout: "independent",
      columns: 4,
      rows: 4,
      sources: 1,
      displayResolution: "4k",
      measuredRuns: { "display-14": 12 },
    }));
    const folded = plan.links.at(-1);

    // The folded row reports its worst member, and the flag still names the
    // exact measured link rather than the whole range.
    expect(folded).toMatchObject({ label: "Panel 12–16", basis: "measured", runMetres: 12, status: "limit" });
    expect(folded?.memberIds).toContain("display-14");
    expect(plan.flags).toContain(
      "Panel 14 — The measured 12 m run exceeds the 5 m passive HDMI limit at this timing; use an active cable, fibre or an extender.",
    );
    expect(plan.flags.some((flag) => flag.startsWith("Panels 12–16"))).toBe(false);
  });

  it("merges and clears measured runs per link id", () => {
    const first = withMeasuredRun(undefined, "display-1", 8);
    expect(first).toEqual({ "display-1": 8 });
    expect(withMeasuredRun(first, "display-1", 0)).toEqual({});
    expect(withMeasuredRun(first, "display-2", null)).toEqual({ "display-1": 8 });
    expect(withMeasuredRuns(first, ["display-1", "display-2"], 6)).toEqual({ "display-1": 6, "display-2": 6 });
  });
});

it("names the cable change the design can actually make", () => {
  // A passive HDMI overrun becomes a fibre extender, a past-one-span run adds
  // regenerated segments, and an Ethernet link becomes the optical equivalent.
  const plan = wallTransportPlan(requirements({ application: "lcd-direct", sourceLocation: "local", measuredRuns: { "display-1": 9 } }));
  const hdmi = plan.allLinks.find((item) => item.id === "display-1")!;
  expect(wallTransportFixLabel(hdmi)).toBe("Use fibre extender");
  expect(wallTransportFixLabel({ ...hdmi, runMetres: 640 })).toBe("Split into regenerated fibre segments");
  expect(wallTransportFixLabel({ ...hdmi, cable: "Cat6A · 1GbE" })).toBe("Use 10GbE fibre link");
});

it("persists a transport change without shortening the surveyed run", () => {
  const wall = requirements({ application: "lcd-direct", sourceLocation: "local", measuredRuns: { "display-1": 650 } });
  const changed = applyWallTransportFix(wall, "display-1");
  expect(changed.measuredRuns).toEqual(wall.measuredRuns);
  expect(changed.linkTransports?.["display-1"]).toEqual({ cable: "fibre", segments: 3 });
  const link = wallTransportPlan(changed).allLinks.find((item) => item.id === "display-1")!;
  expect(link.status).toBe("ok");
  expect(link.note).toContain("2 powered regeneration points");
  expect(link.runMetres).toBe(650);
  expect(link.length).toContain("900 m total fibre limit across 3 segments");
  expect(link.length).not.toContain("passive limit");
});

it("records the required network equipment upgrade and preserves compression warnings", () => {
  const wall = requirements({ application: "lcd-direct", sourceLocation: "distributed", network: "1g", sourceResolution: "4k60", measuredRuns: { "source-1": 400 } });
  const next = applyWallTransportFix(wall, "source-1");
  const link = wallTransportPlan(next).allLinks.find(item => item.id === "source-1")!;
  expect(link.cable).toContain("10GbE fibre network");
  expect(link.status).toBe("watch");
  expect(link.note).toContain("compatible 10GbE encoders, decoders and optical interfaces");
  expect(link.note).toContain("1 powered regeneration points");
  expect(link.note).toContain("compression");
});
