# Convex Migration Guide

## Current Status

The Convex server is now running successfully. We've made the new fields optional to allow existing data to remain valid.

## Migration Steps

### 1. Run the Migration (One-time)
Execute this in your Convex dashboard or via the CLI:
```bash
npx convex run migrations:addMissingCostParameters
```

This will update all existing projects with default values:
- `mildSteelCostPerLb`: 1.20
- `concreteStrength`: 5000
- `concreteCostPerCy`: 220

### 2. Update Frontend Forms
Make sure your CostForm component includes these new fields when creating projects:
- Mild steel cost per pound
- Concrete strength selection
- Concrete cost per cubic yard

### 3. After Migration Complete (Optional)
Once all existing projects have been updated, you can make these fields required again:

In `schema.ts` and `projects.ts`, change:
```typescript
mildSteelCostPerLb: v.optional(v.number()),
concreteStrength: v.optional(v.number()),
concreteCostPerCy: v.optional(v.number()),
```

Back to:
```typescript
mildSteelCostPerLb: v.number(),
concreteStrength: v.number(),
concreteCostPerCy: v.number(),
```

## Key Learnings

### Convex Best Practices Applied:

1. **Schema Evolution**: When adding new required fields:
   - First make them optional
   - Create a migration to backfill data
   - Only make required after all documents updated

2. **Type Alignment**: Ensure mutation args match schema exactly:
   - Schema uses `v.union(v.null(), v.object(...))` 
   - Mutation should match (not wrap in `v.optional()`)

3. **Error Resolution**: 
   - "Object is missing required field" → Make field optional first
   - "Types incompatible" → Check mutation args match schema

## Verification

To verify everything is working:
1. Create a new project with all cost parameters
2. Run optimization on existing projects
3. Check that optimization now explores different concrete strengths

The optimization engine should now properly:
- Loop through concrete strengths [5000, 7000, 10000, 12000, 15000]
- Calculate costs with proper premiums
- Find truly optimal solutions (15-20% savings expected)