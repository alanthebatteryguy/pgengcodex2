# Post-Tensioned Parking Garage Optimization Review

## Current Issues Identified

### 1. Prestress Levels
- **Current**: 125 psi minimum
- **Should be**: 175 psi for parking structures (ACI 362.1R Zone II/III)
- **Status**: FIXED

### 2. Vibration Frequency
- **Was**: 8 Hz (too conservative)
- **Changed to**: 3 Hz (too lenient)
- **Should be**: 5 Hz for parking garages
- **Status**: FIXED

### 3. Tension-Controlled Limit (c/d ≤ 0.375)
- **Issue**: This is for reinforced concrete, not prestressed
- **Solution**: Remove this check or use appropriate PT limits
- **Status**: NEEDS FIXING

### 4. Load Balancing Range
- **Current**: 60-110% of dead load
- **Modern practice**: 80-100% of dead load only
- **Consider**: Updating to match current practice

### 5. Minimum Thickness
- **Was**: 7" minimum
- **Should be**: 5" minimum per ACI 362.1R
- **Status**: FIXED

### 6. Beam Depth Optimization
- **Was**: Using fixed user input
- **Now**: Iterating from L/20 to L/12
- **Status**: FIXED

## Remaining Conceptual Issues

### 1. Stress Class Design
- Currently checking Class T limits (6√f'c tension)
- Parking garages typically Class U (uncracked)
- May need different stress limits

### 2. Tendon Stress Calculation
- Formula can give unrealistic fps for low ρp
- Consider more robust calculation

### 3. Effective Moment of Inertia
- Using Icr = 0.35*Ig might be arbitrary
- Should calculate based on actual section

### 4. Service Load Combinations
- Old: D + L + P
- New: D + 0.3L + P (per newer codes)
- We're still using full live load

## Recommendations

1. Remove or modify the c/d ≤ 0.375 check
2. Consider implementing Class U design limits
3. Update load combinations for service checks
4. Review effective prestress calculations
5. Validate moment calculations for continuous spans