import React from 'react';
import { Product } from '../utils/types';
import InfoModal from './InfoModal';

interface ProductComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onRemove?: (sku: string) => void;
  onClear?: () => void;
}

const ProductComparisonModal: React.FC<ProductComparisonModalProps> = ({
  isOpen,
  onClose,
  products,
  onRemove,
  onClear
}) => {
  if (products.length === 0) {
    return (
      <InfoModal
        isOpen={isOpen}
        onClose={onClose}
        title="Product Comparison"
        className="max-w-2xl"
      >
        <div className="text-center py-12">
          <p className="text-text-secondary">No products selected for comparison.</p>
          <p className="text-sm text-text-secondary mt-2">
            Click the compare icon on products to add them here (max 4).
          </p>
        </div>
      </InfoModal>
    );
  }

  const allTags = Array.from(new Set(products.flatMap(p => p.tags)));

  return (
    <InfoModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Product Comparison (${products.length}/4)`}
      className="max-w-7xl"
      footer={
        <>
          {onClear && (
            <button onClick={onClear} className="btn btn-secondary">
              Clear All
            </button>
          )}
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-background border-b border-r border-border-color p-3 text-left font-bold text-text-primary">
                Feature
              </th>
              {products.map(product => (
                <th
                  key={product.sku}
                  className="border-b border-border-color p-3 text-left min-w-[200px]"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-text-primary">{product.name}</span>
                      {onRemove && (
                        <button
                          onClick={() => onRemove(product.sku)}
                          className="text-destructive hover:bg-background-secondary p-1 rounded"
                          title="Remove from comparison"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <span className="text-sm text-text-secondary">{product.sku}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Category */}
            <tr className="hover:bg-background-secondary">
              <td className="sticky left-0 z-10 bg-background border-b border-r border-border-color p-3 font-semibold">
                Category
              </td>
              {products.map(product => (
                <td key={product.sku} className="border-b border-border-color p-3">
                  <span className="px-2 py-1 rounded-md bg-accent-bg-subtle text-accent text-sm font-medium">
                    {product.category}
                  </span>
                </td>
              ))}
            </tr>

            {/* Description */}
            <tr className="hover:bg-background-secondary">
              <td className="sticky left-0 z-10 bg-background border-b border-r border-border-color p-3 font-semibold">
                Description
              </td>
              {products.map(product => (
                <td key={product.sku} className="border-b border-border-color p-3">
                  <p className="text-sm text-text-primary">{product.description}</p>
                </td>
              ))}
            </tr>

            {/* Tags/Features */}
            <tr className="hover:bg-background-secondary">
              <td className="sticky left-0 z-10 bg-background border-b border-r border-border-color p-3 font-semibold">
                Features
              </td>
              {products.map(product => (
                <td key={product.sku} className="border-b border-border-color p-3">
                  <div className="flex flex-wrap gap-1">
                    {product.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 rounded-md bg-input-bg text-text-primary text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
              ))}
            </tr>

            {/* Feature Matrix */}
            {allTags.length > 0 && (
              <>
                <tr>
                  <td
                    colSpan={products.length + 1}
                    className="border-b border-border-color p-3 bg-background-secondary"
                  >
                    <h3 className="font-bold text-text-primary">Feature Matrix</h3>
                  </td>
                </tr>
                {allTags.slice(0, 10).map(tag => (
                  <tr key={tag} className="hover:bg-background-secondary">
                    <td className="sticky left-0 z-10 bg-background border-b border-r border-border-color p-3 text-sm">
                      {tag}
                    </td>
                    {products.map(product => (
                      <td
                        key={product.sku}
                        className="border-b border-border-color p-3 text-center"
                      >
                        {product.tags.includes(tag) ? (
                          <svg
                            className="h-5 w-5 text-accent mx-auto"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-5 w-5 text-text-secondary mx-auto opacity-30"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {products.length < 4 && (
        <div className="mt-4 p-4 bg-background-secondary border border-border-color rounded-lg">
          <p className="text-sm text-text-secondary">
            💡 Tip: You can compare up to 4 products at once. Add more products to see side-by-side differences.
          </p>
        </div>
      )}
    </InfoModal>
  );
};

export default ProductComparisonModal;