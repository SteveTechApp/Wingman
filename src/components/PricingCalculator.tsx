import * as React from "react";
import { ManuallyAddedEquipment } from '../utils/types';
import { 
  getPricingBySku, 
  calculateEquipmentTotal, 
  formatCurrency,
} from '../data/pricing';

interface PricingCalculatorProps {
  equipment: ManuallyAddedEquipment[];
  onPricingUpdate?: (total: number, tier: 'msrp' | 'bronze' | 'silver' | 'gold') => void;
}

const PricingCalculator: React.FC<PricingCalculatorProps> = ({ equipment, onPricingUpdate }) => {
  const [selectedTier, setSelectedTier] = React.useState<'msrp' | 'bronze' | 'silver' | 'gold'>('silver');
  const [showDetails, setShowDetails] = React.useState(false);
  const [marginPercentage, setMarginPercentage] = React.useState(20); // Default 20% margin

  const equipmentWithPricing = React.useMemo(() => {
    return equipment.map(item => {
      const pricing = getPricingBySku(item.sku);
      return {
        ...item,
        pricing: pricing || null,
      };
    });
  }, [equipment]);

  const totals = React.useMemo(() => {
    const equipmentList = equipment.map(e => ({ sku: e.sku, quantity: e.quantity || 1 }));
    
    return {
      msrp: calculateEquipmentTotal(equipmentList, 'msrp'),
      bronze: calculateEquipmentTotal(equipmentList, 'bronze'),
      silver: calculateEquipmentTotal(equipmentList, 'silver'),
      gold: calculateEquipmentTotal(equipmentList, 'gold'),
    };
  }, [equipment]);

  const selectedTotal = totals[selectedTier];
  const customerPrice = selectedTotal * (1 + marginPercentage / 100);
  const profit = customerPrice - selectedTotal;

  const savingsFromMsrp = totals.msrp - selectedTotal;
  const savingsPercentage = ((savingsFromMsrp / totals.msrp) * 100).toFixed(0);

  const itemsWithoutPricing = equipmentWithPricing.filter(e => !e.pricing).length;

  React.useEffect(() => {
    onPricingUpdate?.(selectedTotal, selectedTier);
  }, [onPricingUpdate, selectedTier, selectedTotal]);

  return (
    <div className="bg-background-secondary\ border\ border-border-color\ rounded-xl\ p-6\ space-y-6">
      <div className="flex\ items-center\ justify-between">
        <h2 className="text-2xl\ font-bold\ uppercase\ tracking-wide">Pricing Calculator</h2>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm\ text-accent\ hover:underline"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Dealer Tier Selection */}
      <div>
        <label className="block\ text-sm\ font-semibold\ mb-2">Dealer Pricing Tier</label>
        <div className="grid\ grid-cols-4\ gap-2">
          {(['msrp', 'bronze', 'silver', 'gold'] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`py-3 px-4 rounded-lg font-semibold uppercase text-sm transition-all ${
                selectedTier === tier
                  ? 'bg-accent text-white shadow-lg scale-105'
                  : 'bg-background border border-border-color hover:border-accent'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
        <div className="mt-2\ text-sm\ text-text-secondary">
          {selectedTier === 'msrp' && 'Full retail price'}
          {selectedTier === 'bronze' && '15% off MSRP'}
          {selectedTier === 'silver' && '25% off MSRP (Recommended)'}
          {selectedTier === 'gold' && '35% off MSRP'}
        </div>
      </div>

      {/* Margin Calculator */}
      <div>
        <label className="block\ text-sm\ font-semibold\ mb-2">
          Your Margin: {marginPercentage}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={marginPercentage}
          onChange={(e) => setMarginPercentage(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex\ justify-between\ text-xs\ text-text-secondary\ mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Price Summary */}
      <div className="bg-background\ border\ border-border-color\ rounded-lg\ p-4\ space-y-3">
        <div className="flex\ justify-between\ items-center">
          <span className="text-text-secondary">Equipment Cost ({selectedTier.toUpperCase()}):</span>
          <span className="text-xl\ font-bold">{formatCurrency(selectedTotal)}</span>
        </div>
        
        {selectedTier !== 'msrp' && (
          <div className="flex\ justify-between\ items-center\ text-green-600\ dark:text-green-400">
            <span className="text-sm">Savings from MSRP:</span>
            <span className="font-semibold">
              -{formatCurrency(savingsFromMsrp)} ({savingsPercentage}%)
            </span>
          </div>
        )}

        <div className="flex\ justify-between\ items-center\ pt-2\ border-t\ border-border-color">
          <span className="text-text-secondary">Your Margin ({marginPercentage}%):</span>
          <span className="text-lg\ font-semibold\ text-accent">+{formatCurrency(profit)}</span>
        </div>

        <div className="flex\ justify-between\ items-center\ pt-2\ border-t-2\ border-accent">
          <span className="text-lg\ font-bold">Customer Price:</span>
          <span className="text-2xl\ font-extrabold\ text-accent">{formatCurrency(customerPrice)}</span>
        </div>
      </div>

      {/* Warning for items without pricing */}
      {itemsWithoutPricing > 0 && (
        <div className="bg-yellow-50\ dark:bg-yellow-900/20\ border\ border-yellow-200\ dark:border-yellow-700\ rounded-lg\ p-3">
          <p className="text-sm\ text-yellow-800\ dark:text-yellow-200">
            Warning: {itemsWithoutPricing} item{itemsWithoutPricing > 1 ? 's' : ''} without pricing data. 
            Total may be incomplete.
          </p>
        </div>
      )}

      {/* Detailed Breakdown */}
      {showDetails && (
        <div className="space-y-2">
          <h3 className="font-semibold\ text-sm\ uppercase\ tracking-wide\ mb-3">Equipment Breakdown</h3>
          <div className="space-y-2\ max-h-96\ overflow-visible">
            {equipmentWithPricing.map((item, idx) => {
              const pricing = item.pricing;
              const quantity = item.quantity || 1;
              
              if (!pricing) {
                return (
                  <div key={idx} className="p-3\ bg-background\ border\ border-border-color\ rounded-lg\ opacity-60">
                    <div className="flex\ justify-between\ items-start">
                      <div className="flex-1">
                        <div className="font-semibold\ text-sm">{item.name}</div>
                        <div className="text-xs\ text-text-secondary">{item.sku}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">Qty: {quantity}</div>
                        <div className="text-xs\ text-yellow-600\ dark:text-yellow-400">No pricing data</div>
                      </div>
                    </div>
                  </div>
                );
              }

              const unitPrice = selectedTier === 'msrp' ? pricing.msrp : pricing.dealerPricing[selectedTier];
              const lineTotal = unitPrice * quantity;

              return (
                <div key={idx} className="p-3\ bg-background\ border\ border-border-color\ rounded-lg\ hover:border-accent\ transition-colors">
                  <div className="flex\ justify-between\ items-start">
                    <div className="flex-1">
                      <div className="font-semibold\ text-sm">{item.name}</div>
                      <div className="text-xs\ text-text-secondary">{item.sku}</div>
                      <div className="text-xs\ text-text-secondary\ mt-1">
                        {formatCurrency(unitPrice)} Ã— {quantity}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(lineTotal)}</div>
                      {selectedTier !== 'msrp' && (
                        <div className="text-xs\ text-green-600\ dark:text-green-400">
                          Save {formatCurrency(pricing.msrp * quantity - lineTotal)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex\ gap-2\ pt-4\ border-t\ border-border-color">
        <button className="btn\ btn-secondary\ flex-1">
          Export Quote
        </button>
        <button className="btn\ btn-primary\ flex-1">
          Generate Proposal
        </button>
      </div>

      {/* Pricing Legend */}
      <details className="text-xs\ text-text-secondary">
        <summary className="cursor-pointer\ hover:text-text-primary">
          About Pricing Tiers
        </summary>
        <div className="mt-2\ space-y-1\ pl-4">
          <p><strong>MSRP:</strong> Manufacturer's Suggested Retail Price</p>
          <p><strong>Bronze Tier:</strong> 15% discount - Entry level dealers</p>
          <p><strong>Silver Tier:</strong> 25% discount - Standard dealers (Recommended)</p>
          <p><strong>Gold Tier:</strong> 35% discount - Premier partners</p>
        </div>
      </details>
    </div>
  );
};

export default PricingCalculator;

