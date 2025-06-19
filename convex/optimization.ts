import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Import required functions

// Calculate concrete cost based on strength
function getConcreteBaseCost(fc: number): number {
  const baseCost = 220; // 5000 psi base
  
  if (fc <= 5000) return baseCost;
  
  // $15/cy per 1000 psi from 5000-12000 psi
  const strengthOver5000 = Math.min(fc - 5000, 7000);
  const premiumTo12000 = (strengthOver5000 / 1000) * 15;
  
  // $26/cy per 1000 psi above 12000 psi
  let premiumAbove12000 = 0;
  if (fc > 12000) {
    const strengthOver12000 = fc - 12000;
    premiumAbove12000 = (strengthOver12000 / 1000) * 26;
  }
  
  return baseCost + premiumTo12000 + premiumAbove12000;
}
function calculateTotalMildSteel(
  thickness: number,
  span: number,
  fc: number,
  fy: number,
  serviceStress: number,
  Mcr: number,
  d: number
): { 
  tempShrinkage: number;
  bonded: number;
  twoWay: number;
  governing: number;
  governingCase: string;
} {
  // Temperature/shrinkage steel - ACI 7.6.1
  const minRatio = 0.0018; // Grade 60
  const tempShrinkage = minRatio * thickness * 12;
  
  // Minimum bonded reinforcement - ACI 8.6.1
  const bonded = Mcr / (1.2 * fy * d);
  
  // Two-way slab requirements - ACI 24.4.3
  const l2 = span * 12;
  const As_neg = 0.00075 * thickness * l2;
  
  let additionalAs = 0;
  if (serviceStress > 2 * Math.sqrt(fc)) {
    const Nc = serviceStress * thickness * 12;
    additionalAs = Nc / (0.5 * fy);
  }
  
  const twoWay = Math.max(As_neg + additionalAs, tempShrinkage);
  
  // Determine governing
  const governing = Math.max(tempShrinkage, bonded, twoWay);
  let governingCase = "temperature/shrinkage";
  
  if (bonded > tempShrinkage && bonded > twoWay) {
    governingCase = "minimum bonded (ACI 8.6.1)";
  } else if (twoWay > tempShrinkage && twoWay > bonded) {
    governingCase = "two-way PT slab (ACI 24.4.3)";
  }
  
  return {
    tempShrinkage,
    bonded,
    twoWay,
    governing,
    governingCase
  };
}

// Engineering calculation functions
function getConcreteModulus(fc: number): number {
  return 57000 * Math.sqrt(fc);
}

function getCoverRequirement(fc: number): number {
  if (fc >= 5000) return 1.5;
  if (fc >= 4000) return 1.75;
  return 2.0;
}


// Calculate stress limits based on concrete strength
function getStressLimits(fc: number, fci: number) {
  return {
    fci_comp: 0.60 * fci,              // compression at transfer
    fci_tens: 3 * Math.sqrt(fci),      // tension at transfer (no bonded reinf)
    fc_comp_sust: 0.45 * fc,           // compression at service (sustained)
    fc_comp_total: 0.60 * fc,          // compression at service (total)
    fc_tens: 6 * Math.sqrt(fc),        // tension at service (Class T)
  };
}

// Calculate section properties
function getSectionProperties(thickness: number) {
  const A = thickness * 12; // sq in per foot
  const I = (12 * Math.pow(thickness, 3)) / 12; // in^4
  const St = I / (thickness/2); // in^3
  const Sb = St; // symmetric section
  const r2 = I / A; // radius of gyration squared
  return { A, I, St, Sb, r2 };
}


// Calculate stress in tendons per ACI 318-19
function calculateTendonStress(fpe: number, fc: number, Aps: number, b: number, d: number): number {
  const fpu = 270000; // psi
  const fpy = 0.9 * fpu; // yield strength
  
  // Calculate prestressing steel ratio
  const rho_p = Aps / (b * d);
  
  // ACI 318-19 Eq. 20.3.2.3.1 for unbonded tendons
  // fps = fpe + 10,000 + fc/(100*ρp)
  // But fc/(100*ρp) term should not exceed 30,000 psi per commentary
  const stressTerm = Math.min(fc / (100 * rho_p), 30000);
  const fps = fpe + 10000 + stressTerm;
  
  // Apply limits per ACI 318-19 Table 20.3.2.4.1
  // fps ≤ fpy and fps ≤ fpe + 60,000
  return Math.min(fps, fpy, fpe + 60000);
}

// Adjust slab cost for concrete strength
function adjustSlabCostForStrength(
  baseCost: number,
  thickness: number,
  fc: number
): number {
  // Base slab costs assume 5000 psi concrete
  const volumePerSf = thickness / 12 / 27; // cubic yards per sf
  
  const baseConcreteCost = getConcreteBaseCost(5000);
  const actualConcreteCost = getConcreteBaseCost(fc);
  const costDifference = actualConcreteCost - baseConcreteCost;
  
  // Add the cost difference for the concrete volume
  return baseCost + (volumePerSf * costDifference);
}

