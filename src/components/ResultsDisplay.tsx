interface ResultsDisplayProps {
  project: any;
  onReset: () => void;
}

export default function ResultsDisplay({ project, onReset }: ResultsDisplayProps) {
  const results = project.optimizationResults;
  
  if (!results) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Running optimization...</p>
      </div>
    );
  }

  const systems = [
    { key: 'flatPlate', name: 'Flat Plate', data: results.flatPlate },
    { key: 'oneWayBeam', name: 'One-Way Beam', data: results.oneWayBeam },
    { key: 'twoWayBeam', name: 'Two-Way Beam', data: results.twoWayBeam },
  ];

  const optimalSystem = systems.find(s => s.key === results.optimalSystem);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Optimization Results</h2>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          New Analysis
        </button>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-green-900">Optimal Design</h3>
        <p className="mt-1 text-green-700">
          {optimalSystem?.name} - ${optimalSystem?.data?.totalCost.toLocaleString()} total cost
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {systems.map((system) => (
          <div
            key={system.key}
            className={`border rounded-lg p-4 ${
              system.key === results.optimalSystem
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300'
            }`}
          >
            <h4 className="font-medium text-gray-900 mb-3">{system.name}</h4>
            
            {system.data ? (
              <>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Slab Thickness:</span>
                    <span className="font-medium">{system.data.slabThickness}"</span>
                  </div>
                  
                  {system.data.beamWidth && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Beam Size:</span>
                      <span className="font-medium">
                        {system.data.beamWidth}" × {system.data.beamDepth}"
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Concrete:</span>
                    <span className="font-medium">{system.data.concreteStrength} psi</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">PT Force:</span>
                    <span className="font-medium">{system.data.ptForce} psi avg</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Weight:</span>
                    <span className="font-medium">{system.data.weightPerSf.toFixed(1)} psf</span>
                  </div>
                  
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-900">Total Cost:</span>
                    <span className="text-gray-900">
                      ${system.data.totalCost.toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-1">Design Checks:</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {Object.entries(system.data.checks).map(([check, passes]) => (
                      <div key={check} className="flex items-center">
                        <span
                          className={`w-2 h-2 rounded-full mr-1 ${
                            passes ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                        <span className="capitalize">{check.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">Not feasible for this span</p>
            )}
          </div>
        ))}
      </div>

      {results.comparisons && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Cost Comparison Across Spans
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Span (ft)
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Flat Plate
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    One-Way Beam
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Two-Way Beam
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.comparisons.map((comp: any) => (
                  <tr key={comp.span}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {comp.span}'
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-600">
                      ${comp.flatPlateCost.toFixed(2)}/SF
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-600">
                      ${comp.oneWayBeamCost.toFixed(2)}/SF
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-600">
                      ${comp.twoWayBeamCost.toFixed(2)}/SF
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}