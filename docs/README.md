# Wingman documentation map

You do not need to read every Markdown file.

For normal product-data work, read only [`../data-sources/README.md`](../data-sources/README.md).
For deployment, follow [`../DEPLOYMENT.md`](../DEPLOYMENT.md), then use
[`LAUNCH_CHECKLIST.md`](./LAUNCH_CHECKLIST.md) as the go/no-go record.

## Authoritative documents

| Concern | Source |
| --- | --- |
| Project setup and commands | [`../README.md`](../README.md) |
| Product-data ownership and updates | [`../data-sources/README.md`](../data-sources/README.md) |
| Deployment | [`../DEPLOYMENT.md`](../DEPLOYMENT.md) |
| Production operations | [`OPERATIONS.md`](./OPERATIONS.md) |
| Supabase | [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) |
| Security reporting | [`../SECURITY.md`](../SECURITY.md) |
| Launch approval | [`LAUNCH_CHECKLIST.md`](./LAUNCH_CHECKLIST.md) |

## Product standards enforced in code

- [`WINGMAN_PROPOSAL_SAFETY_STANDARD.md`](./WINGMAN_PROPOSAL_SAFETY_STANDARD.md)
- [`wingman-sales-copy-style.md`](./wingman-sales-copy-style.md)
- [`wyrestorm-product-lifecycle.md`](./wyrestorm-product-lifecycle.md)
- [`../src/wingman2/styles/CSS_MIGRATION_REGISTER.md`](../src/wingman2/styles/CSS_MIGRATION_REGISTER.md)

`npm run check:docs` checks local links, npm command references, source-of-truth
paths, deployment dependencies, Docker catalogue generation, CSS ownership, and
proposal safety headings. `npm run verify` includes that check.

## Generated review queues

These are outputs, not instructions:

- `product-story-coverage-backlog.md`
- `wyrestorm-lifecycle-reconciliation.md`

The current queues contain 24 lifecycle rows requiring human confirmation and 28
active products without governed sales stories. They are deliberately review-gated;
they are not silently promoted to customer-ready data.

Historical audits, superseded plans, branch notes, and generated trend reports live
under `archive/documentation-history-2026-06-28/` or ignored `reports/`.
