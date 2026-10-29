import { describe, expect, it } from "vitest";
import { readRecentStripPick } from "./recent-strip-pick.mjs";

/**
 * The recent strip's card pick, held against card lists written for each shape.
 *
 * The walk proves the pick on this tree, which is the tree that keeps it green while it
 * changes meaning: the seed leaves the store in the order the strip prints, so a check
 * that stopped asking whether the cards were the seeded rooms — or that read the store's
 * slice instead of the page — would pass on this checkout and measure whatever another
 * room's cards held. These specs hand in the lists instead, one shape each: the seeded
 * three, the same three in another order, a room the pass never seeded, a card with no
 * survey flag to identify it, one room printed twice, and a strip that printed too few
 * cards.
 */

const NORTHBRIDGE = { id: "northbridge-meeting-room-refresh", name: "Northbridge Meeting Room Refresh" };
const HARBOUR = { id: "harbour-retail-signage-rollout", name: "Harbour Retail Signage Rollout" };
const WESTBROOK = { id: "westbrook-classroom-standard", name: "Westbrook Classroom Standard" };

const SEEDED = [NORTHBRIDGE, HARBOUR, WESTBROOK];

/** A card as the page prints it: the room its survey flag names, under its own text. */
const card = (room, name = `A card for ${room.name}`) => ({ room: room.id, name });

const pick = (cards, seeded = SEEDED) => readRecentStripPick({ cards, seeded });

describe("readRecentStripPick", () => {
  it("accepts the seeded three, in the order it seeded them", () => {
    const reading = pick(SEEDED.map((room) => card(room)));

    expect(reading.ok).toBe(true);
    expect(reading.pickedRooms).toEqual([NORTHBRIDGE.id, HARBOUR.id, WESTBROOK.id]);
    expect(reading.strays).toEqual([]);
    expect(reading.repeated).toBe(false);
    expect(reading.countMatches).toBe(true);
  });

  it("accepts the same three rooms printed in another order", () => {
    // Order is not the promise: the strip prints the store's first three, and a store
    // ordered another way is a pick this pass can still measure, because every reading
    // below follows the cards' own text rather than this list's.
    const reading = pick([card(WESTBROOK), card(NORTHBRIDGE), card(HARBOUR)]);

    expect(reading.ok).toBe(true);
    // The rooms come back in page order, which is the order the walk measures in.
    expect(reading.pickedRooms).toEqual([WESTBROOK.id, NORTHBRIDGE.id, HARBOUR.id]);
  });

  it("rejects a room the pass never seeded, and names the card", () => {
    const stranger = { id: "riverside-briefing-room-fitout", name: "Riverside Briefing Room Fitout" };
    const reading = pick([card(NORTHBRIDGE), card(stranger), card(WESTBROOK)]);

    expect(reading.ok).toBe(false);
    expect(reading.strays).toHaveLength(1);
    expect(reading.strays[0].room).toBe(stranger.id);
    expect(reading.strays[0].name).toBe(`A card for ${stranger.name}`);
    // Three cards against three seeded, so the count is not what failed.
    expect(reading.countMatches).toBe(true);
    expect(reading.repeated).toBe(false);
  });

  it("treats a card with no survey flag as unidentified, not as a repeated room", () => {
    // The defect this pins: two cards the pass cannot identify read as one room printed
    // twice, which sent a reader looking for a duplicate the list did not have.
    const reading = pick([
      card(NORTHBRIDGE),
      { room: null, name: "Riverside Briefing Room Fitout" },
      { room: null, name: "Kingsway Training Room Refresh" },
    ]);

    expect(reading.ok).toBe(false);
    expect(reading.strays).toHaveLength(2);
    expect(reading.strays.map((stray) => stray.name)).toEqual([
      "Riverside Briefing Room Fitout",
      "Kingsway Training Room Refresh",
    ]);
    expect(reading.repeated).toBe(false);
    expect(reading.countMatches).toBe(true);
  });

  it("rejects a seeded room printed twice, even when the count matches", () => {
    // Three cards, three seeded rooms, nothing unseeded — and still not the seeded
    // three, which only the duplicate check can see.
    const reading = pick([card(NORTHBRIDGE), card(NORTHBRIDGE), card(HARBOUR)]);

    expect(reading.ok).toBe(false);
    expect(reading.strays).toEqual([]);
    expect(reading.repeated).toBe(true);
    expect(reading.countMatches).toBe(true);
  });

  it("rejects a strip that printed fewer cards, and says the count is what failed", () => {
    const reading = pick([card(NORTHBRIDGE), card(HARBOUR)]);

    expect(reading.ok).toBe(false);
    expect(reading.countMatches).toBe(false);
    // Nothing is unseeded and nothing is duplicated: the card is simply missing.
    expect(reading.strays).toEqual([]);
    expect(reading.repeated).toBe(false);
  });

  it("rejects a strip that printed more cards than the pass seeded", () => {
    const reading = pick([
      card(NORTHBRIDGE),
      card(HARBOUR),
      card(WESTBROOK),
      { room: "riverside-briefing-room-fitout", name: "Riverside Briefing Room Fitout" },
    ]);

    expect(reading.ok).toBe(false);
    expect(reading.countMatches).toBe(false);
    expect(reading.strays).toHaveLength(1);
  });

  it("rejects a strip that printed nothing, which is a count with no cards in it", () => {
    const reading = pick([]);

    expect(reading.ok).toBe(false);
    expect(reading.pickedRooms).toEqual([]);
    expect(reading.countMatches).toBe(false);
  });

  it("reads the room from the survey flag, not from the card's text", () => {
    // The name only words a failure: a card whose room is right is a member even if the
    // text it prints has been renamed, and one whose text matches but whose flag names
    // another room is not.
    const renamed = pick([
      { room: NORTHBRIDGE.id, name: "Renamed room" },
      card(HARBOUR),
      card(WESTBROOK),
    ]);
    expect(renamed.ok).toBe(true);

    const mismatched = pick([
      { room: "riverside-briefing-room-fitout", name: NORTHBRIDGE.name },
      card(HARBOUR),
      card(WESTBROOK),
    ]);
    expect(mismatched.ok).toBe(false);
    expect(mismatched.strays).toHaveLength(1);
  });

  it("is not fooled by an id that merely starts with a seeded one", () => {
    const reading = pick([
      { room: `${NORTHBRIDGE.id}-copy`, name: "Copy of the boardroom" },
      card(HARBOUR),
      card(WESTBROOK),
    ]);

    expect(reading.ok).toBe(false);
    expect(reading.strays).toHaveLength(1);
  });
});
