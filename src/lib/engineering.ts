// ACI 318-19 & IBC 2021 Structural Calculations for Post-Tensioned Parking Garages

import { SeismicParameters } from '../types';

export interface LoadCase {
  dead: number;
  live: number;
  seismic?: number;
}

export interface MaterialProperties {
  fc: number; // Concrete strength (psi)
  fpu: number; // PT strand ultimate strength (270 ksi typical)
  fy: number; // Mild steel yield (60 ksi)
  Ec: number; // Concrete modulus
}

export interface SlabDesign {
  thickness: number; // inches
  fc: number; // psi
  ptForce: number; // lbs/ft width
  mildSteelRatio: number;
  coverTop: number;
  coverBottom: number;
  bondedReinforcementRatio?: number; // ACI 8.6.1
  distributionSteelRatio?: number; // ACI 24.4.3.2
}

export interface BeamDesign {
  width: number; // inches
  depth: number; // inches (from top of slab)
  fc: number; // psi
  ptForce: number; // total force in lbs
  mildSteelArea: number; // sq in
}

// Material property calculations
export function getConcreteModulus(fc: number): number {
  return 57000 * Math.sqrt(fc); // ACI 318-19 Eq. 19.2.2.1
}

export function getCoverRequirement(fc: number): number {
  // ACI 318-19 Table 20.5.1.3.1 - reduced cover for higher strength
  if (fc >= 5000) return 1.5;
  if (fc >= 4000) return 1.75;
  return 2.0;
}

// Load calculations
export function getParkingLoads(spanLength: number): LoadCase {
  const selfWeight = 150; // pcf for normal weight concrete
  
  return {
    dead: selfWeight / 12, // psf per inch of thickness
    live: 40, // psf - current code for parking garages
  };
}

// Seismic calculations
export function calculateSeismicCoefficient(seismicParams: SeismicParameters): number {
  const Cs = seismicParams.sds / (seismicParams.responseModificationCoefficient / seismicParams.importanceFactor);
  const CsMin = 0.044 * seismicParams.sds * seismicParams.importanceFactor;
  const CsMax = seismicParams.sd1 / (seismicParams.responseModificationCoefficient / seismicParams.importanceFactor); // T would be needed for actual max
  
  return Math.max(Cs, CsMin);
}

export function getSeismicLoadFactor(seismicParams: SeismicParameters): number {
  // E = ρQE ± 0.2SDS*D
  // For simplified analysis, using ρ = 1.0
  return 0.2 * seismicParams.sds;
}

export function getWheelLoad(): { load: number; area: number } {
  return {
    load: 3000, // lbs
    area: 4.5 * 4.5, // sq in contact area
  };
}

// Moment calculations
export function calculateMoment(load: number, span: number, system: 'simple' | 'continuous'): number {
  if (system === 'simple') {
    return (load * span * span) / 8;
  } else {
    return (load * span * span) / 10; // Approximate for continuous
  }
}

// Calculate required prestress based on stress limits and load balancing
export function calculateRequiredPrestress(
  deadLoad: number, // psf
  liveLoad: number, // psf
  span: number, // ft
  thickness: number, // inches
  fc: number, // concrete strength at service
  fci: number, // concrete strength at transfer
  balanceRatio: number = 0.85 // typically balance 85% of dead load for parking
): { prestressForce: number; avgPrestress: number; isValid: boolean; limitingCase: string } {
  
  // Section properties (per foot width)
  const A = thickness * 12; // sq in
  const I = (12 * Math.pow(thickness, 3)) / 12; // in^4
  const St = I / (thickness/2); // in^3 (top)
  const Sb = St; // in^3 (bottom) - symmetric section
  
  // Eccentricity (assuming parabolic profile)
  const cover = getCoverRequirement(fc);
  const eccentricity = 0.8 * (thickness/2 - cover); // inches
  
  // Moments (in-lb per foot width)
  const Md = deadLoad * span * span * 12 / 8; // simple span
  const Ml = liveLoad * span * span * 12 / 8;
  const M_balance = balanceRatio * Md;
  
  // Initial prestress force to balance load
  let P = M_balance / eccentricity; // lbs per foot
  
  // Stress limits per ACI 318-19
  const fci_comp_limit = 0.60 * fci; // compression at transfer
  const fci_tens_limit = 3 * Math.sqrt(fci); // tension at transfer (no bonded reinf)
  const fc_comp_limit = 0.45 * fc; // compression at service (sustained)
  const fc_tens_limit = 6 * Math.sqrt(fc); // tension at service (Class T)
  
  // Check stresses at multiple stages
  let isValid = true;
  let limitingCase = "none";
  
  // 1. At transfer (no losses, self-weight only)
  const Pi = P / 0.82; // initial force (before 18% losses)
  const fti_top = -Pi/A - Pi*eccentricity/St + Md/St;
  const fti_bot = -Pi/A + Pi*eccentricity/Sb - Md/Sb;
  
  if (Math.abs(fti_top) > fci_comp_limit) {
    isValid = false;
    limitingCase = "compression at top during transfer";
  }
  if (fti_bot > fci_tens_limit) {
    isValid = false;
    limitingCase = "tension at bottom during transfer";
  }
  
  // 2. At service (with losses, all loads)
  const Pe = P; // effective prestress after losses
  const fs_top = -Pe/A - Pe*eccentricity/St + (Md + Ml)/St;
  const fs_bot = -Pe/A + Pe*eccentricity/Sb - (Md + Ml)/Sb;
  
  if (Math.abs(fs_top) > fc_comp_limit) {
    isValid = false;
    limitingCase = "compression at top at service";
  }
  if (fs_bot > fc_tens_limit) {
    isValid = false;
    limitingCase = "tension at bottom at service";
  }
  
  // 3. Check minimum prestress for serviceability
  const avgPrestress = P / A;
  if (avgPrestress < 125) {
    isValid = false;
    limitingCase = "minimum prestress for punching shear";
  }
  
  return {
    prestressForce: P,
    avgPrestress: avgPrestress,
    isValid: isValid,
    limitingCase: limitingCase
  };
}

