# Cable Routing Refactoring Guide

## Overview
The `cableRouting.ts` file (552 lines) has been split into 8 focused modules, each under 100 lines.

---

## File Structure

### Before (1 file)
```
src/utils/cableRouting.ts (552 lines)
```

### After (8 files in cableRouting/ folder)
```
src/utils/cableRouting/
├── types.ts (40 lines) - Type definitions
├── cableSpecs.ts (68 lines) - Cable specifications and constants
├── distanceCalculator.ts (56 lines) - Distance calculation logic
├── cableTypeSelector.ts (71 lines) - Cable type selection logic
├── technologyAnalyzer.ts (99 lines) - Technology requirements analysis
├── roomCableRouter.ts (96 lines) - Room routing orchestration
├── costCalculator.ts (76 lines) - Cost calculation utilities
└── index.ts (28 lines) - Public API exports
```

**Total: 534 lines** (slightly less due to removing duplicate imports)

---

## Migration Steps

### Step 1: Create the Folder Structure
```bash
mkdir src\utils\cableRouting
```

### Step 2: Copy the New Files
Copy all 8 files from the `refactored-cables/cableRouting/` folder into `src/utils/cableRouting/`

### Step 3: Update Imports
Find all files that import from the old `cableRouting.ts`:

**Old import:**
```typescript
import { 
  calculateCableDistance, 
  determineCableType,
  calculateRoomCableRoutes,
  // etc.
} from '../utils/cableRouting';
```

**New import:**
```typescript
import { 
  calculateCableDistance, 
  determineCableType,
  calculateRoomCableRoutes,
  // etc.
} from '../utils/cableRouting';  // Same path!
```

**Good news:** The import path stays the same! The `/index.ts` file handles all exports.

### Step 4: Delete Old File
Once verified everything works:
```bash
del src\utils\cableRouting.ts
```

---

## Benefits

### 1. Better Organization
- **types.ts** - All type definitions in one place
- **cableSpecs.ts** - Cable specifications separate from logic
- **distanceCalculator.ts** - Pure calculation functions
- **cableTypeSelector.ts** - Selection logic isolated
- **technologyAnalyzer.ts** - Technology analysis separate
- **roomCableRouter.ts** - High-level routing orchestration
- **costCalculator.ts** - Cost calculations separate
- **index.ts** - Clean public API

### 2. Easier Testing
Each module can be tested independently:
```typescript
// Test just distance calculations
import { calculateCableDistance } from './distanceCalculator';

// Test just cable selection
import { determineCableType } from './cableTypeSelector';
```

### 3. Better Performance
- **Smaller modules** = faster HMR during development
- **Tree-shaking** = only import what you need
- **Lazy loading** = load modules on demand

### 4. Easier Maintenance
- **Find code faster** - clear module names
- **Modify safely** - changes are isolated
- **Add features easily** - clear where new code belongs

---

## API Compatibility

✅ **100% Backward Compatible** - All existing code continues to work!

The `index.ts` re-exports everything, so your existing imports don't break:

```typescript
// This still works exactly as before:
import { 
  calculateCableDistance,
  determineCableType,
  analyzeTechnologyRequirements,
  calculateRoomCableRoutes,
  compareTechnologyCosts,
  calculateTotalCableCosts,
  getCableSpecs
} from '../utils/cableRouting';
```

---

## File Sizes

| File | Lines | Purpose |
|------|-------|---------|
| types.ts | 40 | Type definitions |
| cableSpecs.ts | 68 | Cable specifications |
| distanceCalculator.ts | 56 | Distance calculations |
| cableTypeSelector.ts | 71 | Cable type selection |
| technologyAnalyzer.ts | 99 | Technology analysis |
| roomCableRouter.ts | 96 | Room routing logic |
| costCalculator.ts | 76 | Cost calculations |
| index.ts | 28 | Public exports |
| **Total** | **534** | **8 focused modules** |

All files now under 100 lines! ✅

---

## Testing

After migration, verify everything works:

```bash
npm run dev
```

Test cable routing functionality in your app to ensure all imports resolve correctly.

---

## Rollback

If needed, the original `cableRouting.ts` is in your Git history:
```bash
git checkout HEAD~1 -- src/utils/cableRouting.ts
```

---

## Next Steps

Consider splitting other large files:
1. `Room3DViewerAdvanced.tsx` (413 lines)
2. `GuidedProjectWizard.tsx` (423 lines)
3. `TechnologySpecAnalyzer.tsx` (359 lines)
