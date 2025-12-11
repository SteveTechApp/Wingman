# 🏗️ Hybrid Infrastructure Strategy Guide

## Overview

Real-world AV installations often use a **hybrid approach** combining both **local equipment racks** (in-room) and **centralized infrastructure** (server room/equipment closets). This guide explains how the WyreStorm Wingman system now supports this realistic deployment model.

---

## 🎯 Why Hybrid Infrastructure?

### Traditional Approach (Single Strategy)
- ❌ **In-Room Only**: Everything in the room rack → Hard to share sources, difficult to manage many rooms
- ❌ **Centralized Only**: Everything in server room → Long cable runs, can't support room-specific needs efficiently

### Modern Hybrid Approach
- ✅ **Best of Both Worlds**: Room-specific equipment locally, shared resources centrally
- ✅ **Flexibility**: Adapt to building constraints and budget
- ✅ **Scalability**: Easy to add rooms and share resources
- ✅ **Maintainability**: Centralized equipment easier to service

---

## 📐 Updated Infrastructure Model

### New Type Definition

```typescript
export interface ProjectInfrastructure {
    useDedicatedNetwork: boolean;
    enableTouchAppPreview: boolean;
    cablingByOthers: boolean;
    buildingType: 'single_floor' | 'multi_floor' | 'campus';
    floorCount: number;

    // Enhanced rack strategy
    rackStrategy: 'in_room' | 'distributed_closet' | 'central_server_room' | 'hybrid';

    // Hybrid configuration (NEW)
    hasLocalRacks: boolean;                    // Credenza, lectern, under-desk
    hasCentralizedInfrastructure: boolean;     // Server room, equipment closets

    centralizedEquipment?: (
        'sources' |
        'matrices' |
        'processors' |
        'network_switches' |
        'avoip_encoders' |
        'avoip_decoders'
    )[];

    localEquipmentTypes?: (
        'sources' |
        'small_matrices' |
        'room_controllers' |
        'codecs' |
        'amplifiers'
    )[];
}
```

---

## 🏢 Common Hybrid Scenarios

### Scenario 1: Corporate Conference Rooms

**Local Equipment (In Credenza/Lectern)**:
- Video conferencing codec (Teams Rooms, Zoom Rooms)
- Room controller / touch panel
- Small presentation switcher (3-5 HDMI inputs)
- Audio amplifier for local speakers
- USB hub for peripherals

**Centralized Equipment (Server Room)**:
- Large matrix switcher (16x16 or larger)
- Centralized sources:
  - Media servers
  - Digital signage players
  - Streaming encoders
- AVoIP distribution infrastructure
- Network switches with PoE
- Backup/recording equipment

**Connection**:
- AVoIP encoders in rooms connect to centralized network switches
- Matrix switcher can route any centralized source to any room
- Each room retains local control and sources

---

### Scenario 2: University Lecture Halls

**Local Equipment (Lectern)**:
- Lectern switcher with wall plate inputs
- Room PC for presentations
- Document camera
- Local microphone amplifier
- Touch panel control

**Centralized Equipment (Equipment Closet per Floor)**:
- Distribution amplifiers for campus-wide signals
- Lecture capture encoders
- Centralized scheduling/control system
- Network infrastructure

**Connection**:
- HDBaseT from lectern to equipment closet
- Fiber backbone between floors
- Dante audio network for campus paging

---

### Scenario 3: Retail Digital Signage

**Local Equipment (Per Store/Zone)**:
- Small media player (Brightsign, etc.)
- Local network switch
- Zone-specific displays

**Centralized Equipment (Corporate HQ)**:
- Content management system
- Playout servers
- Network management
- Remote monitoring

**Connection**:
- Internet/WAN connection
- Cloud-based content delivery
- VPN for management traffic

---

## 🔧 Design Logic for Hybrid Installations

### When to Use Local Racks

**Use local equipment racks when**:
1. **Interactive Devices**: Codecs, video conferencing, touch panels
2. **Room-Specific Sources**: Room PC, local media player
3. **Immediate Control**: Room controller needs to be physically close
4. **Latency-Sensitive**: Audio DSP, echo cancellation
5. **Serviceability**: Equipment needs regular access by room users

**Physical Mounting Options**:
- Credenza furniture (built-in AV cabinet)
- Lectern with equipment bay
- Under-desk/under-table cabinet
- Small 6U-12U wall-mounted rack
- Equipment shelf behind display

