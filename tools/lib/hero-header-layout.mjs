/**
 * What a hero header owes its children, read from the boxes a browser measured.
 *
 * `measureHeroBoxes` in `browser-smoke-check.mjs` is a `page.evaluate` and cannot be
 * anything else: the numbers only exist in a laid-out page. The rules over those numbers
 * do not need one. They are arithmetic on a box — a child that starts inside its
 * neighbour's column, a row wider than the box that clips it, three buttons at three
 * tops — and they were written inside the walk, which made them unreadable without a
 * dev server, three routes and five widths: the sentences below are the whole of what a
 * failure can say, and a sentence with a number in it can be wrong in a way only a
 * written reading shows.
 *
 * So this module takes the measurement as data and returns the verdict as a sentence or
 * `null`. The walk keeps what needs a page — the selector, the widths it sets, the
 * console summary — and throws what comes back here, which is why the failure text of
 * the two named surfaces and the manifest sweep is identical by construction rather
 * than by three copies agreeing.
 *
 * Two rules, because they answer different questions. `heroContainmentFailure` is what
 * every hero owes its children whichever shape it mounts: the icon, the copy beside it,
 * no child outside the header's content box, and the header itself inside the page host
 * that clips it — a header wider than its host is drawn nowhere, and its children can
 * still all sit neatly inside it, so that reading cannot come from the children. The
 * action row is the third child when a hero has one, and `readHeroActionRow` holds its
 * buttons to one line and the row to a column of its own or a line of its own: the same
 * promise to a rep (three choices, not a stack of words) whether a page's own sheet
 * gives it the third column or the phone layout hands it a full-width line.
 */

/**
 * Where the hero template puts its action row, per width: below 981px a line of its
 * own under the icon and copy, from 981px a third column of its own.
 *
 * 1000px is measured because it is the only width the shared rule covers alone — above
 * 1023px the reference layer's `!important` companion supplies the column and below
 * 981px the row has a line of its own — so a walk at the named breakpoints would not
 * notice the shared rule going missing. The table lives here rather than in the walk
 * because it is half of the promise the action-row rule checks: `thirdColumn` is what
 * `readHeroActionRow` is told to expect at each width.
 */
export const HERO_VIEWPORTS = [
  { width: 360, height: 800, thirdColumn: false },
  { width: 980, height: 800, thirdColumn: false },
  { width: 1000, height: 800, thirdColumn: true },
  { width: 1024, height: 900, thirdColumn: true },
  { width: 1280, height: 900, thirdColumn: true },
];

/**
 * How every hero failure names what it measured: the surface, plus the page route the
 * header was loaded from.
 *
 * A hero that outgrows its page is a defect of one route, so the route is part of every
 * reading and not only of the two about the page host: "lets child 2 leave its own
 * content box" and "stacked the buttons of its action row" name a shape a rep cannot
 * read, and without the route they leave the reader to find which of the app's heroes
 * did it. Settings' and Sales Helper's passes name their surface and used to leave the
 * page to the caller's memory. The manifest sweep already calls each hero by its route —
 * it visits one model of page per address — so the route is appended only where the
 * name does not carry it, rather than printed twice.
 */
export function heroMeasuredOn({ name, route } = {}) {
  const surface = String(name ?? "");
  const on = route && !surface.includes(route) ? ` on ${route}` : "";
  return `${surface} hero${on}`;
}

/** A pair of boxes' horizontal relation: `right` past `left`, in px. */
const past = (box, edge) => Math.max(edge.left - box.left, box.right - edge.right);

/**
 * What every hero owes its children, whichever shape it mounts.
 *
 * The icon and the copy are the pair both shapes share — the icon first, the copy beside
 * it, never under its icon column — and no child may leave the header's own content box.
 * A hero sits inside a page host that clips its own overflow, so a child drawn past the
 * header is a child the rep cannot read.
 *
 * The header is held to that host as well: a child can sit neatly inside its header
 * while the header itself is wider than the box the host draws, which is the shape a
 * max-content column or a `width: min(…)` hero takes when it outgrows its page. The
 * children's reading cannot see that, because it measures them against the header rather
 * than the page, so the header's own box is read against the clipping host's — a header
 * that starts before the host or ends past it fails with both boxes printed, since "the
 * header is too wide" names two of them.
 *
 * The child that leaves the content box is named as one child: the one that runs
 * furthest past it, with how far and which element it is. When several have left, they
 * are named without their boxes and the message says this one is the widest, because a
 * list of boxes is a subtraction the reader has to do before knowing which child to
 * change. Returns `null` when the header holds.
 */
