
export const getInfrastructureLogic = () => `
  **Infrastructure & Connectivity Logic (CRITICAL):**

  1.  **INPUT Strategy (Source -> System)**:
      Analyze each input's \`distributionType\` (Transport) and \`terminationType\` (Physical Location) to select the exact transmitter (Tx) or connection method.

      -   **Wall Plate or Floor Box (Tx)**:
          -   If \`terminationType\` is 'Wall Plate' or 'Floor Box':
              -   **HDBaseT Class B**: You **MUST** use **'SW-130-TX-WP'** (US/UK/EU).
              -   **HDBaseT 3.0**: You **MUST** use **'EX-40-VWM-5K'** (Tx) - *Note: Currently no wall plate for HDBT3.0, use box transmitter with mounting bracket.*
              -   **AVoIP 1GbE**: You **MUST** use **'NHD-120-IW-TX'** (100 Series) or **'NHD-500-IW-TX'** (500 Series).
              -   **AVoIP 10GbE**: Use **'NHD-600-TRX'** (Box form factor).
              -   **Direct/Copper**: This implies a pass-through plate (not a product in DB), but requires a long cable. Suggest **'CAB-HAOC-xx'** if distance > 10m.

      -   **Table / Lectern (Tx or Switcher)**:
          -   If \`distributionType\` is **'HDBaseT Class B'**: Use **'EX-70-G2'** (Tx only) or **'SW-220-TX-W'** (if local switching needed).
          -   If \`distributionType\` is **'HDBaseT Class A'**: Use **'EX-100-H2'** (Tx only) or **'SW-510-TX'**.
          -   If \`distributionType\` is **'HDBaseT 3.0'**: Use **'EX-40-VWM-5K'** (Tx).
          -   If \`distributionType\` contains **'AVoIP'**: Use the Encoder matching the series (e.g., **'NHD-500-TX'**).
          -   If \`distributionType\` is **'Direct / Copper'**: Connect directly to the main rack switcher.

      -   **Table Well (IDB Retractor)**:
          -   If \`terminationType\` includes 'IDB' or 'Table Well', you MUST specify **'IDB-300'** (or IDB-400) housing.

  2.  **OUTPUT Strategy (System -> Display)**:
      Analyze each output's \`distributionType\` to select the exact receiver (Rx) behind the display.

      -   **'Direct / Copper'**:
          -   Use standard HDMI cables if <10m.
          -   Use **'CAB-HAOC-xx'** if 10m - 50m.

      -   **'HDBaseT Class B (Standard)'**:
          -   You **MUST** include an **'EX-70-G2'** (Receiver) or **'RX-500'** (if paired with SW-130-TX-WP).

      -   **'HDBaseT Class A (Long Range)'**:
          -   You **MUST** include an **'EX-100-H2'** (Receiver).

      -   **'HDBaseT 3.0 (Premium)'**:
          -   You **MUST** include an **'EX-40-VWM-5K'** (Receiver).

      -   **'AVoIP 1GbE' or 'AVoIP (NetworkHD)'**:
          -   Select the Decoder matching the Encoder series:
              -   100 Series: **'NHD-120-RX'**.
              -   500 Series: **'NHD-500-RX'** (or **'NHD-500-RXE'** for video only/walls).
      
      -   **'AVoIP 10GbE'**:
              -   600 Series: **'NHD-600-TRX'** (configured as Rx) or **'NHD-610-RX'**.

      -   **'Fiber Extender'**:
          -   Use Fiber Modules **'SR-1G-MM-SFP'** or **'SR-10G-MM-SFPP'** paired with fiber-capable extenders or NHD-600.

  3.  **Rack Strategy (Hybrid Architecture Support)**:
      -   **In-Room / Local Rack**:
          -   Equipment can be housed in credenza furniture, lectern, under-desk cabinets, or small wall-mounted racks.
          -   Suitable for room-specific equipment like codecs, small switchers, room controllers, amplifiers.
          -   Standard copper cabling is acceptable for local connections.

      -   **Centralized Infrastructure**:
          -   Central server room or distributed equipment closets house shared resources.
          -   Suitable for matrix switchers, AVoIP encoders/decoders, centralized sources, network switches, processors.
          -   For distances >50m between room and central infrastructure, you **MUST** use **AVoIP** or **Fiber Extenders**. Do NOT suggest long HDMI cables.

      -   **Hybrid Strategy (COMMON IN PRACTICE)**:
          -   **Many installations use BOTH local and centralized infrastructure**.
          -   Local equipment in room (credenza/lectern):
              * Codec for video conferencing
              * Room controller/touch panel
              * Small presentation switcher (e.g., SW-130-TX-WP for 3 HDMI inputs)
              * Amplifier for local speakers
          -   Centralized equipment (server room/closet):
              * Large matrix switcher for cross-room switching
              * Centralized sources (media servers, signage players, streaming encoders)
              * AVoIP distribution infrastructure
              * Network switches with PoE
          -   **Design Logic**: When hybrid strategy is indicated:
              1. Place room-specific interactive equipment (codecs, touch panels) in local rack
              2. Place shared resources and distribution equipment centrally
              3. Use AVoIP or fiber to connect local and central infrastructure
              4. Ensure proper network segmentation for AV traffic
          -   **Example Scenario**: Conference room has a credenza with codec and room controller (local), but also connects to a centralized matrix switcher in server room to access shared sources and distribute to multiple displays across the building.

  4.  **USB Bandwidth & Peripheral Integration (CRITICAL)**:
      -   **Bandwidth Requirements**:
          -   **High Bandwidth (USB 3.0/3.1)**: Required for **4K Webcams/PTZ Cameras** (e.g., CAM-210-PTZ) and some Interactive Displays. USB 2.0 (480Mbps) is INSUFFICIENT.
          -   **Standard Bandwidth (USB 2.0)**: Sufficient for KVM (Keyboard/Mouse), Audio (Mics/Speakerphones), and MJPEG compressed cameras.
      -   **Transport Selection**:
          -   **High Bandwidth**: If USB 3.0 devices are used over distance (>5m), you **MUST** use **HDBaseT 3.0** (e.g., 'EX-40-VWM-5K', 'MX-0403-H3-MST') or **USB-C Active Optical Cables** (AOC).
          -   **Standard Bandwidth**: HDBaseT 2.0 (Class A/B) and NetworkHD 500 are strictly USB 2.0. Do not use them for 4K uncompressed cameras.
      -   **Camera Extension Rule**: For any room larger than a 'Huddle Space' that requires 'Video Conferencing', you MUST assume the distance from the table/lectern (where the laptop connects) to the camera (mounted at the display) is greater than 5 meters. Therefore, you MUST include a USB extension solution. This can be:
          - A dedicated USB extender like **'EX-40-USE2'**.
          - An HDBaseT extender that includes USB KVM (e.g., **'EX-100-KVM'**).
          - An HDBaseT 3.0 extender for high-bandwidth cameras (e.g., **'EX-40-VWM-5K'**).
      -   **Port Aggregation (HUB4)**:
          -   If the room has multiple USB peripherals at the display/table (e.g., Camera + Mic + Touch Screen) and the chosen Extender/Switcher has limited USB host/device ports, you **MUST** add the **'EXP-USB3-HUB4'** (WyreStorm 4-Port USB 3.0 Hub) to connect them all.
`;
