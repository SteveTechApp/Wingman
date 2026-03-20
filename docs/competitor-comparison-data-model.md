# Competitor Comparison Data Model

## Goal

Wingman should only compare products that are genuinely comparable, and it should do so using the fields that matter most in AV design decisions.

The current compare engine is moving in the right direction, but the data model is still too shallow to guarantee accurate product parity. A true compare service needs to distinguish between:

- AVoIP endpoints vs AVoIP controllers vs AVoIP multiviewers
- Matrix switchers vs matrix kits vs distribution amplifiers
- Presentation switchers vs UC switchers vs simple HDMI switchers
- Extender TX vs RX vs extender kits
- Mirrored outputs vs independent outputs
- Local HDMI outputs vs HDBaseT outputs vs IP transport outputs

Without that structure, Wingman can only score text similarity and broad category alignment, which is not enough.

## Current State

### Core schema today

Current catalog product shape in [types.ts](C:/Users/steve/wingman/src/catalog/types.ts):

- `sku`
- `name`
- `family`
- `category`
- `subcategory`
- `summary`
- `inputs[]`
- `outputs[]`
- `control[]`
- `audio[]`
- `video.maxResolution`
- `video.hdr`
- `video.hdmi`
- `video.bandwidthGbps`
- `latency`
- `transport`
- `distance.meters`
- `features[]`

This is useful, but too flat for high-confidence AV comparisons.

### Observed gaps

From the current catalog audit:

- Competitor catalog rows: `56`
- Competitor rows with distance data: `0`
- Competitor rows with missing input data: `10+`
- Competitor rows with missing output data: `10+`
- WyreStorm catalog rows: `9`
- WyreStorm rows missing I/O: `1`

The biggest practical problem is not just missing data. It is that some of the most important comparison dimensions are not modeled explicitly at all.

## Comparison Importance Order

Wingman should compare in this order:

1. Input and output count
2. Connection type and transport path
3. Key features
4. Secondary/support connectivity and infrastructure details

This means the matching engine should prefer:

- correct `4x4` over a feature-rich but wrong `8x8`
- correct `HDBaseT` over a similar local HDMI product
- correct `USB-C + HDMI + wireless` input mix over generic “switcher” similarity
- correct output behavior over abstract category match

## Minimum Required Data For Any Product

Every product that participates in comparison should have these fields populated.

### 1. Identity

- `brand`
- `sku`
- `name`
- `family`
- `category`
- `subcategory`
- `role`
  - examples: `encoder`, `decoder`, `tx`, `rx`, `matrix`, `presentation-switcher`, `distribution-amplifier`, `controller`

### 2. Product topology

- `technology`
  - examples: `AVoIP`, `HDBaseT`, `Matrix`, `Distribution`, `Local Switcher`, `USB Extension`, `Wireless Presentation`
- `topology`
  - examples: `1:1 extender`, `matrix`, `splitter`, `endpoint`, `controller`, `multiview`
- `directionality`
  - examples: `tx`, `rx`, `bidirectional`, `kit`

### 3. I/O model

This is the single most important section.

- total input count
- total output count
- port counts by type
  - `HDMI`
  - `USB-C`
  - `HDBaseT`
  - `LAN`
  - `SDVoE`
  - `SFP`
  - `USB-A`
  - `USB-B`
  - `USB host`
  - `USB device`
  - `audio out`
  - `audio in`
  - `RS-232`
  - `IR`
  - `relay`
  - `GPIO`
- whether outputs are:
  - `independent`
  - `mirrored`
  - `mirrored + local`
  - `matrixed`
- per-output behavior
  - single display only
  - dual mirrored
  - matrix switching
  - multi-zone

### 4. Video capability

Resolution and signal capability are critical.

- `maxResolution`
- `maxFramerate`
- `chroma`
  - examples: `4:4:4`, `4:2:0`
- `bandwidthGbps`
- `hdmiVersion`
- `hdcpVersion`
- `hdr`
- `dolbyVision`
- `scaling`
- `downscaling`
- `upscaling`
- `multiview`
- `seamlessSwitching`

### 5. USB and collaboration capability

- `usbPassthrough`
- `usbHostPorts`
- `usbDevicePorts`
- `usbCVideoInput`
- `usbCChargingWattage`
- `kvmSupport`
- `cameraSharing`
- `peripheralSwitching`

### 6. Wireless and casting capability

