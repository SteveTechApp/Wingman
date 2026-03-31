import type {
  DesignDirection,
  ParsedRequirement,
  ProductFamilyHint,
  WingmanArchitecturePath
} from "./types";

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function pushIf<T>(arr: T[], condition: boolean, value: T) {
  if (condition) arr.push(value);
}

function hasMultiDisplay(parsed: ParsedRequirement): boolean {
  return (parsed.displayCount ?? 0) > 1 || parsed.flags.includes("dual-screen");
}

function hasLongDistance(parsed: ParsedRequirement): boolean {
  return (parsed.rackDistanceM ?? 0) >= 10 || parsed.flags.includes("distance-sensitive");
}

function hasUC(parsed: ParsedRequirement): boolean {
  return parsed.videoConferencing || parsed.ucPlatform !== "None";
}

function hasUSBRoomDevices(parsed: ParsedRequirement): boolean {
  return (parsed.cameras?.length ?? 0) > 0 || (parsed.microphones?.length ?? 0) > 0;
}

function hasSignage(parsed: ParsedRequirement): boolean {
  return parsed.displayType === "Digital Signage" || parsed.flags.includes("digital-signage");
}

function hasVideoWall(parsed: ParsedRequirement): boolean {
  return parsed.displayType === "Video Wall" || parsed.displayType === "LED Wall" || parsed.flags.includes("video-wall");
}

function hasCapture(parsed: ParsedRequirement): boolean {
  return parsed.lectureCapture || parsed.streaming || parsed.recording || parsed.flags.includes("hybrid-learning");
}

function isDivisible(parsed: ParsedRequirement): boolean {
  return (
    parsed.openQuestions.some((q) => q.toLowerCase().includes("combined versus divided")) ||
    (parsed.roomType ?? "").toLowerCase().includes("training") ||
    parsed.complexity === "Complex"
  );
}

function isControlRoom(parsed: ParsedRequirement): boolean {
  return parsed.vertical === "Control Room" || (parsed.roomType ?? "").toLowerCase().includes("control");
}

function buildMissingDetails(parsed: ParsedRequirement): string[] {
  const missing: string[] = [];

  if (!parsed.roomType || parsed.roomType === "Unknown") missing.push("Confirm the exact room/application type.");
  if (!parsed.capacity && parsed.complexity !== "Tender") missing.push("Confirm typical room capacity or audience size.");
  if (!parsed.displayType || parsed.displayType === "Unknown") missing.push("Confirm display type and screen quantity.");
  if (!parsed.connectivity?.length) missing.push("Confirm user connection methods such as HDMI, USB-C, or wireless.");
  if (!parsed.rackDistanceM && !parsed.flags.includes("multi-room")) missing.push("Confirm cable distances and rack location.");
  if (hasMultiDisplay(parsed)) missing.push("Confirm whether displays must mirror, split, or switch between both modes.");
  if (hasUC(parsed) && !parsed.ucPlatform) missing.push("Confirm the preferred conferencing platform.");
  if (hasUC(parsed) && !hasUSBRoomDevices(parsed)) missing.push("Confirm camera and microphone requirements.");
  if (parsed.flags.includes("multi-room")) missing.push("Confirm whether standardisation across rooms is required.");
  if (hasSignage(parsed)) missing.push("Confirm who manages content and whether local override is needed.");
  if (hasVideoWall(parsed)) missing.push("Confirm content layout, source count, and whether scaling/windowing is required.");
  if (hasCapture(parsed)) missing.push("Confirm recording, streaming, or lecture-capture workflow in more detail.");

  return unique(missing);
}

