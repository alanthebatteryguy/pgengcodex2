// The issue is with the stress signs. Let's analyze the correct formula

console.log("Stress calculation analysis:");
console.log("\nFor prestressed concrete:");
console.log("- Prestress causes COMPRESSION (negative)");
console.log("- Positive eccentricity causes compression at TOP, tension at BOTTOM");
console.log("- Dead/Live loads cause tension at BOTTOM, compression at TOP");
console.log("\nCorrect formulas should be:");
console.log("f_top = -P/A - P*e/St + M/St");
console.log("f_bot = -P/A + P*e/Sb - M/Sb");
console.log("\nWhere:");
console.log("- First term (-P/A) is uniform compression from prestress");
console.log("- Second term (±P*e/S) is bending from eccentric prestress");
console.log("- Third term (±M/S) is bending from applied loads");

// Test with actual values
const thickness = 10;
const A = 120;
const St = 200;
const Sb = 200;
const P = 56250;
const e = 2.4;
const M = 135000;

console.log("\nWith values: P=56250 lbs, e=2.4 in, M=135000 in-lb");
console.log("\nUniform compression: -P/A =", -P/A, "psi");
console.log("Prestress bending at top: -P*e/St =", -P*e/St, "psi");
console.log("Prestress bending at bot: +P*e/Sb =", P*e/Sb, "psi");
console.log("Load bending at top: +M/St =", M/St, "psi");
console.log("Load bending at bot: -M/Sb =", -M/Sb, "psi");

console.log("\nTotal stresses:");
const f_top = -P/A - P*e/St + M/St;
const f_bot = -P/A + P*e/Sb - M/Sb;
console.log("f_top =", f_top, "psi");
console.log("f_bot =", f_bot, "psi");

console.log("\nThe issue is f_bot = -468.75 psi is COMPRESSION (negative)");
console.log("But the code checks if f_bot > tension limit (positive)");
console.log("This will ALWAYS fail because compression can never be > positive tension limit\!");
