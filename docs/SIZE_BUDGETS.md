# Wingman Size Budgets

A ratchet that stops the frontend bundle and the largest source files from
growing while the incremental refactoring programme reduces them. It does **not**
demand improvement — it only forbids regression. Existing debt is allowed to sit
at its recorded limit; any change that grows a tracked artefact past that limit
fails the build with an actionable message.

- **Definitions (what and how to measure):** `tools/lib/wingman-size-budgets.mjs`
- **CLI runner:** `tools/check-size-budgets.mjs`
- **Recorded limits (the numbers):** `tools/wingman-size-budgets.json`
- **Unit tests:** `tools/lib/wingman-size-budgets.test.mjs`

## Why the budgets exist

Wingman ships a Compare engine chunk over 1 MB, a competitor registry near
700 KB, and page components thousands of lines long. The refactor shrinks these,
but nothing prevents them from quietly re-inflating between pull requests. The
ratchet makes any growth visible and blocking, so a reviewer sees it before it
merges rather than discovering it months later.

## What is measured

| Budget id | Artefact | Kind |
|---|---|---|
| `chunk:compare-engine` | `wm-compare-engine-*.js` production chunk | emitted JS |
| `chunk:competitor-registry` | `wm-competitor-registry-*.js` production chunk | emitted JS |
| `chunk:project-workflow` | `wm-project-workflow-*.js` production chunk | emitted JS |
| `initial:js` | the entry `<script>` + every `<link rel="modulepreload">` in `dist/index.html` | eager JS |
| `total:js` | every emitted `.js` file | emitted JS |
| `total:css` | every emitted `.css` file | emitted CSS |
| `source:compare-advanced` | `src/wingman2/pages/ComparePageNew.advanced.tsx` | source file |
| `source:discovery-page` | `src/wingman2/pages/DiscoveryPage.tsx` | source file |
| `source:product-call-cards` | `src/wingman2/pages/ProductCallCardsPage.tsx` | source file |
| `source:project-detail` | `src/wingman2/pages/ProjectDetailPage.tsx` | source file |
| `source:style-stack-css` | `src/wingman2/styles/wingman-style-stack.css` | source file |

Production chunks are matched by their **stable named-group prefix** (from
`vite.config.ts`), not by the hashed filename, so a new build hash never breaks
the check. Sizes are raw (unminified-on-disk) bytes — the same number the build
reporter prints — reported in KB.

