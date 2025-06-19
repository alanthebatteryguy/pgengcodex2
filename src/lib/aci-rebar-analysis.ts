// ACI 318-19 Rebar Analysis for PT Slabs
// This file demonstrates how mild steel requirements change with PT levels and concrete strength

import {
  calculateTemperatureShrinkageSteel,
  calculateMinimumBondedReinforcement,
  calculateTwoWayPTReinforcement,
  calculateTotalMildSteel,
  analyzeRebarOptimization,
  getConcreteModulus,
  getCoverRequirement,
  type SlabDesign,
  type MaterialProperties
} from './engineering';

// Example 1: Temperature and Shrinkage Steel Requirements
export function demonstrateTemperatureShrinkage() {
  console.log("ACI 7.6.1 - Temperature and Shrinkage Steel Requirements\n");
  
  const thicknesses = [5, 7, 9, 11];
  const fyValues = [40000, 60000, 75000];
  
  console.log("Thickness | fy (ksi) | Min Ratio | Bar Size | Spacing");
  console.log("---------|----------|-----------|----------|--------");
  
  for (const thickness of thicknesses) {
    for (const fy of fyValues) {
      const result = calculateTemperatureShrinkageSteel(thickness, fy);
      console.log(
        `${thickness}"`.padEnd(9) + "|" +
        `${fy/1000}`.padEnd(10) + "|" +
        `${result.ratio.toFixed(4)}`.padEnd(11) + "|" +
        `${result.barSize}`.padEnd(10) + "|" +
        `${result.spacing}"`
      );
    }
  }
  
  console.log("\nKey Points:");
  console.log("- Minimum ratio is 0.0018 for Grade 60 steel");
  console.log("- Maximum spacing is min(5×thickness, 18 inches)");
  console.log("- Higher strength steel allows lower ratios (min 0.0014)");
}

// Example 2: Bonded Reinforcement Requirements
export function demonstrateBondedReinforcement() {
  console.log("\nACI 8.6.1 - Minimum Bonded Reinforcement for PT Members\n");
  
  const fcValues = [4000, 5000, 6000, 7000];
  const thickness = 9; // inches
  const d = thickness - 1.5;
  
  console.log("f'c (psi) | Mcr (k-in) | As,min (in²/ft) | Ratio | Governs?");
  console.log("----------|------------|-----------------|-------|----------");
  
  for (const fc of fcValues) {
    const fr = 7.5 * Math.sqrt(fc);
    const Ig = (12 * Math.pow(thickness, 3)) / 12;
    const yt = thickness / 2;
    const Mcr = (fr * Ig) / yt;
    
    const result = calculateMinimumBondedReinforcement(Mcr, d);
    const tempShrink = calculateTemperatureShrinkageSteel(thickness);
    const governs = result.ratio > tempShrink.ratio;
    
    console.log(
      `${fc}`.padEnd(10) + "|" +
      `${(Mcr/1000).toFixed(1)}`.padEnd(12) + "|" +
      `${result.As_min.toFixed(3)}`.padEnd(17) + "|" +
      `${result.ratio.toFixed(4)}`.padEnd(7) + "|" +
      `${governs ? 'Yes' : 'No'}`
    );
  }
  
  console.log("\nKey Points:");
  console.log("- As,min = Mcr / (1.2 × fy × d)");
  console.log("- Must not be less than temperature/shrinkage requirements");
  console.log("- Higher concrete strength increases cracking moment");
}

// Example 3: Two-Way PT Slab Requirements
export function demonstrateTwoWayPTRequirements() {
  console.log("\nACI 24.4.3 - Two-Way PT Slab Reinforcement\n");
  
  const spans = [24, 30, 36, 42];
  const avgPrestressValues = [125, 175, 225, 275];
  const thickness = 8;
  const fc = 5000;
  
  console.log("Span (ft) | Avg PS (psi) | Neg As (in²/ft) | Dist As (in²/ft) | Total Ratio");
  console.log("----------|--------------|-----------------|------------------|------------");
  
  for (const span of spans) {
    for (const avgPS of avgPrestressValues) {
      const result = calculateTwoWayPTReinforcement(span, thickness, fc, avgPS);
      const totalRatio = result.negativeMomentSteel.ratio + result.distributionSteel.ratio;
      
      console.log(
        `${span}`.padEnd(10) + "|" +
        `${avgPS}`.padEnd(14) + "|" +
        `${result.negativeMomentSteel.As.toFixed(3)}`.padEnd(17) + "|" +
        `${result.distributionSteel.As.toFixed(3)}`.padEnd(18) + "|" +
        `${totalRatio.toFixed(4)}`
      );
    }
  }
  
  console.log("\nKey Points:");
  console.log("- Negative moment steel: As = 0.00075 × h × l₂");
  console.log("- Must be placed within 1.5h from face of support");
  console.log("- Distribution steel perpendicular to tendons");
  console.log("- Higher prestress may reduce distribution steel needs");
}

