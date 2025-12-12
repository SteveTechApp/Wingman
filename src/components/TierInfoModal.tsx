import React from 'react';
import InfoModal from './InfoModal';
import TierIcon from './TierIcon';

interface TierInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TierInfoModal: React.FC<TierInfoModalProps> = ({ isOpen, onClose }) => {
  return (
    <InfoModal isOpen={isOpen} onClose={onClose} title="Design Tier Guide">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 border rounded-lg bg-background-secondary-subtle">
              <div className="flex items-center gap-2 mb-2">
                  <TierIcon tier="Bronze" className="h-6 w-6" />
                  <h3 className="text-xl font-bold text-[#cd7f32]">Bronze</h3>
              </div>
              <p className="text-sm mb-3">Focuses on core functionality and cost-effectiveness. Ideal for budget-conscious projects or secondary spaces.</p>
              <ul className="list-disc list-inside text-sm space-y-1 text-text-secondary">
                  <li>Reliable, essential features</li>
                  <li>Wired connectivity focus</li>
                  <li>Auto-switching or simple keypads</li>
                  <li>Standard documentation</li>
              </ul>
          </div>
          <div className="p-4 border rounded-lg bg-background-secondary-subtle">
              <div className="flex items-center gap-2 mb-2">
                  <TierIcon tier="Silver" className="h-6 w-6" />
                  <h3 className="text-xl font-bold text-gray-400">Silver</h3>
              </div>
              <p className="text-sm mb-3">Balanced performance and value. The standard for modern AV systems with enhanced features.</p>
              <ul className="list-disc list-inside text-sm space-y-1 text-text-secondary">
                  <li>Full 4K video support</li>
                  <li>USB-C and wireless options</li>
                  <li>Enhanced audio capabilities</li>
                  <li>Professional documentation</li>
              </ul>
          </div>
          <div className="p-4 border rounded-lg bg-background-secondary-subtle">
              <div className="flex items-center gap-2 mb-2">
                  <TierIcon tier="Gold" className="h-6 w-6" />
                  <h3 className="text-xl font-bold text-yellow-400">Gold</h3>
              </div>
              <p className="text-sm mb-3">Premium, cutting-edge features for executive or high-usage spaces, prioritizing performance and scalability.</p>
              <ul className="list-disc list-inside text-sm space-y-1 text-text-secondary">
                  <li>Future-proof 4K60 4:4:4 support</li>
                  <li>Advanced AVoIP and control</li>
                  <li>Integrated audio processing (DSP)</li>
                  <li>Comprehensive system diagrams</li>
              </ul>
          </div>
      </div>
    </InfoModal>
  );
};

export default TierInfoModal;