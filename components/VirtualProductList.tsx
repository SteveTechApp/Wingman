import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { Product } from '../utils/types';

interface VirtualProductListProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  height?: number;
  itemHeight?: number;
}

const VirtualProductList: React.FC<VirtualProductListProps> = ({
  products,
  onProductClick,
  height = 600,
  itemHeight = 80,
}) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const product = products[index];

    return (
      <div style={style} className="px-2">
        <button
          onClick={() => onProductClick(product)}
          className="w-full text-left p-4 rounded-lg border border-border-color hover:border-accent hover:bg-accent-bg-subtle transition-colors flex items-center gap-4"
        >
          <div className="flex-1">
            <h3 className="font-semibold text-text-primary">{product.name}</h3>
            <p className="text-sm text-text-secondary truncate">{product.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-mono bg-input-bg px-2 py-1 rounded text-text-secondary">
                {product.sku}
              </span>
              <span className="text-xs bg-accent-bg-subtle text-accent px-2 py-1 rounded font-medium">
                {product.category}
              </span>
            </div>
          </div>
          <svg
            className="h-5 w-5 text-text-secondary flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    );
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        No products found
      </div>
    );
  }

  return (
    <List
      height={height}
      itemCount={products.length}
      itemSize={itemHeight}
      width="100%"
      className="custom-scrollbar"
    >
      {Row}
    </List>
  );
};

export default VirtualProductList;
