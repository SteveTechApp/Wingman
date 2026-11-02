# Wingman user guide

For sales and pre-sales users of WyreStorm Wingman. It explains what each part of
Wingman is for, the order the work usually happens in, and what a message on
screen is asking you to do.

Wingman helps you move from a customer's words to a defensible room design,
product direction and customer-ready response. It does not replace a survey, a
check against the live site, or your own judgement: anything it says is a
starting point that says what still needs confirming.

This guide is also the in-app **Help** page: open **Help** in the sidebar, or ask
Guru for a section and it will send you to it. Help prints this file, so a
sentence corrected here is corrected for every rep on their next page load.

## Getting in

Wingman runs in the browser at your deployment's address, or locally at
`http://127.0.0.1:3000/wingman` for a development checkout.

Sign in from **Settings → Workspace**. Signed out, Wingman still works and saves
your projects in this browser only. Signed in, projects are stored in the
workspace and shared with your team, and the **Projects** chip reports whether
the store is synced.

Two banners are worth knowing:

- **Offline** means the app is using cached product data. You can keep working,
  but reconnect before you rely on a customer-facing export or a CRM send.
- **A team member changed …** means someone else edited fields on a project you
  have open. Reload the page and review their change before you continue, so the
  two of you are not overwriting each other.

## The shape of the work

Wingman carries one record from the first call to the document that leaves the
building. The stages are:

1. **Capture** what the customer actually needs.
2. **Design** the room or wall, including how the signal gets there.
3. **Choose products** from what WyreStorm can support.
4. **Validate** the assumptions, cable runs and dependencies.
5. **Publish** the response, proposal or quote package.

A project moves through those stages. You can jump back to any earlier one; the
project record keeps what was captured and the response reads it.

## Home

Home offers the six jobs a rep starts from, and continues your recent work:

| Action | What it starts |
| --- | --- |
| **New Opportunity** | A guided requirement capture for a room |
| **Decode Request** | Turning an email, RFQ, BOM or scope into requirements |
| **Compare Products** | A competitor product against the closest WyreStorm direction |
| **Build Response** | A customer response from a project you have captured |
| **My Projects** | Your workspace of saved rooms, drafts and responses |
| **Video wall designer** | A video wall or LED wall design |

Recent projects on Home carry their stage and a **Continue** action that returns
you to the exact place you left. Projects with survey work outstanding are
counted on the Projects entry, so you see that work before opening the list.

## 1. Start with the room, not the catalogue

**Opportunities** is where a room is described. It opens with a room brief, and
that order matters: deciding "which design" before you know what the room has to
do is how a huddle ends up quoted as a boardroom.

The brief asks three facts a customer can answer without any AV vocabulary:

- the market or vertical,
- what the room has to do,
- how many people are in it.

After those, every question is asked because it separates one kind of room from
another, so a huddle is usually decided in two questions and a divisible
boardroom in three. Each question carries the reason it is being asked, and
**Decide with what I have** stops the ladder if you already know enough.

The decision names the room type, what that room needs to do its job, what to
check on site, what is assumed, and what would change the answer. It also tells
you when the answers still fit more than one room type — those are the questions
to ask before anything is priced. A requirement always carries the answer that
asked for it, which is what makes it defensible under price pressure.

**Take this into the discovery brief** opens the full capture starting from the
decided room. If you already know exactly what you want,
**Browse the design library instead** goes straight to Templates, opened on the
market you named.

### Capture modes

Inside the brief you choose how much structure you want:

- **Room builder** — the guided path, one step per part of the room: room and
  people, sources, screens, sound and calls, routing and connections, room
  operation.
- **Detailed questions** — every question Wingman has, grouped into eleven
  sections: room brief, site and construction, sources, displays and outputs,
  video routing, audio, conferencing and USB, control, locations and cabling,
  equipment schedule, and review and validation.
- **Voice interview** — Wingman reads each question aloud and captures spoken
  answers, with the spoken language chosen up front.

Depth is a separate choice: **Essential** asks the core questions plus the
network path where it matters, and **Detailed** asks everything.

### What to do with the answers

- **"Not confirmed" answers are allowed and useful.** They become items to
  confirm rather than silent gaps, and they are what the response lists under
  risks and needs validation.
- **Confidence chips are about the reading, not the quote.** *High confidence*,
  *Matched* and *Low confidence — verify* describe how well an answer or a
  product line was matched. A low-confidence item is a question to ask, not a
  decision to accept.
- **Programme audio is one question with two ends** — where sound leaves the
  video path and where it has to arrive — because a rep answers both ends in one
  conversation and keeping them together stops the halves disagreeing.
- **Review and validation** closes the capture with the assumptions Wingman
  made and the items still to confirm. Read it before you price anything.
