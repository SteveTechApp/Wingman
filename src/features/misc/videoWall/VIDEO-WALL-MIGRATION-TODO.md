# Video Wall Planner Migration TODO

## Imports added
- VideoWallSolutionShell
- VideoWallStepSection

## State added
- activeTab / setActiveTab

## Components created
- src/features/misc/videoWall/VideoWallSolutionShell.tsx
- src/features/misc/videoWall/VideoWallStepSection.tsx

## Next manual step in VideoWallPlannerPage.tsx
Replace the existing large page return with a VideoWallSolutionShell wrapper.

## Suggested mappings
- renderWallFormatControls(): wall type, rows, cols, bezel, display size
- renderContentControls(): source count, multiview, content type
- renderPerformanceControls(): resolution, latency, architecture preference
- renderAdvancedControls(): bandwidth mode, processor/addressed wall detail

- renderOverviewTab(): summary, fit, constraints
- renderBomTab(): starter BOM, quantities, accessories
- renderSignalTab(): routing logic, source/display relationship
- renderTechnicalTab(): engineering detail and assumptions

- renderWallPreview(): existing visual wall preview