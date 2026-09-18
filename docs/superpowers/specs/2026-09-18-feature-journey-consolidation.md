# Feature Journey Consolidation Specification

## Goal

Connect every customer-facing Wingman feature to useful next actions and consolidate routes that currently present the same user job.

## Requirements

- Define feature relationships once, outside route page implementations.
- Render a contextual action strip on customer-facing routes, excluding Home, Settings, Terms, and admin-only views.
- Preserve route context in links when a selected SKU or active Design Project can be inferred safely.
- Merge Sales Helper into Call Coach. Keep `/wingman/sales-helper` and `/wingman/call-cards` as compatibility redirects.
- Make `/wingman/products` the Product Workspace owner. Preserve Catalogue, Families, Product Call Cards, and Product Positioning URLs as compatibility entry points until their implementations can be physically combined.
- Fold Battle Cards into Governed Compare as a `battle-cards` mode and redirect the old route.
- Treat Documents as the intake-to-Publication owner and redirect Response Pack into its publication mode.
- Place Quote Safety under Projects and Analytics under the admin Data Manager route; preserve old URLs as redirects.
- Retire the standalone Support routing page by redirecting it to Call Coach.
- Do not delete working implementations in the first migration. Redirects must preserve bookmarks while the owning routes gain the consolidated interfaces.
- Add route, relationship, and rendering tests; keep architecture and contract gates green without raising ratchets.

## Acceptance criteria

- A user on Product Workspace can open Call Coach, Discovery, Compare, or the current product detail from contextual actions.
- All customer-facing routes included in the relationship registry return at least one useful action.
- Redirected legacy routes resolve to their new owner and mode.
- Call Coach renders the conversation-intent implementation previously owned by Sales Helper.
- Compare can render the Battle Cards view under its own route.
- No navigation action links back to its own current route.
