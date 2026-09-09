# Wingman v1 release evidence

_Assessment date: 2026-09-09 · Candidate: `codex/v1-sync-catalogue` @ `0b018afa` · Version: `0.9.0`_

## Decision

**No-go for a v1.0 production label.** The candidate is suitable for a controlled authenticated
internal pilot, but four release criteria still need environment or human evidence and three are
only partially evidenced. No missing result below is inferred from a local automated pass.

## Evidence matrix

| v1.0 criterion | Status | Dated evidence | Owner | Residual risk / exact closure condition |
|---|---|---|---|---|
| Real sales-rep mobile UAT | **Blocked** | [September mobile UAT record](trusted-testing/mobile-sales-uat-2026-09.md) records that testing has not run. | Sales lead + release owner | Assign at least one active sales representative, agree phone/tablet targets, execute every scenario, record defects and obtain named sign-off. |
| Authenticated production-like load tests | **Blocked** | [Load testing record](LOAD_TESTING.md) contains local file-store and attributable Supabase measurements; the roadmap still records the staging run as open. | Infrastructure owner | Run the strict authenticated profile against the production-like staging URL/account and record p95, p99, error rate and payload results without credentials. |
| Offline edit/reconnect/reconciliation tests | **Partial** | [Persistence ADR](design/0001-project-workspace-persistence.md) and project sync/hydration/conflict suites prove deterministic reconciliation; the [mobile UAT record](trusted-testing/mobile-sales-uat-2026-09.md) has no real-device offline run. | Engineering + mobile tester | Execute offline edit, reconnect and conflict-resolution on agreed devices against staging and attach the dated result. |
| Large-workspace performance tests | **Partial** | [Load testing record](LOAD_TESTING.md) includes project-store stress and per-project PUT measurements. Commit `aa1eb8dd` adds a lightweight catalogue summary with deferred per-SKU detail. | Performance owner | Run representative large-project and catalogue workloads against staging under strict budgets and retain the result artifact. |
| Proposal semantic parity across every export format | **Partial** | Automated proposal export validation exists; [mobile UAT](trusted-testing/mobile-sales-uat-2026-09.md) shows screen/DOCX/PDF inspection has not run. | Proposal owner | Publish a dated field-by-field parity result for screen, DOCX and PDF, with discrepancies fixed or explicitly accepted. |
| Agreed closure thresholds for missing critical specifications and evidence | **Partial** | `npm run verify:data` passed on 2026-09-09: 133/133 active lead SKUs have governed verified profiles and 137/137 active catalogue SKUs have stories. | Product-data owner + commercial approver | Record the business-approved threshold for verified-with-warning, confirmation aging and commercial approvals; obtain dated sign-off. |
| Observability for journey completion and failure rates | **Partial** | [Pre-production report](PRE_PRODUCTION_REPORT.md) records client error reporting and structured logs, but no journey funnel or release error-rate evidence. | Operations + product analytics | Instrument discovery-to-proposal completion/failure and alertable error-rate measures, then retain a staging observation window. |

## Candidate verification

| Check | Result on 2026-09-09 |
|---|---|
| Unit and integration tests | **PASS** — 2,375 tests across 310 Vitest files |
| Strict TypeScript | **PASS** — `tsconfig.typecheck.json` |
| Production build | **PASS** |
| Size budgets | **PASS** without raising a ratchet |
| Complete data-governance chain | **PASS** — `npm run verify:data` |
| Full verification | **PASS** — `npm run verify` completed all fast, build, data, contract and visual stages |
| Dependency audit | **PASS** — `check:build-deps` surveys 518 build-time packages with 0 affected packages; `vitest@4.1.11`, `@vitest/mocker@4.1.11` and `js-yaml@4.3.2` are installed |

The remaining `npm audit` report concerns the runtime `hono` package and is outside the build-time
dependency gate; it remains a separate moderate-severity maintenance item for the next dependency
review.
Passing local checks does not close the staging, real-device, business-sign-off or observability rows.

## Release authority

The release owner records the final decision in [the launch checklist](LAUNCH_CHECKLIST.md) only
after every blocking row above links to dated evidence. Risk acceptance must name the approver,
scope, expiry/review date and compensating control; it must not silently convert a missing result
into a pass.
