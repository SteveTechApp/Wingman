import React, { useRef, useEffect, useState } from 'react';
import { Dimensions } from '../../utils/types';

interface PlannerCanvasProps {
    dimensions: Dimensions;
    equipment?: Array<{
        id: string;
        name: string;
        x: number;
        y: number;
        width: number;
        height: number;
    }>;
    onEquipmentMove?: (id: string, x: number, y: number) => void;
}

const PlannerCanvas: React.FC<PlannerCanvasProps> = ({ 
    dimensions, 
    equipment = [],
    onEquipmentMove 
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [scale, setScale] = useState(20); // pixels per meter
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Calculate scale to fit room in canvas
        const padding = 40;
        const scaleX = (canvas.width - padding * 2) / dimensions.length;
        const scaleY = (canvas.height - padding * 2) / dimensions.width;
        const calculatedScale = Math.min(scaleX, scaleY);
        setScale(calculatedScale);

        // Draw room outline
        ctx.strokeStyle = '#4B5563';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            padding,
            padding,
            dimensions.length * calculatedScale,
            dimensions.width * calculatedScale
        );

        // Draw grid
        ctx.strokeStyle = '#E5E7EB';
        ctx.lineWidth = 1;
        
        // Vertical lines (every meter)
        for (let i = 1; i < dimensions.length; i++) {
            ctx.beginPath();
            ctx.moveTo(padding + i * calculatedScale, padding);
            ctx.lineTo(padding + i * calculatedScale, padding + dimensions.width * calculatedScale);
            ctx.stroke();
        }

        // Horizontal lines (every meter)
        for (let i = 1; i < dimensions.width; i++) {
            ctx.beginPath();
            ctx.moveTo(padding, padding + i * calculatedScale);
            ctx.lineTo(padding + dimensions.length * calculatedScale, padding + i * calculatedScale);
            ctx.stroke();
        }

        // Draw equipment
        equipment.forEach(item => {
            ctx.fillStyle = '#3B82F6';
            ctx.fillRect(
                padding + item.x * calculatedScale,
                padding + item.y * calculatedScale,
                item.width * calculatedScale,
                item.height * calculatedScale
            );

            // Draw equipment label
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
                item.name,
                padding + (item.x + item.width / 2) * calculatedScale,
                padding + (item.y + item.height / 2) * calculatedScale
            );
        });

        // Draw dimensions
        ctx.fillStyle = '#6B7280';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        
        // Length dimension
        ctx.fillText(
            `${dimensions.length.toFixed(1)}m`,
            padding + (dimensions.length * calculatedScale) / 2,
            padding - 10
        );
        
        // Width dimension
        ctx.save();
        ctx.translate(padding - 10, padding + (dimensions.width * calculatedScale) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${dimensions.width.toFixed(1)}m`, 0, 0);
        ctx.restore();

    }, [dimensions, equipment, scale]);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const padding = 40;

        // Check if clicking on any equipment
        equipment.forEach(item => {
            const itemX = padding + item.x * scale;
            const itemY = padding + item.y * scale;
            const itemWidth = item.width * scale;
            const itemHeight = item.height * scale;

            if (x >= itemX && x <= itemX + itemWidth && y >= itemY && y <= itemY + itemHeight) {
                setDraggedItem(item.id);
                setOffset({ x: x - itemX, y: y - itemY });
            }
        });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!draggedItem || !onEquipmentMove) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const padding = 40;
        const newX = (x - padding - offset.x) / scale;
        const newY = (y - padding - offset.y) / scale;

        onEquipmentMove(draggedItem, Math.max(0, newX), Math.max(0, newY));
    };

    const handleMouseUp = () => {
        setDraggedItem(null);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-border-color p-4">
            <div className="mb-4">
                <h3 className="font-bold text-lg">Room Layout</h3>
                <p className="text-sm text-text-secondary">
                    Visual representation of your room. Click and drag equipment to reposition.
                </p>
            </div>
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="border border-border-color rounded cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            />
            <div className="mt-4 flex justify-between text-sm text-text-secondary">
                <div>
                    Grid: 1m × 1m
                </div>
                <div>
                    Room: {dimensions.length}m × {dimensions.width}m × {dimensions.height}m
                </div>
            </div>
        </div>
    );
};

export default PlannerCanvas;
