import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import ProjectForm from './components/ProjectForm';
import CostForm from './components/CostForm';
import ResultsDisplay from './components/ResultsDisplay';
import { ProjectInput, CostParameters } from './types';

function App() {
  const [step, setStep] = useState<'project' | 'costs' | 'results'>('project');
  const [projectData, setProjectData] = useState<ProjectInput | null>(null);
  const [costData, setCostData] = useState<CostParameters | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  const createProject = useMutation(api.projects.create);
  const runOptimization = useMutation(api.optimization.optimize);
  const project = useQuery(api.projects.get, projectId ? { id: projectId } : 'skip');

  const handleProjectSubmit = (data: ProjectInput) => {
    setProjectData(data);
    setStep('costs');
  };

  const handleCostSubmit = async (costs: CostParameters) => {
    if (!projectData) return;
    
    setCostData(costs);
    
    try {
      // Create project and run optimization
      console.log('Creating project with data:', { ...projectData, costParameters: costs });
      const id = await createProject({
        ...projectData,
        costParameters: costs,
      });
      
      console.log('Project created with ID:', id);
      setProjectId(id);
      
      console.log('Running optimization...');
      await runOptimization({ projectId: id });
      
      setStep('results');
    } catch (error) {
      console.error('Error during optimization:', error);
      alert('Error during optimization. Check console for details.');
    }
  };

  const handleReset = () => {
    setStep('project');
    setProjectData(null);
    setCostData(null);
    setProjectId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Parking Garage Optimization Engine
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            IBC 2021 / ACI 318-19 Compliant Design
          </p>
        </header>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex-1 ${step === 'project' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className="text-sm font-medium">Step 1</div>
              <div className="text-xs">Project Parameters</div>
            </div>
            <div className={`flex-1 ${step === 'costs' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className="text-sm font-medium">Step 2</div>
              <div className="text-xs">Cost Data</div>
            </div>
            <div className={`flex-1 ${step === 'results' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className="text-sm font-medium">Step 3</div>
              <div className="text-xs">Optimization Results</div>
            </div>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{
                width: step === 'project' ? '33%' : step === 'costs' ? '66%' : '100%',
              }}
            />
          </div>
        </div>

        {/* Main content */}
        <main className="bg-white rounded-lg shadow p-6">
          {step === 'project' && (
            <ProjectForm onSubmit={handleProjectSubmit} />
          )}
          
          {step === 'costs' && (
            <CostForm 
              onSubmit={handleCostSubmit}
              onBack={() => setStep('project')}
            />
          )}
          
          {step === 'results' && project && (
            <ResultsDisplay 
              project={project}
              onReset={handleReset}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;