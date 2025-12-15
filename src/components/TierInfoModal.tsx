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
              <p className="text-sm mb-3 font-semibold">VALUE FOCUSED: Essential functionality at the best price point.</p>
              <ul className="list-disc list-inside text-sm space-y-1 text-text-secondary">
                  <li>Point-to-point connections</li>
                  <li>Basic auto-switching</li>
                  <li>Essentials cabling</li>
                  <li>Budget-conscious equipment</li>
              </ul>
          </div>
          <div className="p-4 border rounded-lg bg-background-secondary-subtle">
              <div className="flex items-center gap-2 mb-2">
                  <TierIcon tier="Silver" className="h-6 w-6" />
                  <h3 className="text-xl font-bold text-gray-400">Silver</h3>
              </div>
              <p className="text-sm mb-3 font-semibold">FUNCTION FOCUSED: The "sweet spot" - reliable performance with modern features.</p>
              <ul className="list-disc list-inside text-sm space-y-1 text-text-secondary">
                  <li>HDBaseT Class A distribution</li>
                  <li>Wireless casting & BYOM</li>
                  <li>Quality audio systems</li>
                  <li>USB host for UC</li>
              </ul>
          </div>
          <div className="p-4 border rounded-lg bg-background-secondary-subtle">
              <div className="flex items-center gap-2 mb-2">
                  <TierIcon tier="Gold" className="h-6 w-6" />
                  <h3 className="text-xl font-bold text-yellow-400">Gold</h3>
              </div>
              <p className="text-sm mb-3 font-semibold">EXPERIENCE FOCUSED: Premium technology for executive spaces and mission-critical rooms.</p>
              <ul className="list-disc list-inside text-sm space-y-1 text-text-secondary">
                  <li>AVoIP zero-latency routing</li>
                  <li>Independent multi-display control</li>
                  <li>Professional audio DSP</li>
                  <li>Touch panel automation</li>
              </ul>
          </div>
      </div>
    </InfoModal>
  );
};

export default TierInfoModal;
