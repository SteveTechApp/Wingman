import React, { useState } from 'react';
import { Product } from '../utils/types';
import InfoModal from './InfoModal';
import ProductCard from './ProductCard';

interface RelatedProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseProduct: Product;
  relatedProducts: Product[];
  onAddProduct?: (product: Product) => void;
}

const RelatedProductsModal: React.FC<RelatedProductsModalProps> = ({ 
  isOpen, 
  onClose, 
  baseProduct,
  relatedProducts,
  onAddProduct 
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Group related products by category
  const categories = Array.from(new Set(relatedProducts.map(p => p.category)));
  
  const filteredProducts = selectedCategory === 'all' 
    ? relatedProducts 
    : relatedProducts.filter(p => p.category === selectedCategory);

  return (
    <InfoModal 
      isOpen={isOpen} 
      onClose={onClose} 
      className="max-w-4xl" 
      title={`Related Products for ${baseProduct.name}`}
    >
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Base Product</h3>
          <div className="bg-background-secondary-subtle p-3 rounded-lg border border-border-color">
            <p className="font-medium">{baseProduct.name}</p>
            <p className="text-sm text-text-secondary">{baseProduct.description}</p>
            <p className="text-xs text-text-secondary mt-1">SKU: {baseProduct.sku}</p>
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <h3 className="font-semibold mb-2">Filter by Category</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-accent text-white'
                  : 'bg-background-secondary text-text-primary hover:bg-border-color'
              }`}
            >
              All ({relatedProducts.length})
            </button>
            {categories.map(category => {
              const count = relatedProducts.filter(p => p.category === category).length;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    selectedCategory === category
                      ? 'bg-accent text-white'
                      : 'bg-background-secondary text-text-primary hover:bg-border-color'
                  }`}
                >
                  {category} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Related Products Grid */}
        <div>
          <h3 className="font-semibold mb-2">
            Compatible & Recommended Products ({filteredProducts.length})
          </h3>
          
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              <p>No related products found in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {filteredProducts.map(product => (
                <div 
                  key={product.sku}
                  className="bg-background-secondary p-4 rounded-lg border border-border-color hover:border-accent transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-sm">{product.name}</h4>
                      <p className="text-xs text-text-secondary">{product.category}</p>
                    </div>
                    {onAddProduct && (
                      <button
                        onClick={() => {
                          onAddProduct(product);
                          onClose();
                        }}
                        className="btn btn-primary text-xs px-2 py-1"
                      >
                        Add
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-2 mb-2">
                    {product.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {product.tags.slice(0, 3).map(tag => (
                      <span 
                        key={tag}
                        className="text-xs bg-background-secondary-subtle px-2 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-text-secondary mt-2">SKU: {product.sku}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <p className="text-sm">
            <strong>Tip:</strong> These products are commonly used together or serve complementary functions. 
            Adding them may complete your system design.
          </p>
        </div>
      </div>
    </InfoModal>
  );
};

export default RelatedProductsModal;
