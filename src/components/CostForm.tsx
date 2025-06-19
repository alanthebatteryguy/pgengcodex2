import { useState } from 'react';
import { CostParameters } from '../types';

interface CostFormProps {
  onSubmit: (data: CostParameters) => void;
  onBack: () => void;
}

export default function CostForm({ onSubmit, onBack }: CostFormProps) {
  const [formData, setFormData] = useState<CostParameters>({
    ptSlabCosts: [
      { thickness: 3, costPerSf: 10.50 },
      { thickness: 4, costPerSf: 11.00 },
      { thickness: 5, costPerSf: 11.50 },
      { thickness: 6, costPerSf: 12.50 },
      { thickness: 7, costPerSf: 13.00 },
      { thickness: 8, costPerSf: 14.00 },
      { thickness: 9, costPerSf: 15.50 },
      { thickness: 10, costPerSf: 17.00 },
      { thickness: 11, costPerSf: 18.80 },
      { thickness: 12, costPerSf: 22.50 },
    ],
    ptFormworkCostPerSf: 4.50,
    beamFormingCostPerCf: 22.00,
    beamPouringCostPerCf: 22.00,
    ptStrandCostPerLb: 1.15,
    mildSteelCostPerLb: 1.20,
    concreteStrength: 5000,
    concreteCostPerCy: 220,
    highStrengthPremium: {
      strength7000: 80,
      strength10000: 200,
      strength15000: 500,
    },
  });

  const handleSlabCostChange = (index: number, value: number) => {
    const newSlabCosts = [...formData.ptSlabCosts];
    newSlabCosts[index] = { ...newSlabCosts[index], costPerSf: value };
    setFormData({ ...formData, ptSlabCosts: newSlabCosts });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Cost Parameters</h2>
      
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          PT Slab Costs ($/SF including concrete, PT, and labor)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {formData.ptSlabCosts.map((slab, index) => (
            <div key={slab.thickness}>
              <label className="block text-sm font-medium text-gray-700">
                {slab.thickness}" Thick
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={slab.costPerSf || ''}
                onChange={(e) => handleSlabCostChange(index, parseFloat(e.target.value) || 0)}
                placeholder="$/SF"
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-gray-500">
          3-7" typical for spans &lt; 32', 9-12" for 45-55' spans
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            PT Formwork Cost ($/SF)
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={formData.ptFormworkCostPerSf || ''}
            onChange={(e) => setFormData({ ...formData, ptFormworkCostPerSf: parseFloat(e.target.value) || 0 })}
            placeholder="$/SF"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            PT Strand Cost ($/LB installed)
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={formData.ptStrandCostPerLb || ''}
            onChange={(e) => setFormData({ ...formData, ptStrandCostPerLb: parseFloat(e.target.value) || 0 })}
            placeholder="$/LB"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Mild Steel Rebar Cost ($/LB installed)
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={formData.mildSteelCostPerLb || ''}
            onChange={(e) => setFormData({ ...formData, mildSteelCostPerLb: parseFloat(e.target.value) || 0 })}
            placeholder="$/LB"
          />
          <p className="mt-1 text-xs text-gray-500">Includes material, labor, and placement</p>
        </div>

        <div className="opacity-50">
          {/* Placeholder for layout balance */}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Beam Forming Cost ($/CF)
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={formData.beamFormingCostPerCf || ''}
            onChange={(e) => setFormData({ ...formData, beamFormingCostPerCf: parseFloat(e.target.value) || 0 })}
            placeholder="$/CF"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Beam Pouring Cost ($/CF)
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={formData.beamPouringCostPerCf || ''}
            onChange={(e) => setFormData({ ...formData, beamPouringCostPerCf: parseFloat(e.target.value) || 0 })}
            placeholder="$/CF"
          />
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          Concrete Strength Selection
        </h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Design Concrete Strength
          </label>
          <select
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={formData.concreteStrength}
            onChange={(e) => setFormData({ ...formData, concreteStrength: parseInt(e.target.value) })}
          >
            <option value="5000">5,000 psi (Base - $220/cy included in slab costs)</option>
            <option value="7000">7,000 psi</option>
            <option value="10000">10,000 psi</option>
            <option value="15000">15,000 psi</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Higher strength allows thinner sections and better durability
          </p>
        </div>

        {formData.concreteStrength > 5000 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {formData.concreteStrength === 7000 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  7,000 psi Premium ($/cy over base)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={formData.highStrengthPremium?.strength7000 || 80}
                  onChange={(e) => setFormData({
                    ...formData,
                    highStrengthPremium: {
                      ...(formData.highStrengthPremium || {}),
                      strength7000: parseFloat(e.target.value) || 0
                    }
                  })}
                  placeholder="$/cy"
                />
              </div>
            )}
            
            {formData.concreteStrength === 10000 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  10,000 psi Premium ($/cy over base)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={formData.highStrengthPremium?.strength10000 || 200}
                  onChange={(e) => setFormData({
                    ...formData,
                    highStrengthPremium: {
                      ...(formData.highStrengthPremium || {}),
                      strength10000: parseFloat(e.target.value) || 0
                    }
                  })}
                  placeholder="$/cy"
                />
              </div>
            )}
            
            {formData.concreteStrength === 15000 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  15,000 psi Premium ($/cy over base)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={formData.highStrengthPremium?.strength15000 || 500}
                  onChange={(e) => setFormData({
                    ...formData,
                    highStrengthPremium: {
                      ...(formData.highStrengthPremium || {}),
                      strength15000: parseFloat(e.target.value) || 0
                    }
                  })}
                  placeholder="$/cy"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Need Default Values?</h4>
        <p className="text-sm text-blue-700">
          Please provide your regional cost data. Typical ranges:
        </p>
        <ul className="mt-2 text-sm text-blue-700 list-disc list-inside">
          <li>PT Slab: $12-25/SF depending on thickness</li>
          <li>PT Formwork: $3-6/SF</li>
          <li>PT Strand: $1.50-2.50/LB installed</li>
          <li>Beam Forming: $50-100/CF</li>
          <li>Beam Pouring: $150-250/CF</li>
        </ul>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Back
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Run Optimization
        </button>
      </div>
    </form>
  );
}