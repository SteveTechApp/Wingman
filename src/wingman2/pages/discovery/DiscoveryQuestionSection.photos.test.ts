import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalDiscoveryQuestions } from "./discoveryQuestions";
import { getDiscoveryOptionPhoto } from "./DiscoveryQuestionSection";

function photoFor(questionId: string, value: string): string {
  const question = canonicalDiscoveryQuestions.find((candidate) => candidate.id === questionId);
  const option = question?.options.find((candidate) => candidate.value === value);
  if (!option) throw new Error(`Missing discovery option ${questionId}/${value}`);
  return getDiscoveryOptionPhoto(questionId, value, option.label, option.help ?? "");
}

describe("discovery option photography", () => {
  it("keeps specialist and negative choices visually aligned with their labels", () => {
    expect(photoFor("scale", "single-small-room")).toContain("scale-small-room");
    expect(photoFor("scale", "single-large-room")).toContain("scale-large-room");
    expect(photoFor("scale", "multi-room")).toContain("scale-multi-room");
    expect(photoFor("scale", "building-wide")).toContain("scale-campus");
    expect(photoFor("scale", "unknown-scale")).toContain("scale-unknown");
    expect(photoFor("signal-standard", "4k60-standard")).toContain("projector");
    expect(photoFor("uc-camera-count", "three-four-cameras")).toContain("multicamera");
    expect(photoFor("uc-microphones", "no-microphones")).toContain("boardroom");
    expect(photoFor("wireless-presentation-operation", "wireless-room-routing")).toContain("distributed-video");
    expect(photoFor("video-wall-technology", "projection-canvas")).toContain("projector");
    expect(photoFor("video-wall-technology", "wall-technology-unknown")).toContain("not-sure");
  });

  it("assigns an existing project image to every selectable discovery answer", () => {
    for (const question of canonicalDiscoveryQuestions) {
      for (const option of question.options) {
        const photo = getDiscoveryOptionPhoto(question.id, option.value, option.label, option.help ?? "");
        expect(photo, `${question.id}/${option.value}`).toMatch(/^\/template-photos\/.+\.jpg$/);
        expect(existsSync(resolve(process.cwd(), "public", photo.slice(1))), photo).toBe(true);
      }
    }
  });
});
