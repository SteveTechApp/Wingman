# UI Sizing And Scaling Audit

Generated: 2026-03-23

## Purpose

This report documents why Wingman currently feels oversized, where the size decisions are coming from, and what sizing system should replace the current mix of one-off values. It is focused on overall application scale, with special attention on the Guru helper because it has an outsized effect on how large the whole product feels.

## Executive Summary

Wingman feels bigger than it needs to be for three main reasons:

1. Shared sizing is controlled by multiple overlapping CSS layers instead of one scale system.
2. The main shell is very wide, so many controls stretch horizontally even when the user only needs to enter short text.
3. Guru uses its own large floating-panel geometry and its own inline CSS, so it does not inherit the calmer, slimmer shell sizing.

The highest-value fix is not a one-off CSS trim. Wingman needs a small set of sizing tokens and layout rules that distinguish between:

- workspace surfaces
- assistant/composer surfaces
- form fields by expected answer length
- desktop, tablet, and mobile breakpoints

## Current Sizing Structure

### 1. Shared shell sizing is duplicated

The main shell is primarily influenced by:

- `src/styles/wm-enterprise-pass.css`
- `src/styles/wm-consistency-pass.css`
- `src/app/shell/AppShell.tsx`
- `src/ui2/primitives/workspacePrimitives.tsx`

Important current values in `src/styles/wm-enterprise-pass.css`:

- top bar height starts at `64px`
- button height starts at `38px`
- input height starts at `40px`
- shell content max width starts at `1680px`
- nav width starts at `288px`

Later in the same file, the shell is redefined again:

- top bar becomes `clamp(68px, 5.6vw, 92px)`
- nav width becomes `clamp(248px, 15.5vw, 320px)`
- shell content becomes effectively full-width because `max-width` is removed

Result:

- there is no single source of truth for app scale
- some surfaces are slimmed down while others are re-expanded later
- the app can feel inconsistent from page to page

### 2. Responsive rules are fragmented

Current breakpoints are split across several values:

- `900px` in `AppShell.tsx`
- `720px` in `GuruPage.tsx`
- `1180px`, `980px`, `900px`, `760px`, `720px`, and others across CSS files

Result:

- layout mode changes do not line up
- a small laptop can feel like a desktop in one area and like a tablet in another
- Guru and the shell do not agree on when a layout should compact

### 3. Shared primitives are still sized with inline values

`src/ui2/primitives/workspacePrimitives.tsx` and `src/ui2/components/PageHeader.tsx` contain hard-coded paddings, radii, widths, and font sizes. Those values are not yet driven by a global density system.

This is not the main cause of oversizing, but it means a full refactor will remain slow until the primitives consume shared tokens instead of local pixel values.

## Guru Audit

Guru is the clearest example of the oversizing problem.

### Current Guru geometry

`src/features/guru/GuruPage.tsx` defines its own layout constants:

- floating panel default: `520 x 680`
- route panel default: `960 x 780`
- panel minimum: `360 x 420`
- launcher size: `54px`

The floating panel CSS reinforces those large defaults:

- width: `min(520px, calc(100vw - 24px))`
- height: `min(680px, calc(100dvh - 96px))`
- route minimum width: `520px`
- route minimum height: `520px`

On mobile Guru switches at `720px`, while the shell switches at `900px`.

### Why Guru feels too large

The actual panel size is only part of the issue. Guru also stacks several high-height sections:

- question textarea defaults to `4` rows in floating mode and `5` rows in route mode
- optional context also defaults to `5` rows
- quick asks render as a grid with `minmax(220px, 1fr)` cards
- support actions use a 4-column grid
- the primary action is full width and visually heavy
- explanation, answer, and history all exist as separate full blocks

This makes Guru read like a mini planning tool rather than a modern helper for short prompts.

### Why Guru matters beyond Guru

`AppShell.tsx` mounts `GuruFloatingHelper` globally. Because Guru is present across the product, its size strongly shapes the perceived scale of Wingman even when the current page is otherwise reasonable.

## Root Causes

### 1. Too many sizing authorities

