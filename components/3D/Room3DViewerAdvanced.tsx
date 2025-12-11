import React, { Suspense, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Box, Text, PerspectiveCamera, Environment, Line } from '@react-three/drei';
import { RoomData, ManuallyAddedEquipment } from '../../utils/types';
import * as THREE from 'three';
import {
  EquipmentPosition,
  CableRoute,
  calculateCableDistance,
  calculateRoomCableRoutes,
  calculateTotalCableCosts,
  getCableSpecs,
  analyzeTechnologyRequirements,
  compareTechnologyCosts
} from '../../utils/cableRouting';

interface Room3DViewerAdvancedProps {
  room: RoomData;
  onEquipmentClick?: (equipment: ManuallyAddedEquipment) => void;
  onEquipmentPositionChange?: (equipment: ManuallyAddedEquipment, position: EquipmentPosition) => void;
  showCableRoutes?: boolean;
  enableDragDrop?: boolean;
  contentType?: 'presentation' | 'video-conference' | 'digital-signage' | 'broadcast' | 'training';
}

// Draggable Equipment Component
const DraggableEquipment: React.FC<{
  equipment: ManuallyAddedEquipment;
  position: [number, number, number];
  onClick?: () => void;
  onDragEnd?: (newPosition: [number, number, number]) => void;
  isDraggable?: boolean;
  isSelected?: boolean;
}> = ({ equipment, position, onClick, onDragEnd, isDraggable = false, isSelected = false }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset] = useState(new THREE.Vector3());

  useFrame(() => {
    if (meshRef.current && (hovered || isSelected) && !isDragging) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  const getEquipmentProps = () => {
    const category = equipment.category?.toLowerCase() || '';

    if (category.includes('display') || category.includes('monitor')) {
      return { size: [0.8, 0.5, 0.1] as [number, number, number], color: '#1e293b', icon: '🖥️' };
    } else if (category.includes('speaker') || category.includes('audio')) {
      return { size: [0.3, 0.3, 0.3] as [number, number, number], color: '#0f172a', icon: '🔊' };
    } else if (category.includes('camera')) {
      return { size: [0.2, 0.2, 0.15] as [number, number, number], color: '#334155', icon: '📹' };
    } else if (category.includes('matrix') || category.includes('switcher')) {
      return { size: [0.4, 0.2, 0.3] as [number, number, number], color: '#475569', icon: '🔀' };
    } else if (category.includes('source') || category.includes('player')) {
      return { size: [0.35, 0.15, 0.25] as [number, number, number], color: '#581c87', icon: '📀' };
    } else {
      return { size: [0.3, 0.3, 0.3] as [number, number, number], color: '#64748b', icon: '📦' };
    }
  };

  const { size, color, icon } = getEquipmentProps();

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!isDraggable) return;
    event.stopPropagation();
    setIsDragging(true);
    const intersectPoint = event.point;
    dragOffset.copy(intersectPoint).sub(new THREE.Vector3(...position));
  };

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !isDraggable || !meshRef.current) return;
    event.stopPropagation();

    // Update position based on drag
    const newPos = event.point.clone().sub(dragOffset);
    meshRef.current.position.set(newPos.x, position[1], newPos.z); // Keep Y fixed
  };

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    event.stopPropagation();
    setIsDragging(false);

    if (meshRef.current && onDragEnd) {
      const finalPos = meshRef.current.position;
      onDragEnd([finalPos.x, finalPos.y, finalPos.z]);
    }
  };

  return (
    <group position={position}>
      <Box
        ref={meshRef}
        args={size}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <meshStandardMaterial
          color={isSelected ? '#00833D' : hovered ? '#10b981' : color}
          metalness={0.5}
          roughness={0.5}
          emissive={isDragging ? '#00833D' : '#000000'}
          emissiveIntensity={isDragging ? 0.3 : 0}
        />
      </Box>

      {/* Equipment label */}
      {(hovered || isSelected || isDragging) && (
        <Text
          position={[0, size[1] / 2 + 0.4, 0]}
          fontSize={0.15}
          color="#00833D"
          anchorX="center"
          anchorY="bottom"
        >
          {`${icon} ${equipment.name}`}
        </Text>
      )}

      {/* Draggable indicator */}
      {isDraggable && hovered && (
        <Text
          position={[0, size[1] / 2 + 0.6, 0]}
          fontSize={0.1}
          color="#64748b"
          anchorX="center"
          anchorY="bottom"
        >
          Click & drag to move
        </Text>
      )}
    </group>
  );
};

