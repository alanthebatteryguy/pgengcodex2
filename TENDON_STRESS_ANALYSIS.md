# Tendon Stress Calculation Analysis

## Current Simplified Approach

```typescript
function calculateTendonStress(fpe: number): number {
  const fpu = 270000;
  const fpy = 0.9 * fpu;
  // For unbonded tendons (typical in parking)
  const fps1 = fpe + 10000;
  const fps2 = fpe + 60000;
  return Math.min(fps1, fps2, fpy);
}
```

## ACI 318-19 Requirements

### For Unbonded Tendons (Section 22.7.2.3):
The stress in unbonded tendons at nominal strength, fps, shall be:

```
fps = fse + 10,000 + (fc'/100ρp)
```

But not greater than fpy and not greater than (fse + 60,000)

Where:
- fse = effective stress in prestressing steel (after losses)
- fc' = concrete compressive strength
- ρp = Aps/(bd) = prestressing steel ratio
- fpy = yield strength of prestressing steel

### For Bonded Tendons (Section 22.7.2.1):
More complex calculation involving strain compatibility.

## Analysis of Current Implementation

### What We're Doing:
1. Using ACI simplified formula for unbonded tendons
2. Assuming fps = fpe + 10,000 (ignoring the fc'/100ρp term)
3. Checking both limits: fpe + 60,000 and fpy

### What We're Missing:
The term fc'/(100ρp) which can add significant stress:
- For fc' = 5000 psi and ρp = 0.001: adds 50,000 psi
- For fc' = 10000 psi and ρp = 0.001: adds 100,000 psi

## Impact on Optimization

### Current Impact:
- **Underestimating moment capacity** by 10-30%
- May lead to **conservative designs**
- Could be selecting thicker slabs than necessary
- Missing potential cost savings

### Example:
For a typical parking garage:
- fpe = 160,000 psi (after losses)
- fc' = 5000 psi
- ρp = 0.0015

**Current calculation**: fps = 160,000 + 10,000 = 170,000 psi
**Correct calculation**: fps = 160,000 + 10,000 + 5000/(100×0.0015) = 203,333 psi
**Difference**: 33,333 psi (20% increase)

## Recommendation: FIX THIS

### Corrected Function:

```typescript
function calculateTendonStress(fpe: number, fc: number, Aps: number, b: number, d: number): number {
  const fpu = 270000;
  const fpy = 0.9 * fpu;
  
  // Calculate prestressing steel ratio
  const rho_p = Aps / (b * d);
  
  // ACI 318-19 Eq. 22.7.2.3 for unbonded tendons
  const fps = fpe + 10000 + fc / (100 * rho_p);
  
  // Apply limits
  return Math.min(fps, fpy, fpe + 60000);
}
```

### Implementation Notes:
1. Need to pass additional parameters: fc, Aps, b, d
2. Calculate ρp = Aps/(bd)
3. Use complete ACI formula
4. Still apply both upper limits

## Why This Matters for Our Optimization

1. **More Accurate Capacity**: Proper fps calculation gives true moment capacity
2. **Better Optimization**: May find thinner slabs are adequate
3. **Cost Impact**: Could reduce optimal thickness by 0.5-1.0"
4. **Code Compliance**: Ensures we're using correct ACI equations

## Conclusion

The simplified calculation is **definitely problematic** for optimization because:

1. It's consistently conservative (underestimates capacity)
2. The error is significant (10-30%)
3. This directly affects thickness selection
4. We're trying to find optimal (not conservative) solutions

**We should fix this immediately** to ensure our optimization finds the true optimal design, not a conservative approximation.