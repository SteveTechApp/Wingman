import type {
  StoredApplicationProposal,
  StoredApplicationProposalBenefit,
  StoredApplicationProposalVisualBrief,
} from "../data/projectStore";
import type { RoomTemplate, TemplateBomRow } from "./roomTemplates";
import type { RoomTemplateIntegrityResult } from "./roomTemplateIntegrity";

type VerticalProfile = {
  identifiedNeed: string;
  outcomes: StoredApplicationProposalBenefit[];
  userJourney: string[];
  acceptanceCriteria: string[];
  architectureDiagram: string;
  visualBriefs: StoredApplicationProposalVisualBrief[];
};

function applicationBlob(template: RoomTemplate): string {
  return `${template.name} ${template.vertical} ${template.application} ${template.summary}`.toLowerCase();
}

function profileFor(template: RoomTemplate): VerticalProfile {
  const blob = applicationBlob(template);

  if (
    blob.includes("command") ||
    blob.includes("control room") ||
    blob.includes("situation") ||
    blob.includes("security")
  ) {
    return {
      identifiedNeed:
        "The customer requires a dependable operational environment in which authorised users can view, route and combine multiple live information sources without losing awareness or delaying incident response.",
      outcomes: [
        { title: "Operational awareness", detail: "Multiple approved sources can be presented in clear, repeatable layouts." },
        { title: "Faster response", detail: "Preset operating modes reduce the time required to configure the room." },
        { title: "Governed routing", detail: "Source and display paths are controlled through the defined WyreStorm architecture." },
        { title: "Scalable endpoints", detail: "The architecture can be expanded within the stated network and capacity design." },
        { title: "Supportable operation", detail: "The controller, network and deployment scope are included in the verified baseline." },
      ],
      userJourney: [
        "The operator selects the required operational mode.",
        "The main display environment recalls the approved source layout.",
        "Individual information sources can be promoted, compared or routed to authorised destinations.",
        "Supporting displays retain the detailed operational feeds required by each user.",
        "The room returns to its normal monitoring state when the incident or briefing ends.",
      ],
      acceptanceCriteria: [
        "Every scheduled source routes to every permitted destination.",
        "All approved multiview and wall layouts recall correctly.",
        "Control presets operate without engineering access.",
        "The selected transport platform meets the defined image-quality and latency requirement.",
        "The complete system restarts into the approved operational state following power restoration.",
      ],
      architectureDiagram: `[Operational sources]
        â”‚
        â–¼
[WyreStorm encoders / input nodes]
        â”‚
        â–¼
[Governed AV network or routing core]
        â”‚
        â”œâ”€â”€â”€â”€â”€â”€â”€â”€â–º [Main display wall / multiview]
        â”œâ”€â”€â”€â”€â”€â”€â”€â”€â–º [Operator displays]
        â””â”€â”€â”€â”€â”€â”€â”€â”€â–º [Briefing / incident destinations]
                         â–²
                         â”‚
               [Controller and user interface]`,
      visualBriefs: [
        { title: "Operations-room overview", purpose: "Show operator positions, main display environment and equipment locations." },
        { title: "Information-layout example", purpose: "Show the approved full-screen, comparison and incident layouts." },
        { title: "Network topology", purpose: "Show AV endpoints, controller, switching, resilience and control boundaries." },
        { title: "Operator workflow", purpose: "Explain normal monitoring, incident escalation and room reset." },
      ],
    };
  }

  if (blob.includes("school hall") || blob.includes("assembly") || blob.includes("multipurpose hall")) {
    return {
      identifiedNeed:
        "The customer requires a multipurpose hall system that non-technical staff can operate for assemblies and presentations while retaining protected functionality for performances and external events.",
      outcomes: [
        { title: "Simple daily operation", detail: "Preset modes allow routine assemblies to begin without technical support." },
        { title: "Flexible presentation", detail: "The verified design provides the defined stage, lectern and media source paths." },
        { title: "Clear communication", detail: "Speech, programme audio and display content are coordinated as one room system." },
        { title: "Protected advanced use", detail: "Performance functions remain available to authorised users without complicating normal operation." },
        { title: "Complete delivery scope", detail: "Required display, audio, mounting, power and installation elements remain visible in the template." },
      ],
      userJourney: [
        "A member of staff selects Assembly, Presentation, Performance or Standby.",
        "The display and audio systems activate in the correct operating mode.",
        "The user connects or selects the defined presentation source.",
        "Speech microphones and programme audio follow the chosen room mode.",
        "The room returns to a safe standby state after the event.",
      ],
      acceptanceCriteria: [
        "Every defined room mode recalls the correct display, source and audio state.",
        "All agreed source positions present correctly.",
        "Speech is intelligible throughout the stated audience area.",
        "Advanced controls are restricted to authorised users.",
        "The system returns to the documented standby condition after use.",
      ],
      architectureDiagram: `[Stage / lectern / media sources]
                â”‚
                â–¼
[WyreStorm presentation switching]
                â”‚
                â–¼
[HDBaseT / AV transport]
        â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º [Main display / projector / LED]
        â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º [Confidence display]
        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º [Recording output]

[Speech + programme audio] â”€â”€â–º [DSP / mixer] â”€â”€â–º [Amplification + loudspeakers]
[Simple control interface] â”€â”€â–º [Room modes and standby]`,
      visualBriefs: [
        { title: "Hall floor plan", purpose: "Show stage, lectern, rack, display, control and audience locations." },
        { title: "Sightline view", purpose: "Show the intended display visibility across the audience area." },
        { title: "Audio coverage concept", purpose: "Show the defined audience coverage and speech-reinforcement zones." },
        { title: "Mode-selection graphic", purpose: "Explain Assembly, Presentation, Performance and Standby workflows." },
      ],
    };
  }

  if (
    blob.includes("lecture") ||
    blob.includes("university") ||
    blob.includes("higher education") ||
    blob.includes("classroom") ||
    blob.includes("teaching")
  ) {
    return {
      identifiedNeed:
        "The customer requires a consistent teaching environment that supports the defined lecturer sources, room displays, confidence monitoring, audio, cameras, USB and capture destinations without requiring routine technical assistance.",
      outcomes: [
        { title: "Lecturer confidence", detail: "The room follows a repeatable teaching workflow with familiar source choices." },
        { title: "Hybrid delivery", detail: "Video, USB, camera and audio paths remain coordinated for local and remote participants." },
        { title: "Content visibility", detail: "The required teaching and confidence destinations are included in the verified design." },
        { title: "Capture readiness", detail: "The programme output and associated production scope are identified in the baseline." },
        { title: "Estate consistency", detail: "The template can be repeated within its stated design envelope." },
      ],
      userJourney: [
        "The lecturer selects Standard Teaching, Hybrid Teaching or Guest Presentation.",
        "The required displays, audio and camera functions activate.",
        "The lecturer selects the room PC, USB-C, HDMI, visualiser or approved wireless source.",
        "Content is routed to the teaching, confidence and capture destinations defined by the template.",
        "At the end of the session, the room returns to standby.",
      ],
      acceptanceCriteria: [
        "Every defined teaching source displays at the required destinations.",
        "USB cameras and audio devices are available to the intended host.",
        "Teaching-mode presets recall the documented room state.",
        "The capture destination receives the defined programme feed.",
        "A lecturer can complete the normal workflow without engineering assistance.",
      ],
      architectureDiagram: `[Room PC / USB-C / HDMI / visualiser / wireless]
                         â”‚
                         â–¼
          [WyreStorm presentation switching]
                         â”‚
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â–¼                â–¼                â–¼
[Main teaching]  [Confidence display]  [Capture / overflow]

[Cameras + microphones + room audio]
                         â”‚
                         â–¼
              [USB host / DSP workflow]

[Touch control] â”€â”€â–º [Sources, displays, cameras, audio and room modes]`,
      visualBriefs: [
        { title: "Lecture-theatre overview", purpose: "Show lectern, displays, cameras, loudspeakers and rack locations." },
        { title: "Lectern connection graphic", purpose: "Explain the room PC, USB-C, HDMI and guest workflow." },
        { title: "Camera-coverage view", purpose: "Show the lecturer, audience and presentation coverage." },
        { title: "Hybrid-teaching flow", purpose: "Show local content, USB devices, remote participants and capture." },
      ],
    };
  }

  if (
    blob.includes("meeting") ||
    blob.includes("huddle") ||
    blob.includes("boardroom") ||
    blob.includes("corporate")
  ) {
    return {
      identifiedNeed:
        "The customer requires a consistent meeting-room experience in which staff and guests can present content and use the defined room camera, microphone and loudspeaker without navigating a complex AV system.",
      outcomes: [
        { title: "Fewer connection steps", detail: "The verified wired and wireless workflows are clearly defined." },
        { title: "Platform flexibility", detail: "The room supports the intended BYOD, BYOM or room-computer mode." },
        { title: "Improved remote experience", detail: "Camera, microphone, loudspeaker and USB ownership remain part of the design." },
        { title: "Guest usability", detail: "The approved connection methods are easy to explain and support." },
        { title: "Technical completeness", detail: "Required receivers, USB paths, mounting and supporting scope remain governed." },
      ],
      userJourney: [
        "The user enters the room and selects the required meeting or presentation mode.",
        "The user connects through the defined USB-C, HDMI or approved wireless method.",
        "The room display presents the selected content.",
        "The conferencing application uses the specified room camera and audio devices.",
        "The room returns to standby when the user disconnects or ends the session.",
      ],
      acceptanceCriteria: [
        "Every approved source connection presents correctly.",
        "The intended conferencing host can access the room camera and audio devices.",
        "Wireless presentation operates only through the compatible governed receiver path.",
        "Normal meeting functions can be completed without technical support.",
        "The complete system returns to the documented idle or standby state.",
      ],
      architectureDiagram: `[User laptop / room PC]
        â”‚
        â”œâ”€â”€â”€â”€ Video / presentation â”€â”€â”€â”€â”
        â””â”€â”€â”€â”€ USB conferencing â”€â”€â”€â”€â”€â”€â”€â”€â”¤
                                      â–¼
                     [WyreStorm UC / presentation core]
                        â”‚          â”‚          â”‚
                        â–¼          â–¼          â–¼
                    [Display]   [Camera]   [Room audio]

[Approved wireless device] â”€â”€â–º [Compatible WyreStorm receiver]`,
      visualBriefs: [
        { title: "Meeting-room overview", purpose: "Show table, display, camera, audio and user connection position." },
        { title: "Connection choices", purpose: "Explain the approved wired and wireless workflows." },
        { title: "USB ownership diagram", purpose: "Show how the conferencing host accesses the room peripherals." },
        { title: "Five-step user journey", purpose: "Show entry, connection, meeting, presentation and standby." },
      ],
    };
  }

  return {
    identifiedNeed:
      "The customer requires a dependable AV system that presents the defined sources at the required destinations while keeping audio, USB, control, network and installation dependencies coordinated.",
    outcomes: [
      { title: "Application-led design", detail: "The system architecture is tied to the intended room workflow." },
      { title: "Complete baseline", detail: "All required system elements are retained in the verified template." },
      { title: "Clear operation", detail: "Users receive a documented sequence for normal room use." },
      { title: "Supportable deployment", detail: "Technical dependencies and delivery conditions remain visible." },
      { title: "Controlled change", detail: "Any edit that alters the governed design removes VERIFIED status." },
    ],
    userJourney: [
      "The user selects the intended room mode.",
      "The relevant source and destination devices activate.",
      "The user connects or selects the approved source.",
      "Video, audio, USB and control follow the defined architecture.",
      "The room returns to its documented standby state after use.",
    ],
    acceptanceCriteria: [
      "Every approved source reaches the required destination.",
      "The defined audio, USB and control paths operate correctly.",
      "The system follows the documented user workflow.",
      "Required dependencies are installed and commissioned.",
      "The design remains within the verified template envelope.",
    ],
    architectureDiagram: `[Defined sources]
       â”‚
       â–¼
[WyreStorm switching / transport]
       â”‚
       â”œâ”€â”€â”€â”€â”€â”€â”€â”€â–º [Displays]
       â”œâ”€â”€â”€â”€â”€â”€â”€â”€â–º [Audio]
       â”œâ”€â”€â”€â”€â”€â”€â”€â”€â–º [USB / cameras]
       â””â”€â”€â”€â”€â”€â”€â”€â”€â–º [Capture / supporting destinations]

[Control interface] â”€â”€â–º [System operating modes]`,
    visualBriefs: [
      { title: "Application overview", purpose: "Show the room, user positions and major AV elements." },
      { title: "System schematic", purpose: "Show video, audio, USB, control and network paths." },
      { title: "User workflow", purpose: "Explain the normal operating sequence." },
      { title: "Benefits summary", purpose: "Connect technical functions to customer outcomes." },
    ],
  };
}

