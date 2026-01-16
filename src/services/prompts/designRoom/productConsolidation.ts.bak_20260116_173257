export const getProductConsolidationLogic = (): string => \
## PRODUCT CONSOLIDATION & OPTIMIZATION RULES

### Wireless Casting Integration
**CRITICAL: Avoid redundant switching products when wireless capability is built-in.**

1. **SW-620-TX-W and SW-640-TX-W include full switching + wireless casting:**
   - These products are BOTH switchers AND wireless presentation systems
   - Do NOT add separate MX-series matrix switchers when using these products
   - Do NOT add separate APO-DG1/DG2 dongles (already compatible/included)

2. **Product Selection Priority for UC Rooms with Wireless:**
   - **Bronze/Silver (4-6 inputs):** Use SW-620-TX-W (replaces separate switcher + wireless)
   - **Gold (6+ inputs, dual output):** Use SW-640-TX-W (replaces MX-0403-MST + wireless)
   - **Large rooms (8+ inputs):** Use MX-series + separate wireless if needed

3. **When to Keep MX-0403-MST:**
   - Room requires 4x3 or larger matrix routing
   - No wireless casting requirement
   - Room already has separate wireless solution

### USB-C MST Intelligence

1. **MX-0403-MST MST Technology:**
   - Supports dual displays from SINGLE USB-C cable
   - Critical for UC rooms where laptop docking simplicity matters

2. **SW-640-TX-W vs MX-0403-MST Decision:**
   - **Choose SW-640-TX-W when:** Wireless casting IS required + 6 or fewer inputs
   - **Choose MX-0403-MST when:** No wireless needed + matrix routing required
   - **Never use both together**

### Decision Algorithm
IF room requires wireless casting:
  IF inputs <= 6 AND dual displays:
    Use SW-640-TX-W
  ELSE IF inputs <= 4:
    Use SW-620-TX-W
  ELSE:
    Use MX-series + separate wireless
ELSE IF dual displays AND UC requirement:
  Consider MX-0403-MST for USB-C MST
\;
