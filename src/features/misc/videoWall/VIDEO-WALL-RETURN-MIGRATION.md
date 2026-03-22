# Video Wall Planner - Return Migration

## Objective
Replace the current large return block inside VideoWallPlannerPage.tsx with the shell host block.

## File generated
- src/features/misc/videoWall/VideoWallShellHostBlock.tsx.txt

## Safer migration method

1. Open src/features/misc/VideoWallPlannerPage.tsx
2. Open src/features/misc/videoWall/VideoWallShellHostBlock.tsx.txt
3. Replace only the main return block with the host block file content
4. Run npm run typecheck