function includedRows(rows: TemplateBomRow[]): TemplateBomRow[] {
  return rows.filter((row) => row.qty > 0 && row.status !== "excluded");
}

export function buildVerticalProposalContent(
  template: RoomTemplate,
  rows: TemplateBomRow[],
  integrity: RoomTemplateIntegrityResult,
): StoredApplicationProposal {
  const profile = profileFor(template);
  const activeRows = includedRows(rows);
  const requiredRows = activeRows.filter((row) => row.type === "Required");
  const coreSummary = requiredRows
    .slice(0, 8)
    .map((row) => `${row.qty} Ã— ${row.sku} for ${row.role}`)
    .join("; ");

  const designParameters =
    template.designParameters?.length
      ? template.designParameters
      : template.assumptions;
  const deploymentConditions =
    template.deploymentConditions?.length
      ? template.deploymentConditions
      : template.validationItems;

  return {
    vertical: template.vertical,
    application: template.application,
    executiveSummary: integrity.isVerified
      ? `The proposed ${template.name} is a complete, governed and technically verified WyreStorm room solution for ${template.application.toLowerCase()}. The system is designed around the customer workflow rather than an isolated equipment list. It combines the required source, display, audio, USB, control, network and installation elements within the template's stated design envelope. The result is a repeatable solution that can be presented, installed and commissioned as a coherent AV system.`
      : `The proposed ${template.name} began as a governed WyreStorm room solution, but the current edited version no longer matches its verified technical baseline. The following proposal explains the intended application and system architecture, but it must remain clearly marked NOT VERIFIED until the identified product, quantity or dependency changes are corrected or technically approved.`,
    customerNeed: profile.identifiedNeed,
    solutionOverview: `${template.customerNarrative} ${template.architecture} The active required equipment baseline is: ${coreSummary || "No governed required equipment remains active."}`,
    benefits: profile.outcomes,
    userJourney: profile.userJourney,
    technicalFacts: [
      `Architecture: ${template.architecture}`,
      ...template.designNotes.map(
        (item) => `${item.label}: ${item.description}`,
      ),
      `Verification state: ${integrity.status}.`,
      integrity.isVerified
        ? "All governed required rows and quantities match the verified baseline."
        : `${integrity.issues.length} technical-integrity exception(s) require correction or approval.`,
    ],
    architectureDiagram: profile.architectureDiagram,
    acceptanceCriteria: profile.acceptanceCriteria,
    visualBriefs: profile.visualBriefs,
    verifiedDesignParameters: designParameters,
    deploymentConditions,
  };
}