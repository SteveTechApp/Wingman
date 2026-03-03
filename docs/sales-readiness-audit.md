# Wingman Salesperson Readiness Audit

Generated: 2026-03-02 19:11:36

## Scope
This report evaluates Wingman from the perspective of a non-technical salesperson. It focuses on usability, confidence, commercial outcomes, and feature readiness.

## Repo Signals
- Repo root: $repo
- Code files scanned: 112
- Data files scanned: 6
- Route file: C:\Users\steve\wingman\src\AppRoutes.tsx | Approx routes: 17 | Lazy imports: 13

## Overall Readiness
- Average feature score: **57.5 / 100**
- Overall readiness: **Medium**

## What a Non-Technical Salesperson Needs
1. A clear starting point.
2. Plain-English guidance.
3. Confidence that outputs are safe to share.
4. A fast path from enquiry to recommendation to proposal.

## Strengths
- Broad feature ambition aligned to real pre-sales workflows.
- High commercial potential where template-driven design feeds proposal output.
- Strong value in competitor comparison and AI-assisted guidance when data quality is high.
- Brand-led UI direction can create trust if simplified for first-time users.

## Current Risks
- Feature breadth can overwhelm a non-technical salesperson without a guided start point.
- Inconsistent page layout, spacing, or duplicate navigation reduces confidence.
- Tools may feel engineering-led unless framed as outcomes rather than technical functions.
- AI/Guru value depends on grounded catalog, rules, and commercial messaging.

## Feature Readiness
| Feature | Audience Fit | Business Value | Code Files | Data Files | Score | Readiness | Primary Risk |
|---|---|---:|---:|---:|---:|---|---|
| Room Wizard / Templates | Very High | Very High | 11 | 4 | 80 | High | Near-ready, mainly polish and data hardening |
| Public Landing & Auth | High | High | 2 | 0 | 65 | Medium-High | Commercially useful with targeted UX refinement |
| Dashboard / Home | High | High | 3 | 0 | 65 | Medium-High | Commercially useful with targeted UX refinement |
| Competitor Compare | High | Very High | 4 | 0 | 65 | Medium-High | Commercially useful with targeted UX refinement |
| Proposal / BOM / Quote | Very High | Very High | 9 | 0 | 65 | Medium-High | Commercially useful with targeted UX refinement |
| Guru / AI Assistant | High | Very High | 11 | 0 | 65 | Medium-High | Commercially useful with targeted UX refinement |
| Training / Guidance Layer | Very High | High | 2 | 0 | 65 | Medium-High | Commercially useful with targeted UX refinement |
| Projects Workspace | High | High | 1 | 0 | 35 | Low-Medium | Visible but likely fragmented or thin |
| Survey / Intake Import | Medium-High | High | 1 | 0 | 35 | Low-Medium | Visible but likely fragmented or thin |
| Video Wall / LED Tools | Medium | Medium-High | 1 | 0 | 35 | Low-Medium | Visible but likely fragmented or thin |

## UX Support Signals
| Signal | Approx Hits | Interpretation |
|---|---:|---|
| Search / Filter | 118 | Helps sales users find products and options faster |
| Empty states | 5 | Indicates how well blank/first-run cases are handled |
| Help / Tooltips | 34 | Indicates explainability for non-technical users |
| Loading states | 20 | Improves perceived reliability during waits |
| Save / Export | 287 | Shows whether outputs can become usable customer deliverables |
| Local storage usage | 26 | Supports continuity and preference retention |
| Recent / Pinned | 90 | Useful for repeat actions and high-frequency tasks |
| Onboarding signals | 46 | Shows how much first-run support exists |

## Priority Recommendations
### P1 - First-run experience
- Problem: A non-technical salesperson needs a clear starting path, not a tool list.
- Recommendation: Add a single guided home action strip: Start New Opportunity, Match Competitor SKU, Build Room System, Generate Proposal, Ask Guru.
- Business impact: Reduces confusion and speeds first-value time.
- Effort: Medium

### P1 - Sales language layer
- Problem: Engineering terms can feel intimidating and reduce trust.
- Recommendation: Add plain-English labels beside technical labels, with concise why-it-matters helper text for each tool and key field.
- Business impact: Improves adoption by sales and distribution users.
- Effort: Low-Medium

### P1 - Confidence outputs
- Problem: Sales users need to know whether a recommendation is safe to send to a customer.
- Recommendation: Add confidence badges: Draft, Review Needed, Commercial Ready, Engineering Review Required.
- Business impact: Reduces accidental overselling and internal rework.
- Effort: Low

### P1 - Proposal handoff
- Problem: The app must convert work into a usable quote/proposal outcome.
- Recommendation: Ensure every design flow ends with BOM summary, assumptions, exclusions, and a clean export path.
- Business impact: Direct commercial value and easier handoff.
- Effort: Medium

### P2 - Guided qualification
- Problem: Salespeople often do not know which technical details matter early.
- Recommendation: Add a client brief checklist with required, recommended, and optional questions before design starts.
- Business impact: Higher quality inputs and fewer revisions.
- Effort: Medium

### P2 - Saved playbooks
- Problem: Repeatable sales scenarios should be reusable.
- Recommendation: Create saved system recipes by room type, vertical, and budget band.
- Business impact: Faster turnaround on common jobs.
- Effort: Medium

### P2 - Objection handling
- Problem: Competitor comparison needs commercial talk-tracks, not only technical comparison.
- Recommendation: Add 'How to position against X' notes with value statements, risks, and migration tips.
- Business impact: Improves win rate in early sales calls.
- Effort: Low-Medium

### P3 - Manager visibility
- Problem: Leadership needs to know whether the tool is being used and where users struggle.
- Recommendation: Add usage analytics for completed journeys, abandoned flows, and most-used tools.
- Business impact: Supports roadmap prioritisation.
- Effort: Medium-High

## Recommended Feature Framing
- **Start New Opportunity** instead of a generic dashboard card.
- **Find Replacement / Match Competitor** instead of technical compare wording.
- **Build a Room System** instead of wizard-heavy engineering language.
- **Create Quote Pack** instead of BOM/export-only wording.
- **Ask Wingman** for the AI assistant, positioned as a guided sales coach.

## Commercial Readiness Gate
Before a feature is considered sales-ready, it should meet all of the following:
1. Clear purpose in plain English.
2. Guided minimum input set.
3. Trusted output with assumptions and warnings.
4. Export or handoff path.
5. Obvious next step.

