import * as React from "react";


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

  3.  **Do Not Mix Technology Families Blindly**:
      -   **AVoIP / NetworkHD**, **HDBaseT**, **matrix switchers**, **presentation switchers**, and **video wall processors** are NOT interchangeable just because they all move video.
      -   AVoIP is modular and network-based.
      -   Traditional matrices, presentation switchers, and wall processors are usually fixed-I/O products with specific compatible endpoints and scaling limits.
      -   If a published pairing exists, prefer it over inference.

  4.  **Published Compatibility Pairings (Use These First)**:
      -   **MX-1007-HYB** should be paired with **RX3-100** for its HDBaseT receiver path.
      -   **SW-510-TX** should be paired with **SW-515-RX** as the primary recommended receiver path.
      -   **TX-H2X-HDBT** should be paired with **RX-500** when using that published HDBaseT workflow.
      -   Do not substitute a random RX/TX from another family unless the product literature explicitly supports it.

  5.  **NetworkHD Endpoint Roles**:
      -   **TX / encoder** = source-side endpoint.
      -   **RX / decoder** = display-side or processor-side endpoint.
      -   **NHD-600-TRX** is the special case that can run as TX, RX, or simultaneous transceiver depending on mode.
      -   **NHD-150-RX** is a **100-series multiview receiver**, not a generic source encoder and not a general per-panel wall decoder.

  6.  **AVoIP Infrastructure Requirements**:
      -   Every NetworkHD recommendation should assume a **managed switch** and **one NHD-CTL-PRO**.
      -   If using an existing customer network, advise early engagement with the **IT department** for VLAN, multicast/IGMP, QoS, security, and switch-capacity review.
      -   USB routing / KVM support must be called out explicitly because not every endpoint supports it the same way and it adds bandwidth/planning overhead.

  7.  **Latency and Quality Sanity Check**:
      -   Higher-latency low-bandwidth paths are acceptable for signage and passive TV distribution.
      -   For live presentation, operator interaction, or systems with live microphones and program audio, prefer lower-latency paths.
      -   Do not recommend a low-bandwidth design for a mission-critical live workflow without warning the user about delay trade-offs.
`;


