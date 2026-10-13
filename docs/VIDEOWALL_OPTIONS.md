# Videowall and multiview options

Research checked 13 October 2026. The builder is at `/wingman/videowall`, linked from Home and Opportunities in both views. Recommendations are design directions with commissioning checks, not final quotations.

## Architecture choices

| Application | Signal path | Starting options |
| --- | --- | --- |
| Separate feed per LCD | Source → matrix outputs, or encoders → AV network → receiver per panel | MX-0404-SCL / MX-0812-SCL for local fixed I/O; NetworkHD 500 for distribution |
| Looped / tiled LCD | Sources → compositor → shared feed → display loop/distribution and tile mode | NHD-150-RX, NetworkHD 600, or local NHD-0401-MV |
| LED processor input | Sources → composed HDMI → processor → LED receiving cards | Same compositor choices; processor retains LED mapping |
| Single projector | Sources → selected/composed HDMI → projector | Full-screen, split, quad or supported custom layouts |

These are architecture inferences from the documented functions, not manufacturer-approved designs. Confirm that the actual LCD supports the intended loop interface, chain length, tile modes and synchronisation. A looped single canvas cannot independently switch each panel. NetworkHD families are not stream-interchangeable; cross-family transport needs an explicit HDMI decode/re-encode boundary.

## Evidence and limits

- [MX-0404-SCL](https://www.wyrestorm.com/product/mx-0404-scl/): four inputs/four outputs, scaling, bezel-adjusted walls and preset multiview. Confirm the exact operating mode and geometry.
- [MX-0812-SCL](https://www.wyrestorm.com/product/mx-0812-scl/): eight HDMI inputs/twelve outputs. Four-source multiview is mirrored on outputs 1–4; rotation is specified on outputs 9–12. Do not assume twelve independent multiview outputs or simultaneous composition and wall cropping.
- [NetworkHD 500 v2](https://www.wyrestorm.com/product/nhd-500-tx-rx-v2/): 1GbE distribution and walls up to 16×16, with bezel adjustment and rotation. Allow an encoder per source and a receiver per directly driven panel. Standard receivers do not compose multiview. Saved product selections use catalogue family SKUs; order the current v2 hardware.
- [NHD-150-RX](https://www.wyrestorm.com/global/product/nhd-150-rx/): nine 1080p streams or eight higher-resolution streams; the narrative specifies 4K30 input streams. Confirm output timing and firmware because the page also describes 4K60 output. The previous six-floating-window rule is not retained. [NHD-124-TX](https://www.wyrestorm.com/global/product/nhd-124-tx/) offers four local inputs; [NHD-120-TX](https://www.wyrestorm.com/product/nhd-120-tx/) serves individual remote sources.
- [NHD-600-TRX](https://www.wyrestorm.com/product/nhd-600-trx/): 10GbE SDVoE with up to sixteen multiview windows and placement/size control. Validate stream scaling, processing latency and exact wall capacity. The builder budgets separate TX/RX roles; sixteen windows is not a promise of sixteen native-4K windows.
- [NHD-0401-MV](https://www.wyrestorm.com/product/nhd-0401-mv/): four HDMI inputs, one output and six presets. For 500-series sources, provide HDMI decoder feeds to its inputs; its LAN port is for control.
- [SW-0204-VW](https://www.wyrestorm.com/global/product/sw-0204-vw/) and [SW-0206-VW](https://www.wyrestorm.com/global/product/sw-0206-vw/): four/six panel outputs for one selected source, with two alternative HDMI inputs. They are not two-window compositors. Cascades require a separate design.
- [NHD-CTL-PRO v2](https://www.wyrestorm.com/product/nhd-ctl-pro-v2/): allow a controller alongside engineered network switching and commissioning.

## Example allowances

A 3×3 LCD wall with six sources can use one MX-0812-SCL, subject to geometry/mode checks, or six 500-series transmitters, nine receivers, a controller and AV switching. Four local sources into a looped wall, LED processor or projector can start with one NHD-0401-MV. For a 500-series source network, add up to four receivers at that compositor. The 120-series alternative feeds streams directly to an NHD-150-RX.

## Processor and projection boundaries

Confirm the precise sink input format, EDID, HDCP, pixel budget and aspect ratio. The official [NovaStar VX information](https://www.novastar.tech/tpl/VX400_VX600_VX1000.html) describes 4K×1K at 60Hz; this is not a blanket UHD 4K60 guarantee. Upstream composition does not replace receiving-card mapping or calibration.

For projection, agree audio-follow behaviour, layout recall and minimum readable text size. Lens geometry, warping and multi-projector edge blending need separate design. More screens do not create more source pixels; choose crop, letterbox or stretch deliberately.

## Lifecycle and unresolved options

[MX-0808-SCL](https://www.wyrestorm.com/product/mx-0808-scl/) and [NHD-250-RX](https://www.wyrestorm.com/product/nhd-250-rx/) are marked discontinued and excluded from new recommendations. [MX-1616-SCL](https://www.wyrestorm.com/product/mx-1616-scl/) remains a larger switching/scaling direction; confirm its card population and wall/multiview functions before adding an automatic wall recommendation. NHD-610 variants likewise need model/revision-specific evidence.

## Saved projects

Summaries retain requirements, equipment quantities, signal paths, checks and references. Changing architecture replaces earlier builder-owned selections. Unsupported combinations cannot be saved as a product direction. Layout previews are conceptual and do not control hardware.