export function buildDesignDirection(parsed: ParsedRequirement): DesignDirection {
  const secondaryArchitectures: WingmanArchitecturePath[] = [];
  const productFamilyHints: ProductFamilyHint[] = [];
  const whyThisPath: string[] = [];
  const designNotes: string[] = [];

  let primaryArchitecture: WingmanArchitecturePath = "Undetermined";

  if (isControlRoom(parsed)) {
    primaryArchitecture = "Control Room / Operations";
    whyThisPath.push("The requirement points to operator-driven viewing and source management.");
    pushIf(productFamilyHints, true, "NetworkHD");
    pushIf(productFamilyHints, true, "Video Wall");
    pushIf(productFamilyHints, true, "Control");
  } else if (hasVideoWall(parsed)) {
    primaryArchitecture = "Video Wall / LED Processing";
    whyThisPath.push("The display requirement indicates a video wall or LED-style presentation workflow.");
    pushIf(productFamilyHints, true, "Video Wall");
    pushIf(productFamilyHints, parsed.flags.includes("multi-room"), "NetworkHD");
    pushIf(productFamilyHints, true, "Digital Signage");
  } else if (hasSignage(parsed)) {
    primaryArchitecture = "Digital Signage Distribution";
    whyThisPath.push("The requirement is primarily content distribution rather than active room collaboration.");
    pushIf(productFamilyHints, true, "Digital Signage");
    pushIf(productFamilyHints, parsed.flags.includes("multi-room"), "NetworkHD");
    pushIf(productFamilyHints, parsed.flags.includes("multi-room"), "Control");
  } else if (hasCapture(parsed) && parsed.vertical === "Education") {
    primaryArchitecture = "Lecture Capture / Hybrid Teaching";
    whyThisPath.push("The room requires teaching workflow support with recording, streaming, or hybrid delivery.");
    pushIf(productFamilyHints, true, "Switching / Presentation");
    pushIf(productFamilyHints, true, "USB Extension");
    pushIf(productFamilyHints, true, "Audio");
    pushIf(productFamilyHints, parsed.flags.includes("network-infrastructure-available"), "NetworkHD");
  } else if (isDivisible(parsed) && parsed.flags.includes("easy-to-use-required")) {
    primaryArchitecture = "Divisible Room / Multi-Mode Space";
    whyThisPath.push("The workflow suggests changing room states or user modes that need guided switching and control.");
    pushIf(productFamilyHints, true, "Matrix");
    pushIf(productFamilyHints, true, "Control");
    pushIf(productFamilyHints, hasLongDistance(parsed), "HDBaseT");
  } else if (parsed.flags.includes("multi-room") || parsed.flags.includes("network-infrastructure-available")) {
    primaryArchitecture = "AV over IP Distribution";
    whyThisPath.push("The project scale or infrastructure suggests a distributed architecture rather than isolated room-only products.");
    pushIf(productFamilyHints, true, "NetworkHD");
    pushIf(productFamilyHints, true, "Control");
  } else if (hasUC(parsed) && hasUSBRoomDevices(parsed) && hasMultiDisplay(parsed)) {
    primaryArchitecture = "Dual Display Room";
    whyThisPath.push("The room combines conferencing, room peripherals, and more than one display.");
    pushIf(productFamilyHints, true, "Apollo");
    pushIf(productFamilyHints, true, "USB Extension");
    pushIf(productFamilyHints, true, "Matrix");
    pushIf(productFamilyHints, !!(parsed.touchPanelRequired || parsed.controlRequired), "Control");
  } else if (hasUC(parsed) && hasUSBRoomDevices(parsed)) {
    primaryArchitecture = "Room Switching + UC";
    whyThisPath.push("The room combines presentation switching with conferencing peripherals.");
    pushIf(productFamilyHints, true, "Apollo");
    pushIf(productFamilyHints, true, "USB Extension");
    pushIf(productFamilyHints, true, "Switching / Presentation");
    pushIf(productFamilyHints, !!(parsed.touchPanelRequired || parsed.controlRequired), "Control");
  } else if (hasUC(parsed) && parsed.ucPlatform === "BYOM") {
    primaryArchitecture = "BYOM / USB-Collaboration Room";
    whyThisPath.push("The room requires user laptops to take control of room AV peripherals.");
    pushIf(productFamilyHints, true, "Apollo");
    pushIf(productFamilyHints, true, "USB Extension");
    pushIf(productFamilyHints, true, "Control");
  } else if (hasLongDistance(parsed)) {
    primaryArchitecture = "Room HDMI / USB-C Extension";
    whyThisPath.push("The main challenge appears to be extending sources reliably over distance.");
    pushIf(productFamilyHints, true, "HDBaseT");
    pushIf(productFamilyHints, true, "Switching / Presentation");
  } else if (hasMultiDisplay(parsed)) {
    primaryArchitecture = "Dual Display Room";
    whyThisPath.push("The room needs coordinated switching across multiple displays.");
    pushIf(productFamilyHints, true, "Matrix");
    pushIf(productFamilyHints, !!(parsed.controlRequired || parsed.touchPanelRequired), "Control");
  } else if (parsed.speakers || parsed.vertical === "Hospitality") {
    primaryArchitecture = "Large Room Audio + Presentation";
    whyThisPath.push("The requirement includes room audio considerations alongside presentation.");
    pushIf(productFamilyHints, true, "Audio");
    pushIf(productFamilyHints, hasLongDistance(parsed), "HDBaseT");
    pushIf(productFamilyHints, true, "Switching / Presentation");
  }

  pushIf(secondaryArchitectures, hasLongDistance(parsed) && primaryArchitecture !== "Room HDMI / USB-C Extension", "Room HDMI / USB-C Extension");
  pushIf(secondaryArchitectures, hasUC(parsed) && primaryArchitecture !== "Room Switching + UC", "Room Switching + UC");
  pushIf(secondaryArchitectures, hasUC(parsed) && parsed.ucPlatform === "BYOM" && primaryArchitecture !== "BYOM / USB-Collaboration Room", "BYOM / USB-Collaboration Room");
  pushIf(secondaryArchitectures, hasMultiDisplay(parsed) && primaryArchitecture !== "Dual Display Room", "Dual Display Room");
  pushIf(secondaryArchitectures, parsed.flags.includes("multi-room") && primaryArchitecture !== "AV over IP Distribution", "AV over IP Distribution");
  pushIf(secondaryArchitectures, hasSignage(parsed) && primaryArchitecture !== "Digital Signage Distribution", "Digital Signage Distribution");
  pushIf(secondaryArchitectures, hasCapture(parsed) && primaryArchitecture !== "Lecture Capture / Hybrid Teaching", "Lecture Capture / Hybrid Teaching");
  pushIf(secondaryArchitectures, isDivisible(parsed) && primaryArchitecture !== "Divisible Room / Multi-Mode Space", "Divisible Room / Multi-Mode Space");

  if (hasLongDistance(parsed)) {
    designNotes.push("Treat cable distance and equipment location as a first-order design decision.");
  }
  if (hasMultiDisplay(parsed)) {
    designNotes.push("Confirm mirrored versus independent content behavior early to avoid incorrect switching architecture.");
  }
  if (hasUC(parsed)) {
    designNotes.push("Confirm whether conferencing is appliance-based, room-PC based, or BYOM, as this changes USB and control design.");
  }
  if (hasUSBRoomDevices(parsed)) {
    designNotes.push("USB transport and peripheral switching should be validated early, especially for BYOM or front-of-room device workflows.");
  }
  if (parsed.flags.includes("multi-room")) {
    designNotes.push("Look for standardisation opportunities across rooms to simplify support, quoting, and rollout.");
  }
  if (hasSignage(parsed)) {
    designNotes.push("Separate content-management questions from AV transport questions so signage scope is properly defined.");
  }
  if (hasVideoWall(parsed)) {
    designNotes.push("Confirm wall layout, source count, scaling needs, and content management before narrowing processor options.");
  }
  if (hasCapture(parsed)) {
    designNotes.push("Capture requirements often bring in third-party platforms, so define system boundaries clearly.");
    pushIf(productFamilyHints, true, "Third-Party / External");
  }
  if (parsed.controlRequired || parsed.touchPanelRequired || parsed.flags.includes("easy-to-use-required")) {
    designNotes.push("User experience matters here, so simplify workflow into room modes rather than exposing technical routing choices.");
    pushIf(productFamilyHints, true, "Control");
  }

  const commercialSummary = (() => {
    switch (primaryArchitecture) {
      case "Room HDMI / USB-C Extension":
        return "This looks like a straightforward room-extension opportunity where reliability over distance is the main commercial issue.";
      case "Room Switching + UC":
        return "This looks like a standard meeting-room opportunity combining presentation switching with conferencing workflow.";
      case "Dual Display Room":
        return "This looks like a higher-value meeting space where multi-display behavior and conferencing workflow must be defined properly.";
      case "BYOM / USB-Collaboration Room":
        return "This looks like a collaboration-led room where user laptops need to access room peripherals cleanly and predictably.";
      case "AV over IP Distribution":
        return "This looks like a scalable multi-room or infrastructure-led opportunity where standardisation and central support matter.";
      case "Video Wall / LED Processing":
        return "This looks like a display-led opportunity where processing, content arrangement, and visual presentation are central.";
      case "Digital Signage Distribution":
        return "This looks like a signage-led opportunity focused on content delivery, control, and ongoing management.";
      case "Lecture Capture / Hybrid Teaching":
        return "This looks like an education-focused opportunity where teaching workflow and capture requirements drive the design.";
      case "Large Room Audio + Presentation":
        return "This looks like a presentation space where audio coverage and room usability are just as important as video switching.";
      case "Divisible Room / Multi-Mode Space":
        return "This looks like a flexible-space opportunity where control modes and room state changes will define the user experience.";
      case "Control Room / Operations":
        return "This looks like an operational viewing environment where reliability, layout control, and source management drive the architecture.";
      default:
        return "This opportunity still needs a little more definition before a primary architecture path is selected.";
    }
  })();

  const technicalSummary = [
    `Primary architecture: ${primaryArchitecture}.`,
    secondaryArchitectures.length ? `Secondary considerations: ${unique(secondaryArchitectures).join(", ")}.` : "",
    productFamilyHints.length ? `Likely product-family directions: ${unique(productFamilyHints).join(", ")}.` : ""
  ]
    .filter(Boolean)
    .join(" ");

  const missingDetailsBeforeBom = buildMissingDetails(parsed);

  let suitabilityScore = 0.68;
  if (primaryArchitecture !== "Undetermined") suitabilityScore += 0.1;
  if (productFamilyHints.length >= 2) suitabilityScore += 0.08;
  if (missingDetailsBeforeBom.length <= 4) suitabilityScore += 0.08;
  if (parsed.confidence >= 0.8) suitabilityScore += 0.06;
  suitabilityScore = Math.max(0.2, Math.min(0.98, Number(suitabilityScore.toFixed(2))));

  return {
    primaryArchitecture,
    secondaryArchitectures: unique(secondaryArchitectures),
    productFamilyHints: unique(productFamilyHints.length ? productFamilyHints : ["Undetermined"]),
    commercialSummary,
    technicalSummary,
    whyThisPath: unique(whyThisPath),
    designNotes: unique(designNotes),
    missingDetailsBeforeBom,
    suitabilityScore
  };
}
