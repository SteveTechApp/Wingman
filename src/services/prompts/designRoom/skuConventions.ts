
export const getSKUNamingConventions = (): string => `
## SKU NAMING CONVENTIONS & PRODUCT CAPABILITIES

### SKU Suffix Meanings (CRITICAL - NEVER MISINTERPRET)

1. **-W Suffix = Wireless Capability**
   - Products ending in -W support native wireless casting (AirPlay/Miracast)
   - Compatible with APO-DG2 wireless BYOM dongle for USB peripheral access
   - Examples: SW-620-TX-W, SW-640L-TX-W, SW-220-TX-W
   - Do NOT assume wireless capability without -W suffix

2. **-NDI Suffix = NDI Protocol Support**
   - Only products with -NDI in SKU support NDI protocol
   - CAM-210-PTZ does NOT support NDI (no -NDI in SKU)
   - If NDI is required, must select camera with -NDI suffix
   - Examples: [Add NDI cameras when available]

3. **-IW Suffix = In-Wall Mounting**
   - Products ending in -IW are designed for in-wall installation
   - Default mounting: US J-box compatible
   - If SKU contains both -IW and -UK: UK MK back box compatible
   - Examples: [In-wall switches/controllers]

4. **Network Protocol Indicators**
   - NHD- prefix: NetworkHD AVoIP products
   - -DNT suffix: Dante audio integration
   - -AVB suffix: AVB audio protocol

### Product Selection Rules Based on SKU

**RULE 1: Wireless Requirements**
- User requests wireless casting ? MUST use -W suffix product
- APO-DG2 dongles ? ONLY work with -W suffix products
- No -W suffix ? No native wireless capability

**RULE 2: Camera Protocol Accuracy**
- User requests NDI ? MUST have -NDI in camera SKU
- CAM-210-PTZ = USB 3.0 only (NO NDI)
- Never claim NDI support without -NDI in SKU

**RULE 3: Mounting Considerations**
- In-wall required ? Use -IW suffix products
- UK installation ? Verify -UK suffix for back box compatibility
- Table/rack mount ? Standard products (no -IW)

### Common Misinterpretation Errors to AVOID

? **WRONG**: "CAM-210-PTZ supports NDI"
? **CORRECT**: "CAM-210-PTZ is USB 3.0 only, no NDI support"

? **WRONG**: "SW-510-TX has wireless casting"
? **CORRECT**: "SW-510-TX is wired only, use SW-620-TX-W for wireless"

? **WRONG**: "Any product works with APO-DG2"
? **CORRECT**: "APO-DG2 only works with -W suffix products"
`;



