# WINGMAN DEVELOPMENT PASS
## Product Data Manager + Governed Product Truth Layer

You are working inside the existing WyreStorm Wingman React / TypeScript
application.

Do not rebuild the application from scratch.

Inspect the repository before changing anything.

Preserve:
- existing routes;
- current Discovery workflow;
- Product Finder;
- Compare;
- Product Pitch / Call Cards;
- Templates;
- Projects;
- Proposal;
- Guru;
- current shared styling/design system;
- existing product datasets and loaders;
- current validation scripts.

The purpose of this development pass is to improve DATA GOVERNANCE,
not create another disconnected database.

===============================================================
PRIMARY OBJECTIVE
===============================================================

Create an Admin-facing Product Data Manager which edits or manages the
same structured product information consumed by Wingman's recommendation
and comparison systems.

Wingman must move towards a governed "product truth" model.

Do NOT create an isolated mock product list which Finder and Compare do
not use.

First inspect the existing product data architecture and determine:

1. where WyreStorm products are stored;
2. where competitor products are stored;
3. what normalisation currently occurs;
4. how Finder obtains products;
5. how Compare obtains products;
6. how product intelligence obtains products;
7. what persistence mechanism currently exists;
8. whether an API/backend/storage service already exists.

Reuse the current architecture wherever practical.

===============================================================
A. STRUCTURED PRODUCT TRUTH MODEL
===============================================================

Introduce or extend a strongly typed product specification model.

It must support, where data exists:

IDENTITY
- sku
- name
- manufacturer
- product family
- product category
- product role
- description

VIDEO INPUT
- video input connector/type
- video input quantity

VIDEO OUTPUT
- video output connector/type
- routed/switched output quantity
- mirrored HDMI output quantity
- HDBaseT output quantity where applicable
- local monitor/loop output quantity where applicable

VIDEO CAPABILITY
- maximum resolution
- maximum frame rate
- chroma capability
- HDR capability where known
- scaling
- multiview
- video wall capability

USB
- USB supported
- USB version
- USB host/device behaviour
- KVM capability where known

AUDIO
- embedded audio
- audio embedding
- audio de-embedding
- analogue audio
- Dante capability

TRANSPORT / NETWORK
- HDBaseT
- AV-over-IP
- NetworkHD family where relevant
- bandwidth / network class
- 1G / 10G distinction where known

CONTROL
- IP
- RS-232
- IR
- CEC or other existing known fields

DEPENDENCIES
- required dependencies
- compatible accessories
- required controller
- required receiver/base device
- compatibility notes

LIFECYCLE / GOVERNANCE
- lifecycle/status
- data confidence
- source/reference
- last verified date
- verification notes
- data quality flags

Do not invent specification values.

Unknown values must remain unknown/null rather than being inferred
confidently from marketing copy.

===============================================================
B. IMPORTANT PRODUCT RULES
===============================================================

Preserve or enforce these existing Wingman principles:

1. Multiple HDMI outputs do NOT automatically mean multiview.

2. Routed/switched outputs must remain separate from:
   - mirrored HDMI outputs;
   - local monitor outputs;
   - HDBaseT outputs;
   - loop outputs.

3. Multiview means multiple sources shown simultaneously on one output
   canvas.

4. NetworkHD 100, 500 and 600 must remain distinct technologies.

5. NetworkHD systems should expose their controller dependency where
   applicable.

6. APO-DG2 must not be treated as a complete standalone wireless
   presentation system. It requires a compatible receiver/base device,
   such as compatible "-W" presentation products.

7. Accessories, cables, screens, furniture, racks and generic support
   products must not become lead AV architecture recommendations.

8. Unknown specifications must not be upgraded because descriptive text
   contains ambiguous numbers.

===============================================================
C. ADMIN PRODUCT DATA MANAGER
===============================================================

Add an Admin Product Data Manager using Wingman's existing page shell and
design language.

Do NOT introduce a visually disconnected admin application.

