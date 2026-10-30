import { describe, expect, it } from "vitest";
import {
  ROOM_BRIEF_QUESTIONS,
  nextRoomBriefQuestion,
  resolveRoomBrief,
  roomArchetypes,
  roomBriefDiscoveryAnswers,
  setupArchetypes,
  survivingArchetypes,
  type RoomBriefAnswers,
} from "./roomBrief";

/**
 * The ladder, walked by hand: each case is a room a rep arrives with, and what
 * the engine should say before anyone opens the catalogue.
 */

const answer = (entries: Record<string, string>) => entries;

describe("setup", () => {
  it("rules out the room types a purpose cannot be", () => {
    expect(setupArchetypes({ purpose: "campus" })).toEqual(["campus-distribution"]);
    // Teaching is a classroom or a lecture theatre — and a divisible room that
    // teaches, which is why the later questions still have work to do here.
    const teaching = setupArchetypes({ purpose: "teach" });
    expect(teaching).toEqual(expect.arrayContaining(["classroom", "lecture-capture"]));
    expect(teaching).not.toContain("signage-wall");
    // A purpose nobody has used yet must not empty the list.
    expect(setupArchetypes({ purpose: "" }).length).toBe(roomArchetypes().length);
  });
});

describe("question choice", () => {
  it("asks what divides the remaining rooms most evenly, not what comes first", () => {
    // Seven genres of room are still possible, and `reach` splits them 2/3
    // while `far-end` — first in the list — splits them 1/5.
    const next = nextRoomBriefQuestion(answer({ purpose: "show-many" }));
    expect(next?.id).toBe("reach");
  });

  it("does not re-ask a question it has an answer to", () => {
    const first = nextRoomBriefQuestion(answer({ purpose: "show-many" }));
    const next = nextRoomBriefQuestion(answer({ purpose: "show-many", [first!.id]: "yes" }));
    expect(next?.id).not.toBe(first!.id);
  });

  it("stops asking once one room is left", () => {
    expect(nextRoomBriefQuestion(answer({ purpose: "campus" }))).toBeNull();
  });

  it("stops rather than guessing between rooms no question separates", () => {
    // With every question answered, nothing is left to ask.
    const all: Record<string, string> = { purpose: "show-many" };
    for (const question of ROOM_BRIEF_QUESTIONS) all[question.id] = question.options[question.options.length - 1].value;
    expect(nextRoomBriefQuestion(all)).toBeNull();
  });
});

/**
 * The shortest answer path that keeps one room type alive: the purpose it is
 * built for, then the first option each later question offers that supports it.
 * This is the path a rep would actually walk, so a room the engine can no longer
 * reach fails here rather than in a hand-written fixture that has drifted.
 */
function pathTo(archetypeId: string): Record<string, string> {
  const purposes = ["present", "meet", "teach", "show-many", "address-crowd", "signage", "campus"];
  const answers: Record<string, string> = {
    occupancy: "medium",
    purpose: purposes.find((purpose) => setupArchetypes({ purpose }).includes(archetypeId as never)) ?? "",
  };
  for (const question of ROOM_BRIEF_QUESTIONS) {
    if (!survivingArchetypes(answers).includes(archetypeId as never)) break;
    const option = question.options.find((candidate) => candidate.supports.includes(archetypeId as never));
    if (option) answers[question.id] = option.value;
  }
  return answers;
}

