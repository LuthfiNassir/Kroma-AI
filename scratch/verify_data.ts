import { SAMPLE_DATASETS } from "../lib/dataEngine";
import Papa from "papaparse";

const rows = Papa.parse(SAMPLE_DATASETS.churn.trim(), { header: true, dynamicTyping: true }).data as Record<string, any>[];
console.log("Total rows:", rows.length);

const numericCols = ["Monthly_Revenue", "Usage_Hours", "Support_Tickets", "NPS", "Feature_Adoption", "Tenure_Months"];
const riskMapping: Record<string, number> = { Low: 0, Medium: 1, High: 2 };

console.log("\n=== 1. OVERALL STATS ===");
const overallStats: Record<string, { sum: number; mean: number }> = {};
for (const col of numericCols) {
  const vals = rows.map(r => Number(r[col]) || 0);
  const sum = vals.reduce((a, b) => a + b, 0);
  const mean = sum / vals.length;
  overallStats[col] = { sum, mean };
  console.log(`${col}: Sum = ${sum.toFixed(2)}, Mean = ${mean.toFixed(2)}, Count = ${vals.length}`);
}

console.log("\n=== 2. CHURN_RISK COHORT STATS & RECONCILIATION ===");
const cohorts = ["High", "Medium", "Low"];
const cohortRows: Record<string, Record<string, any>[]> = {
  High: rows.filter(r => r.Churn_Risk === "High"),
  Medium: rows.filter(r => r.Churn_Risk === "Medium"),
  Low: rows.filter(r => r.Churn_Risk === "Low"),
};

for (const c of cohorts) {
  console.log(`Cohort ${c}: ${cohortRows[c].length} rows (${((cohortRows[c].length / rows.length) * 100).toFixed(1)}%)`);
}

for (const col of numericCols) {
  console.log(`\nMetric: ${col}`);
  let weightedSum = 0;
  for (const c of cohorts) {
    const vals = cohortRows[c].map(r => Number(r[col]) || 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    const mean = sum / vals.length;
    weightedSum += sum;
    console.log(`  ${c} (N=${vals.length}): Sum = ${sum.toFixed(2)}, Mean = ${mean.toFixed(2)}`);
  }
  const weightedMean = weightedSum / rows.length;
  const overallMean = overallStats[col].mean;
  const diff = Math.abs(weightedMean - overallMean);
  console.log(`  Weighted Sum = ${weightedSum.toFixed(2)} (Overall Sum = ${overallStats[col].sum.toFixed(2)})`);
  console.log(`  Weighted Mean = ${weightedMean.toFixed(4)} (Overall Mean = ${overallMean.toFixed(4)}) Diff: ${diff.toExponential(4)}`);
}

console.log("\n=== 3. SEGMENT STATS FOR Monthly_Revenue ===");
const segs = ["Enterprise", "Mid-Market", "SMB"];
let segSum = 0;
for (const s of segs) {
  const sRows = rows.filter(r => r.Segment === s);
  const vals = sRows.map(r => Number(r.Monthly_Revenue) || 0);
  const sum = vals.reduce((a, b) => a + b, 0);
  const mean = sum / vals.length;
  segSum += sum;
  console.log(`  ${s} (N=${vals.length}): Sum = ${sum.toFixed(2)}, Mean = ${mean.toFixed(2)}`);
}
console.log(`Segment Total Sum = ${segSum.toFixed(2)} (Overall: ${overallStats["Monthly_Revenue"].sum.toFixed(2)})`);

console.log("\n=== 4. CORRELATIONS WITH Churn_Risk (Low=0, Med=1, High=2) ===");
for (const col of numericCols) {
  const x = rows.map(r => Number(r[col]) || 0);
  const y = rows.map(r => riskMapping[String(r.Churn_Risk)] ?? 0);
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0);
  const sumX2 = x.reduce((acc, val) => acc + val * val, 0);
  const sumY2 = y.reduce((acc, val) => acc + val * val, 0);
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  const r = den === 0 ? 0 : num / den;
  console.log(`  ${col} vs Churn_Risk: r = ${r.toFixed(4)}`);
}
