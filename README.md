# WyreStorm Wingman

WyreStorm Wingman is an internal sales, discovery, product-selection and proposal-support tool for WyreStorm Technologies.

The application helps sales and pre-sales users move from customer requirements to a practical AV system direction using guided workflows, product intelligence, comparison support, project storage and proposal-ready outputs.

## Core development checks

Before committing changes, run:

npm run verify

For faster local validation during UI work, run:

npm run typecheck
npm run build

## Deploy on Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/SteveTechApp/Wingman)

The repository includes `render.yaml`, which creates the Wingman frontend and
backend together. Render deploys `main` after its GitHub checks pass. The backend
is configured to require Supabase-backed storage (`WINGMAN_STORAGE_MODE=supabase-tables`,
`WINGMAN_STORAGE_FAIL_CLOSED=true`), so it fails loudly on startup rather than
silently falling back to the container's ephemeral filesystem. Before the first
deploy:

1. Create a Supabase project.
2. Run `server/migrations/001_initial_schema.sql` against it (paste into the
   Supabase SQL Editor, or apply with the Supabase CLI).
3. In the Render dashboard, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   on the `wingman-api` service (these are marked `sync: false` in `render.yaml`
   and are never committed to the repo).
4. Deploy. If the credentials are missing or wrong, the API will refuse to
   start rather than persist workspace data to disk.

## Styling governance

Wingman uses a consolidated stylesheet stack imported from src/main.tsx.

Page files should not import their own CSS. Visual migration work should use shared wm-ui-* primitives and the redesign theme layer rather than scattered page-level overrides.

## Documentation

Root-level project documentation is kept intentionally short. Detailed feature, launch, migration and audit notes live under the docs and archive folders.
