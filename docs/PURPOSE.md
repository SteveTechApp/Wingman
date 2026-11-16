# Purpose and scope

The narrative behind the invariants in `AGENTS.md`: what Wingman is for, what
"one process, two depths" means when a rep is in the middle of a sale, and why
the two paths must end in the same record rather than merely on the same page.

## What the tool is for

Wingman supports the sale of WyreStorm equipment by somebody who is not an AV
designer. That sentence is doing real work: the reader is a rep in front of a
customer, and the thing being sold needs a room, a product and a document.

Three jobs follow, and they are the whole product:

1. **Understand the room.** What has to happen in it, who is in it, what it is
   made of, where it is and what market it serves — asked in the customer's own
   words, because the rep is often hearing them for the first time too.
2. **Choose the WyreStorm answer.** The product or design that does what the room
   has to do, with the technical reasons a rep can explain to the customer.
3. **Produce the proposal.** The document, its drawing, its schedule, and the
   words that explain the choice — the artefact that leaves the building.

Anything else in the codebase is support for one of those three. Support is
allowed; it earns its place by making one of the three shorter or more certain.
A surface that none of the three needs is the drift this file exists to name,
because it is not free: it is another thing a rep is expected to learn, another
place a fact can disagree with itself, and another page that has to keep working
while the sale does not.

Sometimes the rep needs one product before there is a room to design. Product
Finder starts from the product function, then follows the questions that
separate eligible product types. It does not require a Discovery brief or a room
type; if the need grows into a room design, the handoff opens Expert Discovery.

Each function owns its follow-up path because the facts that decide fit differ:

- **Video wall / multiview:** how displays should present content, then display
  output scale.
- **Matrix switching:** input/output scale, then independent, mirrored or hybrid
  routing behaviour.
- **Signal extension:** whether the path carries video, USB, both or control/audio,
  then the approximate run distance.
- **Source duplication:** number of displays, then whether all show the same
  source or need independent selection.
- **AV over IP:** endpoint topology, then network bandwidth or latency needs.
- **Camera systems:** USB, HDMI or IP/NDI interface, then fixed, PTZ or
  conferencing/auto-tracking operation.
- **Presentation / BYOD:** wired or wireless connection method, then presenter,
  multiview and room-USB behaviour.
- **Audio:** amplification, processing, distribution or HDMI extraction, then
  analogue, network or embedded transport.
- **USB / KVM:** USB speed/device class, then host and device topology.
- **Control:** controlled equipment, then RS-232, IR/relay or IP interface.
- **Not sure:** the clearest part of the signal path, then any known connection.

Answers remain optional when the rep does not know. A selected answer can improve
ranking only when the governed product record contains matching evidence; a
missing match remains an explicit check rather than a claimed specification.
Explicit processor requirements and output counts are eligibility checks: a
general video-wall feature does not establish an LED processor, and a matrix's
output count must meet the selected display range before it can be recommended.
Connection priorities are a separate step, so an HDMI or USB-C requirement does
not stand in for the actual job the product must perform. The result explains
why it surfaced and what the product record still does not confirm.

A USB connector alone does not show that a product extends or switches USB
devices; that needs product-specific KVM or USB-extension evidence. HDBaseT
identifies a transport method, not the supported cable distance, so a distance
range needs its own product evidence or remains a site check.

Catalogue and Call cards share three different filter readings: product area,
the role the item performs, and the features or connections it supports.
Product areas can overlap; a role describes what the item is. Where the product
record carries structured `productClassification` evidence, both views use its
category and transport facts before searching display text, so a passing mention
in a summary cannot make a product appear under the wrong role or connection.
KVM and exact protocol versions use compact, traceable evidence derived from
governed technical profiles. HDMI and USB cables stay out of general product
results, including accessory-inclusive browsing, until the rep selects Cable,
searches for a cable, or enters its exact SKU.

Product Call Cards and Product Positioning are two depths of one product
workspace. Focused prepares the customer conversation and captures questions;
Expert opens the deeper product, technical, competitor and next-step views.
Both retain the same selected SKU when the rep changes depth.

## Two depths, because two readers arrive

The same rep arrives in two states, and the tool has to meet both without
becoming two products.

A rep who does not know what a divisible boardroom is holds facts: the customer
wants to share a laptop, there are about eight of them, the room is in a hotel.
The focused brief starts from exactly those, and asks only the questions that
separate the room types still possible, so a huddle is decided in two and a
divisible boardroom in three. It ends on a decision, not a bill of materials:
what the room is, what it needs, what a person still has to check on site, what
was assumed, and what would change the answer.

A designer already knows the vocabulary and wants to record the room properly —
sources, routing, audio, conferencing, control, positions, equipment. The expert
workspace gives them the room in sections and lets them capture as much as the
sale needs, in the order they think in.

Depth is the difference, and depth is all it is allowed to be. The designer is
not being rewarded with a longer process; they are being given more places to put
what they already know. The novice is not being handed a toy version of the
record; they are being asked fewer questions and told what each answer bought
them.

## What "the same outcome" means concretely

Both paths are ways of filling one room record, and the outcome is that record,
not the page a rep happened to be on when they finished:

- the room type, in words the customer recognises;
- the requirements, each carrying the answer that asked for it, because a
  requirement without a reason is hard for a rep to explain or validate;
- the checks that still need a site visit;
- the assumptions the decision took for granted;
- what would move the room to a different type;
- and from there the recommendation, and the project that prints the proposal.

A rep who starts in the brief and then opens a section is adding evidence to a
room that is already decided. A designer who starts in the sections and stops
early is leaving the same room with fewer answers. Neither move is a restart, and
neither may strand the record in a shape the other cannot read.

## One decision record, then a proposal draft

Both Discovery depths compile their answers through `compileDiscoveryBrief`,
which resolves the shared `roomBrief.ts` decision and stores it as
`StoredDiscoveryBrief.roomDecision`. The record includes the room type,
requirements with reasons, site checks, assumptions and the answers that would
change the decision. The proposal reads this record together with the detailed
room model, including dimensions, site conditions, equipment schedule and
topology; it does not replace those captured facts with the shorter decision.
Room scale also constrains the archetype, so a large single-screen meeting room
is not mislabeled as a huddle room or given an unrequested second screen.

From Recommendations, “Build AV proposal draft” saves the resolved WyreStorm
roles and refreshes the project's design graph before opening Proposal Builder.
The draft can carry the customer summary, system architecture, selected products
and BOM, room/site facts, assumptions and unresolved checks into the printable
proposal. Unknowns remain visible as checks and readiness items, so the draft is
not represented as a quote-ready or issued proposal until the rep resolves them.

## The test this file exists to answer

For any new surface the question is not "is this useful" — most things are. It
is:

- which of the three jobs does it make shorter or more certain;
- does it add a question that changes the room, the design or the proposal, or is
  it reference the rep can open when it matters;
- if it is a second way to do something, does it write the same record as the
  first, or does it create a reading only it can produce.

A "no" on the third question is the one that costs the most, because it is the
one that turns one product into two.
