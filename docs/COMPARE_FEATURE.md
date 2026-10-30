# Compare feature

The narrative behind the invariants in `AGENTS.md`: each rule in full, why it
exists, and the probe that proved it. A number quoted here records the run that
decided the rule; `reports/browser-readings.md` is the current measurement.

- `CompareConfidenceTier` (tones from `compareVerdictTier`) is the single
  source of truth for verdict tone. Surfaces must derive color/emphasis from
  the chip's tone (CSS via `:has(.compare-confidence-tier--X)`), never from
  the status class: "Evidence pending" pairs with status class `no-match`
  but must stay amber.
- The verdict-lead status class lives on the SECTION; the banner is the header
  element inside it. CSS matching both needs a descendant selector
  (`.compare-verdict-lead--X .compare-verdict-lead__banner`), not a compound.
- Compare/verdict styling lives in `wingman-workflow-theme.css` scoped under
  `html[data-wingman-route="compare"]`.
- The page entry is being emptied into `src/wingman2/pages/compare/` the way the
  proposal wizard was: pure logic leaves, React stays. `compareProductTaxonomy`
  owns the tag vocabulary and its class/role/transport inference,
  `compareProfileSignals` the small profile predicates both layers ask,
  `compareCompetitorFacts` the fact sheet built from a competitor profile,
  `compareComparisonFacts` the port/feature comparison and core fact table,
  `compareCandidateScoring` the scored-candidate shape (score, verdict, matched
  lines, gaps, blockers, dependencies) behind `scoreProduct` and
  `applyCompareEquivalenceGuards`, `compareCandidateBuilders` the two
  catalogue shortcuts that answer a brief directly — the AVoIP endpoint pair and
  the 18Gbps 8x8 HDBaseT matrix — and `compareRunLookup` the run/lookup
  orchestration: the competitor SKU catalogue and its suggestions, whether a
  typed SKU is held locally or needs research, the plan for one live lookup and
  what a settled or thrown one means, the state a run starts and a reset leaves,
  and the reviewed live result as a candidate and a merged fact sheet. The page
  keeps every `useState` and the effect that issues the request (the sequence
  guard is a ref there), and applies what those functions return. `compareTypes`
  holds the shapes the modules share, so a rule can be imported without pulling
  the page in.
  Nothing re-exports through the page: a consumer imports the module that owns
  the rule, and the one test that read `assessCompetitorConnectorCoverage` off
  the page now reads it from `compareComparisonFacts`. The builders take the
  WyreStorm lookup as an argument (`WyrestormProductLookup`) because the page
  swaps its catalogue for the real one after load and keeps owning that mutable
  list; their test passes its own lookup to pin the SKUs each shortcut means and
  to prove a brief that is not an 18Gbps 8x8 HDBaseT matrix stands down without
  touching the catalogue.