- **Site conditions** (walls, ceiling, cable routes, power, lighting and noise,
  access) are free text on purpose: they are your words about this room, not a
  fixed list.

Saving the brief creates or updates a project. Resume it from Home or from
Projects.

## 2. Products and recommendations

- **Products** is the workspace for the catalogue: search by SKU, family or use
  case, review what a product actually does in a system, and open the guidance
  for it.
- **Product Families** explains what a family is for and where it fits.
- **Product Positioning** turns product facts into customer-safe wording.
- **Product Positioning** turns product facts into customer-safe wording, and
  each product there carries **Report a problem** for a fact that looks wrong.
- **Catalogue Browser** filters the range by family, role, technology and
  lifecycle status. A product marked as do-not-spec, or outside the current
  lifecycle, is not offered as a recommendation — that is the gate working, not
  a search miss.
- **Product Call Cards** carry SKU-specific facts, use cases and customer
  wording, and stay available on a phone in the room.
- **Recommendations** shows the products matched from a completed Discovery
  brief, with the evidence behind each match.

Governed products show the evidence they were read from. Where the evidence is
incomplete, Wingman says so rather than filling the gap: put the missing fact on
the list of things to confirm.

## 3. Competitor compare

**Compare** takes a competitor product and answers with the closest WyreStorm
direction, the reasons for it, and what to confirm before the quote.

- The verdict answers before it argues: the signal-path sentence sits under the
  summary of the design it recommends.
- **No match is an answer, not an error.** If nothing in the range fits, Wingman
  says so rather than forcing an equivalent.
- A verdict that is still pending stays visibly pending — it is amber because
  the outcome is unknown, not because it failed.
- **Battle cards**, from the compare route, carry competitor equivalents,
  differentiators and objection handling for a live conversation.
- Comparisons you run are saved on the project, so the reasoning is still there
  when someone asks why you proposed what you did.

## 4. Video wall designer

A wall starts from a wall, not from a room: either the LED brief — canvas
pixels, pixel pitch and cabinet array — or one of the common walls, then the
survey.

- The guided path leads with the LED brief because those three are the
  customer's facts, and a starting point already answers all three.
- The picker filters on the facts its rows print, and every filter value comes
  from the walls themselves, so no filter is a dead end. A count is a floor, not
  an exact match: you are never left looking at a single row.
- **Review passes** are read one at a time — the design, the transport, the
  room — and the save actions belong to the pass that decides them. The pass on
  screen survives a reload and travels in a copied link.
- The verdict names the design it recommends and why the rest do not fit.
- The elevation stands the wall on its mounting height; the transport plan marks
  an over-limit cable run where the cable lands and gives the fix in the table's
  status cell.
- A survey worksheet photo is read as evidence, not applied automatically:
  every usable row arrives with its own confidence and reader note, and only the
  rows you accept change the design. A page the reader could not use is named
  without discarding the rest.
- A saved wall records its owner and its template, so a design can be traced
  back after a project is copied.

## 5. Templates

**Templates** holds room, vertical and application starting points.

A template is a starting point for a *different* room, so its copy describes the
design rather than the room it was measured in, and the customer's own survey
answers never travel with it. Dependency prompts do not travel either: a new
template is scope, not a copy of somebody else's open question.

Opening a template gives you a review page rather than an instant proposal:
confirm the brief, price the scope there, and work through the pre-issue walk.
The walk remembers where you left it.

## 6. Projects and the project record

**Projects** is your workspace. The gallery puts the project you are reading
first; editing a project keeps its place rather than re-ordering the list, and
choosing a project from a link is what brings it to the front.

- Filter to **mine** or your **team**, search by name or owner, and switch the
  survey-attention view to see the rooms that need a survey before they can be
  quoted.
- Each card shows the stage, the owner, the last change, and — where it applies
  — the template it came from and the saved design it carries.
- From a card you can copy a project, start from a template, or delete.
- **Quote safety** is the portfolio view: blocker counts, staleness and
  readiness to quote across every project.

Opening a project shows the record, which is what was captured rather than a
place to edit requirements — the brief is where requirements change. The panels
are:

- the current result and what needs doing next,
- requirements, each marked confirmed, needs review, or not confirmed,
- the captured answers from the discovery conversation,
- equipment, with the products selected and their quantities,
- recommendation evidence, showing why each product is there,
- saved comparisons and response versions,
- the response handoff,
- ready to send, which is the check before anything leaves,
- the evidence trace, which follows a line back to what produced it,
- the audit log.

Each panel has its own address, so you can send a colleague a link to the panel
you mean rather than "scroll down".

## 7. Responses and proposals

**Responses** builds the customer-facing document from the project. It runs in
five steps:

1. **Customer and project** — who it is for and which project it reads.
2. **Requirements review** — what was captured, the assumptions, and anything
   still unresolved.
