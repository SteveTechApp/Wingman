
export const getProductCompatibilityRules = () => `
  **Specific Product Compatibility Rules:**

  1.  **Wireless Casting & Dongles (Crucial)**:
      -   **-W Suffix**: Any SKU ending in **'-W'** supports native wireless casting (AirPlay/Miracast).
      -   **APO-DG1 (Video/Audio Only)**: This dongle provides screen sharing ONLY. It does NOT support USB peripherals (No BYOM).
          -   **Compatible Models**: 'SW-220-TX-W', 'APO-210-UC', 'APO-VX20-UC'.
      -   **APO-DG2 (Full BYOM)**: This dongle bridges USB peripherals wirelessly (Webcams/Mics) back to the laptop.
          -   **Compatible Models**: 'SW-620-TX-W', 'SW-640L-TX-W'.
          -   **Rule**: You MUST NOT pair 'APO-DG2' with the 200-series or APO-UC products. They lack the hardware to route USB data wirelessly.

  2.  **Native Casting Requirements**:
      -   **Windows (Miracast)**: Connect via 'Windows Key + K'. Shows as a wireless display.
      -   **Apple (AirPlay)**: The WyreStorm device and the Apple device MUST be on the **same IP subnet**.
      -   **Multi-View**: Supported devices can display up to 4 wireless streams simultaneously (Dongles + Native).
`;
