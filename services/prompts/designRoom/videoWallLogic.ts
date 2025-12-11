export const getVideoWallLogic = () => `
  **Video Wall Design Logic (CRITICAL):**
  Your approach MUST differ based on whether the wall is LCD or LED.

  **1. If the wall type is 'lcd_video_wall':**
  You have three primary methods to choose from based on flexibility and cost:

  - **Method A: Dedicated Processor (Simple & Cost-Effective)**
    - For simple, single-source video walls, use a dedicated matrix switcher with a '-VW' SKU, like 'SW-0204-VW'. This is a robust, straightforward option.

  - **Method B: AVoIP - Decoder-per-Display (Maximum Flexibility & Quality)**
    - This is the most flexible and highest quality approach. Use one AVoIP decoder for each panel in the wall (e.g., a 2x2 wall needs 4 decoders).
    - **Benefit**: This allows for creative layouts (e.g., a 2x2 video wall in the center of a 4x2 wall with side panels for ads), drives more individual pixels, and reduces scaling artifacts or tearing.
    - **Cost**: Acknowledge this is a more expensive solution.
    - **Product Selection**: Choose the AVoIP series based on the Design Tier (120 for Bronze, 500 for Silver, 600 for Gold).

  - **Method C: AVoIP - Single Input with Tile Mode (Balanced Cost/Performance)**
    - This method uses a single, powerful multiview decoder to create a composite image, which is then fed to the first display. The displays themselves use their built-in 'tile mode' or 'loop-through' feature to create the wall.
    - This is a good compromise for multi-source walls when budget is a concern. Select the decoder based on the number of sources and required quality:
      - **Bronze/Low-Cost**: 'NHD-0401-MV' (up to 4 sources).
      - **Silver/More Sources**: 'NHD-150-RX' (up to 9 sources). Note that this uses H.264 compression, so while it handles many sources, it is not ideal for high-detail content as a single 4K stream is spread across the wall.
      - **Gold/Best Quality**: 'NHD-600-TRX' (up to 16 sources). This is the best option, offering zero latency and uncompressed quality for multiview content.

  **2. If the wall type is 'led_video_wall':**
  - **Core Principle**: LED walls are seamless and almost always have their own processor that requires a single HDMI input. Your job is to select the best WyreStorm product to *feed that single input*.
  - **If Multiview is Required**: Select a single decoder to create the multiview image. The choice presents a clear cost/performance trade-off:
    - **Bronze/Basic**: Use 'NHD-0401-MV' for up to 4 simultaneous sources.
    - **Silver/More Sources**: Use 'NHD-150-RX' for up to 9 sources. Be aware of the quality trade-off: it uses high compression (H.264) and is not ideal for high-detail content as a single 4K stream is spread across the wall.
    - **Gold/High-Detail**: You **MUST** use 'NHD-600-TRX'. It provides the best video handling with zero latency and can show up to 16 uncompressed sources, ideal for high-detail content where a 4K image is spread across the entire wall.
  - **If Single Source (No Multiview)**: Select a single, high-quality decoder. 'NHD-600-TRX' provides the absolute best quality. A 'NHD-500-RX' is an excellent Silver-tier choice. A 'NHD-120-RX' is a budget-friendly Bronze option but uses high compression.
`;