---

### When to Use Centralized Infrastructure

**Use centralized equipment when**:
1. **Shared Resources**: Matrix switchers, centralized sources
2. **Distribution**: AVoIP infrastructure, network switches
3. **Security**: Protect expensive equipment from theft/damage
4. **Cooling**: Equipment generates significant heat
5. **Serviceability**: Easier for IT/AV team to access
6. **Scalability**: Adding rooms doesn't require new infrastructure

**Physical Mounting Options**:
- Central server room (whole building)
- Equipment closets (per floor/wing)
- Distributed IDF closets
- Secure AV equipment rooms

---

## 📡 Connectivity Between Local and Central

### Option 1: AVoIP (Recommended for Modern Installations)

**Equipment**:
- Local: AVoIP encoder (e.g., NHD-500-TX)
- Central: AVoIP decoder (e.g., NHD-500-RX) + Matrix/Switch
- Network: Managed switch with IGMP snooping

**Advantages**:
- ✅ Scalable to many rooms
- ✅ Long distance (up to 100m per Cat6 segment)
- ✅ Low latency (<1 frame)
- ✅ Flexible routing via network
- ✅ PoE can power devices

**Use Cases**:
- Multi-room installations
- Campus environments
- Digital signage networks
- Collaborative workspaces

---

### Option 2: HDBaseT Long-Range

**Equipment**:
- Local: HDBaseT transmitter (e.g., EX-100-H2)
- Central: HDBaseT receiver + Matrix input
- Cable: Single Cat6a up to 100m

**Advantages**:
- ✅ Point-to-point reliability
- ✅ Includes USB, control, power
- ✅ No network infrastructure needed
- ✅ Simple troubleshooting

**Use Cases**:
- Small number of rooms
- Budget-conscious projects
- Existing Cat6 infrastructure

---

### Option 3: Fiber Optic

**Equipment**:
- Fiber extenders (e.g., NHD-600-TRX with fiber modules)
- Multimode or singlemode fiber

**Advantages**:
- ✅ Very long distance (300m+ multimode, kilometers singlemode)
- ✅ Immune to EMI
- ✅ Secure (hard to tap)
- ✅ High bandwidth (10Gb+)

**Use Cases**:
- Campus environments
- Long building runs
- High-security installations
- Future-proof infrastructure

---

## 🎬 Example Hybrid System Design

### Conference Room Configuration

**Room**: 25-person conference room, 75" dual displays, video conferencing

#### Local Equipment (Credenza Rack - 6U)
```
1U: Touch panel controller (e.g., CP-200)
1U: Video conferencing codec (Teams Rooms MTR)
2U: Small presentation switcher (SW-220-TX-W - 2 HDMI inputs)
1U: Audio amplifier for ceiling speakers
1U: Power distribution, patch panel
```

**Connections**:
- Laptop inputs → Switcher (HDMI at table)
- Codec → Switcher (HDMI)
- Switcher output → AVoIP Encoder (NHD-500-TX)
- Encoder → Network switch (Cat6)

#### Central Equipment (Server Room)
```
4U: 16x16 Matrix Switcher (MX-1616-H3 or AVoIP-based)
2U: Network switches (managed, PoE+)
1U: Centralized sources (media server, signage player)
2U: AVoIP encoders/decoders
1U: Backup recorder
```

**Centralized Sources Available to All Rooms**:
- Corporate signage feed
- Streaming encoder (live events)
- Backup presentation PC
- Cable TV / IPTV feeds

#### Benefits of This Design

1. **Local Autonomy**: Room works independently with local sources and codec
2. **Centralized Flexibility**: Any room can access corporate sources via network
3. **Scalability**: Add rooms by adding AVoIP endpoints
4. **Cost Efficiency**: Share expensive equipment (matrix, sources) across many rooms
5. **Management**: Centralized equipment easy for IT to monitor and maintain

---

## 💡 Best Practices

### 1. Network Segmentation
```
VLAN 10: Management (control systems, switches)
VLAN 20: AV Video (AVoIP streams)
VLAN 30: AV Control (control signals, feedback)
VLAN 40: Internet/WAN (guest devices)
```

### 2. Power Management
- **Local**: Use UPS for codec and critical equipment
- **Central**: Centralized UPS for entire AV infrastructure
- **PoE**: Use PoE switches to power AVoIP devices (reduces local power needs)

