# AV Hardware Compare Engine — Extended Specification
## Wingman App Improvement Blueprint

**Version:** 1.0
**Date:** 2026-06-14
**Purpose:** Define a unified product taxonomy, attribute model, and comparison decision framework covering the full breadth of professional AV and AVoIP hardware so that the Wingman compare engine can classify, score, and recommend across every product domain — not just HDBaseT matrices.

---

## 1. Core Philosophy

The compare engine must answer one question: **"Is this WyreStorm product a credible replacement for this competitor product, and if so, why?"**

To do that reliably across hundreds of product types, the engine needs:

1. A **taxonomy** that classifies every product into a domain family.
2. A **universal attribute model** that captures every technically-relevant feature per product.
3. A **scoring and gap model** that weights attributes by domain so that missing features that matter are surfaced and irrelevant differences are ignored.
4. A **decision tier** (GOOD MATCH / PARTIAL MATCH / VERIFY / NO MATCH) driven by scored gap severity, not keyword similarity.

---

## 2. Product Domain Taxonomy

Every product must resolve to exactly one primary domain tag. Sub-tags are additive.

| Domain Tag | Description | Example Products |
|---|---|---|
| `avoip_encoder` | AVoIP video encoder / transmitter | WyreStorm NetworkHD TX, Crestron DM-NVX-E, ZeeVee Xtreme |
| `avoip_decoder` | AVoIP video decoder / receiver | WyreStorm NetworkHD RX, Crestron DM-NVX-D, Visionary FOCUS |
| `avoip_controller` | AVoIP management controller or gateway | WyreStorm NHD-CTL, Crestron DM-NVX-DIR |
| `hdbaset_matrix` | Fixed matrix switcher with HDBaseT outputs | WyreStorm MXV-0808-H2A |
| `hdmi_matrix` | Fixed matrix switcher with local HDMI outputs | WyreStorm MX-0808-H2A-MK2 |
| `hdbaset_extender` | Point-to-point HDBaseT extender pair | WyreStorm EX-70-444-KIT |
| `hdmi_splitter` | One-to-many HDMI signal splitter | WyreStorm SP-0104-H2 |
| `presentation_switcher` | Multi-input auto-switching presentation switcher | WyreStorm SW-0401-MV |
| `matrix_switcher_scaling` | Matrix with built-in scaling per output | WyreStorm MX-0808-SCL |
| `videowall_processor` | Dedicated videowall / multiview processor | WyreStorm VWP series |
| `ndi_camera` | NDI-native or NDI-ready PTZ camera | BirdDog P400, Marshall CV730-NDI |
| `ptz_camera` | PTZ camera without native NDI | Sony EVI series |
| `usb_audio` | USB microphone or USB audio interface | Shure MV7, Rode PodMic USB |
| `wireless_casting` | Wireless content sharing / casting device | WyreStorm Apollo, Mersive Solstice |
| `copper_cable` | Copper structured cabling (Cat5e/Cat6/Cat6A) | Belden, Draka |
| `fiber_cable` | Optical fiber cable or active optical cable (AOC) | Corning, Kramer CRS series |
| `hdmi_cable` | Standard or premium HDMI cable | ProAV, Kramer C-HM/HM |
| `control_system` | Dedicated AV control processor | Crestron CP4, AMX NX-4200 |
| `relay_gpio` | Relay or GPIO expansion module | WyreStorm GPIO-RELAY |

Sub-tags (can stack, space-separated):

`poe_powered` `poh_powered` `usb_c_input` `mst_capable` `multiview_capable` `videowall_output` `ndi_output` `dante_audio` `hdbaset_2` `hdbaset_3` `serial_control` `ir_control` `lan_control` `gpio_relay` `psu_internal` `psu_external` `rack_mount` `4k60` `8k` `hdr10` `dolby_vision` `arc` `earc` `fiber_input` `copper_input`

---

## 3. Universal Attribute Model

Every product profile must define the following attribute groups. Attributes marked **[SCORE]** participate in the comparison scoring model.

### 3.1 Identity

```
brand               string        Manufacturer name
sku                 string        Primary part number
aliases             string[]      Alternative part numbers, regional variants
productClass        string        Human-readable class label
domainTag           string        Primary domain (see taxonomy)
subTags             string[]      Additional capability tags
```

