export type ProductCallCommercialOverride = {
  conversationStarters?: string[];
  askNext?: string[];
  objections?: string[];
  followUp?: string;
};

function audioAmpOverride(sku: string, followUp: string): ProductCallCommercialOverride {
  return {
    conversationStarters: [
      "Is the room audio still undefined even though the video path is mostly clear?",
      "Are they trying to drive installed loudspeakers or just relying on display audio today?",
      "Is Dante or wider network-audio coordination already part of the design?",
      "Who owns audio commissioning once the system is installed?",
    ],
    askNext: [
      "What loudspeakers, zones and power load are actually required?",
      "What is feeding the amplifier: local analogue, DSP output or Dante/network audio?",
      "Does the room also need microphone/conferencing audio handling beyond loudspeaker power?",
      "Who is commissioning the audio path and control method before quote?",
    ],
    objections: [
      `If the customer says ${sku} is just an amp, bring the discussion back to the room audio design: loudspeaker load, source path, control and commissioning still decide fit.`,
      "If they say they already have audio, check whether they really mean playback only or whether the room also needs conferencing, paging or network-audio coordination.",
      "If price pressure pushes them toward a generic alternative, anchor on supportable system fit rather than wattage headlines alone.",
    ],
    followUp,
  };
}

function apolloAudioOverride(sku: string, followUp: string): ProductCallCommercialOverride {
  return {
    conversationStarters: [
      "Is the real complaint call quality, room usability or both?",
      "Are users bringing their own laptop, using a room PC or doing mixed BYOD/BYOM?",
      "Is the space still a small-room workflow, or is it drifting into larger audio-design territory?",
      "What part of the current experience is breaking first: pickup, speaker coverage, connection or wireless presentation?",
    ],
    askNext: [
      "How many people normally use the room and how are they seated?",
      "What is the host path for calls and content sharing day to day?",
      "What camera, microphone and speaker behaviour must the room own reliably?",
      "What still needs validating before quote: room size, pickup coverage, wireless policy or attached peripherals?",
    ],
    objections: [
      `If the customer says ${sku} feels like an extra box, tie it back to the broken room workflow it fixes rather than listing features.`,
      "If they say the room already works, ask whether it works for everyday users or only for the person who knows the workaround.",
      "If they compare it to a cheaper USB accessory, check whether that alternative still covers the real call path, room coverage and support expectation.",
    ],
    followUp,
  };
}

function cameraOverride(sku: string, followUp: string): ProductCallCommercialOverride {
  return {
    conversationStarters: [
      "What exactly needs to be seen clearly: presenter, whole table, audience or whiteboard?",
      "Is this camera feeding conferencing, teaching capture, streaming or a wider AV workflow?",
      "Where will the camera sit and how much control or presets does the room need?",
      "Does the room need one camera only, or is there a bridge/multi-camera question behind the brief?",
    ],
    askNext: [
      "What field of view and mounting position does the room actually need?",
      "What output path matters here: USB, HDMI, NDI or a bridged workflow?",
      "Who needs to control the camera and how often will presets or tracking be used?",
      "Is the camera the real lead answer, or does the job also need a bridge or switching layer?",
    ],
    objections: [
      `If the customer says any PTZ camera will do, bring the conversation back to framing, output workflow and control, because that is where ${sku} is won or lost.`,
      "If they only compare resolution, ask how the camera integrates into the wider room or capture system.",
      "If they want one product to solve a multi-camera workflow, check whether a bridge or mixer discussion is being missed.",
    ],
    followUp,
  };
}

function extenderOverride(sku: string, followUp: string): ProductCallCommercialOverride {
  return {
    conversationStarters: [
      "Is this genuinely a point-to-point transport problem rather than a hidden switching requirement?",
      "What else has to travel with the signal besides video: USB, KVM, control or audio?",
      "Where are the source and destination physically located?",
      "Is the installed cable route already known, or is that still an assumption?",
    ],
    askNext: [
      "What is the real installed distance and cable path quality?",
      "What signal format and peripherals need to survive that path reliably?",
      "Does the room need simple extension only, or is there actually a routing/matrix decision behind it?",
      "What still needs validating before quote: cable type, USB behaviour, control pass-through or remote user workflow?",
    ],
    objections: [
      `If the customer says ${sku} should be enough because the distance looks short, check the real installed route and what else must travel with the signal before agreeing.`,
      "If they compare it to a cheaper extender, ask whether that alternative still covers the required control, USB or support expectations.",
      "If the brief starts growing toward multiple destinations, pause and confirm whether the job has moved beyond extension into switching or distribution.",
    ],
    followUp,
  };
}

