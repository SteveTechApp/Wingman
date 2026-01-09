import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useProjectContext } from '../context/ProjectContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import WallLayoutDisplay from '../components/WallLayoutDisplay';
import toast from 'react-hot-toast';

interface VideoWallConfig {
    id: string;
    name: string;
    type: 'lcd' | 'led';
    layout: { rows: number; cols: number };
    technology: 'avoip' | 'processor';
    multiviewRequired: boolean;
    designTier: 'Bronze' | 'Silver' | 'Gold';
}

const DEFAULT_CONFIG: VideoWallConfig = {
    id: '',
    name: 'Video Wall 1',
    type: 'lcd',
    layout: { rows: 2, cols: 2 },
    technology: 'avoip',
    multiviewRequired: false,
    designTier: 'Silver'
};

const TECHNOLOGY_OPTIONS = [
    {
        id: 'avoip',
        name: 'AVoIP (Decoder per Screen)',
        description: 'Maximum flexibility - one decoder per panel. Best for multi-source walls.',
    },
    {
        id: 'processor',
        name: 'Dedicated Processor',
        description: 'Single hardware device drives all panels. Simple and reliable.',
    }
];

const VideoWallPage: React.FC = () => {
    const { projectId, configId } = useParams();
    const navigate = useNavigate();
    const { getState, dispatchProjectAction } = useProjectContext();

    const [savedConfigs, setSavedConfigs] = useLocalStorage<VideoWallConfig[]>('wingman_videowall_configs', []);
    const [config, setConfig] = useState<VideoWallConfig>(() => {
        if (configId) {
            const found = savedConfigs.find(c => c.id === configId);
            if (found) return found;
        }
        return { ...DEFAULT_CONFIG, id: uuidv4() };
    });

    const panelCount = config.layout.rows * config.layout.cols;

    const updateConfig = (updates: Partial<VideoWallConfig>) => {
        setConfig(prev => ({ ...prev, ...updates }));
    };

    const handleSave = () => {
        const existingIndex = savedConfigs.findIndex(c => c.id === config.id);
        if (existingIndex >= 0) {
            const updated = [...savedConfigs];
            updated[existingIndex] = config;
            setSavedConfigs(updated);
        } else {
            setSavedConfigs([...savedConfigs, config]);
        }
        toast.success('Video wall configuration saved!');
    };

    const handleNewConfig = () => {
        setConfig({ ...DEFAULT_CONFIG, id: uuidv4(), name: `Video Wall ${savedConfigs.length + 1}` });
    };

    const handleLoadConfig = (loadConfig: VideoWallConfig) => {
        setConfig(loadConfig);
        toast.success(`Loaded: ${loadConfig.name}`);
    };

    const handleDeleteConfig = (deleteId: string) => {
        setSavedConfigs(savedConfigs.filter(c => c.id !== deleteId));
        if (config.id === deleteId) {
            handleNewConfig();
        }
        toast.success('Configuration deleted');
    };

    // Product recommendations based on configuration
    const recommendations = useMemo(() => {
        const products: { sku: string; name: string; quantity: number; role: string }[] = [];

        if (config.type === 'lcd') {
            if (config.technology === 'avoip') {
                const skuMap = { Gold: 'NHD-600-TRX', Silver: 'NHD-500-RXE', Bronze: 'NHD-120-RX' };
                const nameMap = {
                    Gold: 'NetworkHD 600 10GbE Transceiver',
                    Silver: 'NetworkHD 500 JPEG-XS Decoder',
                    Bronze: 'NetworkHD 120 H.264 Decoder'
                };
                products.push({
                    sku: skuMap[config.designTier],
                    name: nameMap[config.designTier],
                    quantity: panelCount,
                    role: 'One per panel'
                });
                products.push({
                    sku: 'NHD-CTL-PRO',
                    name: 'NetworkHD Pro Controller',
                    quantity: 1,
                    role: 'Required for all NetworkHD systems'
                });
            } else {
                products.push({
                    sku: panelCount <= 4 ? 'SW-0204-VW' : 'SW-0206-VW',
                    name: panelCount <= 4 ? '4K 60Hz 4-Output Video Wall Processor' : '4K 60Hz 6-Output Video Wall Processor',
                    quantity: panelCount <= 4 ? 1 : Math.ceil(panelCount / 6),
                    role: panelCount <= 4 ? 'Drives up to 4 panels' : 'Drives up to 6 panels, cascadable'
                });
            }
        } else {
            products.push({
                sku: config.designTier === 'Gold' ? 'NHD-600-TRX' : 'NHD-500-RX',
                name: config.designTier === 'Gold' ? 'NetworkHD 600 Transceiver' : 'NetworkHD 500 Decoder',
                quantity: 1,
                role: 'Feed to LED processor'
            });
        }

        return products;
    }, [config, panelCount]);

    return (
        <div className="h-full w-full overflow-y-auto custom-scrollbar p-4 md:p-6">
            <div className="max-w-6xl mx-auto animate-fade-in-fast">
                {/* Page Header */}
                <div className="text-center mb-6">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-accent mb-2 uppercase tracking-widest">
                        Video Wall Designer
                    </h1>
                    <p className="text-lg text-text-secondary">
                        Configure video wall layouts and get product recommendations.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Configuration Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Current Process Container */}
                        <div className="bg-background-secondary border-2 border-border-color rounded-xl shadow-lg overflow-hidden">
                            <div className="bg-accent text-white px-4 py-3">
                                <h2 className="text-lg font-bold uppercase tracking-wide">
                                    Current Process: Wall Configuration
                                </h2>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Configuration Name */}
                                <div className="border border-border-color rounded-lg p-4 bg-background">
                                    <label htmlFor="config-name" className="block text-xs font-bold mb-2 text-text-secondary uppercase tracking-wide">
                                        Configuration Name
                                    </label>
                                    <input
                                        id="config-name"
                                        type="text"
                                        value={config.name}
                                        onChange={(e) => updateConfig({ name: e.target.value })}
                                        placeholder="Enter a name for this configuration"
                                        className="w-full p-3 border border-border-color rounded-lg bg-input-bg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                                    />
                                </div>

                                {/* Wall Type Selection */}
                                <div className="border border-border-color rounded-lg p-4 bg-background">
                                    <label className="block text-xs font-bold mb-3 text-text-secondary uppercase tracking-wide">
                                        Wall Type
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => updateConfig({ type: 'lcd' })}
                                            className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                                                config.type === 'lcd'
                                                    ? 'bg-accent text-white border-accent shadow-md'
                                                    : 'bg-white border-border-color hover:border-accent hover:bg-accent-bg-subtle'
                                            }`}
                                        >
                                            <p className="font-bold">LCD Video Wall</p>
                                            <p className={`text-xs mt-1 ${config.type === 'lcd' ? 'text-green-100' : 'text-text-secondary'}`}>
                                                Tiled panels with thin bezels
                                            </p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateConfig({ type: 'led' })}
                                            className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                                                config.type === 'led'
                                                    ? 'bg-accent text-white border-accent shadow-md'
                                                    : 'bg-white border-border-color hover:border-accent hover:bg-accent-bg-subtle'
                                            }`}
                                        >
                                            <p className="font-bold">Direct-View LED</p>
                                            <p className={`text-xs mt-1 ${config.type === 'led' ? 'text-green-100' : 'text-text-secondary'}`}>
                                                Seamless modular LED
                                            </p>
                                        </button>
                                    </div>
                                </div>

                                {/* Panel Layout (LCD Only) */}
                                {config.type === 'lcd' && (
                                    <div className="border border-border-color rounded-lg p-4 bg-background">
                                        <label className="block text-xs font-bold mb-3 text-text-secondary uppercase tracking-wide">
                                            Panel Layout
                                        </label>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div>
                                                    <label htmlFor="cols-input" className="block text-xs font-medium text-text-secondary mb-1">
                                                        Columns
                                                    </label>
                                                    <input
                                                        id="cols-input"
                                                        type="number"
                                                        min="1"
                                                        max="8"
                                                        value={config.layout.cols}
                                                        onChange={(e) => updateConfig({ layout: { ...config.layout, cols: parseInt(e.target.value) || 1 } })}
                                                        className="w-full p-3 border border-border-color rounded-lg bg-input-bg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="rows-input" className="block text-xs font-medium text-text-secondary mb-1">
                                                        Rows
                                                    </label>
                                                    <input
                                                        id="rows-input"
                                                        type="number"
                                                        min="1"
                                                        max="8"
                                                        value={config.layout.rows}
                                                        onChange={(e) => updateConfig({ layout: { ...config.layout, rows: parseInt(e.target.value) || 1 } })}
                                                        className="w-full p-3 border border-border-color rounded-lg bg-input-bg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                                                    />
                                                </div>
                                                <div className="pt-2 border-t border-border-color">
                                                    <p className="text-sm">
                                                        <span className="text-text-secondary">Total panels:</span>{' '}
                                                        <span className="font-bold text-accent text-lg">{panelCount}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-text-secondary text-center mb-2">Preview</p>
                                                <WallLayoutDisplay rows={config.layout.rows} cols={config.layout.cols} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Driving Technology (LCD Only) */}
                                {config.type === 'lcd' && (
                                    <div className="border border-border-color rounded-lg p-4 bg-background">
                                        <label className="block text-xs font-bold mb-3 text-text-secondary uppercase tracking-wide">
                                            Driving Technology
                                        </label>
                                        <div className="space-y-3">
                                            {TECHNOLOGY_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => updateConfig({ technology: opt.id as 'avoip' | 'processor' })}
                                                    className={`w-full text-left p-4 border-2 rounded-lg transition-all duration-200 ${
                                                        config.technology === opt.id
                                                            ? 'bg-accent text-white border-accent shadow-md'
                                                            : 'bg-white border-border-color hover:border-accent hover:bg-accent-bg-subtle'
                                                    }`}
                                                >
                                                    <p className="font-bold">{opt.name}</p>
                                                    <p className={`text-sm mt-1 ${config.technology === opt.id ? 'text-green-100' : 'text-text-secondary'}`}>
                                                        {opt.description}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Design Tier Selection */}
                                <div className="border border-border-color rounded-lg p-4 bg-background">
                                    <label htmlFor="design-tier" className="block text-xs font-bold mb-2 text-text-secondary uppercase tracking-wide">
                                        Design Tier
                                    </label>
                                    <select
                                        id="design-tier"
                                        value={config.designTier}
                                        onChange={(e) => updateConfig({ designTier: e.target.value as 'Bronze' | 'Silver' | 'Gold' })}
                                        className="w-full p-3 border border-border-color rounded-lg bg-input-bg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                                    >
                                        <option value="Bronze">Bronze - Budget Friendly</option>
                                        <option value="Silver">Silver - Balanced Performance</option>
                                        <option value="Gold">Gold - Premium Quality</option>
                                    </select>
                                </div>

                                {/* Multiview Toggle */}
                                <div className="border border-border-color rounded-lg p-4 bg-background">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wide">
                                                Multiview Required
                                            </label>
                                            <p className="text-sm text-text-secondary mt-1">
                                                Display multiple sources simultaneously
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => updateConfig({ multiviewRequired: !config.multiviewRequired })}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                config.multiviewRequired ? 'bg-accent' : 'bg-gray-300'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    config.multiviewRequired ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={handleSave}
                                        className="btn btn-primary flex-1"
                                    >
                                        Save Configuration
                                    </button>
                                    <button
                                        onClick={handleNewConfig}
                                        className="btn btn-secondary"
                                    >
                                        New Config
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Product Recommendations */}
                        <div className="bg-background-secondary border-2 border-border-color rounded-xl shadow-lg overflow-hidden">
                            <div className="bg-accent text-white px-4 py-3">
                                <h2 className="text-lg font-bold uppercase tracking-wide">
                                    Product Recommendations
                                </h2>
                            </div>
                            <div className="p-4 space-y-3">
                                {recommendations.map((product, index) => (
                                    <div
                                        key={index}
                                        className="p-3 bg-background rounded-lg border border-border-color"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="font-mono text-xs font-semibold text-accent">{product.sku}</span>
                                                <p className="text-sm font-medium">{product.name}</p>
                                                <p className="text-xs text-text-secondary">{product.role}</p>
                                            </div>
                                            <span className="text-lg font-bold text-accent">×{product.quantity}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Saved Configurations */}
                        <div className="bg-background-secondary border-2 border-border-color rounded-xl shadow-lg overflow-hidden">
                            <div className="bg-accent text-white px-4 py-3">
                                <h2 className="text-lg font-bold uppercase tracking-wide">
                                    Saved Configurations
                                </h2>
                            </div>
                            <div className="p-4">
                                {savedConfigs.length === 0 ? (
                                    <p className="text-sm text-text-secondary text-center py-4">
                                        No saved configurations yet.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {savedConfigs.map((savedConfig) => (
                                            <div
                                                key={savedConfig.id}
                                                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                                    savedConfig.id === config.id
                                                        ? 'border-accent bg-accent-bg-subtle'
                                                        : 'border-border-color bg-background hover:border-accent'
                                                }`}
                                                onClick={() => handleLoadConfig(savedConfig)}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-medium text-sm">{savedConfig.name}</p>
                                                        <p className="text-xs text-text-secondary">
                                                            {savedConfig.type.toUpperCase()} • {savedConfig.layout.rows}×{savedConfig.layout.cols}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteConfig(savedConfig.id);
                                                        }}
                                                        className="text-destructive hover:text-destructive/80 p-1"
                                                        title="Delete configuration"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoWallPage;