### 3.2 Video Signal

```
[SCORE] inputTypes          string[]    e.g. ["HDMI 2.0", "USB-C DP Alt", "VGA"]
[SCORE] outputTypes         string[]    e.g. ["HDBaseT", "HDMI 2.0", "NDI"]
[SCORE] inputCount          number      Routed inputs (not mirrored/loop outputs)
[SCORE] outputCount         number      Routed outputs
[SCORE] maxResolution       string      e.g. "4K60", "4K30", "1080p"
[SCORE] hdrSupport          string[]    e.g. ["HDR10", "HLG", "Dolby Vision"]
[SCORE] chromaSubsampling   string      e.g. "4:4:4", "4:2:0"
[SCORE] colorDepth          string      e.g. "8-bit", "10-bit", "12-bit"
[SCORE] hdcpVersion         string      e.g. "HDCP 2.3", "HDCP 1.4"
[SCORE] hdmiVersion         string      e.g. "HDMI 2.0b", "HDMI 2.1"
        scalingOutput       boolean     Per-output independent scaling
        multiviewOutput     boolean     Multiple sources on one screen
        videowallOutput     boolean     Can drive a portion of an LED/LCD videowall
        videowallMaxCols    number      Max videowall columns supported
        videowallMaxRows    number      Max videowall rows supported
        matrixSize          string      e.g. "8x8", "4x4" for matrix products
```

### 3.3 Audio

```
[SCORE] audioInputTypes     string[]    e.g. ["HDMI ARC", "Optical TOSLINK", "Balanced XLR"]
[SCORE] audioOutputTypes    string[]    e.g. ["Stereo 3.5mm", "Balanced XLR", "DANTE"]
[SCORE] audioDeEmbed        boolean     Can extract audio from HDMI to analogue/digital output
[SCORE] audioEmbed          boolean     Can insert external audio into HDMI stream
[SCORE] arcSupport          boolean     HDMI ARC support
[SCORE] earcSupport         boolean     HDMI eARC support
        danteNetwork        boolean     Dante AoIP audio
        avbNetwork          boolean     AVB audio
        dolbyAtmos          boolean     Dolby Atmos pass-through
```

### 3.4 AVoIP Network

```
[SCORE] networkInterface    string[]    e.g. ["1GbE", "10GbE", "SFP+"]
[SCORE] networkProtocol     string[]    e.g. ["JPEG2000", "H.264", "H.265", "MJPEG", "RAW"]
[SCORE] compressionLatency  string      e.g. "zero-frame", "<1ms", "<50ms", "variable"
[SCORE] multicastSupport    boolean     IGMP multicast routing support
[SCORE] unicastSupport      boolean     Unicast point-to-point support
        vlanTagging         boolean     802.1Q VLAN support
        qosSupport          boolean     DSCP/802.1p QoS marking
        igmpVersion         string      e.g. "IGMPv2", "IGMPv3"
        switchRecommended   string      e.g. "Cisco Catalyst 9xxx", "1Gb unmanaged OK"
        poeClass            string      e.g. "PoE 802.3af", "PoE+ 802.3at", "PoH 802.3bt"
```

### 3.5 HDBaseT

```
[SCORE] hdbasetClass        string      e.g. "Class A", "Class B", "Class C" (HDBaseT 2.0/3.0)
[SCORE] hdbasetVersion      string      e.g. "HDBaseT 2.0", "HDBaseT 3.0", "HDBaseT Lite"
[SCORE] hdbasetDistance     number      Max distance in metres at rated resolution
        pohSupport          boolean     Power-over-HDBaseT output on the cable
        pohWatts            number      PoH watt budget per port
```

### 3.6 USB-C / DisplayPort

```
[SCORE] usbcInput           boolean     USB-C video input
[SCORE] usbcAltMode         string[]    e.g. ["DP Alt Mode 1.4", "DP Alt Mode 2.0", "Thunderbolt 3"]
[SCORE] mstSupport          boolean     DisplayPort Multi-Stream Transport
[SCORE] usbcDataPassthrough boolean     USB 2.0 or 3.x data tunnelling
[SCORE] usbcPowerDelivery   boolean     USB-C PD charging output
        usbcPdWatts         number      PD watt budget
```

