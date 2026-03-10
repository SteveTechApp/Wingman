import * as React from "react";


export const getVideoWallLogic = () => `
  **Video Wall Design Logic (CRITICAL):**
  Your approach MUST differ based on whether the wall is LCD or LED.

  **1. If the wall type is 'led_video_wall':**
  - Treat LED as a **single output canvas** from Wingman: output mapping is always **1x1**.
  - The physical wall size is modular (cabinet count / panel count), but the signal feed is one canvas with total resolution **X by Y pixels** (derived from pixel pitch, cabinet pixels, and cabinet count).
  - Assume a dedicated LED processor (for example NovaStar-class) receives one or more source feeds and handles layer/window behavior.
  - WyreStorm feed selection rules:
    - **Single-source feed**: prefer **NHD-500-RX** (handles non-standard VESA/ultra-wide use cases). Use **NHD-600-TRX** for highest-quality premium designs.
    - **Multiview feed (lower bandwidth, flexible windows/pinch-zoom)**: use **NHD-150-RX** (up to 9 windows/sources).
    - **Multiview feed (higher quality, fixed-grid premium output)**: use **NHD-600-TRX**.
  - For all-in-one LED (96" to 120") still model the feed as a single 1x1 output canvas.

  **2. If the wall type is 'lcd_video_wall':**
  - Standard layouts are usually 2x2, 3x3, 4x4 with commercial display panels.
  - Preferred methods:
    - **Decoder-per-screen (recommended for flexibility and non-standard walls)**:
      - One decoder per panel.
      - Best for grouped content zones and avoiding stretch artifacts.
      - Prefer NHD-500/NHD-600 families for bezel-aware designs and lower-compression output quality.
    - **Tile-loop from a multiview receiver (cost-balanced)**:
      - Single composite feed into first panel, then panel loop/tile mode.
      - Use NHD-150-RX for low-bandwidth multiview; NHD-600-TRX for premium quality.
    - **Dedicated processor path**:
      - SW-0204-VW / SW-0206-VW for straightforward single-source wall control.
  - **Critical non-standard rule**:
    - For **4x2** walls (or any strong aspect mismatch), do NOT assume a single 16:10 source stretched across the whole wall.
    - Prefer decoder-per-screen or grouped zones unless content is authored specifically for wall resolution/aspect.
  - Avoid NHD-120 in bezel-critical LCD wall recommendations; NHD-500 and NHD-600 are preferred capability tiers.

  **3. Response requirements for every video wall design:**
  - State physical wall layout and signal output layout separately.
  - For LED, explicitly report output as 1x1 and provide the total canvas resolution.
  - Include recommended WyreStorm SKU(s), quantity, and a short rationale.
  - Include warnings for aspect-ratio risk, non-standard layouts, and quality trade-offs.
`;