Required capabilities:

1. Search products by:
   - SKU
   - product name
   - manufacturer
   - family

2. Filter by:
   - manufacturer
   - category
   - family
   - lifecycle
   - verification/data-confidence status

3. Product list/table should make it easy to identify:
   - SKU
   - product name
   - manufacturer
   - family/category
   - lifecycle
   - data confidence
   - last verified
   - incomplete/questionable records

4. Selecting a product opens an editor.

5. Editor should group fields logically:

   Identity
   Video I/O
   Video capabilities
   USB
   Audio
   Network / transport
   Control
   Dependencies
   Compatibility
   Governance / verification

6. Allow supported fields to be edited.

7. Required visual actions:

   Save
   Cancel
   Mark for review
   Mark verified

8. Clearly show unsaved changes.

9. Clearly show source/reference information.

10. Display warnings for incomplete critical AV fields.

11. Do not present unknown fields as zero/false unless zero/false is
    actually verified.

===============================================================
D. DATA QUALITY VIEW
===============================================================

Add a compact Data Quality view or summary area.

Show counts where practical for:

- records missing maximum video capability;
- records missing I/O topology;
- records missing product family/category;
- records requiring review;
- records with low confidence;
- records never verified;
- discontinued products;
- competitor records lacking equivalence review.

Clicking a quality issue should filter the Product Data Manager where
practical.

===============================================================
E. COMPETITOR EQUIVALENCE MODEL
===============================================================

Create or extend a typed competitor equivalence record.

Statuses:

- verified-equivalent
- closest-alternative
- application-alternative
- no-direct-equivalent
- requires-presales-review

The data model should be capable of storing:

- competitor manufacturer
- competitor SKU
- WyreStorm candidate SKU
- equivalence status
- evidence/notes
- reviewer
- verification date
- confidence

Do NOT automatically claim direct equivalence merely because products
have similar text or port counts.

If Compare already has equivalent structures, extend them instead of
duplicating them.

===============================================================
F. DISCOVERY EVIDENCE FOUNDATION
===============================================================

Do NOT redesign Discovery in this pass.

However, introduce or extend a shared structured evidence type that can
eventually store:

- application
- room type
- room size
- customer wording
- sources
- source locations
- source connections
- displays
- display locations
- resolution
- distances
- USB requirement
- UC requirement
- camera requirement
- microphone requirement
- audio requirement
- network requirement
- control requirement
- processing requirement
- video wall requirement
- assumptions
- missing information
- blockers
- next best question
- likely architecture

The objective is to create a reusable evidence contract so future work
does not require Finder, Proposal, Compare and Project Detail to interpret
Discovery independently.

Do not break existing Discovery persistence.

===============================================================
G. PROJECT EVIDENCE FOUNDATION
===============================================================

Inspect the existing Project / Project Detail model.

Where safe, add types/interfaces needed to eventually support:

- discovery evidence
- requirements
- architecture direction
- product recommendations
- comparison records
- saved product pitches
- diagrams
- BOM
- proposal history
- assumptions
- risks
- missing information
- next actions
- readiness/confidence

Do not attempt a complete Project Detail redesign in this pass.

===============================================================
H. SCENARIO TEST FOUNDATION
===============================================================

Create a proper scenario-validation structure rather than relying only
on marker/string tests.

Add scenario definitions for:

1. Small Teams/BYOD boardroom
2. Medium corporate meeting room
3. University teaching room
4. Lecture theatre
5. Sports bar
6. Hotel function room
7. LCD video wall
8. LED video wall
9. NetworkHD 100 distribution
10. NetworkHD 500 KVM
11. NetworkHD 600 high-performance deployment
12. NDI camera workflow
13. Simple HDBaseT extension
14. Competitor matrix replacement
15. Competitor AVoIP replacement

For this pass, implement the reusable scenario schema/harness and convert
as many scenarios into executable tests as can be done reliably using
the existing recommendation APIs.

Each scenario should be capable of asserting:

