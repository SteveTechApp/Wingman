# Wingman product simplification audit

Date: 22 September 2026

## Executive conclusion

Wingman is over-developed at the presentation layer. The underlying capabilities are mostly valuable, but too many are presented as separate products, routes, hubs, or user decisions. A salesperson should not need to understand Wingman's internal capability map before doing a job.

The current application has 29 governed routes, nine primary navigation destinations, two administrator destinations, a Focused/Full workspace choice, and several secondary routes that are really modes of another workflow. The product would be clearer as five user jobs:

1. Start or capture an opportunity
2. Find and understand a product
3. Compare a competitor
4. Build a response
5. Review active projects

This is principally a consolidation recommendation, not a recommendation to discard the product data, matching engines, evidence controls, or proposal safeguards.

## Audit basis and limitations

The audit combined:

- the live application and its navigation, dashboard, hubs, and hand-offs;
- the 29-entry route manifest and redirect behaviour;
- the feature-surface audit (`npm run audit:feature-surface`);
- page and project-state implementation;
- existing local analytics and workflow telemetry.

There is no reliable multi-user production adoption dataset in the repository. The analytics dashboard reads browser-local events and projects, retains at most 90 days, and the global page-open event is recorded as feature `page` with the route only in metadata. It therefore cannot answer which named features are genuinely adopted across users. Findings below use task-fit, duplication, navigation cost, and workflow continuity rather than invented usage claims.

## What is crossing over

| Current surfaces | Crossover | Decision |
| --- | --- | --- |
| Call Coach, Sales Helper, Call Cards, Discovery, Product Call Cards, Support | All help a salesperson decide what to ask or say in a conversation. Call Coach actually embeds Sales Helper while also linking to Discovery and Product Call Cards. | Merge into one conversation entry. Keep Discovery as the captured brief; expose product talk tracks and escalation contextually. Retire Sales Helper, Call Cards, and Support as standalone destinations. |
| Catalogue Browser, Product Families, Product Call Cards, Product Dashboard/Product Positioning, Recommendations | These are five lenses over the same governed product catalogue: browse, learn category, search SKU, view detail, or see a match. Users should not have to select the correct product UI first. | Create one Product Explorer with search, filters, family browsing, product detail, talk track, and a recommendation state. Preserve the underlying components as modes, not separate features. |
| Documents hub, Document Ingest, Templates, Compare, Proposal | The Documents page is a router to four workflows already available from Home and elsewhere. It adds a choice layer without doing document work itself. | Remove Documents from primary navigation. Make Decode Request a starting action and hand extracted items directly to Compare or Response. |
| Templates, Discovery, Recommendations, Proposal | Templates are pre-filled discovery/design decisions, not a separate end-to-end job. They are surfaced from Home, Documents, Products, Learn, and proposal flows. | Put “Start from a template” inside New Project/Discovery. Keep a template library only as a secondary browse mode. |
| Compare, Battle Cards, competitor modes in Call Coach and Documents | Battle Cards is already effectively a Compare mode: `/battle-cards` redirects to `/compare?mode=battle-cards`, while Compare links back to Battle Cards. | Keep one Compare workspace. Present objection handling in the result, not as a separate route or circular hand-off. |
| Proposal, Response Pack, Proposal Visuals, project proposal state | These are stages and assets of one deliverable. “Proposal”, “Publication”, “Response Pack”, and “customer response” are used for closely related output. | Choose one customer term—recommended: **Response**—and make summary, BOM, evidence, visuals, review, and export steps in the same workspace. |
| Dashboard, Projects, Today's Focus, Quote Safety | All surface the same project state. The dashboard is useful as a concise resume/start surface; Quote Safety is a filtered portfolio view, not a product. | Keep Home and Projects. Make readiness a Projects filter and avoid duplicating project lists or task queues elsewhere. |
| Learn, Glossary, Product Families, Product Call Cards, Guru | Learn largely links users back to product and workflow pages; glossary and product education are reference layers. | Remove Learn from primary navigation. Keep searchable learning and glossary content inside Guru and contextual “explain this” links. |
| Focused view and Full workspace | The user is asked to choose an interface model in addition to choosing a task. In the accessibility tree both options present as checkboxes even though they are mutually exclusive concepts. | Remove the mode choice for ordinary users. Use one task-first navigation, with administrator tools controlled by role. |

