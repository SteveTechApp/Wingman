import * as React from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
  BackgroundVariant,
} from 'reactflow';
import { StructuredSystemDiagram, ManuallyAddedEquipment } from '../utils/types';

interface InteractiveDiagramProps {
  diagram: StructuredSystemDiagram | undefined;
  equipment: ManuallyAddedEquipment[];
  onEquipmentClick?: (equipment: ManuallyAddedEquipment) => void;
}

// Custom node styles based on equipment category
const getNodeStyle = (category: string | undefined) => {
  const baseStyle = {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '2px solid',
    fontSize: '12px',
    fontWeight: '600',
    minWidth: '150px',
    textAlign: 'center' as const,
  };

  switch (category?.toLowerCase()) {
    case 'matrix':
    case 'switcher':
      return { ...baseStyle, backgroundColor: '#00833D', borderColor: '#006630', color: '#fff' };
    case 'display':
    case 'monitor':
      return { ...baseStyle, backgroundColor: '#1e40af', borderColor: '#1e3a8a', color: '#fff' };
    case 'extender':
    case 'transmitter':
    case 'receiver':
      return { ...baseStyle, backgroundColor: '#7c3aed', borderColor: '#6d28d9', color: '#fff' };
    case 'camera':
      return { ...baseStyle, backgroundColor: '#0891b2', borderColor: '#0e7490', color: '#fff' };
    case 'microphone':
    case 'speaker':
    case 'audio':
      return { ...baseStyle, backgroundColor: '#ea580c', borderColor: '#c2410c', color: '#fff' };
    case 'control':
    case 'processor':
      return { ...baseStyle, backgroundColor: '#dc2626', borderColor: '#b91c1c', color: '#fff' };
    case 'source':
    case 'laptop':
    case 'pc':
      return { ...baseStyle, backgroundColor: '#64748b', borderColor: '#475569', color: '#fff' };
    default:
      return { ...baseStyle, backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', color: '#0f172a' };
  }
};

// Convert equipment to React Flow nodes
const createNodesFromEquipment = (equipment: ManuallyAddedEquipment[]): Node[] => {
  const nodes: Node[] = [];
  
  // Group equipment by category for better positioning
  const sources: ManuallyAddedEquipment[] = [];
  const switchers: ManuallyAddedEquipment[] = [];
  const extenders: ManuallyAddedEquipment[] = [];
  const displays: ManuallyAddedEquipment[] = [];
  const audio: ManuallyAddedEquipment[] = [];
  const control: ManuallyAddedEquipment[] = [];
  const other: ManuallyAddedEquipment[] = [];

  equipment.forEach(item => {
    const category = item.category?.toLowerCase() || '';
    if (category.includes('laptop') || category.includes('pc') || category.includes('source')) {
      sources.push(item);
    } else if (category.includes('matrix') || category.includes('switcher')) {
      switchers.push(item);
    } else if (category.includes('extender') || category.includes('transmitter') || category.includes('receiver')) {
      extenders.push(item);
    } else if (category.includes('display') || category.includes('monitor')) {
      displays.push(item);
    } else if (category.includes('audio') || category.includes('microphone') || category.includes('speaker')) {
      audio.push(item);
    } else if (category.includes('control') || category.includes('processor')) {
      control.push(item);
    } else {
      other.push(item);
    }
  });

  const yOffset = 50;
  const xSpacing = 250;

  // Position sources on the left
  sources.forEach((item, idx) => {
    nodes.push({
      id: item.id || `source-${idx}`,
      data: { label: `${item.name}\n(${item.sku})` },
      position: { x: 50, y: yOffset + idx * 100 },
      style: getNodeStyle(item.category),
    });
  });

  // Position switchers in the middle-left
  switchers.forEach((item, idx) => {
    nodes.push({
      id: item.id || `switcher-${idx}`,
      data: { label: `${item.name}\n(${item.sku})` },
      position: { x: 50 + xSpacing, y: yOffset + idx * 120 },
      style: getNodeStyle(item.category),
    });
  });

  // Position extenders in the middle
  extenders.forEach((item, idx) => {
    nodes.push({
      id: item.id || `extender-${idx}`,
      data: { label: `${item.name}\n(${item.sku})` },
      position: { x: 50 + xSpacing * 2, y: yOffset + idx * 100 },
      style: getNodeStyle(item.category),
    });
  });

  // Position displays on the right
  displays.forEach((item, idx) => {
    nodes.push({
      id: item.id || `display-${idx}`,
      data: { label: `${item.name}\n(${item.sku})` },
      position: { x: 50 + xSpacing * 3, y: yOffset + idx * 120 },
      style: getNodeStyle(item.category),
    });
  });

  // Position audio below
  const audioYStart = yOffset + Math.max(sources.length, switchers.length, displays.length) * 120 + 50;
  audio.forEach((item, idx) => {
    nodes.push({
      id: item.id || `audio-${idx}`,
      data: { label: `${item.name}\n(${item.sku})` },
      position: { x: 50 + xSpacing, y: audioYStart + idx * 100 },
      style: getNodeStyle(item.category),
    });
  });

  // Position control devices at the top
  control.forEach((item, idx) => {
    nodes.push({
      id: item.id || `control-${idx}`,
      data: { label: `${item.name}\n(${item.sku})` },
      position: { x: 50 + xSpacing * 1.5, y: 50 + idx * 100 },
      style: getNodeStyle(item.category),
    });
  });

  // Position other equipment
  other.forEach((item, idx) => {
    nodes.push({
      id: item.id || `other-${idx}`,
      data: { label: `${item.name}\n(${item.sku})` },
      position: { x: 50, y: audioYStart + 50 + idx * 100 },
      style: getNodeStyle(item.category),
    });
  });

  return nodes;
};

// Create edges based on typical AV signal flow
const createEdgesFromEquipment = (equipment: ManuallyAddedEquipment[]): Edge[] => {
  const edges: Edge[] = [];
  
  // Find sources, switchers, extenders, and displays
  const sources = equipment.filter(e => {
    const cat = e.category?.toLowerCase() || '';
    return cat.includes('laptop') || cat.includes('pc') || cat.includes('source');
  });
  
  const switchers = equipment.filter(e => {
    const cat = e.category?.toLowerCase() || '';
    return cat.includes('matrix') || cat.includes('switcher');
  });
  
  const extenders = equipment.filter(e => {
    const cat = e.category?.toLowerCase() || '';
    return cat.includes('extender') || cat.includes('transmitter') || cat.includes('receiver');
  });
  
  const displays = equipment.filter(e => {
    const cat = e.category?.toLowerCase() || '';
    return cat.includes('display') || cat.includes('monitor');
  });

  // Connect sources to switchers
  sources.forEach((source, idx) => {
    if (switchers.length > 0) {
      const targetSwitcher = switchers[idx % switchers.length];
      edges.push({
        id: `e-${source.id}-${targetSwitcher.id}`,
        source: source.id || `source-${idx}`,
        target: targetSwitcher.id || `switcher-${idx % switchers.length}`,
        animated: true,
        label: 'HDMI',
        style: { stroke: '#00833D', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#00833D' },
      });
    }
  });

  // Connect switchers to extenders or displays
  switchers.forEach((switcher, idx) => {
    if (extenders.length > 0) {
      const targetExtender = extenders[idx % extenders.length];
      edges.push({
        id: `e-${switcher.id}-${targetExtender.id}`,
        source: switcher.id || `switcher-${idx}`,
        target: targetExtender.id || `extender-${idx % extenders.length}`,
        animated: true,
        label: 'HDBaseT',
        style: { stroke: '#7c3aed', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#7c3aed' },
      });
    } else if (displays.length > 0) {
      const targetDisplay = displays[idx % displays.length];
      edges.push({
        id: `e-${switcher.id}-${targetDisplay.id}`,
        source: switcher.id || `switcher-${idx}`,
        target: targetDisplay.id || `display-${idx % displays.length}`,
        animated: true,
        label: 'HDMI',
        style: { stroke: '#1e40af', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#1e40af' },
      });
    }
  });

  // Connect extenders to displays
  extenders.forEach((extender, idx) => {
    if (displays.length > 0) {
      const targetDisplay = displays[idx % displays.length];
      edges.push({
        id: `e-${extender.id}-${targetDisplay.id}`,
        source: extender.id || `extender-${idx}`,
        target: targetDisplay.id || `display-${idx % displays.length}`,
        animated: true,
        label: 'HDMI',
        style: { stroke: '#1e40af', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#1e40af' },
      });
    }
  });

  return edges;
};

const InteractiveDiagram: React.FC<InteractiveDiagramProps> = ({ 
  diagram: _diagram,
  equipment,
  onEquipmentClick 
}) => {
  const initialNodes = React.useMemo(() => createNodesFromEquipment(equipment), [equipment]);
  const initialEdges = React.useMemo(() => createEdgesFromEquipment(equipment), [equipment]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = React.useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = React.useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const equipmentItem = equipment.find(e => e.id === node.id);
      if (equipmentItem && onEquipmentClick) {
        onEquipmentClick(equipmentItem);
      }
    },
    [equipment, onEquipmentClick]
  );

  if (equipment.length === 0) {
    return (
      <div className="h-full\ flex\ items-center\ justify-center\ bg-gray-50\ dark:bg-gray-800\ border\ border-border-color\ rounded-lg">
        <div className="text-center\ p-8">
          <div className="text-6xl\ mb-4">[]</div>
          <h3 className="text-xl\ font-bold\ mb-2">No Equipment Yet</h3>
          <p className="text-text-secondary">
            Add equipment to your room to see the system diagram
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full\ w-full\ bg-white\ dark:bg-gray-900\ border\ border-border-color\ rounded-lg\ overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            const style = node.style as any;
            return style?.backgroundColor || '#64748b';
          }}
          className="bg-gray-100\ dark:bg-gray-800\ border\ border-border-color"
        />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default InteractiveDiagram;

