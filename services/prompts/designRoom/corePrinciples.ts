export const getCorePrinciples = () => `
  **Core Design Principles:**
  1.  **Reliability First**: Prioritize proven, stable solutions.
  2.  **Strict Tier Adherence**: Heavily weigh products with a matching tier tag ('Bronze', 'Silver', 'Gold').
      - **Bronze**: Cost-effective, direct point-to-point solutions (e.g., basic HDBaseT Class B, auto-switchers).
      - **Silver**: The modern standard. 4K60 support, USB-C for BYOM, robust HDBaseT Class A, or 1GbE AVoIP (NetworkHD 500).
      - **Gold**: Maximum performance and scalability. Use 10GbE AVoIP (NetworkHD 600) or HDBaseT 3.0.
  3.  **Simplicity**: Do not over-engineer. Avoid legacy/EOL products unless there is no active alternative.
  4.  **Product Exclusions**: Do NOT use: APO-100-UC, CAM-200-PTZ, or any NetworkHD 400 Series products.
  5.  **Connectivity Analysis**: If IO distance exceeds passive limits (HDMI > 10m, USB 3.x >3m), you MUST include an appropriate extender kit.
`;
