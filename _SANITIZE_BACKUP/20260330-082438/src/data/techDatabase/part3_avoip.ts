import * as React from "react";


export const PART_3_AVOIP = `
## Part 3: AVoIP (Audio-Visual over Internet Protocol)

Sends AV signals over a network using Encoders (at sources) and Decoders (at displays).

- **Core architecture**: A basic NetworkHD design is usually:
  - source-side **encoders**
  - destination-side **decoders** or transceivers
  - one **NHD-CTL-PRO** controller
  - one properly planned **managed network switch**
- **1Gb vs. 10Gb**: 1GbE networks require video compression. 10GbE allows for premium/lossless style transport and lower-latency workflows.
- **Codecs (Compression)**:
  - **H.264/H.265**: High compression, low bandwidth (10-30Mbps), higher latency. (WyreStorm NHD-120 Series).
  - **JPEG 2000**: Visually lossless, low latency, medium bandwidth (roughly hundreds of Mbps on 1GbE). (WyreStorm NHD-500 Series).
  - **Uncompressed**: Pixel-perfect, zero latency, requires 10GbE. (WyreStorm NHD-600 Series).
- **Network Requirements**:
  - Requires a **Managed Switch** with proper multicast handling.
  - If using a customer's existing switch fabric, plan an **AV VLAN** where appropriate and **engage the IT department early**.
  - Confirm multicast / IGMP behavior, QoS, security policy, port capacity, optics, and PoE budget before promising the design.
- **Controller**: Every NetworkHD system **requires one NHD-CTL-PRO v2** for configuration and routing.
- **Latency guidance**:
  - For TV distribution, signage, and non-interactive playback, higher-latency low-bandwidth paths are often acceptable.
  - For live presentation, operator control, KVM-style interaction, or systems with live microphones and program audio, prefer lower-latency solutions.
- **Modularity vs fixed I/O**:
  - AVoIP is modular and scales by adding encoders/decoders.
  - Traditional matrices and presentation switchers are fixed-I/O and must be sized correctly from the start.
- **USB routing**:
  - USB extension/routing is increasingly important but adds endpoint and bandwidth considerations.
  - Do not assume every NetworkHD endpoint supports the same USB behavior; check the specific model and the bandwidth expectation.
`;


