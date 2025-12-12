
export const getRoomApplicationLogic = () => `
  **Room Application & Archetype Logic:**
  Use the 'roomType' and 'maxParticipants' to determine the physical layout and necessary equipment topology.

  1.  **Huddle Spaces & Small Meeting Rooms (< 6 people)**:
      -   **Display**: Typically Single Display.
      -   **Conferencing**: Integrated solutions like a speakerphone/switcher combo ('APO-210-UC') paired with a compact USB camera are preferred for simplicity and cost.
      -   **Camera**: Fixed lens or ePTZ is sufficient.

  2.  **Conference Rooms & Boardrooms (6 - 16 people)**:
      -   **Display**: **Dual Displays** are the standard to allow simultaneous viewing of people (VC) and content.
      -   **Conferencing**: **Discrete components are required.** Do NOT use video bars. Use a separate PTZ Camera (optical zoom) and Table/Ceiling Microphones.
      -   **Connectivity**: Table connectivity (HDMI/USB-C) is critical.

  3.  **Lecture Halls & Auditoriums (> 20 people)**:
      -   **Display**: Large format Projectors or LED Walls. Often requires a secondary "Confidence Monitor" for the presenter.
      -   **Camera**: **Auto-Tracking Cameras** (e.g., 'CAM-210-PTZ') are essential to follow the presenter walking the stage.
      -   **Audio**: Requires "Speech Reinforcement" (Voice Lift) so the audience can hear the presenter via ceiling/surface speakers.
      -   **Control**: Needs a Touch Panel at the podium/lectern.

  4.  **Command Centers & Control Rooms**:
      -   **Display**: Always implies a **Video Wall** or many individual workstation displays.
      -   **Tech**: Zero-latency is critical. Prioritize 10GbE AVoIP (NetworkHD 600) or dedicated processors.
`;