function compactMatrixOverride(sku: string, followUp: string): ProductCallCommercialOverride {
  return {
    conversationStarters: [
      "Is this a contained room or rack routing job, or is it starting to behave like wider distribution?",
      "How many true sources and independently routed outputs are actually needed?",
      "What is the everyday user workflow once the switching is installed?",
      "Are there USB, audio or control expectations that change the product family choice?",
    ],
    askNext: [
      "What is the real input and output count today, and what is likely to be added later?",
      "Are the outputs local, extended, mirrored or truly independently routed?",
      "What user-facing control experience does the room need day to day?",
      "What still needs validating before quote: transport distance, scaling, USB/audio needs or future growth?",
    ],
    objections: [
      `If the customer says ${sku} is too much, compare it against the real source/output workflow rather than the cheapest switcher in the market.`,
      "If they want to treat mirrored or local monitor outputs as extra routed zones, reset the conversation around the true matrix capacity.",
      "If the job may grow across spaces or floors, pause and check whether the architecture is drifting toward AVoIP instead.",
    ],
    followUp,
  };
}

function largerMatrixOverride(sku: string, followUp: string): ProductCallCommercialOverride {
  return {
    conversationStarters: [
      "Is the customer asking for a serious contained routing system, or a building-wide distribution platform?",
      "How many sources and display zones are genuinely fixed and known?",
      "Is hospitality, sports bar, head-end or another multi-display commercial workflow driving the sale?",
      "How will staff actually control routing once the system is live?",
    ],
    askNext: [
      "Is the real requirement eight by eight, or is that only a starting assumption?",
      "What are the output transport distances and display-zone behaviours?",
      "What control and support expectations will the site staff have day to day?",
      "What still needs validating before quote: expansion pressure, HDCP/scaling, receiver path or architecture choice?",
    ],
    objections: [
      `If the customer says ${sku} should be compared to any 8x8, bring the discussion back to transport path, control and supportability, not only the matrix size headline.`,
      "If they want more future flexibility than the fixed matrix shape allows, pause and test whether AVoIP is the cleaner long-term direction.",
      "If cost is the pushback, ask whether a cheaper matrix still protects the staff workflow and the distance/control requirements on site.",
    ],
    followUp,
  };
}

function hybridMatrixOverride(sku: string, followUp: string): ProductCallCommercialOverride {
  return {
    conversationStarters: [
      "Is this really a hybrid teaching or meeting-room workflow rather than a basic switcher conversation?",
      "What has to happen between presentation, USB devices, displays and audio in one joined-up room flow?",
      "Where are the sources and peripherals physically located?",
      "Does the room need to be repeatable across multiple spaces or is it a one-off design?",
    ],
    askNext: [
      "How many sources, displays and USB devices must the room handle every day?",
      "What teaching or hybrid-working workflow breaks if the room is underspecified?",
      "What control, audio and extension behaviour must be included from day one?",
      "What still needs validating before quote: source mix, USB ownership, display path or repeatability across rooms?",
    ],
    objections: [
      `If the customer says ${sku} feels like too much, compare it against the real room workflow they want, not against a basic switcher that would leave gaps.`,
      "If they only describe presentation, check whether conferencing, USB or room control still needs to be owned by the same design.",
      "If the job is much simpler than first described, be willing to step down rather than forcing a bigger hybrid answer.",
    ],
    followUp,
  };
}