### 3.7 USB Control and I/O

```
        usbHostPorts        number      USB-A host ports
        usbDevicePorts      number      USB-B device ports (for USB-over-IP or KVM)
        usbOverIP           boolean     USB extension over IP network
        usbKVM              boolean     Keyboard/Video/Mouse switching
```

### 3.8 Control Interfaces

```
[SCORE] serialControl       boolean     RS-232 serial control port
        serialBaud          string      e.g. "9600", "115200"
[SCORE] irControl           boolean     IR emitter / receiver ports
[SCORE] lanControl          string[]    e.g. ["Telnet", "REST API", "WebSocket", "MQTT"]
[SCORE] crestronControl     boolean     Native Crestron module available
[SCORE] amxControl          boolean     Native AMX NetLinx module available
[SCORE] savantControl       boolean     Native Savant profile
[SCORE] controlFourControl  boolean     Native Control4 driver
        buttonPanel         boolean     Front-panel or wall-plate button input
        apiSdk              boolean     Open REST or WebSocket API
```

### 3.9 GPIO and Relay

```
[SCORE] gpioPortCount       number      General-purpose I/O pins
        gpioVoltage         string      e.g. "3.3V", "5V", "12V"
[SCORE] relayPortCount      number      Relay contact closure ports
        relayType           string      e.g. "Form-C", "NO/NC"
        relayMaxAmps        number      Relay current rating
```

### 3.10 Physical and Power

```
[SCORE] powerSupply         string      "internal" | "external" | "PoE" | "PoH"
        psuWatts            number      Power consumption
        formFactor          string      "rack-1U" | "rack-2U" | "desktop" | "wall-plate" | "in-ceiling"
        rackUnits           number      1, 2, 4 etc.
        dimensions          string      WxDxH in mm
        weightKg            number
        operatingTempC      string      e.g. "0 to 40°C"
```

### 3.11 NDI / PTZ Camera Specifics

```
        ndiVersion          string      e.g. "NDI 5", "NDI|HX2", "NDI|HX3"
        ndiHX               boolean     NDI High Efficiency (compressed) output
        panRange            number      Degrees pan
        tiltRange           number      Degrees tilt
        zoomOptical         number      Optical zoom factor
        sensorSize          string      e.g. "1/2.8 inch CMOS"
        sensorResolution    string      e.g. "4K", "1080p"
        frameRate           string      e.g. "60fps", "30fps"
        ptzProtocol         string[]    e.g. ["VISCA", "VISCA-over-IP", "Pelco-D", "NDI control"]
```

### 3.12 Wireless Casting

```
        wirelessStandard    string[]    e.g. ["Wi-Fi 6", "Wi-Fi 5", "Miracast", "AirPlay 2"]
        screenMirroring     string[]    e.g. ["Miracast", "AirPlay", "Chromecast", "WyreStorm Cast"]
        simultaneousUsers   number      Max concurrent wireless presenters
        moderatorControl    boolean     Presenter approval / moderation
        4kWireless          boolean     4K wireless delivery support
```

### 3.13 Cable Specifics

```
        cableCategory       string      "Cat5e" | "Cat6" | "Cat6A" | "Cat7" | "Cat8"
        cableShielding      string      "UTP" | "STP" | "SFTP" | "SSTP"
        fiberType           string      "OM1" | "OM2" | "OM3" | "OM4" | "OS2 single-mode"
        fiberConnector      string[]    e.g. ["LC", "SC", "MPO"]
        cableMaxLength      number      Rated max length in metres
        plenum             boolean     Plenum / CMP rated
```

---

## 4. Comparison Scoring Model

### 4.1 Attribute Weight Table

Attributes are weighted 1–5 by domain. A missing attribute of weight 5 is a hard blocker; weight 1 is cosmetic.

