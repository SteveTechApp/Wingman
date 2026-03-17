# Competitor Server Modules

Canonical server layout:

- `../competitor-lookup-server.mjs`: HTTP entrypoint for the local Wingman server.
- `live-lookup.mjs`: vendor page fetch and lightweight page summarisation.
- `resolve-match.mjs`: resolve-and-rank helper for competitor to WyreStorm matching.

Compatibility shims remain at:

- `server/competitor-live-lookup.mjs`
- `server/competitor-resolve-match.mjs`

Keep new competitor server helpers inside this folder unless they are top-level HTTP entrypoints.
