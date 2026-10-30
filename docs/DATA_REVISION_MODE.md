# Working while product data is revised

Wingman currently defaults to local file storage, including production startup.
Supabase credentials and migrations are optional. Existing remote storage code
is retained for later use. An explicit remote mode with fail-closed enabled still
rejects missing credentials or an unavailable database.

Local application data lives on the server's disk. A deployment with an ephemeral
disk loses local changes on replacement or redeployment; retain that directory
on persistent storage if those changes need to survive.

## Everyday commands

- `npm test`: behavioural tests; current-catalogue acceptance suites are excluded.
- `npm run check:compare-core`: comparison, technology, role and verdict tests.
- `npm run build`: compile the UI without rewriting catalogue sources.
- `npm run build:prepare-data`: regenerate catalogues and indexes after data edits.
- `npm run verify`: normal checks with catalogue acceptance paused.

Generation still requires readable, structurally valid inputs. It no longer runs
automatic semantic repairs or AVoIP source rewrites. Comparison continues to use
the regenerated product facts and evidence. Role, topology, capacity, lifecycle
and unknown-evidence rules remain active; missing facts do not become verified
equivalence merely because acceptance gates are paused.

## Retained checks

`npm run test:catalogue` runs the current-data acceptance suites.
`npm run test:strict` runs all ordinary suites, including those acceptance suites.
The former verification chains remain available as `verify:data:strict`,
`verify:contract:strict` and `verify:build:strict`. `npm run verify:strict` combines
the full suite and former verification stages. The pause prints explicitly at the
start of the data stage — `npm run notice:data-revision`, which both
`verify:data` and `verify:data:strict` run — and it does not report that the
catalogue passed quality checks. The
reference-resolution, governance and generated-manifest guards still run in the
default `verify:data` lane, after that notice, and the room-template lifecycle,
realism and signal-path gates run in the default `verify:contract` lane, because
they protect the data a rep quotes rather than certifying the catalogue; the
acceptance suites stay strict-only.

Automatic governed-data, evidence-freshness and vendor-refresh workflow jobs are
paused unless repository variable `WINGMAN_ENABLE_DATA_GATES` is `true`.
Automatic Supabase jobs are paused unless `WINGMAN_ENABLE_SUPABASE_GATES` is
`true`. No live database contents or secrets are changed by this revision.

Evidence age is not one of the paused jobs. `check:competitor-evidence-aging`
runs inside both default data lanes and holds every competitor catalogue row to
the same 60-day warn and 120-day failure clock as a confirmed WyreStorm profile,
read from `data/governance/profile-confirmation-aging.json`. A paused refresh
job therefore cannot let a quoted competitor spec go quiet.

To restore remote persistence, configure `WINGMAN_STORAGE_MODE=supabase-tables`,
the Supabase credentials, and `WINGMAN_STORAGE_FAIL_CLOSED=true`. See
[Supabase setup](SUPABASE_SETUP.md) for the retained migration instructions.
The current Render defaults use file storage and do not request Supabase secrets.
