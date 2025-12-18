import React, { useMemo } from 'react';
import { RoomData, ManuallyAddedEquipment } from '../utils/types';
import { 
  calculateCableRouting, 
  CableRoute,
  CableType 
} from '../utils/cableRouting';

interface CableRoutingVisualizationProps {
  room: RoomData;
  showLegend?: boolean;
  showLabels?: boolean;
}

// Cable colors by type
const CABLE_COLORS: Record<CableType, string> = {
  'hdmi': '#1e40af',
  'hdbaset': '#7c3aed',
  'cat6': '#059669',
  'usb': '#dc2626',
  'displayport': '#0891b2',
  'fiber': '#ea580c',
  'audio': '#f59e0b',
  'power': '#ef4444',
};

// Equipment position calculator (simplified)
const calculateEquipmentPositions = (
  equipment: ManuallyAddedEquipment[],
  roomWidth: number,
  roomDepth: number
): Map<string, { x: number; y: number }> => {
  const positions = new Map();
  
  // Group equipment by category for positioning
  const sources: ManuallyAddedEquipment[] = [];
  const switchers: ManuallyAddedEquipment[] = [];
  const displays: ManuallyAddedEquipment[] = [];
  const audio: ManuallyAddedEquipment[] = [];
  const other: ManuallyAddedEquipment[] = [];

  equipment.forEach(item => {
    const category = item.category?.toLowerCase() || '';
    if (category.includes('laptop') || category.includes('pc') || category.includes('source')) {
      sources.push(item);
    } else if (category.includes('matrix') || category.includes('switcher')) {
      switchers.push(item);
    } else if (category.includes('display') || category.includes('monitor')) {
      displays.push(item);
    } else if (category.includes('audio') || category.includes('microphone') || category.includes('speaker')) {
      audio.push(item);
    } else {
      other.push(item);
    }
  });

  const margin = 50;
  const spacing = 100;

  // Position sources on the left side
  sources.forEach((item, idx) => {
    positions.set(item.id, {
      x: margin,
      y: margin + idx * spacing,
    });
  });

  // Position switchers in the middle-back (rack area)
  switchers.forEach((item, idx) => {
    positions.set(item.id, {
      x: roomWidth / 2,
      y: roomDepth - margin - idx * 60,
    });
  });

  // Position displays at the front
  displays.forEach((item, idx) => {
    const totalDisplays = displays.length;
    const displaySpacing = (roomWidth - margin * 2) / (totalDisplays + 1);
    positions.set(item.id, {
      x: margin + displaySpacing * (idx + 1),
      y: margin,
    });
  });

  // Position audio on ceiling (represented as top area)
  audio.forEach((item, idx) => {
    positions.set(item.id, {
      x: roomWidth / 2 + (idx - audio.length / 2) * 80,
      y: roomDepth / 3,
    });
  });

  // Position other equipment
  other.forEach((item, idx) => {
    positions.set(item.id, {
      x: roomWidth - margin - idx * 80,
      y: roomDepth / 2,
    });
  });

  return positions;
};

// SVG path generator for cable routes
const generateCablePath = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  cableType: CableType
): string => {
  const midX = (start.x + end.x) / 2;
  const controlOffset = 50;

  // Different routing based on cable type
  if (cableType === 'hdbaset' || cableType === 'cat6') {
    // Structured cabling - more right angles
    return `M ${start.x},${start.y} 
            L ${start.x},${midX} 
            L ${end.x},${midX} 
            L ${end.x},${end.y}`;
  } else {
    // Flexible cables - smooth curves
    return `M ${start.x},${start.y} 
            C ${start.x},${start.y + controlOffset} 
              ${end.x},${end.y - controlOffset} 
              ${end.x},${end.y}`;
  }
};

