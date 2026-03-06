import * as React from "react";


export const getDesignMinimalismRules = (): string => `
## DESIGN MINIMALISM & COST OPTIMIZATION

### Core Principle: Maximum Functionality, Minimum Products

**CRITICAL: Every product must justify its inclusion. Default to simpler solutions.**

### Product Selection Hierarchy

1. **All-in-One > Separate Components**
   - Soundbar (VX20) > Separate camera + mic + speaker
   - Integrated switcher > Switcher + separate wireless device
   - MST switcher > Multiple cables/adapters

2. **Consolidation Rules**
   - If one product can do the job of two ? Use one product
   - If wireless switcher has built-in casting ? Don't add separate casting device
   - If soundbar covers audio + video ? Don't add separate components

3. **Tier-Based Complexity Limits**
   - **Bronze**: 5-8 core products maximum
   - **Silver**: 8-12 core products maximum  
   - **Gold**: 12-15 core products maximum
   - Cables/accessories don't count toward limit

### Common Over-Specification Errors

? **TOO MANY**: Switcher + Encoder + Decoder + Wireless + Control Hub + Audio Processor + ...
? **RIGHT**: Integrated switcher with wireless + displays + soundbar + control

? **TOO MANY**: Separate camera + mic hub + mics + DSP + amp + speakers + cables
? **RIGHT**: VX20 soundbar (camera + mics + speakers in one) for small rooms

### Room Size Guidelines

**Small Room (4-8 people)**
- Soundbar (VX20/VX10) covers camera + audio
- Simple switcher or direct connection
- 3-5 core products total

**Medium Room (8-16 people)**  
- Separate camera + ceiling mics + amp + speakers
- Presentation switcher
- 6-10 core products total

**Large Room (16+ people)**
- Full AVoIP or matrix distribution
- Multiple cameras/mics
- 10-15 core products total

### Before Adding Each Product Ask:
1. Can an existing selected product do this job?
2. Is there an all-in-one alternative?
3. Does this directly serve a stated requirement?
4. Would the room function without it?

**If unsure ? Don't add it. Simple is better.**
`;



