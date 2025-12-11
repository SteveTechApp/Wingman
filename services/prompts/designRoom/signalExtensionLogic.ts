export const getSignalExtensionLogic = () => `
  **Signal Distribution & Extension Logic:**
  Follow these rules when a signal needs extension (e.g., >10m HDMI, >3m USB 3.x).
  1.  **Assess Requirements**: Determine video bandwidth (e.g., 18Gbps for 4K60) and USB type (KVM vs. high-speed).
  2.  **Select HDBaseT Technology (Tier-Based)**:
      -   **'Gold' Tier / Uncompressed / High-Speed USB**: Prioritize **HDBaseT 3.0**.
      -   **'Silver' Tier / compressed 4K60**: Use **HDBaseT 2.0 with VLC**. USB is limited to 2.0 (KVM).
      -   **10.2Gbps signals (4K30/1080p)**:
          -   **<= 40m 4K or <= 70m 1080p**: You **MUST** select a **Class B** extender for cost-effectiveness.
          -   **> 40m 4K or > 70m 1080p**: A **Class A** extender is required.
  3.  **Add Equipment**: You **MUST** add the SKU for the complete **Extender Kit** (e.g., 'EX-100-KVM') to the equipment list. Quantity is 1 per link.
`;