// Calculate detailed prestress losses per ACI 318-19
export function calculatePrestressLosses(
  fpi: number, // initial prestress stress (psi)
  fc: number, // concrete strength at service
  fci: number, // concrete strength at transfer
  fcir: number, // concrete stress at cgc due to prestress at transfer
  fcds: number, // concrete stress at cgc due to dead load at service
  V_S: number, // volume to surface ratio (in)
  RH: number = 70 // relative humidity (%)
): { elasticShortening: number; creep: number; shrinkage: number; relaxation: number; total: number } {
  
  // Modulus of elasticity
  const Eps = 28500; // ksi for Grade 270 strand
  const Eci = 57000 * Math.sqrt(fci) / 1000; // ksi
  const Ec = 57000 * Math.sqrt(fc) / 1000; // ksi
  
  // 1. Elastic Shortening (ACI 18.6.2.3)
  const Kes = 0.5; // for post-tensioned members
  const elasticShortening = Kes * (Eps / Eci) * fcir;
  
  // 2. Creep (ACI 18.6.2.4)
  const Kcr = 2.0; // for normal weight concrete
  const creep = Kcr * (Eps / Ec) * (fcir - fcds);
  
  // 3. Shrinkage (ACI 18.6.2.5)
  const Ksh = 1.0; // for post-tensioned members
  const shrinkage = 8.2e-6 * Ksh * Eps * 1000 * (1 - 0.06 * V_S) * (100 - RH);
  
  // 4. Steel Relaxation (ACI 18.6.2.6)
  // For low-relaxation strand
  const fpy = 0.9 * 270; // ksi
  const Kre = 5000; // psi for low-relaxation strand
  const C = 0.9; // for low-relaxation strand
  const relaxation = fpi > 0.55 * fpy * 1000 ? 
    Kre * C * (Math.log10(24 * 100) / 10) * ((fpi / (fpy * 1000)) - 0.55) : 0;
  
  const total = elasticShortening + creep + shrinkage + relaxation;
  
  return {
    elasticShortening,
    creep,
    shrinkage,
    relaxation,
    total
  };
}

// Simplified loss calculation when detailed info not available
export function getEffectivePrestress(initialPrestress: number, fc: number): number {
  // More accurate estimates based on concrete strength
  let lossPercentage: number;
  
  if (fc <= 5000) {
    lossPercentage = 0.20; // 20% for normal strength
  } else if (fc <= 7000) {
    lossPercentage = 0.18; // 18% for 7ksi
  } else if (fc <= 10000) {
    lossPercentage = 0.16; // 16% for 10ksi
  } else {
    lossPercentage = 0.15; // 15% for 15ksi (less creep/shrinkage)
  }
  
  return initialPrestress * (1 - lossPercentage);
}

// Calculate stress in PT strands per ACI 318-19
export function calculateTendonStress(
  fpe: number, // effective prestress after losses
  fc: number, // concrete strength
  rho_p: number, // prestressed reinforcement ratio
  bonded: boolean = false // unbonded typical for parking
): number {
  const fpu = 270000; // Grade 270 strand
  const fpy = 0.9 * fpu; // yield strength
  
  if (bonded) {
    // ACI 318-19 Eq. 20.3.2.3.1
    const fps = fpe + 10000 + fc / (100 * rho_p);
    return Math.min(fps, fpy);
  } else {
    // ACI 318-19 Eq. 20.3.2.3.2 for unbonded
    const fps1 = fpe + 10000;
    const fps2 = fpe + 60000;
    return Math.min(fps1, fps2, fpy);
  }
}