Wingman currently has sizing decisions in:

- shell CSS
- consistency CSS
- inline component styles
- page-local styles
- Guru inline stylesheet strings

This makes it difficult to reliably make the app feel smaller without causing regressions.

### 2. Full-width is used where fit-content or max-content would be better

Many inputs, chips, and action groups default to `width: 100%` even when the task expects a short answer or single action. This creates broad empty regions and makes panels feel heavier than the information density actually requires.

### 3. No field-width model based on expected input length

Wingman treats short text, medium notes, and long-form text too similarly. A modern UI should visually communicate the expected answer length:

- short answer
- medium note
- long note
- document-style multi-line input

### 4. Assistant surfaces and workspace surfaces are not separated

A design canvas or product comparison page can justify larger working areas. A helper/composer surface should be noticeably tighter. Wingman currently uses similar scale logic for both.

## Recommended Target Sizing Model

### A. Create one sizing token layer

Add a dedicated sizing scale that all shared components consume first.

Recommended token families:

- `--wm-shell-max`
- `--wm-shell-nav-w`
- `--wm-control-h-xs`
- `--wm-control-h-sm`
- `--wm-control-h-md`
- `--wm-control-h-lg`
- `--wm-field-max-short`
- `--wm-field-max-medium`
- `--wm-field-max-long`
- `--wm-panel-max-assistant`
- `--wm-panel-max-workspace`
- `--wm-space-1` through `--wm-space-8`
- `--wm-radius-sm`, `--wm-radius-md`, `--wm-radius-lg`

### B. Use separate size modes by surface type

Recommended size modes:

- `workspace`
  - for planning, design, compare, catalog, and dashboards
- `assistant`
  - for Guru, command palette, support drawers, and short-prompt tools
- `form`
  - for discovery-style structured data entry

This avoids using large dashboard sizing for compact helpers.

## Target Metrics

### Shell and page containers

Recommended targets:

| Area | Current | Target |
| --- | --- | --- |
| Main content max width | `1680px` or full-width | `1360px` default, `1440px` max for dense workspace pages |
| Nav width | `288px` to `320px` | `248px` desktop, `72px` collapsed |
| Top bar height | `64px` to `92px` | `60px` desktop, `56px` tablet, `52px` mobile |
| Default page horizontal padding | mixed | `20px` desktop, `16px` tablet, `12px` mobile |

Notes:

- Full-width content should be reserved for specific design surfaces only.
- Most general Wingman pages will feel more modern if the content column stops sooner.

### Controls

Recommended targets:

| Control | Desktop | Tablet | Mobile |
| --- | --- | --- | --- |
| Secondary button | `34px` | `36px` | `40px` |
| Primary button | `36px` | `38px` | `42px` |
| Single-line input | `36px` | `38px` | `42px` |
| Filter pill / chip | `28px` | `30px` | `32px` |

Rule:

- do not use `44px+` controls unless touch-first behavior is required
- use larger controls on mobile only where tap accuracy matters

### Typography

Recommended targets:

| Text role | Desktop target |
| --- | --- |
| Page title | `28px` to `34px` |
| Section title | `18px` to `22px` |
| Card title | `14px` to `16px` |
| Body text | `13px` to `14px` |
| Support text | `11px` to `12px` |

Wingman should feel lighter mostly through proportion, not tiny text. The goal is better hierarchy and less padding, not aggressively shrinking readability.

### Field width by expected answer length

This is the most important structural change for modernizing forms and helpers.

Recommended classes or tokens:

| Field type | Target width |
| --- | --- |
| Short | `18ch` to `28ch` |
| Medium | `32ch` to `44ch` |
| Long | `52ch` to `72ch` |
| Full | only for search, multi-select, or document-style input |

Rules:

- short-answer inputs should not span the full card width by default
- long explanatory text should move to collapsible support panels
- textareas should auto-grow from a small base rather than start tall

## Guru Redesign Targets

### Floating Guru

Recommended default geometry:

