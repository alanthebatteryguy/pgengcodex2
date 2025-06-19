# Run Optimization Test

## To Debug the Optimization:

1. **Check Convex Dashboard Logs**:
   - Go to https://dashboard.convex.dev
   - Look for console.log outputs from the optimization

2. **What to Look For**:

   a. **Starting optimization log**:
   ```
   Starting optimization for: {
     bayLength: 30,
     bayWidth: 30,
     mildSteelCost: undefined,    // ← Problem if undefined
     concreteStrength: undefined, // ← Problem if undefined
     concreteCostPerCy: undefined // ← Problem if undefined
   }
   ```

   b. **Concrete strength attempts**:
   ```
   Trying fc = 5000 psi
   Trying fc = 7000 psi
   ...
   ```

   c. **Stress check details** (first 5 iterations):
   ```
   Stress check: {
     fti_top: -2000,      // Top fiber stress at transfer
     fti_bot: 150,        // Bottom fiber stress at transfer
     limits_comp: -2100,  // Compression limit (negative)
     limits_tens: 189,    // Tension limit (positive)
     Pi: 150000,          // Initial prestress force
     e: 3.5,              // Eccentricity
     props: {...}         // Section properties
   }
   ```

   d. **Debug summary**:
   ```
   Flat plate debug: {
     totalTried: 1000,
     stressTransferFailed: 500,
     stressServiceFailed: 200,
     // etc...
   }
   ```

3. **Common Issues to Check**:

   - If `totalTried` is 0, the loops aren't running
   - If all failures are in one category, that check is too restrictive
   - If stress values are NaN, there's a calculation error

4. **Quick Fix if All Undefined**:
   Run the migration to add default values:
   ```
   npx convex run migrations:addMissingCostParameters
   ```