// Calculate minimum temperature/shrinkage reinforcement per ACI 7.6.1
export function calculateTemperatureShrinkageSteel(
  thickness: number, // slab thickness in inches
  fy: number = 60000 // yield strength of rebar (psi)
): { ratio: number; area: number; spacing: number } {
  // ACI 7.6.1.1 - minimum ratios
  let minRatio: number;
  
  if (fy === 40000 || fy === 50000) {
    minRatio = 0.0020;
  } else if (fy === 60000) {
    minRatio = 0.0018;
  } else if (fy >= 75000) {
    minRatio = 0.0018 * 60000 / fy;
  } else {
    // Interpolate for other grades
    minRatio = 0.0018 * 60000 / fy;
  }
  
  // Area per foot width
  const As = minRatio * thickness * 12; // sq in per foot
  
  // Maximum spacing per ACI 7.6.1.2
  const maxSpacing1 = 5 * thickness;
  const maxSpacing2 = 18; // inches
  const maxSpacing = Math.min(maxSpacing1, maxSpacing2);
  
  return {
    ratio: minRatio,
    area: As,
    spacing: maxSpacing
  };
}

// Calculate minimum bonded reinforcement for PT members per ACI 8.6.1
export function calculateMinimumBondedReinforcement(
  Mcr: number, // cracking moment (in-lb)
  fy: number, // yield strength of rebar (psi)
  d: number, // effective depth (inches)
  width: number = 12 // width for calculation (inches)
): number {
  // ACI 8.6.1.1 - As,min = Mcr / (1.2 * fy * d)
  const As_min = Mcr / (1.2 * fy * d);
  
  // But not less than temperature/shrinkage steel
  const tempShrink = calculateTemperatureShrinkageSteel(d + 1.5, fy);
  
  return Math.max(As_min, tempShrink.area);
}

// Calculate reinforcement for two-way PT slabs per ACI 24.4.3
export function calculateTwoWayPTReinforcement(
  span1: number, // shorter span (ft)
  span2: number, // longer span (ft)
  thickness: number, // slab thickness (inches)
  fc: number, // concrete strength (psi)
  fy: number = 60000, // rebar yield (psi)
  tensileStress: number = 0 // max tensile stress under service loads (psi)
): { negMoment: number; distribution: number; total: number } {
  
  // ACI 24.4.3.2 - Negative moment reinforcement
  // As = 0.00075 * h * l2
  const l2 = Math.max(span1, span2) * 12; // longer span in inches
  const As_neg = 0.00075 * thickness * l2; // sq in
  
  // ACI 24.4.3.4 - If tensile stress exceeds 2√f'c
  let additionalAs = 0;
  if (tensileStress > 2 * Math.sqrt(fc)) {
    // Need bonded reinforcement
    const ft = tensileStress;
    const Nc = ft * thickness * 12; // tensile force per foot
    additionalAs = Nc / (0.5 * fy); // half at each face
  }
  
  // Distribution reinforcement
  const tempShrink = calculateTemperatureShrinkageSteel(thickness, fy);
  
  return {
    negMoment: As_neg,
    distribution: tempShrink.area,
    total: Math.max(As_neg + additionalAs, tempShrink.area)
  };
}

// Calculate total mild steel requirements
export function calculateTotalMildSteel(
  thickness: number,
  span: number,
  fc: number,
  fy: number,
  serviceStress: number, // max tensile stress
  Mcr: number, // cracking moment
  d: number // effective depth
): { 
  tempShrinkage: number;
  bonded: number;
  twoWay: number;
  governing: number;
  governingCase: string;
} {
  // 1. Temperature/shrinkage steel
  const tempShrink = calculateTemperatureShrinkageSteel(thickness, fy);
  
  // 2. Minimum bonded reinforcement
  const bonded = calculateMinimumBondedReinforcement(Mcr, fy, d);
  
  // 3. Two-way slab requirements
  const twoWay = calculateTwoWayPTReinforcement(span, span, thickness, fc, fy, serviceStress);
  
  // Determine governing case
  let governing = tempShrink.area;
  let governingCase = "temperature/shrinkage";
  
  if (bonded > governing) {
    governing = bonded;
    governingCase = "minimum bonded (ACI 8.6.1)";
  }
  
  if (twoWay.total > governing) {
    governing = twoWay.total;
    governingCase = "two-way PT slab (ACI 24.4.3)";
  }
  
  return {
    tempShrinkage: tempShrink.area,
    bonded: bonded,
    twoWay: twoWay.total,
    governing: governing,
    governingCase: governingCase
  };
}

