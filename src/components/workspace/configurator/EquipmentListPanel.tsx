import React, { useState } from 'react';
import { useProjectContext } from '../../../context/ProjectContext';
import { ManuallyAddedEquipment, Product } from '../../../utils/types';
import ProductFinderModal from '../../ProductFinderModal';
import { PRODUCT_CATEGORY_ICONS } from '../../../data/constants';
import ProductInfoModal from '../../ProductInfoModal';

const getCategoryIconComponent = (category: string): React.FC<{ className?: string }> => {
    const iconEntry = Object.entries(PRODUCT_CATEGORY_ICONS).find(([key]) => category.toLowerCase().includes(key));
    return iconEntry ? iconEntry[1] : PRODUCT_CATEGORY_ICONS.default;
};


const EquipmentListPanel: React.FC = () => {
    const { projectData, activeRoomId, dispatchProjectAction } = useProjectContext();
    const room = projectData?.rooms.find(r => r.id === activeRoomId);
    const [isFinderOpen, setIsFinderOpen] = useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [selectedProductInfo, setSelectedProductInfo] = useState<Product | null>(null);

    if (!room) return null;

    const handleRemove = (sku: string) => {
        dispatchProjectAction({ type: 'REMOVE_EQUIPMENT_FROM_ROOM', payload: { roomId: room.id, sku } });
    };

    const handleQuantityChange = (sku: string, quantity: number) => {
        if (quantity >= 1) {
            dispatchProjectAction({ type: 'UPDATE_EQUIPMENT_QUANTITY', payload: { roomId: room.id, sku, quantity } });
        }
    };
    
    const handleAddProducts = (skus: string[]) => {
        skus.forEach(sku => {
            const product = projectData?.productDatabase.find(p => p.sku === sku);
            if (product) {
                const equipment: ManuallyAddedEquipment = { ...product, quantity: 1 };
                dispatchProjectAction({ type: 'ADD_EQUIPMENT_TO_ROOM', payload: { roomId: room.id, equipment } });
            }
        });
        setIsFinderOpen(false);
    };

    const handleViewDetails = (product: Product) => {
        setSelectedProductInfo(product);
        setIsInfoModalOpen(true);
    };

    return (
        <>
            <div className="bg-background-secondary p-6 rounded-xl shadow-xl border border-border-color">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Equipment List</h3>
                    <button onClick={() => setIsFinderOpen(true)} className="text-sm font-semibold text-accent hover:underline">
                        + Add with AI Finder
                    </button>
                </div>
                <div className="space-y-2">
                    {room.manuallyAddedEquipment.length > 0 ? (
                        room.manuallyAddedEquipment.map(item => {
                            const IconComponent = getCategoryIconComponent(item.category);
                            return (
                                <div key={item.sku} className="flex justify-between items-center bg-background p-2 rounded-md border border-border-color-subtle">
                                    <button onClick={() => handleViewDetails(item)} className="flex items-center gap-3 text-left w-full mr-4 group">
                                        <IconComponent className="h-5 w-5 text-text-secondary" />
                                        <div>
                                            <p className="font-semibold group-hover:underline">{item.name}</p>
                                            <p className="text-xs font-mono text-text-secondary">{item.sku}</p>
                                        </div>
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleQuantityChange(item.sku, parseInt(e.target.value))}
                                            className="w-16 p-1 text-center border rounded-md bg-input-bg"
                                            min="1"
                                        />
                                        <button onClick={() => handleRemove(item.sku)} className="text-destructive text-sm hover:underline">Remove</button>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <p className="text-sm text-text-secondary text-center py-4">No equipment added yet.</p>
                    )}
                </div>
            </div>
            <ProductFinderModal
                isOpen={isFinderOpen}
                onClose={() => setIsFinderOpen(false)}
                onAddProducts={handleAddProducts}
            />
            {selectedProductInfo && (
                <ProductInfoModal
                    isOpen={isInfoModalOpen}
                    onClose={() => setIsInfoModalOpen(false)}
                    product={selectedProductInfo}
                />
            )}
        </>
    );
};

export default EquipmentListPanel;