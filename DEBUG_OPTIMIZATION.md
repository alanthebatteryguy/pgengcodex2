# Debugging Optimization Failures

## Issue
All optimization systems are returning "Not feasible" for all spans.

## Debug Approach

1. Added default values for optional parameters:
   - `mildSteelCostPerLb || 1.20`
   - This prevents NaN in calculations

2. Added debug counters to track why designs are failing:
   - `totalTried`: Total combinations attempted
   - `stressTransferFailed`: Failed initial stress checks
   - `stressServiceFailed`: Failed service stress checks
   - `minPrestressFailed`: Failed minimum prestress requirement
   - `momentCapacityFailed`: Insufficient moment capacity
   - `deflectionFailed`: Excessive deflection
   - `vibrationFailed`: Insufficient frequency
   - `punchingShearFailed`: Failed punching shear
   - `tensionControlFailed`: Not tension-controlled section

## To Run Debug

1. Check your browser console or Convex logs for output like:
   ```
   Starting optimization for: {
     bayLength: 30,
     bayWidth: 30,
     mildSteelCost: undefined,  // This would cause NaN
     concreteStrength: undefined,
     concreteCostPerCy: undefined
   }
   ```

2. Look for the debug output:
   ```
   Flat plate debug: {
     totalTried: 1000,
     stressTransferFailed: 500,
     // etc...
   }
   ```

## Potential Issues to Check

1. **Undefined Values**: If mildSteelCost, concreteStrength, or concreteCostPerCy are undefined, calculations will fail.

2. **Stress Sign Convention**: The code uses negative for compression, positive for tension. The checks might be backwards.

3. **Units**: Make sure all units are consistent (psi vs ksi, inches vs feet).

4. **Tendon Stress Calculation**: The new ACI formula might produce unrealistic fps values for low rho_p values.

5. **Net Deflection**: If camber > deflection, net could be negative, causing frequency calculation to fail.