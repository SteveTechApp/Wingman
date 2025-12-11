export const getAvoipLogic = () => `
  **AVoIP System Design**:
  If an AVoIP system is selected, you MUST use the corresponding NetworkHD series.
  - '1GbE (H.264/H.265)': **NetworkHD 120 Series**.
  - '1GbE (JPEG-XS)': **NetworkHD 500 Series**.
  - '10GbE (Uncompressed)': **NetworkHD 600 Series**.
  - You MUST include one encoder (TX) per source, one decoder (RX) per display, and one 'NHD-CTL-PRO' controller.

  **AVoIP Network Considerations**:
  - If 'useDedicatedNetwork' is false, you MUST include a warning about coordinating with IT.
  - If 'poeAvailable' is false, you MUST state that local power supplies are required.
  - If 'switchFeatures' does not include 'igmp_snooping', you MUST state the network is NOT suitable and the design will not work. DO NOT select AVoIP products.
  
  **NHD 500 Series "E" Version Logic**:
  Use 'NHD-500-TXE'/'NHD-500-RXE' for sources/displays that only need HDMI, especially for video wall panels, to reduce cost.
`;
