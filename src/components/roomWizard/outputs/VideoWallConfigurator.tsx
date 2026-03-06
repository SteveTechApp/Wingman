import * as React from "react";
import { RoomWizardAnswers, VideoWallConfig } from '../../../utils/types';
import WizardToggleOption from '../common/WizardToggleOption';
import WallLayoutDisplay from '../../WallLayoutDisplay';

interface VideoWallConfiguratorProps {
    answers: RoomWizardAnswers;
    updateAnswers: (newAnswers: Partial<RoomWizardAnswers>) => void;
}

interface ProductRecommendation {
    sku: string;
    name: string;
    quantity: number;
    role: string;
    tier: 'Bronze' | 'Silver' | 'Gold';
}

const TECHNOLOGY_OPTIONS = [
    { 
        id: 'avoip', 
        name: 'AVoIP (Decoder per Screen)', 
        description: 'Maximum flexibility - one decoder per panel. Best for multi-source walls and future expansion.',
        pros: ['Individual panel control', 'Bezel compensation', 'Scalable'],
        cons: ['Higher cost', 'Requires network infrastructure']
    },
    { 
        id: 'processor', 
        name: 'Dedicated Processor', 
        description: 'Single hardware device drives all panels. Simple and reliable for single-source walls.',
        pros: ['Simple setup', 'Lower cost', 'No network required'],
        cons: ['Limited to single source', 'Fixed layout']
    }
];