export function calculateMomentCapacity(
  slab: SlabDesign,
  effectiveWidth: number,
  materials: MaterialProperties
): number {
  const d = slab.thickness - slab.coverBottom - 0.5; // Effective depth
  
  // Calculate actual stress in PT strands
  const fpe = getEffectivePrestress(slab.ptForce / (slab.thickness * 12)) * slab.thickness * 12; // force after losses
  const Aps = fpe / (0.74 * materials.fpu); // Area based on effective prestress
  const rho_p = Aps / (effectiveWidth * d);
  const fps = calculateTendonStress(0.74 * materials.fpu, slab.fc, rho_p, false); // unbonded
  
  // Calculate depth of compression block
  const a = (Aps * fps + slab.mildSteelRatio * effectiveWidth * d * materials.fy) / 
            (0.85 * slab.fc * effectiveWidth);
  
  // Check if a is within limits
  const beta1 = slab.fc <= 4000 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (slab.fc - 4000) / 1000);
  const c = a / beta1; // neutral axis depth
  
  // Nominal moment capacity
  const Mn = Aps * fps * (d - a/2) + 
             slab.mildSteelRatio * effectiveWidth * d * materials.fy * (d - a/2);
  
  return 0.9 * Mn / 12000; // φMn in ft-kips
}

// Deflection calculations per ACI 318-19 Ch 24
export function calculateDeflection(
  moment: number,
  span: number,
  Ec: number,
  Ig: number,
  fc: number,
  thickness: number
): number {
  // Calculate cracking moment
  const fr = 7.5 * Math.sqrt(fc); // modulus of rupture, psi
  const yt = thickness / 2; // distance to extreme tension fiber
  const Mcr = (fr * Ig) / yt; // in-lb
  
  // Calculate effective moment of inertia per ACI 318-19
  let Ie;
  if (moment <= (2/3) * Mcr) {
    Ie = Ig; // uncracked
  } else {
    // For PT slabs, Icr is approximately 0.25*Ig
    const Icr = 0.25 * Ig;
    Ie = Icr + Math.pow(Mcr/moment, 3) * (Ig - Icr);
  }
  
  // Deflection in inches
  return (5 * moment * span * span * 144) / (48 * Ec * Ie);
}

export function checkDeflectionLimit(deflection: number, span: number): boolean {
  const limit = span * 12 / 480; // L/480 for parking garage floors per ACI Table 24.2.2
  return deflection <= limit;
}

// Vibration check
export function calculateNaturalFrequency(deflection: number): number {
  return 0.18 * Math.sqrt(386.4 / deflection); // Hz
}

export function checkVibration(frequency: number): boolean {
  return frequency >= 8.0; // 8 Hz minimum for parking
}

// Punching shear calculations - ACI 318-19 Ch 22.6
export function calculatePunchingShear(
  load: number,
  slabThickness: number,
  fc: number,
  bo: number, // Perimeter at d/2 from load
  effectivePrestress: number = 0
): { vu: number; vc: number; ratio: number } {
  const d = slabThickness - 1.5; // Effective depth (more accurate)
  const beta = 1.0; // For square columns/loads
  
  // Size effect factor per ACI 22.5.5.1.3
  const lambda_s = Math.min(Math.sqrt(2/(1 + 0.004*d)), 1.0);
  
  // ACI 318-19 Eq. 22.6.5.2 - all three equations
  const alpha_s = 40; // for interior columns
  const vc1 = (2 + 4/beta) * lambda_s * Math.sqrt(fc);
  const vc2 = (alpha_s * d / bo + 2) * lambda_s * Math.sqrt(fc);
  const vc3 = 4 * lambda_s * Math.sqrt(fc);
  
  // Take minimum
  let vcNominal = Math.min(vc1, vc2, vc3);
  
  // Add prestress contribution (must have min 125 psi)
  if (effectivePrestress >= 125) {
    vcNominal += 0.3 * effectivePrestress;
  }
  
  const phi = 0.75;
  const vcDesign = phi * vcNominal;
  
  const vu = load / (bo * d);
  
  return {
    vu,
    vc: vcDesign,
    ratio: vu / vcDesign
  };
}

// Camber calculations for PT
export function calculateCamber(
  ptForce: number,
  eccentricity: number,
  span: number,
  Ec: number,
  Ig: number
): number {
  return (ptForce * eccentricity * span * span * 144) / (8 * Ec * Ig);
}

export function checkCamberLimit(camber: number, span: number): boolean {
  const limit = span * 12 / 300; // L/300 max camber
  return camber <= limit;
}

// ACI 318-19 Mild Steel Reinforcement Requirements for PT Slabs

