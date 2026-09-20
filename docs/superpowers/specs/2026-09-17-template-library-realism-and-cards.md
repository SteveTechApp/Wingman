# Template Library Realism and Card Refactor Specification

## Objective

Turn the template library from a dense catalogue of token-looking cards into a decision-support surface where a salesperson can identify the room, understand the intended experience, see the design scale, and trust that the starting BOM represents a considered real-world AV application.

## Current-state findings

- The library contains 55 templates spanning 14 authored vertical labels and 12 canonical market filters.
- All 40 distinct WyreStorm SKUs referenced by templates currently resolve in `public/product-intelligence-index.json`.
- Three templates contain no `Required` WyreStorm row: `corporate-training-suite-matrix-uc`, `hospitality-restaurant-bar-matrix`, and `government-courtroom-hearing-room-matrix`.
- The default All-markets view renders text-only tiles and loads the template image with the `hidden` attribute. Filtered cards constrain the image to a 70px strip and hide the purpose text behind an information tooltip.
- Only a small shared photo set is used for 55 applications. Keyword matching sends several materially different applications to the same image, while unmatched applications fall back to a boardroom image.
- `withRequiredRoomElements` appends a nearly universal third-party checklist. That is useful for project completeness, but it makes small signage, huddle, classroom, hospitality, clinical, and control-room designs look structurally alike and can imply microphones, DSP, speakers, or control where they are not part of the selected application.
- Authored market values still include legacy `Venue` and `Transport` labels that are normalized only at filter time.

## Product requirements

### Library cards

- Use the application photo as the dominant card region in both All and filtered views.
- Keep the room name, canonical market, scale, and a two-line application description visible without hover.
- Add compact, factual design signals: required WyreStorm SKU count, output/end-point quantity, and architecture family where those facts can be derived reliably.
- Keep one primary action (`Review design`) and one secondary action (`Personalise`) visible and keyboard accessible.
- Do not reveal essential information only through a tooltip or hover state.
- Use one reusable card component for All, filtered, and custom-template results.

### Template detail page

- Add an application hero with the same image, visible summary, scale, market, architecture family, and compact system quantities.
- The Overview tab must explain the user journey, room/application purpose, sizing basis, architecture, and explicit boundary between WyreStorm and third-party scope.
- Equipment remains editable and retains Required / Validate / Optional / Third-party grouping.

### Template realism and governance

- Every published template must declare an `applicationProfile` containing user journey, sizing basis, architecture family, environment constraints, and explicit inclusions/exclusions.
- Every template must have at least one required governed WyreStorm row unless it is deliberately labelled `concept-only`; no current published template should remain concept-only.
- Quantities must be traceable to an authored sizing statement (for example, four sources and three displays) rather than a generic market assumption.
- Third-party rows must be selected by application capability profile, not appended universally. Signage without audio must not imply microphones or DSP; an integrated huddle bar must not duplicate fulfilled camera/audio roles; control-room templates must include resilience/network validation; clinical templates must include infection-control/privacy validation where applicable.
- Required and optional SKUs must resolve in the active governed catalogue. Suppressed or lifecycle-blocked products fail publication validation.
- Market names must use the canonical filter values at source.
- Each template receives a review status (`reviewed`, `needs-review`) and concise review notes; the library may only present `reviewed` templates as ready to configure.

### Images

- Replace keyword-only fallback selection with an explicit image key on each application profile.
- Reuse an image only when it depicts the same room workflow; otherwise add an application-specific asset or mark the template as needing visual review.
- Images are decorative when adjacent text names the room, but must use a stable aspect ratio, useful crop, lazy loading, and a gradient treatment that preserves text contrast.

## Verification

- Unit tests enforce catalogue SKU resolution, canonical markets, required-row presence, explicit sizing basis, capability-appropriate third-party scope, and an explicit image key for all published templates.
- Rendered tests confirm that All and filtered cards expose image, summary, scale, design signals, and actions without hover.
- Detail-page tests confirm that the same governed application profile appears in the hero and Overview content.
- Desktop and mobile visual checks cover All, Corporate, Education, Hospitality, Healthcare, Government, Control Rooms, and a custom-template view.

## Design direction

- Palette: existing Wingman navy surfaces (`#061421`, `#0b2034`), readable white (`#f4f8fc`), supporting slate (`#9db0c3`), and the existing market accent colours.
- Type: retain the product's display/body stack; use the existing utility face for counts and architecture labels.
- Layout: a photographic application plate, followed by an always-visible description and a narrow factual design strip.
- Signature: each card reads like a miniature AV design brief rather than a category tile.
