import React, { useState } from 'react';
import { useProjectContext } from '../context/ProjectContext';
import ProductComparisonModal from './ProductComparisonModal';

const ComparisonTray: React.FC = () => {
  const { comparisonList, clearComparison, toggleComparison } = useProjectContext();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (comparisonList.length === 0) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl z-40 animate-fade-in-up">
        <div className="bg-background-secondary border-t border-x border-border-color rounded-t-lg shadow-2xl p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h4 className="font-bold">Compare Products ({comparisonList.length}/4)</h4>
            <div className="flex gap-2">
                {comparisonList.map(p => (
                    <div key={p.sku} className="relative group bg-background rounded-md p-1 px-2 text-xs">
                        {p.sku}
                        <button onClick={() => toggleComparison(p)} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full h-4 w-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100">&times;</button>
                    </div>
                ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={clearComparison} className="text-sm font-medium text-text-secondary hover:underline">Clear</button>
            <button onClick={() => setIsModalOpen(true)} disabled={comparisonList.length < 2} className="btn-accent text-white font-bold py-2 px-4 rounded-md text-sm disabled:opacity-50">Compare</button>
          </div>
        </div>
      </div>
      <ProductComparisonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        products={comparisonList}
      />
    </>
  );
};

export default ComparisonTray;