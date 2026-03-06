import * as React from "react";


// WyreStorm Product Pricing Database
// MSRP = Manufacturer's Suggested Retail Price
// Dealer tiers: Bronze (15% off MSRP), Silver (25% off MSRP), Gold (35% off MSRP)

export interface ProductPricing {
  sku: string;
  msrp: number;
  currency: string;
  dealerPricing: {
    bronze: number;
    silver: number;
    gold: number;
  };
  category: string;
}

// Helper function to calculate dealer pricing
const calculateDealerPricing = (msrp: number) => ({
  bronze: Math.round(msrp * 0.85 * 100) / 100, // 15% off
  silver: Math.round(msrp * 0.75 * 100) / 100, // 25% off
  gold: Math.round(msrp * 0.65 * 100) / 100,   // 35% off
});

export const PRODUCT_PRICING: ProductPricing[] = [
  // SWITCHERS
  {
    sku: 'SW-210',
    msrp: 299.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(299.00),
    category: 'Switcher',
  },
  {
    sku: 'SW-340-TX',
    msrp: 499.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(499.00),
    category: 'Switcher',
  },
  {
    sku: 'SW-540-TX',
    msrp: 699.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(699.00),
    category: 'Switcher',
  },
  {
    sku: 'SW-640L-TX-W',
    msrp: 1299.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(1299.00),
    category: 'Switcher',
  },
  {
    sku: 'SW-1040-TX',
    msrp: 1899.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(1899.00),
    category: 'Switcher',
  },
  {
    sku: 'MX-0404-AVIP',
    msrp: 2499.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(2499.00),
    category: 'Matrix',
  },
  {
    sku: 'MX-0808-AVIP',
    msrp: 3999.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(3999.00),
    category: 'Matrix',
  },

  // EXTENDERS
  {
    sku: 'EX-40-H2-ARC',
    msrp: 399.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(399.00),
    category: 'Extender',
  },
  {
    sku: 'EX-70-H2-ARC',
    msrp: 599.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(599.00),
    category: 'Extender',
  },
  {
    sku: 'EX-100-H2U',
    msrp: 799.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(799.00),
    category: 'Extender',
  },
  {
    sku: 'EX-70-G2',
    msrp: 699.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(699.00),
    category: 'Extender',
  },

  // AV-OVER-IP (NHD SERIES)
  {
    sku: 'NHD-110-TX',
    msrp: 899.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(899.00),
    category: 'AV-over-IP',
  },
  {
    sku: 'NHD-110-RX',
    msrp: 899.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(899.00),
    category: 'AV-over-IP',
  },
  {
    sku: 'NHD-210-TX',
    msrp: 1299.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(1299.00),
    category: 'AV-over-IP',
  },
  {
    sku: 'NHD-210-RX',
    msrp: 1299.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(1299.00),
    category: 'AV-over-IP',
  },
  {
    sku: 'NHD-310-TX',
    msrp: 1699.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(1699.00),
    category: 'AV-over-IP',
  },
  {
    sku: 'NHD-310-RX',
    msrp: 1699.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(1699.00),
    category: 'AV-over-IP',
  },

  // UNIFIED COMMUNICATIONS
  {
    sku: 'VC-BAR-UC',
    msrp: 1499.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(1499.00),
    category: 'UC',
  },
  {
    sku: 'VC-CAM-PTZ',
    msrp: 899.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(899.00),
    category: 'Camera',
  },
  {
    sku: 'VC-MIC-ARRAY',
    msrp: 499.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(499.00),
    category: 'Audio',
  },

  // CONTROL
  {
    sku: 'CTR-100',
    msrp: 299.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(299.00),
    category: 'Control',
  },
  {
    sku: 'CTR-200-PRO',
    msrp: 599.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(599.00),
    category: 'Control',
  },

  // AUDIO DSP
  {
    sku: 'DSP-0404-AEC',
    msrp: 1299.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(1299.00),
    category: 'Audio',
  },
  {
    sku: 'DSP-0808-AEC',
    msrp: 1999.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(1999.00),
    category: 'Audio',
  },

  // ACCESSORIES
  {
    sku: 'APO-DG1',
    msrp: 99.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(99.00),
    category: 'Accessory',
  },
  {
    sku: 'CAB-HDMI-3M',
    msrp: 29.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(29.00),
    category: 'Cable',
  },
  {
    sku: 'CAB-HDMI-5M',
    msrp: 39.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(39.00),
    category: 'Cable',
  },
  {
    sku: 'CAB-HDMI-10M',
    msrp: 59.00,
    currency: 'USD',
    dealerPricing: calculateDealerPricing(59.00),
    category: 'Cable',
  },
];

// Helper function to get pricing for a specific SKU
export const getPricingBySku = (sku: string): ProductPricing | undefined => {
  return PRODUCT_PRICING.find(p => p.sku === sku);
};

// Helper function to get pricing by dealer tier
export const getDealerPrice = (sku: string, tier: 'bronze' | 'silver' | 'gold' = 'silver'): number | null => {
  const pricing = getPricingBySku(sku);
  if (!pricing) return null;
  return pricing.dealerPricing[tier];
};

// Helper function to calculate total cost for equipment list
export const calculateEquipmentTotal = (
  equipment: Array<{ sku: string; quantity: number }>,
  tier: 'msrp' | 'bronze' | 'silver' | 'gold' = 'silver'
): number => {
  let total = 0;
  
  equipment.forEach(item => {
    const pricing = getPricingBySku(item.sku);
    if (pricing) {
      const price = tier === 'msrp' ? pricing.msrp : pricing.dealerPricing[tier];
      total += price * item.quantity;
    }
  });
  
  return Math.round(total * 100) / 100;
};

// Helper function to format currency
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};



