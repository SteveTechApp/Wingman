# Wingman Development Milestones — Complete Roadmap

**Current state:** v0.9.0 · 140K LOC · 1,285 tests · 72-step verify chain · 445 product SKUs · 355 competitor products · 28 competitor brands

**Last updated:** 2026-08-24

---

## Phase 1: Production Readiness (Weeks 1–3)

**Goal:** Ship a stable, testable v1.0 that a sales rep can use on-site with confidence.

### 1.1 — Mobile-Responsive Layout ⬜
**Priority:** CRITICAL — reps use Wingman on-site with tablets and phones

| Task | Effort | Status |
|------|--------|--------|
| Discovery page: collapse guided steps into vertical scroll with progress indicator | 2d | ⬜ |
| Product Call Cards: single-column card layout on screens <760px | 1d | ⬜ |
| Battle Cards: stack brand accordion panels vertically | 1d | ⬜ |
| Compare page: hide advanced panels behind "More detail" toggle on mobile | 1d | ⬜ |
| Recommendations: stack role cards vertically, collapse assurance panel | 1d | ⬜ |
| Proposal Builder: full-width step panels, sticky export bar at bottom | 1d | ⬜ |
| Dashboard: single-column project grid, collapse sidebar rail to hamburger | 1d | ⬜ |
| Add `@media (max-width: 760px)` breakpoints to all major page CSS | 2d | ⬜ |
| Test on iPad Safari, iPhone Safari, Android Chrome | 1d | ⬜ |

### 1.2 — E2E Playwright Tests for Critical Workflows ⬜
**Priority:** HIGH — prevents regressions in the money paths

| Workflow | Test coverage | Effort |
|----------|---------------|--------|
| Discovery → Recommendations → Proposal | Happy path + missing-data recovery | 3d |
| Competitor Compare (live lookup + no-match fallback) | Brand match + unsupported brand | 2d |
| Product Call Card → Quick Compare → Add to proposal | 2d |
| Project save → template → new project from template | 1d |
| Battle Cards search + expand + link to compare | 1d |
| Win/loss outcome recording → pattern surface in feedback view | 1d |
| Quote Safety Dashboard filter + expand + open project | 1d |

### 1.3 — Unit Test Coverage for Ungated Pages ⬜
**Priority:** HIGH — pages without tests are invisible to the verify chain

| Page | Current tests | Needed |
|------|---------------|--------|
| DiscoveryPage | 1 (resume) | Quick-start panel, speech recognition, custom template panel, completion panel |
| ProposalPage | 0 | Wizard step progression, version history panel, export gate |
| BattleCardsPage | 0 | Brand grouping, search filter, deal-outcome badges, expand/collapse |
| SalesHelperPage | 0 | Conversation type selection, room-led vs display-led paths |
| ProposalVisualsPage | 0 | Block diagram, schematic, room concept creation |
| VideowallBuilderPage | 0 | Grid shape creation, product assignment, export |

### 1.4 — Service Worker Hardening ⬜
**Priority:** MEDIUM

| Task | Effort | Status |
|------|--------|--------|
| Cache versioning with build-time token replacement | — | ✅ DONE |
| Add `Vite` config plugin to stamp `sw.js` on every build | — | ✅ DONE |
| Add cache size monitoring (warn when >50MB) | 0.5d | ⬜ |
| Add manual "clear cache" button in Settings | 0.5d | ⬜ |
| Pre-cache `product-media-index.json` for offline product images | 0.5d | ⬜ |
| Test offline flow end-to-end: go offline → use call cards → come back online | 0.5d | ⬜ |

### 1.5 — Feature Analytics ⬜
**Priority:** MEDIUM — need data to prioritise future work

| Task | Effort | Status |
|------|--------|--------|
| Create `featureAnalytics.ts` module | — | ✅ DONE |
| Wire into app shell (page views) | — | ✅ DONE |
| Add `trackFeatureEvent` calls to: Compare, Battle Cards, Discovery completion, Export actions | 1d | ⬜ |
| Add export tracking (DOCX/PDF format, product count) | 0.5d | ⬜ |
| Add search tracking (catalog search, competitor search) | 0.5d | ⬜ |
| Add feature-completion tracking (discovery captured%, proposal readiness) | 0.5d | ⬜ |

---

## Phase 2: Intelligence Loop (Weeks 4–6)

**Goal:** Make every deal outcome, feedback rating, and battle card conversation feed back into smarter recommendations.

### 2.1 — Win/Loss Feedback Loop ⬜
**Priority:** HIGH

