# Vendor Comparison Brief

This note captures the product-class logic used to keep Wingman comparisons apples-to-apples.

## ZeeVee

- `ZyPerUHD60` is the compressed `1Gb` distribution tier. Use it for cost-sensitive AVoIP walls, collaboration, and simpler multizone deployments. It supports video walls up to `15x15` and uses encoder/decoder roles that should not be mistaken for a traditional matrix.
- `ZyPer4K` is the premium `10Gb` SDVoE tier. Use it when you need uncompressed 4K, low latency, multiview, and wall-heavy designs.
- `Z4KMP48` is a management/controller platform, not a transport endpoint.

Official sources:
- [ZeeVee documentation hub](https://www.zeevee.com/documentation/)
- [ZyPerUHD60 family](https://www.zeevee.com/products/av-over-ip/zyperuhd60/)
- [ZyPer4K family](https://www.zeevee.com/av-over-ip/zyper4k/)
- [Z4KMP48 data sheet](https://www.zeevee.com/z4kmp48-data-sheet/)

## Atlona

- `Omega CS`, `Omega MS`, `Omega PS`, and `Omega SW` are presentation and collaboration products. They should be compared against room switchers, lecture-hall systems, and BYOD workflows, not against pure HDMI matrices.
- `OmniStream` is Atlona’s AVoIP family and should be scored as networked distribution.
- `Velocity` is room control, scheduling, and automation.

Official sources:
- [AV Solutions for Business brochure](https://www.atlona.com/)
- [Education application guide](https://atlona.com/)

## Extron

- `NAV` is Extron’s AVoIP ecosystem and should be compared as encoder / decoder / controller roles.
- `DTP CrossPoint` and `IN1608` are presentation-centric matrix and switcher families with DTP extension and integrated control.
- `ShareLink Pro` is wireless collaboration, not a pure matrix or extender.

Official sources:
- [Extron literature hub](https://www.extron.com/technology/literature.aspx?tabid=6&defaultLang=true)
- [Extron product pages](https://www.extron.com/)

## Blustream

- `IP200UHD`, `IP300UHD`, and `IP350UHD` are AVoIP distribution families.
- `WMF72` and `SW41AB-V2` are presentation / collaboration switchers.
- `UEX3C-KIT` is a USB extender.

Official sources:
- [Blustream products](https://www.blustream.co.uk/products)
- [Blustream US product pages](https://www.blustream-us.com/)

## Comparison Rule

When a product family is presentation-focused, collaboration-focused, or controller-focused, Wingman should not score it as a direct equivalent to a matrix switcher, extender, or AVoIP endpoint unless the topology, I/O, and transport layers also match.
