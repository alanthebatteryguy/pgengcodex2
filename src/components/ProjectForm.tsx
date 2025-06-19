import { useState } from 'react';
import { ProjectInput, SeismicParameters } from '../types';

interface ProjectFormProps {
  onSubmit: (data: ProjectInput) => void;
}

export default function ProjectForm({ onSubmit }: ProjectFormProps) {
  const [formData, setFormData] = useState<ProjectInput>({
    name: '',
    bayLength: 30,
    bayWidth: 30,
    beamDepth: 12,
    soilClass: 'C',
    seismicParameters: {
      sds: 0.434,
      sd1: 0.163,
      riskCategory: 'II',
      importanceFactor: 1.0,
      responseModificationCoefficient: 8,
      seismicDesignCategory: 'C',
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Project Parameters</h2>
      
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Project Name
        </label>
        <input
          type="text"
          id="name"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="bayLength" className="block text-sm font-medium text-gray-700">
            Bay Length (ft)
          </label>
          <input
            type="number"
            id="bayLength"
            required
            min="18"
            max="60"
            step="0.5"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={formData.bayLength}
            onChange={(e) => setFormData({ ...formData, bayLength: parseFloat(e.target.value) })}
          />
          <p className="mt-1 text-xs text-gray-500">Range: 18-60 ft</p>
        </div>

        <div>
          <label htmlFor="bayWidth" className="block text-sm font-medium text-gray-700">
            Bay Width (ft)
          </label>
          <input
            type="number"
            id="bayWidth"
            required
            min="18"
            max="60"
            step="0.5"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={formData.bayWidth}
            onChange={(e) => setFormData({ ...formData, bayWidth: parseFloat(e.target.value) })}
          />
          <p className="mt-1 text-xs text-gray-500">Range: 18-60 ft</p>
        </div>
      </div>

      <div>
        <label htmlFor="beamDepth" className="block text-sm font-medium text-gray-700">
          Drop Beam Depth (in)
        </label>
        <input
          type="number"
          id="beamDepth"
          required
          min="8"
          max="36"
          step="1"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          value={formData.beamDepth}
          onChange={(e) => setFormData({ ...formData, beamDepth: parseFloat(e.target.value) })}
        />
        <p className="mt-1 text-xs text-gray-500">Measured from top of slab</p>
      </div>

      <div>
        <label htmlFor="soilClass" className="block text-sm font-medium text-gray-700">
          Soil Site Class (ASCE 7)
        </label>
        <select
          id="soilClass"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          value={formData.soilClass}
          onChange={(e) => setFormData({ ...formData, soilClass: e.target.value as any })}
        >
          <option value="A">A - Hard Rock</option>
          <option value="B">B - Rock</option>
          <option value="C">C - Very Dense Soil/Soft Rock</option>
          <option value="D">D - Stiff Soil</option>
          <option value="E">E - Soft Clay Soil</option>
          <option value="F">F - Special Soils</option>
        </select>
      </div>

      {/* Seismic Parameters Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Seismic Design Parameters</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sds" className="block text-sm font-medium text-gray-700">
              SDS - Design Short-Period Spectral Acceleration (g)
            </label>
            <input
              type="number"
              id="sds"
              required
              min="0"
              max="2"
              step="0.001"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.seismicParameters.sds}
              onChange={(e) => setFormData({
                ...formData,
                seismicParameters: {
                  ...formData.seismicParameters,
                  sds: parseFloat(e.target.value)
                }
              })}
            />
            <p className="mt-1 text-xs text-gray-500">Typical: 0.1-1.5g</p>
          </div>

          <div>
            <label htmlFor="sd1" className="block text-sm font-medium text-gray-700">
              SD1 - Design 1-Second Period Spectral Acceleration (g)
            </label>
            <input
              type="number"
              id="sd1"
              required
              min="0"
              max="1"
              step="0.001"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.seismicParameters.sd1}
              onChange={(e) => setFormData({
                ...formData,
                seismicParameters: {
                  ...formData.seismicParameters,
                  sd1: parseFloat(e.target.value)
                }
              })}
            />
            <p className="mt-1 text-xs text-gray-500">Typical: 0.05-0.6g</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label htmlFor="riskCategory" className="block text-sm font-medium text-gray-700">
              Risk Category
            </label>
            <select
              id="riskCategory"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.seismicParameters.riskCategory}
              onChange={(e) => {
                const category = e.target.value as 'I' | 'II' | 'III' | 'IV';
                const importanceFactors = { 'I': 0.75, 'II': 1.0, 'III': 1.25, 'IV': 1.5 };
                setFormData({
                  ...formData,
                  seismicParameters: {
                    ...formData.seismicParameters,
                    riskCategory: category,
                    importanceFactor: importanceFactors[category]
                  }
                });
              }}
            >
              <option value="I">I - Low Hazard</option>
              <option value="II">II - Normal (Parking Garages)</option>
              <option value="III">III - Substantial Hazard</option>
              <option value="IV">IV - Essential Facilities</option>
            </select>
          </div>

          <div>
            <label htmlFor="importanceFactor" className="block text-sm font-medium text-gray-700">
              Importance Factor (Ie)
            </label>
            <input
              type="number"
              id="importanceFactor"
              readOnly
              className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm sm:text-sm"
              value={formData.seismicParameters.importanceFactor}
            />
            <p className="mt-1 text-xs text-gray-500">Auto-calculated from Risk Category</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label htmlFor="responseModification" className="block text-sm font-medium text-gray-700">
              Response Modification Coefficient (R)
            </label>
            <select
              id="responseModification"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.seismicParameters.responseModificationCoefficient}
              onChange={(e) => setFormData({
                ...formData,
                seismicParameters: {
                  ...formData.seismicParameters,
                  responseModificationCoefficient: parseFloat(e.target.value)
                }
              })}
            >
              <option value="3">3 - Ordinary Moment Frames</option>
              <option value="5">5 - Intermediate Moment Frames</option>
              <option value="8">8 - Special Moment Frames</option>
            </select>
          </div>

          <div>
            <label htmlFor="seismicDesignCategory" className="block text-sm font-medium text-gray-700">
              Seismic Design Category (SDC)
            </label>
            <select
              id="seismicDesignCategory"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.seismicParameters.seismicDesignCategory}
              onChange={(e) => setFormData({
                ...formData,
                seismicParameters: {
                  ...formData.seismicParameters,
                  seismicDesignCategory: e.target.value as any
                }
              })}
            >
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
              <option value="E">E</option>
              <option value="F">F</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Based on SDS={formData.seismicParameters.sds.toFixed(3)} and SD1={formData.seismicParameters.sd1.toFixed(3)}
            </p>
          </div>
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-900">
            <strong>Seismic Base Shear: </strong>
            Cs = {(formData.seismicParameters.sds / formData.seismicParameters.responseModificationCoefficient).toFixed(3)}
            (min: {(0.044 * formData.seismicParameters.sds * formData.seismicParameters.importanceFactor).toFixed(3)})
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Next: Cost Parameters
        </button>
      </div>
    </form>
  );
}