| Task | Effort | Status |
|------|--------|--------|
| Deal outcome recording (won/lost/deferred + why) | — | ✅ DONE |
| Pattern detection in "why" text (brand, reason extraction) | — | ✅ DONE |
| Battle card priority boost from deal losses | — | ✅ DONE |
| Product selector scoring boost/penalty from outcomes | — | ✅ DONE |
| Surface top losing brands on Recommendations page | — | ✅ DONE |
| **NEXT:** Auto-escalate losing brands in battle cards when 3+ losses recorded | 1d | ⬜ |
| **NEXT:** Generate migration-path talking points for losing brands | 2d | ⬜ |
| **NEXT:** Show "Why we lost" summary on project detail when outcome is "lost" | 1d | ⬜ |

### 2.2 — Proposal Version History ⬜
**Priority:** HIGH

| Task | Effort | Status |
|------|--------|--------|
| Auto-save proposal snapshots on significant change | — | ✅ DONE |
| Diff engine (title, summary, sections, products) | — | ✅ DONE |
| Version history UI with compare + restore | — | ✅ DONE |
| **NEXT:** Show version timeline (vertical stepper with timestamps) | 1d | ⬜ |
| **NEXT:** "Version summary" auto-generated text ("Added 2 products, removed 1, changed pricing") | 1d | ⬜ |
| **NEXT:** Version labels (rep can name versions: "v1 - initial", "v2 - added video wall") | 0.5d | ⬜ |

### 2.3 — Quote Safety Dashboard ⬜
**Priority:** HIGH

| Task | Effort | Status |
|------|--------|--------|
| Portfolio view with tier badges, blocker counts, staleness | — | ✅ DONE |
| Filter by tier, sort by age/products/name | — | ✅ DONE |
| Expandable blocker/warning detail panels | — | ✅ DONE |
| **NEXT:** Auto-email stale project owners (configurable threshold) | 2d | ⬜ |
| **NEXT:** Export dashboard as PDF/CSV for manager review | 1d | ⬜ |
| **NEXT:** Show deal outcome alongside safety tier ("Lost + 2 blockers = at-risk") | 0.5d | ⬜ |

### 2.4 — Complete System Bundler Intelligence ⬜
**Priority:** MEDIUM

| Task | Effort | Status |
|------|--------|--------|
| Auto-suggest TX+RX pairs, switcher+extenders, UC bar+camera | — | ✅ DONE |
| Flag missing accessories before quote | — | ✅ DONE |
| **NEXT:** Warn when TX has no matching RX in the BOM | 1d | ⬜ |
| **NEXT:** Suggest missing speakers when amplifier is selected | 1d | ⬜ |
| **NEXT:** Suggest missing camera when UC soundbar is selected | 1d | ⬜ |
| **NEXT:** Suggest missing control when 3+ devices in BOM | 1d | ⬜ |

---

## Phase 3: Product Intelligence Automation (Weeks 7–9)

**Goal:** Keep Wingman's product data current without manual extraction.

### 3.1 — Automated Product Data Pipeline ⬜
**Priority:** HIGH — the product guide PDF is annual; 11 months of drift

| Task | Effort | Status |
|------|--------|--------|
| Build scraper for wyrestorm.com product pages | 3d | ⬜ |
| Diff scraped data against product-intelligence-index.json | 2d | ⬜ |
| Flag new, changed, and discontinued products for review | 1d | ⬜ |
| Auto-update non-spec fields (images, descriptions, lifecycle) | 2d | ⬜ |
| Human-in-the-loop review for spec-critical changes | 1d | ⬜ |
| Schedule monthly check via cron / GitHub Action | 1d | ⬜ |

### 3.2 — Smart Recommendation Memory ⬜
**Priority:** MEDIUM

| Task | Effort | Status |
|------|--------|--------|
| Track rep's product selections by room type + vertical | 2d | ⬜ |
| Surface "Rep's usual pick" badge on recommended products | 1d | ⬜ |
| Learn from cross-project patterns (not just one rep) | 2d | ⬜ |
| Confidence indicator: "90% of reps pick NHD-500 for <12 sources" | 1d | ⬜ |

### 3.3 — Competitor Deal Tracking ⬜
**Priority:** MEDIUM

| Task | Effort | Status |
|------|--------|--------|
| Track which competitors appear in lost deals (from "why" field) | — | ✅ DONE |
| Surface top 3 competitors by loss frequency | — | ✅ DONE |
| Auto-generate battle cards for high-loss competitors first | 1d | ⬜ |
| Show "Crestron appeared in 5 lost deals this quarter" on dashboard | 1d | ⬜ |
| Suggest specific talking points based on loss reasons | 2d | ⬜ |

---

## Phase 4: UX Polish & Access (Weeks 10–12)

