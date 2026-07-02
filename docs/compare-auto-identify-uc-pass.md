# Compare auto-identification UC pass

Installed: 20260701-163338

## Purpose

The Compare page now has a simplified default lane:

1. User enters a brand, model, SKU or rough customer phrase.
2. Wingman identifies the likely competitor product.
3. Wingman explains the competitor product type, purpose and key checks.
4. Wingman selects the WyreStorm match lane automatically.
5. Advanced/manual Compare remains available behind the manual compare button.

## New files

- src/wingman2/data/ucCompetitorProducts.ts
- src/wingman2/lib/compareAutoIdentify.ts
- src/wingman2/components/CompareAutoIdentifyPanel.tsx
- src/wingman2/lib/compareAutoIdentify.test.ts

## Main behaviours

- Poly X52 -> HP Poly Studio X52 -> UC room appliance / video bar
- Logitech Rally Camera -> PTZ camera lane
- Yealink A30 -> Yealink MeetingBar A30 -> appliance workflow warning
- Huddly IQ -> fixed camera-only lane
- Jabra PanaCast 50 -> UC video bar lane

## Safety rules

- UC products do not match against matrices, extenders or AVoIP endpoints.
- Camera-only products do not match as full soundbars.
- Native appliance products show BYOD/appliance warnings.
- Existing advanced Compare page is preserved as the advanced/manual mode.

## Backup

Backup folder:

C:\Users\steve\wingman\_wingman_backup_compare_auto_identify_20260701-163338