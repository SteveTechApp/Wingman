import * as React from "react";


export const getVideoWallLogic = () => `
  **Video Wall Design Logic (CRITICAL):**
  Your approach MUST differ based on whether the wall is LCD or LED.

  **1. If the wall type is 'led_video_wall':**
  - Treat LED as a **single processor-driven canvas** from the Wingman planning layer: output mapping is usually **1x1 into the LED processor**.
  - The physical wall size is modular (cabinet count / panel count), but the signal handoff from WyreStorm is typically one composed canvas with total resolution **X by Y pixels**.
  - Assume a dedicated LED processor (for example NovaStar-class) receives the final WyreStorm feed and handles final cabinet mapping, layer behavior, and LED-specific control.
  - WyreStorm should usually be modeled as the **source acquisition / transport / routing / composition layer upstream of the LED processor**.
  - **Critical endpoint-role rule**:
    - **TX / encoder** products belong on the source side.
    - **RX / decoder** products belong on the processor/display side.
    - **NHD-600-TRX** can operate as TX, RX, or transceiver depending on mode.
    - Do **not** recommend an RX-only SKU as if it were the complete source-to-processor path.
  - Practical WyreStorm guidance:
    - **Simple premium LED feed over AVoIP**: prefer a **500-series TX + 500-series RX** path, or a **600-series TX / TRX / RX** path when lossless / zero-latency / 10GbE performance is required.
    - **Low-bandwidth compromise workflows** may use 120-series only when the resolution / quality target allows it.
    - **Multiview before the LED processor**:
      - **NHD-150-RX** is only valid as a **100-series multiview receiver** and supports up to **9 windows**.
      - **NHD-0401-MV** is the dedicated 4-input HDMI multiview processor for standalone or integrated workflows.
      - **NHD-600-TRX** supports multiview through its 600-series feature set, but be aware of its secondary-stream and simultaneous encode/decode limitations.
  - For all-in-one LED (96" to 120"), still model the WyreStorm handoff as a single 1x1 canvas unless the user explicitly requests a deeper LED sending architecture.

  **2. If the wall type is 'lcd_video_wall':**
  - Standard layouts are usually 2x2, 3x3, 4x4 with commercial display panels.
  - **Critical NetworkHD rule**:
    - In a true **NetworkHD video wall**, **each physical display panel requires its own wall-capable RX decoder**.
  - Preferred methods:
    - **Decoder-per-screen NetworkHD wall (recommended for flexibility and non-standard walls)**:
      - One wall-capable RX per panel.
      - Suitable documented wall-capable endpoints include **NHD-120-RX**, **NHD-500-RX / E-RX**, and **NHD-600-TRX / TRXF**.
      - Best when grouped content zones, aspect protection, bezel correction, or future reconfiguration matter.
    - **Display tile-loop / internal wall mode**:
      - Single composite feed into the display chain using the display manufacturer's own tiling behavior.
      - Treat this as a **display feature**, not as proof that a multiview receiver is the same thing as a wall decoder.
      - Use only when the display family explicitly supports it and the authored content / processor path is appropriate.
    - **Dedicated processor path**:
      - **SW-0204-VW / SW-0206-VW** for straightforward single-source or fixed-layout wall control.
  - **Critical non-standard rule**:
    - For **4x2** walls (or any strong aspect mismatch), do NOT assume a single 16:10 source stretched across the whole wall.
    - Prefer decoder-per-screen or grouped zones unless content is authored specifically for wall resolution/aspect.
  - **Multiview rule**:
    - **NHD-150-RX** is a multiview receiver for 100-series systems, not a general wall decoder.
  - Prefer **NHD-500** or **NHD-600** when image quality, sync behavior, bezel handling, or premium wall performance matter most.
  - If recommending a NetworkHD wall, mention the need for **NHD-CTL-PRO** control/orchestration.
  - For best sync, prefer identical RX/display models and keep wall endpoints on the same switch.

  **3. Response requirements for every video wall design:**
  - State physical wall layout and signal output layout separately.
  - For LED, explicitly report output as **1x1 into the LED processor** and provide the total canvas resolution.
  - If NetworkHD is recommended, identify the **source-side TX**, the **destination-side RX / TRX**, and whether **NHD-CTL-PRO** is required.
  - Include recommended WyreStorm SKU(s), quantity, and a short rationale.
  - Include warnings for aspect-ratio risk, non-standard layouts, sync limits, bandwidth trade-offs, and any separation between WyreStorm transport and LED-processor responsibilities.
`;