// Cable Route Visualization
const CableRouteVisualization: React.FC<{
  routes: CableRoute[];
}> = ({ routes }) => {
  return (
    <>
      {routes.map((route, index) => {
        const fromPos = [route.from.x, route.from.y, route.from.z];
        const toPos = [route.to.x, route.to.y, route.to.z];

        // Determine cable color based on type
        const getCableColor = () => {
          if (route.cableType.includes('HDMI')) return '#ef4444'; // Red
          if (route.cableType.includes('HDBaseT') || route.cableType.includes('Cat')) return '#3b82f6'; // Blue
          if (route.cableType.includes('Fiber')) return '#22c55e'; // Green
          if (route.cableType.includes('Speaker')) return '#f59e0b'; // Orange
          return '#6b7280'; // Gray
        };

        const cableColor = getCableColor();

        return (
          <group key={`cable-${index}`}>
            {/* Cable line */}
            <Line
              points={[fromPos, toPos]}
              color={cableColor}
              lineWidth={2}
              dashed={false}
            />

            {/* Distance label at midpoint */}
            <Text
              position={[
                (fromPos[0] + toPos[0]) / 2,
                (fromPos[1] + toPos[1]) / 2 + 0.3,
                (fromPos[2] + toPos[2]) / 2
              ]}
              fontSize={0.12}
              color={cableColor}
              anchorX="center"
              anchorY="middle"
            >
              {`${route.distance}m\n${route.cableType}\n$${route.estimatedCost}`}
            </Text>
          </group>
        );
      })}
    </>
  );
};

// Room walls and floor
const RoomStructure: React.FC<{ dimensions: { length: number; width: number; height: number } }> = ({
  dimensions,
}) => {
  const { length, width, height } = dimensions;

  return (
    <group>
      {/* Floor */}
      <Box args={[length, 0.1, width]} position={[0, -0.05, 0]}>
        <meshStandardMaterial color="#f1f5f9" />
      </Box>

      {/* Walls - transparent */}
      <Box args={[0.1, height, width]} position={[-length / 2, height / 2, 0]}>
        <meshStandardMaterial color="#cbd5e1" transparent opacity={0.3} />
      </Box>
      <Box args={[0.1, height, width]} position={[length / 2, height / 2, 0]}>
        <meshStandardMaterial color="#cbd5e1" transparent opacity={0.3} />
      </Box>
      <Box args={[length, height, 0.1]} position={[0, height / 2, -width / 2]}>
        <meshStandardMaterial color="#cbd5e1" transparent opacity={0.3} />
      </Box>
      <Box args={[length, height, 0.1]} position={[0, height / 2, width / 2]}>
        <meshStandardMaterial color="#cbd5e1" transparent opacity={0.3} />
      </Box>

      {/* Ceiling - very transparent */}
      <Box args={[length, 0.1, width]} position={[0, height, 0]}>
        <meshStandardMaterial color="#e2e8f0" transparent opacity={0.1} />
      </Box>
    </group>
  );
};

