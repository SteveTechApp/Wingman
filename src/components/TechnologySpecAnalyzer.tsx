import React, { useState, useMemo } from 'react';
import InfoModal from './InfoModal';
import {
  analyzeTechnologyRequirements,
  compareTechnologyCosts,
  getCableSpecs,
  TechnologyRequirement,
  CableType
} from '../utils/cableRouting';

interface TechnologySpecAnalyzerProps {
  isOpen: boolean;
  onClose: () => void;
  roomType: string;
  displaySize: number;
  viewingDistance: number;
  cableDistance: number;
  onSelectSpecification?: (spec: TechnologyRequirement, cableType: CableType) => void;
}

const TechnologySpecAnalyzer: React.FC<TechnologySpecAnalyzerProps> = ({
  isOpen,
  onClose,
  roomType,
  displaySize,
  viewingDistance,
  cableDistance,
  onSelectSpecification
}) => {
  const [selectedContentType, setSelectedContentType] = useState<
    'presentation' | 'video-conference' | 'digital-signage' | 'broadcast' | 'training'
  >('presentation');

  const [selectedComparison, setSelectedComparison] = useState<string | null>(null);

  // Analyze requirements for each content type
  const allRequirements = useMemo(() => {
    const types: Array<'presentation' | 'video-conference' | 'digital-signage' | 'broadcast' | 'training'> = [
      'presentation',
      'video-conference',
      'digital-signage',
      'broadcast',
      'training'
    ];

    return types.map(type => ({
      contentType: type,
      requirement: analyzeTechnologyRequirements(roomType, displaySize, viewingDistance, type)
    }));
  }, [roomType, displaySize, viewingDistance]);

  // Cost comparison scenarios
  const costComparisons = useMemo(() => {
    const scenarios = [
      {
        name: '4K 30Hz 4:4:4 (Presentation Quality)',
        requirement: {
          resolution: '4K' as const,
          refreshRate: 30 as const,
          colorSubsampling: '4:4:4' as const,
          hdr: false,
          maxDistance: 15,
          recommendedCables: ['HDMI-2.0', 'HDBaseT'] as CableType[],
          notes: 'Perfect for presentations with sharp text'
        }
      },
      {
        name: '4K 60Hz 4:4:4 (Broadcast Quality)',
        requirement: {
          resolution: '4K' as const,
          refreshRate: 60 as const,
          colorSubsampling: '4:4:4' as const,
          hdr: true,
          maxDistance: 10,
          recommendedCables: ['HDMI-2.1', 'DisplayPort-1.4'] as CableType[],
          notes: 'High-end broadcast quality'
        }
      },
      {
        name: '4K 30Hz 4:2:0 (Video Conferencing)',
        requirement: {
          resolution: '4K' as const,
          refreshRate: 30 as const,
          colorSubsampling: '4:2:0' as const,
          hdr: false,
          maxDistance: 15,
          recommendedCables: ['HDMI-2.0', 'HDBaseT'] as CableType[],
          notes: 'Cost-effective for video content'
        }
      },
      {
        name: '1080p 60Hz 4:2:2 (Budget Option)',
        requirement: {
          resolution: '1080p' as const,
          refreshRate: 60 as const,
          colorSubsampling: '4:2:2' as const,
          hdr: false,
          maxDistance: 15,
          recommendedCables: ['HDMI-2.0'] as CableType[],
          notes: 'Budget-friendly, adequate quality'
        }
      }
    ];

    return compareTechnologyCosts(cableDistance, scenarios);
  }, [cableDistance]);

  // Selected requirement details
  const selectedRequirement = allRequirements.find(
    r => r.contentType === selectedContentType
  )?.requirement;

  // Calculate cost savings
  const maxCost = Math.max(...costComparisons.map(c => c.totalCost));
  const minCost = Math.min(...costComparisons.map(c => c.totalCost));
  const potentialSavings = maxCost - minCost;
  const savingsPercentage = ((potentialSavings / maxCost) * 100).toFixed(0);

  const handleSelectSpec = (spec: TechnologyRequirement, cableType: CableType) => {
    onSelectSpecification?.(spec, cableType);
    onClose();
  };

  return (
    <InfoModal isOpen={isOpen} onClose={onClose} title="Technology Specification Analyzer">
      <div className="space-y-6">
        {/* Key Insight Banner */}
        <div className="bg-accent-bg-subtle border border-accent rounded-lg p-4">
          <h3 className="font-bold text-accent mb-2">💰 Cost Optimization Insight</h3>
          <p className="text-sm text-text-primary">
            By choosing the right specification for your needs, you can save up to{' '}
            <strong className="text-accent">${potentialSavings.toFixed(0)} ({savingsPercentage}%)</strong>{' '}
            on cable costs alone for this {cableDistance.toFixed(1)}m run.
          </p>
          <p className="text-xs text-text-secondary mt-2">
            💡 Not every application needs 4K@60Hz 4:4:4. Match specs to actual requirements!
          </p>
        </div>

        {/* Room Context */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-background-secondary p-3 rounded-lg">
            <p className="text-text-secondary">Room Type</p>
            <p className="font-semibold text-text-primary">{roomType}</p>
          </div>
          <div className="bg-background-secondary p-3 rounded-lg">
            <p className="text-text-secondary">Display Size</p>
            <p className="font-semibold text-text-primary">{displaySize}"</p>
          </div>
          <div className="bg-background-secondary p-3 rounded-lg">
            <p className="text-text-secondary">Viewing Distance</p>
            <p className="font-semibold text-text-primary">{viewingDistance.toFixed(1)}m</p>
          </div>
          <div className="bg-background-secondary p-3 rounded-lg">
            <p className="text-text-secondary">Cable Distance</p>
            <p className="font-semibold text-text-primary">{cableDistance.toFixed(1)}m</p>
          </div>
        </div>

        {/* Content Type Selector */}
        <div>
          <h3 className="font-bold text-text-primary mb-3">Select Your Content Type</h3>
          <div className="grid grid-cols-2 gap-2">
            {allRequirements.map(({ contentType, requirement }) => (
              <button
                key={contentType}
                onClick={() => setSelectedContentType(contentType)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  selectedContentType === contentType
                    ? 'border-accent bg-accent-bg-subtle'
                    : 'border-border-color hover:border-accent'
                }`}
              >
                <p className="font-semibold text-text-primary capitalize">
                  {contentType.replace('-', ' ')}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  {requirement.resolution} @ {requirement.refreshRate}Hz {requirement.colorSubsampling}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Requirement Details */}
        {selectedRequirement && (
          <div className="bg-background-secondary p-4 rounded-lg border border-border-color">
            <h3 className="font-bold text-text-primary mb-3">
              Recommended Specification: {selectedContentType.replace('-', ' ')}
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Resolution:</span>
                <span className="font-semibold text-text-primary">{selectedRequirement.resolution}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Refresh Rate:</span>
                <span className="font-semibold text-text-primary">{selectedRequirement.refreshRate}Hz</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Color Subsampling:</span>
                <span className="font-semibold text-text-primary">{selectedRequirement.colorSubsampling}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">HDR:</span>
                <span className="font-semibold text-text-primary">{selectedRequirement.hdr ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Max Distance:</span>
                <span className="font-semibold text-text-primary">{selectedRequirement.maxDistance}m</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border-color">
              <p className="text-sm text-text-secondary">{selectedRequirement.notes}</p>
            </div>

            <div className="mt-4">
              <h4 className="font-semibold text-text-primary text-sm mb-2">Recommended Cables:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedRequirement.recommendedCables.map(cable => {
                  const specs = getCableSpecs(cable);
                  return (
                    <button
                      key={cable}
                      onClick={() => handleSelectSpec(selectedRequirement, cable)}
                      className="px-3 py-2 bg-accent-bg-subtle text-accent rounded-lg text-xs font-mono hover:bg-accent hover:text-white transition-colors"
                      title={specs.notes}
                    >
                      {cable}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Cost Comparison Table */}
        <div>
          <h3 className="font-bold text-text-primary mb-3">Cost Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background-secondary border-b border-border-color">
                  <th className="p-2 text-left font-semibold text-text-primary">Specification</th>
                  <th className="p-2 text-left font-semibold text-text-primary">Cable Type</th>
                  <th className="p-2 text-right font-semibold text-text-primary">Cable Cost</th>
                  <th className="p-2 text-right font-semibold text-text-primary">Hardware</th>
                  <th className="p-2 text-right font-semibold text-text-primary">Total</th>
                </tr>
              </thead>
              <tbody>
                {costComparisons.map((comparison, index) => {
                  const isSelected = selectedComparison === comparison.name;
                  const isCheapest = comparison.totalCost === minCost;
                  const savings = maxCost - comparison.totalCost;

                  return (
                    <tr
                      key={index}
                      onClick={() => setSelectedComparison(comparison.name)}
                      className={`border-b border-border-color cursor-pointer transition-colors ${
                        isSelected ? 'bg-accent-bg-subtle' : 'hover:bg-background-secondary'
                      }`}
                    >
                      <td className="p-2">
                        <div>
                          <p className="font-medium text-text-primary">{comparison.name}</p>
                          {isCheapest && (
                            <span className="text-xs text-accent font-semibold">💰 Most Cost-Effective</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <span className="font-mono text-xs bg-input-bg px-2 py-1 rounded">
                          {comparison.cableType}
                        </span>
                      </td>
                      <td className="p-2 text-right font-semibold text-text-primary">
                        ${comparison.cableCost.toFixed(0)}
                      </td>
                      <td className="p-2 text-right text-text-secondary">
                        {comparison.additionalHardwareCost > 0
                          ? `$${comparison.additionalHardwareCost}`
                          : '-'}
                      </td>
                      <td className="p-2 text-right">
                        <div>
                          <p className="font-bold text-text-primary">${comparison.totalCost.toFixed(0)}</p>
                          {savings > 0 && (
                            <p className="text-xs text-accent">Save ${savings.toFixed(0)}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Selected comparison details */}
          {selectedComparison && (
            <div className="mt-3 p-3 bg-background-secondary rounded-lg border border-border-color">
              <p className="text-xs text-text-secondary">
                {costComparisons.find(c => c.name === selectedComparison)?.notes}
              </p>
            </div>
          )}
        </div>

        {/* Technical Explanation */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
            📚 Understanding Color Subsampling
          </h3>
          <div className="text-xs text-blue-800 dark:text-blue-200 space-y-2">
            <p>
              <strong>4:4:4 (Full Chroma)</strong> - Every pixel has full color information. Essential for sharp text,
              graphics, and detailed images. Best for presentations and training.
            </p>
            <p>
              <strong>4:2:2 (Half Horizontal Chroma)</strong> - Color info reduced horizontally. Great for video
              content while maintaining good quality. Suitable for digital signage.
            </p>
            <p>
              <strong>4:2:0 (Quarter Chroma)</strong> - Most compressed, perfect for motion video like conferencing.
              Significant cost savings with minimal visual impact on video content.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-4 border-t border-border-color">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border-color rounded-lg hover:bg-background-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedRequirement && handleSelectSpec(
              selectedRequirement,
              selectedRequirement.recommendedCables[0]
            )}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
            disabled={!selectedRequirement}
          >
            Apply Recommendation
          </button>
        </div>
      </div>
    </InfoModal>
  );
};

export default TechnologySpecAnalyzer;
