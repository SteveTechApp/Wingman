# Wingman Dashboard Menu Layout Repair

## Issue

The dashboard workflow menu was functionally correct but visually regressed:

- card text was squeezed into narrow columns;
- headings floated too far away from their card groups;
- secondary cards felt too tall and sparse;
- Guru visually intruded into the workflow area.

## Fix

- Repaired card grid layout.
- Prevented forced narrow text wrapping.
- Rebalanced primary and secondary workflow card sizes.
- Kept Guru anchored to the lower-right corner.
- Added a layout density guard.

## Rule

Dashboard should be a clear workflow menu, not a sparse card wall.