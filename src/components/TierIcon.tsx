import React from 'react';
import { DesignTier } from '../utils/types';

interface TierIconProps {
  tier: DesignTier;
  className?: string;
}

const TIER_STYLES: Record<DesignTier, string> = {
    Bronze: 'text-[#cd7f32]',
    Silver: 'text-gray-400',
    Gold: 'text-yellow-400',
};

const TierIcon: React.FC<TierIconProps> = ({ tier, className }) => {
  const colorClass = TIER_STYLES[tier];

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={`${className} ${colorClass}`}
      aria-label={`${tier} Tier`}
    >
      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-2.625 6c-.54 0-.975.435-.975.975v.75c0 .54.435.975.975.975h5.25c.54 0 .975-.435.975-.975v-.75c0-.54-.435-.975-.975-.975h-5.25zm.472 4.472a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l4.25-4.25a.75.75 0 00-1.06-1.06L11.25 14.94l-1.428-1.428z" clipRule="evenodd" />
    </svg>
  );
};

export default TierIcon;