3. **Proposed solution** — the design, the products, the installation scope.
4. **Commercial and delivery** — pricing and the delivery schedule.
5. **Review and export** — the checks, then the output.

The same document is printed, saved as a PDF, exported to Word, or taken as a
BOM CSV, so the screen, the printout and the Word file cannot disagree about
what the room contains. Every document names the product data it was read from:
the data revision, when the catalogue was assembled, and the build it came from.
If a value is unknown it says `unknown` rather than guessing.

**Some things hold an export, on purpose.** An unfinished wall survey, a cable
run past its allowance, and an unresolved dependency prompt each stop the
document, and each offers its own one-tap fix where you meet it — including on
the project record, because that is where you may be reading rather than
building.

- Answering a dependency prompt records the decision on the project and drops
  the prompt from the bill of materials, while the question stays in the
  document's dependency list.
- An installation rate typed once is saved to a rate card and reused, so the
  next document starts from your rate rather than from the last proposal.

**CRM send** posts the response to the configured endpoint. The send history
records what left the browser and what came back:

- A failed send keeps the exact body it sent and offers **Retry**, which posts
  that same body to whatever endpoint is configured now. A retry that succeeds
  marks the original row as delivered and stops offering the action.
- A row can be dropped individually, and **Clear history** empties the list.
  Both ask first, and both tell you whether any kept bodies go with them.

**Approval Queue** is the review step before a response goes to a customer.
Submit a response for approval, and a reviewer approves it or requests changes
with a comment. An approval arriving from the queue never pulls you away from
the project you are currently reading.

## 8. Learn, glossary and the Guru

- **Learn** holds training and supporting AV knowledge.
- **Glossary** explains AV terms and acronyms in plain English, and product
  terms in the app can be highlighted from your settings.
- **Call Coach** gives live call support: sales prompts, next questions and
  customer conversation guidance.

The **Guru** is the floating assistant available on every page. It knows which
page you are on and what that page is for, so it can help with:

- turning messy customer language into room purpose and signal-path questions,
- explaining what a product does in a system and what to confirm first,
- customer-safe wording, objections and the next discovery question,
- assumptions and missing facts before a quote leaves the building.

Guru answers from the governed product data and will say when something is not
known. It needs the workspace API to answer, so on a disconnected machine treat
it as unavailable rather than authoritative.

## 9. Settings

**Settings** holds your profile and the defaults the documents read:

- company, region, prepared by, default audience, footer text and logo,
- spoken language for the voice interview,
- product update mode, which decides how much catalogue change needs your
  review,
- workspace sign-in and sign-out,
- glossary highlighting,
- solution document defaults.

Set the profile once — the name, footer and logo you set here are what appear on
everything you send.

## When something looks wrong

**"My work disappeared."** Check the Projects chip first. Signed out, the store
is this browser; a different browser or a cleared site data has a different
store. Sign in to keep projects in the workspace.

**"I changed something and it went back."** A team member's change was merged and
the banner asks you to reload. Reload, review their version, then reapply yours
if it is still right.

**"The product I expected is not offered."** Most often it is lifecycle or
governance: a retired or do-not-spec product is held out of recommendations, and
a product without enough evidence is not presented as a recommendation. Check
the lifecycle status in the Catalogue Browser before assuming the catalogue is
missing it.

**"The export is blocked."** Read the message under the button. It names the
thing to fix — the survey, the cable run, the dependency prompt — and offers the
fix. Nothing is blocked without saying what would clear it.

**"A product fact looks wrong."** Every product in Product Positioning carries
**Report a problem**: say what is wrong and what it should say. The report is
saved in this browser the moment you submit it and sent to the product team, and
you can copy it to send however you normally would. Nothing is corrected
immediately — the catalogue stays as governed until the correction is reviewed,
so raise it again if you are blocked before then.

**"Something else is wrong."** Raise it with the team that owns the page, and
include the page address from your browser: the project and panel are named in
the address, which is usually enough to find the exact state you were in.

## Where to go next

- Room templates and their standards: [`ROOM_DESIGN_PACK_STANDARD.md`](./ROOM_DESIGN_PACK_STANDARD.md)
- Video wall detail: [`VIDEO_WALL.md`](./VIDEO_WALL.md)
- Proposal and print behaviour: [`PROPOSAL_OUTPUT.md`](./PROPOSAL_OUTPUT.md)
- Project stages and statuses: [`PROJECT_LIFECYCLE_DICTIONARY.md`](./PROJECT_LIFECYCLE_DICTIONARY.md)
- Competitor compare behaviour: [`COMPARE_FEATURE.md`](./COMPARE_FEATURE.md)
- Survey and site review: [`PROJECT_SURVEY.md`](./PROJECT_SURVEY.md)
