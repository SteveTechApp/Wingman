/** Market stories for templates 21–40 of the published catalogue (large Hospitality estates, Government, Corporate, Education, Control Rooms). */
export const STORY_PART_2: Record<string, import("./templateMarketStories").TemplateMarketStory> = {
  "hospitality-large-casino-nhd500": {
    requirement:
      "We need the gaming floor, hospitality areas and VIP rooms to show approved entertainment and promotional channels by zone, with supervisors able to lock sensitive routes and isolate VIP programmes.",
    situation:
      "The venue operates continuously and content is part of the guest experience. Today screens are grouped by fixed cabling, so changing a zone means re-patching and VIP content cannot be guaranteed to stay private.",
    roomInUse: [
      "The floor opens with promotional and entertainment channels running across the gaming areas.",
      "An operator changes one zone to a different approved channel without touching the others.",
      "A VIP room is switched to its private programme and the route is locked to authorised staff.",
      "Supervisors audit which zones are showing which content and restore the standard layout.",
    ],
    successLooksLike: [
      "Every zone shows approved content and nothing else.",
      "VIP and sensitive routes are genuinely isolated and auditable.",
      "A screen or cupboard failure degrades a zone, not the whole estate.",
      "Content changes happen without visiting each display position.",
    ],
    customerDecisions: [
      "Confirm the content licences and who approves channels per zone.",
      "Decide the permission model for locking VIP routes.",
      "Agree the maintenance and monitoring arrangements for a 24/7 venue.",
    ],
  },
  "hospitality-bingo-club-nhd100-led-wall": {
    requirement:
      "We need the club hall to show the caller, number board and promotions on the front LED wall, with repeaters around the hall showing the chosen information feed to every table.",
    situation:
      "Players at the back of the hall struggle to read the main board, and the club wants promotions and results visible from every seat. The LED wall and repeaters currently run as separate systems that staff cannot combine.",
    roomInUse: [
      "The caller starts the session and the game programme appears on the LED wall.",
      "Repeater screens show the number board or promotions so every table can follow.",
      "Between sessions the wall shows promotional content while the repeaters carry the information feed.",
      "The session closes and the hall returns to the standard welcome content.",
    ],
    successLooksLike: [
      "Every player can see the caller and the numbers from their seat.",
      "The LED wall content is composed by the LED system, not squeezed through a standard decoder.",
      "Caller speech is clear across the hall at a comfortable level.",
      "Staff can switch between game and promotion content without technical help.",
    ],
    customerDecisions: [
      "Confirm the LED wall supplier and how their processor receives the programme.",
      "Decide what each repeater group shows during and between sessions.",
      "Agree the audio level and coverage expectations with the club's management.",
    ],
  },
  "hospitality-stadium-concourse-vip-nhd500": {
    requirement:
      "We need concourse screens and VIP rooms across the stadium to show licensed live action and signage, with each VIP room able to choose its own approved channel and public information able to override.",
    situation:
      "On match days the concourse must keep thousands of spectators informed while hospitality guests expect their own screens. The current estate is a patchwork of local players, so a venue-wide announcement or a channel change requires a walk-round.",
    roomInUse: [
      "The venue opens and concourse screens show the standard event build-up and information.",
      "A safety or public information message is issued and takes priority across the public screens.",
      "VIP rooms select their own approved channel independently of the concourse.",
      "After the event the estate returns to the standard signage state.",
    ],
    successLooksLike: [
      "Public information always reaches the concourse, whatever else is playing.",
      "VIP rooms get independent, approved channel selection.",
      "Screen groups can be managed by zone without visiting each cupboard.",
      "The distribution survives the loss of a single link or screen.",
    ],
    customerDecisions: [
      "Confirm the content rights and the venue's public information override procedure.",
      "Decide the zone structure and which rooms are independent.",
      "Agree the network and fibre arrangements with the stadium's IT team.",
    ],
  },
  "government-security-command-nhd100-bridge": {
    requirement:
      "We need the security room to show approved VMS composite views, incident maps and dashboards on six shared screens, with the VMS retaining camera selection, recording and permissions.",
    situation:
      "Operators watch a mix of camera views and incident information, but the room's screens are fed by individual workstations. During an incident the supervisor cannot put the right composite in front of the whole team without leaving their desk.",
    roomInUse: [
      "The shift starts with the standard layout of VMS composites and dashboards on the six screens.",
      "An incident is declared and the operator sends the relevant composite view to the main wall screens.",
      "The mapping workstation is promoted to a side screen while the VMS continues recording in the background.",
      "The incident closes and the room returns to the standard layout.",
    ],
    successLooksLike: [
      "The team shares the same operational picture during an incident.",
      "Camera selection and recording remain with the VMS and its permission model.",
      "No raw camera stream is exposed to the AV system without an approved composite.",
      "Operators can change the shared picture without leaving their positions.",
    ],
    customerDecisions: [
      "Confirm which VMS composites are approved for shared display.",
      "Decide the standard and incident screen layouts.",
      "Agree the security boundary between the VMS network and the AV system.",
    ],
  },
  "government-situation-control-room-nhd600": {
    requirement:
      "We need a situation room where teams compare approved workstation outputs, maps and incident feeds on a configurable wall, and the chair can call up detail on table monitors.",
    situation:
      "The room hosts multi-agency briefings where the wall layout changes with the agenda. Today screens are fixed to specific sources, so the room cannot adapt to a new briefing without a technical re-patch.",
    roomInUse: [
      "The briefing starts with the standard wall layout and the chair's table monitor showing the agenda.",
      "A workstation output is enlarged to the wall while the chair pulls up a supporting map at the table.",
      "The layout is saved as a named scene for the next session.",
      "At the end of the briefing the room returns to the standard layout.",
    ],
    successLooksLike: [
      "The wall can be reconfigured for each briefing in seconds.",
      "The chair's detail view is independent of the wall.",
      "Only authorised feeds can appear in the room.",
      "The room's behaviour is repeatable for staff who did not design it.",
    ],
    customerDecisions: [
      "Confirm the standard briefing layouts and who authorises sources.",
      "Decide whether sessions are recorded and at what classification.",
      "Agree the network security approval and monitoring arrangements.",
    ],
  },
  "corporate-teams-room-medium-apollo": {
    requirement:
      "We need a medium meeting room that runs booked Teams or Zoom meetings from a room console, with the room camera, microphones and speakers working for both room meetings and guest laptops.",
    situation:
      "The room is booked through the corporate calendar but today the meeting always starts on someone's laptop, and the room's camera and audio are not used. The company wants a consistent, supported meeting experience like its smaller huddle rooms.",
    roomInUse: [
      "A booked meeting starts from the room console and the platform joins automatically.",
      "The room compute presents through the display while the bar provides camera, microphone and speakers.",
      "A guest laptop can share content through the approved ingest without taking over the room.",
      "The meeting ends and the room is immediately available for the next booking.",
    ],
    successLooksLike: [
      "Booked meetings start on time from the room console.",
      "Remote participants see and hear the room properly.",
      "Guest content sharing does not require unplugging the room system.",
      "The room is supportable by IT with a standard, licensed platform.",
    ],
    customerDecisions: [
      "Confirm the meeting platform and licence ownership.",
      "Decide whether the room supports guest laptops for full conferencing or content sharing only.",
      "Agree the room calendar and scheduling integration.",
    ],
  },
  "corporate-experience-centre-networkhd600": {
    requirement:
      "We need an executive demonstration suite where presenters can send any of five demonstration feeds to independently configured displays and recall scene layouts as a visit moves through the product story.",
    situation:
      "The centre hosts customer visits where the story changes for each audience. Today each demonstration station has its own screen and cable, so the presenter cannot move content between zones or adapt the room quickly.",
    roomInUse: [
      "The host starts the visit with the welcome scene on all five displays.",
      "A demonstration workstation is sent to the relevant zone's display while the others keep their content.",
      "The host recalls the next scene as the group moves around the suite.",
      "At the end of the visit the room returns to the welcome scene.",
    ],
    successLooksLike: [
      "Any demonstration feed can appear on any display without re-cabling.",
      "Scenes change the room in one action, in front of customers.",
      "High-detail content stays sharp on large displays.",
      "The room supports different visit formats without an engineer present.",
    ],
    customerDecisions: [
      "Confirm the demonstration stations and their native resolutions.",
      "Decide the scenes and the content for each visit format.",
      "Agree who maintains the demonstration PCs and their content.",
    ],
  },
  "corporate-agile-collaboration-zone-networkhd500": {
    requirement:
      "We need four open collaboration pods along the office floor where each team connects its own laptop to a nearby display, without disturbing the other pods.",
    situation:
      "The office moved to activity-based working and teams now book pods rather than rooms. Today pods have a screen and a loose HDMI lead, so connections are unreliable and there is no way to know which pod is free.",
    roomInUse: [
      "A team settles into a pod and connects a laptop at the table point.",
      "The pod display shows the team's work while the adjacent pods continue their own sessions.",
      "A second laptop is connected when a colleague joins and the team switches the input.",
      "The team leaves and the pod is ready for the next group.",
    ],
    successLooksLike: [
      "Every pod works independently with no cross-talk.",
      "Connection is one cable, whatever laptop arrives.",
      "The pod is usable without booking support or an AV technician.",
      "The installation fits the open office's existing furniture and cable routes.",
    ],
    customerDecisions: [
      "Confirm the connection type for the laptops the teams use.",
      "Decide whether pods need wireless presentation in addition to the cabled connection.",
      "Agree display mounting and power positions with the furniture layout.",
    ],
  },
  "education-primary-classroom-interactive-panel": {
    requirement:
      "We need the primary classroom's front panel to work as an interactive teaching surface, with the teacher's PC or laptop shown and touch annotation available from the front of the class.",
    situation:
      "The school has standardised on interactive panels, but this classroom's panel is connected with a short lead that limits where the teacher can stand and prevents touch from working reliably. Pupils lose engagement when the teacher cannot annotate at the board.",
    roomInUse: [
      "The teacher starts the lesson and the classroom PC appears on the front panel.",
      "The teacher annotates the lesson from the panel while pupils follow.",
      "A visiting laptop is connected at the desk and shown with touch support.",
      "At the end of the lesson the panel returns to the standard home screen.",
    ],
    successLooksLike: [
      "Touch annotation works reliably at the panel and from the teacher's position.",
      "The panel is bright and readable from every desk in normal classroom light.",
      "Teachers can switch between the PC and a laptop without crawling under the desk.",
      "The installation is child-safe and survives daily classroom use.",
    ],
    customerDecisions: [
      "Confirm the panel model, size and mounting height for the pupils' sightlines.",
      "Decide whether the teacher uses the panel or a laptop as the main teaching source.",
      "Agree the USB touch and video connection type at the desk.",
    ],
  },
  "education-university-lecture-theatre-networkhd500": {
    requirement:
      "We need the lecture theatre to present from the lectern to the main screens, confidence monitor and overflow rooms, with lecture capture handled by the university's platform.",
    situation:
      "The theatre is the faculty's largest teaching space and overflow rooms open when it fills. Today overflow relies on a temporary feed and the lectern has separate controls for each screen, which lecturers find unreliable.",
    roomInUse: [
      "The lecturer arrives, selects the teaching PC and the main projection shows the slides.",
      "A document camera or guest laptop is switched in from the lectern.",
      "Overflow rooms receive the lecture programme with their own audio level and delay.",
      "The lecture is recorded by the capture platform and the theatre resets for the next session.",
    ],
    successLooksLike: [
      "Lecturers operate every screen from the lectern.",
      "Overflow students see and hear the same lecture as the theatre.",
      "Speech is intelligible across the tiered seating without feedback.",
      "Recorded lectures are clear and synchronised.",
    ],
    customerDecisions: [
      "Confirm how often overflow rooms are used and which of them must receive the lecture.",
      "Decide the capture platform, recording policy and consent arrangements.",
      "Agree assistive-listening provision for the theatre.",
    ],
  },
  "education-stem-science-lab-networkhd100": {
    requirement:
      "We need the science laboratory's bench screens to show the teacher's computer lesson or a close-up demonstration, so every bench can see the detail without crowding around the experiment.",
    situation:
      "Practical science teaching depends on pupils seeing fine detail — a titration, a circuit, a dissection. Today only the front screen works and half the class cannot see it, so the teacher repeats demonstrations bench by bench.",
    roomInUse: [
      "The lesson starts with the teaching PC displayed on all eight bench screens.",
      "The teacher switches to the document camera for a close-up demonstration of the experiment.",
      "Benches keep the demonstration visible while pupils set up their own work.",
      "At the end of the lesson the screens return to the standard display.",
    ],
    successLooksLike: [
      "Every bench sees the demonstration in enough detail to follow it.",
      "The teacher switches between the computer and the camera without leaving the bench.",
      "The equipment survives a working laboratory environment.",
      "Bench screens are readable at close working distance without glare problems.",
    ],
    customerDecisions: [
      "Confirm the bench layout and screen positions.",
      "Decide whether any bench needs an independent feed for its own work.",
      "Agree the protective measures needed for a laboratory environment.",
    ],
  },
  "control-room-security-operations-networkhd600": {
    requirement:
      "We need the security operations centre to route approved VMS and dashboard outputs to a large wall and supervisor screens, while the VMS keeps camera selection, recording and permissions.",
    situation:
      "The centre runs a 24/7 monitoring operation and the wall is its main shared picture. Today wall layouts are fixed and changing them for an incident takes an operator away from their monitoring position.",
    roomInUse: [
      "Operators take over at shift change and the wall recalls the standard monitoring layout.",
      "An incident escalates and the supervisor builds a wall layout around the relevant VMS composite.",
      "A supervisor pulls detail onto their own monitor while the wall layout stays intact.",
      "At handover the wall returns to the standard layout and the incident layout is saved.",
    ],
    successLooksLike: [
      "The wall can be rebuilt around an incident in seconds.",
      "Only approved VMS composites and dashboards appear on shared screens.",
      "The wall keeps working when a single endpoint or link fails.",
      "Operators trust the displayed latency during live monitoring.",
    ],
    customerDecisions: [
      "Confirm which VMS outputs and dashboards are approved for the wall.",
      "Decide the standard, incident and handover layouts.",
      "Agree the resilience and recovery expectations for a 24/7 room.",
    ],
  },
  "control-room-network-operations-centre-networkhd600": {
    requirement:
      "We need the operations room to compare six authorised dashboard or workstation outputs on six shared screens using named normal-service and incident presets, without putting AV traffic on the operational network.",
    situation:
      "The team monitors utility infrastructure and needs a shared view during incidents. Today the screens are driven by individual PCs, so an incident layout has to be assembled by hand while the team is under pressure.",
    roomInUse: [
      "The shift starts with the normal-service preset on all six screens.",
      "An incident is declared and the incident preset replaces the layout with the agreed dashboards.",
      "A single screen is switched to a workstation output for a closer look without disturbing the rest.",
      "The incident closes and the normal-service preset is restored.",
    ],
    successLooksLike: [
      "The room shares one picture during an incident.",
      "Preset changes are quick and repeatable by any operator.",
      "The AV system remains separate from operational control networks.",
      "Screens are readable across the room at the working light level.",
    ],
    customerDecisions: [
      "Confirm the authorised dashboard sources and their owners.",
      "Decide the normal-service and incident layouts.",
      "Agree the network separation and security approval.",
    ],
  },
  "control-room-traffic-management-networkhd500": {
    requirement:
      "We need the highways control room to select approved CCTV composites, maps and traffic dashboards on eight screens using operational presets.",
    situation:
      "The room monitors a road network where incidents change what the team needs to see. Today each screen has a fixed source, so a major incident means manually re-arranging the room while operators are handling calls.",
    roomInUse: [
      "The shift starts with the standard layout of CCTV composites, maps and dashboards.",
      "An incident is declared and the incident preset brings the relevant camera composites to the main screens.",
      "The mapping screen is enlarged while the CCTV composites stay visible.",
      "The incident closes and the standard layout returns.",
    ],
    successLooksLike: [
      "The team shares the right picture during an incident.",
      "CCTV selection stays with the VMS and its permissions.",
      "Preset changes are fast and reliable.",
      "The room keeps working through a single screen or link failure.",
    ],
    customerDecisions: [
      "Confirm which composites and dashboards are approved for shared display.",
      "Decide the standard and incident screen layouts.",
      "Agree the operating procedure and who may change presets.",
    ],
  },
  "government-council-chamber-hybrid-streaming": {
    requirement:
      "We need the council chamber to show reports and approved evidence on the chamber screens, with a proper discussion, voting and recording system for the public record and remote participants.",
    situation:
      "The council meets in public and some members attend remotely. Today the video and audio systems are separate, and the public record depends on staff manually managing both, which makes hybrid meetings slow and risky.",
    roomInUse: [
      "The clerk starts the meeting and the agenda appears on the chamber screens.",
      "A report or document camera image is released to the chamber displays from the clerk's position.",
      "Remote participants join through the platform while the discussion system manages delegate microphones.",
      "The meeting closes, the recording is retained and the chamber resets for the next session.",
    ],
    successLooksLike: [
      "Councillors and the gallery can follow every report and exhibit.",
      "Delegate speech is captured cleanly for the public record.",
      "Remote participants take part without dominating the room.",
      "The clerk can run the meeting without technical support.",
    ],
    customerDecisions: [
      "Confirm the recording and public-access obligations for the chamber.",
      "Decide how remote participation is presented to the room and the gallery.",
      "Agree the discussion and voting system's responsibilities with the council's governance team.",
    ],
  },
  "healthcare-mdt-imaging-review-networkhd500": {
    requirement:
      "We need a multidisciplinary meeting room where clinical teams review authorised images and patient summaries together, including remote participants, while diagnostic interpretation stays on the approved clinical workstation.",
    situation:
      "The MDT meeting brings clinicians together to discuss cases, but today the room's screen is fed by a single laptop and remote specialists cannot follow the imaging. The trust needs a shared review experience without touching diagnostic systems.",
    roomInUse: [
      "The meeting starts with the clinical workstation's authorised presentation on the two front screens.",
      "A visiting specialist joins remotely and is heard through the ceiling audio.",
      "The chair reviews a case on the table monitor while the room keeps the shared image.",
      "The meeting ends and the room returns to the standard display.",
    ],
    successLooksLike: [
      "The whole team can see the same authorised image.",
      "Remote clinicians hear and are heard clearly.",
      "Diagnostic interpretation remains on approved clinical systems.",
      "The room is quick to set up between cases.",
    ],
    customerDecisions: [
      "Confirm which clinical sources may be shown in the shared room.",
      "Decide the conferencing platform and remote participation rules.",
      "Agree information governance and any recording restrictions.",
    ],
  },
  "healthcare-clinic-waiting-patient-calling-networkhd100": {
    requirement:
      "We need the waiting suite to show patient-call identifiers and service information on six screens assigned to the right waiting zones, with content managed by staff from a secure position.",
    situation:
      "The clinic's waiting areas are linked but separate, and patients currently rely on a single display that many cannot see. Staff need a reliable way to show call numbers and information without leaving the desk.",
    roomInUse: [
      "The clinic opens and the waiting screens show the standard information loop.",
      "A patient is called and their identifier appears on the screen for their waiting zone.",
      "Service information is updated centrally when clinics run late.",
      "The clinic closes and the screens shut down to schedule.",
    ],
    successLooksLike: [
      "Patients can see their call identifier from where they are sitting.",
      "Call information appears on the correct zone screens.",
      "Staff manage content without visiting each screen.",
      "Patient information is displayed in line with the clinic's privacy rules.",
    ],
    customerDecisions: [
      "Confirm the patient-call system and how identifiers are released to the AV system.",
      "Decide the waiting zones and which screens serve each.",
      "Agree privacy, brightness and service-access requirements.",
    ],
  },
  "leisure-gym-fitness-club-networkhd100": {
    requirement:
      "We need cardio screens and studio displays showing different entertainment, with each studio's audio controlled locally by the instructor.",
    situation:
      "Members expect entertainment on the cardio floor and classes need their own programme. Today screens are switched by hand and studio audio fights with the gym floor, so classes are interrupted and complaints follow.",
    roomInUse: [
      "The gym opens and the cardio screens start the scheduled entertainment channels.",
      "A studio class starts and the instructor selects the class programme and level locally.",
      "Staff change a cardio screen to a requested channel without affecting the studio.",
      "The club closes and all displays return to the standard state.",
    ],
    successLooksLike: [
      "Cardio and studio content never conflict.",
      "Instructors control their own studio audio without staff help.",
      "Screens show a deliberate, current channel every day.",
      "The system can add screens as the club grows.",
    ],
    customerDecisions: [
      "Confirm the entertainment licences and channel packages.",
      "Decide whether instructor-led classes need their own PA and microphones beyond this base design.",
      "Agree the daily switching routine and who performs it.",
    ],
  },
  "hospitality-private-cinema-screening-room-matrix": {
    requirement:
      "We need a private screening room where an operator can select disc, streaming or review content and show it on the projector with a real surround system.",
    situation:
      "The room is used for client screenings and internal reviews, and the equipment has grown around a domestic receiver that no longer matches the room. Guests notice when dialogue is unclear or the picture is not calibrated.",
    roomInUse: [
      "The operator selects the disc player and the projector shows the film with the surround system active.",
      "A streaming title is chosen for an informal screening without changing any cabling.",
      "A review workstation is switched in for a client session.",
      "The room shuts down from the operator position and returns to standby.",
    ],
    successLooksLike: [
      "Every screening source reaches the projector and surround system reliably.",
      "Dialogue is intelligible and effects are balanced across the seating.",
      "The operator can change sources without entering the equipment cupboard.",
      "The picture looks correct in a blacked-out room, not just bright.",
    ],
    customerDecisions: [
      "Confirm the screen size, seating distance and projector position.",
      "Decide the surround format and whether the room is used for critical review.",
      "Agree calibration and maintenance arrangements for the cinema system.",
    ],
  },
  "transport-airport-lounge-fids-networkhd500": {
    requirement:
      "We need the gate lounge to show approved flight information and boarding messages on eight screens, with airline staff keeping control of the upstream information systems.",
    situation:
      "Passengers need flight status visible from every seat, but the lounge currently has a few displays fed by local players that staff update by hand. A gate change or delay is often communicated late.",
    roomInUse: [
      "The lounge opens and the screens show the standard flight information layout.",
      "A gate change is published in the airline system and appears on the nominated screens.",
      "A boarding message is shown on the gate-desk screens while the seating screens keep the flight board.",
      "The last flight departs and the lounge returns to the standard information state.",
    ],
    successLooksLike: [
      "Passengers see current flight information from anywhere in the lounge.",
      "Airline staff publish changes in their own systems, not through the AV system.",
      "Screens remain readable against the terminal's daylight and lighting.",
      "A screen failure does not remove flight information from the lounge.",
    ],
    customerDecisions: [
      "Confirm which FIDS and boarding outputs are released to the AV system.",
      "Decide the screen groups and which information each shows.",
      "Agree the operating and content-ownership arrangements with the airport authority.",
    ],
  },
};
