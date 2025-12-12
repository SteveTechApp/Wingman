
export const getTieredDesignLogic = () => `
  **Tiered Design Strategy (Guided Wizard Mode):**
  If the input does not specify exact IO requirements (e.g., from the Guided Wizard), you MUST infer them based on the 'Features' and 'Tier'.

  1.  **Inferring Inputs/Outputs**:
      -   **Video Conferencing**: ALWAYS requires a USB Camera, Microphone (or Speakerphone), and Speakers.
          -   *Bronze*: All-in-one Video Bar (e.g., APO-210-UC) or USB Webcam + TV Speakers.
          -   *Silver*: Separate PTZ Camera (USB) + Speakerphone (Table) + Switcher with USB Host.
          -   *Gold*: Tracking Camera (HDMI/IP) + Ceiling Mic + DSP + Dual Displays.
      -   **Wireless Presentation**:
          -   **Goal**: Enable wireless casting from laptops, phones, and tablets via dongle (APO-DG1) or native protocols (AirPlay, Miracast, Google Cast).
          -   *Bronze*: Use SW-0201-4K (built-in support via APO-DG1 dongle or native casting).
          -   *Silver/Gold*: Use SW-640L-TX-W or APO-210-UC. For BYOM (wireless camera/mic), include APO-DG2 dongle.
      -   **Interactive**:
          -   Needs USB connection back to the host PC. Use HDBaseT extenders with KVM (EX-100-KVM) or AVoIP 500 series.

  2.  **Tier Differentiation**:
      -   **Bronze**: Optimize for PRICE. Use "Essentials" cabling, manual/auto switching, minimal hardware. Point-to-point.
      -   **Silver**: Optimize for FUNCTION. The "Sweet Spot". HDBaseT Class A, BYOM support, decent audio.
      -   **Gold**: Optimize for EXPERIENCE. AVoIP (Zero Latency), Independent Routing, High-End Audio, Touch Panel Control.
`;