**Goal:** Make Wingman useful in the room, not just at the desk.

### 4.1 — Discovery Workflow Simplification ⬜
**Priority:** HIGH — current discovery is "cumbersome" and "expects too much"

| Task | Effort | Status |
|------|--------|--------|
| Progressive disclosure: show 3 questions at a time, not 20+ | 3d | ⬜ |
| Smart defaults: auto-fill vertical → common room type → common equipment | 2d | ⬜ |
| "Quick mode" for simple rooms (3 questions: room size, displays, sources) | 2d | ⬜ |
| Voice input for cable distances (already has speech recognition) | 1d | ⬜ |
| Visual topology builder (drag cables on a room diagram) | 5d | ⬜ |

### 4.2 — Product Call Card Grid Redesign ⬜
**Priority:** MEDIUM

| Task | Effort | Status |
|------|--------|--------|
| One-line summary on each card (family + first proof point) | — | ✅ DONE |
| Recently viewed + frequently used quick-access | — | ✅ DONE |
| Discovery notes prefill | — | ✅ DONE |
| **NEXT:** Richer card layout: product image + 3-line summary + role badge | 2d | ⬜ |
| **NEXT:** Filter by: role, technology, lifecycle status | 1d | ⬜ |
| **NEXT:** Sort by: relevance, alphabetical, recently used | 0.5d | ⬜ |

### 4.3 — Offline Mode Enhancements ⬜
**Priority:** MEDIUM

| Task | Effort | Status |
|------|--------|--------|
| Service worker with pre-cached data | — | ✅ DONE |
| Offline banner with connection status | — | ✅ DONE |
| Cache versioning with build-time stamp | — | ✅ DONE |
| **NEXT:** Pre-cache product images (small thumbnails only) | 2d | ⬜ |
| **NEXT:** Cache proposal templates for offline proposal editing | 2d | ⬜ |
| **NEXT:** Background sync: queue changes offline, push when online | 3d | ⬜ |
| **NEXT:** IndexedDB for larger data sets (product intelligence index) | 2d | ⬜ |

### 4.4 — Accessibility & Keyboard Navigation ⬜
**Priority:** MEDIUM

| Task | Effort | Status |
|------|--------|--------|
| All interactive elements focusable with visible focus ring | 2d | ⬜ |
| ARIA labels on all icon buttons | 1d | ⬜ |
| Screen reader announcements for dynamic content (toasts, status) | 1d | ⬜ |
| Keyboard shortcuts for common actions (Ctrl+K search, Ctrl+N new project) | 1d | ⬜ |
| axe-core integration in CI (already in devDependencies) | 1d | ⬜ |

---

## Phase 5: Scale & Integration (Weeks 13–16)

**Goal:** Make Wingman an organisational tool, not just an individual one.

### 5.1 — Multi-User Team Features ⬜
**Priority:** HIGH

| Task | Effort | Status |
|------|--------|--------|
| Shared project access (read/write permissions) | 5d | ⬜ |
| Team templates (shared across workspace) | 3d | ⬜ |
| Cross-rep feedback aggregation (consolidate patterns across team) | 3d | ⬜ |
| Manager view: team dashboard with rep performance metrics | 3d | ⬜ |
| Role-based access (rep, pre-sales engineer, manager, admin) | 2d | ⬜ |

### 5.2 — CRM Integration ⬜
**Priority:** MEDIUM

| Task | Effort | Status |
|------|--------|--------|
| Salesforce: push project data as Opportunity | 5d | ⬜ |
| HubSpot: push project data as Deal | 5d | ⬜ |
| Pipedrive: push project data as Deal | 3d | ⬜ |
| Generic webhook: POST project data to any URL | 2d | ⬜ |
| Import: pull customer data from CRM into Discovery | 3d | ⬜ |

### 5.3 — Customer-Facing Portal ⬜
**Priority:** LOW

| Task | Effort | Status |
|------|--------|--------|
| Customer login (magic link, no password) | 3d | ⬜ |
| Customer views their proposal | 2d | ⬜ |
| Customer marks items as approved/changed/rejected | 2d | ⬜ |
| Customer leaves comments on proposal sections | 2d | ⬜ |
| Rep gets notification of customer changes | 1d | ⬜ |
| Version diff: "Customer rejected NHD-500-TX, suggested NHD-600-TX" | 2d | ⬜ |

### 5.4 — Analytics Dashboard ⬜
**Priority:** MEDIUM

