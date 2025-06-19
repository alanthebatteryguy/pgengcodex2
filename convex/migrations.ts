import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Migration to add missing cost parameters to existing projects
export const addMissingCostParameters = mutation({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    
    for (const project of projects) {
      // Check if the project is missing the new fields
      if (
        !project.costParameters.mildSteelCostPerLb ||
        !project.costParameters.concreteStrength ||
        !project.costParameters.concreteCostPerCy
      ) {
        // Update with default values
        await ctx.db.patch(project._id, {
          costParameters: {
            ...project.costParameters,
            mildSteelCostPerLb: project.costParameters.mildSteelCostPerLb ?? 1.20,
            concreteStrength: project.costParameters.concreteStrength ?? 5000,
            concreteCostPerCy: project.costParameters.concreteCostPerCy ?? 220,
          },
        });
      }
    }
    
    return { updated: projects.length };
  },
});