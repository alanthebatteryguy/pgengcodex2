import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const projectId = await ctx.db.insert("projects", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    return projectId;
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_creation", (q) => q)
      .order("desc")
      .take(100);
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    optimizationResults: v.optional(v.object({
      flatPlate: v.union(
        v.object({
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
        }),
        v.null()
      ),
      oneWayBeam: v.union(
        v.object({
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
        }),
        v.null()
      ),
      twoWayBeam: v.union(
        v.object({
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
        }),
        v.null()
      ),
      optimalSystem: v.string(),
      comparisons: v.array(v.object({
        span: v.number(),
        flatPlateCost: v.number(),
        oneWayBeamCost: v.number(),
        twoWayBeamCost: v.number(),
      })),
    })),
  },
  handler: async (ctx, args) => {
    const { id, optimizationResults } = args;
    await ctx.db.patch(id, {
      optimizationResults,
      updatedAt: Date.now(),
    });
  },
});