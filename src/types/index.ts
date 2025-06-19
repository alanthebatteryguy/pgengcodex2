export interface SeismicParameters {
  sds: number; // Design short-period spectral acceleration (g)
  sd1: number; // Design 1-second period spectral acceleration (g)
  riskCategory: 'I' | 'II' | 'III' | 'IV';
  importanceFactor: number; // Ie
  responseModificationCoefficient: number; // R factor
  seismicDesignCategory: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
}

export interface ProjectInput {
  name: string;
  bayLength: number;
  bayWidth: number;
  beamDepth: number;
  soilClass: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  seismicParameters: SeismicParameters;
}

export interface CostParameters {
  ptSlabCosts: Array<{
    thickness: number;
    costPerSf: number;
  }>;
  ptFormworkCostPerSf: number;
  beamFormingCostPerCf: number;
  beamPouringCostPerCf: number;
  ptStrandCostPerLb: number;
  mildSteelCostPerLb: number; // Added for rebar cost
  concreteStrength: number; // Selected strength (psi)
  concreteCostPerCy: number; // Base cost per cubic yard (default $220)
  highStrengthPremium?: { // Optional premiums for high strength
    strength7000?: number; // $/cy premium over base
    strength10000?: number;
    strength15000?: number;
  };
}

export interface DesignResult {
  slabThickness: number;
  beamWidth?: number;
  beamDepth?: number;
  concreteStrength: number;
  ptForce: number;
  totalCost: number;
  weightPerSf: number;
  checks: {
    moment: boolean;
    deflection: boolean;
    vibration: boolean;
    punchingShear: boolean;
    camber: boolean;
  };
}

export interface OptimizationResults {
  flatPlate?: DesignResult;
  oneWayBeam?: DesignResult;
  twoWayBeam?: DesignResult;
  optimalSystem: string;
  comparisons: Array<{
    span: number;
    flatPlateCost: number;
    oneWayBeamCost: number;
    twoWayBeamCost: number;
  }>;
}