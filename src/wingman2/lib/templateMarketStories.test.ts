import { describe, expect, it } from "vitest";
import { compileTemplateApplicationProposal } from "./proposalCompiler";
import { roomTemplates } from "./roomTemplates";
import { getTemplateApplicationProfile } from "./templateApplicationProfiles";
import { getTemplateMarketStory, missingTemplateMarketStories, readTemplateMarketStory } from "./templateMarketStories";

describe("template market stories", () => {
  it("covers every published template", () => {
    expect(missingTemplateMarketStories(roomTemplates.map((template) => template.id))).toEqual([]);
  });

  it("gives every template a substantive, distinct story", () => {
    const requirements = new Set<string>();
    for (const template of roomTemplates) {
      const story = template.story;
      expect(story, template.id).toBeTruthy();
      if (!story) continue;
      expect(story.requirement.length, template.id).toBeGreaterThan(80);
      expect(story.situation.length, template.id).toBeGreaterThan(80);
      expect(story.roomInUse.length, template.id).toBeGreaterThanOrEqual(3);
      expect(story.successLooksLike.length, template.id).toBeGreaterThanOrEqual(3);
      expect(story.customerDecisions.length, template.id).toBeGreaterThanOrEqual(2);
      expect(requirements.has(story.requirement), `duplicate requirement on ${template.id}`).toBe(false);
      requirements.add(story.requirement);
    }
  });

  it("carries the story into the concept, application profile and proposal", () => {
    for (const template of roomTemplates) {
      const story = template.story;
      expect(story, template.id).toBeTruthy();
      if (!story) continue;
      expect(template.concept?.story?.requirement, template.id).toBe(story.requirement);
      expect(template.customerNarrative, template.id).toContain(story.requirement);
      expect(template.customerNarrative, template.id).toContain(template.concept!.statement);
      const profile = getTemplateApplicationProfile(template);
      expect(profile.userJourney, template.id).toContain(story.requirement);
      const proposal = compileTemplateApplicationProposal(template, template.bom);
      expect(proposal.customerNeed, template.id).toBe(story.requirement);
      expect(proposal.userJourney, template.id).toEqual(story.roomInUse);
      expect(proposal.marketStory, template.id).toContain(story.successLooksLike[0]);
      expect(proposal.executiveSummary, template.id).toContain(template.concept!.statement);
    }
  });

  it("reads a stored story back for custom templates and rejects junk", () => {
    const story = getTemplateMarketStory("corporate-huddle-apollo");
    expect(story).toBeTruthy();
    expect(readTemplateMarketStory(story)).toEqual(story);
    expect(readTemplateMarketStory({ requirement: "too short" })).toBeUndefined();
    expect(readTemplateMarketStory(null)).toBeUndefined();
    expect(readTemplateMarketStory({ ...story, roomInUse: [] })).toBeUndefined();
  });
});