// ACI 7.6.1 - Minimum Temperature and Shrinkage Reinforcement
export function calculateTemperatureShrinkageSteel(
  thickness: number, // inches
  fy: number = 60000 // psi
): { ratio: number; spacing: number; barSize: string } {
  // ACI Table 7.6.1.1 - minimum ratios
  let minRatio: number;
  
  if (fy === 40000) {
    minRatio = 0.0020;
  } else if (fy === 60000) {
    minRatio = 0.0018;
  } else if (fy >= 75000) {
    minRatio = 0.0018 * 60000 / fy; // but not less than 0.0014
    minRatio = Math.max(minRatio, 0.0014);
  } else {
    // Interpolate
    minRatio = 0.0018 * 60000 / fy;
  }
  
  // Calculate required area per foot width
  const As_required = minRatio * 12 * thickness; // sq in per foot
  
  // Determine bar size and spacing
  // Common sizes: #3 (0.11 sq in), #4 (0.20 sq in), #5 (0.31 sq in)
  let barSize: string;
  let barArea: number;
  let spacing: number;
  
  if (As_required <= 0.22) {
    barSize = "#3";
    barArea = 0.11;
  } else if (As_required <= 0.40) {
    barSize = "#4";
    barArea = 0.20;
  } else {
    barSize = "#5";
    barArea = 0.31;
  }
  
  spacing = Math.floor((barArea / As_required) * 12); // inches
  
  // ACI 7.6.5 - Maximum spacing
  const maxSpacing = Math.min(5 * thickness, 18); // inches
  spacing = Math.min(spacing, maxSpacing);
  
  return {
    ratio: minRatio,
    spacing: spacing,
    barSize: barSize
  };
}

// ACI 8.6.1 - Minimum Bonded Reinforcement for PT Members
export function calculateMinimumBondedReinforcement(
  Mcr: number, // Cracking moment (in-lb)
  d: number, // Effective depth (inches)
  fy: number = 60000 // psi
): { As_min: number; ratio: number } {
  // ACI 8.6.1.1 - As,min = 0.004 * Act
  // where Act = area of concrete in tension at service loads
  
  // Alternative equation per ACI 8.6.1.1
  // As,min = Mcr / (1.2 * fy * d)
  const As_min = Mcr / (1.2 * fy * d);
  
  // Convert to ratio
  const ratio = As_min / (12 * d); // per foot width
  
  // But not less than temperature/shrinkage steel
  const tempShrink = calculateTemperatureShrinkageSteel(d + 1.5, fy);
  const finalRatio = Math.max(ratio, tempShrink.ratio);
  
  return {
    As_min: finalRatio * 12 * d,
    ratio: finalRatio
  };
}

// ACI 24.4.3 - Minimum Reinforcement for Two-Way PT Slabs
export function calculateTwoWayPTReinforcement(
  span: number, // ft
  thickness: number, // inches
  fc: number, // psi
  avgPrestress: number, // psi
  momentCoeff: number = 0.125 // wL²/8 for simple support
): {
  negativeMomentSteel: { As: number; ratio: number; location: string };
  distributionSteel: { As: number; ratio: number; spacing: number };
  totalSteelRatio: number;
} {
  const d = thickness - 1.5; // effective depth
  const fy = 60000; // Grade 60 steel
  
  // ACI 24.4.3.2 - Negative moment reinforcement
  // Required at column lines in each direction
  // As = 0.00075 * h * l₂ for unbonded tendons
  const l2 = span * 12; // inches
  const As_neg = 0.00075 * thickness * l2; // sq in per foot width
  const negRatio = As_neg / (12 * d);
  
  // Location: within 1.5h from face of support
  const negLocation = `Within ${1.5 * thickness} inches from support`;
  
  // ACI 24.4.3.3 - Distribution reinforcement
  // Perpendicular to tendons, minimum per 7.6.1
  const tempShrink = calculateTemperatureShrinkageSteel(thickness, fy);
  
  // In high moment regions, may need more
  const loads = { dead: 12.5 * thickness, live: 40 }; // psf
  const totalLoad = loads.dead + loads.live;
  const Mu = momentCoeff * totalLoad * span * span * 12; // in-lb/ft
  
  // Check if prestress alone is adequate
  const fr = 7.5 * Math.sqrt(fc); // modulus of rupture
  const S = 12 * thickness * thickness / 6; // section modulus per foot
  const fpc = avgPrestress; // average compression from PT
  
  // Stress at bottom fiber under total load
  const fb = -fpc + Mu / S;
  
  let distributionRatio = tempShrink.ratio;
  if (fb > 0.5 * fr) {
    // Need additional bonded reinforcement for crack control
    // Use 0.004 * Act where Act is tension area
    const tensionDepth = thickness * fb / (fb + fpc);
    const Act = 12 * tensionDepth; // sq in per foot
    distributionRatio = Math.max(0.004 * Act / (12 * d), tempShrink.ratio);
  }
  
  const As_dist = distributionRatio * 12 * d;
  const distSpacing = Math.min(5 * thickness, 18); // max spacing
  
  return {
    negativeMomentSteel: {
      As: As_neg,
      ratio: negRatio,
      location: negLocation
    },
    distributionSteel: {
      As: As_dist,
      ratio: distributionRatio,
      spacing: distSpacing
    },
    totalSteelRatio: negRatio + distributionRatio
  };
}