export function heroContainmentFailure(measured, { at, name, route } = {}) {
  const on = heroMeasuredOn({ name, route });
  const [icon, copy] = measured?.children ?? [];
  if (!icon || !copy) {
    return `The ${on} mounts ${measured?.children?.length ?? 0} children at ${at};`
      + " the shared hero shape starts with the icon and the copy.";
  }
  if (copy.left < icon.right - 1) {
    return `The ${on} starts its copy at ${copy.left}px at ${at}, inside the icon column`
      + ` (the icon ends at ${icon.right}px): the hero template puts the copy in the second column.`;
  }
  if (measured.heroScroll > 1) {
    return `The ${on} hides ${measured.heroScroll}px of its own content at ${at} (${measured.template}).`;
  }
  // The header against the page host that clips it. A child can sit neatly inside its
  // header while the header itself is wider than the box the host draws: the readings
  // above say the content fits the header, not that the header fits the page, and the
  // page host is what a rep sees.
  if (!measured.clip) {
    return `The ${on} has no ancestor that clips its overflow at ${at},`
      + " so whether the header is drawn inside the page cannot be read.";
  }
  const pastRight = measured.hero.right - measured.clip.right;
  const pastLeft = measured.clip.left - measured.hero.left;
  if (pastRight > 1 || pastLeft > 1) {
    return `The ${on} is ${measured.hero.width}px wide at ${at} and runs `
      + `${pastRight > 1 ? `${pastRight}px past` : `${pastLeft}px before`} the page host that clips it `
      + `(${measured.clip.node}, ${measured.clip.width}px, ${measured.clip.left}-${measured.clip.right}px): `
      + "a header lays out at the width the page gives it rather than widening the page.";
  }
  // Widest first, and said as one child rather than as a list. A header whose children
  // have all been pushed out is one defect seen several times — the box to change is
  // whichever runs furthest past the content box — so the failure names that child with
  // its own box and overrun, and names the rest without boxes. A row of boxes to compare
  // left the reader to do the subtracting.
  const escaped = measured.children
    .map((child, index) => ({ index, child, past: past(child, measured.content) }))
    .filter((entry) => entry.past > 1)
    .sort((left, right) => right.past - left.past);
  if (escaped.length) {
    const [widest, ...also] = escaped;
    const named = (entry) =>
      `child ${entry.index + 1} (${entry.child.label ? `"${entry.child.label}", ` : ""}${entry.child.node})`;
    return `The ${on} lets ${named(widest)} run ${widest.past}px past its own content box `
      + `(${measured.content.left}-${measured.content.right}px) at ${at}`
      + `${also.length ? `, the widest of ${escaped.length} children that leave it (${also.map(named).join(", ")})` : ""}.`;
  }
  return null;
}

/**
 * The action row's own rules: its buttons on one line inside the header, and the row
 * itself out of the icon column — a third column where the template gives it one, a
 * line of its own where it does not.
 *
 * `expectsColumn` is the per-width contract of the hero whose row this reading was
 * written for: above 981px the row must hold a third column of its own, below it a
 * full-width line under the copy, and the template must count that third column. A hero
 * that is not that one passes the layout-independent half — a third child in a column of
 * its own or on a line of its own, never the strip beside the copy — because what a
 * page's own sheet does with its header is that page's business, while the promise the
 * row makes to a rep is where it lands.
 *
 * Returns `{ present, failure }`: `present` is whether the hero mounts a third child at
 * all, which the caller prints rather than treats as a defect — adding a row to a
 * two-child header is a design decision — and `failure` is the sentence, or `null` when
 * the row holds or there is no row to check.
 */
export function readHeroActionRow(measured, { at, name, route, expectsColumn = null } = {}) {
  const on = heroMeasuredOn({ name, route });
  const row = measured?.children?.[2];
  if (!row) return { present: false, failure: null };
  const copy = measured.children[1];
  if (row.buttons?.length) {
    const tops = row.buttons.map((button) => button.top);
    const tallest = Math.max(...row.buttons.map((button) => button.height));
    // A wrapping row is what a strip too narrow for its buttons produces: three actions
    // read as a stack of words instead of three choices. The height catches a row that
    // wraps its buttons in a container whose own top is unchanged, which the tops alone
    // would read as one line.
    if (Math.max(...tops) - Math.min(...tops) > 1 || row.height > tallest * 1.6 + 2) {
      const where = row.buttons.map((button) => `${button.label} at ${button.top}px`).join(", ");
      return { present: true, failure: `The ${on} stacked the buttons of its action row at ${at}: ${where}.` };
    }
    const escaped = row.buttons
      .filter((button) => button.left < measured.content.left - 1 || button.right > measured.content.right + 1)
      .map((button) => button.label);
    if (escaped.length) {
      return { present: true, failure: `The ${on} ran its action row past the header at ${at}: ${escaped.join(", ")}.` };
    }
  }

  if (expectsColumn === true) {
    if (measured.tracks < 3) {
      return {
        present: true,
        failure: `The ${on} should lay its action row out in a third column at ${at};`
          + ` its template is ${measured.template}.`,
      };
    }
    if (row.left < copy.right - 1) {
      return {
        present: true,
        failure: `The ${on} puts its action row at ${row.left}px at ${at}, where the copy ends at ${copy.right}px:`
          + " a two-column hero hands the third child the icon column.",
      };
    }
    if (row.right > measured.content.right + 1) {
      return {
        present: true,
        failure: `The ${on} runs its action row past the header's own edge at ${at}.`,
      };
    }
  } else if (expectsColumn === false) {
    if (row.top < copy.bottom - 1) {
      return {
        present: true,
        failure: `The ${on} lets its action row share a line with the copy at ${at};`
          + " below 981px it takes a line of its own under it.",
      };
    }
    const contentWidth = measured.content.right - measured.content.left;
    if (row.width < contentWidth - 2) {
      return {
        present: true,
        failure: `The action row of the ${on} is ${row.width}px wide at ${at}, narrower than the header's`
          + ` ${contentWidth}px content box, so it is not on a line of its own.`,
      };
    }
  } else if (!(row.left >= copy.right - 1 || row.top >= copy.bottom - 1)) {
    return {
      present: true,
      failure: `The ${on} puts its third child at ${row.left}px, beside the copy (which ends at ${copy.right}px)`
        + ` and above its foot (${copy.bottom}px), at ${at}: a third child takes a column of its own or a line`
        + " of its own, never the strip beside the copy.",
    };
  }
  return { present: true, failure: null };
}
