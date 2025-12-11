import React from 'react';
import { Product } from '../utils/types';
import InfoModal from './InfoModal';

interface ProductInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

const ProductInfoModal: React.FC<ProductInfoModalProps> = ({ isOpen, onClose, product }) => {
  return (
    <InfoModal isOpen={isOpen} onClose={onClose} className="max-w-lg" title={product.name}>
      <div className="space-y-4">
        <p className="font-mono text-sm text-text-secondary">SKU: {product.sku}</p>
        <p className="text-text-primary">{product.description}</p>
        <div>
          <span className="font-semibold">Category:</span> {product.category}
        </div>
        <div>
          <span className="font-semibold">Tags:</span> {product.tags.join(', ')}
        </div>
        {product.status && product.status !== 'active' && (
          <div className="mt-4 p-3 border-l-4 border-destructive rounded-r-lg bg-destructive-bg">
              <p className="font-bold text-destructive capitalize">{product.status} Product</p>
              {product.legacyReason && (
                  <p className="text-sm text-text-secondary mt-1">{product.legacyReason}</p>
              )}
          </div>
         )}
      </div>
    </InfoModal>
  );
};

export default ProductInfoModal;