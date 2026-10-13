/** Market stories for templates 1–20 of the published catalogue (Corporate, Education, Retail, Hospitality, Healthcare, Government, Venue, Transport, Residential starts). */
export const STORY_PART_1: Record<string, import("./templateMarketStories").TemplateMarketStory> = {
  "corporate-huddle-apollo": {
    requirement:
      "We need our small huddle room to be a genuine one-touch meeting space. A colleague walks in with a laptop, connects one cable, and the screen, camera, microphone and speakers all work for a Teams or Zoom call without calling IT.",
    situation:
      "The room is used several times a day by different teams, but today people share a screen over a trailing HDMI lead and huddle around a laptop for calls. The room is too small for a rack, and nobody on the floor wants to learn a control panel.",
    roomInUse: [
      "A team books the room for a 30-minute catch-up and arrives with a single USB-C laptop.",
      "One cable at the table carries video to the screen and the camera, microphone and speakers to the laptop.",
      "The call starts from the laptop's own conferencing app; the far end hears the table and sees the room.",
      "When the meeting ends, the laptop is unplugged and the room is immediately ready for the next team.",
    ],
    successLooksLike: [
      "A first-time visitor can start a call in under a minute with no instructions.",
      "Remote participants hear everyone at the table clearly and see the whole seating area.",
      "There is no wall box, no rack hum and no cable spaghetti for facilities to manage.",
      "The room's day-to-day failures are limited to the laptop the visitor already knows.",
    ],
    customerDecisions: [
      "Confirm the display size that suits the 4m viewing distance and whether it is wall- or cart-mounted.",
      "Decide whether the single table connection is USB-C, HDMI or both, based on the laptops the teams actually use.",
      "Agree who supports the room when a visitor's laptop does not behave — internal IT or the AV integrator.",
    ],
  },
  "corporate-boardroom-networkhd500": {
    requirement:
      "We need a boardroom where any approved source — the room PC, a guest laptop or the visitor feed — can be shown on either front screen or the side confidence display, while the conferencing system handles remote participants independently.",
    situation:
      "The boardroom is used for both internal reviews and external meetings. Presenters currently swap cables behind the credenza to choose a screen, and the conference audio is a separate system that nobody wants to re-cable for every meeting.",
    roomInUse: [
      "The room PC is already on the front screens when the meeting starts, showing the agenda.",
      "A guest presenter connects at the table and the chair routes the laptop to both front screens with one action.",
      "Remote participants join through the room conferencing compute; ceiling speakers carry their voices and the table microphones carry the room.",
      "The side confidence display keeps the presenter's view visible while the front screens show the shared document.",
    ],
    successLooksLike: [
      "Any approved source reaches any screen without moving furniture or re-plugging cables.",
      "The far end hears the whole table, including the quietest speaker, without echo.",
      "The visitor feed can be shown or withheld without exposing the internal network.",
      "A member of the executive assistant team can run the room without an AV technician present.",
    ],
    customerDecisions: [
      "Confirm which visitor sources are allowed and where the approved patch point lives.",
      "Decide whether the conferencing platform is a room system or BYOD, since that changes the compute and USB path.",
      "Agree the confidence display's normal content — presenter view, timing or room status.",
    ],
  },

  "education-classroom-hdbaset": {
    requirement:
      "We need a teaching room where staff can select the room PC or their own laptop and put one large, readable picture on the front wall, with programme sound that reaches the back row.",
    situation:
      "Teaching staff currently run a long HDMI lead across the floor to the front display and lose the first five minutes of every lesson setting it up. The display is close to the desks, so the signal path is simple but the reliability matters more than the technology.",
    roomInUse: [
      "The teacher arrives, presses one button at the desk and the room PC appears on the front display.",
      "A visiting laptop is connected when a guest or a student needs to present; the same button swaps the picture.",
      "Programme audio from the selected source plays through the room speakers at a level set for the class.",
      "At the end of the lesson the teacher switches the display off and the room resets for the next group.",
    ],
    successLooksLike: [
      "The selected picture is readable from the back of the room without dimming the lights.",
      "Staff never need to reach behind the display or run a cable across the floor.",
      "The room works the same way for every teacher, including supply staff.",
      "A failed laptop does not stop the lesson because the room PC is always available.",
    ],
    customerDecisions: [
      "Confirm the display size and mounting height against the furthest learner's sightline.",
      "Decide whether the visiting connection is USB-C, HDMI or both.",
      "Agree who supplies and supports the teacher laptops and their adapters.",
    ],
  },
  "education-lecture-capture-networkhd": {
    requirement:
      "We need a tiered lecture theatre where the lecturer can present from a PC, document camera or laptop while a capture platform records the session, and the audience — including the back rows — sees and hears everything clearly.",
    situation:
      "The theatre is used for large cohorts and lectures are recorded for students who cannot attend. Today the projector, confidence monitor and rear repeater are driven by ad-hoc leads, and recorded audio is taken from the room without any control over intelligibility.",
    roomInUse: [
      "The lecturer arrives at the lectern, selects the teaching PC and the front projector shows the slides.",
      "A document camera or guest laptop is switched in without leaving the lectern.",
      "The capture platform records the session with a camera view of the lecturer and a clean audio feed from the lectern microphones.",
      "The rear repeater display and the confidence monitor keep the same picture available across the room.",
    ],
    successLooksLike: [
      "Every seat can read the presentation, including the last row of the tier.",
      "Recorded sessions have clear speech and synchronised video for students watching later.",
      "The lecturer operates the room from the lectern without an AV operator.",
      "Accessibility provision for hearing-impaired students is designed in, not added later.",
    ],
    customerDecisions: [
      "Confirm which sessions are recorded and how consent and retention are handled.",
      "Decide whether the rear repeater shows the same picture as the projector or a separate view.",
      "Agree the capture platform and who owns its storage and publishing workflow.",
    ],
  },
  "retail-signage-networkhd100": {
    requirement:
      "We need two approved content feeds — promotions and product information — routed to eight store screens, with screens switching on and off to store hours and no local staff involvement in content.",
    situation:
      "The store currently runs USB sticks in each screen, so content goes stale and updating a promotion means a ladder and a member of staff. The estate is a single large floor, and head office wants a repeatable pattern for other stores.",
    roomInUse: [
      "The store opens and the eight screens start their scheduled playlists automatically.",
      "A promotion update is published centrally and appears on the entrance screens within the schedule.",
      "Staff route either the promotions or product feed to a department screen when a specific range is being pushed.",
      "At close, the screens shut down in sequence without anyone visiting each position.",
    ],
    successLooksLike: [
      "All eight screens show the correct, current content every trading day.",
      "Content changes happen centrally with no store labour.",
      "The entrance screens are bright enough to read against street-facing daylight.",
      "A single failed screen does not affect the other departments.",
    ],
    customerDecisions: [
      "Confirm which team owns content publishing and the approval workflow for promotions.",
      "Decide whether any screen needs independent content rather than the two shared feeds.",
      "Agree the operating hours and shutdown behaviour for each screen group.",
    ],
  },
  "retail-lcd-wall-processor": {
    requirement:
      "We need a four-panel feature wall in the shopfront that shows one composed brand canvas, with a simple way to switch to a live demonstration feed during events.",
    situation:
      "The shopfront is the first thing customers see, but today it is a printed graphic that changes a few times a year. Marketing wants a digital canvas that can run a single campaign image across all four panels without visible seams in the composition.",
    roomInUse: [
      "The wall runs one campaign canvas across the four panels from the content player through the opening day.",
      "During a launch event, staff switch the wall to a live demonstration input at the counter.",
      "The campaign canvas returns at the end of the event without a technician visit.",
      "Marketing prepares artwork in the wall's canvas format and publishes it like any other campaign asset.",
    ],
    successLooksLike: [
      "The four panels read as one image with correct alignment and colour match.",
      "Campaign changes need no on-site hardware work.",
      "The demonstration switch is obvious to store staff and cannot leave the wall in a broken state.",
      "Viewers at the pavement and across the store both get a usable picture.",
    ],
    customerDecisions: [
      "Confirm the campaign artwork's aspect ratio and who produces the canvas-format files.",
      "Decide whether the demonstration input is permanent or only needed for launches.",
      "Agree the panel model, bezel width and service access for the shopfront.",
    ],
  },
  "hospitality-sports-bar-networkhd": {
    requirement:
      "We need twelve screens across the bar and seating area showing any of six licensed sports feeds, with the bar and the lower seating level able to play different commentary without changing every screen.",
    situation:
      "Match days are the busiest trading periods, but today staff can only show one feed everywhere and the audio follows the same match. The venue loses customers who want a different game, and switching screens between matches involves climbing behind the bar.",
    roomInUse: [
      "The manager sets up the day's matches from a tablet before opening, allocating feeds to screen groups.",
      "The bar area plays the featured match commentary while the lower seating level keeps a different game audible.",
      "Staff change a single screen to another match without disturbing the rest of the venue.",
      "After the final whistle, the system returns to the standard signage and background music playlist.",
    ],
    successLooksLike: [
      "Every screen shows a deliberate match, not whatever was left from yesterday.",
      "Bar and seating audio are genuinely independent and can be changed separately.",
      "Match-day changes take minutes from behind the bar, not a ladder and a cable swap.",
      "The system survives a feed or screen failure without taking down the whole venue.",
    ],
    customerDecisions: [
      "Confirm the licensed feeds and how many simultaneous subscriptions the venue holds.",
      "Decide the screen groups and which areas share audio.",
      "Agree who operates the match-day setup and how much training they need.",
    ],
  },
  "hospitality-ballroom-hybrid": {
    requirement:
      "We need a divisible ballroom where each half runs its own presentation when the partition is closed, and both halves follow one event when the room is combined — including the audio.",
    situation:
      "The venue hosts conferences and weddings, and the partition is opened and closed several times a week. Today each half has a projector and a small mixer, and combining the rooms means re-patching audio by hand while guests wait.",
    roomInUse: [
      "In divided mode, Room A runs its conference slides while Room B rehearses a wedding speech.",
      "The partition opens and the operator recalls the combined preset; both screens follow the main event feed.",
      "Confidence monitors at each lectern keep presenters on the same picture in both modes.",
      "At the end of the day the operator restores divided mode and both halves reset independently.",
    ],
    successLooksLike: [
      "Changing the room mode takes one action, not a re-patch.",
      "Each half has clean, separate audio when divided and no feedback when combined.",
      "Both front screens and lecterns stay in sync in combined mode.",
      "The venue's own staff can set the room up without the AV integrator on site.",
    ],
    customerDecisions: [
      "Confirm the partition sensor and interlock arrangement with the venue's partition contractor.",
      "Decide the standard source for each half and for combined events.",
      "Agree who owns the wireless microphone kit and its storage.",
    ],
  },
  "healthcare-simulation-lab": {
    requirement:
      "We need a simulation bay where observers can watch the simulator output or either camera view, and sessions can be recorded with consent for debrief and training review.",
    situation:
      "Clinical training currently happens with observers crowding into the bay, which changes learner behaviour and limits how many staff can be trained. The training team needs a repeatable observation and debrief workflow without touching clinical systems.",
    roomInUse: [
      "The learner team runs a scenario in the simulation bay while the simulator workstation feeds the observation room.",
      "Observers switch between the simulator output and either camera view as the scenario develops.",
      "The facilitator marks key moments and the training platform records the consented session.",
      "The group reviews the recording in the debrief room and the next cohort starts with the room reset.",
    ],
    successLooksLike: [
      "Observers see the detail they need without entering the bay.",
      "Recorded sessions are clear enough to use in teaching, with consent and retention handled.",
      "The clinical simulation equipment remains on its approved system and is not interfered with.",
      "The room resets to a standard state between cohorts.",
    ],
    customerDecisions: [
      "Confirm the recording platform, consent process and retention rules.",
      "Decide how many simultaneous camera views the training team needs.",
      "Agree the infection-control and cleaning requirements for the installed equipment.",
    ],
  },
  "government-control-room-networkhd600": {
    requirement:
      "We need a control suite where operators can put authorised workstation feeds and incident dashboards on a six-panel wall, and supervisors can pull detail onto their own review screens without disturbing the wall.",
    situation:
      "The suite runs continuously and decisions depend on seeing the right information at the right time. Today feeds are patched by hand to fixed screens, and re-arranging the wall for an incident takes an operator away from their desk.",
    roomInUse: [
      "Operators log in for the shift and the wall recalls the standard layout of approved feeds.",
      "An incident escalates and the supervisor selects a different wall layout with the incident dashboard enlarged.",
      "A workstation feed is promoted to the wall while the operator's own screens continue unchanged.",
      "At shift handover the wall returns to the standard layout and the day's layouts are recorded.",
    ],
    successLooksLike: [
      "The wall can be rearranged in seconds without touching cabling.",
      "Every displayed feed is an authorised source with a known owner.",
      "Latency is low enough for the operators to trust the wall during live incidents.",
      "A single endpoint or screen failure does not blind the room.",
    ],
    customerDecisions: [
      "Confirm which workstation outputs are approved for shared display and who authorises them.",
      "Decide the standard wall layouts and the escalation layout for incidents.",
      "Agree the network boundary and security approval route for the AV fabric.",
    ],
  },
  "venue-worship-overflow-networkhd500": {
    requirement:
      "We need the main hall and the overflow rooms, foyer and nursery to see the service programme — camera, lyrics or announcements — with audio that is delayed correctly for each space.",
    situation:
      "The venue fills the main hall on Sundays and overflows into adjacent rooms. Today those rooms receive a picture over a temporary link and audio through a portable speaker, which is never in sync and often inaudible.",
    roomInUse: [
      "The production team selects the live camera programme for the main hall screens before the service.",
      "Overflow, foyer and nursery receive the same programme at their own levels, with delay aligned to the main PA.",
      "Lyrics and announcement content are switched in as the service moves through its order.",
      "After the service the system returns to the standard welcome display.",
    ],
    successLooksLike: [
      "Overflow congregations hear and see the service in sync with the main hall.",
      "The nursery gets a controlled, appropriate feed with its own volume.",
      "The production team changes sources without leaving the booth.",
      "The system uses the existing building routes without new disruptive cabling.",
    ],
    customerDecisions: [
      "Confirm what each overflow space is allowed to show and at what volume.",
      "Decide who operates the system on Sundays and what training they need.",
      "Agree the camera and vision mixer arrangements upstream of the AV system.",
    ],
  },
  "transport-operations-signage": {
    requirement:
      "We need the operations office to place timetables, incident dashboards and authorised maps on any of six wall screens using named presets for normal service and incident response.",
    situation:
      "Supervisors currently rely on individual workstation screens, so the room cannot share a single operational picture during disruption. The team needs to switch the whole room between routine and incident modes quickly, without touching safety-critical systems.",
    roomInUse: [
      "At the start of the shift the supervisor recalls the normal-service preset and the six screens show the standard timetable and dashboard layout.",
      "An incident is declared and the incident preset replaces the wall with dashboards and the mapping feed.",
      "A supervisor sends one screen back to the standard timetable while the rest of the room stays on the incident layout.",
      "When the incident closes, the normal-service preset restores the room.",
    ],
    successLooksLike: [
      "The room shares one operational picture during disruption.",
      "Preset changes take seconds and are repeatable by any supervisor.",
      "The AV system stays outside safety-critical control loops.",
      "Screens remain readable at the working distance and light levels.",
    ],
    customerDecisions: [
      "Confirm which information feeds are authorised for shared display.",
      "Decide the normal-service and incident screen layouts.",
      "Agree the operating procedure and who may change presets.",
    ],
  },
  "residential-media-matrix": {
    requirement:
      "We need a media room where the household can switch between streaming, disc and games on the big screen, with proper surround sound rather than television speakers.",
    situation:
      "The room was built for film and sport but the sources have grown, and swapping HDMI leads behind the cabinet has already damaged one connector. The family wants a simple remote-control experience with the equipment hidden away.",
    roomInUse: [
      "A film night starts with the disc player selected on the main screen and the AV receiver handling the surround mix.",
      "The console is switched in for gaming, with the receiver applying the correct listening mode.",
      "A streaming show is selected without anyone touching the equipment cabinet.",
      "The room shuts down from one remote and the cabinet stays closed.",
    ],
    successLooksLike: [
      "Every source reaches the screen and surround system through one familiar remote.",
      "Dialogue is clear and effects have weight without waking the rest of the house.",
      "Nobody needs to reach behind the cabinet to change a source.",
      "The installation leaves a spare route for the next console or player.",
    ],
    customerDecisions: [
      "Confirm the screen size, seating distance and whether projection or a large television is preferred.",
      "Decide the surround format and speaker positions before decoration is finished.",
      "Agree who supplies and calibrates the AV receiver and speakers.",
    ],
  },
  "corporate-multi-camera-meeting-bridge": {
    requirement:
      "We need a meeting room where remote colleagues can see either the presenter or the whole room, while local participants share content on the front screen and an operator chooses the camera view.",
    situation:
      "The room hosts hybrid workshops where a single fixed camera is not enough — remote attendees miss the presenter at the wall or the discussion around the table. The company wants a local camera production workflow without building a broadcast studio.",
    roomInUse: [
      "The meeting starts with the room overview camera so remote attendees can see who is present.",
      "When the presenter takes the floor, the operator switches to the presenter camera.",
      "Shared content appears on the front screen while remote attendees keep a camera view.",
      "The operator returns to the overview camera for discussion and closes the call.",
    ],
    successLooksLike: [
      "Remote attendees always have a useful view of the room.",
      "Camera switching is quick and does not interrupt the call.",
      "Presenters are heard clearly through the room microphones.",
      "The room does not need a second conferencing bar to duplicate camera and audio.",
    ],
    customerDecisions: [
      "Confirm whether a dedicated operator is always present or the presenter controls the view.",
      "Decide which conferencing platform hosts the call and who owns the room compute.",
      "Agree camera positions, mounting and the presenter's sightline.",
    ],
  },
  "education-school-hall-hdbaset-projector": {
    requirement:
      "We need the assembly hall to show one large projector picture for school PC or laptop presentations, with speech and programme sound that reaches 120–180 pupils.",
    situation:
      "Assemblies and parents' evenings currently use a portable projector and a small PA, with cables run across the floor and staff spending the first ten minutes getting sound out of the laptop. The school wants a fixed installation that any member of staff can run.",
    roomInUse: [
      "Staff connect the school PC or a laptop at the stage input point and the projector shows the picture.",
      "The hall PA carries speech from the stage microphones and programme audio from the selected source.",
      "A visiting speaker presents from their own laptop with the same single connection.",
      "At the end of the assembly the system shuts down from the stage and the hall is clear for lessons.",
    ],
    successLooksLike: [
      "The picture is bright and readable from the back of the hall in normal lighting.",
      "Speech is intelligible at the back row without feedback.",
      "Any teacher can set the system up without technical help.",
      "The projector and screen are safely mounted and serviced without scaffolding.",
    ],
    customerDecisions: [
      "Confirm the assembly sizes and whether the hall is used for performances as well as presentations.",
      "Decide the projector and screen size against the throw distance and existing ceiling structure.",
      "Agree who operates sound for events and what training they need.",
    ],
  },
  "education-flexible-learning-networkhd500": {
    requirement:
      "We need a flexible teaching room where the tutor can send a team laptop or the teaching PC to any of four team displays, so groups can present without moving furniture or re-cabling.",
    situation:
      "The room is arranged as four team tables, but today only the front screen works and groups crowd around a single laptop. The school wants the room to support group work and whole-class presentation with the same simple control.",
    roomInUse: [
      "The tutor starts the lesson with the teaching PC on all four team displays.",
      "A team connects a laptop at its table and the tutor routes that work to the team's own display.",
      "The tutor promotes one team's work to the other displays for class discussion.",
      "The room resets to the standard layout for the next class.",
    ],
    successLooksLike: [
      "Every team can show its work on a display at its own table.",
      "The tutor controls what appears where without leaving the teaching station.",
      "Group audio does not compete across the room.",
      "Floor boxes and cabling survive daily use in a teaching room.",
    ],
    customerDecisions: [
      "Confirm how many team tables the room must support and whether it can be rearranged.",
      "Decide whether pupils connect their own devices or use fixed room devices.",
      "Agree who can override a team display during a lesson.",
    ],
  },
  "education-hybrid-collaboration-nhd500-dante": {
    requirement:
      "We need a seminar room that teaches a local class and remote students at the same time, with two screens showing local content and the far end, and audio that both sides can hear properly.",
    situation:
      "The department now runs hybrid seminars where remote students must participate, not just watch. The current room has a projector and a conference microphone on the desk, and remote students say they cannot hear the room or follow the slides.",
    roomInUse: [
      "The tutor starts the session and the local teaching PC appears on both front screens.",
      "Remote participants join and are shown on the second screen while the local class keeps the content.",
      "Ceiling microphones pick up the room and the far end is heard through the ceiling speakers with echo control.",
      "The session ends and the room returns to the standard display for the next booking.",
    ],
    successLooksLike: [
      "Remote students hear every question from the room and are heard clearly in return.",
      "The tutor can move between content and the far end without losing either.",
      "The two screens have a clear, consistent purpose.",
      "Recording or capture of the session is possible without extra hardware on the desk.",
    ],
    customerDecisions: [
      "Confirm the conferencing platform and whether the room uses a room system or BYOD laptops.",
      "Decide whether sessions are recorded and how consent is handled.",
      "Agree microphone positions against the seminar seating layout.",
    ],
  },
  "education-active-learning-nhd600-local-inputs": {
    requirement:
      "We need a laboratory teaching room where six teams work at fixed benches and the tutor can show any bench's work on any or all of the bench displays and the teaching wall.",
    situation:
      "The room is used for practical sessions where the tutor needs to compare results across teams. Today teams cannot share their screens and the tutor walks between benches to see progress, which wastes teaching time.",
    roomInUse: [
      "Teams start work at their benches and use their own displays locally.",
      "The tutor selects a bench's workstation and shows it on that team's display for review.",
      "A strong result is promoted to all bench displays and the teaching wall for whole-class discussion.",
      "The room resets to the standard teaching layout for the next session.",
    ],
    successLooksLike: [
      "Any bench's work can be shown anywhere in the room in a few seconds.",
      "Teams can work locally without their content appearing on other screens.",
      "The tutor never has to re-cable a bench during a session.",
      "The system supports the detailed content used in STEM teaching.",
    ],
    customerDecisions: [
      "Confirm the bench layout and whether it changes between sessions.",
      "Decide which team devices connect to the system and whether pupils use their own laptops.",
      "Agree the standard lesson presets the tutor wants.",
    ],
  },
  "hospitality-large-sportsbar-nhd500": {
    requirement:
      "We need a two-level sports venue with twenty-four screens where managers can run different matches in the bar, lounge and dining areas, and recall match-day presets in seconds.",
    situation:
      "The venue shows sport all day and its reputation depends on having the right game on the right screen. Staff currently manage screens individually, so the opening routine takes an hour and mistakes happen during big fixtures.",
    roomInUse: [
      "The manager opens the venue and recalls the match-day preset, and each area fills with its planned fixtures.",
      "A late kick-off is added by sending one of the licensed feeds to a screen group without disturbing the rest.",
      "The bar plays the featured commentary while lounge and dining keep their own levels.",
      "Closing time restores the standard signage and music state.",
    ],
    successLooksLike: [
      "Opening and match changes are a routine, not a scramble.",
      "Each area has the right game and the right audio.",
      "A failed screen or feed is visible and does not affect the rest of the venue.",
      "The system can grow to more screens without replacing the whole platform.",
    ],
    customerDecisions: [
      "Confirm the licensed content packages and the maximum simultaneous feeds.",
      "Decide the area groupings and audio behaviour for match days and normal trading.",
      "Agree who is trained on the control system and how presets are managed.",
    ],
  },
  "hospitality-local-pub-8x8-matrix": {
    requirement:
      "We need the pub to show any of four licensed feeds on eight televisions, with the bar controlling which commentary is audible.",
    situation:
      "The pub shows sport and entertainment across two seating areas. Today staff change screens with individual remotes and cannot give the two areas different audio, so one group always loses out on big match days.",
    roomInUse: [
      "Staff open the pub and select the day's fixtures for the bar and seating area televisions.",
      "A customer asks for a different match and staff switch that television without affecting the others.",
      "The bar chooses which commentary plays; the dining area keeps background music at a lower level.",
      "At close the screens and audio return to the standard state.",
    ],
    successLooksLike: [
      "Every television shows a deliberate feed rather than a default channel.",
      "Bar and dining audio can differ without new equipment.",
      "Staff make changes from behind the bar with a familiar control.",
      "The installation stays within the building's existing cable routes.",
    ],
    customerDecisions: [
      "Confirm the licensed feeds and how many can be watched at once.",
      "Decide the bar and dining audio behaviour and any noise restrictions.",
      "Agree television positions and cable routes with the building's constraints.",
    ],
  },
};
