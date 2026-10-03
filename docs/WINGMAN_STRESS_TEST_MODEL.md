# Wingman stress test and visual model strategy

This document defines a repeatable stress/integrity test layer for Wingman. It checks product data quality, AV recommendation accuracy, frontend safety, project sync fallback behaviour, and readiness for visual system models.

## Discovery to recommendation data flow

```mermaid
flowchart LR
  A["Discovery answers"] --> B["Discovery state"]
  B --> C["Architecture inference"]
  C --> D["Finder need"]
  D --> E["Product matching engine"]
  E --> F["Recommendations"]
  E --> G["Evidence / cautions / assumptions"]
  F --> H["Project store"]
  G --> H
  H --> I["Proposal builder"]
  H --> J["Visual system model"]
```

## Technical stress surfaces

```mermaid
flowchart TB
  U["Browser UI"] --> F["Forms and filters"]
  F --> P["Product Finder"]
  P --> D["Product data"]
  P --> S["Project store"]
  S --> API["/api/wingman/projects"]
  API --> B["Backend"]

  X1["Duplicate form IDs"] --> F
  X2["Malformed data"] --> D
  X3["Unsigned session"] --> API
  X4["Unsafe HTML"] --> U
```

## Visual system model pipeline

```mermaid
flowchart LR
  A["Sources"] --> B["Signal paths"]
  B --> C["Transport"]
  C --> D["Displays"]
  D --> E["USB / audio / control overlays"]
  E --> F["Diagram model"]
  F --> G["Customer schematic"]
  F --> H["Technical validation checklist"]
```

## Known AV accuracy checks

The stress layer should flag:

- incorrect `MHD-0401-MV` references
- missing `NHD-0401-MV`
- missing `NHD-150-RX`
- missing `NHD-128-NDI-TRX`
- missing `SW-0204-VW`
- missing `SW-0206-VW`
- obvious scraped product-data noise
- unsafe frontend HTML patterns
- duplicate literal form field IDs
- missing local project-store fallback behaviour
