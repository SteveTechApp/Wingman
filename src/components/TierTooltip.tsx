import React from 'react';
import { DesignTier } from '../utils/types';

interface TierTooltipProps {
  tier: DesignTier;
  children: React.ReactElement;
}

const TIER_DESCRIPTIONS: Record<DesignTier, string> = {
  Bronze: "Focuses on core functionality and cost-effectiveness. Ideal for budget-conscious projects.",
  Silver: "A balance of performance and value, with enhanced features. The most common choice.",
  Gold: "Prioritizes performance, scalability, and cutting-edge features for executive or high-usage spaces."
};

const TierTooltip: React.FC<TierTooltipProps> = ({ tier, children }) => {
  return (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-background text-text-primary text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-border-color">
        <h4 className="font-bold">{tier} Tier</h4>
        <p>{TIER_DESCRIPTIONS[tier]}</p>
      </div>
    </div>
  );
};

export default TierTooltip;