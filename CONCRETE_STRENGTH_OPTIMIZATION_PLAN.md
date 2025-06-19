# Concrete Strength Optimization Implementation Plan

## Concrete Cost Curve Implementation

### Cost Structure
Based on the provided data:
- Base cost: $220/cy for 5000 psi
- Premium: $15/cy per 1000 psi from 5000-12000 psi  
- Premium: $26/cy per 1000 psi above 12000 psi

### Calculated Costs
| Strength | Calculation | Total Cost/cy |
|----------|-------------|---------------|
| 5000 psi | $220 (base) | $220 |
| 7000 psi | $220 + (2 × $15) | $250 |
| 10000 psi | $220 + (5 × $15) | $295 |
| 12000 psi | $220 + (7 × $15) | $325 |
| 15000 psi | $220 + (7 × $15) + (3 × $26) | $403 |

## Implementation Strategy

### 1. Update Cost Calculation Function

```typescript
function getConcreteBaseCost(fc: number): number {
  const baseCost = 220; // 5000 psi base
  
  if (fc <= 5000) return baseCost;
  
  // Premium up to 12000 psi
  const strengthOver5000 = Math.min(fc - 5000, 7000);
  const premiumTo12000 = (strengthOver5000 / 1000) * 15;
  
  // Additional premium above 12000 psi
  let premiumAbove12000 = 0;
  if (fc > 12000) {
    const strengthOver12000 = fc - 12000;
    premiumAbove12000 = (strengthOver12000 / 1000) * 26;
  }
  
  return baseCost + premiumTo12000 + premiumAbove12000;
}
```

### 2. Modify Slab Cost Adjustment

Current function `adjustSlabCostForStrength` uses user-provided premiums. We'll update to use calculated values:

```typescript
function adjustSlabCostForStrength(
  baseCost: number,
  thickness: number,
  fc: number,
  baseStrength: number = 5000
): number {
  // Base slab cost includes 5000 psi concrete
  // Need to adjust for different strength
  
  const volumePerSf = thickness / 12 / 27; // cubic yards per sf
  
  const baseConcreteCost = getConcreteBaseCost(baseStrength);
  const actualConcreteCost = getConcreteBaseCost(fc);
  const costDifference = actualConcreteCost - baseConcreteCost;
  
  return baseCost + (volumePerSf * costDifference);
}
```

### 3. Optimization Loop Modification

```typescript
function optimizeFlatPlate(bayLength: number, bayWidth: number, costParams: any): any {
  let bestDesign = null;
  let minCost = Infinity;
  
  // Concrete strengths to explore
  const concreteStrengths = [5000, 7000, 10000, 12000, 15000];
  
  for (const fc of concreteStrengths) {
    // Skip ultra-high strength for very short spans
    if (fc > 10000 && bayLength < 30) continue;
    if (fc > 12000 && bayLength < 40) continue;
    
    const fci = 0.7 * fc;
    const Ec = getConcreteModulus(fc);
    const limits = getStressLimits(fc, fci);
    
    // Benefits of higher strength:
    // 1. Higher allowable stresses
    // 2. Thinner possible sections
    // 3. Better deflection control (higher Ec)
    // 4. Reduced prestress losses
    
    // Continue with thickness optimization...
  }
}
```

## Cost-Benefit Analysis

### Example: 36' Span Flat Plate

**5000 psi Design:**
- Required thickness: 10"
- Concrete volume: 36 × 36 × (10/12) / 27 = 40 cy
- Concrete cost: 40 × $220 = $8,800
- Total slab cost: ~$23/sf

**10000 psi Design:**
- Required thickness: 8" (20% reduction)
- Concrete volume: 36 × 36 × (8/12) / 27 = 32 cy
- Concrete cost: 32 × $295 = $9,440
- Concrete premium: $640
- But saves: 2" × $23/sf × 1296 sf = $59,616 in total system cost
- Net savings: ~$5,000 (17%)

## Benefits of Higher Strength Concrete

1. **Reduced Thickness**
   - Less dead load → less prestress required
   - Reduced building height → shorter ramps
   - Less concrete volume despite higher unit cost

2. **Better Stress Limits**
   - fc = 5000: Compression limit = 3000 psi
   - fc = 10000: Compression limit = 6000 psi
   - Allows more efficient prestress use

3. **Improved Stiffness**
   - Ec(5000) = 4,030,000 psi
   - Ec(10000) = 5,700,000 psi
   - 41% increase in stiffness

4. **Reduced Prestress Losses**
   - 5000 psi: 20% losses
   - 10000 psi: 16% losses
   - 15000 psi: 15% losses

## When Higher Strength is Most Valuable

1. **Longer spans** (> 30 ft)
   - Deflection often controls
   - Higher Ec very beneficial

2. **Strict depth limits**
   - When floor-to-floor height is constrained
   - Premium worth paying for thinner slab

3. **High sustained loads**
   - Better creep characteristics
   - Lower long-term deflections

4. **Seismic zones**
   - Higher strength = better ductility
   - Reduced mass beneficial

## Implementation Priority

1. **Phase 1**: Add concrete strength loop with proper cost calculation
2. **Phase 2**: Extend load balancing range to 0.3-1.0
3. **Phase 3**: Consider mild refinements to other parameters

This focused approach targets the highest-value improvements while avoiding unnecessary complexity.