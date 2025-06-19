import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    bayLength: v.number(),
    bayWidth: v.number(),
    beamDepth: v.number(),
    soilClass: v.string(),
    seismicParameters: v.object({
      sds: v.number(),
      sd1: v.number(),
      riskCategory: v.string(),
      importanceFactor: v.number(),
      responseModificationCoefficient: v.number(),
      seismicDesignCategory: v.string(),
    }),
    costParameters: v.object({
      ptSlabCosts: v.array(v.object({
        thickness: v.number(),
        costPerSf: v.number(),
      })),
      ptFormworkCostPerSf: v.number(),
      beamFormingCostPerCf: v.number(),
      beamPouringCostPerCf: v.number(),
      ptStrandCostPerLb: v.number(),
      mildSteelCostPerLb: v.optional(v.number()),
      concreteStrength: v.optional(v.number()),
      concreteCostPerCy: v.optional(v.number()),
      highStrengthPremium: v.optional(v.object({
        strength7000: v.optional(v.number()),
        strength10000: v.optional(v.number()),
        strength15000: v.optional(v.number()),
      })),
    }),
    optimizationResults: v.optional(v.object({
      flatPlate: v.union(v.null(), v.object({
        slabThickness: v.number(),
        concreteStrength: v.number(),
        ptForce: v.number(),
        totalCost: v.number(),
        weightPerSf: v.number(),
        checks: v.object({
          moment: v.boolean(),
          deflection: v.boolean(),
          vibration: v.boolean(),
          punchingShear: v.boolean(),
          camber: v.boolean(),
        }),
      })),
      oneWayBeam: v.union(v.null(), v.object({
        slabThickness: v.number(),
        beamWidth: v.number(),
        beamDepth: v.number(),
        concreteStrength: v.number(),
        ptForce: v.number(),
        totalCost: v.number(),
        weightPerSf: v.number(),
        checks: v.object({
          moment: v.boolean(),
          deflection: v.boolean(),
          vibration: v.boolean(),
          punchingShear: v.boolean(),
          camber: v.boolean(),
        }),
      })),
      twoWayBeam: v.union(v.null(), v.object({
        slabThickness: v.number(),
        beamWidth: v.number(),
        beamDepth: v.number(),
        concreteStrength: v.number(),
        ptForce: v.number(),
        totalCost: v.number(),
        weightPerSf: v.number(),
        checks: v.object({
          moment: v.boolean(),
          deflection: v.boolean(),
          vibration: v.boolean(),
          punchingShear: v.boolean(),
          camber: v.boolean(),
        }),
      })),
      optimalSystem: v.string(),
      comparisons: v.array(v.object({
        span: v.number(),
        flatPlateCost: v.number(),
        oneWayBeamCost: v.number(),
        twoWayBeamCost: v.number(),
      })),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_creation", ["createdAt"]),
  
  defaultCosts: defineTable({
    ptSlabCosts: v.array(v.object({
      thickness: v.number(),
      costPerSf: v.number(),
    })),
    ptFormworkCostPerSf: v.number(),
    beamFormingCostPerCf: v.number(),
    beamPouringCostPerCf: v.number(),
    ptStrandCostPerLb: v.number(),
  }),
});