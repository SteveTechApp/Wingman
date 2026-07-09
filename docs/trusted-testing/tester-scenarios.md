# Trusted tester scenarios

## Scenario 1 — Sports bar / hospitality

Customer input:

> We need a sports bar with 8 TVs, Sky boxes, signage and staff-friendly control.

Tester checks:

- Does Wingman ask source and display count questions?
- Does it consider matrix versus NetworkHD 100?
- Does it ask about control usability?
- Does it avoid jumping to premium AVoIP without justification?
- Does it show missing information before proposal?

Expected safe direction:

- contained venue: matrix or kit direction may be suitable;
- flexible/expandable venue: NetworkHD 100 may be suitable;
- control and staff operation must be clarified.

---

## Scenario 2 — BYOD boardroom

Customer input:

> We need a boardroom for laptop presentation, video calls, USB camera and room audio.

Tester checks:

- Does Wingman identify BYOD/BYOM?
- Does it include USB path requirements?
- Does it avoid HDMI-only recommendations?
- Does it ask about camera, microphone, speaker and display ownership?
- Does it mark missing information clearly?

Expected safe direction:

- meeting-room presentation/UC product direction;
- USB-C and USB transport considered;
- proposal should not be quote-final without room details.

---

## Scenario 3 — Education classroom

Customer input:

> Standard classroom with teacher laptop, display or projector, optional room USB and simple operation.

Tester checks:

- Does Wingman identify classroom/teaching space?
- Does it ask about display, source count and USB?
- Does it avoid over-specifying AVoIP?
- Does it suggest a simple architecture where appropriate?

Expected safe direction:

- presentation switcher or education switcher direction;
- USB and control considered only where relevant.

---

## Scenario 4 — LCD video wall

Customer input:

> Four-screen LCD wall for signage and occasional live source display.

Tester checks:

- Does Wingman ask wall size and behaviour?
- Does it separate full-canvas, per-screen content and multiview?
- Does it consider dedicated video wall processor options?
- Does it avoid assuming AVoIP is automatically best?

Expected safe direction:

- SW-0204-VW or SW-0206-VW considered for simple/dedicated wall processing;
- AVoIP only where routing/flexibility justifies it.

---

## Scenario 5 — Competitor compare guardrail

Customer input:

> Compare a competitor encoder/transmitter product.

Tester checks:

- Does Compare keep encoder/transmitter products separate from decoders?
- Does it identify product class before suggesting WyreStorm alternatives?
- Does it show matched and unmatched points?
- Does it avoid unsupported direct-equivalent claims?

Expected safe direction:

- same product class first;
- architecture alternative only if clearly labelled.