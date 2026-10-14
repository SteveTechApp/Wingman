# Product positioning language audit — 5 October 2026

Scope: Product Positioning page, its shared guidance generator, view-mode behavior and rendered tests. Product specifications were taken from existing records; this audit does not independently certify every catalogue claim.

| Finding | User impact | Change |
| --- | --- | --- |
| Outcome, customer problem and proof repeated across summary and conversation anchors | Longer page without additional facts | Removed conversation anchors and the repeated problem panel |
| Best-fit template used the active project room name | Standalone product could appear suitable for an unrelated saved project | Applications now come from product/positioning records; removed automatic project-context lookup |
| General-role fallback referred to the current record without explaining a function | No usable sales guidance | Removed that circular wording from the fallback |
| Both view modes rendered the same page | Focused users met technical vocabulary; experts had to expand hidden detail | Focused shows essentials, applications, confirmation and exclusions; Expert shows role, capabilities, connections, limits, system checks and technical tabs |
| Feature-card title repeated a shortened version of its own body | Redundant text and clipped claims | One complete feature-benefit list |
| Confirmation text assumed an application and asked whether its own assumption was correct | Encouraged agreement without checking facts | Direct confirmation instruction independent of project context |
| Word-count truncation cut positioning statements mid-sentence | Lost qualifications and conditions | Full sentences in overview and feature content |
| Expert technical material sat inside a collapsed disclosure | Technical reference was hidden | Capabilities and connections visible on overview; full specifications available in their tab |

Editorial rules: state one product-specific fact per item; name documented applications; keep specifications and limitations intact; avoid instruction about how to speak; show each statement once; do not infer suitability from an active project; retain evidence and lifecycle warnings in both views.

Remaining data consideration: catalogue-authored descriptions, generated narratives, technology comparisons and printable cheat sheets still depend on their underlying records. Review claims against the exact SKU's approved evidence when maintaining those records. An interface rewrite does not validate interoperability, certification or performance claims across the catalogue.

Validation: rendered tests cover differing views, switching from a technical tab into Focused mode, standalone applications and retained safety guidance. Build and strict typecheck run separately.
