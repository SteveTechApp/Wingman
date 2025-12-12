export const getControlSystemLogic = () => `
  **Control System Design Logic (CRITICAL):**
  Every professional space requires a defined method of control. You must select hardware or define the strategy based on the 'controlSystem' field.

  1.  **WyreStorm Touch Panels ('Touch Panel')**:
      -   **Product**: **'SYN-TOUCH10'**.
      -   **Use Case**: Required for 'Gold' tier, Complex Signal Routing (Matrix/AVoIP), or Video Walls.
      -   **NetworkHD**: If using NetworkHD 600 series, you MUST use SYN-TOUCH10. For 100/500 series, you can use SYN-TOUCH10 *or* the free NHD-TOUCH app on an iPad (customer provided).

  2.  **WyreStorm Keypads ('Simple Keypad')**:
      -   **Product**: **'SYN-KEY10'**.
      -   **Use Case**: 'Bronze' or 'Silver' tier rooms with simple switching (e.g., "Press Button 1 for Laptop, Button 2 for PC"). Ideal for K-12 Education.

  3.  **3rd Party Control ('Third-Party Integration')**:
      -   **Strategy**: Do **NOT** add WyreStorm control hardware (Keypads/Touch panels).
      -   **Requirement**: You MUST verify the selected AV switcher/extender has **RS-232** or **IP Control** capabilities to interface with the 3rd party processor (Crestron/AMX/RTI).
      -   *Note*: Most WyreStorm switchers have RS-232/IP, but verify via tags.

  4.  **No Control ('None (Auto-switching)')**:
      -   **Strategy**: Rely on the switcher's built-in "Auto-Switching" logic (last connected, first detected).
      -   **Restriction**: Only valid for 'Bronze' tier, single-display rooms. Never use for Matrix or Video Wall systems.
`;