describe("the decision", () => {
  it("decides a huddle in two questions", () => {
    const decision = resolveRoomBrief(
      answer({ market: "Corporate", purpose: "present", occupancy: "squad", "far-end": "sometimes", screens: "same" }),
      "Corporate",
    );
    expect(decision.archetype).toBe("huddle-byod");
    expect(decision.roomType).toContain("Huddle");
    expect(decision.questionsAsked).toBe(2);
    expect(decision.market).toBe("Corporate");
    expect(decision.unresolved).toEqual([]);
  });

  it("decides a divisible boardroom and gives it two screens per side", () => {
    const decision = resolveRoomBrief(answer({ purpose: "present", occupancy: "medium", "far-end": "yes", partition: "yes" }));
    expect(decision.archetype).toBe("divisible-boardroom");
    const display = decision.requirements.find((requirement) => requirement.key === "display");
    expect(display?.quantity).toBe("four displays, two per side");
  });

  it("separates a teaching room from a lecture theatre by whether sessions are captured", () => {
    const base = { purpose: "teach", occupancy: "medium", "far-end": "yes", partition: "no" };
    expect(resolveRoomBrief({ ...base, record: "no" }).archetype).toBe("classroom");
    expect(resolveRoomBrief({ ...base, record: "yes" }).archetype).toBe("lecture-capture");
  });

  it("separates a venue from a control room by who works the room", () => {
    // Both watch several things at once and both take content from elsewhere;
    // the difference is a desk with an operator on it.
    const base = { purpose: "show-many", occupancy: "crowd", reach: "yes" };
    expect(resolveRoomBrief({ ...base, operated: "staffed" }).archetype).toBe("control-room");
    expect(resolveRoomBrief({ ...base, operated: "anyone" }).archetype).toBe("venue");
  });

  it("separates a signage wall from a venue by whether people stay in the space", () => {
    const base = { purpose: "signage", occupancy: "small" };
    expect(resolveRoomBrief({ ...base, dwell: "pass" }).archetype).toBe("signage-wall");
    expect(resolveRoomBrief({ ...base, dwell: "stay" }).archetype).toBe("venue");
  });

  it("never empties the rooms on contradictory answers, and says what is left", () => {
    // A partition, and one presenter addressing everyone: no single room type
    // claims both, so the later answer wins and the earlier one is dropped.
    const surviving = survivingArchetypes(answer({ purpose: "present", partition: "yes", audience: "yes" }));
    expect(surviving.length).toBeGreaterThan(0);
  });
});

/**
 * How long the ladder is, as the surface walks it.
 *
 * The claim these pin is the one `AGENTS.md` and `docs/DISCOVERY.md` make: a
 * huddle is decided in two questions and a divisible boardroom in three, not
 * twelve. A count alone would not catch a reordering — the same two questions
 * asked the other way round is a different brief — so each case pins the
 * questions in the order the engine asks them, and the room they decide.
 */
describe("the ladder's length", () => {
  /** Ask the way the surface does, and answer only what was asked. */
  const walk = (seed: RoomBriefAnswers, says: Record<string, string>) => {
    const answers: RoomBriefAnswers = { ...seed };
    const asked: string[] = [];
    for (;;) {
      const question = nextRoomBriefQuestion(answers);
      if (!question) return { answers, asked };
      const value = says[question.id];
      // A room the table has no answer for is a case that fell behind the ladder,
      // not a ladder that failed, so it says so rather than looping.
      if (!value) throw new Error(`\`${question.id}\` was asked, and this case has no answer for it.`);
      answers[question.id] = value;
      asked.push(question.id);
    }
  };

  // Typed, because a room says only the answers it has: a tuple of literals
  // unifies their shapes and makes the missing keys `undefined`.
  type Walk = {
    room: string;
    seed: RoomBriefAnswers;
    says: Record<string, string>;
    asks: string[];
    lands: string;
  };

  const walks: Walk[] = [
    {
      room: "a huddle",
      seed: { purpose: "present", occupancy: "squad" },
      says: { screens: "same", "far-end": "sometimes" },
      asks: ["screens", "far-end"],
      lands: "huddle-byod",
    },
    {
      room: "a divisible boardroom",
      seed: { purpose: "present", occupancy: "medium" },
      says: { screens: "different", "far-end": "yes", partition: "yes" },
      asks: ["screens", "far-end", "partition"],
      lands: "divisible-boardroom",
    },
    {
      room: "a teaching room",
      seed: { purpose: "teach", occupancy: "medium" },
      says: { partition: "no", "far-end": "no" },
      asks: ["partition", "far-end"],
      lands: "classroom",
    },
    {
      room: "a control room",
      seed: { purpose: "show-many", occupancy: "medium" },
      says: { reach: "yes", "far-end": "yes" },
      asks: ["reach", "far-end"],
      lands: "control-room",
    },
    {
      room: "a hospitality venue",
      seed: { purpose: "signage", occupancy: "large" },
      says: { screens: "different", reach: "yes" },
      asks: ["screens", "reach"],
      lands: "venue",
    },
  ];

  it.each(walks)("decides $room in the questions the ladder asks, and lands on it", ({ seed, says, asks, lands }) => {
    const { answers, asked } = walk(seed, says);
    expect(asked).toEqual(asks);

    const decision = resolveRoomBrief(answers);
    expect(decision.archetype).toBe(lands);
    // A room is decided, not merely narrowed: nothing is left for a rep to ask.
    expect(decision.unresolved).toEqual([]);
    // Whichever room it is, the ladder is short — that is the whole method.
    expect(asked.length).toBeLessThanOrEqual(3);
  });
});