| Attribute Group | Weight in `avoip_encoder/decoder` | Weight in `hdbaset_matrix` | Weight in `hdmi_matrix` | Weight in `presentation_switcher` | Weight in `ndi_camera` |
|---|---|---|---|---|---|
| Domain match | 5 | 5 | 5 | 5 | 5 |
| I/O count match | 5 | 5 | 5 | 4 | 1 |
| Resolution / chroma | 4 | 4 | 4 | 4 | 4 |
| Transport match | 5 | 5 | 4 | 3 | 2 |
| Network speed (1G vs 10G) | 5 | 1 | 1 | 1 | 3 |
| Latency class | 5 | 1 | 1 | 1 | 2 |
| HDCP version | 3 | 3 | 3 | 3 | 1 |
| Audio de-embed | 3 | 3 | 3 | 4 | 1 |
| HDBaseT class / distance | 1 | 5 | 1 | 2 | 1 |
| USB-C / MST | 2 | 2 | 3 | 4 | 1 |
| Scaling output | 3 | 3 | 3 | 3 | 1 |
| Videowall output | 4 | 3 | 3 | 2 | 1 |
| Serial control | 2 | 3 | 3 | 3 | 2 |
| IP control (REST/Telnet) | 3 | 3 | 3 | 3 | 3 |
| IR control | 2 | 2 | 2 | 3 | 1 |
| GPIO / Relay | 2 | 3 | 2 | 2 | 1 |
| NDI output | 1 | 1 | 1 | 1 | 5 |
| PTZ protocol | 1 | 1 | 1 | 1 | 4 |
| Power supply type | 2 | 2 | 2 | 3 | 2 |
| PoE / PoH class | 3 | 2 | 2 | 3 | 3 |

### 4.2 Score Calculation

```
totalWeight   = sum of all weight[attr] for domain
achievedScore = sum of weight[attr] where competitor and candidate values match
gapScore      = sum of weight[attr] where competitor has feature and candidate does not
confidence    = round((achievedScore / totalWeight) * 100)
```

Decision tier rules:

| Confidence | Hard Blockers (weight-5 gaps) | Outcome |
|---|---|---|
| ≥ 85 | 0 | GOOD MATCH |
| 70–84 | 0 | PARTIAL MATCH |
| 50–69 | 0 | VERIFY |
| Any | ≥ 1 | NO MATCH unless architecture alternative exists |
| Any | ≥ 1 | Architecture alternative offered if exists |

### 4.3 Network Speed Classification (AVoIP)

| Competitor Network | WyreStorm Search Scope | Note |
|---|---|---|
| 1GbE | NetworkHD 100 / 250 series | Standard 1Gb infrastructure |
| 10GbE | NetworkHD 500 / 800 series | Requires 10G managed switch |
| SFP+ fiber | NetworkHD fiber-input variants | Confirm WyreStorm fiber SKU |

This is a weight-5 domain attribute for `avoip_encoder` and `avoip_decoder`. Recommending a 10GbE decoder in a 1GbE infrastructure is a hard blocker.

### 4.4 Latency Classification

| Class | Typical Latency | Products |
|---|---|---|
| zero-frame | < 1 ms glass-to-glass | RAW/uncompressed AVoIP |
| ultra-low | 1–16 ms | JPEG2000, proprietary lossless |
| low | 16–100 ms | H.264 constrained |
| standard | 100–500 ms | H.264 / H.265 broadcast |
| variable | > 500 ms | Consumer streaming |

Use latency class as a gap when the competitor advertises "zero frame" or "ultra-low" and the candidate is "standard" or "variable."

---

## 5. Domain-Specific Comparison Rules

### 5.1 AVoIP Encoder / Decoder

**Must match (weight-5):**
- Network speed class (1G vs 10G)
- Routed input count (encoder) or output count (decoder)
- Max resolution
- Multicast / unicast support

**Must verify (weight-3–4):**
- Compression codec and quality
- Latency class
- Audio de-embed on decoder
- Control protocol

**Architecture alternatives:**
- If competitor is HDBaseT matrix and no AVoIP equivalent exists, offer matrix family with `architectureNote`.
- If competitor is AVoIP and no matching NetworkHD tier exists, surface nearest tier with gap note.

**Network rule — CRITICAL:**
> If competitor uses 10GbE, the WyreStorm candidate MUST be a 10G-capable SKU. Never recommend a 1G decoder into a 10G system. Surface as weight-5 hard blocker if violated.

### 5.2 HDBaseT 2.0 and 3.0 Device Classes

HDBaseT 2.0 defined device classes that restrict which features are carried at what distance. The compare engine must classify both competitor and candidate by HDBaseT class.

