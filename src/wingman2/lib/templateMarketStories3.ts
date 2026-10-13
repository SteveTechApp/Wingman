/** Market stories for templates 41–59 of the published catalogue (Broadcast, Retail, House of Worship, Corporate, Education, Hospitality, Government, Healthcare, Emergency Services). */
export const STORY_PART_3: Record<string, import("./templateMarketStories").TemplateMarketStory> = {
  "broadcast-podcast-content-studio-ndi-networkhd500": {
    requirement:
      "We need a two-camera studio where the producer can select or compose camera views, monitor the programme locally and record it with properly mixed microphones.",
    situation:
      "The studio produces podcasts and video content for clients, but today the cameras are recorded separately and the audio is synced in editing, which doubles post-production time and loses spontaneity.",
    roomInUse: [
      "The presenters take their seats and the producer checks the two camera views on the confidence monitor.",
      "Recording starts with close-miked speech and the producer selecting the active camera.",
      "The producer switches to the wide camera for a two-person discussion.",
      "The session ends and the recorded programme is ready for editing with synchronised audio.",
    ],
    successLooksLike: [
      "Recordings have clean, close-miked speech and synchronised video.",
      "The producer can switch or compose camera views during the session.",
      "Presenters monitor on headphones without feedback.",
      "The studio's acoustic treatment supports broadcast-quality sound.",
    ],
    customerDecisions: [
      "Confirm the recording software and post-production workflow.",
      "Decide whether a dedicated switcher is needed for live production beyond this base design.",
      "Agree the studio's lighting, acoustics and camera positions.",
    ],
  },
  "retail-bank-branch-networkhd100": {
    requirement:
      "We need the branch to show approved rates, service information and queue status on six public screens, with publishing restricted to nominated staff.",
    situation:
      "Rates and service messages change regularly, and today each screen is updated locally with a memory stick. The branch also needs queue status visible from the waiting area without distracting counter conversations.",
    roomInUse: [
      "The branch opens and the screens show the standard rates and service information.",
      "A rate change is published centrally and appears on the window and waiting-zone screens.",
      "Queue status updates on the counter screens as customer numbers change.",
      "At close the screens shut down and the branch's public content is removed.",
    ],
    successLooksLike: [
      "Public screens show current, approved content every day.",
      "Publishing is restricted to nominated staff.",
      "Window screens are readable in daylight and waiting screens are comfortable to watch.",
      "Customer privacy is protected around counter and back-office areas.",
    ],
    customerDecisions: [
      "Confirm the content approval workflow and who publishes.",
      "Decide which screens show rates, service information and queue status.",
      "Agree privacy and service-access requirements for the branch.",
    ],
  },
  "worship-large-auditorium-imag-networkhd600": {
    requirement:
      "We need the auditorium to show live programme, lyrics and confidence content on the main IMAG destinations and overflow screens, with audio and image timing aligned for the congregation.",
    situation:
      "The auditorium is the venue's main worship space and production quality matters to the congregation. Today the screens are fed from a mix of local players and temporary links, and timing between the live image and the PA varies across the room.",
    roomInUse: [
      "The production team runs the pre-service check with lyrics on the main screens and the confidence feed at the stage.",
      "The live camera programme is switched to the IMAG destinations as worship begins.",
      "Overflow and lobby screens carry the programme with their own audio levels and delay.",
      "After the service the screens return to the standard welcome content.",
    ],
    successLooksLike: [
      "The congregation sees a stable live image with audio in sync.",
      "Lyrics and confidence content appear where the production team expects.",
      "Overflow rooms feel part of the service.",
      "The production team can run the system without an AV engineer in the booth.",
    ],
    customerDecisions: [
      "Confirm the production team's workflow, cameras and vision mixer responsibilities.",
      "Decide the overflow destinations and their audio behaviour.",
      "Agree the acoustic study and array design with the specialist audio contractor.",
    ],
  },
  "corporate-reception-townhall-networkhd100": {
    requirement:
      "We need the reception and all-hands area to show corporate information daily and route an approved event programme to selected screens for town halls.",
    situation:
      "The area doubles as the company's front door and its town-hall venue. Today reception has its own screen and events use a portable projector, so the two never work as one space and setup takes too long.",
    roomInUse: [
      "Reception screens run the standard corporate information loop through the working day.",
      "Before a town hall the facilities team recalls the event preset and the all-hands screens switch to the event programme.",
      "A presenter connects at the presentation point and their content appears on the event screens.",
      "After the event the reception screens return to their normal content.",
    ],
    successLooksLike: [
      "Reception looks professional every day without staff intervention.",
      "Town halls use the installed screens instead of a portable projector.",
      "Event and reception content never mix unexpectedly.",
      "Speech is clear across the all-hands area for presenters and Q&A.",
    ],
    customerDecisions: [
      "Confirm the reception content and who maintains it.",
      "Decide the event layout and whether a camera or mixer is needed for hybrid town halls.",
      "Agree the switching permissions between reception and event modes.",
    ],
  },
  "corporate-training-suite-matrix-uc": {
    requirement:
      "We need a training suite where the instructor teaches from a PC, laptop or document camera, includes remote attendees, and records sessions for staff who cannot attend.",
    situation:
      "The company runs compliance and product training several times a month. Today the instructor uses a projector and a separate conference microphone, and remote attendees miss half the session because they cannot see the document camera.",
    roomInUse: [
      "The instructor starts the session and the teaching PC appears on both front screens.",
      "A document camera close-up is switched in for a practical demonstration.",
      "Remote attendees join through the conferencing compute and hear the room through ceiling microphones.",
      "The session is recorded and the instructor's confidence monitor keeps the timing visible.",
    ],
    successLooksLike: [
      "Every trainee, in the room or remote, can follow the content.",
      "The instructor switches sources without leaving the desk.",
      "Recorded sessions are clear and synchronised.",
      "The room can be run by the training team without AV support.",
    ],
    customerDecisions: [
      "Confirm the recording platform, consent and retention policy.",
      "Decide whether trainees connect their own laptops for exercises.",
      "Agree the conferencing platform and room compute ownership.",
    ],
  },
  "education-library-learning-commons-networkhd100": {
    requirement:
      "We need the library to show opening information, room status and event content on seven screens around the entrance and circulation areas, while group-room work stays private.",
    situation:
      "The learning commons is a shared study space, and students need to know which group rooms are free and what is happening on site. Today information is on a noticeboard and screens show a fixed welcome slide.",
    roomInUse: [
      "The library opens and the screens show the standard opening information and room-status board.",
      "Students check the circulation screens for free group rooms and event times.",
      "An event programme is routed to the entrance screens for a talk or exhibition.",
      "The library closes and the screens shut down for the night.",
    ],
    successLooksLike: [
      "Students can find room status and event information without asking staff.",
      "Group-room content never appears on shared screens.",
      "Information updates without a member of staff visiting each screen.",
      "The library's quiet zones are not disturbed by the displays.",
    ],
    customerDecisions: [
      "Confirm the room-booking system and how status is published to screens.",
      "Decide which screens serve events versus everyday information.",
      "Agree content ownership between the library and the university's communications team.",
    ],
  },
  "education-esports-media-lab-networkhd500": {
    requirement:
      "We need the esports lab's shared screens to show approved station capture for coaching and spectators, while competitive play stays on direct local monitors.",
    situation:
      "The lab teaches esports and media production, and the tutor needs to review a student's play with the class. Today students turn their monitors to face the room, and the low-latency competitive setup cannot be compromised.",
    roomInUse: [
      "Students play on their direct local monitors at full refresh rate.",
      "The tutor selects a station's capture output and shows it on the shared analysis screens.",
      "The class reviews the play while the stations continue unaffected.",
      "The tutor switches to a second station for comparison.",
    ],
    successLooksLike: [
      "Competitive play keeps its direct, low-latency connection.",
      "Any approved station can be shown on the shared screens for coaching.",
      "Spectator delay is acceptable for teaching and commentary.",
      "Player headsets and chat stay out of the teaching audio.",
    ],
    customerDecisions: [
      "Confirm the capture method and any game or platform restrictions.",
      "Decide which stations need spectator outputs and how many shared screens are required.",
      "Agree the teaching audio behaviour and headset arrangements.",
    ],
  },
  "hospitality-hotel-meeting-room-apollo-hdbaset": {
    requirement:
      "We need the hotel meeting room to be a simple, reliable space where a guest connects a laptop to present or run a video call, and hotel staff can reset the room between bookings.",
    situation:
      "The room is sold to guests who arrive with unknown laptops and no AV knowledge. Today they call reception for help with cables and the room is often left in a state the next guest cannot use.",
    roomInUse: [
      "A guest connects a laptop at the table and the room display shows their content.",
      "A video call runs through the room's camera, microphone and speakers.",
      "The guest leaves and hotel staff reset the room from the standard state.",
      "The next booking starts with the same simple connection.",
    ],
    successLooksLike: [
      "Guests can present without calling for help.",
      "Video calls work from the guest's own platform.",
      "The room resets between bookings with no technical knowledge.",
      "The furniture layout can change without breaking the connection.",
    ],
    customerDecisions: [
      "Confirm the room layouts and the cable reach each one needs.",
      "Decide whether housekeeping or AV checks the room between bookings.",
      "Agree the guest device support policy for USB-C and HDMI laptops.",
    ],
  },
  "hospitality-restaurant-bar-matrix": {
    requirement:
      "We need the restaurant to show licensed entertainment or menus on six screens, with low-level background audio in dining and a separately controlled bar programme.",
    situation:
      "The restaurant shows sport in the bar and keeps dining calm, but the two audio zones currently fight and staff cannot change one screen without affecting the others. Menu screens are updated by hand each time prices change.",
    roomInUse: [
      "The restaurant opens with menus on the dining screens and the day's sport planned for the bar.",
      "Staff switch one bar screen to a requested match without disturbing the dining room.",
      "Dining keeps low-level background music while the bar plays commentary.",
      "After service the screens return to the standard menu and music state.",
    ],
    successLooksLike: [
      "Bar and dining audio are genuinely separate.",
      "Menu and entertainment content can be changed per screen.",
      "Staff control the room from the back office.",
      "Audio spill between zones does not annoy diners.",
    ],
    customerDecisions: [
      "Confirm the entertainment licences and menu content ownership.",
      "Decide the bar and dining audio behaviour and acceptable levels.",
      "Agree screen positions and cable routes with the fit-out.",
    ],
  },
  "retail-qsr-menu-boards-networkhd100": {
    requirement:
      "We need the counter menu bank and the queue repeat bank to show four distinct menu pages, with each page appearing in both banks and updates controlled by the menu system.",
    situation:
      "The restaurant changes pricing and promotions regularly, and today each screen is updated separately, which leads to mismatched prices between the counter and the queue. Peak trading means the boards must be bright and legible.",
    roomInUse: [
      "The restaurant opens and each menu page appears at the counter and on the matching queue screen.",
      "A price change is published in the CMS and both banks update together.",
      "During peak hours the boards stay bright and readable through the queue.",
      "At close the boards switch to the standard overnight state.",
    ],
    successLooksLike: [
      "Counter and queue boards always show matching prices.",
      "Menu updates happen in the CMS, not screen by screen.",
      "Boards are readable in bright, busy conditions and protected from heat and grease.",
      "A single screen failure does not break the menu layout.",
    ],
    customerDecisions: [
      "Confirm the menu channels and how each page maps to the two banks.",
      "Decide the brightness and orientation for each screen position.",
      "Agree heat, grease and cleaning protection with the kitchen contractor.",
    ],
  },
  "retail-car-showroom-customer-experience-networkhd500": {
    requirement:
      "We need the showroom to route configurator, launch-video and branded content to the relevant customer areas while other screens keep scheduled messaging.",
    situation:
      "Sales conversations happen at desks and around the vehicles, and staff currently crowd around a desk monitor to show a configuration. The brand experience depends on content appearing in the right place at the right time.",
    roomInUse: [
      "The showroom opens and the screens run the standard brand content loop.",
      "A salesperson sends a configurator session from their desk to the nearest customer display.",
      "A launch video is routed to the vehicle-floor screens for a scheduled event.",
      "After the appointment the screens return to the brand loop.",
    ],
    successLooksLike: [
      "Customers see configuration and brand content on large, readable screens.",
      "Sales staff route content without leaving the customer.",
      "Standard messaging continues on screens that are not in use.",
      "The showroom can support different brands or events without re-cabling.",
    ],
    customerDecisions: [
      "Confirm the configurator software, resolution and interactivity requirements.",
      "Decide the screen zones and the content each carries.",
      "Agree the event mode and who controls it.",
    ],
  },
  "government-courtroom-hearing-room-matrix": {
    requirement:
      "We need the hearing room to show approved evidence on the judge, clerk, participant and gallery screens, with remote participation, microphones and official recording managed as separate controlled workflows.",
    situation:
      "The court runs hearings with evidence presented on screen and some witnesses attending remotely. Today the clerk cannot preview evidence before it reaches the room, and the gallery screen is often out of step with the bench.",
    roomInUse: [
      "The clerk previews a document and releases it to the participant screens and gallery.",
      "A remote witness joins through the approved platform and is heard through the room audio.",
      "The judge's monitor shows the evidence while the public gallery sees the same approved image.",
      "The hearing closes and the recording is retained under the court's policy.",
    ],
    successLooksLike: [
      "Nothing reaches the room screens without the clerk releasing it.",
      "The bench, participants and gallery see consistent evidence.",
      "Remote witnesses are heard and can hear the room.",
      "Recording and retention satisfy the court's requirements.",
    ],
    customerDecisions: [
      "Confirm the evidence-release procedure and who may preview.",
      "Decide the private-session mute and retention behaviour with the court.",
      "Agree the remote participation platform and security requirements.",
    ],
  },
  "government-emergency-briefing-room-networkhd500": {
    requirement:
      "We need the incident briefing room to show incident maps, dashboards and authorised liaison feeds on five displays, with a separate conferencing system for remote agencies.",
    situation:
      "Multi-agency briefings need a shared picture quickly. Today staff connect laptops to individual screens, and remote agencies cannot see what the room is discussing without someone re-sharing their screen.",
    roomInUse: [
      "The briefing starts with the standard incident dashboard and map layout.",
      "A liaison feed is promoted to the main displays as the briefing develops.",
      "Remote agencies join through the conferencing system and follow the shared content.",
      "The chair uses the confidence monitor to keep the agenda on track.",
    ],
    successLooksLike: [
      "The room and remote agencies share the same operational picture.",
      "The chair can direct what appears on each display.",
      "Secure sources stay within their approved boundaries.",
      "The room can be set up for a briefing in minutes.",
    ],
    customerDecisions: [
      "Confirm which liaison feeds are authorised for shared display.",
      "Decide the conferencing platform and remote agency access rules.",
      "Agree recovery procedures and who operates the room out of hours.",
    ],
  },
  "healthcare-telemedicine-consult-room-apollo": {
    requirement:
      "We need a private consultation room where the clinician starts a remote consultation from an approved laptop, with a clear picture, good audio and the ability to share authorised documents.",
    situation:
      "The clinic runs remote appointments alongside in-person visits. Today the clinician uses the laptop's own camera and speakers, so patients struggle to see and hear, and the consultation room does not look or sound professional.",
    roomInUse: [
      "The clinician starts the consultation from the approved platform on the room laptop.",
      "The room camera and audio give the patient a clear view and voice.",
      "An authorised document is shared on the room display for discussion.",
      "The consultation ends and the room is ready for the next patient.",
    ],
    successLooksLike: [
      "Patients can see and hear the clinician clearly.",
      "The clinician runs the consultation without technical distraction.",
      "Document sharing stays within the approved clinical platform.",
      "Privacy and cleaning requirements are met between patients.",
    ],
    customerDecisions: [
      "Confirm the clinical platform and laptop policy.",
      "Decide the camera position and the patient's sightline.",
      "Agree privacy, consent and cleaning requirements with the clinical team.",
    ],
  },
  "healthcare-theatre-observation-networkhd500": {
    requirement:
      "We need procedure observation and teaching rooms to show authorised procedure-camera and presentation feeds, without interfering with clinical control or diagnostic displays.",
    situation:
      "The trust trains clinical staff by observation, but the observation room is small and trainees crowd the theatre. The teaching team needs the procedure visible in the seminar room with proper audio, using only approved video handoffs.",
    roomInUse: [
      "The procedure starts and the authorised camera feed appears in the observation room.",
      "Trainees in the seminar room follow the same procedure with teaching audio.",
      "The facilitator annotates or switches to a presentation feed for teaching points.",
      "The session ends and the clinical systems continue unaffected.",
    ],
    successLooksLike: [
      "Trainees see the procedure in detail without crowding the theatre.",
      "Clinical systems and alarms are untouched by the AV installation.",
      "Observation and seminar rooms have independent, clear audio.",
      "Privacy and consent requirements are respected for every session.",
    ],
    customerDecisions: [
      "Confirm the approved camera handoff and any clinical isolation requirements.",
      "Decide which sessions are observed and how consent is managed.",
      "Agree the seminar and observation room capacities.",
    ],
  },
  "emergency-station-briefing-hdbaset": {
    requirement:
      "We need the station briefing room to show a station PC or visiting laptop on one screen, with clear speech and programme audio for shift handover.",
    situation:
      "Shift handover happens several times a day and the crew needs the day's information visible and audible without setup delays. Today a portable projector and a small speaker are used, and handovers start late while the kit is assembled.",
    roomInUse: [
      "The crew arrives for handover and the station PC is already on the screen.",
      "A visiting officer connects a laptop at the briefing point and presents.",
      "Speech and programme audio play at a level set for the room.",
      "The crew leaves and the room is immediately ready for the next shift.",
    ],
    successLooksLike: [
      "Handover starts on time with no equipment setup.",
      "The screen is readable from every seat in the room.",
      "Speech is clear without feedback.",
      "The room works the same way for every watch.",
    ],
    customerDecisions: [
      "Confirm the briefing content and who prepares it.",
      "Decide whether a central incident feed should be added as an approved source.",
      "Agree who supports the room and how faults are reported.",
    ],
  },
  "emergency-tactical-coordination-hybrid": {
    requirement:
      "We need a coordination room where the chair compares incident information and maps while liaison officers share a laptop, and remote teams join through an approved conferencing platform.",
    situation:
      "Multi-agency coordination happens in person and remotely, and the room must switch quickly between routine meetings and live incidents. Today laptops are passed around and remote teams cannot see the room's information.",
    roomInUse: [
      "The meeting starts with the incident PC and mapping feed on the two front displays.",
      "A liaison officer connects a laptop at the table and shares it to one display.",
      "Remote teams join through the conferencing platform and hear the room through ceiling microphones.",
      "The meeting closes and the room returns to the standard state.",
    ],
    successLooksLike: [
      "The room shares one incident picture during coordination.",
      "Liaison laptops can be shown quickly and safely.",
      "Remote teams hear and are heard clearly.",
      "The room stays within its approved security boundary.",
    ],
    customerDecisions: [
      "Confirm how remote agencies connect and what the security policy allows.",
      "Decide the standard and incident display layouts.",
      "Agree who operates the room and how presets are managed.",
    ],
  },
  "emergency-dispatch-control-networkhd600": {
    requirement:
      "We need the dispatch review room to show authorised CAD, mapping and VMS composite outputs on three shared screens, with workstation operation and incident communications kept independent.",
    situation:
      "Supervisors review live dispatch activity during incidents and need a shared picture without interrupting dispatchers at their positions. Today information is shared verbally or by crowding around a workstation.",
    roomInUse: [
      "The shift starts with the standard CAD and mapping layout on the review screens.",
      "An incident escalates and the VMS composite is promoted to a review screen.",
      "Dispatchers continue working on their independent systems throughout.",
      "The incident closes and the review screens return to the standard layout.",
    ],
    successLooksLike: [
      "Supervisors share a live picture of dispatch activity.",
      "Dispatch and communications systems remain independent of the AV system.",
      "Source permissions are explicit and auditable.",
      "The room recovers cleanly after a failure.",
    ],
    customerDecisions: [
      "Confirm which CAD, mapping and VMS outputs are approved for shared display.",
      "Decide the standard and incident layouts.",
      "Agree failure-recovery procedures with the control room's management.",
    ],
  },
  "emergency-shared-status-networkhd100": {
    requirement:
      "We need the station's briefing corridor, welfare room and status desk to show two approved status feeds on four displays, with only cleared content on the public-facing position.",
    situation:
      "Crews and visitors pass through the station all day, and information is currently posted on whiteboards. The station wants consistent, current status information without exposing sensitive content in public areas.",
    roomInUse: [
      "The station opens and the corridor and welfare screens show the standard status and briefing content.",
      "A briefing programme is routed to the welfare room for a crew session.",
      "The staffed status desk shows the fuller operational picture.",
      "At the end of the day the screens return to the standard state.",
    ],
    successLooksLike: [
      "Crews see current status information where they pass.",
      "Public-facing screens only ever show cleared content.",
      "Content zoning is documented and enforceable.",
      "The system uses the station's existing cable routes.",
    ],
    customerDecisions: [
      "Confirm which content is cleared for public-facing positions.",
      "Decide what each display group shows during incidents.",
      "Agree whether simultaneous windows are needed, which would change the design.",
    ],
  },
};
