export const PART_3_AVOIP = `
## Part 3: AVoIP (Audio-Visual over Internet Protocol)

Sends AV signals over a network using Encoders (at sources) and Decoders (at displays).

- **1Gb vs. 10Gb**: 1GbE networks require video compression. 10GbE allows for visually lossless or uncompressed video.
- **Codecs (Compression)**:
  - **H.264/H.265**: High compression, low bandwidth (10-30Mbps), higher latency. (WyreStorm NHD-120 Series).
  - **JPEG-XS**: Visually lossless, low latency, medium bandwidth (250-850Mbps). (WyreStorm NHD-500 Series).
  - **Uncompressed**: Pixel-perfect, zero latency, requires 10GbE. (WyreStorm NHD-600 Series).
- **Network Requirements**: Requires a **Managed Switch** with **PoE+** and **IGMP Snooping**.
- **Controller**: Every NetworkHD system **requires one NHD-CTL-PRO v2** for configuration and routing.
`;
