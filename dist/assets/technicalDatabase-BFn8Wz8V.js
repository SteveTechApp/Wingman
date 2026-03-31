var e=`
# WyreStorm Technical Information & AV Fundamentals


## Part 1: Signal Types & Connectivity

- **Digital vs. Analog**: Digital (HDMI, DP) is robust; Analog (VGA) degrades easily.
- **Bandwidth**: Data rate in Gbps. HDMI 2.0 requires 18 Gbps for 4K60 4:4:4.
- **HDMI**: Industry standard for video, audio, and control.
- **DisplayPort (DP)**: Common on PCs, often higher bandwidth than contemporary HDMI.
- **USB-C**: Versatile connector for video (DP Alt Mode), data (USB 3.x), and power (USB-PD). Enables single-cable docking.
- **USB Standards**: USB 2.0 (480Mbps) for KVM; USB 3.x (5Gbps+) for high-quality cameras. Passive cable limits are short (~5m for 2.0, ~3m for 3.x).
- **EDID**: Data from a display telling a source its capabilities. A failed "EDID handshake" causes "No Signal" errors.
- **HDCP**: Content protection encryption. HDCP 2.2/2.3 is required for most commercial 4K content.


## Part 2: Signal Extension Technologies

### HDBaseT
A point-to-point technology for sending AV, USB, Control, and Power over a single category cable.

- **HDBaseT 2.0**: ~10.2 Gbps native bandwidth. Supports 4K30 up to 70m (Class A). Uses Visually Lossless Compression (VLC/DSC) for 4K60 signals. Requires Cat6a.
- **HDBaseT 3.0**: ~18 Gbps native bandwidth. Supports uncompressed 4K60 up to 100m. Upgrades USB to 5Gbps speeds. Requires Cat6a.
- **PoH (Power over HDBaseT)**: Allows one device to power the other.

### Fiber Optic Extenders
- **Benefits**: Extremely long distances (km), immune to EMI, high security.
- **Drawbacks**: More fragile and typically more expensive than category cable.


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


## Part 4: Advanced AV Concepts

- **Video Walls**:
  - **LCD**: Tiled panels with visible gaps (**mullions**). Requires **bezel compensation**.
  - **Direct-View LED (DV-LED)**: Seamless modules, no gaps.
  - Can be driven by a dedicated processor or an AVoIP system (one decoder per panel).
- **Multiview**: Displaying multiple video sources on a single screen. Can be done with a processor (NHD-0401-MV) or specialized decoders (NHD-150-RX).
- **Dante Audio**: Industry standard for distributing uncompressed, multi-channel audio over an IP network. WyreStorm NHD-500 series supports software-activated Dante AV-A.


## Part 5: WyreStorm Specific Technologies & Naming

- **Apollo Series (Wireless Casting)**:
  - **APO-DG1**: Wireless casting HDMI dongle for video/audio ONLY. Plugs into laptop/device HDMI port. Supports casting from laptops, phones, and tablets. No USB data extension.
  - **APO-DG2**: Wireless casting WITH USB data extension (full BYOM - Bring Your Own Meeting). Allows wireless access to room camera/mic from your laptop. **ONLY** works with WyreStorm products whose SKU ends in **-W** (e.g., SW-640L-TX-W). It is **NOT** compatible with devices like the APO-VX20 or APO-210-UC.
  - **Native Casting Protocols**: WyreStorm wireless products support AirPlay (Apple devices), Miracast (Windows/Android), and Google Cast (Chromecast protocol) for dongle-free casting directly from devices.


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

`;export{e as TECHNICAL_DATABASE};