function networkSourceOverride(sku: string, tier: string, followUp: string): ProductCallCommercialOverride {
  return {
    conversationStarters: [
      "Is the source really joining an existing or planned NetworkHD system, or would local switching still be enough?",
      `What is driving the ${tier} architecture: flexibility, distance, scale, performance or future growth?`,
      "Which NetworkHD series is already on site or already being proposed?",
      "Who owns the AV network and controller design behind the endpoints?",
    ],
    askNext: [
      "What source is entering the NetworkHD system and what role does it play in the wider design?",
      "Which matching series, controller and switch environment must this endpoint live inside?",
      "What display or room destinations depend on this source path working correctly?",
      "What still needs validating before quote: series match, network readiness, control path or whether AVoIP is justified at all?",
    ],
    objections: [
      `If the customer says ${sku} is just a transmitter, bring the discussion back to the wider NetworkHD system because the endpoint only makes sense inside the right architecture.`,
      "If they compare it to a matrix input, check whether the project really needs routed AV flexibility across rooms or whether the architecture is being oversold.",
      "If the installed series or network ownership is still unclear, do not let the quote move ahead as if the endpoint were standalone.",
    ],
    followUp,
  };
}

function networkDisplayOverride(sku: string, tier: string, followUp: string): ProductCallCommercialOverride {
  return {
    conversationStarters: [
      `Is this display location genuinely part of a ${tier} NetworkHD design, or is the job really local extension or matrix output?`,
      "How many display endpoints need to be managed and routed as part of the system?",
      "What controller and switch design sits behind the receiving endpoint?",
      "What matters most at the display side: scale, quality, latency, flexibility or ease of support?",
    ],
    askNext: [
      "What does this display endpoint need to receive, and from which wider source architecture?",
      "Which matching series, controller and network design are already fixed?",
      "How many similar endpoints will exist across the site, and how are they being controlled?",
      "What still needs validating before quote: series match, display behaviour, switch capacity or whether the architecture should stay AVoIP at all?",
    ],
    objections: [
      `If the customer says ${sku} is interchangeable with any receiver, confirm the exact NetworkHD series and system design before agreeing.`,
      "If they only care about one screen, check whether a simpler local architecture would solve the job more cleanly.",
      "If the wider controller or switch ownership is undefined, pause before treating the endpoint as quote-ready.",
    ],
    followUp,
  };
}

function networkFlexibleEndpointOverride(sku: string, tier: string, followUp: string): ProductCallCommercialOverride {
  return {
    conversationStarters: [
      `Is deployment flexibility at the endpoint actually valuable in this ${tier} system, or is the role already fixed?`,
      "How many endpoints are being planned, and how much role flexibility does the integrator really need?",
      "Is this a new NetworkHD design or an extension of an existing estate?",
      "Who owns the controller and switch design across the project?",
    ],
    askNext: [
      "How will endpoints be assigned across sources and displays as the project is commissioned?",
      "What matching series, network and controller decisions are already locked in?",
      "Does the customer value deployment flexibility enough to justify this endpoint choice?",
      "What still needs validating before quote: endpoint planning, switch capacity, controller path or whether the performance tier is right?",
    ],
    objections: [
      `If the customer says ${sku} is overkill, test whether they truly need endpoint flexibility or whether a fixed-role endpoint is cleaner.`,
      "If they compare it only on price, bring the conversation back to commissioning flexibility and long-term support.",
      "If the wider NetworkHD architecture is still soft, do not oversell the endpoint before the system shape is agreed.",
    ],
    followUp,
  };
}

function networkInWallOverride(sku: string, followUp: string): ProductCallCommercialOverride {
  return {
    conversationStarters: [
      "Is the room-facing source entry point part of the user experience problem the customer is trying to solve?",
      "Does the wallplate need to feed an existing NetworkHD 500 design or a new one?",
      "What local devices will users actually connect at that wall location or lectern?",
      "How is the room controlled once that local input joins the wider AVoIP platform?",
    ],
    askNext: [
      "What source formats and user behaviours must the in-wall position support day to day?",
      "Where exactly will the wallplate live and what room workflow depends on it?",
      "Which matching NetworkHD series, controller and switch design are already decided?",
      "What still needs validating before quote: wall position, source expectation, control ownership or whether AVoIP is the right backbone?",
    ],
    objections: [
      `If the customer says ${sku} is just a wallplate, bring the conversation back to how local room inputs join the wider routed AV design.`,
      "If they want to compare it to a standalone plate, check whether the room really needs to feed a NetworkHD platform instead.",
      "If the user workflow at the wall is still vague, do not assume the input point is in the right place yet.",
    ],
    followUp,
  };
}

