import React, { useState } from 'react';

export interface AncillaryCost {
    id: string;
    category: 'cabling' | 'labor' | 'materials' | 'shipping' | 'permits' | 'other';
    description: string;
    quantity: number;
    unitCost: number;
    notes?: string;
}

interface AncillaryCostsFormProps {
    costs: AncillaryCost[];
    onUpdate: (costs: AncillaryCost[]) => void;
}

const COST_CATEGORIES = [
    { value: 'cabling', label: 'Cabling & Infrastructure' },
    { value: 'labor', label: 'Labor & Installation' },
    { value: 'materials', label: 'Materials & Supplies' },
    { value: 'shipping', label: 'Shipping & Freight' },
    { value: 'permits', label: 'Permits & Fees' },
    { value: 'other', label: 'Other' },
] as const;

const AncillaryCostsForm: React.FC<AncillaryCostsFormProps> = ({ costs, onUpdate }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newCost, setNewCost] = useState<Omit<AncillaryCost, 'id'>>({
        category: 'materials',
        description: '',
        quantity: 1,
        unitCost: 0,
        notes: '',
    });

    const addCost = () => {
        const cost: AncillaryCost = {
            ...newCost,
            id: `cost-${Date.now()}`,
        };
        onUpdate([...costs, cost]);
        setNewCost({
            category: 'materials',
            description: '',
            quantity: 1,
            unitCost: 0,
            notes: '',
        });
        setIsAdding(false);
    };

    const updateCost = (id: string, updates: Partial<AncillaryCost>) => {
        onUpdate(costs.map(cost => 
            cost.id === id ? { ...cost, ...updates } : cost
        ));
    };

    const removeCost = (id: string) => {
        onUpdate(costs.filter(cost => cost.id !== id));
    };

    const getTotalCost = (): number => {
        return costs.reduce((sum, cost) => sum + (cost.quantity * cost.unitCost), 0);
    };

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const getCategoryLabel = (category: string): string => {
        return COST_CATEGORIES.find(c => c.value === category)?.label || category;
    };

    return (
        <div className="bg-background-secondary p-6 rounded-xl border border-border-color">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="font-bold text-lg">Ancillary Costs</h3>
                    <p className="text-sm text-text-secondary">
                        Track additional project costs beyond equipment
                    </p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="btn btn-primary text-sm"
                >
                    + Add Cost
                </button>
            </div>

            {/* Add new cost form */}
            {isAdding && (
                <div className="mb-4 p-4 bg-background-secondary-subtle rounded-lg border-2 border-accent">
                    <h4 className="font-medium mb-3">New Ancillary Cost</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium mb-1">Category</label>
                            <select
                                value={newCost.category}
                                onChange={e => setNewCost({ ...newCost, category: e.target.value as any })}
                                className="w-full p-2 border rounded-md bg-input-bg text-sm"
                            >
                                {COST_CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">Description</label>
                            <input
                                type="text"
                                value={newCost.description}
                                onChange={e => setNewCost({ ...newCost, description: e.target.value })}
                                placeholder="e.g., Cat6 cable, 1000ft"
                                className="w-full p-2 border rounded-md bg-input-bg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">Quantity</label>
                            <input
                                type="number"
                                min="1"
                                value={newCost.quantity}
                                onChange={e => setNewCost({ ...newCost, quantity: parseFloat(e.target.value) || 1 })}
                                className="w-full p-2 border rounded-md bg-input-bg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">Unit Cost ($)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={newCost.unitCost}
                                onChange={e => setNewCost({ ...newCost, unitCost: parseFloat(e.target.value) || 0 })}
                                className="w-full p-2 border rounded-md bg-input-bg text-sm"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium mb-1">Notes (optional)</label>
                            <input
                                type="text"
                                value={newCost.notes}
                                onChange={e => setNewCost({ ...newCost, notes: e.target.value })}
                                placeholder="Additional details..."
                                className="w-full p-2 border rounded-md bg-input-bg text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                        <button
                            onClick={() => setIsAdding(false)}
                            className="btn btn-secondary text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={addCost}
                            disabled={!newCost.description}
                            className="btn btn-primary text-sm disabled:opacity-50"
                        >
                            Add Cost
                        </button>
                    </div>
                </div>
            )}

            {/* Cost list */}
            {costs.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                    <p>No ancillary costs added yet.</p>
                    <p className="text-sm mt-1">Click "Add Cost" to get started.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {costs.map(cost => (
                        <div
                            key={cost.id}
                            className="p-3 bg-background-secondary-subtle rounded-lg border border-border-color hover:border-accent transition-colors"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs px-2 py-0.5 rounded bg-accent-bg-subtle text-accent font-medium">
                                            {getCategoryLabel(cost.category)}
                                        </span>
                                        <h4 className="font-medium">{cost.description}</h4>
                                    </div>
                                    <div className="flex gap-4 text-sm text-text-secondary">
                                        <span>Qty: {cost.quantity}</span>
                                        <span>Unit: {formatCurrency(cost.unitCost)}</span>
                                        <span className="font-medium text-text-primary">
                                            Total: {formatCurrency(cost.quantity * cost.unitCost)}
                                        </span>
                                    </div>
                                    {cost.notes && (
                                        <p className="text-xs text-text-secondary mt-1">{cost.notes}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => removeCost(cost.id)}
                                    className="text-destructive hover:text-destructive-dark ml-2"
                                    title="Remove cost"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Total summary */}
            {costs.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border-color">
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">Total Ancillary Costs:</span>
                        <span className="font-bold text-2xl text-accent">
                            {formatCurrency(getTotalCost())}
                        </span>
                    </div>
                </div>
            )}

            {/* Quick add common costs */}
            {!isAdding && (
                <div className="mt-4 pt-4 border-t border-border-color">
                    <p className="text-xs text-text-secondary mb-2">Quick Add Common Costs:</p>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { desc: 'Cat6 Cable (1000ft)', qty: 1, cost: 150, cat: 'cabling' },
                            { desc: 'Conduit & Boxes', qty: 1, cost: 300, cat: 'materials' },
                            { desc: 'Installation Labor (8hrs)', qty: 8, cost: 75, cat: 'labor' },
                            { desc: 'Freight Shipping', qty: 1, cost: 200, cat: 'shipping' },
                        ].map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    const cost: AncillaryCost = {
                                        id: `cost-${Date.now()}-${idx}`,
                                        category: item.cat as any,
                                        description: item.desc,
                                        quantity: item.qty,
                                        unitCost: item.cost,
                                    };
                                    onUpdate([...costs, cost]);
                                }}
                                className="text-xs px-3 py-1 rounded-md bg-background-secondary-subtle hover:bg-accent hover:text-white transition-colors"
                            >
                                + {item.desc}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AncillaryCostsForm;
