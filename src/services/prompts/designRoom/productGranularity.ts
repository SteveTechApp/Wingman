
export const getProductGranularity = () => `
  **Product Granularity & Specific Capabilities:**

  1.  **MST (Multi-Stream Transport) & Dual Displays**:
      -   **Problem**: Standard laptops only have one USB-C port but users want to extend their desktop to TWO separate room displays (not mirrored).
      -   **Solution**: Use WyreStorm MST Switchers: **'MX-0402-H2-MST'** or **'MX-0403-H3-MST'**.
      -   **Logic**: If the room requires "Dual Displays" and "USB-C" connectivity, prioritize these MST products. They allow a single USB-C cable to drive two unique extended desktop screens.

  2.  **Wireless Tiers (Presentation vs. Conferencing)**:
      -   **Tier 1: Wireless Presentation (Screen Sharing)**:
          -   **Goal**: Wirelessly cast content from laptops, phones, and tablets to the room display.
          -   **Products**: 'SW-220-TX-W', 'APO-210-UC'.
          -   **Casting Methods**:
              * **Dongle-based**: 'APO-DG1' (HDMI dongle plugged into laptop/device for instant casting)
              * **Native Casting**: Built-in support for AirPlay (Apple), Miracast (Windows/Android), and Google Cast (Chromecast protocol)
              * **Note**: Dongles provide the most reliable experience across all device types, while native casting depends on device OS support
      -   **Tier 2: Wireless Conferencing (BYOM - Bring Your Own Meeting)**:
          -   **Goal**: Show screen AND use the room's USB camera/mic wirelessly on the laptop for video conferencing.
          -   **Products**: 'SW-620-TX-W', 'SW-640L-TX-W'.
          -   **Dongle**: **'APO-DG2'** is REQUIRED for this workflow (supports USB extension for peripherals).

  3.  **USB-C Capabilities**:
      -   **'SW-640L-TX-W'**: High-end. Supports 60W charging, USB 3.0 data, and Wireless BYOM.
      -   **'MX-0403-H3-MST'**: Supports MST (Dual Screen) and charging.
      -   **'APO-210-UC'**: USB-C input carries USB data for the built-in speakerphone (wired BYOM).

  4.  **Primary vs. Repeater Displays**:
      -   **Primary**: The main display(s) at the front of the room. Connected directly to the main Switcher or Decoder.
      -   **Repeater/Confidence**: Displays located halfway down a long room or facing the presenter.
`;
