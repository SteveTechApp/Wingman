import type { TemplateMarketStory } from "./templateMarketStories";

function story(requirement: string, situation: string, roomInUse: string[], successLooksLike: string[], customerDecisions: string[]): TemplateMarketStory {
  return { requirement, situation, roomInUse, successLooksLike, customerDecisions };
}

export const COVERAGE_MARKET_STORIES: Record<string, TemplateMarketStory> = {
  "energy-operations-dashboard-matrix": story(
    "We need operators to compare production, maintenance and weather dashboards on four screens without putting our process controls on the AV system.",
    "The current shift review relies on one desktop and printed summaries. The clean review room needs shared visibility of authorised workstation outputs while control and alarms stay independent.",
    ["At handover, the operator selects the approved production dashboard.", "Maintenance and weather feeds are placed beside the production picture.", "The team records decisions in its approved operational systems before ending the review."],
    ["All four screens show the nominated advisory content.", "Small dashboard text remains readable from every review seat.", "Changing an AV route has no effect on process control or alarms."],
    ["Which workstation outputs may be displayed and who can select routes?", "What operating hours, recovery procedure and dashboard viewing distances apply?"]),
  "energy-shift-briefing-hdbaset": story(
    "We need a straightforward briefing screen for handover notes, work permits and maintenance plans, operated by the shift lead from a site PC or guest laptop.",
    "Briefings currently use paper sheets and a small laptop display. Staff need one shared view in a quiet room outside the process area, with a clear distinction between presentation and permit approval.",
    ["The shift lead opens authorised handover material on the briefing PC.", "A visiting engineer switches to the guest laptop for a maintenance explanation.", "The team completes permit and attendance records in the approved systems."],
    ["The selected presentation is readable at the back of the room.", "Programme audio is clear without disturbing adjacent spaces.", "The lead can switch sources and shut down without technical support."],
    ["Which documents may be shown and how will confidential material be handled?", "What audience size, accessibility provision and laptop interfaces are required?"]),
  "energy-training-review-matrix": story(
    "We need trainers to compare simulated plant behaviour and teaching content across three displays while keeping training equipment isolated from live operational controls.",
    "Trainees currently alternate between one projected picture and their own notes. The planned training room needs simultaneous instructor and simulation views without any route to live plant control.",
    ["The instructor loads a supervised exercise on the simulation workstation.", "Teaching material and the simulated result are shown side by side.", "The instructor uses the confidence display to review the next exercise before group discussion."],
    ["Each display can show its nominated training source independently.", "Simulation labels are readable at the furthest trainee position.", "AV switching never creates a connection to live operational controls."],
    ["Which simulation and instructor outputs must be viewed simultaneously?", "How will training isolation, content access and instructor controls be verified?"]),
  "energy-visitor-information-matrix": story(
    "We need four visitor screens to show approved site information and silent safety-induction media while formal induction and emergency communication remain on their existing systems.",
    "Visitors currently gather around reception notices and ask staff for directions. The reception upgrade should repeat clear approved content without exposing operational dashboards or implying induction completion.",
    ["Reception starts the authorised information and induction players.", "Staff select the appropriate feed for the entrance and waiting positions.", "Visitors complete their required induction through the established supervised process."],
    ["All four positions show legible and approved visitor content.", "Staff can update content without accessing the operational network.", "Screens do not obscure emergency notices or replace mandatory induction."],
    ["Who approves content and how are expired notices removed?", "What languages, accessibility formats and opening-hour controls are required?"]),
  "manufacturing-production-status-matrix": story(
    "We need four work-area screens showing approved production and quality information, with AV equipment kept separate from machinery, safety circuits and the plant control network.",
    "Supervisors currently circulate printed targets and call teams to a single workstation. The production floor needs shared read-only information at protected positions with suitable environmental controls.",
    ["A supervisor opens the authorised throughput and quality dashboards.", "Each work-area display is assigned the relevant approved feed.", "The team reviews exceptions through its existing production management system."],
    ["Targets and quality notices are readable from the nominated positions.", "Display enclosures withstand the measured site environment.", "AV routing has no influence on machine operation or safety."],
    ["Where can screens be mounted without obstructing work or vehicle routes?", "Who authorises dashboard outputs and what environmental protection is needed?"]),
  "manufacturing-shift-training-hdbaset": story(
    "We need supervisors to deliver shift handover and safety training from a PC or visiting laptop on one clear screen in an enclosed factory briefing room.",
    "Training currently takes place beside noisy production areas with inconsistent laptop connections. The enclosed room should make instructions readable and speech understandable without replacing approved training records.",
    ["The supervisor starts the approved shift or training material on the room PC.", "A visiting trainer selects the laptop connection for a demonstration.", "The supervisor completes attendance and competency records in the approved system."],
    ["Every trainee can read the displayed instructions.", "Speech and programme audio remain clear despite nearby factory noise.", "Source selection is simple enough for shift supervisors to operate."],
    ["How many staff attend and what accessible formats are needed?", "What background-noise isolation and approved guest-device policy apply?"]),
  "manufacturing-quality-review-matrix": story(
    "We need engineering and quality staff to compare inspection images, drawings and guest reference material on three review screens while measurements remain on validated instruments.",
    "Reviewers currently crowd around an inspection workstation and pass printed drawings between seats. A dedicated clean room should make comparison easier without treating an AV screen as a calibrated metrology device.",
    ["The quality lead opens the authorised inspection output.", "Engineering drawings and client reference material are routed alongside it.", "Decisions are documented against the original validated measurement records."],
    ["All three nominated views can be compared independently.", "Drawing labels and inspection detail are readable at the agreed distance.", "The measurement authority remains with the validated inspection system."],
    ["Which resolution, text size and viewing distances must the review chain support?", "Are any colour-critical or metrology outputs required to bypass AV routing?"]),
  "logistics-dispatch-information-matrix": story(
    "We need six screens to repeat approved dock allocation, queue and shift information for warehouse teams and drivers without connecting AV hardware to safety or vehicle controls.",
    "Dispatch staff currently repeat status updates by telephone and handwritten boards. The office and protected waiting positions need consistent information from authorised outputs with clear content ownership.",
    ["Dispatch opens the approved dock and queue information feeds.", "The operator selects relevant content for each office or waiting display.", "Staff update queue and allocation records through the existing logistics system."],
    ["Drivers and warehouse teams see legible current information.", "Displays stay clear of vehicle paths and access routes.", "A display fault does not affect dock operation or emergency communication."],
    ["Which information may be displayed publicly and who owns updates?", "Which positions are within the cable allowance and need protective enclosures?"]),
  "sports-coaching-analysis-matrix": story(
    "We need coaches to compare match footage and performance analysis on two screens so the whole team can discuss the same moments without crowding around a laptop.",
    "Coaching reviews currently alternate between clips and analysis on one small display. The proposed room should present both together while retaining control over participant information and footage permissions.",
    ["The coach selects an approved match clip for the first screen.", "The analysis workstation supplies the comparison view on the second screen.", "A guest coach switches to a presentation before the team agrees its follow-up actions."],
    ["Both nominated pictures can be viewed independently.", "Analysis annotations remain readable from all team seats.", "Playback audio is clear and participant information stays protected."],
    ["Which footage formats and analysis tools are used?", "Who may access participant records and which simultaneous views are essential?"]),
  "sports-esports-review-matrix": story(
    "We need an operator to route observer, replay and event information to four spectator screens without placing the competitive players' monitors through the AV distribution chain.",
    "The club currently uses improvised spectator displays with inconsistent content and delay. A dedicated audience system should give the operator control of the spectator experience while preserving direct player connections.",
    ["The operator checks the observer and replay computer outputs.", "Spectator displays are assigned live observation, replay or event information.", "Between matches, the operator switches the audience to approved notices."],
    ["Each spectator screen shows the intended feed.", "Players retain their direct local monitors throughout the event.", "Audience playback and programme audio are consistent across the club room."],
    ["Which spectator frame formats, capture permissions and event sources apply?", "Is commentary or streaming required beyond this spectator display scope?"]),
  "worship-small-sanctuary-hdbaset": story(
    "We need volunteers to display lyrics, notices and visiting presentations on one readable screen, with clear speech and an agreed interface to the hall's audio system.",
    "Services currently depend on a portable projector and manually exchanged cables. The small hall needs dependable volunteer operation and readable content without the cost or complexity of a large production network.",
    ["A volunteer starts the approved lyrics and notice presentation.", "The presenter microphone and selected programme are checked before attendees arrive.", "The volunteer switches to a guest laptop when required and returns to the service content."],
    ["Lyrics remain legible from the furthest occupied seat.", "Speech is clear and microphones operate without feedback.", "Volunteers can start and finish the system with a short checklist."],
    ["What projection brightness, viewing distance and existing PA interface are required?", "What assistive-listening provision and live-music scope must the venue agree?"]),
  "transport-passenger-information-matrix": story(
    "We need six indoor passenger screens showing approved departure, service-update and wayfinding information while signalling, station PA and evacuation systems remain completely separate.",
    "Passengers currently rely on scattered notices and staff explanations during service changes. The waiting area needs consistent approved visual information, readable placement and a defined response when content becomes stale.",
    ["Staff check the authorised departure and service-update players.", "Each passenger information position receives the nominated feed.", "The operator checks content freshness and follows the agreed fallback procedure during a fault."],
    ["Passengers can read current information from the agreed waiting positions.", "Public screens do not expose operational or restricted information.", "AV faults do not affect signalling, PA or evacuation systems."],
    ["Who owns information freshness and what fallback is required?", "Which languages, accessibility provisions and protected display positions are needed?"]),
  "broadcast-interview-production-studio": story(
    "We need an operator to capture a two-person interview using presenter and guest cameras, a single programme monitor and a separately mixed microphone feed.",
    "Interviews currently use one camera and inconsistent computer audio. A controlled room should provide repeatable camera selection, close microphone capture and synchronised recording without implying a complete broadcast studio.",
    ["The operator checks camera framing, exposure and both microphone inputs.", "Presenter or guest camera is selected for the recorded programme.", "The operator reviews synchronisation and saves the recording under the agreed retention policy."],
    ["The recording contains the intended selected camera picture.", "Both voices are clean and synchronised with the video.", "Programme monitoring and headphone listening do not create recording feedback."],
    ["Are preview, tally, intercom or live streaming required beyond this capture scope?", "Which recording formats, consent rules and storage policies apply?"]),
  "broadcast-edit-review-matrix": story(
    "We need editors and clients to compare workstation playback and reference material on two room screens while colour-critical mastering stays on a validated direct reference chain.",
    "Client reviews currently take place around an editing desk and interrupt the editor's reference monitoring. The room needs a separate shared review experience with clear limits on grading and broadcast-compliance claims.",
    ["The editor selects the approved workstation or playback output.", "Client reference content is displayed beside the programme under review.", "The team records feedback and confirms final mastering on the separate validated reference chain."],
    ["Both nominated review views are available independently.", "Programme sound and picture are synchronised for client playback.", "Review routing does not replace calibrated mastering or compliance monitoring."],
    ["Which playback frame rate, colour and audio formats must be supported?", "Which mastering outputs must remain direct and outside this review system?"]),
  "residential-multiroom-entertainment-matrix": story(
    "We need household members to select a television receiver, media player or shared source independently in four rooms, using each display's own speakers and local volume control.",
    "The home currently uses separate loosely connected sources and inconsistent remote controls. A central cabinet can simplify shared-source access if cabling, content rights and source-control arrangements are agreed for every room.",
    ["A resident chooses an authorised source for the living-room display.", "Another room selects a different source and adjusts its own display volume.", "The household shuts down unused zones while keeping the nominated shared sources available."],
    ["Each room can select one of the scheduled central sources.", "Local display speakers reproduce the agreed supported audio format.", "Source-control commands and content permissions work for simultaneous viewing."],
    ["Which subscriptions permit the planned shared and simultaneous viewing?", "Are AVR, eARC, HDR or gaming requirements outside the stated baseline needed?"]),
  "residential-home-office-byod": story(
    "We need a simple home-office video meeting setup that uses the work laptop, one room screen and an integrated camera, microphone and loudspeaker device.",
    "The resident currently changes between a laptop camera, headset and television with inconsistent call settings. An enclosed office should provide predictable meetings while respecting employer software rules and household privacy.",
    ["The resident connects the approved work laptop to the room bar.", "The meeting platform selects the bar as its camera and USB audio device.", "The resident shares documents and disconnects the laptop when the call finishes."],
    ["The far-end participants see the intended framing and hear clear speech.", "One active USB audio device avoids competing microphones and speakers.", "Work content remains within the employer-approved laptop and meeting platform."],
    ["Does the work laptop support the required USB-C video and host functions?", "What camera privacy, acoustic separation and approved meeting-platform rules apply?"]),
};