| HDBaseT 2.0 Class | Features Supported | Typical Distance |
|---|---|---|
| Class A | 4K, PoH, USB 2.0, bidirectional IR, RS-232, Ethernet | 100m |
| Class B | Full-HD, PoE, USB 2.0, bidirectional IR, RS-232 | 100m |
| Class C (HDBaseT Lite) | 1080p, no PoH, no USB | 70m |

HDBaseT 3.0 adds 8K, 10GbE pass-through, and extended PoH budgets.

**Rule:** If competitor is HDBaseT 2.0 Class A (4K PoH), candidate must also be Class A or HDBaseT 3.0. Class B or Lite is a weight-4 gap.

### 5.3 Presentation Switchers

**Must match:**
- Input count and input type mix (HDMI, USB-C, VGA, wireless)
- Auto-switch behaviour
- Audio de-embed

**Must verify:**
- USB-C DP Alt Mode support
- MST / multiview on USB-C
- PoE powering from downstream port
- Dante / balanced audio output

### 5.4 Videowall / Scaling Outputs

If competitor product supports videowall output or per-output scaling, the candidate must also declare `videowallOutput: true` or `scalingOutput: true`. This is a weight-4 attribute for `matrix_switcher_scaling` and `avoip_decoder` domains.

**Videowall matrix rules:**
- If competitor drives a 3×3 (9-output) videowall, the candidate must support ≥9 independently scalable outputs.
- AVoIP decoders can build arbitrary videowall sizes if the management software supports bezel correction. Surface this as an architectural advantage where relevant.

**LED vs LCD videowall note:**
> LED walls often require zero-frame latency. If the competitor is an LED-wall-targeted AVoIP product, ensure the WyreStorm candidate matches the latency class.

### 5.5 Matrix Switchers

Subtypes and rules:

| Subtype | Critical Attributes |
|---|---|
| Fixed HDMI matrix | I/O count, HDMI version, chroma, HDCP, audio de-embed |
| Fixed HDBaseT matrix | I/O count, HDBaseT class, distance, PoH, receiver included? |
| Modular / card-frame matrix | Slot count, card types, max bandwidth |
| Scaling matrix | Per-output resolution, aspect ratio, multiview |

**Mirroring trap:** A matrix with 4 routed outputs plus 2 mirrored HDMI loop outputs is a **4-output matrix**, not a 6-output matrix. The engine must not count mirror/loop ports as routed outputs.

### 5.6 HDMI Splitters and Extenders

| Product Type | Must Match |
|---|---|
| HDMI splitter | Output count, HDCP version, EDID management |
| HDMI extender | Distance, HDBaseT version, PoE/PoH, receiver included |
| Active optical cable (AOC) | Distance, HDMI version, 4K/8K |

### 5.7 NDI and PTZ Cameras

**NDI version matters:**
- NDI 5 and NDI|HX3 are not interchangeable with NDI|HX2 for low-latency applications.
- Surface NDI version as weight-4 gap if versions differ.

**PTZ control protocol must match:**
- VISCA-over-IP is the most common.
- If competitor uses Pelco-D (serial), verify whether the candidate supports it via serial or requires a protocol converter.

### 5.8 USB Microphones

Compare on: USB standard (USB 2.0 / 3.x), Windows/Mac driver-free support, sample rate (44.1kHz vs 48kHz vs 96kHz), bit depth, polar pattern, built-in DSP (noise cancellation, EQ).

### 5.9 Wireless Casting Devices

**Must match:**
- Wi-Fi standard (Wi-Fi 5 vs Wi-Fi 6)
- Screen mirroring protocol support (Miracast, AirPlay 2, Chromecast)
- Max simultaneous presenters
- 4K wireless if competitor supports it
- Moderator / approval workflow if present

### 5.10 Cables (Copper and Fiber)

**Copper:**
- Category rating (Cat6A for 10GbE HDBaseT 3.0)
- Shielding (STP required in high-EMI environments)
- Plenum rating

**Fiber:**
- OM4 or OS2 single-mode for long runs
- Connector type (LC / SC / MPO)
- Active optical cable vs passive

### 5.11 Control Systems and GPIO/Relay