// Example 4: Cost Optimization Analysis
export function demonstrateCostOptimization() {
  console.log("\nCost Optimization: PT vs Rebar Trade-offs\n");
  
  const span = 30; // ft
  const thickness = 9; // inches
  const ptLevels = [125, 150, 175, 200, 225, 250, 275, 300];
  const fcLevels = [4000, 5000, 6000, 7000, 10000];
  
  const analysis = analyzeRebarOptimization(span, thickness, ptLevels, fcLevels);
  
  console.log("f'c (psi) | Avg PS (psi) | Rebar Ratio | PT $/sf | Rebar $/sf | Total $/sf");
  console.log("----------|--------------|-------------|---------|------------|------------");
  
  // Show sample results
  const samples = analysis.results.filter((r, i) => i % 8 === 0); // Every 8th result
  for (const result of samples) {
    console.log(
      `${result.fc}`.padEnd(10) + "|" +
      `${result.avgPrestress}`.padEnd(14) + "|" +
      `${result.mildSteelRatio.toFixed(4)}`.padEnd(13) + "|" +
      `$${result.ptCostPerSf.toFixed(2)}`.padEnd(9) + "|" +
      `$${result.rebarCostPerSf.toFixed(2)}`.padEnd(12) + "|" +
      `$${result.totalCostPerSf.toFixed(2)}`
    );
  }
  
  console.log("\nOptimal Design:");
  console.log(`- Concrete Strength: ${analysis.optimal.fc} psi`);
  console.log(`- Average Prestress: ${analysis.optimal.avgPrestress} psi`);
  console.log(`- Reason: ${analysis.optimal.reason}`);
}

// Example 5: System Comparison
export function compareSystemRequirements() {
  console.log("\nMild Steel Requirements by System Type\n");
  
  const span = 36;
  const thickness = 10;
  const fc = 5000;
  const avgPrestress = 175;
  
  const slab: SlabDesign = {
    thickness,
    fc,
    ptForce: avgPrestress * thickness,
    mildSteelRatio: 0,
    coverTop: getCoverRequirement(fc),
    coverBottom: getCoverRequirement(fc)
  };
  
  const materials: MaterialProperties = {
    fc,
    fpu: 270000,
    fy: 60000,
    Ec: getConcreteModulus(fc)
  };
  
  const systems: Array<'flatPlate' | 'oneWayBeam' | 'twoWayBeam'> = ['flatPlate', 'oneWayBeam', 'twoWayBeam'];
  
  console.log("System      | Governing Case                    | Ratio  | Weight (psf) | Cost $/sf");
  console.log("------------|-----------------------------------|--------|--------------|----------");
  
  for (const system of systems) {
    const result = calculateTotalMildSteel(slab, span, system, materials);
    console.log(
      `${system}`.padEnd(12) + "|" +
      `${result.governingCase}`.padEnd(35) + "|" +
      `${result.governingRatio.toFixed(4)}`.padEnd(8) + "|" +
      `${result.totalWeight.toFixed(2)}`.padEnd(14) + "|" +
      `$${result.costImpact.toFixed(2)}`
    );
  }
  
  console.log("\nKey Differences:");
  console.log("- Flat plates typically governed by temperature/shrinkage or bonded reinforcement");
  console.log("- Two-way systems require additional negative moment steel at columns");
  console.log("- One-way systems need distribution steel perpendicular to main reinforcement");
}

// Run all demonstrations
export function runAllDemonstrations() {
  demonstrateTemperatureShrinkage();
  demonstrateBondedReinforcement();
  demonstrateTwoWayPTRequirements();
  demonstrateCostOptimization();
  compareSystemRequirements();
}

// Export for use in other modules
export {
  demonstrateTemperatureShrinkage,
  demonstrateBondedReinforcement,
  demonstrateTwoWayPTRequirements,
  demonstrateCostOptimization,
  compareSystemRequirements
};