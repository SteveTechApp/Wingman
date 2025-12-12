import { TrainingModule } from '../../utils/types';

export const MODULE_12_SITE_SURVEY: TrainingModule = {
  id: 'module-12-site-survey',
  title: 'Site Survey Field Guide',
  contentPages: [
    {
      title: 'The One-Page Site Survey Form',
      content:
        "A successful AV installation depends on accurate information gathered from the physical site. Use this field guide as a checklist to ensure you capture all the critical details for a single room. **This page is designed to be printed and used on-site.**\n\n---\n\n### Site Survey Checklist\n\n**Project Name**: `_________________________` &nbsp;&nbsp;&nbsp;&nbsp; **Room Name/No.**: `_________________________`\n\n**Date**: `_________________________` &nbsp;&nbsp;&nbsp;&nbsp; **Surveyor**: `_________________________`\n\n---\n\n#### **1. Room Application & Usage**\n\n*   **Primary Use Case** (e.g., VC, Presentation, Training): `___________________________________________________`\n*   **Maximum Participants**: `________`\n*   **Furniture Layout**: &nbsp; [ &nbsp; ] **Fixed** (e.g., Boardroom Table) &nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] **Reconfigurable** (e.g., Movable Tables)\n\n---\n\n#### **2. Room Dimensions**\n\n*   **Length**: `________` m / ft\n*   **Width**: `________` m / ft\n*   **Ceiling Height**: `________` m / ft\n\n---\n\n#### **3. Construction Details** (Check all that apply)\n\n*   **Walls**:\n    *   [ &nbsp; ] Drywall / Plasterboard\n    *   [ &nbsp; ] Concrete / Brick\n    *   [ &nbsp; ] Glass / Glazing\n    *   [ &nbsp; ] Reinforced (e.g., Plywood-backed)\n*   **Ceiling**:\n    *   [ &nbsp; ] Suspended Tile Grid (e.g., 2'x2', 2'x4')\n    *   [ &nbsp; ] Drywall / Plasterboard\n    *   [ &nbsp; ] Open / Exposed Truss\n    *   [ &nbsp; ] Concrete\n*   **Floor**:\n    *   [ &nbsp; ] Carpet / Carpet Tile\n    *   [ &nbsp; ] Concrete\n    *   [ &nbsp; ] Wood / Laminate\n    *   [ &nbsp; ] Raised Access Floor\n\n---\n\n#### **4. Services & Infrastructure**\n\n*   **Power Outlet Locations**: (Mark on sketch below)\n*   **Network Port Locations**: (Mark on sketch below)\n*   **Existing Cable Containment**:\n    *   [ &nbsp; ] None\n    *   [ &nbsp; ] Surface Trunking / Raceways\n    *   [ &nbsp; ] In-Wall / In-Ceiling Conduit\n    *   [ &nbsp; ] Floor Boxes / Floor Cores\n*   **Location of nearest IT/AV Rack**: `___________________________________________________`\n\n---\n\n#### **5. Room Sketch**\n\n*Sketch the room layout below. Mark locations of doors, windows, furniture, and proposed equipment (displays, speakers, mics, table inputs).* \n\n<div style=\"height: 400px; border: 2px dashed #ccc; margin-top: 10px; padding: 10px; text-align: center; color: #999;\">SKETCH AREA</div>",
    },
  ],
  quiz: [
    {
      question: "Why is it important to identify the wall construction type during a site survey?",
      options: ["To choose the right color for the equipment", "To determine the correct type of mounting hardware and fixings", "To decide on the network speed"],
      correctAnswer: "To determine the correct type of mounting hardware and fixings",
      explanation: "You cannot use the same anchors for drywall as you would for concrete. Knowing the wall construction is critical for safely and securely mounting heavy displays or projectors.",
    },
    {
      question: "What is the primary purpose of sketching the room layout?",
      options: ["To practice drawing skills", "To visualize equipment placement and identify potential obstructions", "To create a final architectural drawing"],
      correctAnswer: "To visualize equipment placement and identify potential obstructions",
      explanation: "A sketch helps you confirm sightlines, cable paths, and the physical placement of all AV components in relation to furniture, doors, and windows.",
    },
  ],
};