## Features that are not sufficiently helpful in their current form

### 1. Navigation hubs as destinations

Products and Documents are menus presented after the user has already used the global menu. Call Coach is both a hub and an embedded workflow. These intermediate pages increase time-to-task and make the information architecture feel larger than the capability set.

Recommendation: allow the main navigation or command entry to open the working surface directly. Use progressive choices inside that surface only when the choice changes the required inputs.

### 2. Analytics Dashboard as a business insight feature

The current implementation is useful for local development diagnostics, but not for management decisions:

- events and projects are browser-local;
- retention is 90 days and capped at 1,000 events;
- page opens aggregate under `page`, so named feature adoption is obscured;
- win rate is based on locally recorded project outcomes;
- competitor detection is keyword extraction from free-text outcome notes.

Recommendation: remove it from the product-facing surface or label it “Local activity”. Do not use it to justify feature retention. A production adoption decision needs shared event names, user/workspace cohorts, completion events, and funnel reporting.

### 3. Standalone Support

Support is most valuable at the moment a confidence gap, evidence gap, or escalation condition occurs. A general Support route makes the user leave their task and reinterpret the issue.

Recommendation: embed “Escalate / request technical review” beside the relevant warning and carry the project context automatically.

### 4. Standalone Learn

The live Learn page is thoughtful, but it is disconnected from the immediate sales task and sends users to Glossary, Discovery, Product Families, Product Call Cards, and Call Coach. This is content duplication through navigation rather than a distinct workflow.

Recommendation: keep the content, remove the destination. Surface short explanations contextually and retain a searchable knowledge drawer.

### 5. Product-family browsing as a separate product

Family-level exploration is a useful filter and learning lens, but not a separate workspace from the catalogue. Likewise, Product Call Cards and Product Positioning are views of a product record.

Recommendation: use a stable Product Explorer shell. Opening a SKU should not change which “product feature” the user believes they are using.

### 6. Saved comparison history inside Compare

Compare currently owns search, matching, evidence, alternatives, battle-card content, governance decisions, save-to-project, snapshot restore, history search/filter/sort/export/delete, and live research status. This breadth is visible in a roughly 288 KB page module.

Recommendation: keep the current comparison result and “save to project”. Move history management to the Project record. A comparison tool should answer the current substitution question; a project should own past decisions and versions.

## Recommended target product

### Primary navigation

| Destination | Purpose |
| --- | --- |
| Home | Resume work or start one of the four primary jobs. |
| Opportunities | Create/capture a brief, including conversational guidance and templates. |
| Products | Unified catalogue, families, recommendations, product detail, and talk tracks. |
| Compare | Competitor substitution with evidence and contextual objections. |
| Responses | Decode an input and produce customer-facing output, including visuals and review. |
| Projects | Saved work, decision history, readiness, approvals where role-appropriate. |

Settings can remain in the account menu. Guru can remain as a global contextual assistant. Data Manager and Approval Queue should remain role-based administration, not part of the ordinary feature count.

### Specific route treatment

| Route/capability | Treatment |
| --- | --- |
| Home | Keep and simplify to start/resume. |
| Call Coach | Merge into Opportunities. |
| Sales Helper / Call Cards | Retire standalone routes. |
| Discovery | Keep as the opportunity brief engine. |
| Products | Keep as the unified Product Explorer shell. |
| Catalogue / Families / Product Call Cards / Product Pitch | Convert to Product Explorer modes and deep links. |
| Recommendations | Show as Product Explorer results tied to a project. |
| Compare / Battle Cards | Keep Compare; merge battle-card content into its result. |
| Documents | Retire the hub. |
| Ingest | Keep as an entry action within Responses or New Opportunity. |
| Templates | Make a starting mode, not primary navigation. |
| Video Wall | Keep as a specialist configurator launched from a detected requirement. |
| Proposal / Response Pack / Proposal Visuals | Merge into Responses. |
| Projects / Quote Safety | Keep Projects; make Quote Safety a filter. |
| Learn / Glossary | Move into contextual help and Guru. |
| Support | Contextual escalation action. |
| Analytics | Admin diagnostic only until shared telemetry exists. |
| Settings / Terms | Keep outside task navigation. |