function networkControllerOverride(sku: string, followUp: string): ProductCallCommercialOverride {
  return {
    conversationStarters: [
      "Who is actually managing routing, presets and day-to-day control across the NetworkHD system?",
      "Is the project still just a list of endpoints, or has it become a commissioned system conversation?",
      "How exposed does the control workflow need to be for the integrator or end user?",
      "Who owns network and commissioning responsibility once the hardware is installed?",
    ],
    askNext: [
      "What series, endpoint count and routing behaviour must the controller own?",
      "What presets, user control and automation expectations are on the brief?",
      "Who is responsible for switch setup, commissioning and ongoing support?",
      "What still needs validating before quote: control scope, network ownership, system scale or integration exposure?",
    ],
    objections: [
      `If the customer says ${sku} is optional, ask who is expected to manage the NetworkHD system once it is live.`,
      "If they think endpoints alone are enough, test whether the routing, preset and commissioning story is actually covered anywhere else.",
      "If responsibilities between AV and IT are still blurred, pause before promising a clean control outcome.",
    ],
    followUp,
  };
}

function networkUsbOverride(sku: string, followUp: string): ProductCallCommercialOverride {
  return {
    conversationStarters: [
      "Is the real unsolved problem USB ownership rather than video transport?",
      "What devices need to behave as if they are local even though the host is elsewhere?",
      "How far apart are the host PC and the camera, touch or peripheral devices?",
      "Is the wider NetworkHD control path already defined, or is USB being discussed in isolation?",
    ],
    askNext: [
      "Which USB devices are involved and what bandwidth or reliability expectations do they carry?",
      "Where are the host and peripherals physically located in the room or building?",
      "What user workflow breaks today if the USB path is not handled properly?",
      "What still needs validating before quote: device type, control path, host ownership or whether video and USB are being solved together?",
    ],
    objections: [
      `If the customer says ${sku} is only a peripheral add-on, bring the discussion back to the user workflow that fails when USB ownership is ignored.`,
      "If they compare it to generic USB extension, check whether the room also depends on the wider NetworkHD and control architecture.",
      "If the host path is still vague, do not assume the USB design is quote-ready.",
    ],
    followUp,
  };
}

function presentationInputOverride(sku: string, followUp: string): ProductCallCommercialOverride {
  return {
    conversationStarters: [
      "Is the customer really struggling with how users connect in the room rather than with signal switching in general?",
      "What laptops and source devices are presenters actually bringing in day to day?",
      "Where should the user-facing connection point live to make the room feel obvious?",
      "Does this input point feed a bigger switcher, matrix or display workflow behind it?",
    ],
    askNext: [
      "What source devices and connection types must the room support every day?",
      "Where is the right place for the user-facing handoff: table, wall, lectern or elsewhere?",
      "What downstream switcher, matrix or display path is this feeding?",
      "What still needs validating before quote: connection mix, room workflow, cable path or whether wireless/USB switching is also needed?",
    ],
    objections: [
      `If the customer says ${sku} is just a wallplate, ask whether the current connection experience is already simple enough for everyday users.`,
      "If they want to compare it only on connector count, bring the discussion back to room usability and downstream system fit.",
      "If the room also needs source selection, USB or wireless presentation, be careful not to leave the bigger workflow unsolved.",
    ],
    followUp,
  };
}

function presentationSwitcherOverride(sku: string, followUp: string): ProductCallCommercialOverride {
  return {
    conversationStarters: [
      "What is actually making the room awkward today: source choice, wireless sharing, USB ownership or user confusion?",
      "How many source types need to connect reliably every day?",
      "Is this presentation only, or is there a BYOD/BYOM or conferencing expectation too?",
      "What does the user expect to happen when they walk in and connect?",
    ],
    askNext: [
      "What is the true source mix: HDMI, USB-C, wireless or all three?",
      "How many displays or downstream outputs must the room support?",
      "Does the room also need USB switching, audio handling or user-facing control?",
      "What still needs validating before quote: wireless policy, BYOD workflow, display path or whether the room has outgrown this tier?",
    ],
    objections: [
      `If the customer says ${sku} is too much for the room, compare it against the actual user workflow instead of only the source count.`,
      "If they think a basic HDMI switch is enough, ask whether it still covers wireless sharing, USB expectations and day-to-day ease of use.",
      "If the room is drifting toward a bigger hybrid or matrix requirement, be willing to move up rather than force a smaller switcher.",
    ],
    followUp,
  };
}