- expected architecture;
- expected product family;
- allowed lead products;
- forbidden lead products;
- required dependencies;
- missing information;
- quote safety/review state.

Do not fake passing tests with string markers.

===============================================================
I. UI / UX RULES
===============================================================

Use the existing Wingman design language.

Follow these principles:

- dashboard-style visual consistency;
- compact page header;
- no oversized hero;
- no unnecessary page scrolling;
- restrained accent colour;
- rounded rectangles rather than excessive pills;
- clear cards;
- compact filters;
- readable product table/list;
- clear selected/editing state;
- one dominant primary action;
- responsive layout;
- no nested scrolling unless genuinely necessary;
- preserve the Guru floating assistant;
- do not introduce additional CSS files unless unavoidable.

Prefer existing shared components and CSS primitives.

Do not reintroduce CSS sprawl.

===============================================================
J. NAVIGATION
===============================================================

Inspect the current route/navigation structure.

Add Product Data Manager to the most appropriate Admin / Settings /
maintenance location.

Do not duplicate routes.

Do not break Sales Helper navigation or existing page wiring.

If there is already an Admin area, integrate with it.

===============================================================
K. PERSISTENCE
===============================================================

This is important.

Inspect how Wingman currently stores product data before implementation.

Preferred order:

1. existing backend/database;
2. existing structured repository data source;
3. existing application persistence abstraction.

Do NOT introduce localStorage as the permanent product database if a
proper data layer already exists.

If the current application cannot safely write to the canonical data
source from the browser:

- create a clear repository/service abstraction;
- keep edit operations behind that abstraction;
- provide a development-safe persistence implementation;
- document what remains necessary for production persistence.

The Product Data Manager must not silently edit one dataset while Finder
or Compare reads another.

===============================================================
L. DATA SAFETY
===============================================================

Do not automatically rewrite existing product specifications based on
parsing.

Do not bulk "correct" product values unless existing authoritative data
supports the correction.

Preserve current data.

Normalisation should be non-destructive.

If legacy records need migration:
- provide safe defaults;
- preserve original information;
- mark uncertain fields for review.

===============================================================
M. TESTS
===============================================================

Add useful tests for:

- structured product model;
- routed versus mirrored output handling;
- unknown versus false values;
- competitor equivalence status;
- Product Data Manager filtering/search;
- save/update behaviour;
- data quality detection;
- scenario-validation schema/harness.

Use the project's existing test framework.

Do not remove existing tests merely to make validation pass.

===============================================================
N. VALIDATION
===============================================================

Before finishing, run the relevant available commands.

At minimum:

npm run typecheck
npm test
npm run build

If the repository has:

npm run verify

run that as well.

Fix errors introduced by this development pass.

Do not leave knowingly broken TypeScript.

===============================================================
O. FINAL REPORT
===============================================================

At completion print a concise summary containing:

1. files created;
2. files changed;
3. Product Data Manager route;
4. canonical data source being used;
5. persistence mechanism;
6. structured product fields added;
7. competitor equivalence model status;
8. Discovery evidence foundation status;
9. scenario testing status;
10. validation results;
11. any limitations that remain.

Do not commit or push automatically.

===============================================================
DEFINITION OF DONE
===============================================================

This pass is complete when:

- there is an accessible Product Data Manager;
- it operates against Wingman's actual product data architecture;
- important AV specifications can be represented structurally;
- routed and mirrored outputs remain distinct;
- unknown data remains unknown;
- source/confidence/verification data can be represented;
- competitor equivalence statuses exist;
- Discovery has a reusable evidence contract/foundation;
- scenario testing has a reusable behavioural structure;
- no existing main workflows are broken;
- TypeScript passes;
- tests pass;
- production build passes.

Remember:

Wingman is an AV sales and pre-sales assistant.

The purpose of this work is not merely database administration.

The purpose is to make Finder, Compare, Discovery, Product Pitch and
Proposal increasingly rely on the same governed AV product truth.