// Calculate total mild steel requirement based on all criteria
export function calculateTotalMildSteel(
  slab: SlabDesign,
  span: number,
  systemType: 'flatPlate' | 'oneWayBeam' | 'twoWayBeam',
  materials: MaterialProperties
): {
  temperatureShrinkage: { ratio: number; As: number };
  bondedReinforcement: { ratio: number; As: number };
  distributionSteel: { ratio: number; As: number };
  negativeMomentSteel?: { ratio: number; As: number };
  governingRatio: number;
  governingCase: string;
  totalWeight: number; // lbs per sf
  costImpact: number; // $/sf at $1.20/lb installed
} {
  const d = slab.thickness - slab.coverBottom - 0.5;
  
  // 1. Temperature and shrinkage steel (ACI 7.6.1)
  const tempShrink = calculateTemperatureShrinkageSteel(slab.thickness, materials.fy);
  const As_temp = tempShrink.ratio * 12 * d;
  
  // 2. Calculate cracking moment for bonded reinforcement check
  const fr = 7.5 * Math.sqrt(slab.fc);
  const Ig = (12 * Math.pow(slab.thickness, 3)) / 12;
  const yt = slab.thickness / 2;
  const Mcr = (fr * Ig) / yt;
  
  const bondedReq = calculateMinimumBondedReinforcement(Mcr, d, materials.fy);
  
  // 3. System-specific requirements
  let distSteel = { ratio: 0, As: 0 };
  let negSteel = undefined;
  
  if (systemType === 'twoWayBeam') {
    const avgPrestress = slab.ptForce / slab.thickness;
    const twoWayReq = calculateTwoWayPTReinforcement(
      span,
      slab.thickness,
      slab.fc,
      avgPrestress
    );
    distSteel = {
      ratio: twoWayReq.distributionSteel.ratio,
      As: twoWayReq.distributionSteel.As
    };
    negSteel = {
      ratio: twoWayReq.negativeMomentSteel.ratio,
      As: twoWayReq.negativeMomentSteel.As
    };
  } else {
    // For one-way systems, distribution steel perpendicular to span
    distSteel = { ratio: tempShrink.ratio, As: As_temp };
  }
  
  // 4. Determine governing requirement
  const requirements = [
    { name: "Temperature/Shrinkage (ACI 7.6.1)", ratio: tempShrink.ratio },
    { name: "Bonded Reinforcement (ACI 8.6.1)", ratio: bondedReq.ratio },
    { name: "Distribution Steel", ratio: distSteel.ratio }
  ];
  
  if (negSteel) {
    requirements.push({ name: "Negative Moment Steel (ACI 24.4.3)", ratio: negSteel.ratio });
  }
  
  const governing = requirements.reduce((max, curr) => 
    curr.ratio > max.ratio ? curr : max
  );
  
  // 5. Calculate weight and cost impact
  // Mild steel weight = 490 pcf = 3.4 lb/ft per #4 bar
  const totalRatio = systemType === 'twoWayBeam' 
    ? Math.max(governing.ratio, (negSteel?.ratio || 0) + distSteel.ratio)
    : governing.ratio * 2; // top and bottom for temp/shrinkage
    
  const steelWeight = totalRatio * 12 * slab.thickness * 490 / 144; // lbs per sf
  const costImpact = steelWeight * 1.20; // $1.20/lb installed
  
  return {
    temperatureShrinkage: { ratio: tempShrink.ratio, As: As_temp },
    bondedReinforcement: { ratio: bondedReq.ratio, As: bondedReq.As_min },
    distributionSteel: distSteel,
    negativeMomentSteel: negSteel,
    governingRatio: governing.ratio,
    governingCase: governing.name,
    totalWeight: steelWeight,
    costImpact: costImpact
  };
}