- `airplay`
- `miracast`
- `googleCast`
- `wirelessPresentation`
- `wirelessConference`
- `mst`
- `byod`
- `byom`

### 7. Audio capability

- `audioDeEmbed`
- `audioEmbed`
- `analogAudioOut`
- `analogAudioIn`
- `dsp`
- `micMixing`
- `speakerphoneSupport`
- `audioFormats`

### 8. Control and integration

- `rs232`
- `ir`
- `lanControl`
- `webUi`
- `api`
- `cec`
- `relay`
- `gpio`
- `poe`
- `poePd`

### 9. Distance and transport quality

Especially important for HDBaseT and extension products.

- `distance1080pMeters`
- `distance4kMeters`
- `hdbasetClass`
  - `Class A`
  - `Class B`
- `networkSpeed`
  - `1G`, `2.5G`, `10G`
- `codec`
  - `SDVoE`, `JPEG2000`, `JPEG-XS`, `H.264`, `H.265`
- `latencyClass`

### 10. Power and install constraints

- `powerSupplyType`
- `poc`
- `poh`
- `rackWidth`
- `formFactor`
- `wallPlate`
- `tableMount`

## Product-Type Specific Required Fields

Not all fields matter equally for all products.

### AVoIP

Must have:

- encoder/decoder/controller role
- codec family
- network speed
- latency class
- input/output count by port type
- multiview support
- USB/KVM support

### Matrix switchers

Must have:

- exact input count
- exact output count
- output type mix
  - HDMI only
  - HDBaseT only
  - mixed HDMI + HDBaseT
- mirrored vs independent output behavior
- scaling and audio breakout
- control ports

### Distribution amplifiers

Must have:

- single-source assumption confirmed
- exact output count
- mirrored-only behavior
- scaling or de-embedding support

Wingman must not compare a DA to a true matrix just because both say `1x4` or `4x4` somewhere in text.

### Presentation / UC switchers

Must have:

- HDMI input count
- USB-C input count
- wireless input support
- HDMI output count
- dual-display behavior
  - mirrored or independent
- USB host/device behavior
- BYOD / BYOM capability
- AirPlay / Miracast / MST support

### Extenders

Must have:

- TX vs RX vs kit
- transport type
- distance at 1080p and 4K
- USB/control pass-through
- PoC / PoH behavior

## Apples-To-Apples Rules

Wingman should not compare products across these boundaries unless explicitly in “alternate path” mode:

- matrix vs DA
- AVoIP endpoint vs AVoIP controller
- TX vs RX
- local switcher vs HDBaseT matrix
- mirrored dual-output product vs true independent dual-display product

In short: category alignment is necessary, but not sufficient.

## Data Model Additions Needed

Current `CatalogProduct` should be extended or wrapped with structured comparison fields.

Recommended additions:

- `role`
- `topology`
- `directionality`
- `outputBehavior`
- `videoDetailed`
  - resolution, framerate, chroma, hdcp, scaling
- `usb`
  - host, device, kvm, charging, passthrough
- `wireless`
  - AirPlay, Miracast, MST, BYOD, BYOM
- `controlDetailed`
  - RS-232, IR, LAN, relay, GPIO, API, CEC
- `distanceDetailed`
  - 1080p, 4K, class, notes
- `network`
  - codec, speed, multicast, IGMP, VLAN requirements
- `power`
  - PoC, PoH, PoE, supply type

## Current Matching Risks

The current system can still mis-rank products when:

- I/O is inferred rather than verified
- distance is absent
- output behavior is not explicit
- the product is matched by family/category but not by exact transport role
- video capability is summarized too loosely
  - example: `4K60` without `4:4:4`, HDR, or HDMI version detail

## Immediate Priorities

### Priority 1

Make sure every competitor and WyreStorm row has:

- exact inputs
- exact outputs
- exact transport type
- exact direction/role

### Priority 2

Add explicit structured fields for:

- output behavior
- distance
- control ports
- wireless features
- USB behavior

### Priority 3

Add technology-specific validation rules so incomplete records are flagged before they participate in comparison.

## Recommendation

Wingman should treat comparison readiness as a data-quality problem first and a ranking problem second.

The best next step is:

1. expand the product schema
2. audit both catalogs against required fields by product type
3. block products with incomplete core comparison data from automatic matching
4. only show automatic matches when the products are structurally comparable

That is the path to accurate, defensible, “apples with apples” AV comparison.