const CableRoutingVisualization: React.FC<CableRoutingVisualizationProps> = ({
  room,
  showLegend = true,
  showLabels = true,
}) => {
  const roomWidth = room.wallWidth || 600;
  const roomDepth = room.wallDepth || 400;
  const viewBoxPadding = 100;
  
  const equipment = room.manuallyAddedEquipment || [];
  
  const equipmentPositions = useMemo(
    () => calculateEquipmentPositions(equipment, roomWidth, roomDepth),
    [equipment, roomWidth, roomDepth]
  );

  // Calculate cable routes
  const cableRoutes = useMemo(() => {
    const routes: Array<{
      from: ManuallyAddedEquipment;
      to: ManuallyAddedEquipment;
      cableType: CableType;
      distance: number;
    }> = [];

    // Simple routing logic: connect sources to switchers, switchers to displays
    const sources = equipment.filter(e => 
      e.category?.toLowerCase().includes('source') || 
      e.category?.toLowerCase().includes('laptop')
    );
    const switchers = equipment.filter(e => 
      e.category?.toLowerCase().includes('switcher') || 
      e.category?.toLowerCase().includes('matrix')
    );
    const displays = equipment.filter(e => 
      e.category?.toLowerCase().includes('display') || 
      e.category?.toLowerCase().includes('monitor')
    );

    // Connect sources to switchers with HDMI
    sources.forEach((source, idx) => {
      if (switchers.length > 0) {
        const targetSwitcher = switchers[idx % switchers.length];
        routes.push({
          from: source,
          to: targetSwitcher,
          cableType: 'hdmi',
          distance: 5, // meters
        });
      }
    });

    // Connect switchers to displays with HDBaseT
    switchers.forEach((switcher, idx) => {
      if (displays.length > 0) {
        const targetDisplay = displays[idx % displays.length];
        routes.push({
          from: switcher,
          to: targetDisplay,
          cableType: 'hdbaset',
          distance: 15, // meters
        });
      }
    });

    return routes;
  }, [equipment]);

  const cableTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    cableRoutes.forEach(route => {
      counts[route.cableType] = (counts[route.cableType] || 0) + 1;
    });
    return counts;
  }, [cableRoutes]);

  if (equipment.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 border border-border-color rounded-lg p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🔌</div>
          <h3 className="text-xl font-bold mb-2">No Equipment to Route</h3>
          <p className="text-text-secondary">
            Add equipment to see cable routing visualization
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-900 border border-border-color rounded-lg p-4">
        <svg
          viewBox={`0 0 ${roomWidth + viewBoxPadding * 2} ${roomDepth + viewBoxPadding * 2}`}
          className="w-full h-auto"
          style={{ minHeight: '400px' }}
        >
          {/* Room outline */}
          <rect
            x={viewBoxPadding}
            y={viewBoxPadding}
            width={roomWidth}
            height={roomDepth}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeDasharray="10,5"
          />

          {/* Room label */}
          <text
            x={viewBoxPadding + roomWidth / 2}
            y={viewBoxPadding - 20}
            textAnchor="middle"
            className="fill-text-primary font-semibold text-sm"
          >
            {room.roomName} ({roomWidth}cm × {roomDepth}cm)
          </text>

          {/* Cable routes */}
          {cableRoutes.map((route, idx) => {
            const startPos = equipmentPositions.get(route.from.id);
            const endPos = equipmentPositions.get(route.to.id);

            if (!startPos || !endPos) return null;

            const adjustedStart = {
              x: startPos.x + viewBoxPadding,
              y: startPos.y + viewBoxPadding,
            };
            const adjustedEnd = {
              x: endPos.x + viewBoxPadding,
              y: endPos.y + viewBoxPadding,
            };

            const pathD = generateCablePath(adjustedStart, adjustedEnd, route.cableType);
            const color = CABLE_COLORS[route.cableType] || '#64748b';

            return (
              <g key={idx}>
                <path
                  d={pathD}
                  stroke={color}
                  strokeWidth="3"
                  fill="none"
                  opacity="0.7"
                  strokeLinecap="round"
                />
                {showLabels && (
                  <text
                    x={(adjustedStart.x + adjustedEnd.x) / 2}
                    y={(adjustedStart.y + adjustedEnd.y) / 2}
                    textAnchor="middle"
                    className="text-xs fill-text-primary"
                    style={{ fontSize: '10px' }}
                  >
                    {route.cableType.toUpperCase()} ({route.distance}m)
                  </text>
                )}
              </g>
            );
          })}

          {/* Equipment nodes */}
          {equipment.map((item, idx) => {
            const pos = equipmentPositions.get(item.id);
            if (!pos) return null;

            const adjustedPos = {
              x: pos.x + viewBoxPadding,
              y: pos.y + viewBoxPadding,
            };

            const category = item.category?.toLowerCase() || '';
            let color = '#64748b';
            if (category.includes('display')) color = '#1e40af';
            else if (category.includes('switcher')) color = '#00833D';
            else if (category.includes('source')) color = '#94a3b8';

            return (
              <g key={idx}>
                <circle
                  cx={adjustedPos.x}
                  cy={adjustedPos.y}
                  r="20"
                  fill={color}
                  stroke="#fff"
                  strokeWidth="2"
                />
                {showLabels && (
                  <text
                    x={adjustedPos.x}
                    y={adjustedPos.y + 35}
                    textAnchor="middle"
                    className="text-xs fill-text-primary font-semibold"
                    style={{ fontSize: '10px' }}
                  >
                    {item.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="bg-background-secondary border border-border-color rounded-lg p-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide mb-3">Cable Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(cableTypeCounts).map(([type, count]) => (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: CABLE_COLORS[type as CableType] }}
                />
                <span className="text-sm">
                  {type.toUpperCase()} ({count})
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border-color">
            <h4 className="font-semibold text-sm mb-2">Equipment Types</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#00833D]" />
                <span>Switchers</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#1e40af]" />
                <span>Displays</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#94a3b8]" />
                <span>Sources</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cable Schedule */}
      <div className="bg-background-secondary border border-border-color rounded-lg p-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide mb-3">Cable Schedule</h3>
        <div className="space-y-2">
          {cableRoutes.map((route, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 bg-background border border-border-color rounded text-sm"
            >
              <div className="flex items-center gap-2 flex-1">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: CABLE_COLORS[route.cableType] }}
                />
                <span className="font-mono text-xs">C{idx + 1}</span>
                <span>→</span>
                <span className="truncate">{route.from.name}</span>
                <span>→</span>
                <span className="truncate">{route.to.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-text-secondary">
                <span className="font-semibold">{route.cableType.toUpperCase()}</span>
                <span>{route.distance}m</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CableRoutingVisualization;