- Serial (RS-232 / RS-485): baud rate and connector type must match
- IR: frequency range (38kHz standard) and carrier format
- LAN control: Telnet, REST, WebSocket — must note which the candidate supports
- GPIO: voltage levels and current capacity must match to avoid hardware damage
- Relay: NO/NC type and amp rating are blocking attributes

### 5.12 Power Supply Classification

| Class | Description | When It Matters |
|---|---|---|
| Internal PSU | IEC mains inlet, no brick | Preferred for rack mount; simpler install |
| External PSU | Power brick or lump-in-line | Acceptable for small units; note if PSU not included |
| PoE 802.3af | 15.4W budget | Low-power wall plates, small extenders |
| PoE+ 802.3at | 30W budget | Most HDBaseT receivers, PTZ cameras |
| PoH 802.3bt (Type 3) | 60W budget | High-power HDBaseT Class A, LED drivers |
| PoH 802.3bt (Type 4) | 90W budget | High-end AVoIP, PTZ cameras with heaters |

**Rule:** If competitor is PoE-powered and candidate requires an external PSU, surface as a weight-3 gap. If competitor is PoH and candidate cannot be powered over HDBaseT at all, surface as weight-5 blocker for remote installations.

---

## 6. Gap Severity Labels

Every gap reported in a comparison result must carry a severity label.

| Severity | Label | Meaning |
|---|---|---|
| 5 | BLOCKING | Candidate cannot do what the competitor does in this requirement |
| 4 | SIGNIFICANT | Candidate is weaker in an important area; verify before quoting |
| 3 | NOTABLE | Difference is real but may be acceptable depending on the project |
| 2 | MINOR | Small difference; unlikely to affect outcome |
| 1 | COSMETIC | Difference in form/format only; no functional impact |

---

## 7. Architecture Alternative Framework

When no direct WyreStorm replacement exists in the same product domain, the engine must offer an architecture alternative rather than returning NO MATCH.

```
architectureAlternative {
  fromDomain:    string    // competitor domain tag
  toDomain:      string    // alternative WyreStorm domain
  reason:        string    // why this architecture achieves the same result
  tradeoffs:     string[]  // what is different / additional required
  skus:          string[]  // candidate WyreStorm SKUs in the alternative domain
}
```

**Example scenarios:**

| Competitor | No Direct WyreStorm Product | Architecture Alternative Offered |
|---|---|---|
| Fixed 16x16 HDMI matrix | WyreStorm has no 16x16 fixed matrix | NetworkHD AVoIP (any scale) with NHD-CTL |
| 10GbE AVoIP encoder | NetworkHD 100 is 1G only | NetworkHD 500 / 800 series (confirm availability) |
| Dedicated 3x3 videowall processor | No dedicated VWP SKU | NetworkHD decoder per display + NHD-CTL videowall mode |

---

## 8. Profile Readiness Tiers

Each known profile must carry a readiness tier that governs how the engine presents confidence.

| Tier | Label | Engine Behaviour |
|---|---|---|
| `approved` | Verified, safe to quote | Full confidence scores shown |
| `usable-with-review` | Good data, verify 1–2 fields | Scores shown with verify checklist |
| `needs-evidence` | Inferred from partial data | Confidence capped at 65, prominent verify banner |
| `sku-only` | SKU recognised, no spec data | Confidence set to 0, request datasheet |

---

## 9. Comparison Result Object Schema

Every comparison result returned by the engine must conform to this structure:

```typescript
interface CompareResult {
  competitor: ProductProfile;         // Classified competitor product
  matches: CandidateMatch[];          // WyreStorm candidates, best first
  rejected: CandidateMatch[];         // Screened-out SKUs with reason
  topOutcome: OutcomeTier;            // GOOD MATCH | PARTIAL MATCH | VERIFY | NO MATCH
  recommendation: string;             // One-paragraph human-readable summary
  architectureAlternative?: ArchitectureAlternative;  // If domain has no direct match
  networkNote?: string;               // 1G vs 10G or fiber topology note
  videowallNote?: string;             // Videowall/scaling capability note
  powNNoteote?: string;              // PoE/PoH power note
  controlNote?: string;               // Control protocol compatibility note
  gapSummary: GapItem[];             // All gaps across all candidates, deduplicated
}

interface CandidateMatch {
  sku: string;
  name: string;
  decision: {
    outcome: OutcomeTier;
    confidence: number;              // 0–100
    relationship: string;            // direct_candidate | related_package | upgrade | downgrade
    matches: string[];               // What aligns
    gaps: GapItem[];                 // What is missing
    verify: string[];                // What to confirm before quoting
    blockers: string[];              // Hard-stop reasons
    nextAction: string;
  };
}

interface GapItem {
  attribute: string;
  severity: 1 | 2 | 3 | 4 | 5;
  description: string;
  competitorValue: string;
  candidateValue: string;
}
```

