# Wingman Deployment Notes

This document records the root-level deployment entry point expected by the Wingman documentation contract.

## Build validation

Before deployment, run the full verification chain:

npm run verify

At minimum, deployment candidates must pass:

npm run typecheck
npm run build

## Data preparation

The production build compiles canonical product data before Vite builds the application. This prevents deployment from relying on ignored runtime-generated catalogue files.

## Environment

Deployment configuration should preserve compiled source data and avoid mounting a volume over the full application data directory.

Runtime project data should be stored separately from compiled catalogue data.

## Security

Security issues should be handled privately through the project security process rather than public issue threads.
