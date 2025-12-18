# Wingman AI Analyst Integration Update

## Overview

This update integrates the comprehensive AV Technical Reference into Wingman's AI Analyst, enabling intelligent product selection, automatic validation, and cable routing recommendations.

## Files Changed

### 1. `src/services/smartDesignService.ts` (NEW)
A new service that provides:
- **Design Validation**: Checks for EOL products, NHD controller requirements, series mixing violations
- **Signal Path Analysis**: Recommends HDBaseT vs AVoIP based on distance
- **Cable Recommendations**: Auto-generates cable specs based on IO points
- **Product Selection Helpers**: Maps generic terms to WyreStorm products

### 2. `src/services/prompts/designRoomPrompt.ts` (UPDATED)
Enhanced with:
- Direct import of `av-technical-reference.json`
- New `getWyrestormRules()` function with critical NHD rules
- New `getAVoIPNetworkRules()` function with network requirements
- Signal distribution analysis based on max cable distance
- Improved output format with explicit validation requirements

### 3. `src/services/roomDesignerService.ts` (UPDATED)
Enhanced with:
- Import of `smartDesignService` for post-design validation
- Auto-enhancement of designs (adds missing NHD controller)
- Validation result logging to console
- Returns validation info with design result

### 4. `src/hooks/useProjectGeneration.ts` (UPDATED)
Fixed:
- Corrected `analyzeRequirements()` call to match function signature (2 params, not 3)
- Improved debug logging emoji

## Installation

1. **Copy files to your Wingman project:**
   ```
   wingman-updates/
   ├── services/
   │   ├── smartDesignService.ts      → src/services/
   │   ├── roomDesignerService.ts     → src/services/
   │   └── prompts/
   │       └── designRoomPrompt.ts    → src/services/prompts/
   └── hooks/
       └── useProjectGeneration.ts    → src/hooks/
   ```

2. **Verify existing files are present:**
   - `src/data/av-technical-reference.json` (should already exist)
   - `src/data/av-types.ts` (should already exist)

3. **Rebuild the project:**
   ```bash
   npm run build
   ```

## How It Works

### AI Prompt Enhancement
The design prompt now includes:
1. **Signal Distribution Analysis**: Calculates max distance from IO points
2. **Critical WyreStorm Rules**: NHD controller requirement, EOL products, series selection
3. **HDBaseT Distance Limits**: Resolution and cable type combinations
4. **AVoIP Network Requirements**: Bandwidth and switch feature requirements

### Post-Design Validation
After AI generates a design, `smartDesignService` validates:
1. **EOL Check**: Flags NHD-200/400 series products
2. **NHD Controller**: Auto-adds `NHD-CTL-PRO` if missing
3. **Series Mixing**: Prevents combining different NHD series
4. **Distance Limits**: Validates HDBaseT runs against cable type

### Example Validation Output
```javascript
{
  isValid: true,
  errors: [],
  warnings: [
    {
      code: 'USB_NEEDS_EXTENSION',
      message: 'Display 1: 45m USB run needs USB-over-Ethernet extender',
      severity: 'warning',
      suggestion: 'Consider USB-over-Ethernet extender for runs >30m'
    }
  ]
}
```

## Key Functions

### `validateDesign(equipment, ioPoints)`
Validates a design against WyreStorm rules.

### `analyzeSignalPath(distance, resolution, hasUSB, hasControl)`
Recommends distribution technology (direct/HDBaseT/AVoIP).

### `generateCableRecommendations(room, equipment)`
Auto-generates cable specs with routing overhead.

### `selectNhdSeries(requirements)`
Selects appropriate NHD series based on tier, resolution, latency.

### `enhanceDesignWithTechnicalReference(room, equipment, productDatabase)`
Full enhancement pipeline: validation, auto-additions, cable generation.

## Testing

1. Create a new project via AI Analyst with text like:
   ```
   Conference room for 12 people
   Two 75" displays 40m from rack
   Video conferencing with ceiling mic
   HDMI and USB-C inputs at table
   ```

2. Check console for:
   - `🔍 AI Extracted Requirements: {...}`
   - Validation warnings/errors
   - Auto-added items

3. Verify the design includes:
   - `NHD-CTL-PRO` if any NHD products used
   - No EOL products (NHD-200/400)
   - Appropriate products for 40m distance (HDBaseT or AVoIP)

## Future Enhancements

- [ ] Display validation warnings in UI
- [ ] Cable schedule export
- [ ] Cost estimation integration
- [ ] Network topology diagram generation