`initial:js` is the download the browser must fetch before the dashboard is
interactive. It is read from `dist/index.html` — the entry script plus every
`modulepreload` link — so it tracks the real eager cost rather than a source
heuristic. Keeping heavy features behind their lazy routes (so they stay out of
the entry's modulepreload) is what keeps this number down.

### Tolerance

`tolerancePct` in the baseline JSON (default `1`) widens each limit slightly so
trivial, environment-dependent minification noise between a local machine and CI
does not fail a build. A real regression clears the tolerance; a rounding wobble
does not.

## Running it

```
npm run check:size-budgets     # enforce — used by CI and by `npm run verify`
npm run audit:size-budgets      # report only, never fails (local inspection)
```

Both need a build present (`npm run build` first); `check:size-budgets` runs
automatically as part of `npm run verify` (inside `verify:build`) and as a
dedicated step in the CI `build` job after the application is built.

## Updating the budgets

The limits are meant to travel **downward**.

- **Lowering a limit** (the normal case): after a PR removes weight from a
  tracked artefact, lower its number in `tools/wingman-size-budgets.json` to the
  new measured value so the reduction is locked in. Do this by hand for a single
  artefact, or regenerate every limit from a fresh build:

  ```
  npm run build
  node tools/check-size-budgets.mjs --update-baseline
  ```

  Regenerating rewrites **all** limits to the current build — only commit the
  reductions you intend; never let it silently raise a limit.

- **Raising a limit** (the exception): only when a deliberate, reviewed decision
  adds weight that cannot reasonably be avoided (for example a required feature
  with no lighter option). A limit increase must:
  1. be its own clearly-described change, not smuggled into unrelated work;
  2. state in the PR description *why* the growth is unavoidable and what was
     tried to avoid it;
  3. be reviewed as an explicit exception — the reviewer is approving the
     regression, not just the feature.

Never raise a limit merely to make a red build green. That defeats the ratchet.

For the full map of every verify-chain guard gate a dependency or data edit
must satisfy — and which gates share this exception discipline versus which
have no exception path at all — see
[`docs/CI_GUARD_GATES.md`](CI_GUARD_GATES.md).

## Approved exceptions

### 2026-08-16 — Compare confidence-tier and evidence-trace feature work

Reviewed exception recorded in `tools/wingman-size-budgets.json` (and
`tools/wingman-style-drift-baseline.json` for style drift) for the compare
confidence-tier system and the honest project evidence trace. Five size limits
and one style-drift metric were raised to their measured values:

| Limit | Before | After | Growth | Cause |
|---|---|---|---|---|
| `chunk:competitor-registry` | 1,205,382 | 1,272,898 | +67,516 B | governed competitor-decision ledger (33 approved rows, ~15 K lines) embedded in the chunk |
| `total:js` | 5,413,076 | 5,555,290 | +142,214 B | the ledger plus new modules (`CompareConfidenceTier`, `CompetitorDecisionReviewQueue`, snapshot guard) |
| `total:css` | 929,919 | 947,967 | +18,048 B | tier chip tones + glyphs, verdict-lead banner, projects-list tier badge, print styles |
| `source:compare-advanced` | 277,904 | 293,297 | +15,393 B | verdict-tier helper, chip plumbing, approved-ledger promotion, strong-direction coupling fix |
| `source:project-detail` | 62,053 | 62,989 | +936 B | evidence-trace default-expand fix, typed-SKU deep-link helper |
| style-drift `pageSections` | 2,650 | 2,674 | +24 | new page-specific CSS sections for the same tier/badge styles |

Growth was minimised by extracting the chip (`CompareConfidenceTier.tsx`) and
the decision queue (`CompetitorDecisionReviewQueue.tsx`) into their own
modules. The remaining weight is the target of the Phase 2/4/7/8 extraction
programme named in each artefact's remediation, so these limits should travel
back downward as that refactor lands.

### 2026-08-26 — Guided interview (voice Q&A) Discovery mode

Reviewed exception recorded in `tools/wingman-size-budgets.json` for the
hands-free Discovery interview, its spoken-answer interpretation in the
standard capture box, the confidence-level chip, and the discovery Q&A trail
carried into exported proposals. `chunk:project-workflow` grew 197,077→199,649
(+2.57 KB) for the in-app Discovery Conversation review component consumed by
`ProposalCompletionWizard` (lazy chunk only — `initial:js` stayed green).
`source:discovery-page` grew from its
63,353-byte limit to 64,061 and then to 65,144 (+1,083 B total, +1.7%) for
the confirmed-with-customer marking that drives settled-vs-open tone in
exports, and `total:js` grew 6,253,112→6,339,478
(+86,366 B, +1.4%): the interview entry card, the interview-vs-standard render
branch, the mode state, and the `discoveryConversation` line in
`buildDiscoveryBrief` must stay on the page, and the complete fr/es/de phrase
and question-stem tables (`discoveryGuidedInterviewI18n.ts`, ~73 KB source)
plus the ~700-line `DiscoveryGuidedInterview` component, the
interpretation/TTS logic, and the capture-suggestion chip all ship in the lazy
DiscoveryPage chunk (213.4 KB) — none of it enters the eager app-core
(`initial:js` stayed green at 519.9 KB). Everything that could move was
extracted into `src/wingman2/pages/discovery/` — the component, the logic, the
i18n tables, the entry card, the `buildDiscoveryConversation` helper, and the
capture suggestion — matching the artefacts' stated remediation, so the limits
should travel back downward as the Phase 6 extraction programme continues
(e.g. loading per-language phrase tables on demand rather than shipping all
three languages).

### 2026-08-26 — Guided-interview i18n extended to eight more capture languages

Reviewed exception recorded in `tools/wingman-size-budgets.json` for the
`total:js` limit. The guided-interview localisation tables were extended from
fr/es/de to the remaining supported capture languages — pt-PT, it-IT, nl-NL,
sv-SE, nb-NO, ru-RU, zh-CN and hi-IN — with full 29-question stem tables and
the fifteen-core-question interpretation tables (stopwords, "don't know"
phrases and per-option spoken phrases) authored to the same bar as the
original three, plus the spoken-language toggle options and voice previews.
`total:js` grew 6,339,478→6,517,504
(+177,998 B, +2.8%). This is the same class as the guided-interview exception
recorded above: the data ships only in the lazy DiscoveryPage chunk
(`initial:js` stayed green at 520.4 KB), and it is exactly the Phase 6
extraction programme's target — loading per-language phrase tables on demand
rather than shipping all twelve languages in the bundle. The completeness
gate in `discoveryGuidedInterviewI18n.test.ts` now covers every translated
language and every core option value, so this class of table cannot silently
drift.

### 2026-08-26 — Discovery resume position + site-survey install-detail boundary

Reviewed exception recorded in `tools/wingman-size-budgets.json` for two
changes. (1) `source:project-detail` grew 54,789→55,792 (+1,003 B): the
project card shows where the guided interview left off (answers captured,
next question) and offers a one-click `Resume interview` jump to
`/wingman/discovery?resume=project&interview=1`, so reps re-enter the
interview from the project page or the dashboard recent-projects row
(`discoveryResume.ts` — a deliberately lightweight lib that derives the
position from the saved brief only, never importing the ~64 KB discovery
question set into the eager core). (2) `chunk:project-workflow` grew
218,767→222,364 (+3.6 KB): the SiteSurveyChecklist gained a structured
Installation Details section (display mounting height, cable containment,
power, mounting hardware, plus projector/rack/network items derived from
topology) with offline-persisted confirm checkboxes. Both ship only in lazy
chunks (`initial:js` stayed green at 520.4 KB) and reuse existing palette
values (no hex drift). The limits should travel back downward as the Phase
2/5/7/8 extraction programme lands.

### 2026-08-26 — Print-friendly Discovery Brief export (HTML + DOCX)

Reviewed exception recorded in `tools/wingman-size-budgets.json` for the new
standalone Discovery Brief document that reproduces the full Q&A trail
(question, governed answer, customer wording, confirmed/open status), the
captured room model and the still-to-confirm items, for hand-off to a
colleague or the customer before design sign-off.
`chunk:project-workflow` grew 199,649→218,767 (+19.1 KB, +9.6%):
`discoveryBriefExport.ts` (the HTML builder — deliberately free of any `docx`
dependency so the lazy Discovery page can offer it without pulling in the
whole library) and `discoveryBriefDocxExport.ts` (the DOCX builder, imported
only by `ProposalCompletionWizard` where `docx` is already bundled). The DOCX
builder reuses the proposal DOCX helper functions instead of duplicating them,
and the `docx` package itself stays out of the project-workflow chunk — it
remains shared in the proposal-generation chunk. Both artefacts ship only in
lazy chunks: `initial:js` stayed green at 520.4 KB and the
`source:discovery-page` budget stayed green at 63.85 KB. The limit should
travel back downward as the Phase 2/5/8 extraction programme lands.

### 2026-08-26 — Persisted guided-interview review position

Reviewed exception recorded in `tools/wingman-size-budgets.json` for the
review-mode position persistence: leaving the guided interview mid-review and
re-entering now lands back on the same question instead of question one.
`source:discovery-page` grew 65,144→66,278 (+1,134 B): the `reviewPosition`
brief field (type + normalisation in `projectStore.ts`), the page-level state
that feeds it into `buildDiscoveryBrief` and the debounced snapshot effect, and
the `reviewPosition`/`onReviewPositionChange` props threaded into
`DiscoveryGuidedInterview` (which restores the persisted index in review mode
and reports every move so the position survives navigation and reloads). All
of it ships in the lazy DiscoveryPage chunk — `initial:js` stayed green at
521.1 KB — and the ~180-byte component addition is in the already-excepted
interview component. The limit should travel back downward as the Phase 2/5/8
extraction programme lands.

### 2026-08-26 — Discovery conversation recorded in CRM webhook history

Reviewed exception recorded in `tools/wingman-size-budgets.json` for the CRM
share panel: each webhook send now stores the discovery Q&A trail exactly as it
was included in the payload (`CrmWebhookHistoryEntry.discoveryConversation`),
and the panel's Recent Sends list can expand any entry to show the conversation
that reached the CRM (question, governed answer, customer wording, confirmed
status) — so reps can verify what was pushed per project.
`chunk:project-workflow` grew 222,364→225,496 (+3,132 B, +1.4%): the panel is
consumed by the lazy project-workflow chunk via `ProposalCompletionWizard`,and the expander reuses the panel's existing text classes and lucide chevrons (no
new hex colours). `initial:js` stayed green at 521.1 KB. The limit should
travel back downward as the Phase 2/5/8 extraction programme lands.

