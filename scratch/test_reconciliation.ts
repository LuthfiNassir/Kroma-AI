import { SAMPLE_DATASETS } from "../lib/dataEngine";
import { parseTabularData, generateInitialDashboard } from "../lib/dataEngine";
import Papa from "papaparse";

const parsed = parseTabularData(SAMPLE_DATASETS.churn, "csv");
const dashboard = generateInitialDashboard(parsed);
const profile = dashboard.profile;
const factPack = profile?.factPack;

console.log("Profile generated. FactPack present:", Boolean(factPack));
console.log("Metadata:", factPack?.metadata);
console.log("Target Intelligence:", factPack?.targetIntelligence);

if (factPack) {
  console.log("\nNumeric Stats:");
  for (const [col, stat] of Object.entries(factPack.numericStats)) {
    console.log(`  ${col}: sum=${stat.sum}, mean=${stat.mean}, count=${stat.count}`);
  }

  console.log("\nGroup Stats (Churn_Risk):");
  const riskStats = factPack.groupStats.filter(g => g.dimension === "Churn_Risk");
  for (const g of riskStats) {
    console.log(`  Measure: ${g.measure}`);
    let wSum = 0;
    let wCount = 0;
    for (const grp of g.groups) {
      console.log(`    ${grp.group} (N=${grp.count}, ${grp.percentage}%): total=${grp.total}, avg=${grp.average}`);
      wSum += grp.total;
      wCount += grp.count;
    }
    const overall = factPack.numericStats[g.measure];
    const wMean = wSum / wCount;
    const diff = Math.abs(wMean - overall.mean);
    console.log(`    -> Weighted Mean: ${wMean.toFixed(4)}, Overall Mean: ${overall.mean.toFixed(4)}, Diff: ${diff}`);
  }

  console.log("\nGroup Stats (Segment):");
  const segStats = factPack.groupStats.filter(g => g.dimension === "Segment");
  for (const g of segStats) {
    if (g.measure === "Monthly_Revenue") {
      console.log(`  Measure: ${g.measure}`);
      for (const grp of g.groups) {
        console.log(`    ${grp.group} (N=${grp.count}): total=${grp.total}, avg=${grp.average}`);
      }
    }
  }

  console.log("\nCorrelations:");
  for (const c of factPack.correlations) {
    console.log(`  ${c.variableA} vs ${c.variableB}: ${c.coefficient} (${c.direction})`);
  }
}