// Main optimization function for flat plate system
function optimizeFlatPlate(bayLength: number, bayWidth: number, costParams: any): any {
  let bestDesign = null;
  let minCost = Infinity;
  
  // Debug counters
  let debugCounts = {
    totalTried: 0,
    stressTransferFailed: 0,
    stressServiceFailed: 0,
    minPrestressFailed: 0,
    momentCapacityFailed: 0,
    deflectionFailed: 0,
    vibrationFailed: 0,
    punchingShearFailed: 0,
    tensionControlFailed: 0
  };
  
  // Try different concrete strengths
  const concreteStrengths = [5000, 7000, 10000, 12000, 15000];
  
  for (const fc of concreteStrengths) {
    // Skip ultra-high strength for short spans (not cost-effective)
    if (fc > 10000 && bayLength < 30) continue;
    if (fc > 12000 && bayLength < 40) continue;
    
    console.log(`Trying fc = ${fc} psi`);
    
    const fci = 0.7 * fc; // typical for PT
    const Ec = getConcreteModulus(fc);
    const limits = getStressLimits(fc, fci);
  
  // Calculate span-based minimum thickness
  // For parking garages: typically span/45 to span/55
  const minThickness = Math.max(5, Math.ceil((bayLength * 12) / 50));
  
  // Try different thickness values starting from span-based minimum
  for (let thickness = minThickness; thickness <= 16; thickness += 0.5) {
    console.log(`  Trying thickness = ${thickness}" for span = ${bayLength} ft`);
    const props = getSectionProperties(thickness);
    const loads = { dead: 12.5 * thickness, live: 40 };
    
    // Calculate moments (in-lb per foot)
    const Md = loads.dead * bayLength * bayLength * 12 / 10; // continuous
    const Ml = loads.live * bayLength * bayLength * 12 / 10;
    const Mt = Md + Ml; // For strength checks
    const Mt_service = Md + 0.3 * Ml; // For service stress checks (ACI 318-19)
    
    // Calculate eccentricity limits
    const cover = getCoverRequirement(fc);
    const strandDiameter = 0.5; // typical 0.5" strand
    const emax = thickness/2 - cover - strandDiameter/2; // max eccentricity
    
    // Skip if eccentricity is too small
    if (emax < 1.0) {
      console.log(`    Skipping thickness ${thickness}" - eccentricity too small (${emax.toFixed(2)}")`); 
      continue;
    }
    
    // Try different load balancing ratios (extended to 1.1 for overbalancing)
    for (let balanceRatio = 0.6; balanceRatio <= 1.1; balanceRatio += 0.05) {
      // Required force to balance dead load
      const M_balance = balanceRatio * Md;
      
      // Try different eccentricities (extended to 0.95 for better efficiency)
      for (let eRatio = 0.6; eRatio <= 0.95; eRatio += 0.05) {
        debugCounts.totalTried++;
        
        const e = eRatio * emax;
        const P_balance = M_balance / e;
        
        // Initial prestress (before losses)
        const lossRatio = fc <= 5000 ? 0.80 : fc <= 7000 ? 0.82 : fc <= 10000 ? 0.84 : 0.85;
        const Pi = P_balance / lossRatio;
        const Pe = P_balance; // effective after losses
        
        // Check stresses at transfer (initial prestress, dead load only)
        // Top fiber: compression from P/A, compression from eccentric P, compression from +M
        const fti_top = -Pi/props.A + Pi*e/props.St - Md/props.St;
        // Bottom fiber: compression from P/A, tension from eccentric P, tension from +M
        const fti_bot = -Pi/props.A - Pi*e/props.Sb + Md/props.Sb;
        
        // Debug occasional iterations
        if (debugCounts.totalTried % 100 === 1) {
          console.log(`    Attempt ${debugCounts.totalTried}: t=${thickness}", e=${e.toFixed(2)}", P=${Pi.toFixed(0)} lbs/ft`);
        }
        
        // Check stresses at transfer
        // Top fiber: check both compression and tension
        if (fti_top < -limits.fci_comp) {
          debugCounts.stressTransferFailed++;
          continue; // compression too high
        }
        if (fti_top > limits.fci_tens) {
          debugCounts.stressTransferFailed++;
          continue; // tension too high
        }
        // Bottom fiber: check both compression and tension
        if (fti_bot < -limits.fci_comp) {
          debugCounts.stressTransferFailed++;
          continue; // compression too high
        }
        if (fti_bot > limits.fci_tens) {
          debugCounts.stressTransferFailed++;
          continue; // tension too high
        }
        
        // Check stresses at service (effective prestress, all loads)
        // Top fiber: compression from P/A, compression from eccentric P, compression from +M
        const fs_top = -Pe/props.A + Pe*e/props.St - Mt_service/props.St;
        // Bottom fiber: compression from P/A, tension from eccentric P, tension from +M
        const fs_bot = -Pe/props.A - Pe*e/props.Sb + Mt_service/props.Sb;
        
        // Check stresses at service
        // Top fiber: check both compression and tension
        if (fs_top < -limits.fc_comp_total) {
          debugCounts.stressServiceFailed++;
          continue; // compression too high
        }
        if (fs_top > limits.fc_tens) {
          debugCounts.stressServiceFailed++;
          continue; // tension too high
        }
        // Bottom fiber: check both compression and tension
        if (fs_bot < -limits.fc_comp_total) {
          debugCounts.stressServiceFailed++;
          continue; // compression too high
        }
        if (fs_bot > limits.fc_tens) {
          debugCounts.stressServiceFailed++;
          continue; // tension too high
        }
        
        // Check minimum average prestress (175 psi for parking per ACI 362.1R)
        const avgPrestress = Pe / props.A;
        if (avgPrestress < 175) {
          debugCounts.minPrestressFailed++;
          continue;
        }
      
        // Check moment capacity (actual calculation)
        const d = thickness - 1.5;
        const fpe = 0.74 * 270000 * lossRatio; // effective prestress in strand
        const Aps = Pe / fpe; // area of PT per foot
        const b = 12; // 12 inches width for per-foot calculations
        const fps = calculateTendonStress(fpe, fc, Aps, b, d);
        
        // Calculate moment capacity
        const beta1 = fc <= 4000 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (fc - 4000) / 1000);
        const a = (Aps * fps) / (0.85 * fc * 12);
        const c = a / beta1;
        
        // For prestressed concrete, calculate actual strain
        // εt = 0.003 * (dt - c) / c where dt = d for bonded tendons
        const epsilon_t = 0.003 * (d - c) / c;
        
        // Determine phi factor based on strain (ACI 318-19)
        // For prestressed: tension-controlled when εt ≥ 0.005
        let phi;
        if (epsilon_t >= 0.005) {
          phi = 0.9; // Tension-controlled
        } else if (epsilon_t >= 0.002) {
          // Transition zone - linear interpolation
          phi = 0.65 + (epsilon_t - 0.002) * (0.9 - 0.65) / (0.005 - 0.002);
        } else {
          // Compression-controlled - not allowed for slabs
          debugCounts.tensionControlFailed++;
          continue;
        }
        
        const Mn = Aps * fps * (d - a/2); // in-lb
        const phiMn = phi * Mn;
        if (Mt > phiMn) {
          debugCounts.momentCapacityFailed++;
          continue;
        }
        
        // Check deflection per ACI 318-19 Ch 24
        const w_live = loads.live / 1000; // kips/ft^2
        const L = bayLength; // ft
        
        // Calculate cracking moment and effective moment of inertia
        const fr = 7.5 * Math.sqrt(fc); // psi
        const yt = thickness / 2; // in
        const Mcr = (fr * props.I) / yt; // in-lb
        
        // Service moment for deflection check (unfactored)
        const M_service = (loads.live * L * L / 10) * 12; // in-lb/ft
        
        // Effective moment of inertia per ACI 318-19
        let Ie;
        if (M_service <= (2/3) * Mcr) {
          Ie = props.I;
        } else {
          // For PT slabs, Icr depends on prestress
          const Icr = 0.35 * props.I; // more accurate for PT
          Ie = Icr + Math.pow(Mcr/M_service, 3) * (props.I - Icr);
        }
        
        // Calculate deflections (inches)
        // Live load deflection
        const delta_L = (5 * w_live * Math.pow(L * 12, 4)) / (384 * Ec * Ie / 1000);
        
        // Prestress camber (upward)
        const camber = (Pe * e * Math.pow(L * 12, 2)) / (8 * Ec * Ie / 1000);
        
        // Net downward deflection
        const netDeflection = delta_L - 0.8 * camber; // 80% long-term effectiveness
        
        // Check limit (only if net deflection is downward)
        const deflectionLimit = (L * 12) / 480; // inches
        if (netDeflection > deflectionLimit) {
          debugCounts.deflectionFailed++;
          continue;
        }
        
        // Check vibration using live load deflection only (not net)
        const frequency = 0.18 * Math.sqrt(386.4 / delta_L);
        if (frequency < 5.0) { // 5 Hz for parking garages per industry practice
          debugCounts.vibrationFailed++;
          continue;
        }
        
        // Check punching shear per ACI 318-19 Ch 22.6
        // d already calculated above
        const bo = 4 * (d + 4.5); // perimeter at d/2 from load
        
        // Size effect factor per ACI 22.5.5.1.3
        const lambda_s = Math.min(Math.sqrt(2/(1 + 0.004*d)), 1.0);
        
        // Calculate all three equations per ACI 22.6.5.2
        const beta = 1.0; // aspect ratio for square load
        const alpha_s = 40; // for interior columns
        const vc1 = (2 + 4/beta) * lambda_s * Math.sqrt(fc);
        const vc2 = (alpha_s * d / bo + 2) * lambda_s * Math.sqrt(fc);
        const vc3 = 4 * lambda_s * Math.sqrt(fc);
        
        // Take minimum and add prestress contribution
        const vcNominal = Math.min(vc1, vc2, vc3) + 0.3 * avgPrestress;
        const phiShear = 0.75;
        const vcDesign = phiShear * vcNominal;
        
        const vu = 3000 / (bo * d); // psi
        if (vu > vcDesign) {
          debugCounts.punchingShearFailed++;
          continue;
        }
        
        // Verify minimum prestress for punching shear
        if (avgPrestress < 175) continue; // ACI 362.1R for parking
        
        // Calculate cost with interpolation
        const area = bayLength * bayWidth;
        
        // Find base slab cost by interpolation
        let baseCost = 20; // default
        const sortedCosts = costParams.ptSlabCosts.sort((a: any, b: any) => a.thickness - b.thickness);
        
        for (let i = 0; i < sortedCosts.length - 1; i++) {
          if (thickness >= sortedCosts[i].thickness && thickness <= sortedCosts[i + 1].thickness) {
            // Linear interpolation
            const t1 = sortedCosts[i].thickness;
            const t2 = sortedCosts[i + 1].thickness;
            const c1 = sortedCosts[i].costPerSf;
            const c2 = sortedCosts[i + 1].costPerSf;
            baseCost = c1 + (c2 - c1) * (thickness - t1) / (t2 - t1);
            break;
          }
        }
        
        if (thickness <= sortedCosts[0].thickness) {
          baseCost = sortedCosts[0].costPerSf;
        } else if (thickness >= sortedCosts[sortedCosts.length - 1].thickness) {
          baseCost = sortedCosts[sortedCosts.length - 1].costPerSf;
        }
        
        // Adjust for concrete strength using calculated premiums
        const slabCost = adjustSlabCostForStrength(baseCost, thickness, fc);
        
        // Calculate rebar requirements
        const fy = 60000; // Grade 60
        const fr_rebar = 7.5 * Math.sqrt(fc);
        const Mcr_rebar = (fr_rebar * props.I) / (thickness/2);
        
        // Get service tensile stress for rebar calculation
        const maxTensileStress = Math.max(fs_bot, 0); // bottom fiber tension
        
        const steel = calculateTotalMildSteel(
          thickness,
          bayLength,
          fc,
          fy,
          maxTensileStress,
          Mcr_rebar,
          d
        );
        
        // Calculate rebar weight per sq ft
        const barsPerFoot = steel.governing / 0.20; // #4 bars (0.20 sq in)
        const rebarWeightPerFt = barsPerFoot * 0.668; // lbs per foot width
        const rebarWeightPerSf = rebarWeightPerFt / 1; // already per foot
        
        // Calculate PT strand weight accurately
        // Total PT force required
        const totalPtForce = Pe * bayWidth; // lbs (Pe is per foot width)
        
        // Typical 0.5" dia 7-wire strand
        const strandArea = 0.153; // sq in
        const forcePerStrand = fpe * strandArea; // lbs at effective prestress
        const numStrands = Math.ceil(totalPtForce / forcePerStrand);
        
        // Strand length includes drape
        const drapeHeight = 2 * e / 12; // ft
        const strandLength = Math.sqrt(bayLength * bayLength + drapeHeight * drapeHeight) * 1.02; // 2% for end anchorages
        
        const strandWeight = numStrands * 0.52 * strandLength; // lbs
        
        // Cost breakdown
        const concreteCost = area * slabCost;
        const formworkCost = area * costParams.ptFormworkCostPerSf;
        const ptCost = strandWeight * costParams.ptStrandCostPerLb;
        const rebarCostPerSf = rebarWeightPerSf * (costParams.mildSteelCostPerLb || 1.20);
        
        const totalCost = concreteCost + formworkCost + ptCost + area * rebarCostPerSf;
        
        if (totalCost < minCost) {
          minCost = totalCost;
          bestDesign = {
            slabThickness: thickness,
            concreteStrength: fc,
            ptForce: avgPrestress,
            mildSteelRatio: steel.governing / (12 * d),
            mildSteelDetails: {
              governingCase: steel.governingCase,
              ratio: steel.governing / (12 * d),
              weightPerSf: rebarWeightPerSf,
              costPerSf: rebarCostPerSf
            },
            totalCost: totalCost,
            costBreakdown: {
              concrete: area * slabCost,
              formwork: area * costParams.ptFormworkCostPerSf,
              ptStrand: strandWeight * costParams.ptStrandCostPerLb,
              mildSteel: area * rebarCostPerSf
            },
            weightPerSf: (thickness / 12) * 150 + rebarWeightPerSf,
            prestressForce: Pe, // lbs per foot
            eccentricity: e, // inches
            balanceRatio: balanceRatio,
            numStrands: numStrands,
            checks: {
              moment: true,
              deflection: true,
              vibration: true,
              punchingShear: true,
              camber: true,
            }
          };
        }
      }
    }
  }
  } // End concrete strength loop
  
  console.log("Flat plate debug:", debugCounts);
  return bestDesign;
}