### 3. Cable Management
- **Local to Central**: Use structured cabling with proper documentation
- **Label Everything**: Source → Destination on both ends
- **Service Loops**: Extra cable at both ends for future changes

### 4. Remote Management
- **Local**: Network-enabled for remote reboot, firmware updates
- **Central**: Full remote access for troubleshooting
- **Monitoring**: SNMP, API integration for proactive alerts

---

## 🚀 Migration Path

### Phase 1: Start Local
- Install in-room equipment (codecs, controllers, displays)
- Use local sources only
- Standalone room functionality

### Phase 2: Add Centralization
- Install central server room equipment
- Connect rooms via AVoIP or fiber
- Enable resource sharing

### Phase 3: Expand
- Add more rooms using centralized resources
- Scale network infrastructure
- Add advanced features (recording, streaming, room combining)

---

## 📋 Checklist for Hybrid Design

**Planning Phase**:
- [ ] Identify which equipment needs to be in-room vs centralized
- [ ] Calculate distances between rooms and central location
- [ ] Determine network infrastructure (existing vs new)
- [ ] Budget for both local and central equipment
- [ ] Plan for power (local UPS, central UPS, PoE)

**Local Equipment**:
- [ ] Size rack appropriately (6U-12U typical)
- [ ] Ensure proper ventilation (fanless preferred in rooms)
- [ ] Plan for user access (lectern, credenza)
- [ ] Include local sources (HDMI wall plates, table boxes)
- [ ] Add room controller for user interface

**Central Equipment**:
- [ ] Size rack for initial + future expansion
- [ ] Plan cooling (HVAC, rack fans)
- [ ] Secure access (locked room, authorized personnel only)
- [ ] Network infrastructure (switches, fiber, Cat6)
- [ ] Power infrastructure (dedicated circuits, UPS)

**Connectivity**:
- [ ] Choose transport method (AVoIP, HDBaseT, Fiber)
- [ ] Install structured cabling (Cat6a minimum)
- [ ] Configure network (VLANs, QoS, IGMP)
- [ ] Test bandwidth and latency
- [ ] Document all connections

---

## 🎓 Training & Documentation

### For End Users
- How to use local sources (HDMI, wireless presentation)
- How to access centralized sources (via touch panel)
- Basic troubleshooting (check network, reboot)

### For AV/IT Staff
- Local equipment access and service
- Central equipment management
- Network troubleshooting
- Adding/removing rooms
- Firmware updates and maintenance

---

## 📊 Cost Comparison

### All Local (10 Conference Rooms)
| Item | Quantity | Unit Cost | Total |
|------|----------|-----------|-------|
| Matrix Switcher (per room) | 10 | $2,000 | $20,000 |
| Sources (per room) | 10 sets | $1,500 | $15,000 |
| **Total** | | | **$35,000** |

### Hybrid Approach (10 Conference Rooms)
| Item | Quantity | Unit Cost | Total |
|------|----------|-----------|-------|
| Central Matrix (shared) | 1 | $8,000 | $8,000 |
| Central Sources (shared) | 1 set | $3,000 | $3,000 |
| AVoIP Encoders (per room) | 10 | $800 | $8,000 |
| Network Infrastructure | 1 | $5,000 | $5,000 |
| Local Equipment (per room) | 10 | $1,000 | $10,000 |
| **Total** | | | **$34,000** |

**Savings**: $1,000 + easier management + better scalability

---

## 🎯 Conclusion

The hybrid infrastructure model provides:
- ✅ **Flexibility**: Adapt to specific room and building needs
- ✅ **Scalability**: Easy to add rooms and features
- ✅ **Cost Efficiency**: Share expensive equipment
- ✅ **Reliability**: Local autonomy with centralized resources
- ✅ **Manageability**: Easier to service and monitor

**WyreStorm Wingman now fully supports hybrid designs**, allowing you to specify:
- Which equipment stays in-room
- Which equipment is centralized
- How they connect (AVoIP, HDBaseT, Fiber)
- Network architecture and VLANs

This matches real-world installation practices and provides the most flexible, scalable solution for modern AV deployments.

---

**Questions? Check CABLE_ROUTING_GUIDE.md for cable distance calculations and HIGH_IMPACT_FEATURES.md for 3D room visualization.**