// Analyze how rebar requirements change with PT and concrete strength
export function analyzeRebarOptimization(
  span: number,
  thickness: number,
  ptLevels: number[], // Array of average prestress values to test
  fcLevels: number[] // Array of concrete strengths to test
): {
  results: Array<{
    fc: number;
    avgPrestress: number;
    mildSteelRatio: number;
    totalCostPerSf: number;
    ptCostPerSf: number;
    rebarCostPerSf: number;
    concretePremium: number;
  }>;
  optimal: {
    fc: number;
    avgPrestress: number;
    reason: string;
  };
} {
  const results: any[] = [];
  const materials: MaterialProperties = {
    fc: 0, // will be set in loop
    fpu: 270000,
    fy: 60000,
    Ec: 0
  };
  
  for (const fc of fcLevels) {
    materials.fc = fc;
    materials.Ec = getConcreteModulus(fc);
    
    for (const avgPrestress of ptLevels) {
      const slab: SlabDesign = {
        thickness,
        fc,
        ptForce: avgPrestress * thickness,
        mildSteelRatio: 0, // will be calculated
        coverTop: getCoverRequirement(fc),
        coverBottom: getCoverRequirement(fc)
      };
      
      // Calculate required mild steel
      const steelReq = calculateTotalMildSteel(slab, span, 'flatPlate', materials);
      slab.mildSteelRatio = steelReq.governingRatio;
      
      // Cost calculations
      // PT cost: Based on force and strand weight
      const ptForceTotal = avgPrestress * thickness * 12; // lbs per foot
      const strandWeight = (ptForceTotal / (0.74 * 270000)) * 0.153 * 490; // lbs/ft
      const ptCostPerSf = strandWeight * 3.50 / 12; // $3.50/lb installed
      
      // Concrete premium for high strength
      let concretePremium = 0;
      if (fc === 7000) concretePremium = 0.35; // $/sf for 7" slab
      else if (fc === 10000) concretePremium = 0.70;
      else if (fc === 15000) concretePremium = 1.40;
      
      // Total cost
      const totalCost = ptCostPerSf + steelReq.costImpact + concretePremium;
      
      results.push({
        fc,
        avgPrestress,
        mildSteelRatio: slab.mildSteelRatio,
        totalCostPerSf: totalCost,
        ptCostPerSf,
        rebarCostPerSf: steelReq.costImpact,
        concretePremium
      });
    }
  }
  
  // Find optimal combination
  const optimal = results.reduce((best, curr) => 
    curr.totalCostPerSf < best.totalCostPerSf ? curr : best
  );
  
  let reason = "Optimal balance between ";
  if (optimal.avgPrestress > 200) {
    reason += "high PT reducing rebar needs";
  } else if (optimal.fc > 5000) {
    reason += "high strength concrete allowing less cover and reinforcement";
  } else {
    reason += "moderate PT and standard concrete strength";
  }
  
  return {
    results,
    optimal: {
      fc: optimal.fc,
      avgPrestress: optimal.avgPrestress,
      reason
    }
  };
}

// Analyze rebar vs PT optimization
export function analyzeRebarOptimization(
  thickness: number,
  span: number,
  fc: number,
  prestressLevel: number, // average prestress psi
  serviceStress: number // max tensile stress
): {
  rebarRatio: number;
  rebarArea: number; // sq in per foot
  rebarWeight: number; // lbs per sq ft
  ptReduction: number; // % reduction in rebar due to PT
} {
  const fy = 60000; // Grade 60 rebar
  const d = thickness - 1.5;
  
  // Calculate cracking moment
  const I = (12 * Math.pow(thickness, 3)) / 12;
  const fr = 7.5 * Math.sqrt(fc);
  const yt = thickness / 2;
  const Mcr = (fr * I) / yt;
  
  // Get rebar requirements
  const steel = calculateTotalMildSteel(thickness, span, fc, fy, serviceStress, Mcr, d);
  
  // Calculate how much PT reduces rebar needs
  let reductionFactor = 1.0;
  
  // Higher prestress reduces tensile stress, reducing bonded reinforcement needs
  if (serviceStress < 2 * Math.sqrt(fc)) {
    reductionFactor = 0.5; // Significant reduction when no tension
  } else if (serviceStress < 6 * Math.sqrt(fc)) {
    reductionFactor = 0.7; // Moderate reduction
  }
  
  // Rebar weight (0.668 lb/ft for #4 bar)
  const rebarArea = steel.governing;
  const rebarRatio = rebarArea / (12 * d);
  const barsPerFoot = rebarArea / 0.20; // #4 bars
  const rebarWeight = barsPerFoot * 0.668; // lbs per foot width
  
  return {
    rebarRatio: rebarRatio,
    rebarArea: rebarArea,
    rebarWeight: rebarWeight,
    ptReduction: (1 - reductionFactor) * 100
  };
}