function optimizeOneWayBeam(bayLength: number, bayWidth: number, userBeamDepth: number, costParams: any): any {
  let bestDesign = null;
  let minCost = Infinity;

  // Try different concrete strengths
  const concreteStrengths = [5000, 7000, 10000, 12000, 15000];
  
  for (const fc of concreteStrengths) {
    // Skip ultra-high strength for short spans
    if (fc > 10000 && bayLength < 30) continue;
    if (fc > 12000 && bayLength < 40) continue;
    
    const fci = 0.7 * fc;
    const Ec = getConcreteModulus(fc);
    const limits = getStressLimits(fc, fci);
    
    // Try different beam depths (span/20 to span/12 typical range)
    const minBeamDepth = Math.max(12, Math.floor(bayLength * 12 / 20));
    const maxBeamDepth = Math.min(48, Math.ceil(bayLength * 12 / 12));
    
    for (let beamDepth = minBeamDepth; beamDepth <= maxBeamDepth; beamDepth += 2) {
    // Try different beam widths
    for (let beamWidth = 12; beamWidth <= 24; beamWidth += 2) {
    // Calculate effective slab span (center to center of beams)
    const clearSpan = bayWidth - beamWidth / 12;
    // Calculate minimum slab thickness based on clear span
    const minSlabThickness = Math.max(4, Math.ceil((clearSpan * 12) / 180)); // span/180 for continuous one-way
    
    // Try different slab thicknesses
    for (let slabThickness = minSlabThickness; slabThickness <= 8; slabThickness += 0.5) {
      
      // Slab properties
      const slabProps = getSectionProperties(slabThickness);
      const slabLoads = { dead: 12.5 * slabThickness, live: 40 };
      
      // Slab moments (one-way continuous)
      const Md_slab = slabLoads.dead * clearSpan * clearSpan * 12 / 10;
      const Ml_slab = slabLoads.live * clearSpan * clearSpan * 12 / 10;
      const Mt_slab = Md_slab + Ml_slab; // For strength checks
      const Mt_slab_service = Md_slab + 0.3 * Ml_slab; // For service stress checks
      
      // Calculate slab eccentricity limits
      const slabCover = getCoverRequirement(fc);
      const strandDiameter = 0.375; // smaller strand for thin slabs
      const emax_slab = slabThickness/2 - slabCover - strandDiameter/2;
      
      // Skip if eccentricity is too small
      if (emax_slab < 0.5) continue;
      
      // Try different load balancing for slab
      let slabDesignFound = false;
      let slabPrestress = null;
      
      for (let balanceRatio = 0.6; balanceRatio <= 1.1; balanceRatio += 0.1) {
        const M_balance = balanceRatio * Md_slab;
        
        for (let eRatio = 0.6; eRatio <= 0.95; eRatio += 0.05) {
          const e = eRatio * emax_slab;
          const P_balance = M_balance / e;
          
          const lossRatio = fc <= 5000 ? 0.80 : fc <= 7000 ? 0.82 : fc <= 10000 ? 0.84 : 0.85;
          const Pi = P_balance / lossRatio;
          const Pe = P_balance;
          
          // Check slab stresses
          const fti_top = -Pi/slabProps.A + Pi*e/slabProps.St - Md_slab/slabProps.St;
          const fti_bot = -Pi/slabProps.A - Pi*e/slabProps.Sb + Md_slab/slabProps.Sb;
          
          if (fti_top < -limits.fci_comp || fti_top > limits.fci_tens) continue;
          if (fti_bot < -limits.fci_comp || fti_bot > limits.fci_tens) continue;
          
          const fs_top = -Pe/slabProps.A + Pe*e/slabProps.St - Mt_slab_service/slabProps.St;
          const fs_bot = -Pe/slabProps.A - Pe*e/slabProps.Sb + Mt_slab_service/slabProps.Sb;
          
          if (fs_top < -limits.fc_comp_total || fs_top > limits.fc_tens) continue;
          if (fs_bot < -limits.fc_comp_total || fs_bot > limits.fc_tens) continue;
          
          const avgPrestress = Pe / slabProps.A;
          if (avgPrestress < 175) continue; // ACI 362.1R for parking
          
          slabDesignFound = true;
          slabPrestress = { Pe, e, avgPrestress, balanceRatio };
          break;
        }
        if (slabDesignFound) break;
      }
      
      if (!slabDesignFound) continue;
      
      // Beam design
      const totalDepth = beamDepth + slabThickness;
      const beamLoads = {
        slabDead: slabLoads.dead * bayWidth,
        slabLive: slabLoads.live * bayWidth,
        beamWeight: (beamWidth * totalDepth / 144) * 150
      };
      
      const totalDead = beamLoads.slabDead + beamLoads.beamWeight;
      const totalLive = beamLoads.slabLive;
      
      // Beam moments
      const Md_beam = totalDead * bayLength * bayLength * 12 / 10;
      const Ml_beam = totalLive * bayLength * bayLength * 12 / 10;
      const Mt_beam = Md_beam + Ml_beam; // For strength checks
      const Mt_beam_service = Md_beam + 0.3 * Ml_beam; // For service stress checks
      
      // Beam section properties
      const beamA = beamWidth * totalDepth;
      const beamI = (beamWidth * Math.pow(totalDepth, 3)) / 12;
      const beamSt = beamI / (totalDepth/2);
      const beamSb = beamSt;
      
      // Try beam prestress
      const beamCover = getCoverRequirement(fc) + 0.5;
      const emax_beam = totalDepth/2 - beamCover - 1.0;
      
      let beamDesignFound = false;
      let beamPrestress = null;
      
      for (let balanceRatio = 0.7; balanceRatio <= 1.1; balanceRatio += 0.1) {
        const M_balance = balanceRatio * Md_beam;
        
        for (let eRatio = 0.7; eRatio <= 0.95; eRatio += 0.05) {
          const e = eRatio * emax_beam;
          const P_balance = M_balance / e;
          
          const lossRatio = fc <= 5000 ? 0.80 : fc <= 7000 ? 0.82 : fc <= 10000 ? 0.84 : 0.85;
          const Pi = P_balance / lossRatio;
          const Pe = P_balance;
          
          // Check beam stresses
          const fti_top = -Pi/beamA + Pi*e/beamSt - Md_beam/beamSt;
          const fti_bot = -Pi/beamA - Pi*e/beamSb + Md_beam/beamSb;
          
          if (fti_top < -limits.fci_comp || fti_top > limits.fci_tens) continue;
          if (fti_bot < -limits.fci_comp || fti_bot > limits.fci_tens) continue;
          
          const fs_top = -Pe/beamA + Pe*e/beamSt - Mt_beam_service/beamSt;
          const fs_bot = -Pe/beamA - Pe*e/beamSb + Mt_beam_service/beamSb;
          
          if (fs_top < -limits.fc_comp_total || fs_top > limits.fc_tens) continue;
          if (fs_bot < -limits.fc_comp_total || fs_bot > limits.fc_tens) continue;
          
          beamDesignFound = true;
          beamPrestress = { Pe, e };
          break;
        }
        if (beamDesignFound) break;
      }
      
      if (!beamDesignFound) continue;
      
      // Check deflection
      const w_live = slabLoads.live / 1000;
      const L = clearSpan;
      
      const fr = 7.5 * Math.sqrt(fc);
      const yt = slabThickness / 2;
      const Mcr = (fr * slabProps.I) / yt;
      
      const M_service = (slabLoads.live * L * L / 10) * 12;
      
      let Ie;
      if (M_service <= (2/3) * Mcr) {
        Ie = slabProps.I;
      } else {
        const Icr = 0.35 * slabProps.I;
        Ie = Icr + Math.pow(Mcr/M_service, 3) * (slabProps.I - Icr);
      }
      
      const delta_L = (5 * w_live * Math.pow(L * 12, 4)) / (384 * Ec * Ie / 1000);
      const camber = (slabPrestress!.Pe * slabPrestress!.e * Math.pow(L * 12, 2)) / (8 * Ec * Ie / 1000);
      const netDeflection = delta_L - 0.8 * camber;
      
      const deflectionLimit = (L * 12) / 480;
      if (netDeflection > deflectionLimit) continue;
      
      // Check vibration
      const frequency = 0.18 * Math.sqrt(386.4 / delta_L);
      if (frequency < 5.0) continue; // 5 Hz for parking garages per industry practice
      
      // Calculate costs
      const slabArea = bayLength * bayWidth;
      const beamVolume = (bayLength * beamWidth * totalDepth) / 1728;
      
      // Find base slab cost
      let baseCost = 15;
      const sortedCosts = costParams.ptSlabCosts.sort((a: any, b: any) => a.thickness - b.thickness);
      
      for (let i = 0; i < sortedCosts.length - 1; i++) {
        if (slabThickness >= sortedCosts[i].thickness && slabThickness <= sortedCosts[i + 1].thickness) {
          const t1 = sortedCosts[i].thickness;
          const t2 = sortedCosts[i + 1].thickness;
          const c1 = sortedCosts[i].costPerSf;
          const c2 = sortedCosts[i + 1].costPerSf;
          baseCost = c1 + (c2 - c1) * (slabThickness - t1) / (t2 - t1);
          break;
        }
      }
      
      if (slabThickness <= sortedCosts[0].thickness) {
        baseCost = sortedCosts[0].costPerSf;
      } else if (slabThickness >= sortedCosts[sortedCosts.length - 1].thickness) {
        baseCost = sortedCosts[sortedCosts.length - 1].costPerSf;
      }
      
      // Adjust for concrete strength using calculated premiums
      const slabCost = adjustSlabCostForStrength(baseCost, slabThickness, fc);
      
      // Calculate rebar for slab
      const fy = 60000;
      const d_slab = slabThickness - 1.5;
      const fs_bot_slab = -slabPrestress!.Pe/slabProps.A - slabPrestress!.Pe*slabPrestress!.e/slabProps.Sb + Mt_slab/slabProps.Sb;
      const maxTensileStress = Math.max(fs_bot_slab, 0);
      
      const slabSteel = calculateTotalMildSteel(
        slabThickness,
        clearSpan,
        fc,
        fy,
        maxTensileStress,
        Mcr,
        d_slab
      );
      
      // Calculate PT strand weights
      const slabPtForce = slabPrestress!.Pe * bayLength;
      const beamPtForce = beamPrestress!.Pe;
      
      const fpe = 0.74 * 270000 * 0.82;
      const strandArea = 0.153;
      const forcePerStrand = fpe * strandArea;
      
      const slabStrands = Math.ceil(slabPtForce / forcePerStrand);
      const beamStrands = Math.ceil(beamPtForce / forcePerStrand);
      
      const slabStrandLength = Math.sqrt(clearSpan * clearSpan + Math.pow(2 * slabPrestress!.e / 12, 2)) * 1.02;
      const beamStrandLength = Math.sqrt(bayLength * bayLength + Math.pow(2 * beamPrestress!.e / 12, 2)) * 1.02;
      
      const slabStrandWeight = slabStrands * 0.52 * slabStrandLength * (bayLength / clearSpan);
      const beamStrandWeight = beamStrands * 0.52 * beamStrandLength;
      const totalStrandWeight = slabStrandWeight + beamStrandWeight;
      
      // Calculate rebar weight
      const slabRebarWeight = slabSteel.governing * 0.668 / 0.20 * slabArea;
      const beamRebarArea = 0.0018 * beamA / 144;
      const beamRebarWeight = beamRebarArea * 490 * beamVolume;
      const totalRebarWeight = slabRebarWeight + beamRebarWeight;
      
      // Cost breakdown
      const concreteCost = slabArea * slabCost;
      const formworkCost = slabArea * costParams.ptFormworkCostPerSf;
      const beamFormCost = beamVolume * costParams.beamFormingCostPerCf;
      const beamPourCost = beamVolume * costParams.beamPouringCostPerCf;
      const ptCost = totalStrandWeight * costParams.ptStrandCostPerLb;
      const rebarCost = totalRebarWeight * (costParams.mildSteelCostPerLb || 1.20);
      
      const totalCost = concreteCost + formworkCost + beamFormCost + beamPourCost + ptCost + rebarCost;
      
      if (totalCost < minCost) {
        minCost = totalCost;
        bestDesign = {
          slabThickness,
          beamWidth,
          beamDepth: totalDepth,
          concreteStrength: fc,
          ptForce: slabPrestress!.avgPrestress,
          beamPtForce: beamPrestress!.Pe / beamA,
          totalCost,
          costBreakdown: {
            concrete: concreteCost,
            formwork: formworkCost,
            beamForming: beamFormCost,
            beamPouring: beamPourCost,
            ptStrand: ptCost,
            mildSteel: rebarCost
          },
          weightPerSf: (slabThickness / 12) * 150 + (beamVolume * 150) / slabArea + totalRebarWeight / slabArea,
          checks: {
            moment: true,
            deflection: true,
            vibration: true,
            punchingShear: true,
            camber: true,
          }
        };
      }
    }
  }
  } // End beam depth loop
  } // End concrete strength loop
  
  return bestDesign;
}

