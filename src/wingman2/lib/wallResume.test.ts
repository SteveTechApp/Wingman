import { describe, expect, it } from "vitest";
import { routeCatalogByKey } from "../app/routeCatalog";
import { wallResumeProject, wallResumeUrl } from "./wallResume";

describe("wallResumeUrl", () => {
  it("names the project its wall belongs to", () => {
    const url = wallResumeUrl("project-1");

    expect(url).toBe(`${routeCatalogByKey.videowall.path}?project=project-1`);
    // The address reads back as the same project, so the builder and the link
    // cannot disagree about which wall was asked for.
    expect(wallResumeProject(new URLSearchParams(url.split("?")[1] ?? ""))).toBe("project-1");
  });

  it("escapes an id rather than pasting it into the address", () => {
    expect(wallResumeUrl("a b&c")).toBe(`${routeCatalogByKey.videowall.path}?project=a%20b%26c`);
  });

  it("falls back to the plain builder for a wall no project owns yet", () => {
    expect(wallResumeUrl(null)).toBe(routeCatalogByKey.videowall.path);
    expect(wallResumeUrl("  ")).toBe(routeCatalogByKey.videowall.path);
  });

  it("reads no scope out of an address that names none", () => {
    expect(wallResumeProject(new URLSearchParams(""))).toBeNull();
    expect(wallResumeProject(new URLSearchParams("project="))).toBeNull();
  });
});