describe("what the room needs", () => {
  it("gives every requirement a reason a rep can defend", () => {
    for (const archetype of roomArchetypes()) {
      // Resolved through its own path rather than by id, so a room that stopped
      // being reachable fails here rather than passing on a field nobody reads.
      const decision = resolveRoomBrief(pathTo(archetype.id));
      expect(decision.archetype).toBe(archetype.id);
      expect(decision.requirements.length).toBeGreaterThan(0);
      for (const requirement of decision.requirements) {
        expect(requirement.because.length).toBeGreaterThan(30);
        expect(requirement.quantity.length).toBeGreaterThan(0);
      }
    }
  });

  it("sizes a teaching room's display by the back row, not by the wall", () => {
    const small = resolveRoomBrief(answer({ purpose: "teach", occupancy: "small", "far-end": "no", record: "no" }));
    const crowd = resolveRoomBrief(answer({ purpose: "teach", occupancy: "crowd", "far-end": "no", record: "no" }));
    const quantity = (decision: typeof small) => decision.requirements.find((r) => r.key === "display")?.quantity;
    expect(quantity(small)).toContain("five to ten");
    expect(quantity(crowd)).toContain("more than fifty");
  });

  it("adds conferencing only when someone is joining from elsewhere", () => {
    const joined = resolveRoomBrief(answer({ purpose: "present", occupancy: "squad", "far-end": "yes", screens: "same" }));
    const alone = resolveRoomBrief(answer({ purpose: "present", occupancy: "squad", "far-end": "no" }));
    expect(joined.requirements.some((requirement) => requirement.key === "uc")).toBe(true);
    expect(alone.requirements.some((requirement) => requirement.key === "uc")).toBe(false);
  });

  it("names what to check on site and what would change the answer", () => {
    const decision = resolveRoomBrief(answer({ purpose: "present", occupancy: "squad", "far-end": "sometimes", screens: "same" }));
    expect(decision.verifyOnSite.length).toBeGreaterThan(1);
    expect(decision.changesIf.length).toBeGreaterThan(0);
    expect(decision.assumptions.length).toBeGreaterThan(0);
  });
});

describe("handing off", () => {
  it("writes discovery answers the capture steps already read", () => {
    const decision = resolveRoomBrief(answer({ purpose: "present", occupancy: "squad", "far-end": "sometimes", screens: "same" }));
    const answers = roomBriefDiscoveryAnswers(decision);
    expect(answers.opportunity).toBe("meeting-room");
    // The huddle's single display, as a count the display step can consume.
    expect(answers.displays).toBe("1");
  });

  it("sends a signage wall to the video-wall application and a campus to distributed video", () => {
    expect(roomBriefDiscoveryAnswers(resolveRoomBrief(answer({ purpose: "signage", reach: "no", dwell: "pass" }))).opportunity)
      .toBe("video-wall");
    expect(roomBriefDiscoveryAnswers(resolveRoomBrief(answer({ purpose: "campus" }))).opportunity)
      .toBe("av-over-ip");
  });
});

describe("reachability", () => {
  it("can decide every room type it names", () => {
    for (const archetype of roomArchetypes()) {
      const answers = pathTo(archetype.id);
      expect(survivingArchetypes(answers)).toContain(archetype.id);
    }
  });
});
