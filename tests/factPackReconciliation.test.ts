import { parseTabularData, generateInitialDashboard, SAMPLE_DATASETS } from "../lib/dataEngine";
import { validateFactPackConsistency } from "../lib/factPackReconciliation";

function runReconciliationTest() {
  console.log("=== RUNNING FACT PACK RECONCILIATION TEST ===");

  // 1. Ingest churn dataset
  const parsed = parseTabularData(SAMPLE_DATASETS.churn, "csv");
  const dashboard = generateInitialDashboard(parsed);
  const factPack = dashboard.profile?.factPack;

  if (!factPack) {
    throw new Error("FAIL: factPack was not generated on dashboard profile");
  }

  console.log(`Dataset fingerprint: ${factPack.metadata.datasetFingerprint}`);
  console.log(`Total rows: ${factPack.metadata.rowCount}, columns: ${factPack.metadata.columnCount}`);

  // 2. Validate consistency
  const result = validateFactPackConsistency(factPack, parsed.data);

  console.log("\nReconciliation Checks Status:");
  console.log("  A. Overall sums vs means:", result.checks.overallSumsVsMeans ? "PASS" : "FAIL");
  console.log("  B. Group counts exhaustive:", result.checks.groupCountsExhaustive ? "PASS" : "FAIL");
  console.log("  C. Group percentages sum to 100%:", result.checks.groupPercentagesHundred ? "PASS" : "FAIL");
  console.log("  D. Group totals match overall:", result.checks.groupTotalsMatchOverall ? "PASS" : "FAIL");
  console.log("  E. Group weighted averages match overall mean:", result.checks.groupWeightedMeansMatchOverall ? "PASS" : "FAIL");
  console.log("  F. Target distribution matches row count:", result.checks.targetDistributionMatchesRowCount ? "PASS" : "FAIL");
  console.log("  G. Correlations reproducible from rows:", result.checks.correlationsReproducible ? "PASS" : "FAIL");
  console.log("  H. Numeric stats reproducible:", result.checks.numericStatsReproducible ? "PASS" : "FAIL");

  console.log(`\nOverall Reconciliation Validity: ${result.isValid ? "PASS (100% Consistent)" : "FAIL"}`);

  if (!result.isValid) {
    console.error("\nIntegrity Errors Found:");
    result.errors.forEach((e) => console.error(" - ", e));
    throw new Error(`Reconciliation test failed with ${result.errors.length} errors`);
  }

  // 3. Detailed metric checks
  console.log("\nDetailed Metric Reconciliations (Churn_Risk cohort breakdown):");
  const riskChecks = result.metricChecks.filter((m) => m.dimension === "Churn_Risk");
  for (const m of riskChecks) {
    console.log(`  Metric: ${m.metric.padEnd(18)} | Overall Mean: ${m.overallMean.toFixed(2).padStart(8)} | Weighted Cohort Mean: ${m.reconciledMean.toFixed(2).padStart(8)} | Diff: ${m.meanDifference.toFixed(4)} | Valid: ${m.isConsistent}`);
    if (!m.isConsistent) {
      throw new Error(`Inconsistency detected in metric ${m.metric}`);
    }
  }

  // 4. Segment checks
  console.log("\nDetailed Segment Revenue Checks:");
  const segBreakdown = factPack.groupStats.find((g) => g.dimension === "Segment" && g.measure === "Monthly_Revenue");
  if (!segBreakdown) {
    throw new Error("Segment breakdown missing for Monthly_Revenue");
  }

  let segSum = 0;
  let segCount = 0;
  for (const grp of segBreakdown.groups) {
    const computedAvg = grp.total / grp.count;
    console.log(`  ${grp.group.padEnd(12)}: Count = ${grp.count}, Total = $${grp.total.toFixed(2)}, Stored Avg = $${grp.average.toFixed(2)}, Computed Avg = $${computedAvg.toFixed(2)}`);
    if (Math.abs(grp.average - computedAvg) > 0.02) {
      throw new Error(`Segment average mismatch for ${grp.group}`);
    }
    segSum += grp.total;
    segCount += grp.count;
  }

  const overallRev = factPack.numericStats["Monthly_Revenue"];
  console.log(`  Total Segment Sum: $${segSum.toFixed(2)} vs Overall Sum: $${overallRev.sum.toFixed(2)}`);
  if (Math.abs(segSum - overallRev.sum) > 0.05) {
    throw new Error("Segment totals do not sum to overall revenue");
  }

  // 5. Test Loud Failure on tampered factPack
  console.log("\nTesting Loud Failure Detection on synthetic discrepancy...");
  const tampered = JSON.parse(JSON.stringify(factPack));
  tampered.numericStats["Monthly_Revenue"].mean = 9999.99; // intentionally corrupt
  const tamperedResult = validateFactPackConsistency(tampered, parsed.data);
  if (tamperedResult.isValid) {
    throw new Error("FAIL: Validation did not catch intentionally corrupted overall mean");
  }
  console.log("  Successfully caught corrupted statistic! Caught errors:", tamperedResult.errors.length);

  // 6. Authoritative E-commerce Reconciliation Test
  console.log("\n=== RUNNING E-COMMERCE FACT PACK RECONCILIATION TEST ===");
  const ecomParsed = parseTabularData(SAMPLE_DATASETS.ecommerce, "csv");
  const ecomDashboard = generateInitialDashboard(ecomParsed);
  const ecomFactPack = ecomDashboard.profile?.factPack;

  if (!ecomFactPack) {
    throw new Error("FAIL: ecomFactPack missing on dashboard profile");
  }

  console.log(`E-commerce fingerprint: ${ecomFactPack.metadata.datasetFingerprint}`);
  console.log(`Total rows: ${ecomFactPack.metadata.rowCount}, columns: ${ecomFactPack.metadata.columnCount}`);

  if (ecomFactPack.metadata.rowCount !== 25) {
    throw new Error(`FAIL: Expected 25 rows, got ${ecomFactPack.metadata.rowCount}`);
  }

  const ecomResult = validateFactPackConsistency(ecomFactPack, ecomParsed.data);
  console.log(`\nE-commerce Reconciliation Validity: ${ecomResult.isValid ? "PASS (100% Consistent)" : "FAIL"}`);
  if (!ecomResult.isValid) {
    console.error("E-commerce Reconciliation Errors:", ecomResult.errors);
    throw new Error(`E-commerce reconciliation failed with ${ecomResult.errors.length} errors`);
  }

  // Verify deterministic facts in ecomFactPack
  const catBreakdown = ecomFactPack.groupStats.find((g) => g.dimension === "Category" && g.measure === "Revenue");
  if (!catBreakdown) {
    throw new Error("FAIL: Category breakdown missing for Revenue");
  }

  const ecomElec = catBreakdown.groups.find((g) => g.group === "Electronics");
  const ecomFurn = catBreakdown.groups.find((g) => g.group === "Furniture");
  const ecomOff = catBreakdown.groups.find((g) => g.group === "Office");

  if (!ecomElec || !ecomFurn || !ecomOff) {
    throw new Error("FAIL: Missing one of the required categories (Electronics, Furniture, Office)");
  }

  console.log(`\nE-commerce Category Reconciliation:`);
  console.log(`  Electronics: Count=${ecomElec.count} (exp 14), Total=$${ecomElec.total} (exp 66600)`);
  console.log(`  Furniture:   Count=${ecomFurn.count} (exp 6), Total=$${ecomFurn.total} (exp 14850)`);
  console.log(`  Office:      Count=${ecomOff.count} (exp 5), Total=$${ecomOff.total} (exp 12600)`);

  if (ecomElec.count !== 14 || ecomElec.total !== 66600) {
    throw new Error(`Electronics mismatch: count=${ecomElec.count}, total=${ecomElec.total}`);
  }
  if (ecomFurn.count !== 6 || ecomFurn.total !== 14850) {
    throw new Error(`Furniture mismatch: count=${ecomFurn.count}, total=${ecomFurn.total}`);
  }
  if (ecomOff.count !== 5 || ecomOff.total !== 12600) {
    throw new Error(`Office mismatch: count=${ecomOff.count}, total=${ecomOff.total}`);
  }

  // Customer_Type verification
  const custBreakdown = ecomFactPack.groupStats.find((g) => g.dimension === "Customer_Type" && g.measure === "Revenue");
  if (!custBreakdown) {
    throw new Error("FAIL: Customer_Type breakdown missing for Revenue");
  }

  const returningGrp = custBreakdown.groups.find((g) => g.group === "Returning");
  const newGrp = custBreakdown.groups.find((g) => g.group === "New");
  const corpGrp = custBreakdown.groups.find((g) => g.group.toLowerCase() === "corporate");

  if (corpGrp) {
    throw new Error("FAIL: 'Corporate' customer type found in authoritative dataset!");
  }
  if (!returningGrp || returningGrp.count !== 13 || returningGrp.total !== 57900) {
    throw new Error(`Returning customer mismatch: count=${returningGrp?.count}, total=${returningGrp?.total}`);
  }
  if (!newGrp || newGrp.count !== 12 || newGrp.total !== 36150) {
    throw new Error(`New customer mismatch: count=${newGrp?.count}, total=${newGrp?.total}`);
  }
  console.log(`  Customer Types verified: Returning=13 ($57,900), New=12 ($36,150), Corporate=0 (ABSENT)`);

  console.log("\n=== ALL RECONCILIATION TESTS PASSED CLEANLY ===");
}

runReconciliationTest();