const Room3DViewerAdvanced: React.FC<Room3DViewerAdvancedProps> = ({
  room,
  onEquipmentClick,
  onEquipmentPositionChange,
  showCableRoutes = true,
  enableDragDrop = true,
  contentType = 'presentation'
}) => {
  const length = room.technicalDetails?.dimensions?.length || 10;
  const width = room.technicalDetails?.dimensions?.width || 8;
  const height = room.technicalDetails?.dimensions?.height || 3;

  // Initialize equipment positions (load from room data or auto-place)
  const [equipmentPositions, setEquipmentPositions] = useState<EquipmentPosition[]>(() => {
    const equipment = room.manuallyAddedEquipment || [];

    // Try to load saved positions or auto-place
    return equipment.map((eq, index) => {
      // Check if equipment has saved position
      const savedPos = (eq as any).position3D as EquipmentPosition | undefined;
      if (savedPos) {
        return { ...savedPos, equipment: eq };
      }

      // Auto-place in grid
      const gridCols = Math.ceil(Math.sqrt(equipment.length));
      const spacing = Math.min(length, width) / (gridCols + 1);
      const row = Math.floor(index / gridCols);
      const col = index % gridCols;

      const x = (col - gridCols / 2 + 0.5) * spacing;
      const z = (row - gridCols / 2 + 0.5) * spacing;
      const y = 0.5;

      // Determine mount type based on category
      let mountType: EquipmentPosition['mountType'] = 'floor';
      const category = eq.category?.toLowerCase() || '';
      if (category.includes('speaker')) mountType = 'ceiling';
      else if (category.includes('display')) mountType = 'wall';
      else if (category.includes('camera')) mountType = 'ceiling';
      else if (category.includes('matrix') || category.includes('switcher')) mountType = 'rack';

      return { equipment: eq, x, y, z, mountType };
    });
  });

  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [cableRoutes, setCableRoutes] = useState<CableRoute[]>([]);

  // Calculate cable routes
  const updateCableRoutes = useCallback(() => {
    if (!showCableRoutes || equipmentPositions.length === 0) return;

    const routes = calculateRoomCableRoutes(
      equipmentPositions,
      room.roomType || 'Conference',
      contentType
    );

    setCableRoutes(routes);
  }, [equipmentPositions, room.roomType, contentType, showCableRoutes]);

  // Update routes when positions change
  React.useEffect(() => {
    updateCableRoutes();
  }, [updateCableRoutes]);

  const handleEquipmentDragEnd = (equipment: ManuallyAddedEquipment, newPosition: [number, number, number]) => {
    setEquipmentPositions(prev => {
      const updated = prev.map(pos => {
        if (pos.equipment.sku === equipment.sku) {
          const newPos = { ...pos, x: newPosition[0], y: newPosition[1], z: newPosition[2] };
          onEquipmentPositionChange?.(equipment, newPos);
          return newPos;
        }
        return pos;
      });
      return updated;
    });
  };

  const handleEquipmentClick = (equipment: ManuallyAddedEquipment) => {
    setSelectedEquipment(equipment.sku);
    onEquipmentClick?.(equipment);
  };

  // Calculate total costs
  const cableCosts = calculateTotalCableCosts(cableRoutes);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 relative">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[length * 0.8, height * 1.5, width * 0.8]} />

          <Suspense fallback={null}>
            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
            <pointLight position={[0, height, 0]} intensity={0.5} />

            {/* Environment */}
            <Environment preset="city" />

            {/* Room structure */}
            <RoomStructure dimensions={{ length, width, height }} />

            {/* Equipment */}
            {equipmentPositions.map((pos, index) => (
              <DraggableEquipment
                key={`${pos.equipment.sku}-${index}`}
                equipment={pos.equipment}
                position={[pos.x, pos.y, pos.z]}
                onClick={() => handleEquipmentClick(pos.equipment)}
                onDragEnd={(newPos) => handleEquipmentDragEnd(pos.equipment, newPos)}
                isDraggable={enableDragDrop}
                isSelected={selectedEquipment === pos.equipment.sku}
              />
            ))}

            {/* Cable routes */}
            {showCableRoutes && <CableRouteVisualization routes={cableRoutes} />}

            {/* Grid for reference */}
            <Grid
              args={[length, width]}
              cellSize={1}
              cellThickness={0.5}
              cellColor="#cbd5e1"
              sectionSize={5}
              sectionThickness={1}
              sectionColor="#94a3b8"
              fadeDistance={30}
              fadeStrength={1}
              followCamera={false}
              position={[0, 0.01, 0]}
            />

            {/* Controls */}
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={5}
              maxDistance={length * 2}
              maxPolarAngle={Math.PI / 2}
            />
          </Suspense>
        </Canvas>

        {/* Instructions overlay */}
        <div className="absolute bottom-4 left-4 bg-background border border-border-color rounded-lg p-3 text-sm text-text-secondary shadow-lg max-w-xs">
          <p className="font-bold text-text-primary mb-2">Controls:</p>
          <p>🖱️ Left click + drag: Rotate view</p>
          <p>🖱️ Right click + drag: Pan view</p>
          <p>🖱️ Scroll: Zoom in/out</p>
          {enableDragDrop && <p>📦 Click & drag equipment to reposition</p>}
          <p>💡 Hover over equipment for details</p>
        </div>

        {/* Cable costs summary */}
        {showCableRoutes && cableRoutes.length > 0 && (
          <div className="absolute top-4 right-4 bg-background border border-border-color rounded-lg p-4 text-sm shadow-lg max-w-md">
            <h3 className="font-bold text-text-primary mb-2">Cable Analysis</h3>
            <div className="space-y-1 text-text-secondary">
              <p>Total Distance: <strong className="text-accent">{cableCosts.totalDistance}m</strong></p>
              <p>Total Cost: <strong className="text-accent">${cableCosts.totalCost}</strong></p>
              <p className="text-xs mt-2 border-t border-border-color pt-2">
                {Object.entries(cableCosts.breakdown).map(([type, data]) => (
                  <span key={type} className="block">
                    {type}: {data.distance.toFixed(1)}m × {data.count} = ${data.cost.toFixed(0)}
                  </span>
                ))}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Room3DViewerAdvanced;
