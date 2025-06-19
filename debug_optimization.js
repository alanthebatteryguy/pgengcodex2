// Test the stress limit calculations
function getStressLimits(fc, fci) {
  return {
    fci_comp: 0.60 * fci,              // compression at transfer
    fci_tens: 3 * Math.sqrt(fci),      // tension at transfer (no bonded reinf)
    fc_comp_sust: 0.45 * fc,           // compression at service (sustained)
    fc_comp_total: 0.60 * fc,          // compression at service (total)
    fc_tens: 6 * Math.sqrt(fc),        // tension at service (Class T)
  };
}

// Test with 5000 psi concrete
const fc = 5000;
const fci = 0.7 * fc;  // 3500 psi
const limits = getStressLimits(fc, fci);

console.log("Concrete strength fc =", fc, "psi");
console.log("Initial strength fci =", fci, "psi");
console.log("\nStress limits:");
console.log("fci_comp =", limits.fci_comp, "psi (compression at transfer)");
console.log("fci_tens =", limits.fci_tens, "psi (tension at transfer)");
console.log("fc_comp_total =", limits.fc_comp_total, "psi (compression at service)");
console.log("fc_tens =", limits.fc_tens, "psi (tension at service)");

// Test section properties for 10" slab
function getSectionProperties(thickness) {
  const A = thickness * 12; // sq in per foot
  const I = (12 * Math.pow(thickness, 3)) / 12; // in^4
  const St = I / (thickness/2); // in^3
  const Sb = St; // symmetric section
  const r2 = I / A; // radius of gyration squared
  return { A, I, St, Sb, r2 };
}

const thickness = 10; // inches
const props = getSectionProperties(thickness);
console.log("\nSection properties for", thickness, "inch slab:");
console.log("A =", props.A, "sq in");
console.log("I =", props.I, "in^4");
console.log("St = Sb =", props.St, "in^3");

// Test typical loads and moments
const loads = { dead: 12.5 * thickness, live: 40 };
const bayLength = 30; // ft
const Md = loads.dead * bayLength * bayLength * 12 / 10; // in-lb per foot
const Ml = loads.live * bayLength * bayLength * 12 / 10;
const Mt = Md + Ml;

console.log("\nLoads for 30 ft span:");
console.log("Dead load =", loads.dead, "psf");
console.log("Live load =", loads.live, "psf");
console.log("Md =", Md, "in-lb/ft");
console.log("Ml =", Ml, "in-lb/ft");
console.log("Mt =", Mt, "in-lb/ft");

// Test typical eccentricity and prestress force
const cover = 1.5;
const emax = thickness/2 - cover - 0.5;
const e = 0.8 * emax; // 80% of max
const balanceRatio = 0.8;
const M_balance = balanceRatio * Md;
const P_balance = M_balance / e;
const lossRatio = 0.80;
const Pi = P_balance / lossRatio;
const Pe = P_balance;

console.log("\nPrestress calculations:");
console.log("emax =", emax, "inches");
console.log("e =", e, "inches");
console.log("P_balance =", P_balance, "lbs/ft");
console.log("Pi =", Pi, "lbs/ft");
console.log("Pe =", Pe, "lbs/ft");

// Calculate stresses
const fti_top = -Pi/props.A - Pi*e/props.St + Md/props.St;
const fti_bot = -Pi/props.A + Pi*e/props.Sb - Md/props.Sb;
const fs_top = -Pe/props.A - Pe*e/props.St + Mt/props.St;
const fs_bot = -Pe/props.A + Pe*e/props.Sb - Mt/props.Sb;

console.log("\nStresses at transfer:");
console.log("fti_top =", fti_top, "psi (limit:", -limits.fci_comp, "psi)");
console.log("fti_bot =", fti_bot, "psi (limit:", limits.fci_tens, "psi)");

console.log("\nStresses at service:");
console.log("fs_top =", fs_top, "psi (limit:", -limits.fc_comp_total, "psi)");
console.log("fs_bot =", fs_bot, "psi (limit:", limits.fc_tens, "psi)");

// Check average prestress
const avgPrestress = Pe / props.A;
console.log("\nAverage prestress =", avgPrestress, "psi (min required: 125 psi)");

// Check passes
console.log("\nCheck results:");
console.log("Transfer compression:", fti_top >= -limits.fci_comp ? "PASS" : "FAIL");
console.log("Transfer tension:", fti_bot <= limits.fci_tens ? "PASS" : "FAIL");
console.log("Service compression:", fs_top >= -limits.fc_comp_total ? "PASS" : "FAIL");
console.log("Service tension:", fs_bot <= limits.fc_tens ? "PASS" : "FAIL");
console.log("Min avg prestress:", avgPrestress >= 125 ? "PASS" : "FAIL");
