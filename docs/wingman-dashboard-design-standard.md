# Wingman Dashboard Design Standard

## Visual reference

The Dashboard page is the design guide for the wider Wingman app.

## Rules applied

- Pages use a clean hero section.
- Pages use a limited number of clear task cards.
- Buttons use rounded-corner rectangles, not oval/pill shapes.
- Information should be collapsed unless it is part of the current task.
- Cards have visible depth but should not create excessive visual noise.
- Primary actions use amber.
- Secondary actions use dark translucent panels.
- Proposal document preview is exempt and remains a readable white document surface.

## Pages affected by CSS authority layer

- Dashboard
- Discovery
- Guided Discovery
- Sales Language
- Support
- Proposal
- Older pages using PageHero / SectionCard patterns

## Next pages to structurally simplify

### Product Finder

Recommended first screen:
- Search by SKU
- Search by I/O
- Search by product family
- Search from Guided Discovery
- Search by feature

Product results should remain hidden until the user chooses a route.

### Compare

Recommended first screen:
- Competitor brand
- Competitor SKU
- Product role
- Must-match features

Only then show WyreStorm fit.

### Video Wall

Recommended first screen:
- LCD wall
- LED wall
- Multiview
- One image across wall
- Independent content

Then open a focused wizard.

### Room Templates

Template cards are useful and should remain visible, but selected template detail should open in a focused panel or modal.