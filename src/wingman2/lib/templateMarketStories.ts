/**
 * Market stories for the published room templates.
 *
 * Every template carries a real-world story so the person reviewing it — and
 * later the end customer reading the proposal — can recognise their own
 * application, situation and requirement before any hardware is discussed.
 *
 * The story is authored, not generated: `roomTemplateDeployment.ts` embeds the
 * matching record into the template concept, the template workspace renders it
 * in the Overview tab, and the proposal compiler carries it into the customer
 * document. `templateMarketStories.test.ts` fails if a published template has
 * no complete story.
 *
 * The story records live in three data files split by file-size budget
 * (`templateMarketStories1/2/3.ts`); this module is their single public face.
 */
import { STORY_PART_1 } from "./templateMarketStories1";
import { STORY_PART_2 } from "./templateMarketStories2";
import { STORY_PART_3 } from "./templateMarketStories3";
import { COVERAGE_MARKET_STORIES } from "./templateMarketStoriesCoverage";

export type TemplateMarketStory = {
  /** What the customer asked for, in their own operational language. */
  requirement: string;
  /** The situation today and the trigger for the project. */
  situation: string;
  /** The room's normal day, told as a sequence of moments. */
  roomInUse: string[];
  /** Recognisable outcomes that tell the customer the room works as intended. */
  successLooksLike: string[];
  /** Decisions only the customer can make before the design is fixed. */
  customerDecisions: string[];
};

const STORY_MIN_LENGTH = 40;

/** Reads a stored story back with light validation so custom templates keep it. */
export function readTemplateMarketStory(value: unknown): TemplateMarketStory | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const text = (item: unknown) => (typeof item === "string" ? item.trim() : "");
  const list = (item: unknown) => (Array.isArray(item) ? item.map(text).filter(Boolean) : []);
  const story: TemplateMarketStory = {
    requirement: text(record.requirement),
    situation: text(record.situation),
    roomInUse: list(record.roomInUse),
    successLooksLike: list(record.successLooksLike),
    customerDecisions: list(record.customerDecisions),
  };
  if (story.requirement.length < STORY_MIN_LENGTH || story.situation.length < STORY_MIN_LENGTH) return undefined;
  if (!story.roomInUse.length || !story.successLooksLike.length || !story.customerDecisions.length) return undefined;
  return story;
}

export function getTemplateMarketStory(templateId: string): TemplateMarketStory | undefined {
  return TEMPLATE_MARKET_STORIES[templateId];
}

/** Ids of published templates without a complete story — empty is the contract. */
export function missingTemplateMarketStories(templateIds: string[]): string[] {
  return templateIds.filter((id) => !readTemplateMarketStory(TEMPLATE_MARKET_STORIES[id]));
}

export const TEMPLATE_MARKET_STORIES: Readonly<Record<string, TemplateMarketStory>> = Object.freeze({
  ...STORY_PART_1,
  ...STORY_PART_2,
  ...STORY_PART_3,
  ...COVERAGE_MARKET_STORIES,
});
