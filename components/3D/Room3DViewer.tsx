import React, { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Box, Text, PerspectiveCamera, Environment } from '@react-three/drei';
import { RoomData, ManuallyAddedEquipment } from '../../utils/types';
import * as THREE from 'three';

interface Room3DViewerProps {
  room: RoomData;
  onEquipmentClick?: (equipment: ManuallyAddedEquipment) => void;
}

// Equipment placement component
const Equipment: React.FC<{
  equipment: ManuallyAddedEquipment;
  position: [number, number, number];
  onClick?: () => void;
}> = ({ equipment, position, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current && hovered) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  // Determine equipment size and color based on category
  const getEquipmentProps = () => {
    const category = equipment.category?.toLowerCase() || '';

    if (category.includes('display') || category.includes('monitor')) {
      return { size: [0.8, 0.5, 0.1] as [number, number, number], color: '#1e293b' };
    } else if (category.includes('speaker') || category.includes('audio')) {
      return { size: [0.3, 0.3, 0.3] as [number, number, number], color: '#0f172a' };
    } else if (category.includes('camera')) {
      return { size: [0.2, 0.2, 0.15] as [number, number, number], color: '#334155' };
    } else if (category.includes('matrix') || category.includes('switcher')) {
      return { size: [0.4, 0.2, 0.3] as [number, number, number], color: '#475569' };
    } else {
      return { size: [0.3, 0.3, 0.3] as [number, number, number], color: '#64748b' };
    }
  };

  const { size, color } = getEquipmentProps();

  return (
    <group position={position}>
      <Box
        ref={meshRef}
        args={size}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={hovered ? '#00833D' : color}
          metalness={0.5}
          roughness={0.5}
        />
      </Box>
      {hovered && (
        <Text
          position={[0, size[1] / 2 + 0.3, 0]}
          fontSize={0.15}
          color="#00833D"
          anchorX="center"
          anchorY="middle"
        >
          {equipment.name}
        </Text>
      )}
    </group>
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

const Room3DViewer: React.FC<Room3DViewerProps> = ({ room, onEquipmentClick }) => {
  // Get room dimensions (convert to meters if needed, default to reasonable size)
  const length = room.technicalDetails?.dimensions?.length || 10;
  const width = room.technicalDetails?.dimensions?.width || 8;
  const height = room.technicalDetails?.dimensions?.height || 3;

  // Auto-place equipment in a grid layout
  const getEquipmentPositions = (): Array<[number, number, number]> => {
    const equipment = room.manuallyAddedEquipment || [];
    const positions: Array<[number, number, number]> = [];

    const gridCols = Math.ceil(Math.sqrt(equipment.length));
    const spacing = Math.min(length, width) / (gridCols + 1);

    equipment.forEach((_, index) => {
      const row = Math.floor(index / gridCols);
      const col = index % gridCols;

      const x = (col - gridCols / 2 + 0.5) * spacing;
      const z = (row - gridCols / 2 + 0.5) * spacing;
      const y = 0.5; // Slightly above floor

      positions.push([x, y, z]);
    });

    return positions;
  };

  const equipmentPositions = getEquipmentPositions();

  return (
    <div className="w-full h-[600px] bg-background-secondary rounded-lg overflow-hidden border border-border-color">
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
          {room.manuallyAddedEquipment?.map((equipment, index) => (
            <Equipment
              key={`${equipment.sku}-${index}`}
              equipment={equipment}
              position={equipmentPositions[index]}
              onClick={() => onEquipmentClick?.(equipment)}
            />
          ))}

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
      <div className="absolute bottom-4 left-4 bg-background border border-border-color rounded-lg p-3 text-sm text-text-secondary shadow-lg">
        <p><strong>Controls:</strong></p>
        <p>🖱️ Left click + drag: Rotate</p>
        <p>🖱️ Right click + drag: Pan</p>
        <p>🖱️ Scroll: Zoom</p>
        <p>💡 Hover over equipment to see details</p>
      </div>
    </div>
  );
};

export default Room3DViewer;