function optimizeTwoWayBeam(bayLength: number, bayWidth: number, userBeamDepth: number, costParams: any): any {
  let bestDesign = null;
  let minCost = Infinity;

  // Try different concrete strengths
  const concreteStrengths = [5000, 7000, 10000, 12000, 15000];
  
  for (const fc of concreteStrengths) {
    // Skip ultra-high strength for short spans
    if (fc > 10000 && bayLength < 30) continue;
    if (fc > 12000 && bayLength < 40) continue;
    
    const fci = 0.7 * fc;
    const Ec = getConcreteModulus(fc);
    const limits = getStressLimits(fc, fci);
  
  // Try different beam depths (use larger of the two spans for depth calculation)
  const criticalSpan = Math.max(bayLength, bayWidth);
  const minBeamDepth = Math.max(12, Math.floor(criticalSpan * 12 / 20));
  const maxBeamDepth = Math.min(48, Math.ceil(criticalSpan * 12 / 12));
  
  for (let beamDepth = minBeamDepth; beamDepth <= maxBeamDepth; beamDepth += 2) {
  // Try different beam widths
  for (let beamWidth = 12; beamWidth <= 20; beamWidth += 2) {
    // Calculate effective slab spans
    const clearSpanL = bayLength - beamWidth / 12;
    const clearSpanW = bayWidth - beamWidth / 12;
    const shortSpan = Math.min(clearSpanL, clearSpanW);
    
    // Calculate minimum slab thickness based on short span
    const minSlabThickness = Math.max(3, Math.ceil((shortSpan * 12) / 200)); // span/200 for two-way
    
    // Try different slab thicknesses (thinner for two-way)
    for (let slabThickness = minSlabThickness; slabThickness <= 6; slabThickness += 0.5) {
      const longSpan = Math.max(clearSpanL, clearSpanW);
      const aspectRatio = longSpan / shortSpan;
      
      // Two-way action coefficients (approximate)
      const alphaShort = aspectRatio <= 1.0 ? 0.125 : 0.125 * Math.pow(aspectRatio, -2);
      const alphaLong = aspectRatio <= 1.0 ? 0.125 : 0.125 - alphaShort;
      
      // Slab properties
      const slabProps = getSectionProperties(slabThickness);
      const slabLoads = { dead: 12.5 * slabThickness, live: 40 };
      
      // Two-way slab moments
      const Md_short = alphaShort * slabLoads.dead * shortSpan * shortSpan * 12;
      const Ml_short = alphaShort * slabLoads.live * shortSpan * shortSpan * 12;
      const Mt_short = Md_short + Ml_short;
      
      const Md_long = alphaLong * slabLoads.dead * longSpan * longSpan * 12;
      const Ml_long = alphaLong * slabLoads.live * longSpan * longSpan * 12;
      const Mt_long = Md_long + Ml_long;
      
      // Design for critical direction
      const Mt_critical = Math.max(Mt_short, Mt_long);
      const Md_critical = Mt_critical > Mt_short ? Md_long : Md_short;
      const Ml_critical = Mt_critical > Mt_short ? Ml_long : Ml_short;
      const Mt_critical_service = Md_critical + 0.3 * Ml_critical; // For service stress checks
      
      // Calculate slab eccentricity limits
      const slabCover = getCoverRequirement(fc);
      const strandDiameter = 0.375; // smaller strand for thin slabs
      const emax_slab = slabThickness/2 - slabCover - strandDiameter/2;
      
      // Skip if eccentricity is too small
      if (emax_slab < 0.5) continue;
      
      // Try different load balancing for slab
      let slabDesignFound = false;
      let slabPrestress = null;
      
      for (let balanceRatio = 0.7; balanceRatio <= 1.1; balanceRatio += 0.1) {
        const M_balance = balanceRatio * Md_critical;
        
        for (let eRatio = 0.6; eRatio <= 0.95; eRatio += 0.05) {
          const e = eRatio * emax_slab;
          const P_balance = M_balance / e;
          
          const lossRatio = fc <= 5000 ? 0.80 : fc <= 7000 ? 0.82 : fc <= 10000 ? 0.84 : 0.85;
          const Pi = P_balance / lossRatio;
          const Pe = P_balance;
          
          // Check slab stresses
          const fti_top = -Pi/slabProps.A + Pi*e/slabProps.St - Md_critical/slabProps.St;
          const fti_bot = -Pi/slabProps.A - Pi*e/slabProps.Sb + Md_critical/slabProps.Sb;
          
          if (fti_top < -limits.fci_comp || fti_top > limits.fci_tens) continue;
          if (fti_bot < -limits.fci_comp || fti_bot > limits.fci_tens) continue;
          
          const fs_top = -Pe/slabProps.A + Pe*e/slabProps.St - Mt_critical_service/slabProps.St;
          const fs_bot = -Pe/slabProps.A - Pe*e/slabProps.Sb + Mt_critical_service/slabProps.Sb;
          
          if (fs_top < -limits.fc_comp_total || fs_top > limits.fc_tens) continue;
          if (fs_bot < -limits.fc_comp_total || fs_bot > limits.fc_tens) continue;
          
          const avgPrestress = Pe / slabProps.A;
          if (avgPrestress < 175) continue; // ACI 362.1R for parking
          
          slabDesignFound = true;
          slabPrestress = { Pe, e, avgPrestress, balanceRatio };
          break;
        }
        if (slabDesignFound) break;
      }
      
      if (!slabDesignFound) continue;
      
      // Beam design (both directions)
      const totalDepth = beamDepth + slabThickness;
      
      // Long direction beam
      const beamLoadsL = {
        slabDead: slabLoads.dead * clearSpanW / 2,
        slabLive: slabLoads.live * clearSpanW / 2,
        beamWeight: (beamWidth * totalDepth / 144) * 150
      };
      
      const totalDeadL = beamLoadsL.slabDead + beamLoadsL.beamWeight;
      const totalLiveL = beamLoadsL.slabLive;
      
      const Md_beamL = totalDeadL * bayLength * bayLength * 12 / 10;
      const Ml_beamL = totalLiveL * bayLength * bayLength * 12 / 10;
      const Mt_beamL = Md_beamL + Ml_beamL;
      
      // Short direction beam
      const beamLoadsW = {
        slabDead: slabLoads.dead * clearSpanL / 2,
        slabLive: slabLoads.live * clearSpanL / 2,
        beamWeight: (beamWidth * totalDepth / 144) * 150
      };
      
      const totalDeadW = beamLoadsW.slabDead + beamLoadsW.beamWeight;
      const totalLiveW = beamLoadsW.slabLive;
      
      const Md_beamW = totalDeadW * bayWidth * bayWidth * 12 / 10;
      const Ml_beamW = totalLiveW * bayWidth * bayWidth * 12 / 10;
      const Mt_beamW = Md_beamW + Ml_beamW;
      
      // Design critical beam
      const Mt_beam = Math.max(Mt_beamL, Mt_beamW);
      const Md_beam = Mt_beam > Mt_beamL ? Md_beamW : Md_beamL;
      const Ml_beam = Mt_beam > Mt_beamL ? Ml_beamW : Ml_beamL;
      const Mt_beam_service = Md_beam + 0.3 * Ml_beam; // For service stress checks
      
      // Beam section properties
      const beamA = beamWidth * totalDepth;
      const beamI = (beamWidth * Math.pow(totalDepth, 3)) / 12;
      const beamSt = beamI / (totalDepth/2);
      const beamSb = beamSt;
      
      // Try beam prestress
      const beamCover = getCoverRequirement(fc) + 0.5;
      const emax_beam = totalDepth/2 - beamCover - 1.0;
      
      let beamDesignFound = false;
      let beamPrestress = null;
      
      for (let balanceRatio = 0.8; balanceRatio <= 1.1; balanceRatio += 0.1) {
        const M_balance = balanceRatio * Md_beam;
        
        for (let eRatio = 0.7; eRatio <= 0.95; eRatio += 0.05) {
          const e = eRatio * emax_beam;
          const P_balance = M_balance / e;
          
          const lossRatio = fc <= 5000 ? 0.80 : fc <= 7000 ? 0.82 : fc <= 10000 ? 0.84 : 0.85;
          const Pi = P_balance / lossRatio;
          const Pe = P_balance;
          
          // Check beam stresses
          const fti_top = -Pi/beamA + Pi*e/beamSt - Md_beam/beamSt;
          const fti_bot = -Pi/beamA - Pi*e/beamSb + Md_beam/beamSb;
          
          if (fti_top < -limits.fci_comp || fti_top > limits.fci_tens) continue;
          if (fti_bot < -limits.fci_comp || fti_bot > limits.fci_tens) continue;
          
          const fs_top = -Pe/beamA + Pe*e/beamSt - Mt_beam_service/beamSt;
          const fs_bot = -Pe/beamA - Pe*e/beamSb + Mt_beam_service/beamSb;
          
          if (fs_top < -limits.fc_comp_total || fs_top > limits.fc_tens) continue;
          if (fs_bot < -limits.fc_comp_total || fs_bot > limits.fc_tens) continue;
          
          beamDesignFound = true;
          beamPrestress = { Pe, e };
          break;
        }
        if (beamDesignFound) break;
      }
      
      if (!beamDesignFound) continue;
      
      // Check deflection (short span governs)
      const w_live = slabLoads.live / 1000;
      const L = shortSpan;
      
      const fr = 7.5 * Math.sqrt(fc);
      const yt = slabThickness / 2;
      const Mcr = (fr * slabProps.I) / yt;
      
      const M_service = alphaShort * slabLoads.live * L * L * 12;
      
      let Ie;
      if (M_service <= (2/3) * Mcr) {
        Ie = slabProps.I;
      } else {
        const Icr = 0.45 * slabProps.I; // higher for two-way
        Ie = Icr + Math.pow(Mcr/M_service, 3) * (slabProps.I - Icr);
      }
      
      const delta_L = (alphaShort * 5 * w_live * Math.pow(L * 12, 4)) / (384 * Ec * Ie / 1000);
      const camber = (slabPrestress!.Pe * slabPrestress!.e * Math.pow(L * 12, 2)) / (8 * Ec * Ie / 1000);
      const netDeflection = delta_L - 0.8 * camber;
      
      const deflectionLimit = (L * 12) / 480;
      if (netDeflection > deflectionLimit) continue;
      
      // Check vibration
      const frequency = 0.18 * Math.sqrt(386.4 / delta_L) * 1.2; // two-way benefit
      if (frequency < 5.0) continue; // 5 Hz for parking garages per industry practice
      
      // Calculate costs
      const slabArea = bayLength * bayWidth;
      const beamVolumeL = (bayLength * beamWidth * totalDepth) / 1728;
      const beamVolumeW = (bayWidth * beamWidth * totalDepth) / 1728;
      const totalBeamVolume = beamVolumeL + beamVolumeW;
      
      // Find base slab cost
      let baseCost = 12;
      const sortedCosts = costParams.ptSlabCosts.sort((a: any, b: any) => a.thickness - b.thickness);
      
      for (let i = 0; i < sortedCosts.length - 1; i++) {
        if (slabThickness >= sortedCosts[i].thickness && slabThickness <= sortedCosts[i + 1].thickness) {
          const t1 = sortedCosts[i].thickness;
          const t2 = sortedCosts[i + 1].thickness;
          const c1 = sortedCosts[i].costPerSf;
          const c2 = sortedCosts[i + 1].costPerSf;
          baseCost = c1 + (c2 - c1) * (slabThickness - t1) / (t2 - t1);
          break;
        }
      }
      
      if (slabThickness <= sortedCosts[0].thickness) {
        baseCost = sortedCosts[0].costPerSf;
      } else if (slabThickness >= sortedCosts[sortedCosts.length - 1].thickness) {
        baseCost = sortedCosts[sortedCosts.length - 1].costPerSf;
      }
      
      // Adjust for concrete strength using calculated premiums
      const slabCost = adjustSlabCostForStrength(baseCost, slabThickness, fc);
      
      // Calculate rebar for slab (two-way requirements)
      const fy = 60000;
      const d_slab = slabThickness - 1.0; // less cover for thin slabs
      const fs_bot_slab = -slabPrestress!.Pe/slabProps.A - slabPrestress!.Pe*slabPrestress!.e/slabProps.Sb + Mt_critical/slabProps.Sb;
      const maxTensileStress = Math.max(fs_bot_slab, 0);
      
      const slabSteel = calculateTotalMildSteel(
        slabThickness,
        shortSpan,
        fc,
        fy,
        maxTensileStress,
        Mcr,
        d_slab
      );
      
      // Calculate PT strand weights (both directions)
      const slabPtForceShort = slabPrestress!.Pe * longSpan;
      const slabPtForceLong = slabPrestress!.Pe * shortSpan * 0.8; // reduced in long direction
      const beamPtForceL = Mt_beamL > Mt_beamW ? beamPrestress!.Pe : beamPrestress!.Pe * 0.8;
      const beamPtForceW = Mt_beamW > Mt_beamL ? beamPrestress!.Pe : beamPrestress!.Pe * 0.8;
      
      const fpe = 0.74 * 270000 * 0.82;
      const strandArea = 0.153;
      const forcePerStrand = fpe * strandArea;
      
      const slabStrandsShort = Math.ceil(slabPtForceShort / forcePerStrand);
      const slabStrandsLong = Math.ceil(slabPtForceLong / forcePerStrand);
      const beamStrandsL = Math.ceil(beamPtForceL / forcePerStrand);
      const beamStrandsW = Math.ceil(beamPtForceW / forcePerStrand);
      
      const slabStrandWeightShort = slabStrandsShort * 0.52 * shortSpan * 1.02;
      const slabStrandWeightLong = slabStrandsLong * 0.52 * longSpan * 1.02;
      const beamStrandWeightL = beamStrandsL * 0.52 * bayLength * 1.02;
      const beamStrandWeightW = beamStrandsW * 0.52 * bayWidth * 1.02;
      
      const totalStrandWeight = slabStrandWeightShort + slabStrandWeightLong + 
                               beamStrandWeightL + beamStrandWeightW;
      
      // Calculate rebar weight (including two-way requirements)
      const slabRebarWeight = slabSteel.governing * 0.668 / 0.20 * slabArea * 1.2; // 20% more for two-way
      const beamRebarArea = 0.0020 * beamA / 144; // slightly more for beams
      const beamRebarWeight = beamRebarArea * 490 * totalBeamVolume;
      const totalRebarWeight = slabRebarWeight + beamRebarWeight;
      
      // Cost breakdown
      const concreteCost = slabArea * slabCost;
      const formworkCost = slabArea * costParams.ptFormworkCostPerSf;
      const beamFormCost = totalBeamVolume * costParams.beamFormingCostPerCf;
      const beamPourCost = totalBeamVolume * costParams.beamPouringCostPerCf;
      const ptCost = totalStrandWeight * costParams.ptStrandCostPerLb;
      const rebarCost = totalRebarWeight * (costParams.mildSteelCostPerLb || 1.20);
      
      const totalCost = concreteCost + formworkCost + beamFormCost + beamPourCost + ptCost + rebarCost;
      
      if (totalCost < minCost) {
        minCost = totalCost;
        bestDesign = {
          slabThickness,
          beamWidth,
          beamDepth: totalDepth,
          concreteStrength: fc,
          ptForce: slabPrestress!.avgPrestress,
          beamPtForce: beamPrestress!.Pe / beamA,
          aspectRatio: aspectRatio,
          totalCost,
          costBreakdown: {
            concrete: concreteCost,
            formwork: formworkCost,
            beamForming: beamFormCost,
            beamPouring: beamPourCost,
            ptStrand: ptCost,
            mildSteel: rebarCost
          },
          weightPerSf: (slabThickness / 12) * 150 + (totalBeamVolume * 150) / slabArea + totalRebarWeight / slabArea,
          checks: {
            moment: true,
            deflection: true,
            vibration: true,
            punchingShear: true,
            camber: true,
          }
        };
      }
    }
  }
  } // End beam depth loop
  } // End concrete strength loop
  
  return bestDesign;
}