### 2026-08-26 — Discovery Conversation review on the Project Detail page

Reviewed exception recorded in `tools/wingman-size-budgets.json` for reusing
the `DiscoveryConversationReview` component on the Project Detail page: a
dedicated "Discovery conversation" `SectionCard` (Q&A trail with per-row
Edit-in-Discovery links and confirmed/open status) lets reps audit the
conversation behind the design without entering the proposal wizard.
`source:project-detail` grew 55,792→56,401 (+609 B, +1.1%): one import plus
one `SectionCard` reusing the component's existing
`wm-discovery-conversation-review` styles (no new hex colours). Ships in the
lazy project-detail chunk — `initial:js` stayed green. The limit should travel
back downward as the Phase 2/5/8 extraction programme lands.

### 2026-08-26 — Capture-chip confidence carried into the Discovery Conversation review

Reviewed exception recorded in `tools/wingman-size-budgets.json` for carrying
the capture-chip confidence level (high/matched/low) into the in-app Discovery
Conversation review: `DiscoveryConversationItem` gains an optional
`confidence` field stamped by `buildDiscoveryConversation` from a
`confidenceByStep` map, the guided interview records match-derived tiers, the
standard capture suggestion chip passes its tier to the confirm handler,
`DiscoveryPage` threads the map through state/snapshot/brief, and
`DiscoveryConversationReview` renders a confidence badge (high green / matched
blue / low amber "verify before export") on each row.
`source:discovery-page` grew 66,278→67,642 (+1,364 B, +2.1%): the
`confidenceByStep` state, snapshot and brief wiring plus the confirm-handler
signature change all live on the page. `chunk:project-workflow` grew
225,496→228,020 (+2,524 B, +1.1%): the confidence badge in
`DiscoveryConversationReview` (consumed by the proposal wizard's Step 2) and
`confidence` on the shared `projectStore` type. Both ship only in lazy chunks
— `initial:js` stayed green at 521.3 KB — and the badge uses Tailwind
named-colour utilities (no new hex, no style-drift). The limits should travel
back downward as the Phase 2/5/6/8 extraction programme lands.

### 2026-08-26 — Confidence score recorded into the trail and exports

Reviewed exception recorded in `tools/wingman-size-budgets.json` for
recording the interpretation confidence **score** into the discovery
conversation trail and exports:
`DiscoveryConversationItem` gains a `confidenceScore` field stamped by
`buildDiscoveryConversation` from a `confidenceScoresByStep` map;
`DiscoveryPage` holds the parallel state and threads scores into the brief
(the guided interview passes `match.score`; the standard capture chip stamps
a high=10 sentinel for deliberate picks). Every export now renders the score
and flags low captures as "Low confidence — verify before quote", and the
proposal export gate adds a `discovery-low-confidence` warning.
`source:discovery-page` grew 67,642→68,421 (+779 B): the
`confidenceScoresByStep` state and its threading on the page. Ships in the
lazy DiscoveryPage chunk — `initial:js` stayed green at 521.3 KB. The limit
should travel back downward as the Phase 2/5/6/8 extraction programme lands.

### 2026-08-26 — Capture-language preload at the interview entry + static AV block schematic

Reviewed exception recorded in `tools/wingman-size-budgets.json` for
`total:js` crossing the 1% tolerance by 0.42 KB. Two additions pushed the
total: (1) the capture-language preload at the guided-interview entry card —
`DiscoveryGuidedInterviewEntry` now calls `loadInterviewLanguage` for the
stored capture language as soon as the card renders, so the first question
never flashes the English fallback while the tables are still arriving; (2)
the static AV block-schematic renderer, which bundles the 43 KB `.excalidraw`
scene via `?raw` into the lazy TemplateReviewPage chunk. The full
`@excalidraw/excalidraw` editor was evaluated and rejected in the same session
(it would have added ~7.4 MB), so this is the minimal cost of rendering the
reference schematic in-app plus no-English-flash preloading. `total:js` grew
6,364.75→6,428.82 KB (+64.07 KB, +1.0%) — both additions ship only in lazy
chunks, `initial:js` stayed green at 521.35 KB, and no source limit moved.
The limit should travel back downward as the Phase 2/5/6/8 extraction
programme lands.

### 2026-09-02 — Product-story coverage data in the compare engine chunk

Reviewed exception recorded in `tools/wingman-size-budgets.json` for the
`chunk:compare-engine` limit. The governed-data audit grew
`src/wingman2/data/productStories.ts` by 113 lines (product-story coverage
repairs landing in the same batch); that module is compiled into the
compare-page engine chunk through `productStoryEngine`, pushing the lazy
chunk from its 431,358-byte limit to a measured 436,999 bytes
(+5,641 B, +1.3%). Everything that could move was already extracted — the
story engine and the compare advanced page live in their own lazy chunks
(`source:compare-advanced` stayed green with 7.29 KB headroom), and the
growth is content data (product stories), not code, so there is no lighter
implementation short of dropping story content, which the story-coverage
tests pin. The limit is raised to the measured value only; it should travel
back downward as the Phase 4/5 compare-domain split named in the artefact's
remediation lands (ranking, competitor data and evidence loaded on demand).

## Adding a new tracked artefact

Add an entry to `TRACKED_ENTRIES` in `tools/lib/wingman-size-budgets.mjs`
(with a stable `id`, `label`, and `remediation`), then record its limit:

```
npm run build
node tools/check-size-budgets.mjs --update-baseline
```

A tracked entry with no recorded limit fails the check rather than passing
silently, so a new artefact cannot slip through unbudgeted.
