# Wingman Local Data Manager API Authentication Fix

The Admin Data Manager UI is now accessible in local development.

Current visible problem:

- Data Manager loads
- It displays "0 records"
- It displays "Authentication required."

The front-end development-only admin bypass already works.

The remaining problem is backend/API authentication.

## Objective

Allow the Data Manager product-intelligence API to read and write records
while running LOCAL DEVELOPMENT ONLY.

Production authentication and authorisation must remain unchanged.

## Inspect first

Identify:

1. Which endpoint DataManagerPage uses to load product data.
2. Which endpoint saves product changes.
3. Where "Authentication required." is generated.
4. How server/product-intelligence-store.mjs is mounted.
5. Existing request authentication/session middleware.
6. How NODE_ENV / development mode is currently detected by the server.

Do not guess endpoint names.

## Required implementation

Create a narrowly-scoped development bypass.

Conceptually:

const isDevelopment =
  process.env.NODE_ENV !== "production";

const allowLocalDataManager =
  isDevelopment &&
  request is for the governed Data Manager/product-intelligence
  administration endpoints;

Then:

if (!allowLocalDataManager) {
   preserve the existing authentication/admin checks exactly;
}

## Critical safety requirements

DO NOT:

- disable authentication globally;
- bypass authentication for Projects;
- bypass authentication for Documents;
- bypass normal user APIs;
- bypass authentication in production;
- remove existing admin permission checks;
- hard-code a user email;
- hard-code an admin password;
- expose a public unauthenticated production write endpoint;
- change unrelated authentication/session behaviour.

The bypass must only apply to the Data Manager/product-intelligence
maintenance API during development.

## Local request identity

If the endpoint requires an actor/user object for audit fields,
supply a clearly labelled DEVELOPMENT identity only when running locally,
for example:

{
  id: "local-development-admin",
  name: "Local Development Admin",
  role: "admin"
}

Do not use that identity in production.

## Data source

The page must load the SAME governed product intelligence source already
used by Wingman.

Do not create sample products merely to make the screen populate.

Do not create a second product database.

The Data Manager must expose the existing product records.

## Persistence

Existing save/update operations must continue to use the current
product-intelligence persistence layer.

Do not replace persistence with browser localStorage.

## Expected result

When running:

npm run dev

and opening:

/wingman/admin/data-manager

the page should load the actual existing Wingman product records rather
than:

0 records
Authentication required.

Editing/saving a product locally should use the existing governed
product persistence mechanism.

## Tests

Add or update tests proving:

1. development Data Manager API access succeeds;
2. production unauthenticated Data Manager access is rejected;
3. unrelated unauthenticated API endpoints remain protected;
4. existing authenticated behaviour still works.

## Validation

Run:

npm run typecheck
npm test
npm run build

If npm run verify exists, run it too.

Fix any errors introduced by this pass.

## Restrictions

Do not:
- switch branches;
- commit;
- push;
- modify .git;
- redesign DataManagerPage;
- make unrelated UI changes.

Finish with a concise summary showing:
- API route changed;
- authentication guard changed;
- development condition used;
- data source used;
- tests added/changed;
- validation results.
