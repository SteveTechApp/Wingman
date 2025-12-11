import React, { useState } from 'react';
import { useProjectContext } from '../context/ProjectContext';
import { useUserContext } from '../context/UserContext';
import { Product } from '../utils/types';
import { PRODUCT_CATEGORY_ICONS } from '../data/constants';
import InfoTooltip from './InfoTooltip';
import ProductInfoModal from './ProductInfoModal';

const getCategoryIconComponent = (category: string): React.FC<{ className?: string }> => {
    const iconEntry = Object.entries(PRODUCT_CATEGORY_ICONS).find(([key]) => category.toLowerCase().includes(key));
    return iconEntry ? iconEntry[1] : PRODUCT_CATEGORY_ICONS.default;
};

const VisualRoomPlanner: React.FC = () => {
  const { projectData, activeRoomId } = useProjectContext();
  const { userProfile } = useUserContext();
  const room = projectData?.rooms.find(r => r.id === activeRoomId);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // FIX: This component was incomplete and was not returning a value, which is why it was throwing a type error. The rest of the component has been implemented below to provide a visual representation of room equipment.
  if (!room) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 text-center text-gray-500 min-h-[400px] flex items-center justify-center">
        <p>No room selected.</p>
      </div>
    );
  }

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
  };

  const equipment = room.manuallyAddedEquipment;

  return (
    <>
      <div className="bg-background-secondary p-4 rounded-lg border border-border-color h-full flex flex-col shadow-lg">
        <h3 className="font-bold text-lg mb-4 text-text-primary">Visual Room Planner</h3>
        {equipment.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {equipment.map((item, index) => {
              const IconComponent = getCategoryIconComponent(item.category);
              return (
                <InfoTooltip key={`${item.sku}-${index}`} text={item.name}>
                  <button
                    onClick={() => handleProductClick(item)}
                    className="flex flex-col items-center p-3 bg-background rounded-md border border-border-color-subtle hover:border-accent hover:shadow-md transition-all"
                  >
                    <IconComponent className="h-8 w-8 text-accent mb-2" />
                    <p className="text-xs font-semibold text-center truncate w-full">{item.sku}</p>
                    <p className="text-xs text-text-secondary">x{item.quantity}</p>
                  </button>
                </InfoTooltip>
              );
            })}
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center text-center text-text-secondary">
            <div>
              <p className="font-semibold">No equipment in this room.</p>
              <p className="text-xs mt-1">Add equipment to visualize the layout.</p>
            </div>
          </div>
        )}
      </div>

      {selectedProduct && (
        <ProductInfoModal
          isOpen={!!selectedProduct}
          onClose={handleCloseModal}
          product={selectedProduct}
        />
      )}
    </>
  );
};

export default VisualRoomPlanner;