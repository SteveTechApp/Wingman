# Videowall Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Restore the videowall builder with current, source-linked WyreStorm architecture choices for LCD, LED processor inputs and projection.
**Architecture:** A pure recommendation module owns capabilities and compatibility. A React workspace gathers requirements, compares alternatives and saves the chosen direction through the existing project API. Small entry links restore discoverability without changing the route registry.
**Tech Stack:** React, TypeScript, CSS, Vitest, Playwright.
**Spec:** docs/superpowers/plans/2026-10-13-videowall-spec.md

## Global Constraints
- Preserve the existing route and project save contract.
- Verify technical claims against official manufacturer pages, dated 13 October 2026.
- Worktree edits must be copied to main and verified byte-identical.
- Use strict tsconfig.typecheck.json and meaningful capacity/compatibility tests.

### Task 1: Evidence-backed decision model
Files: src/wingman2/lib/videowallOptions.ts and videowallOptions.test.ts; docs/VIDEOWALL_OPTIONS.md.
- [x] Define application, source count, simultaneous windows, resolution, layout, array and network inputs; reject invalid counts.
- [x] Implement assessVideowallOptions(requirements): options with fit status, blockers, equipment quantities, signal path and official sources.
- [x] Test matrix I/O limits, direct/looped separation, 4K30 versus 1080p NHD-150 window limits, network mismatch, and unsupported combinations.
- [x] Record research, discontinued exclusions and commissioning boundaries.

### Task 2: Builder and project integration
Files: src/wingman2/pages/VideowallBuilderPage.tsx; components/VideowallPreview.tsx; styles/videowall-builder.css; features/projects/commands/discoveryCommands.ts.
- [x] Replace stale inline direction logic with the decision module, numeric inputs, selectable options and preview.
- [x] Keep unsupported options visible with reasons; disable saving unsupported/invalid choices.
- [x] Preserve selected equipment quantities in project selections and replace prior builder selections when changing architecture.
- [x] Retain copy summary, save, proposal handoff, and local draft resume.
- [x] Test project quantities and architecture replacement.

### Task 3: Entry points and verification
Files: pages/TemplatesPage.tsx, pages/OpportunitiesPage.tsx, pages/DashboardPage.tsx, components/GuidedDashboard.tsx.
- [x] Add builder links to home and Opportunity entry points in both modes.
- [x] Sync touched files to main after preserving its current versions.
- [x] Run strict typecheck, focused Vitest suites and build.
- [x] Verify browser navigation, all four applications, layout preview, incompatible save blocking, save/resume, and mobile overflow; inspect desktop screenshot.
