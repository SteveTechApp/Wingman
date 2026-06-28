# Source catalogue hygiene CSV corrections - 2026-06-28

Purpose: correct source CSV rows that were previously excluded from product-story coverage as source-hygiene issues.

## Changes

- lifecycle.csv: HALO-WFA-130 -> review / review - polluted FOCUS-100 webcam copy
- lifecycle.csv: HALO-WFA-290 -> review / review - polluted FOCUS-100 webcam copy
- lifecycle.csv: MV-0401-PRO -> review / review - invalid WyreStorm SKU - correct multiview SKU is NHD-0401-MV
- lifecycle.csv: MXV-0606-H2A-70 -> review / review - receiver companion source contamination - not a clean matrix lead story
- lifecycle.csv: NHD-124-RACK-1U -> active / active - rack accessory dependency remains active; products.csv keeps it rack-mount / request-only so it is not treated as a lead story
- lifecycle.csv: NHD-500-E -> review / review - parent range row - exact NHD-500-E-RX and NHD-500-E-TX rows should carry endpoint stories
- lifecycle.csv: SW-0X01-8K -> review / review - range page - not an exact saleable lead-story SKU
- lifecycle.csv: SW-130-TX -> review / review - polluted RX-500 receiver copy and URL
- products.csv: HALO-WFA-130 -> review-required / review - polluted FOCUS-100 webcam copy
- products.csv: HALO-WFA-290 -> review-required / review - polluted FOCUS-100 webcam copy
- products.csv: MV-0401-PRO -> review-required / review - invalid WyreStorm SKU - correct multiview SKU is NHD-0401-MV
- products.csv: MXV-0606-H2A-70 -> review-required / review - receiver companion source contamination - not a clean matrix lead story
- products.csv: NHD-124-RACK-1U -> rack-mount / active - rack accessory dependency - not a lead product story
- products.csv: NHD-500-E -> review-required / review - parent range row - exact NHD-500-E-RX and NHD-500-E-TX rows should carry endpoint stories
- products.csv: SW-0X01-8K -> review-required / review - range page - not an exact saleable lead-story SKU
- products.csv: SW-130-TX -> review-required / review - polluted RX-500 receiver copy and URL
