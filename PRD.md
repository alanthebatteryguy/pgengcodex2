# Parking Garage Design Engine PRD

## Overview
Iterative optimization engine for post-tensioned concrete parking garages per IBC 2021, ACI 318-19, and ASCE 7 standards.

## Technical Stack
- Frontend: React 
- Backend: Convex
- Auth: Convex Auth
- Focus: Usability and rapid validation

## Core Inputs

### Structural Parameters
1. **Bay Dimensions**
   - Span length (18'-60')
   - Span width 
   - Drop beam depth (from top of slab)

2. **Site Data**
   - Soil class (A, B, C, D, E, F per ASCE 7)
   - Seismic design category

3. **Cost Parameters**
   - PT slab cost ($/sf) by thickness:
     - 3"-7" for spans < 32'
     - 9"-12" for spans 45'-55'
   - PT formwork cost ($/sf)
   - Beam forming/pouring cost ($/cf)
   - PT strand cost ($/lb installed)

## Design Requirements

### Load Criteria (Verified)
- Live Load: 40 psf uniform (parking)
- Concentrated: 3000 lbs on 4.5"×4.5" area
- Seismic loads per site class

### Performance Limits
- Deflection: L/480 (enhanced for parking)
- Vibration: 5% damping, 8 Hz min frequency
- Camber: L/300 maximum
- Punching shear: per ACI 318-19 §22.6

### Material Properties
- Concrete: f'c = 4000-6000 psi
- PT strand: fpu = 270 ksi, Grade 270
- Mild steel: fy = 60 ksi
- Ec = 57,000√f'c (psi)

## Optimization Engine

### Systems to Compare
1. **Flat Plate** - PT slab only
2. **One-Way Beam** - Beams in one direction + PT slab
3. **Two-Way Beam** - Beams in both directions + PT slab

### Optimization Variables
- Slab thickness (3"-12")
- Beam dimensions (width/depth)
- Concrete strength (4000-6000 psi)
- PT force levels (125-300 psi avg)
- Mild steel ratio

### Cost Function
```
Total Cost = Material Volume × Unit Costs + Labor
- PT slab: thickness × area × (concrete + PT + formwork costs)
- Beams: volume × (concrete + forming costs)
- PT: force required × strand weight × cost/lb
```

### Design Checks (Per ACI 318-19)
1. **Moment Capacity**
   - Mu ≤ φMn (φ=0.9)
   - Stress block: a = Aps×fpu/(0.85×f'c×b)

2. **Deflection**
   - Δimmediate = 5wL⁴/(384EcIe)
   - Δlong-term with λ factor

3. **Punching Shear**
   - vu ≤ φvc (φ=0.75)
   - vc = (2 + 4/βc)√f'c or (2 + αs×d/bo)√f'c
   - Add fpc contribution for PT

4. **Vibration**
   - fn = 0.18√(g/Δ) ≥ 8 Hz

## Comparison Outputs
1. Optimal design for input span
2. Cost comparison table (18', 24', 27', 30', 36', 40', 45', 49', 54', 60')
3. Weight per square foot
4. Material quantities

## User Interface Requirements
- Clean data entry forms with validation
- Real-time optimization status
- Clear results visualization
- Export capability for results

## Success Criteria
- Produces constructable designs
- Finds lowest cost within code limits
- Completes optimization < 10 seconds
- Results match hand calculations ±5%