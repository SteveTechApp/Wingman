import * as React from "react";

export const PART_6_REFERENCE_DOCS = `
## Part 6: Document-Derived WyreStorm Guidance (2025-2026 PDFs)

Use the following rules as grounded product guidance distilled from:
- Product Guide 2025
- NetworkHD Brochure
- NetworkHD Technical Reference Guide v7.1
- Switcher Receiver Compatibility Chart
- Corporate, Education, and Hospitality/Retail solution brochures

### NetworkHD component roles
- **TX / Encoder**: connects to source devices and places AV onto the network.
- **RX / Decoder**: receives AV from the network and converts it to HDMI for a display, processor, or downstream device.
- **NHD-600-TRX / TRXF**: transceiver. It can run as TX, RX, or simultaneous transceiver depending on mode.
- **NHD-CTL-PRO**: controller/orchestration layer for NetworkHD discovery, configuration, control, preview, and routing. Only one controller is normally required per NetworkHD system.
- Never describe an RX decoder as if it were the source-side device. A transport path normally needs a source-side encoder and a display/processor-side decoder, unless a 600-series TRX is being used in a mode that explicitly covers both roles.

### NetworkHD family positioning
- **NetworkHD 120 series**: lowest bandwidth, 1GbE, H.264/H.265, suitable when 4K30/1080-class delivery is acceptable and bandwidth efficiency matters most.
- **NetworkHD 500 series**: 1GbE JPEG 2000, visually lossless 4K60 4:4:4 class, very low latency, strong commercial AV general-purpose choice.
- **NetworkHD 600 series**: 10GbE SDVoE, premium/lossless, zero-latency/genlock-class workflows, highest bandwidth and highest performance.
- **NHD-150-RX** is a **multiview receiver for 100-series ecosystems**, not a general-purpose wall decoder and not a source encoder.
- **NHD-0401-MV** is a dedicated 4-input HDMI multiview processor that can also be integrated into NetworkHD 400/500 control workflows by API.

### Video wall rules from NetworkHD reference material
- In a **NetworkHD LCD video wall**, **each physical display panel requires its own RX decoder**.
- Documented video-wall-capable endpoints include:
  - **NHD-120-RX**: video wall up to 16x16
  - **NHD-500-RX / NHD-500-E-RX**: video wall up to 16x16
  - **NHD-600-TRX / TRXF**: video wall up to 8x8
- 500-series documentation explicitly calls out **video wall processing with bezel correction**, ultra-low latency, and rotation-related processing capability.
- For best wall synchronization:
  - use the **same RX model** across the wall
  - use the **same display model/settings** where possible
  - keep all RX endpoints on the **same switch**
  - on NHD-500, keep source frame rates aligned and prefer scaler/ULL settings when the design requires the best sync behavior

### Multiview rules from NetworkHD reference material
- **NHD-150-RX**:
  - compatible with 100-series encoders
  - supports up to **9 windows/tiles**
  - supports tile and overlay modes
  - overlay mode is limited to **30Hz**
- **NHD-0401-MV**:
  - dedicated 4-input HDMI multiview processor
  - suitable when a standalone multiview block is needed
- **NHD-600-TRX / TRXF**:
  - multiview is available using secondary streams
  - supports up to **16 tiles**
  - cannot decode multiview and encode via HDMI input at the same time
  - when multiple 600 multiview decoders share encoders, keep window resolutions/layout expectations aligned

### LED wall guidance
- Treat an **LED wall** as a **single processor-driven canvas** at the WyreStorm planning layer unless the user explicitly asks for per-cabinet sending architecture.
- WyreStorm NetworkHD devices are usually the **upstream transport/composition layer**, not the replacement for the dedicated LED processor.
- For LED proposals, recommend WyreStorm as:
  - source acquisition
  - AV over IP transport
  - routing
  - multiview/composite generation feeding the LED processor
- A correct AVoIP signal path to an LED processor typically includes:
  - one or more **TX encoders at the sources**
  - one **RX decoder or 600-series TRX at the processor input side**
  - **NHD-CTL-PRO** when routed NetworkHD control is part of the design
- Do **not** recommend an RX-only SKU as if it is the complete source-to-processor solution.

### LCD wall guidance
- Separate **physical wall layout** from **signal layout**.
- For **decoder-per-screen NetworkHD walls**, each panel needs its own wall-capable RX endpoint.
- For **non-standard aspect walls** or bezel-critical compositions, avoid assuming a single stretched source is acceptable unless the content is authored specifically for the wall canvas.
- If using a display's own **tile-loop / daisy-chain** mode, describe that as a **display-side feature**, not as proof that a multiview receiver is the same thing as a wall decoder.

### Product pairing and compatibility reminders
- Follow published WyreStorm compatibility pairings for HDBaseT and presentation products instead of mixing arbitrary TX/RX combinations.
- Examples from the compatibility chart:
  - **MX-1007-HYB** -> **RX3-100**
  - **SW-510-TX** -> **SW-515-RX** (recommended), with documented alternatives depending on design goals
  - **TX-H2X-HDBT** -> **RX-500**
- When a published compatibility chart exists, prefer that pairing over inference.

### Non-AVoIP interoperability discipline
- Do not blur together **AVoIP**, **HDBaseT**, **matrix switchers**, **presentation switchers**, and **standalone processors** as if they were interchangeable.
- **AVoIP** is modular and network-based.
- **Matrix switchers / presentation switchers / wall processors** are usually **fixed-I/O** products with specific local inputs, outputs, and compatible extension endpoints.
- If a design depends on:
  - a published receiver pairing
  - HDBaseT power behavior
  - USB passthrough
  - local scaler support
  - wall-processor output count
  then verify that exact product path rather than assuming a different family can substitute.
- Do not recommend a non-AVoIP switcher as if it scales like AVoIP; call out I/O ceilings and expansion limits clearly.

### AVoIP network planning reminders
- A basic NetworkHD system normally needs:
  - source-side endpoints
  - destination-side endpoints
  - one controller
  - one properly planned managed switch environment
- A dedicated AV switch is often simplest, but an existing customer switch may be acceptable if the AV traffic is engineered correctly.
- When reusing the customer's switch infrastructure, explicitly advise early engagement with the **IT department** for VLAN, multicast, QoS, security, and port-capacity checks.
- USB and KVM routing consume more than just video bandwidth; when USB is important, mention endpoint capability and bandwidth planning explicitly.

### Market/application cues from the brochures
- **Corporate / training / meeting spaces**:
  - flexible collaboration, multiview, wireless presentation, USB-C ingest, and room control are key
  - SW-0206-VW appears in brochure-driven large-space / exhibition-wall scenarios
- **Education**:
  - lecture halls and classrooms often combine matrix switching with NetworkHD endpoints for overflow, distributed displays, or hybrid teaching
  - MX-1007-HYB + compatible receivers is a recurring education pattern
- **Hospitality / retail**:
  - live switching, distributed displays, LED feature walls, signage, and centralized control are recurring design cues
  - large LED wall support, flexible multiview, and mosaic wall messaging appear repeatedly with NetworkHD 500 / controller / multiview references

### Decision rules for the AI model
- When recommending **NetworkHD**, always name the **series** and explain why bandwidth, latency, image quality, or wall size drove the choice.
- When recommending a **video wall**, state:
  - physical layout
  - signal layout
  - wall-capable endpoints
  - controller requirement if NetworkHD is being used
  - any sync / aspect / bezel / frame-rate cautions
- When recommending an **LED wall workflow**, distinguish clearly between:
  - the **WyreStorm transport or composition layer**
  - the **LED processor / controller layer**
- If there is any conflict between a guess and a published WyreStorm pairing, capacity table, or endpoint role, prefer the published document behavior.
`;
