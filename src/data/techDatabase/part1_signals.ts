export const PART_1_SIGNALS = `
## Part 1: Signal Types & Connectivity

- **Digital vs. Analog**: Digital (HDMI, DP) is robust; Analog (VGA) degrades easily.
- **Bandwidth**: Data rate in Gbps. HDMI 2.0 requires 18 Gbps for 4K60 4:4:4.
- **HDMI**: Industry standard for video, audio, and control.
- **DisplayPort (DP)**: Common on PCs, often higher bandwidth than contemporary HDMI.
- **USB-C**: Versatile connector for video (DP Alt Mode), data (USB 3.x), and power (USB-PD). Enables single-cable docking.
- **USB Standards**: USB 2.0 (480Mbps) for KVM; USB 3.x (5Gbps+) for high-quality cameras. Passive cable limits are short (~5m for 2.0, ~3m for 3.x).
- **EDID**: Data from a display telling a source its capabilities. A failed "EDID handshake" causes "No Signal" errors.
- **HDCP**: Content protection encryption. HDCP 2.2/2.3 is required for most commercial 4K content.
`;
