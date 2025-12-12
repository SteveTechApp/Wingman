
export const getUcLogic = () => `
  **Unified Communications (UC), Camera & Audio Logic (CRITICAL):**
  If the 'Video Conferencing' feature is a 'must-have', you MUST design a complete UC system based on room size and tier.

  1.  **Huddle Spaces & Small Rooms (< 6 participants, < 5m deep):**
      -   **Goal**: Simple, cost-effective, all-in-one or compact solutions.
      -   **Bronze/Silver Tier**: A compact camera and speakerphone combo is ideal.
          -   **Camera**: Select **'CAM-100-4K'** (ePTZ, wide-angle).
          -   **Audio**: Select **'HALO 80'** (USB Speakerphone).
          -   **Switching**: Ensure the switcher has a USB host port for the camera/audio (e.g., **'SW-220-TX-W'** if wireless is also needed, otherwise a simple switcher and connect peripherals to display if it has a USB hub).
      -   **Alternative Silver Tier (Integrated Audio)**: Use **'APO-210-UC'** which combines a speakerphone and switcher. Pair it with **'CAM-100-4K'**. State that this provides an excellent wired BYOM experience.

  2.  **Conference Rooms & Boardrooms (6 - 16 participants, > 5m deep):**
      -   **Goal**: Discrete, high-performance components. Do NOT use integrated video bars.
      -   **Camera**: You **MUST** use an optical zoom PTZ camera. Select **'CAM-210-PTZ'** (mention AI tracking) or **'GEN-PTZ-CAM'**. A wide-angle webcam is NOT sufficient for this room size.
      -   **Audio**:
          -   **Silver Tier**: Use one or two **'HALO 80'** speakerphones on the table. Mention daisy-chaining capability.
          -   **Gold Tier**: For superior audio, select the **'COM-MIC-HUB'** with appropriate ceiling or table microphones (assume generic mics are available).
      -   **System Core**: The system requires a switcher with a robust USB host implementation.
          -   **Silver Tier**: **'SW-340-TX'** (HDBaseT) or **'SW-620-TX-W'** (if wireless needed).
          -   **Gold Tier**: **'SW-640L-TX-W'** is the preferred choice for its dual outputs and advanced USB capabilities.

  3.  **Large Venues (Lecture Halls, Auditoriums, > 16 participants):**
      -   **Goal**: Specialized broadcast-quality solutions.
      -   **Camera**: At least one **'CAM-210-PTZ'** with AI tracking to follow the presenter. Often, a second camera (e.g., **'GEN-PTZ-CAM'**) is required to show the audience.
      -   **Audio**: A full DSP solution is mandatory. Select **'AMP-260-DNT'** (which has DSP) and specify a professional microphone system (e.g., ceiling array or wireless lavalier). Do NOT use simple speakerphones.
      -   **Multi-Camera Switching**: If multiple cameras are used, you MUST include a system capable of switching them. State that a video production switcher is needed, or that an AVoIP system (like NetworkHD 500/600) can be used to route camera feeds.

  **General UC Rules**:
  - **USB Extension**: If a camera is connected to a switcher at a lectern/table, but the camera is mounted at the display >5m away, you MUST include a USB extender like **'EX-40-USE2'**.
  - **BYOM**: "Bring Your Own Meeting" means a user's laptop runs the call. This requires the system to have a USB-B or USB-C host connection from the switcher to the laptop. Ensure your selected switcher has this.
`;