| Task | Effort | Status |
|------|--------|--------|
| Feature usage heatmap (which pages used most) | 2d | ⬜ |
| Product quote frequency (which SKUs quoted most) | 1d | ⬜ |
| Win rate by product family | 1d | ⬜ |
| Competitor loss frequency by brand | 1d | ⬜ |
| Average proposal readiness score over time | 1d | ⬜ |
| Export: CSV/JSON for BI tools | 1d | ⬜ |

---

## Phase 6: Advanced Intelligence (Weeks 17–20)

**Goal:** Make Wingman the most knowledgeable AV pre-sales tool in the industry.

### 6.1 — AI-Powered Discovery ⬜
**Priority:** MEDIUM

| Task | Effort | Status |
|------|--------|--------|
| Natural language room description → structured requirements | 5d | ⬜ |
| Photo upload → room analysis (identify displays, cables, mounts) | 5d | ⬜ |
| Voice conversation → requirement capture (like a guided interview) | 5d | ⬜ |

### 6.2 — Competitive Intelligence Automation ⬜
**Priority:** MEDIUM

| Task | Effort | Status |
|------|--------|--------|
| Scrape competitor websites for new products/pricing | 5d | ⬜ |
| Auto-generate battle cards for new competitor products | 3d | ⬜ |
| Track competitor pricing changes | 2d | ⬜ |
| Alert when a competitor launches a product in our space | 2d | ⬜ |

### 6.3 — Advanced Proposal Intelligence ⬜
**Priority:** LOW

| Task | Effort | Status |
|------|--------|--------|
| Auto-generate pricing from BOM (when pricing data available) | 5d | ⬜ |
| Margin calculator (suggest optimal pricing for deal type) | 3d | ⬜ |
| Multi-currency support | 2d | ⬜ |
| Proposal templates by vertical (education, corporate, retail) | 3d | ⬜ |

---

## Technical Debt & Quality Ratchets

### Current debt (from codebase audit)

| Item | Severity | Effort | Notes |
|------|----------|--------|-------|
| ComparePageNew.advanced.tsx is 6,233 lines | HIGH | 5d | Split into sub-components |
| roomTemplates.ts is 3,283 lines | MEDIUM | 3d | Extract template definitions to JSON |
| ProductCallCardsPage.tsx is 2,003 lines | MEDIUM | 2d | Extract grid, search, compare components |
| No Playwright tests at all | HIGH | 5d | Add critical path e2e tests |
| Service worker has no cache size limits | LOW | 0.5d | Add monitoring |
| No A/B testing infrastructure | LOW | 3d | Needed for feature experiments |

### Quality gates to add

| Gate | What it checks | Effort |
|------|---------------|--------|
| `check:e2e-smoke` | Playwright: discovery → recommendations → proposal happy path | 2d |
| `check:mobile-viewport` | All pages render correctly at 375px and 768px | 1d |
| `check:analytics-wiring` | All pages track feature_open events | 0.5d |
| `check:offline-capability` | Service worker pre-caches all required JSON files | 0.5d |

---

## Release Milestones

| Milestone | Target | Features included |
|-----------|--------|-------------------|
| **v1.0-beta** | Week 3 | Mobile responsive, e2e tests, service worker hardened |
| **v1.0-rc** | Week 6 | Win/loss loop, proposal versioning, quote safety dashboard |
| **v1.0** | Week 9 | Automated product pipeline, smart recommendations, competitive intelligence |
| **v1.1** | Week 12 | Discovery simplification, call card redesign, offline enhancements |
| **v1.2** | Week 16 | Multi-user teams, CRM integration, analytics dashboard |
| **v2.0** | Week 20 | AI-powered discovery, advanced proposal intelligence |

---

## What's already built (session recap)

| Feature | Files | Status |
|---------|-------|--------|
| Call cards simplification | 3 files | ✅ |
| Product grid hints | 2 files | ✅ |
| Quick Compare mode | 2 files | ✅ |
| Recently viewed / Frequently used | 3 files | ✅ |
| Discovery notes prefill | 3 files | ✅ |
| Complete this system | 3 files | ✅ |
| Battle Cards | 5 files (3 new) | ✅ |
| Win/Loss outcomes | 5 files | ✅ |
| Project templates | 3 files (1 new) | ✅ |
| Product Guide 2026 data cleansing | 1 file | ✅ |
| Offline mode (service worker) | 3 files (2 new) | ✅ |
| Win/loss feedback loop | 4 files | ✅ |
| Proposal version history | 4 files (2 new) | ✅ |
| Quote Safety Dashboard | 3 files (2 new) | ✅ |
| Service worker cache versioning | 2 files | ✅ |
| Feature analytics | 3 files (1 new) | ✅ |
| **Total** | **15 modified + 8 new** | **+3,800 / -500 net lines** |