// Cost calculations including rebar
export function calculateSlabCost(
  area: number,
  thickness: number,
  ptForce: number,
  rebarWeight: number, // lbs per sq ft
  costParams: any
): number {
  // Find appropriate slab cost
  const slabCost = costParams.ptSlabCosts.find(
    (c: any) => c.thickness === thickness
  )?.costPerSf || 0;
  
  // PT strand weight: approximately 0.52 lb/ft for 0.5" strand
  const strandWeight = (ptForce / 150) * 0.52; // lbs per ft width
  const totalStrandWeight = strandWeight * area;
  
  // Rebar cost (assuming $1.20/lb installed)
  const rebarCostPerLb = 1.20;
  const totalRebarWeight = rebarWeight * area;
  
  const concreteCost = area * slabCost;
  const formworkCost = area * costParams.ptFormworkCostPerSf;
  const ptCost = totalStrandWeight * costParams.ptStrandCostPerLb;
  const rebarCost = totalRebarWeight * rebarCostPerLb;
  
  return concreteCost + formworkCost + ptCost + rebarCost;
}

export function calculateBeamCost(
  length: number,
  width: number,
  depth: number,
  costParams: any
): number {
  const volume = (length * width * depth) / 1728; // cubic feet
  const formingCost = volume * costParams.beamFormingCostPerCf;
  const pouringCost = volume * costParams.beamPouringCostPerCf;
  
  return formingCost + pouringCost;
}

// Optimization functions
export function optimizeFlatPlate(
  bayLength: number,
  bayWidth: number,
  costParams: any
): any {
  let bestDesign = null;
  let minCost = Infinity;
  
  const materials: MaterialProperties = {
    fc: 4000,
    fpu: 270000,
    fy: 60000,
    Ec: 0
  };
  
  // Try different combinations
  for (let fc = 4000; fc <= 6000; fc += 500) {
    materials.fc = fc;
    materials.Ec = getConcreteModulus(fc);
    
    for (let thickness = 5; thickness <= 12; thickness += 0.5) {
      for (let avgPrestress = 125; avgPrestress <= 300; avgPrestress += 25) {
        const ptForce = avgPrestress * thickness;
        
        const design: SlabDesign = {
          thickness,
          fc,
          ptForce,
          mildSteelRatio: 0.0018, // Minimum
          coverTop: getCoverRequirement(fc),
          coverBottom: getCoverRequirement(fc),
        };
        
        // Check all limit states
        const loads = getParkingLoads(bayLength);
        const totalLoad = loads.dead * thickness + loads.live;
        const moment = calculateMoment(totalLoad, bayLength, 'continuous');
        const capacity = calculateMomentCapacity(design, 12, materials);
        
        if (moment > capacity) continue;
        
        // Check deflection
        const Ig = (12 * Math.pow(thickness, 3)) / 12;
        const deflection = calculateDeflection(moment * 12000, bayLength, materials.Ec, Ig);
        if (!checkDeflectionLimit(deflection, bayLength)) continue;
        
        // Check vibration
        const frequency = calculateNaturalFrequency(deflection);
        if (!checkVibration(frequency)) continue;
        
        // Check punching shear
        const wheelLoad = getWheelLoad();
        const bo = 4 * (thickness - 2 + 4.5);
        const punchingShear = calculatePunchingShear(
          wheelLoad.load,
          thickness,
          fc,
          bo,
          avgPrestress
        );
        if (punchingShear.ratio > 1.0) continue;
        
        // Check camber
        const camber = calculateCamber(ptForce, thickness/2 - 2, bayLength, materials.Ec, Ig);
        if (!checkCamberLimit(camber, bayLength)) continue;
        
        // Calculate required mild steel
        const steelReq = calculateTotalMildSteel(design, bayLength, 'flatPlate', materials);
        design.mildSteelRatio = steelReq.governingRatio;
        
        // Calculate cost including rebar
        const baseCost = calculateSlabCost(bayLength * bayWidth, thickness, ptForce, costParams);
        const rebarCost = steelReq.costImpact * bayLength * bayWidth;
        const totalCost = baseCost + rebarCost;
        
        if (totalCost < minCost) {
          minCost = totalCost;
          bestDesign = {
            slabThickness: thickness,
            concreteStrength: fc,
            ptForce: avgPrestress,
            mildSteelRatio: design.mildSteelRatio,
            mildSteelDetails: {
              governingCase: steelReq.governingCase,
              ratio: steelReq.governingRatio,
              weightPerSf: steelReq.totalWeight,
              costPerSf: steelReq.costImpact
            },
            totalCost: totalCost,
            costBreakdown: {
              concrete: baseCost - (ptForce / 150) * 0.52 * bayLength * bayWidth * costParams.ptStrandCostPerLb,
              ptStrand: (ptForce / 150) * 0.52 * bayLength * bayWidth * costParams.ptStrandCostPerLb,
              mildSteel: rebarCost
            },
            weightPerSf: (thickness / 12) * 150 + steelReq.totalWeight,
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
  
  return bestDesign;
}