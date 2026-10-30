import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { roomTemplates } from "./roomTemplates";
import { templateImageFor } from "./templateImages";

/**
 * The photographs the review found sharing a file, each pair sorted by name. What
 * each one shows, and why sharing it is a miss rather than reuse, is written above
 * the assignment table in `templateApplicationProfiles.ts`; this list is the count.
 */
const SHARED_PHOTOGRAPHS: string[][] = [
  ["photo-control-room.jpg", "photo-security-command.jpg"],
  ["photo-hybrid-teaching.jpg", "photo-school-hall-projector.jpg"],
  ["photo-pub-matrix.jpg", "photo-sportsbar.jpg"],
];

describe("template photos", () => {
  it("uses distinct photos for the four emergency-service recommendations", () => {
    const ids = [
      "government-control-room-networkhd600",
      "government-security-command-nhd100-bridge",
      "government-situation-control-room-nhd600",
      "control-room-security-operations-networkhd600",
    ];
    const images = ids.map((id) => templateImageFor(roomTemplates.find((template) => template.id === id)!));
    expect(new Set(images).size).toBe(ids.length);
    expect(images.every((image) => image.startsWith("/template-photos/"))).toBe(true);
  });

  it("shares no photograph between two keys beyond the three the review records", () => {
    // Reading the files rather than the assignments is deliberate: two keys naming
    // two files is exactly the shape that hides a duplicate, so the bytes are what
    // this asks. Both directions fail: a fourth duplicate, and a known pair that was
    // replaced with distinct art and should therefore leave this list.
    const directory = path.join(process.cwd(), "public", "template-photos");
    const byDigest = new Map<string, string[]>();
    for (const file of readdirSync(directory).filter((name) => /\.(jpe?g|png)$/i.test(name))) {
      const digest = createHash("sha256").update(readFileSync(path.join(directory, file))).digest("hex");
      byDigest.set(digest, [...(byDigest.get(digest) ?? []), file]);
    }

    const shared = [...byDigest.values()]
      .filter((files) => files.length > 1)
      .map((files) => files.sort())
      .sort((a, b) => a[0].localeCompare(b[0]));

    expect(shared).toEqual(SHARED_PHOTOGRAPHS);
  });
});