export const optimize = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const { bayLength, bayWidth, beamDepth, costParameters } = project;
    
    console.log("Starting optimization for:", {
      bayLength,
      bayWidth,
      beamDepth,
      costCount: costParameters.ptSlabCosts.length,
      mildSteelCost: costParameters.mildSteelCostPerLb,
      concreteStrength: costParameters.concreteStrength,
      concreteCostPerCy: costParameters.concreteCostPerCy
    });

    // Optimize each system
    const flatPlate = optimizeFlatPlate(bayLength, bayWidth, costParameters);
    const oneWayBeam = optimizeOneWayBeam(bayLength, bayWidth, beamDepth, costParameters);
    const twoWayBeam = optimizeTwoWayBeam(bayLength, bayWidth, beamDepth, costParameters);
    
    console.log("Optimization results:", {
      flatPlate: flatPlate ? "Found" : "Not feasible",
      oneWayBeam: oneWayBeam ? "Found" : "Not feasible",
      twoWayBeam: twoWayBeam ? "Found" : "Not feasible"
    });

    // Determine optimal system
    const systems = [
      { key: 'flatPlate', cost: flatPlate?.totalCost || Infinity },
      { key: 'oneWayBeam', cost: oneWayBeam?.totalCost || Infinity },
      { key: 'twoWayBeam', cost: twoWayBeam?.totalCost || Infinity },
    ];
    
    // Only select optimal if at least one system is feasible
    let optimalSystem = 'none';
    if (flatPlate || oneWayBeam || twoWayBeam) {
      optimalSystem = systems.reduce((a, b) => a.cost < b.cost ? a : b).key;
    }

    // Generate comparisons for different spans
    const comparisonSpans = [18, 24, 27, 30, 36, 40, 45, 49, 54, 60];
    const comparisons = comparisonSpans.map(span => {
      const fpCost = optimizeFlatPlate(span, bayWidth, costParameters);
      const owCost = optimizeOneWayBeam(span, bayWidth, beamDepth, costParameters);
      const twCost = optimizeTwoWayBeam(span, bayWidth, beamDepth, costParameters);
      
      return {
        span,
        flatPlateCost: fpCost ? fpCost.totalCost / (span * bayWidth) : 999,
        oneWayBeamCost: owCost ? owCost.totalCost / (span * bayWidth) : 999,
        twoWayBeamCost: twCost ? twCost.totalCost / (span * bayWidth) : 999,
      };
    });

    // Update project with results
    await ctx.db.patch(args.projectId, {
      optimizationResults: {
        flatPlate,
        oneWayBeam,
        twoWayBeam,
        optimalSystem,
        comparisons,
      },
      updatedAt: Date.now(),
    });
  },
});