const VideoWallConfigurator: React.FC<VideoWallConfiguratorProps> = ({ answers, updateAnswers }) => {
    const config = answers.videoWallConfig;
    const designTier = answers.designTier || 'Silver';

    if (!config) return null;

    const updateConfig = (newConfig: Partial<VideoWallConfig>) => {
        const updatedConfig = { ...config, ...newConfig };
        updateAnswers({ videoWallConfig: updatedConfig });
    };

    const panelCount = config.layout.rows * config.layout.cols;

    // Generate product recommendations based on configuration
    const recommendations = React.useMemo((): ProductRecommendation[] => {
        const products: ProductRecommendation[] = [];

        if (config.type === 'lcd') {
            if (config.technology === 'avoip') {
                // AVoIP approach - decoder per panel
                if (designTier === 'Gold') {
                    products.push({
                        sku: 'NHD-600-TRX',
                        name: 'NetworkHD 600 10GbE Transceiver',
                        quantity: panelCount,
                        role: 'One per panel - uncompressed 4K60',
                        tier: 'Gold'
                    });
                } else if (designTier === 'Silver') {
                    products.push({
                        sku: 'NHD-500-RXE',
                        name: 'NetworkHD 500 JPEG-XS Decoder',
                        quantity: panelCount,
                        role: 'One per panel - visually lossless 4K60',
                        tier: 'Silver'
                    });
                } else {
                    products.push({
                        sku: 'NHD-120-RX',
                        name: 'NetworkHD 120 H.264 Decoder',
                        quantity: panelCount,
                        role: 'One per panel - compressed stream',
                        tier: 'Bronze'
                    });
                }

                // Add encoder
                if (designTier === 'Gold') {
                    products.push({
                        sku: 'NHD-610-TX',
                        name: 'NetworkHD 600 Multi-Input Encoder',
                        quantity: 1,
                        role: 'Source encoder with HDMI/USB-C/DP',
                        tier: 'Gold'
                    });
                } else if (designTier === 'Silver') {
                    products.push({
                        sku: 'NHD-500-TX',
                        name: 'NetworkHD 500 JPEG-XS Encoder',
                        quantity: 1,
                        role: 'Source encoder',
                        tier: 'Silver'
                    });
                } else {
                    products.push({
                        sku: 'NHD-120-TX',
                        name: 'NetworkHD 120 H.264 Encoder',
                        quantity: 1,
                        role: 'Source encoder',
                        tier: 'Bronze'
                    });
                }

                // Controller always required
                products.push({
                    sku: 'NHD-CTL-PRO',
                    name: 'NetworkHD Pro Controller',
                    quantity: 1,
                    role: 'Required for all NetworkHD systems',
                    tier: designTier as 'Bronze' | 'Silver' | 'Gold'
                });

            } else {
                // Processor approach
                if (panelCount <= 4) {
                    products.push({
                        sku: 'SW-0204-VW',
                        name: '4K 60Hz 4-Output Video Wall Processor',
                        quantity: 1,
                        role: 'Drives up to 4 panels (2x2 or 1x4)',
                        tier: 'Silver'
                    });
                } else {
                    products.push({
                        sku: 'SW-0206-VW',
                        name: '4K 60Hz 6-Output Video Wall Processor',
                        quantity: Math.ceil(panelCount / 6),
                        role: 'Drives up to 6 panels, cascadable',
                        tier: 'Silver'
                    });
                }
            }
        } else {
            // LED wall - single input to LED processor
            if (config.multiviewRequired) {
                if (designTier === 'Gold') {
                    products.push({
                        sku: 'NHD-600-TRX',
                        name: 'NetworkHD 600 Transceiver',
                        quantity: 1,
                        role: 'Up to 16 sources, zero latency multiview',
                        tier: 'Gold'
                    });
                } else if (designTier === 'Silver') {
                    products.push({
                        sku: 'NHD-150-RX',
                        name: 'NetworkHD 150 Multiview Decoder',
                        quantity: 1,
                        role: 'Up to 9 sources (H.264 compression)',
                        tier: 'Silver'
                    });
                } else {
                    products.push({
                        sku: 'NHD-0401-MV',
                        name: 'NetworkHD 4-Input Multiview',
                        quantity: 1,
                        role: 'Up to 4 sources',
                        tier: 'Bronze'
                    });
                }
            } else {
                // Single source to LED
                if (designTier === 'Gold') {
                    products.push({
                        sku: 'NHD-600-TRX',
                        name: 'NetworkHD 600 Transceiver',
                        quantity: 1,
                        role: 'Uncompressed 4K60 feed to LED processor',
                        tier: 'Gold'
                    });
                } else if (designTier === 'Silver') {
                    products.push({
                        sku: 'NHD-500-RX',
                        name: 'NetworkHD 500 Decoder',
                        quantity: 1,
                        role: 'Visually lossless feed to LED processor',
                        tier: 'Silver'
                    });
                } else {
                    products.push({
                        sku: 'NHD-120-RX',
                        name: 'NetworkHD 120 Decoder',
                        quantity: 1,
                        role: 'Compressed feed to LED processor',
                        tier: 'Bronze'
                    });
                }
            }
        }

        return products;
    }, [config, designTier, panelCount]);

    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'Gold': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'Silver': return 'text-slate-600 bg-slate-50 border-slate-200';
            case 'Bronze': return 'text-amber-700 bg-amber-50 border-amber-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex\ items-center\ justify-between">
                <h3 className="text-xl\ font-bold">Video Wall Configuration</h3>
                <span className="text-sm\ text-text-secondary">
                    Design Tier: <span className="font-semibold">{designTier}</span>
                </span>
            </div>
            
            {/* Wall Type */}
            <div>
                <label className="block\ text-sm\ font-medium\ text-text-secondary\ mb-2">Wall Type</label>
                <div className="grid\ grid-cols-2\ gap-3">
                    <button 
                        onClick={() => updateConfig({ type: 'lcd' })} 
                        className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                            config.type === 'lcd' 
                                ? 'bg-accent text-white border-accent shadow-md' 
                                : 'bg-gray-50 text-text-primary border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                        }`}
                    >
                        <p className="font-bold">LCD Video Wall</p>
                        <p className={`text-xs mt-1 ${config.type === 'lcd' ? 'text-green-100' : 'text-text-secondary'}`}>
                            Tiled panels with thin bezels
                        </p>
                        <ul className={`text-xs mt-2 space-y-0.5 ${config.type === 'lcd' ? 'text-green-100' : 'text-text-secondary'}`}>
                            <li>• Commercial displays (55"-65")</li>
                            <li>• Visible mullions between panels</li>
                            <li>• Cost-effective for large sizes</li>
                        </ul>
                    </button>
                    <button 
                        onClick={() => updateConfig({ type: 'led' })} 
                        className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                            config.type === 'led' 
                                ? 'bg-accent text-white border-accent shadow-md' 
                                : 'bg-gray-50 text-text-primary border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                        }`}
                    >
                        <p className="font-bold">Direct-View LED</p>
                        <p className={`text-xs mt-1 ${config.type === 'led' ? 'text-green-100' : 'text-text-secondary'}`}>
                            Seamless modular LED
                        </p>
                        <ul className={`text-xs mt-2 space-y-0.5 ${config.type === 'led' ? 'text-green-100' : 'text-text-secondary'}`}>
                            <li>• No bezels - seamless image</li>
                            <li>• Own processor (single HDMI in)</li>
                            <li>• Premium visual impact</li>
                        </ul>
                    </button>
                </div>
            </div>

            {/* Layout (LCD only) */}
            {config.type === 'lcd' && (
                <div className="p-4\ bg-gray-50\ rounded-lg\ border\ border-gray-200">
                    <label className="block\ text-sm\ font-medium\ mb-3">Panel Layout</label>
                    <div className="grid\ grid-cols-2\ gap-6\ items-center">
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="wall-cols" className="block\ text-xs\ font-medium\ text-text-secondary">Columns</label>
                                <input 
                                    type="number" 
                                    id="wall-cols" 
                                    min="1" 
                                    max="8" 
                                    value={config.layout.cols} 
                                    onChange={(e) => updateConfig({ layout: { ...config.layout, cols: parseInt(e.target.value) || 1 } })} 
                                    className="w-full\ p-2\ border\ rounded-md\ bg-white\ mt-1" 
                                />
                            </div>
                            <div>
                                <label htmlFor="wall-rows" className="block\ text-xs\ font-medium\ text-text-secondary">Rows</label>
                                <input 
                                    type="number" 
                                    id="wall-rows" 
                                    min="1" 
                                    max="8" 
                                    value={config.layout.rows} 
                                    onChange={(e) => updateConfig({ layout: { ...config.layout, rows: parseInt(e.target.value) || 1 } })} 
                                    className="w-full\ p-2\ border\ rounded-md\ bg-white\ mt-1" 
                                />
                            </div>
                            <div className="pt-2\ border-t\ border-gray-200">
                                <p className="text-sm">
                                    <span className="text-text-secondary">Total panels:</span>{' '}
                                    <span className="font-bold\ text-accent">{panelCount}</span>
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs\ font-medium\ text-text-secondary\ text-center\ mb-2">Preview</p>
                            <WallLayoutDisplay rows={config.layout.rows} cols={config.layout.cols} />
                        </div>
                    </div>
                </div>
            )}

            {/* Driving Technology (LCD only - LED always uses single input) */}
            {config.type === 'lcd' && (
                <div>
                    <label className="block\ text-sm\ font-medium\ text-text-secondary\ mb-2">Driving Technology</label>
                    <div className="space-y-3">
                        {TECHNOLOGY_OPTIONS.map(opt => (
                            <button 
                                key={opt.id} 
                                onClick={() => updateConfig({ technology: opt.id as 'avoip' | 'processor' })} 
                                className={`w-full text-left p-4 border-2 rounded-lg transition-all duration-200 ${
                                    config.technology === opt.id 
                                        ? 'bg-accent text-white border-accent shadow-md' 
                                        : 'bg-gray-50 text-text-primary border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                }`}
                            >
                                <p className="font-bold">{opt.name}</p>
                                <p className={`text-sm mt-1 ${config.technology === opt.id ? 'text-green-100' : 'text-text-secondary'}`}>
                                    {opt.description}
                                </p>
                                <div className="flex\ gap-4\ mt-2\ text-xs">
                                    <div>
                                        <span className={config.technology === opt.id ? 'text-green-200' : 'text-green-600'}>✓</span>
                                        {' '}{opt.pros.join(', ')}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Multiview */}
            <WizardToggleOption
                label="Multiview Required"
                description={config.type === 'led' 
                    ? "Display multiple sources simultaneously on the LED wall"
                    : "Display multiple sources across the video wall panels"
                }
                checked={config.multiviewRequired}
                onChange={(isChecked) => updateConfig({ multiviewRequired: isChecked })}
            />

            {/* Product Recommendations */}
            <div className="mt-6\ p-4\ bg-slate-50\ rounded-lg\ border\ border-slate-200">
                <h4 className="font-semibold\ text-sm\ mb-3\ flex\ items-center\ gap-2">
                    <svg className="w-4\ h-4\ text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Recommended Products
                </h4>
                <div className="space-y-2">
                    {recommendations.map((product, index) => (
                        <div 
                            key={index} 
                            className="flex\ items-center\ justify-between\ p-2\ bg-white\ rounded\ border\ border-slate-200"
                        >
                            <div className="flex-1">
                                <div className="flex\ items-center\ gap-2">
                                    <span className="font-mono\ text-xs\ font-semibold\ text-accent">{product.sku}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded border ${getTierColor(product.tier)}`}>
                                        {product.tier}
                                    </span>
                                </div>
                                <p className="text-sm\ text-text-primary">{product.name}</p>
                                <p className="text-xs\ text-text-secondary">{product.role}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-lg\ font-bold\ text-slate-700">×{product.quantity}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-xs\ text-text-secondary\ mt-3\ italic">
                    Recommendations based on {designTier} tier design. 
                    {config.type === 'lcd' && ` ${panelCount} panels configured.`}
                </p>
            </div>
        </div>
    );
};

export default VideoWallConfigurator;

