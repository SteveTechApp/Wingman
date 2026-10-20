# Container stack verification — 19 October 2026

Tested the local Compose stack from this worktree, serving nginx on port 3100
and the API on port 8788. The final backend runs Node 22.23.3.

## Repairs made during verification

- Updated both Dockerfiles from Node 20 to Node 22 to meet installed dependency requirements and match CI.
- Changed the container and startup-helper health checks to `/api/ready`. The previous product-intelligence endpoint requires authentication in production and returned HTTP 401.
- Preserved the backend's `server/` directory inside the image. Flattening it made catalogue paths resolve under `/data` and runtime writes miss the volume at `/app/data/runtime`.
- Excluded local runtime data from image layers and removed Compose's obsolete `version` field.

## Verified

- Both images build, including clean dependency installation and the compiled Tailwind check.
- Frontend, direct API readiness, and nginx-proxied API readiness return HTTP 200.
- Production CSS is linked and served as CSS; nginx configuration validation passes.
- Backend reports healthy and resolves its catalogue and runtime paths under `/app`.
- A container-targeted adaptation of the existing browser smoke walkthrough passes workspace sign-in, 24 discovery answers, project save, comparison history save, HTML and CSV exports, and oversized-request HTTP 413 handling.
- Saved accounts and project state have the same SHA-256 digest before and after replacing both containers with `compose up --force-recreate`.
- Both Docker helper unit tests and `git diff --check` pass.

The temporary browser harness was removed after testing. The test workspace
remains in the local Docker volume; the stack was left running for inspection.
No external deployment, email delivery, or live-provider integration was tested.