- width: `420px` to `460px`
- height: `540px` to `600px`
- min width: `340px`
- min height: `420px`
- launcher size: `44px` to `48px`

Recommended content behavior:

- question input starts at `2` rows
- optional context is collapsed by default
- quick asks render as compact chips or a single-column short list
- explanation content moves behind a `More information` or `Why this answer` disclosure
- answer and history should not both be fully expanded by default

### Route Guru

Recommended default geometry:

- centered content max width: `680px` to `760px`
- not `960px`
- route content should read like an assistant page, not a design canvas

Recommended route structure:

1. compact header
2. question composer
3. answer area
4. optional details in collapsible sections

Recommended composer rules:

- question field max width: `44ch`
- context field max width: `60ch`
- primary action should fit the content area rather than dominate the full row unless on mobile

### Guru interaction density

Guru should optimize for short prompt, short answer, fast follow-up.

That means:

- smaller default panel
- fewer simultaneous sections
- narrower readable text column
- less visual emphasis on optional controls

## Breakpoint Strategy

Replace the current fragmented breakpoints with one consistent map:

| Mode | Width |
| --- | --- |
| Desktop wide | `>= 1440px` |
| Laptop / desktop | `1024px - 1439px` |
| Tablet | `700px - 1023px` |
| Mobile | `< 700px` |

Behavior by mode:

### Desktop wide

- allow workspace pages to expand to `1440px`
- keep assistant surfaces capped
- keep content centered with stronger max widths

### Laptop / desktop

- default design target for Wingman
- most pages should read comfortably on 13-inch and 14-inch laptops
- Guru floating helper should remain compact

### Tablet

- nav should become overlay or compact rail
- side-by-side card groups should collapse earlier
- buttons and fields increase slightly for touch
- Guru route should use a single-column assistant layout

### Mobile

- prioritize one-column reading flow
- use bottom-sheet or full-screen assistant patterns
- primary action can span full width
- inputs can become taller for touch, but the panel must become simpler, not denser

## Recommended Refactor Sequence

### Phase 1. Normalize the sizing tokens

- define the new size tokens in one place
- remove duplicate shell scale definitions
- stop overriding shell widths and heights in multiple CSS passes

### Phase 2. Move primitives onto the token system

- `workspacePrimitives.tsx`
- `PageHeader.tsx`
- shared buttons
- shared inputs

This creates a stable base before page-level cleanup.

### Phase 3. Rebuild Guru onto the shared assistant scale

- move Guru off the inline stylesheet string
- use shared tokens for panel width, height, spacing, and control heights
- reduce default rows and collapse optional sections
- align Guru breakpoint logic with the shell breakpoint system

### Phase 4. Audit all short-input workflows

Apply field-width rules to:

- Guru
- command palette
- discovery support inputs
- search bars
- modal forms
- note fields that are visually longer than the expected answer

### Phase 5. Page-by-page density pass

Focus next on:

- comparison pages
- catalog surfaces
- legacy tool pages with many full-width panels

## Acceptance Criteria

The sizing restructure is successful when the following are true:

- the app feels designed for laptops first, not large desktop monitors first
- short-answer inputs no longer stretch across wide cards by default
- Guru looks like a focused helper, not a second app inside the app
- desktop and tablet breakpoints transition consistently across shell and feature pages
- mobile layouts become simpler, not just scaled-down desktop layouts
- shared primitives own the default heights, widths, padding, and radii

## Immediate Implementation Priorities

If this turns into a build pass, the recommended order is:

1. Consolidate shell width, nav width, top bar height, and control heights.
2. Introduce field width tokens for short, medium, and long inputs.
3. Slim Guru floating and route layouts.
4. Convert explanation-heavy sections into collapsible support areas.
5. Audit remaining legacy pages for full-width controls that should be content-width instead.

## Bottom Line

Wingman does not mainly feel large because of dark styling. It feels large because the app combines wide containers, repeated shell overrides, large default helper geometry, and full-width controls for short tasks.

The most effective modernization move is to give Wingman a real sizing system with separate workspace and assistant scales, then rebuild Guru and short-input surfaces around that system.
