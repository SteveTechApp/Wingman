# Room template product attribution

This note records how the room-template BOM relates to the real installation.
The generated rows come from `roomTemplateDeployment.ts` and
`roomTemplateAudio.ts`; the authored room schedule and capability flags decide
which WyreStorm products appear.

## Complete system, with the right exclusions

A template should describe a plausible room in use and carry the WyreStorm
products that perform the specified video, distribution, UC, USB, control and
audio roles. A high SKU count is useful only when each product has a job in the
signal or control path. Do not add unrelated hardware to make a template look
more complete.

Displays, projection screens, loudspeakers and specialist audio systems stay in
the room scope where they are needed, but are not attributed as WyreStorm SKUs.
Their manufacturer, model, coverage and mounting remain open for the customer
or specialist contractor to confirm. WyreStorm amplifiers may be included
without WyreStorm speaker rows.

## Product choices follow the room

- A source/output schedule selects the local matrix, presentation switcher,
  HDBaseT or NetworkHD core and matching endpoints. NetworkHD uses the NHD-CTL-
  PRO-V2 route controller and a managed AV fabric sized from encoder, decoder,
  controller and scheduled USB endpoints.
- Wireless presentation is an optional input where the room is BYOD or accepts
  visiting/guest laptops. SW-220-TX-W suits a small source set; SW-640L-TX-W is
  the larger four-input route. Its output joins the room's existing switching
  system; it does not silently replace matrix or NetworkHD routing. Apollo
  templates use the bar's own casting workflow and may list APO-DG2 only for
  compatible APO-VX20-UC-V2 rooms.
- A separate UC camera is an optional CAM-210-PTZ or CAM-420-PTZ selection,
  based on room coverage and format. Integrated bars already carry camera and
  microphone functions; do not add another camera by default. Check field of
  view, host input, mounting and platform compatibility on survey.
- NHD-USB-TRX is an optional two-endpoint USB-over-IP path only where a
  NetworkHD 500 room separates the conferencing host from the room-side USB
  camera or microphone devices. Count both endpoints in the AV network port
  schedule. Other rooms need a specifically engineered USB extension, not an
  automatic network product.
- COM-MIC-HUB is an optional WyreStorm USB/AEC microphone hub when the selected
  microphone interfaces and room host path match. It does not replace a full
  channel-count DSP where more processing, routing or zones are required.
- A NetworkHD 500 Dante design uses NHD-500-DNT-TX where the source audio must
  enter Dante/AES67. NHD-500 receivers do not provide Dante output. AMP-2120-DNT
  is included where the authored zone explicitly calls for its suitable 100V
  or low-impedance output; AMP-260-DNT may be offered as an optional low-Z
  match only when the channel and power schedule fits. Loudspeakers remain
  separately specified.
- DSP-88-DNT is not assigned to current template BOMs while the manufacturer's
  shop lists it as coming soon and the governed sale catalogue does not yet
  carry it as an active selectable SKU. Keep DSP selection as a validation
  item; add the product only after availability, governance and channel
  compatibility are confirmed.
- NetworkHD control has two distinct needs: NHD-CTL-PRO-V2 manages AV routes;
  it is not a whole-room automation processor. The free NetworkHD Touch App can
  give the user source routing from a customer/integrator tablet. Synergy Flow
  uses its dedicated SYN-TP10-B panel and matching SYN-CTL-FL10 processor for
  room scenes; verify processor availability and integrations before issue. A
  named third-party controller is the alternative when that is the customer's
  control standard. Present the routes as alternatives and confirm one, rather
  than including three competing controllers in a required kit.

The generator tests pin representative huddle, boardroom, Dante-distribution
and NetworkHD UC routes, including optional status, SKU quantity, control
guidance and the non-WyreStorm speaker boundary. The lifecycle and signal-path
gates remain the final check for every generated template.
