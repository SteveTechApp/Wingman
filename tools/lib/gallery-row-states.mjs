/**
 * The gallery card's row states, and the widths the walk measures them at.
 *
 * `assertGalleryCardActions` in `tools/browser-smoke-check.mjs` reads this file
 * for everything it seeds and every width it measures, and the action row's rule
 * in `wingman-polish-navigation.css` names this list rather than describing the
 * shapes in prose of its own — so a sixth row shape is an entry here, seeded,
 * measured and printed without a second block in the walk or a paragraph in the
 * stylesheet. That is why the data is not in the walk: the walk is the seeding
 * and the measuring, and the list is what the two agree about.
 *
 * The invariants the pass relies on are held by `gallery-row-states.test.mjs`,
 * because they are the part a green walk cannot read: one state carries the
 * banner, one state is the short name that shares the pair's line, a state with
 * no designs brings the room it needs, and a width's column count is declared
 * once and every count change sits between adjacent widths. A shape added here
 * that breaks one of those fails the spec instead of quietly changing what the
 * walk proves.
 */

/**
 * Several long-named designs saved from one room, which is what the gallery
 * card's action row has to hold: three names longer than the column the card
 * sits in at every width this check measures.
 */
export const GALLERY_TEMPLATE_NAMES = [
  "Northbridge Meeting Room Refresh — standard Teams room with dual 86 in displays",
  "Northbridge Meeting Room Refresh — east wing boardroom variant with ceiling microphones and Dante audio",
  "Northbridge Meeting Room Refresh — huddle room starter with single display and USB-C table connection",
];

export const GALLERY_TEMPLATE_KEY = "wingman-custom-room-templates-v1";

/** The room the designs were saved from, and the room the conflict lands on. */
export const GALLERY_ROOM_ID = "northbridge-meeting-room-refresh";
export const GALLERY_ROOM_NAME = "Northbridge Meeting Room Refresh";

/**
 * The project a rep has created and not yet saved a design from — the row the
 * gallery shows first in any new workspace, and the one state the store has to
 * supply rather than the page.
 *
 * Written into the project store rather than saved through the page, because by
 * the time this pass runs every starter example it can reach has a design: a card
 * with nothing to open is a state only the store can show.
 */
export const NO_DESIGN_PROJECT = {
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
export const TWO_SHORT_DESIGN_PROJECT = {
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
 * this list, instead of in the check and the stylesheet separately, which is how
 * the two came to describe the same row in different words.
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
export const GALLERY_ROW_STATES = [
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
    //
    // They carry a room and a display size too, which is the one thing this row
    // owes the floor rather than its own wrap: a name of `Kingsway Training 75 in`
    // is 23 characters and a card prints all 23 of them at every width, so the
    // tightest reading the gallery pass reported was that fixture's length and not
    // any column's. At 34 characters the entry is clipped on the narrow cards, so
    // the count beside the narrowest one is what a column agreed to show.
    key: "two-short",
    roomId: TWO_SHORT_DESIGN_PROJECT.id,
    room: TWO_SHORT_DESIGN_PROJECT.name,
    designs: ["Kingsway Training 75 in wall display", "Kingsway Training 86 in wall display"],
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
export const GALLERY_CARD_VIEWPORTS = [
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

/**
 * Three lanes, because the card folds the rest: the banner prints two lane
 * labels and "+1 more", which is the longest form of it a rep ever sees.
 */
export const GALLERY_CONFLICT_FIELDS = ["proposal", "requirements", "videowall"];
