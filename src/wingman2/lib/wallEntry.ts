/**
 * How a wall design begins, and what the job is called, said the same way
 * wherever a rep meets the entry.
 *
 * Four surfaces name this job and describe its start — both readings of Home,
 * the Templates page header, and the builder page's own kicker — and each said it
 * differently: the focused entry named a starting preset, the unguided card
 * promised "answer four questions" (the wizard's narrowing step, not the screen
 * the builder opens on), the Templates header named a builder and said nothing
 * about the start, and the page a rep arrived on called itself a third thing. A
 * rep reading any of them is being offered the same job, so the name and the
 * sentence live here rather than being written once per surface and drifting
 * apart again. Add a surface by printing these two strings.
 *
 * Some names for this route stay different on purpose, and each answers a
 * different question rather than restating the entry.
 *
 * The route's manifest `label` prints `WALL_ENTRY_NAME` in the page chrome, so
 * the name a rep followed from Home is still on screen when they arrive. Its
 * `navLabel` keeps the short form (`Video Wall`) the way every route's nav row
 * shortens its page name (`Families` for Product Families, `Compare` for
 * Competitor Compare, `Catalogue` for Catalogue Browser); nothing renders it
 * today, because the wall route is not in `consolidatedPrimaryNavKeys`, and a row
 * added there would want the short form. The guided reading of the builder prints
 * `Guided video wall wizard` because that kicker names the mode the rep is in
 * rather than the job, and it cannot be read beside the expert kicker: each
 * reading renders its own header.
 *
 * Every entry and instruction that points at this page prints its name rather
 * than the page's working name — the sentence form `WALL_ENTRY_SENTENCE_NAME`
 * where the words around it need an article, the bare `WALL_ENTRY_NAME` as a
 * label: a rep who follows one arrives on a page whose chrome says this name, so
 * anything that said `builder` would send them to a differently-named thing. One
 * link into the page keeps its own words, and that is decided rather than left
 * open: Discovery's journey strip says `Open Video Wall`
 * (`features/navigation/featureJourney.ts`) because it names the route the rep
 * moves to, not the page they land on. The strip's rule for the words it gives a
 * destination — the route's own name rather than the manifest `label` the page
 * prints on arrival, and the routes whose two names differ are recorded beside it
 * — lives in that module and is held by its spec, so it is answered there instead
 * of being restated here. Its entry for this page is therefore the route's word
 * and not a second name for the page, which still prints this one in its own
 * chrome; aligning that entry to `WALL_ENTRY_NAME` is the one change
 * `wallEntryInstructions.test.ts` rejects, so the question does not come back as
 * a judgement call each time the strip is edited.
 */

/** What the entry is called. The builder page's expert kicker prints it too. */
export const WALL_ENTRY_NAME = "Video wall designer";

/**
 * The one sentence that says how a design begins: the LED brief or a common
 * wall, then the survey.
 *
 * The guided start step opens on the LED brief — canvas, pitch and cabinet
 * array — because those three are the customer's and a preset answers them
 * already, so that is the beginning a rep meets first; the common walls sit
 * under it for the LCD and projection jobs, which is why the sentence names
 * both rather than the picker alone.
 */
export const WALL_ENTRY_INTRO = "Start from the LED brief or a common wall, then record the survey.";

/**
 * The entry as a sentence names it, where the words around it need an article:
 * `Size the wall in the Video wall designer`, `Open the Video wall designer`.
 *
 * The article lives here rather than at each site so the instruction and the
 * page it opens name one thing; the wall's old working name, `builder`, is not
 * printed anywhere a rep reads.
 */
export const WALL_ENTRY_SENTENCE_NAME = `the ${WALL_ENTRY_NAME}`;