function controlOverride(sku: string, followUp: string): ProductCallCommercialOverride {
  return {
    conversationStarters: [
      "Does the room need to feel simple for the user even though the AV logic behind it is not simple?",
      "What exactly must the control layer own: routing, presets, display control, audio or room startup?",
      "Who is commissioning the control workflow and supporting it later?",
      "Which WyreStorm devices or wider room elements have to be tied together cleanly?",
    ],
    askNext: [
      "What does the user need to control in one press or one workflow?",
      "Which devices and actions are in scope for the control layer?",
      "Where will the control point live and who is responsible for commissioning it?",
      "What still needs validating before quote: control scope, compatibility, network/power location or support ownership?",
    ],
    objections: [
      `If the customer says ${sku} is only an accessory, bring the discussion back to user confidence and how the room is actually operated day to day.`,
      "If they think manual switching is enough, ask whether the end user can reliably run the room without support.",
      "If commissioning ownership is unclear, do not present the control outcome as simple or finished yet.",
    ],
    followUp,
  };
}

const PRODUCT_CALL_COMMERCIAL_OVERRIDES: Record<string, ProductCallCommercialOverride> = {
  "AMP-2120-DNT": audioAmpOverride("AMP-2120-DNT", "This sounds like an installed room-audio discussion where Dante and loudspeaker power have to be treated as part of the full AV design, not as an afterthought. AMP-2120-DNT may be the right path if the room needs a supportable amplifier choice, but we should confirm loudspeaker load, source path, Dante ownership and commissioning before quote."),
  "AMP-260-DNT": audioAmpOverride("AMP-260-DNT", "This looks like a compact installed-audio requirement where the room still needs a proper loudspeaker and Dante-aware design story. AMP-260-DNT may be relevant if the room needs a tidier network-audio amplifier path, but we should confirm loudspeaker load, source feed, control and commissioning before quote."),
  "APO-VX20-UC": {
    conversationStarters: [
      "Has the room outgrown a compact video bar's built-in camera coverage?",
      "Does the camera need to pan, tilt or zoom to reach people further from the table?",
      "Does the customer specifically need the APO-DG2 dongle, or just general wireless presentation casting?",
      "Is the table large enough that built-in bar-microphone pickup is no longer enough?",
    ],
    askNext: [
      "How many people use the room and how large is it compared to a standard huddle room?",
      "Is APO-VX20-UC-V2's built-in camera coverage genuinely insufficient here?",
      "Is the APO-DG2 dongle specifically required? It's only compatible with APO-VX20-UC-V2, not APO-VX20-UC.",
      "Does the table need an extension microphone, and which PTZ camera (CAM-420-PTZ or CAM-210-PTZ) fits the room?",
    ],
    objections: [
      "If the customer says they just need better audio, check whether the room has actually outgrown APO-VX20-UC-V2's camera coverage - that's the real reason to move to APO-VX20-UC, not audio alone.",
      "If they ask about the APO-DG2 dongle, be direct: it's not compatible with APO-VX20-UC, only APO-VX20-UC-V2. APO-VX20-UC still supports wireless casting of video/audio presentation content on its own.",
      "If price pressure pushes toward keeping the compact bar, confirm the camera coverage gap is real before defending the larger-room upgrade.",
    ],
    followUp: "This sounds like the room has outgrown APO-VX20-UC-V2's built-in camera coverage rather than a pure audio problem. APO-VX20-UC is the right conversation once the room needs a dedicated PTZ camera (CAM-420-PTZ or CAM-210-PTZ). It still supports wireless casting of video/audio presentation content, but the APO-DG2 dongle itself is APO-VX20-UC-V2 only. Confirm room size, camera coverage gap, table layout and whether APO-DG2 is specifically required before quote.",
  },
  "APO-COM-MIC": apolloAudioOverride("APO-COM-MIC", "This looks like an Apollo room that is close to working but still short on microphone coverage. APO-COM-MIC may be relevant if the issue is pickup across the table rather than video, but we should confirm compatibility, seating layout, cable path and whether one companion mic is enough."),
  "APO-DG2-PRO": apolloAudioOverride("APO-DG2-PRO", "This sounds like a user-experience problem around guest presentation and BYOD flow rather than a raw signal problem. APO-DG2-PRO may be relevant if the room needs cleaner sharing and less friction at the table, but we should confirm Apollo fit, wireless policy and the host-device expectation before quote."),
  "CAM-420-PTZ": cameraOverride("CAM-420-PTZ", "This looks like a camera-role decision where framing, placement and control matter more than a generic resolution comparison. CAM-420-PTZ may be relevant if the room needs a controlled PTZ workflow, but we should confirm field of view, mounting position, output path and whether a bridge workflow is also needed."),
  "EX-100-H2": extenderOverride("EX-100-H2", "This appears to be a point-to-point transport requirement rather than a switching design. EX-100-H2 may be relevant if the signal simply needs to get reliably from source to display, but we should confirm cable route, format, control pass-through and whether the room is still genuinely point to point."),
  "EX-100-KVM": extenderOverride("EX-100-KVM", "This looks like a remote-user workflow problem rather than video-only transport. EX-100-KVM may be relevant if keyboard, mouse or USB control has to follow the display path, but we should confirm KVM expectations, cable route, host location and whether the job also needs switching."),
  "EX-100-USB3": extenderOverride("EX-100-USB3", "This sounds like a USB ownership problem over distance rather than a simple display path. EX-100-USB3 may be relevant if remote peripherals still need to behave reliably beside the user, but we should confirm device type, bandwidth, host/peripheral locations and the wider room workflow."),
  "EX-35-8K": extenderOverride("EX-35-8K", "This looks like a clean point-to-point transport requirement where a direct local connection is not enough, but the job still does not need matrixing or AVoIP. EX-35-8K may be relevant if the cable path and source/display capability line up, but we should confirm installed distance, cable quality and any control or USB dependency."),
  "EX-70-H2": extenderOverride("EX-70-H2", "This appears to be a straightforward extension job where reliability over distance matters more than adding switching. EX-70-H2 may be relevant if the room is still point to point, but we should confirm cable route, control pass-through and whether the brief is hiding a wider routing requirement."),
  "MX-0402-MST": compactMatrixOverride("MX-0402-MST", "This sounds like a contained small-room routing job where the customer still needs a professional switching experience, not a cheap selector. MX-0402-MST may be relevant if the source and output count stays modest, but we should confirm true I/O, control expectations, audio needs and whether the room remains in this tier."),
  "MX-0403-H3-MST": compactMatrixOverride("MX-0403-H3-MST", "This looks like a compact room workflow discussion where the user experience matters more than just finding any small switcher. MX-0403-H3-MST may be relevant if the room needs a contained but credible switching core, but we should confirm source count, output path and whether USB, audio or control pushes it into another family."),
  "MX-0404-SCL": compactMatrixOverride("MX-0404-SCL", "This appears to be a contained matrix sale rather than an AVoIP sale. MX-0404-SCL may be relevant if the customer needs predictable local routing across a known number of sources and displays, but we should confirm true I/O, scaling behaviour, HDCP/EDID and everyday control before quote."),
  "MX-0808-H2A-MK2": largerMatrixOverride("MX-0808-H2A-MK2", "This sounds like a serious but still contained routing requirement where the right answer may still be a fixed matrix, not networked distribution. MX-0808-H2A-MK2 may be relevant if the source and display counts are understood, but we should confirm 8x8 fit, transport distance, staff control expectations and future growth."),
  "MX-0808-KIT-V2": largerMatrixOverride("MX-0808-KIT-V2", "This looks like a contained multi-display routing job where matched matrix and extension may be cleaner than moving into AVoIP. MX-0808-KIT-V2 may be relevant for hospitality, sports bar or head-end use, but we should confirm true matrix size, output transport, control and future expansion before quote."),
  "MX-1007-HYB": hybridMatrixOverride("MX-1007-HYB", "This appears to be a hybrid room workflow discussion rather than a simple switcher sale. MX-1007-HYB may be relevant if the space needs switching, USB workflow, display routing and room integration to work together, but we should confirm source mix, USB ownership, display count, audio expectations and room operation before quote."),
  "NHD-500": networkSourceOverride("NHD-500", "1GbE AVoIP", "This sounds like a wider NetworkHD 500-series architecture decision rather than a one-box answer. NHD-500 may be relevant if the project needs routed AV flexibility across rooms or displays, but we should confirm endpoint count, controller requirement, switch design and whether 500-series AVoIP is truly the right architecture."),
  "NHD-500-DNT-TX": networkSourceOverride("NHD-500-DNT-TX", "1GbE AVoIP", "This looks like a converged routed AV and network-audio conversation rather than a standalone endpoint choice. NHD-500-DNT-TX may be relevant if the source has to join a 500-series design with Dante in scope, but we should confirm series match, Dante expectations, control path and network ownership before quote."),
  "NHD-500-E": networkFlexibleEndpointOverride("NHD-500-E", "1GbE AVoIP", "This sounds like a broader 500-series NetworkHD design where endpoint flexibility and expansion are part of the brief. NHD-500-E may be relevant if the project needs repeatable endpoint growth, but we should confirm role planning, controller design, network readiness and long-term scale before quote."),
  "NHD-500-E-RX": networkDisplayOverride("NHD-500-E-RX", "1GbE", "This appears to be a display-side endpoint discussion inside a 500-series NetworkHD system. NHD-500-E-RX may be relevant if the display location needs to receive content from the wider AVoIP design, but we should confirm series match, display requirements, controller ownership and switch design before quote."),
  "NHD-500-E-TX": networkSourceOverride("NHD-500-E-TX", "1GbE AVoIP", "This looks like a source-side endpoint decision inside a 500-series NetworkHD architecture. NHD-500-E-TX may be relevant if local room content has to join the wider AVoIP platform, but we should confirm source type, series match, controller requirement and network readiness before quote."),
  "NHD-500-IW-TX": networkInWallOverride("NHD-500-IW-TX", "This sounds like a room-entry workflow problem where the local wallplate input has to feed a wider NetworkHD 500 design cleanly. NHD-500-IW-TX may be relevant if the user-facing input point matters as much as the AVoIP backbone, but we should confirm wall location, source expectation, control path and network ownership before quote."),
  "NHD-500-IW-TX-V2": networkInWallOverride("NHD-500-IW-TX-V2", "This looks like a room-facing input discussion inside a wider NetworkHD 500 architecture. NHD-500-IW-TX-V2 may be relevant if local sources have to join the AVoIP system without adding loose boxes at the table, but we should confirm wall position, source format, series match and room control before quote."),
  "NHD-500-T": networkSourceOverride("NHD-500-T", "1GbE AVoIP", "This appears to be a source-onboarding decision inside a 500-series NetworkHD design. NHD-500-T may be relevant if the customer truly needs routed AV flexibility rather than local switching, but we should confirm source role, endpoint count, controller design and network ownership before quote."),
  "NHD-500-TXRX-V2": networkFlexibleEndpointOverride("NHD-500-TXRX-V2", "1GbE AVoIP", "This looks like a 500-series endpoint-planning discussion where deployment flexibility matters. NHD-500-TXRX-V2 may be relevant if the project benefits from assignable endpoint roles, but we should confirm system scale, controller path, switch design and whether the flexibility is genuinely needed before quote."),
  "NHD-510-TX": networkSourceOverride("NHD-510-TX", "1GbE AVoIP", "This sounds like a source-onboarding requirement inside a planned or installed NetworkHD 500 system. NHD-510-TX may be relevant if local room sources need to join the routed AV platform cleanly, but we should confirm matching series, source format, control expectations and network ownership before quote."),
  "NHD-600-E-RX": networkDisplayOverride("NHD-600-E-RX", "10GbE", "This appears to be a premium display-endpoint discussion inside a 10G NetworkHD design. NHD-600-E-RX may be relevant if the project already justifies higher-performance distributed AV, but we should confirm series match, display requirements, switch capacity and controller ownership before quote."),
  "NHD-600-E-TX": networkSourceOverride("NHD-600-E-TX", "10GbE AVoIP", "This looks like a premium source-onboarding decision inside a 10G NetworkHD system. NHD-600-E-TX may be relevant if the architecture is already higher-performance AVoIP, but we should confirm source role, network readiness, controller path and overall system scale before quote."),
  "NHD-600-E-TXRX": networkFlexibleEndpointOverride("NHD-600-E-TXRX", "10GbE AVoIP", "This sounds like a premium endpoint-planning discussion where the project needs role flexibility inside a 10G NetworkHD design. NHD-600-E-TXRX may be relevant if the architecture is already justified, but we should confirm endpoint planning, controller path, switch design and whether the performance tier is truly needed before quote."),
  "NHD-600-RX": networkDisplayOverride("NHD-600-RX", "10GbE", "This appears to be a premium display-side NetworkHD decision rather than a generic receiver choice. NHD-600-RX may be relevant if the display location is part of a higher-performance AVoIP design, but we should confirm series match, display expectation, controller path and network ownership before quote."),
  "NHD-600-TRXF": networkFlexibleEndpointOverride("NHD-600-TRXF", "10GbE AVoIP", "This looks like a premium endpoint-flexibility discussion inside a 10G NetworkHD design. NHD-600-TRXF may be relevant if assignable endpoint roles matter to the system plan, but we should confirm endpoint planning, switch design, controller ownership and whether 10G is justified before quote."),
  "NHD-600-TX": networkSourceOverride("NHD-600-TX", "10GbE AVoIP", "This sounds like a premium source-entry decision inside a 10G NetworkHD system. NHD-600-TX may be relevant if local content has to join a higher-performance AVoIP design, but we should confirm source role, matching series, network readiness and control path before quote."),
  "NHD-610-TX": networkSourceOverride("NHD-610-TX", "10GbE AVoIP", "This appears to be a specialist source-onboarding discussion inside a 10G NetworkHD system. NHD-610-TX may be relevant if the performance tier is already justified, but we should confirm source expectation, network environment, controller path and the wider endpoint plan before quote."),
  "NHD-CTL-PRO-V2": networkControllerOverride("NHD-CTL-PRO-V2", "This sounds like the point where the project stops being a list of NetworkHD endpoints and becomes a managed system conversation. NHD-CTL-PRO-V2 may be relevant if routing ownership, presets and commissioning structure still need to be defined, but we should confirm control scope, endpoint count, network responsibility and commissioning before quote."),
  "NHD-USB-TRX": networkUsbOverride("NHD-USB-TRX", "This appears to be a USB-ownership problem inside a wider room or NetworkHD workflow rather than a pure video problem. NHD-USB-TRX may be relevant if the host and peripherals cannot live in the same place, but we should confirm device type, bandwidth, host location and the wider control path before quote."),
  "SW-120-TX3-UK": presentationInputOverride("SW-120-TX3-UK", "This sounds like a room connection-experience problem more than a matrix or building-wide switching discussion. SW-120-TX3-UK may be relevant if the customer needs a tidy user-facing input point, but we should confirm device mix, room workflow, downstream path and whether wireless or USB switching is also needed."),
  "SW-130-TX-UK": presentationInputOverride("SW-130-TX-UK", "This looks like a user-facing presentation handoff requirement where the room needs to feel obvious for laptop users. SW-130-TX-UK may be relevant if the input point is the real pain point, but we should confirm source devices, downstream system fit, cable path and whether the room also needs switching or wireless presentation."),
  "SW-220-TX-W": presentationSwitcherOverride("SW-220-TX-W", "This sounds like a smaller-room presentation workflow sale where usability matters more than feature count. SW-220-TX-W may be relevant if the room needs cleaner source selection without overbuilding the design, but we should confirm source mix, display path, USB/audio expectations and whether the room has outgrown this tier."),
  "SW-640L-TX-W": presentationSwitcherOverride("SW-640L-TX-W", "This looks like a stronger room-workflow requirement where users need to connect reliably every day and the system has moved beyond basic switching. SW-640L-TX-W may be relevant if the source mix, USB path and display handling are all part of the sale, but we should confirm those dependencies before quote."),
  "SYN-CTL-HUB": controlOverride("SYN-CTL-HUB", "This appears to be a control-chain discussion where the room experience matters as much as the AV hardware behind it. SYN-CTL-HUB may be relevant if the Synergy control layer has to tie devices together cleanly, but we should confirm compatibility, network/power location and commissioning ownership before quote."),
};

export function getProductCallCommercialOverride(sku: string | undefined | null): ProductCallCommercialOverride | null {
  const key = String(sku || "").trim().toUpperCase();
  return PRODUCT_CALL_COMMERCIAL_OVERRIDES[key] || null;
}