---

## 10. What Must Change in Wingman to Support This Spec

### 10.1 Immediate (Phase 1)

- Extend `KnownCompareProfile` to include all attributes defined in Section 3.
- Add `subTags` string array to every profile so sub-capabilities are indexed.
- Add `networkInterface`, `poeClass`, `hdbasetVersion`, `hdbasetClass` to every applicable profile.
- Add `powerSupply` and `psuClass` to every profile.
- Wire `videowallOutput`, `scalingOutput`, `mstSupport`, `usbcInput` into the gap model.

### 10.2 Short Term (Phase 2)

- Build the domain taxonomy registry (Section 2) as a TypeScript constant map.
- Implement the weighted scoring model (Section 4) so confidence is calculated, not hard-coded.
- Add severity labels to every gap item.
- Add `architectureAlternative` to results when the domain has no direct WyreStorm SKU.
- Add network speed classification rule for AVoIP products (1G vs 10G is a hard blocker).

### 10.3 Medium Term (Phase 3)

- Introduce product profiles for: NDI/PTZ cameras, wireless casting, USB microphones, cables, GPIO/relay modules, control systems.
- Build the presentation switcher domain with USB-C MST rules.
- Build the videowall output attribute model and scoring.
- Integrate HDBaseT 2.0 device class classification into the HDBaseT matrix and extender domains.

### 10.4 Data Quality Rules

- **Mirroring trap:** Parser must distinguish routed outputs from mirror/loop outputs. Mirror outputs must never increment `outputCount`.
- **Kit trap:** A product sold as a KIT (matrix + receivers) must record the matrix's `outputCount` as the routed zone count, not the total port count of all included receivers.
- **SKU alias resolver:** All regional and revision variants of a SKU must resolve to the canonical primary SKU before scoring.
- **Readiness gate:** Any profile with `readiness: "sku-only"` must have confidence forced to 0 and the result must show a banner requesting a datasheet before it is used externally.

---

## 11. Glossary

| Term | Definition |
|---|---|
| AVoIP | Audio/Video over IP — distributing AV signals across standard IP networks |
| HDBaseT | Long-distance AV-over-structured-cable technology (Cat5e/Cat6) by HDBT Alliance |
| NDI | Network Device Interface — NewTek/Vizrt protocol for video over LAN |
| PTZ | Pan-Tilt-Zoom camera |
| MST | DisplayPort Multi-Stream Transport — daisy-chaining multiple displays from one DP output |
| PoE | Power over Ethernet (802.3af / 802.3at) |
| PoH | Power over HDBaseT (802.3bt Type 3/4) |
| De-embed | Extracting audio from an HDMI signal to a separate analogue or digital output |
| Embed | Inserting external audio into an HDMI signal |
| GPIO | General-Purpose Input/Output — logic-level control pins |
| Relay | Electromechanical contact closure switch for control signals |
| EDID | Extended Display Identification Data — display capability handshake |
| Chroma | Colour subsampling ratio (4:4:4 full, 4:2:2, 4:2:0 compressed) |
| Videowall | Multi-display array showing a single image across panels |
| Multiview | Multiple sources shown simultaneously on one display |
| IGMP | Internet Group Management Protocol — controls multicast group membership |
| VLAN | Virtual LAN — network segmentation for traffic isolation |
| SFP+ | Small Form-factor Pluggable Plus — 10GbE transceiver port |
| AOC | Active Optical Cable — HDMI or DisplayPort cable using fibre internally |

---

*End of specification. This document should be provided to the AI assistant driving the Wingman compare engine as system context before any comparison task is initiated.*