## Prioritised reduction plan

### Phase 1 — remove choice without removing capability

1. Reduce ordinary primary navigation to Home, Opportunities, Products, Compare, Responses, and Projects.
2. Remove the Focused/Full workspace selector.
3. Redirect old URLs, but stop linking to retired labels from live pages.
4. Standardise “Proposal / Publication / Response Pack” as “Response”.
5. Turn Templates and Decode Request into actions on New Opportunity/Home.

This phase is largely information architecture and should deliver the largest usability gain with the least product risk.

### Phase 2 — unify product and response shells

1. Build one Product Explorer shell and preserve existing lenses as stateful modes.
2. Build one Response workspace with input, content, BOM, visual, review, and export stages.
3. Move comparison history and proposal versions into Project Detail.
4. Trigger Video Wall and technical escalation only when relevant evidence indicates them.

### Phase 3 — validate with real usage

Instrument stable events for workflow start, meaningful completion, hand-off, abandonment, and output/export. Report by workspace and role rather than browser. Use the following decision rule after 6–8 weeks:

- keep a capability prominent when it has repeated use and a strong completion or hand-off rate;
- retain it contextually when valuable but infrequent;
- retire it when infrequent and not associated with downstream completion;
- investigate workflows with high starts and high abandonment before adding features.

## Bottom line

Wingman does not primarily have 29 distinct user features. It has roughly five valuable jobs expressed through too many named surfaces. The right reduction is to retire hubs, modes, and duplicate labels while keeping the intelligence underneath. That will make the product feel smaller, faster, and more trustworthy without throwing away the engineering investment.

## Implementation status — 22 September 2026

The first product pass is implemented. Primary navigation now contains Home, Opportunities, Products, Compare, Responses, and Projects. Opportunities opens Discovery with contextual template and conversation starting points. Products opens the catalogue directly and uses its existing view navigation for families, call cards, and positioning. Responses opens the working proposal builder with document decoding and visual creation beside it. Home points to these tasks. The Focused/Full workspace switch remains available in the focused header and full-workspace sidebar, and route opens now use named feature keys in local analytics. The Compare journey no longer links back to itself through Battle Cards.

The follow-on pass redirects the old Documents and Response Pack hubs to Responses while retaining project query context. SKU links enter the product-positioning view directly. Project Capture now shows saved comparison snapshots with evidence and quote checks, links back to a current-fit comparison, and houses response version history; the response builder points to that history in Projects. Related-feature and project handoff links now lead to Responses instead of duplicate Proposal/Publication entry points.

Saved comparison management now lives in Project Capture: search, verdict filter, sort, CSV export, text copy, snapshot restore, and confirmed deletion. Compare retains the current result and save action, and links to the owning project for history. Restored snapshots remain visibly separate from the recalculated current fit. The deeper consolidation remains: specialist URLs still work for existing links, some proposal terminology remains inside the builder, and browser-local analytics cannot establish organisation-wide adoption. These are deliberate limits of the current pass, not evidence that users have stopped needing the capabilities.

The adoption-diagnostics follow-up connects named feature events to the browser-local activity dashboard. A focused test verifies route-open, export, and search counts, ignores journey events that have no usage measure, and confirms local counts continue after the telemetry session cap. This makes the local diagnostic internally consistent; it is still not shared, organisation-wide adoption evidence.

The response-naming pass sends Projects, Project Detail, and Decode Request handoffs to the canonical Responses route. Their workspace labels now say “Response”; proposal-specific fields in the builder still describe the document being prepared. The legacy Proposal URL remains usable for existing links.
