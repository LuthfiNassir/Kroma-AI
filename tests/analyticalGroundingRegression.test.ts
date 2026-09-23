import { parseTabularData, generateInitialDashboard, SAMPLE_DATASETS } from "../lib/dataEngine";
import { computeDeterministicAnalyticalResult } from "../lib/deterministicAnalytics";
import { validateAndGroundResponse } from "../lib/responseValidator";
import { normalizeChartData } from "../lib/ollama";

function runRegressionSuite() {
  console.log("==================================================");
  console.log("RUNNING ANALYTICAL GROUNDING REGRESSION SUITE (TESTS A-F)");
  console.log("==================================================");

  // Ingest the authoritative 30-record churn dataset
  const parsed = parseTabularData(SAMPLE_DATASETS.churn, "csv");
  const dashboard = generateInitialDashboard(parsed);
  const factPack = dashboard.profile?.factPack;

  if (!factPack) {
    throw new Error("FAIL: factPack missing on dashboard profile");
  }

  const rowCount = factPack.metadata.rowCount;
  console.log(`Active Dataset: rowCount = ${rowCount}, columns = ${factPack.metadata.columnCount}`);
  if (rowCount !== 30) {
    throw new Error(`FAIL: Active dataset must have 30 records, found ${rowCount}`);
  }

  // -------------------------------------------------------------------------
  // TEST A: Calculate overall average Monthly_Revenue using High, Medium, Low
  // -------------------------------------------------------------------------
  console.log("\n--- TEST A: Cohort Weighted-Average Calculation ---");
  const qA = "Calculate overall average Monthly_Revenue using the High, Medium, and Low group counts and averages.";
  const resA = computeDeterministicAnalyticalResult(qA, factPack);

  console.log("Handled:", resA.isHandled);
  console.log("Intent:", resA.intent);
  console.log("RowCount:", resA.rowCount);
  console.log("Overall Mean:", resA.weightedAverage?.overallMean);
  console.log("Reconciles:", resA.weightedAverage?.reconciles);
  console.log("Groups:", resA.weightedAverage?.groups.map((g) => `${g.name}: ${g.count} (avg: $${g.average})`).join(", "));

  if (!resA.isHandled || resA.intent !== "WEIGHTED_AVERAGE_RECONCILIATION") {
    throw new Error("TEST A FAILED: Did not classify as WEIGHTED_AVERAGE_RECONCILIATION");
  }
  if (resA.rowCount !== 30) {
    throw new Error(`TEST A FAILED: rowCount expected 30, got ${resA.rowCount}`);
  }
  const highGrp = resA.weightedAverage?.groups.find((g) => g.name === "High");
  const medGrp = resA.weightedAverage?.groups.find((g) => g.name === "Medium");
  const lowGrp = resA.weightedAverage?.groups.find((g) => g.name === "Low");

  if (highGrp?.count !== 6 || medGrp?.count !== 8 || lowGrp?.count !== 16) {
    throw new Error(`TEST A FAILED: Expected 6/8/16 counts, got High=${highGrp?.count}, Med=${medGrp?.count}, Low=${lowGrp?.count}`);
  }
  if (highGrp?.average !== 46.50 || medGrp?.average !== 164.75 || lowGrp?.average !== 915.25) {
    throw new Error(`TEST A FAILED: Averages mismatch: High=${highGrp?.average}, Med=${medGrp?.average}, Low=${lowGrp?.average}`);
  }
  if (resA.weightedAverage?.overallMean !== 541.37) {
    throw new Error(`TEST A FAILED: Expected overall mean $541.37, got $${resA.weightedAverage?.overallMean}`);
  }
  if (!resA.weightedAverage?.reconciles) {
    throw new Error("TEST A FAILED: Reconciliation failed");
  }
  console.log(">>> TEST A PASSED! rowCount=30, High=6, Medium=8, Low=16, Mean=$541.37, Reconciles=true");

  // -------------------------------------------------------------------------
  // TEST B: Weighted average reconciliation verification
  // -------------------------------------------------------------------------
  console.log("\n--- TEST B: Weighted Average Reconciles With Full Dataset ---");
  const qB = "Does the weighted average reconcile with the overall average?";
  const resB = computeDeterministicAnalyticalResult(qB, factPack);

  console.log("Discrepancy:", resB.weightedAverage?.discrepancy);
  console.log("Reconciles:", resB.weightedAverage?.reconciles);

  if (!resB.weightedAverage?.reconciles || resB.weightedAverage?.discrepancy > 0.05) {
    throw new Error(`TEST B FAILED: Weighted average does not reconcile (diff = ${resB.weightedAverage?.discrepancy})`);
  }
  console.log(">>> TEST B PASSED! Discrepancy = $0.00, reconciles 100%");

  // -------------------------------------------------------------------------
  // TEST C: Authoritative Correlations with Churn_Risk
  // -------------------------------------------------------------------------
  console.log("\n--- TEST C: Correlations With Churn_Risk ---");
  const qC = "Which variables correlate with Churn_Risk?";
  const resC = computeDeterministicAnalyticalResult(qC, factPack);

  console.log("Correlations found:", resC.correlations?.length);
  resC.correlations?.forEach((c) => {
    console.log(`  ${c.variable.padEnd(18)}: r = ${c.coefficient >= 0 ? "+" : ""}${c.coefficient.toFixed(3)} (${c.direction})`);
  });

  const getCorr = (varName: string) => resC.correlations?.find((c) => c.variable.toLowerCase() === varName.toLowerCase())?.coefficient;

  const rFeat = getCorr("Feature_Adoption");
  const rNps = getCorr("NPS");
  const rTickets = getCorr("Support_Tickets");
  const rUsage = getCorr("Usage_Hours");
  const rTenure = getCorr("Tenure_Months");
  const rRev = getCorr("Monthly_Revenue");

  if (!rFeat || Math.abs(rFeat - (-0.960)) > 0.01) throw new Error(`TEST C FAILED: Feature_Adoption correlation expected ~ -0.960, got ${rFeat}`);
  if (!rNps || Math.abs(rNps - (-0.957)) > 0.01) throw new Error(`TEST C FAILED: NPS correlation expected ~ -0.957, got ${rNps}`);
  if (!rTickets || Math.abs(rTickets - 0.938) > 0.01) throw new Error(`TEST C FAILED: Support_Tickets correlation expected ~ +0.938, got ${rTickets}`);
  if (!rUsage || Math.abs(rUsage - (-0.879)) > 0.01) throw new Error(`TEST C FAILED: Usage_Hours correlation expected ~ -0.879, got ${rUsage}`);
  if (!rTenure || Math.abs(rTenure - (-0.847)) > 0.01) throw new Error(`TEST C FAILED: Tenure_Months correlation expected ~ -0.847, got ${rTenure}`);
  if (!rRev || Math.abs(rRev - (-0.678)) > 0.01) throw new Error(`TEST C FAILED: Monthly_Revenue correlation expected ~ -0.678, got ${rRev}`);

  console.log(">>> TEST C PASSED! All correlation coefficients match authoritative ground truth with verified signs.");

  // -------------------------------------------------------------------------
  // TEST D: Causality Guardrail: Does support-ticket volume cause churn?
  // -------------------------------------------------------------------------
  console.log("\n--- TEST D: Causality Guardrail ---");
  const qD = "Does support-ticket volume cause churn?";
  const resD = computeDeterministicAnalyticalResult(qD, factPack);

  console.log("Has Causal Proof:", resD.causalityStatement?.hasCausalProof);
  console.log("Observational Summary:", resD.causalityStatement?.observationalSummary);

  if (resD.causalityStatement?.hasCausalProof !== false) {
    throw new Error("TEST D FAILED: Must reject causal proof");
  }
  if (!resD.causalityStatement?.observationalSummary.includes("+0.938")) {
    throw new Error("TEST D FAILED: Must cite r = +0.938 association");
  }
  if (!resD.deterministicExplanation.includes("No causal conclusion can be established")) {
    throw new Error("TEST D FAILED: Must explicitly state no causal conclusion can be established");
  }
  console.log(">>> TEST D PASSED! Non-causal reframing enforced; r = +0.938 cited.");

  // -------------------------------------------------------------------------
  // TEST E: Customer Counts in each Churn_Risk tier
  // -------------------------------------------------------------------------
  console.log("\n--- TEST E: Customer Counts in Each Tier ---");
  const qE = "How many customers are in each Churn_Risk tier?";
  const resE = computeDeterministicAnalyticalResult(qE, factPack);

  const tHigh = resE.distribution?.tiers.find((t) => t.name === "High")?.count;
  const tMed = resE.distribution?.tiers.find((t) => t.name === "Medium")?.count;
  const tLow = resE.distribution?.tiers.find((t) => t.name === "Low")?.count;
  const tTotal = resE.rowCount;

  console.log(`Counts: High = ${tHigh}, Medium = ${tMed}, Low = ${tLow}, Total = ${tTotal}`);
  if (tHigh !== 6 || tMed !== 8 || tLow !== 16 || tTotal !== 30) {
    throw new Error(`TEST E FAILED: Expected 6, 8, 16, 30; got ${tHigh}, ${tMed}, ${tLow}, ${tTotal}`);
  }
  console.log(">>> TEST E PASSED! High = 6, Medium = 8, Low = 16, Total = 30.");

  // -------------------------------------------------------------------------
  // TEST F: Monthly_Revenue by Churn_Risk bar chart
  // -------------------------------------------------------------------------
  console.log("\n--- TEST F: Bar Chart Specification & Data ---");
  const qF = "Generate the Monthly_Revenue by Churn_Risk bar chart.";
  const resF = computeDeterministicAnalyticalResult(qF, factPack);

  console.log("ChartType:", resF.chartSpec?.chartType);
  console.log("ChartTitle:", resF.chartSpec?.chartTitle);
  console.log("Bars:", resF.chartSpec?.chartData);

  if (resF.chartSpec?.chartType !== "bar") {
    throw new Error("TEST F FAILED: Chart type must be 'bar'");
  }
  if (!resF.chartSpec?.chartData || resF.chartSpec.chartData.length !== 3) {
    throw new Error("TEST F FAILED: Expected exactly 3 bars");
  }

  const barHigh = resF.chartSpec.chartData.find((b) => b.label === "High")?.value;
  const barMed = resF.chartSpec.chartData.find((b) => b.label === "Medium")?.value;
  const barLow = resF.chartSpec.chartData.find((b) => b.label === "Low")?.value;

  if (barHigh !== 46.50 || barMed !== 164.75 || barLow !== 915.25) {
    throw new Error(`TEST F FAILED: Expected 46.50, 164.75, 915.25; got High=${barHigh}, Med=${barMed}, Low=${barLow}`);
  }
  console.log(">>> TEST F PASSED! Exactly three visible bars: High=46.50, Medium=164.75, Low=915.25.");

  // -------------------------------------------------------------------------
  // SECTION 3 TESTS: Response Validator Text Integrity & Safety
  // -------------------------------------------------------------------------
  console.log("\n==================================================");
  console.log("RUNNING RESPONSE VALIDATOR TEXT INTEGRITY TESTS");
  console.log("==================================================");

  // Subtest 1: Safe correlation sign correction without repetitive corruption
  const corruptCandidate = `Feature_Adoption has a positive association (r = +0.960) while NPS also has positive correlation (r = +0.957). Monthly_Revenue is positively associated.`;
  const val1 = validateAndGroundResponse(corruptCandidate, "Test insight", factPack, "Which variables correlate with Churn_Risk?");

  console.log("\n[Subtest 1] Reversed correlation correction result:");
  console.log(val1.explanation);
  if (val1.explanation.includes("association (r = -0.768) association (r = +0.774)")) {
    throw new Error("SUBTEST 1 FAILED: Corrupted text fragment detected");
  }
  if (!val1.explanation.includes("-0.960") || !val1.explanation.includes("-0.957")) {
    throw new Error("SUBTEST 1 FAILED: Negative signs not injected");
  }
  console.log(">>> Subtest 1 Passed: No repetitive fragments or text corruption.");

  // Subtest 2: Hallucinated 10-record dataset override
  const hallucinated10Records = `**[Direct Answer]**
Across the 10 customers, the overall average Monthly_Revenue is $629.90.
- High: 3/10 customers average $50.00.
- Medium: 3/10 customers average $150.00.
- Low: 4/10 customers average $1,200.00.`;
  const val2 = validateAndGroundResponse(
    hallucinated10Records,
    "10 record answer",
    factPack,
    "Calculate overall average Monthly_Revenue using the High, Medium, and Low group counts and averages."
  );

  console.log("\n[Subtest 2] Hallucinated 10-record override result:");
  console.log(val2.explanation);
  if (val2.explanation.includes("10 customers") || val2.explanation.includes("629.90") || val2.explanation.includes("3/10")) {
    throw new Error("SUBTEST 2 FAILED: Hallucinated 10-record numbers were not overridden");
  }
  if (!val2.explanation.includes("30 customer records") || !val2.explanation.includes("541.37") || !val2.explanation.includes("16,241")) {
    throw new Error("SUBTEST 2 FAILED: Authoritative 30-record math missing");
  }
  console.log(">>> Subtest 2 Passed: 10-record hallucination successfully overridden by authoritative 30-record fact pack.");

  // Subtest 3: Causality leak removal
  const causalLeak = `High support tickets might be driving churn. Understanding the root causes will reduce churn, so management should reduce support tickets to reduce churn.`;
  const val3 = validateAndGroundResponse(causalLeak, "Causal test", factPack, "Does support-ticket volume cause churn?");

  console.log("\n[Subtest 3] Causality leak sanitization result:");
  console.log(val3.explanation);
  if (val3.explanation.includes("might be driving churn") || val3.explanation.includes("root causes will reduce churn") || val3.explanation.includes("management should reduce support tickets to reduce churn")) {
    throw new Error("SUBTEST 3 FAILED: Causal phrases leaked through");
  }
  console.log(">>> Subtest 3 Passed: Causal language reframed to observational association.");

  // Subtest 4: Invented limitations correction
  const fakeLimitation = `However, the dataset lacks complete information on the exact number of customers in each risk category.`;
  const val4 = validateAndGroundResponse(fakeLimitation, "Limitation test", factPack, "How many customers are in each tier?");

  console.log("\n[Subtest 4] Invented limitation correction result:");
  console.log(val4.explanation);
  if (val4.explanation.includes("lacks complete information on the exact number of customers")) {
    throw new Error("SUBTEST 4 FAILED: Invented limitation was not corrected");
  }
  if (!val4.explanation.includes("30 customers") || !val4.explanation.includes("High: 6")) {
    throw new Error("SUBTEST 4 FAILED: True categorical completeness missing");
  }
  console.log(">>> Subtest 4 Passed: False claim of missing cohort counts corrected.");

  // Subtest 5: Chart data normalization & empty state
  const rawEmpty = [{ category: "Unknown" }];
  const normalizedEmpty = normalizeChartData(rawEmpty);
  console.log("\n[Subtest 5] Raw non-numeric chart data normalized length:", normalizedEmpty.length);
  if (normalizedEmpty.length !== 0) {
    throw new Error("SUBTEST 5 FAILED: Invalid non-numeric chart data was not rejected");
  }

  const rawValid = [
    { Churn_Risk: "High", Monthly_Revenue: 46.50 },
    { Churn_Risk: "Medium", Monthly_Revenue: 164.75 },
    { Churn_Risk: "Low", Monthly_Revenue: 915.25 },
  ];
  const normalizedValid = normalizeChartData(rawValid);
  console.log("Normalized valid bars:", normalizedValid);
  if (normalizedValid.length !== 3 || normalizedValid[0].label !== "High" || normalizedValid[0].value !== 46.50) {
    throw new Error("SUBTEST 5 FAILED: Normalization did not produce { label, value }");
  }
  console.log(">>> Subtest 5 Passed: Chart data normalization and rejection works.");

  console.log("\n==================================================");
  console.log("RUNNING SECTION 14 EXACT FAILURE CASE TESTS (TESTS 1 - 9)");
  console.log("==================================================");

  // TEST 1: Customer counts per category
  console.log("\n--- TEST 1: Customer Count by Churn_Risk Category ---");
  const q1 = "How many customers are in each Churn_Risk category? Use the complete dataset.";
  const res1 = computeDeterministicAnalyticalResult(q1, factPack);
  if (res1.distribution?.tiers.find(t => t.name === "High")?.count !== 6 ||
      res1.distribution?.tiers.find(t => t.name === "Medium")?.count !== 8 ||
      res1.distribution?.tiers.find(t => t.name === "Low")?.count !== 16 ||
      res1.rowCount !== 30) {
    throw new Error("TEST 1 FAILED: Expected High=6, Medium=8, Low=16, Total=30");
  }
  console.log(">>> TEST 1 PASSED: High=6, Medium=8, Low=16, Total=30.");

  // TEST 2: Independent recalculation of High-risk count
  console.log("\n--- TEST 2: Independent Recalculation of High-Risk Count ---");
  const q2 = "Recalculate the High-risk count independently from the full dataset. Do not use the previous answer.";
  const res2 = computeDeterministicAnalyticalResult(q2, factPack);
  if (!res2.deterministicExplanation.includes("6 customers") || !res2.deterministicExplanation.includes("High Risk")) {
    throw new Error("TEST 2 FAILED: Expected High=6 confirmed independently");
  }

  // Also test user's specific failure case from Section 3
  const q2b = "You previously told me that High Risk contains 6 customers. Recalculate it independently from the full dataset. If your current calculation differs from 6, tell me exactly why. Do not simply repeat the previous answer.";
  const res2b = computeDeterministicAnalyticalResult(q2b, factPack);
  if (!res2b.deterministicExplanation.includes("6 customers") || res2b.intent === "CAUSALITY_CHECK" || res2b.intent === "CAUSALITY_INQUIRY") {
    throw new Error("TEST 2b FAILED: Recalculate query must not misroute to causality check");
  }
  console.log(">>> TEST 2 PASSED: Recalculated High=6 with 0 discrepancy, no false causality misrouting.");

  // TEST 3: Average Monthly_Revenue for High, Medium, Low
  console.log("\n--- TEST 3: Average Monthly_Revenue by Churn_Risk Tier ---");
  const q3 = "What is the average Monthly_Revenue for High, Medium, and Low Churn_Risk?";
  const res3 = computeDeterministicAnalyticalResult(q3, factPack);
  const avgHigh = res3.weightedAverage?.groups.find(g => g.name === "High")?.average;
  const avgMed = res3.weightedAverage?.groups.find(g => g.name === "Medium")?.average;
  const avgLow = res3.weightedAverage?.groups.find(g => g.name === "Low")?.average;
  if (avgHigh !== 46.50 || avgMed !== 164.75 || avgLow !== 915.25) {
    throw new Error(`TEST 3 FAILED: Expected 46.50, 164.75, 915.25; got ${avgHigh}, ${avgMed}, ${avgLow}`);
  }
  console.log(">>> TEST 3 PASSED: High=$46.50, Medium=$164.75, Low=$915.25.");

  // TEST 4: Bar chart of average Monthly_Revenue by Churn_Risk
  console.log("\n--- TEST 4: Bar Chart of Average Monthly_Revenue by Churn_Risk ---");
  const q4 = "Create a bar chart of average Monthly_Revenue by Churn_Risk. Use the complete dataset.";
  const res4 = computeDeterministicAnalyticalResult(q4, factPack);
  if (res4.chartSpec?.chartType !== "bar" || res4.chartSpec.chartData.length !== 3) {
    throw new Error("TEST 4 FAILED: Chart spec invalid");
  }
  if (res4.chartSpec.chartData[0].value !== 46.50 || res4.chartSpec.chartData[1].value !== 164.75 || res4.chartSpec.chartData[2].value !== 915.25) {
    throw new Error("TEST 4 FAILED: Bar chart values do not match deterministic engine");
  }
  console.log(">>> TEST 4 PASSED: Chart type bar, High=46.50, Medium=164.75, Low=915.25.");

  // TEST 5: Factors correlating with Churn_Risk
  console.log("\n--- TEST 5: Factors Correlating Most Strongly with Churn_Risk ---");
  const q5 = "What factors correlate most strongly with Churn_Risk?";
  const res5 = computeDeterministicAnalyticalResult(q5, factPack);
  const val5 = validateAndGroundResponse(res5.deterministicExplanation, res5.deterministicInsight, factPack, q5);
  if (val5.explanation.includes("p <") || val5.explanation.includes("p-value")) {
    throw new Error("TEST 5 FAILED: Must not produce uncalculated p-values");
  }
  if (!val5.explanation.includes("-0.960") || !val5.explanation.includes("+0.938")) {
    throw new Error("TEST 5 FAILED: Deterministic correlations missing");
  }
  console.log(">>> TEST 5 PASSED: Deterministic correlations cited without invented p-values.");

  // TEST 6: Single customer most likely to churn & individual probability
  console.log("\n--- TEST 6: Individual Probability Refusal ---");
  const q6 = "Which single customer is most likely to churn? Give me their ID and their probability. If the dataset cannot support an individual probability, explicitly explain why.";
  const res6 = computeDeterministicAnalyticalResult(q6, factPack);
  if (res6.intent !== "INDIVIDUAL_PROBABILITY_CHECK") {
    throw new Error("TEST 6 FAILED: Did not classify as INDIVIDUAL_PROBABILITY_CHECK");
  }
  if (!res6.deterministicExplanation.includes("does not provide individual churn probabilities")) {
    throw new Error("TEST 6 FAILED: Must explicitly refuse individual probability");
  }
  if (/\b\d{1,2}%\b/.test(res6.deterministicExplanation)) {
    throw new Error("TEST 6 FAILED: Must not invent a percentage probability");
  }
  console.log(">>> TEST 6 PASSED: Individual probability refused with qualitative tier explanation.");

  // TEST 7: Causality refusal & observed overlap of Support_Tickets > 5
  console.log("\n--- TEST 7: Causality Refusal & Observed Overlap ---");
  const q7 = "How many customers churned specifically because they received more than 5 support tickets?";
  const res7 = computeDeterministicAnalyticalResult(q7, factPack);
  if (res7.intent !== "CAUSALITY_CHECK") {
    throw new Error("TEST 7 FAILED: Did not classify as CAUSALITY_CHECK");
  }
  if (!res7.deterministicExplanation.includes("cannot establish how many customers churned specifically")) {
    throw new Error("TEST 7 FAILED: Must state dataset cannot establish causal churn count");
  }
  if (!res7.deterministicExplanation.includes("7 total customers") || !res7.deterministicExplanation.includes("6 of those 7")) {
    throw new Error("TEST 7 FAILED: Must report observed overlap: 7 customers >5 tickets (6 High Risk, 1 Medium Risk)");
  }
  console.log(">>> TEST 7 PASSED: Causality refused; observed overlap (7 customers: 6 High, 1 Medium) accurately reported.");

  // TEST 8: Recalculate overall Monthly_Revenue average
  console.log("\n--- TEST 8: Recalculate Overall Monthly_Revenue Average ---");
  const q8 = "Recalculate the overall Monthly_Revenue average from the complete dataset.";
  const res8 = computeDeterministicAnalyticalResult(q8, factPack);
  if (!res8.deterministicExplanation.includes("541.37") || !res8.deterministicExplanation.includes("16,241")) {
    throw new Error("TEST 8 FAILED: Overall average must be $541.37 across 30 records ($16,241 total)");
  }
  console.log(">>> TEST 8 PASSED: Independently verified overall mean $541.37 matches dashboard KPI.");

  // TEST 9: Scatter plot of Support_Tickets vs Churn_Risk
  console.log("\n--- TEST 9: Scatter Plot of Support_Tickets vs Churn_Risk ---");
  const q9 = "Create a scatter plot of Support_Tickets vs Churn_Risk.";
  const res9 = computeDeterministicAnalyticalResult(q9, factPack);
  if (res9.chartSpec?.chartType !== "scatter") {
    throw new Error("TEST 9 FAILED: Chart type must be 'scatter'");
  }
  if (!res9.chartSpec?.chartData || res9.chartSpec.chartData.length !== 30) {
    throw new Error(`TEST 9 FAILED: Expected 30 scatter points, got ${res9.chartSpec?.chartData?.length}`);
  }
  const firstPoint = res9.chartSpec.chartData[0];
  if (typeof firstPoint.x !== "number" || typeof firstPoint.y !== "number") {
    throw new Error("TEST 9 FAILED: Scatter point coordinates must be numerical");
  }
  console.log(`>>> TEST 9 PASSED: Scatter plot spec generated with all ${res9.chartSpec.chartData.length} numerical coordinates.`);

  // =========================================================================
  // FINAL ANALYTICAL INTEGRITY VALIDATION PASS (TESTS V1 - V9)
  // =========================================================================
  console.log("\n==================================================");
  console.log("RUNNING FINAL VALIDATION PASS TESTS (TESTS V1 - V9)");
  console.log("==================================================");

  // V1: Basic factual consistency
  console.log("\n--- TEST V1: Total Customers & High/Med/Low Counts ---");
  const qV1 = "What is the total number of customers, and how many are High, Medium, and Low risk?";
  const resV1 = computeDeterministicAnalyticalResult(qV1, factPack);
  if (!resV1.deterministicExplanation.includes("30 customers") ||
      !resV1.deterministicExplanation.includes("High: 6") ||
      !resV1.deterministicExplanation.includes("Medium: 8") ||
      !resV1.deterministicExplanation.includes("Low: 16")) {
    throw new Error("TEST V1 FAILED: Did not provide canonical counts High=6, Med=8, Low=16, Total=30");
  }
  console.log(">>> TEST V1 PASSED: Total=30, High=6, Medium=8, Low=16.");

  // V2: Combined calculation (Total revenue and Low-risk percentage)
  console.log("\n--- TEST V2: Total Monthly_Revenue & Low-Risk Share ---");
  const qV2 = "What is the total Monthly_Revenue, and what percentage of total revenue comes from Low-risk customers?";
  const resV2 = computeDeterministicAnalyticalResult(qV2, factPack);
  if (!resV2.deterministicExplanation.includes("16,241") ||
      !resV2.deterministicExplanation.includes("14,644") ||
      !resV2.deterministicExplanation.includes("90.17%")) {
    throw new Error("TEST V2 FAILED: Expected Total=$16,241, Low-risk=$14,644, Low-risk share=90.17%");
  }
  console.log(">>> TEST V2 PASSED: Total=$16,241.00, Low-risk=$14,644.00, Low-risk share=90.17%.");

  // V3: Ranked group comparison
  console.log("\n--- TEST V3: Ranked Groups by Average Monthly_Revenue ---");
  const qV3 = "Rank the three Churn_Risk groups by average Monthly_Revenue and show the exact averages.";
  const resV3 = computeDeterministicAnalyticalResult(qV3, factPack);
  if (!resV3.deterministicExplanation.includes("915.25") ||
      !resV3.deterministicExplanation.includes("164.75") ||
      !resV3.deterministicExplanation.includes("46.50")) {
    throw new Error("TEST V3 FAILED: Must contain exact averages: Low=$915.25, Med=$164.75, High=$46.50");
  }
  if (!resV3.deterministicExplanation.includes("Ranked by average Monthly_Revenue")) {
    throw new Error("TEST V3 FAILED: Must provide explicit ranked order");
  }
  console.log(">>> TEST V3 PASSED: Ranked averages: Low=$915.25, Medium=$164.75, High=$46.50.");

  // V4: Individual row lookup
  console.log("\n--- TEST V4: High Risk Customer IDs and Monthly_Revenue ---");
  const qV4 = "Which customers are classified as High Risk? Give me their IDs and Monthly_Revenue.";
  const resV4 = computeDeterministicAnalyticalResult(qV4, factPack);
  const expectedHighIds = ["C005", "C008", "C012", "C017", "C023", "C029"];
  for (const id of expectedHighIds) {
    if (!resV4.deterministicExplanation.includes(id)) {
      throw new Error(`TEST V4 FAILED: Missing customer ID ${id}`);
    }
  }
  if (!resV4.deterministicExplanation.includes("35.00") || !resV4.deterministicExplanation.includes("42.00")) {
    throw new Error("TEST V4 FAILED: Must contain exact row revenue values (e.g. C005=$35.00, C008=$42.00)");
  }
  console.log(">>> TEST V4 PASSED: Exact High Risk IDs and row revenues matched.");

  // V5: Filtered analysis
  console.log("\n--- TEST V5: Support_Tickets > 5 AND High Risk Intersection ---");
  const qV5a = "How many customers have more than 5 Support_Tickets and are classified as High Risk?";
  const resV5a = computeDeterministicAnalyticalResult(qV5a, factPack);
  if (!resV5a.deterministicExplanation.includes("6 customers")) {
    throw new Error("TEST V5a FAILED: Expected exactly 6 customers");
  }
  const qV5b = "Show me those customer IDs.";
  const resV5b = computeDeterministicAnalyticalResult(qV5b, factPack);
  for (const id of expectedHighIds) {
    if (!resV5b.deterministicExplanation.includes(id)) {
      throw new Error(`TEST V5b FAILED: Missing customer ID ${id}`);
    }
  }
  console.log(">>> TEST V5 PASSED: Filter count = 6, IDs = C005, C008, C012, C017, C023, C029.");

  // V6: Correlation and sign explanation
  console.log("\n--- TEST V6: Three Strongest Correlations & Sign Meaning ---");
  const qV6 = "What are the three strongest correlations with Churn_Risk? Give me the coefficient and explain what the sign means.";
  const resV6 = computeDeterministicAnalyticalResult(qV6, factPack);
  if (!resV6.deterministicExplanation.includes("-0.960") ||
      !resV6.deterministicExplanation.includes("+0.938")) {
    throw new Error("TEST V6 FAILED: Expected deterministic coefficients (Feature_Adoption: -0.960, Support_Tickets: +0.938)");
  }
  if (resV6.deterministicExplanation.toLowerCase().includes("p <") ||
      resV6.deterministicExplanation.toLowerCase().includes("p-value")) {
    throw new Error("TEST V6 FAILED: Fabricated p-values detected");
  }
  console.log(">>> TEST V6 PASSED: Deterministic coefficients cited, sign meaning explained, no fake p-values.");

  // V7: Memory / Recalculation test
  console.log("\n--- TEST V7: Memory / Independent Recalculation ---");
  const qV7a = "How many High-risk customers are there?";
  const resV7a = computeDeterministicAnalyticalResult(qV7a, factPack);
  if (!resV7a.deterministicExplanation.includes("6 customers")) {
    throw new Error("TEST V7a FAILED: Expected 6 customers");
  }
  const qV7b = "Earlier you said there are 6 High-risk customers. Ignore that previous answer completely. Recalculate the number directly from the full dataset. What is the result?";
  const resV7b = computeDeterministicAnalyticalResult(qV7b, factPack);
  if (!resV7b.deterministicExplanation.includes("6 customers") ||
      resV7b.deterministicExplanation.toLowerCase().includes("might be driving churn")) {
    throw new Error("TEST V7b FAILED: Expected independent recalculation yielding 6 without causal diversion");
  }
  console.log(">>> TEST V7 PASSED: Both initial query and recalculation returned 6.");

  // V8: Unsupported individual probability for C005
  console.log("\n--- TEST V8: Individual Churn Probability Refusal for C005 ---");
  const qV8 = "Give me the probability that customer C005 will churn.";
  const resV8 = computeDeterministicAnalyticalResult(qV8, factPack);
  if (!resV8.deterministicExplanation.includes("No individual churn probability can be established") ||
      !resV8.deterministicExplanation.includes("C005")) {
    throw new Error("TEST V8 FAILED: Must explicitly refuse probability and cite C005 record context");
  }
  if (/\b\d{1,2}%\b/.test(resV8.deterministicExplanation.split("[Analytical Limitation]")[0])) {
    throw new Error("TEST V8 FAILED: Fabricated percentage probability in answer");
  }
  console.log(">>> TEST V8 PASSED: Individual probability refused for C005; no percentage invented.");

  // V9: Executive reasoning test
  console.log("\n--- TEST V9: Executive Reasoning (Demonstrated vs Investigating vs Not Established) ---");
  const qV9 = "I'm presenting this dataset to management tomorrow. Give me the three most important things I should know, but clearly separate what the data directly demonstrates from what would require further investigation. Do not claim causation.";
  const resV9 = computeDeterministicAnalyticalResult(qV9, factPack);
  if (!resV9.deterministicExplanation.includes("DIRECTLY DEMONSTRATED") ||
      !resV9.deterministicExplanation.includes("SUGGESTED / WORTH INVESTIGATING") ||
      !resV9.deterministicExplanation.includes("NOT ESTABLISHED")) {
    throw new Error("TEST V9 FAILED: Must separate into DIRECTLY DEMONSTRATED, SUGGESTED / WORTH INVESTIGATING, NOT ESTABLISHED");
  }
  if (resV9.deterministicExplanation.toLowerCase().includes("customer lifetime value") ||
      resV9.deterministicExplanation.toLowerCase().includes("clv")) {
    throw new Error("TEST V9 FAILED: Do NOT call Monthly_Revenue Customer Lifetime Value");
  }
  if (resV9.deterministicExplanation.toLowerCase().includes("will reduce churn")) {
    throw new Error("TEST V9 FAILED: Causal overreach detected ('will reduce churn')");
  }
  console.log(">>> TEST V9 PASSED: Cleanly structured executive brief with empirical boundaries preserved.");

  console.log("\n==================================================");
  console.log("ALL CHURN TESTS (TESTS A-F, SECTION 14 1-9, AND V1-V9) PASSED!");
  console.log("==================================================");
}

function runEcommerceRegressionSuite() {
  console.log("\n==================================================");
  console.log("RUNNING E-COMMERCE ANALYTICAL INTEGRITY SUITE (TESTS A-I)");
  console.log("==================================================");

  // Ingest the authoritative 25-record e-commerce sales dataset
  const parsed = parseTabularData(SAMPLE_DATASETS.ecommerce, "csv");
  const dashboard = generateInitialDashboard(parsed);
  const factPack = dashboard.profile?.factPack;

  if (!factPack) {
    throw new Error("FAIL: factPack missing on e-commerce dashboard profile");
  }

  const rowCount = factPack.metadata.rowCount;
  console.log(`Active Dataset: rowCount = ${rowCount}, columns = ${factPack.metadata.columnCount}`);
  if (rowCount !== 25) {
    throw new Error(`FAIL: Active dataset must have 25 records, found ${rowCount}`);
  }

  const ctx = factPack.analysisContext;
  if (!ctx) {
    throw new Error("FAIL: analysisContext missing on factPack");
  }

  // -------------------------------------------------------------------------
  // TEST A: Cross-Dataset Semantic Contamination Check
  // -------------------------------------------------------------------------
  console.log("\n--- TEST A: Cross-Dataset Semantic Contamination ---");
  const qA = "What is the average revenue per record?";
  const resA = computeDeterministicAnalyticalResult(qA, factPack);
  if (!resA.deterministicExplanation.includes("3,762")) {
    throw new Error(`TEST A FAILED: Expected average revenue $3,762, got: ${resA.deterministicExplanation}`);
  }
  const contaminationTerms = ["churn", "nps", "support_tickets", "541.37", "c005", "16,241"];
  for (const term of contaminationTerms) {
    if (resA.deterministicExplanation.toLowerCase().includes(term)) {
      throw new Error(`TEST A FAILED: Churn contamination '${term}' found in e-commerce response`);
    }
  }
  // Test response validator contamination purge
  const contaminatedCandidate = "The portfolio generates steady overall revenue with an average account yield of $541.37 per month across 30 accounts with churn risk.";
  const valA = validateAndGroundResponse(contaminatedCandidate, "Test insight", factPack, qA);
  if (valA.explanation.includes("541.37") || valA.explanation.toLowerCase().includes("churn")) {
    throw new Error("TEST A FAILED: Validator did not purge churn contamination from candidate response");
  }
  console.log(">>> TEST A PASSED: Average revenue = $3,762; zero churn contamination; validator purges leaked terms.");

  // -------------------------------------------------------------------------
  // TEST B: Category Aggregation & Profit Margins (Authoritative 3 Categories)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST B: Category Aggregation & Margins ---");
  const qB = "Compare profit margins across categories.";
  const resB = computeDeterministicAnalyticalResult(qB, factPack);
  if (!resB.isHandled || resB.intent !== "CATEGORY_COMPARISON") {
    throw new Error("TEST B FAILED: Did not classify as CATEGORY_COMPARISON");
  }

  // 9. Exact Authoritative Category Assertions
  const grps = resB.groupAggregation?.groups;
  if (!grps || grps.length !== 3) {
    throw new Error(`TEST B FAILED: Expected exactly 3 categories in groupAggregation, found ${grps?.length}`);
  }

  const elec = grps.find((g) => g.category === "Electronics");
  const furn = grps.find((g) => g.category === "Furniture");
  const off = grps.find((g) => g.category === "Office");

  if (!elec || !furn || !off) {
    throw new Error("TEST B FAILED: Missing one of the required categories (Electronics, Furniture, Office)");
  }

  // Electronics assertions
  if (elec.count !== 14 || elec.revenue !== 66600 || elec.cost !== 46450 || elec.profit !== 20150 || Math.abs(elec.exactMargin - 30.2553) > 0.001) {
    throw new Error(`TEST B FAILED: Electronics values mismatch: count=${elec.count} (exp 14), rev=${elec.revenue} (exp 66600), cost=${elec.cost} (exp 46450), profit=${elec.profit} (exp 20150), margin=${elec.exactMargin}% (exp 30.2553%)`);
  }

  // Furniture assertions
  if (furn.count !== 6 || furn.revenue !== 14850 || furn.cost !== 9900 || furn.profit !== 4950 || Math.abs(furn.exactMargin - 33.3333) > 0.001) {
    throw new Error(`TEST B FAILED: Furniture values mismatch: count=${furn.count} (exp 6), rev=${furn.revenue} (exp 14850), cost=${furn.cost} (exp 9900), profit=${furn.profit} (exp 4950), margin=${furn.exactMargin}% (exp 33.3333%)`);
  }

  // Office assertions
  if (off.count !== 5 || off.revenue !== 12600 || off.cost !== 8190 || off.profit !== 4410 || Math.abs(off.exactMargin - 35.0000) > 0.001) {
    throw new Error(`TEST B FAILED: Office values mismatch: count=${off.count} (exp 5), rev=${off.revenue} (exp 12600), cost=${off.cost} (exp 8190), profit=${off.profit} (exp 4410), margin=${off.exactMargin}% (exp 35.0000%)`);
  }

  // Overall reconciliation assertions
  const totRev = resB.groupAggregation?.totalRevenue;
  const totCost = resB.groupAggregation?.totalCost;
  const totProfit = resB.groupAggregation?.totalProfit;
  const totMargin = resB.groupAggregation?.totalMargin;
  const totCount = elec.count + furn.count + off.count;

  if (totCount !== 25 || totRev !== 94050 || totCost !== 64540 || totProfit !== 29510) {
    throw new Error(`TEST B FAILED: Total aggregation mismatch: count=${totCount} (exp 25), rev=${totRev} (exp 94050), cost=${totCost} (exp 64540), profit=${totProfit} (exp 29510)`);
  }

  // 10. Regression Assertion: All categories returned must exist in the active dataset
  const activeDatasetCategories = Array.from(new Set((factPack.tableData || []).map((r: any) => String(r.Category || "").trim())));
  for (const g of grps) {
    if (!activeDatasetCategories.includes(g.category)) {
      throw new Error(`TEST B FAILED: Returned category '${g.category}' does not exist in active dataset categories [${activeDatasetCategories.join(", ")}]`);
    }
  }

  // 11. Regression Assertion: No category/customer-type label may be introduced if absent from Fact Pack
  const candidateWithInventions = "The dataset has Electronics, Furniture, Office, and Clothing categories, with Corporate and Wholesale customers.";
  const valWithInventions = validateAndGroundResponse(candidateWithInventions, "Test insight", factPack, qB);
  if (valWithInventions.explanation.toLowerCase().includes("clothing")) {
    throw new Error("TEST B FAILED (Assertion 11): Validator allowed invented category 'Clothing'");
  }
  if (valWithInventions.explanation.toLowerCase().includes("corporate")) {
    throw new Error("TEST B FAILED (Assertion 11): Validator allowed invented customer type 'Corporate'");
  }
  if (valWithInventions.explanation.toLowerCase().includes("wholesale")) {
    throw new Error("TEST B FAILED (Assertion 11): Validator allowed invented customer type 'Wholesale'");
  }

  // 12. Explicit Rejection Tests:
  // Rejection 12a: "Clothing"
  const candidateClothing = "Office has 35% margin, Furniture has 33.3%, and Clothing has 15% margin.";
  const valClothing = validateAndGroundResponse(candidateClothing, "Test", factPack, qB);
  if (valClothing.explanation.toLowerCase().includes("clothing")) {
    throw new Error("TEST B FAILED (Assertion 12a): Failed to explicitly reject 'Clothing'");
  }

  // Rejection 12b: "Corporate"
  const candidateCorporate = "Office has 35% margin, Furniture has 33.3%, and Electronics has 30.3% driven by Corporate contracts.";
  const valCorporate = validateAndGroundResponse(candidateCorporate, "Test", factPack, qB);
  if (valCorporate.explanation.toLowerCase().includes("corporate")) {
    throw new Error("TEST B FAILED (Assertion 12b): Failed to explicitly reject 'Corporate'");
  }

  // Rejection 12c: "Furniture count 11"
  const candidateFurn11 = "Furniture has 11 orders totaling $40,700 with a 31.4% margin.";
  const valFurn11 = validateAndGroundResponse(candidateFurn11, "Test", factPack, qB);
  if (valFurn11.explanation.includes("11 orders") || (valFurn11.explanation.includes("11") && valFurn11.explanation.toLowerCase().includes("furniture") && !valFurn11.explanation.includes("6 (Furniture)"))) {
    throw new Error("TEST B FAILED (Assertion 12c): Failed to explicitly reject Furniture count 11");
  }

  // Rejection 12d: "Electronics margin 31.4%"
  const candidateElec314 = "Electronics has a 31.4% margin across 14 orders.";
  const valElec314 = validateAndGroundResponse(candidateElec314, "Test", factPack, qB);
  if (valElec314.explanation.includes("Electronics: 31.4%") || valElec314.explanation.includes("Electronics has a 31.4%")) {
    throw new Error("TEST B FAILED (Assertion 12d): Failed to explicitly reject Electronics margin 31.4%");
  }

  console.log(">>> TEST B PASSED: Electronics (N=14, 30.2553%), Furniture (N=6, 33.3333%), Office (N=5, 35.0000%) verified.");
  console.log(">>> Regression Assertions 9, 10, 11, 12 (explicit rejections of Clothing, Corporate, Furniture N=11, Electronics margin 31.4%) all PASSED!");

  // -------------------------------------------------------------------------
  // TEST C: Metric Preservation (Revenue Over Time vs Units Substitution)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST C: Metric Preservation (Revenue Over Time) ---");
  const qC = "How has revenue changed over time?";
  const resC = computeDeterministicAnalyticalResult(qC, factPack);
  if (!resC.isHandled || resC.intent !== "REVENUE_OVER_TIME") {
    throw new Error("TEST C FAILED: Did not classify as REVENUE_OVER_TIME");
  }
  if (!resC.deterministicExplanation.includes("94,050")) {
    throw new Error("TEST C FAILED: Expected total revenue $94,050");
  }
  if (!resC.deterministicExplanation.includes("HISTORICAL OBSERVATION") || !resC.deterministicExplanation.includes("DIRECTIONAL PROJECTION")) {
    throw new Error("TEST C FAILED: Must distinguish historical observation from directional projection");
  }
  // Check that validator flags/overrides unit substitution
  const unitSubstituted = "Over time, total units reached 198 with peak order volumes occurring in mid-month.";
  const valC = validateAndGroundResponse(unitSubstituted, "Test insight", factPack, qC);
  if (!valC.explanation.includes("94,050")) {
    throw new Error("TEST C FAILED: Validator did not correct metric substitution back to Revenue");
  }
  console.log(">>> TEST C PASSED: Revenue ($94,050) preserved over time; historical vs directional separated; Units substitution corrected.");

  // -------------------------------------------------------------------------
  // TEST D: Executive Presentation (3 Evidence-Backed Observations)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST D: Executive Presentation ---");
  const qD = "I'm presenting this dataset to management. What are the 3 most important things they should know?";
  const resD = computeDeterministicAnalyticalResult(qD, factPack);
  if (!resD.isHandled || resD.intent !== "EXECUTIVE_PRESENTATION") {
    throw new Error("TEST D FAILED: Did not classify as EXECUTIVE_PRESENTATION");
  }
  const expD = resD.deterministicExplanation;
  const sections = ["WHAT THE DATA DEMONSTRATES", "WHY IT MAY MATTER", "WHAT TO INVESTIGATE NEXT"];
  for (const sec of sections) {
    const count = (expD.match(new RegExp(sec, "g")) || []).length;
    if (count !== 3) {
      throw new Error(`TEST D FAILED: Expected section '${sec}' exactly 3 times, got ${count}`);
    }
  }
  if (!expD.includes("North") || !expD.includes("South") || !expD.includes("35.0000%") || !expD.includes("33.3333%") || !expD.includes("30.2553%")) {
    throw new Error("TEST D FAILED: Missing key factual observations (North/South asymmetry or exact category margins 35.0%, 33.3%, 30.3%)");
  }
  if (expD.toLowerCase().includes("corporate")) {
    throw new Error("TEST D FAILED: Executive presentation must NOT contain invented 'Corporate' customer type");
  }
  if (!expD.includes("Returning") || !expD.includes("New")) {
    throw new Error("TEST D FAILED: Executive presentation must reference actual Returning and New customer cohorts");
  }
  console.log(">>> TEST D PASSED: Exactly 3 evidence-backed observations with Demonstrated, Matters, and Investigate Next; Zero 'Corporate'; Exact category margins verified.");

  // -------------------------------------------------------------------------
  // TEST E: Missing Metric (Customer Acquisition Cost / CAC Refusal)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST E: Missing Metric (CAC Refusal) ---");
  const qE = "What is our customer acquisition cost (CAC) by region?";
  const resE = computeDeterministicAnalyticalResult(qE, factPack);
  if (!resE.isHandled || resE.intent !== "UNAVAILABLE_METRIC") {
    throw new Error("TEST E FAILED: Did not classify as UNAVAILABLE_METRIC");
  }
  if (!resE.deterministicExplanation.toLowerCase().includes("unavailable") && !resE.deterministicExplanation.toLowerCase().includes("cannot be calculated")) {
    throw new Error("TEST E FAILED: Must state metric is unavailable and cannot be calculated");
  }
  if (/\$\d+/.test(resE.deterministicExplanation.split("[Available Regional Metrics]")[0])) {
    throw new Error("TEST E FAILED: Fabricated CAC dollar values in direct answer");
  }
  // Validator unavailable metric test
  const hallucinatedCac = "The CAC for North region is $45.20 and West is $38.50.";
  const valE = validateAndGroundResponse(hallucinatedCac, "Test insight", factPack, qE);
  if (valE.explanation.includes("$45.20")) {
    throw new Error("TEST E FAILED: Validator did not override hallucinated CAC values");
  }
  console.log(">>> TEST E PASSED: CAC declared unavailable and uncomputable; no numbers fabricated; validator enforced refusal.");

  // -------------------------------------------------------------------------
  // TEST F: Dataset Identity & State Isolation (Stale State Rejection)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST F: Dataset Identity & State Isolation ---");
  if (ctx.rowCount !== 25) {
    throw new Error(`TEST F FAILED: Expected ctx.rowCount 25, got ${ctx.rowCount}`);
  }
  if (!ctx.columns.includes("Order_ID") || !ctx.columns.includes("Category") || !ctx.columns.includes("Revenue")) {
    throw new Error("TEST F FAILED: Columns mismatch in analysisContext");
  }
  // Re-run churn query against churn dataset to ensure no state pollution
  const churnParsed = parseTabularData(SAMPLE_DATASETS.churn, "csv");
  const churnDashboard = generateInitialDashboard(churnParsed);
  const churnFactPack = churnDashboard.profile?.factPack;
  if (!churnFactPack) {
    throw new Error("FAIL: churnFactPack missing");
  }
  const resChurn = computeDeterministicAnalyticalResult("What is the overall average Monthly_Revenue?", churnFactPack);
  if (!resChurn.deterministicExplanation.includes("541.37")) {
    throw new Error("TEST F FAILED: Churn query on churn dataset failed to produce $541.37");
  }
  // Re-run e-commerce query on e-commerce dataset
  const resEcom = computeDeterministicAnalyticalResult("What is the average revenue per record?", factPack);
  if (!resEcom.deterministicExplanation.includes("3,762")) {
    throw new Error("TEST F FAILED: E-commerce query on e-commerce dataset failed to produce $3,762");
  }
  console.log(">>> TEST F PASSED: State isolation confirmed; churn yields $541.37, e-commerce yields $3,762 independently.");

  // -------------------------------------------------------------------------
  // TEST G: Total Profit Calculation
  // -------------------------------------------------------------------------
  console.log("\n--- TEST G: Total Profit Calculation ---");
  const qG = "What is the total profit?";
  const resG = computeDeterministicAnalyticalResult(qG, factPack);
  if (!resG.isHandled || resG.intent !== "TOTAL_PROFIT") {
    throw new Error("TEST G FAILED: Did not classify as TOTAL_PROFIT");
  }
  if (!resG.deterministicExplanation.includes("29,510")) {
    throw new Error(`TEST G FAILED: Expected total profit $29,510, got: ${resG.deterministicExplanation}`);
  }
  if (!resG.deterministicExplanation.includes("94,050") || !resG.deterministicExplanation.includes("64,540")) {
    throw new Error("TEST G FAILED: Expected Revenue ($94,050) and Cost ($64,540) in calculation");
  }
  console.log(">>> TEST G PASSED: Total Profit = $29,510 ($94,050 - $64,540, 31.4% margin).");

  // -------------------------------------------------------------------------
  // TEST H: Region Revenue
  // -------------------------------------------------------------------------
  console.log("\n--- TEST H: Region Revenue ---");
  const qH = "What is the revenue by region?";
  const resH = computeDeterministicAnalyticalResult(qH, factPack);
  if (!resH.isHandled || resH.intent !== "REGION_REVENUE") {
    throw new Error("TEST H FAILED: Did not classify as REGION_REVENUE");
  }
  const expH = resH.deterministicExplanation;
  if (!expH.includes("26,950") || !expH.includes("25,800") || !expH.includes("23,800") || !expH.includes("17,500")) {
    throw new Error(`TEST H FAILED: Regional revenue values mismatch: ${expH}`);
  }
  console.log(">>> TEST H PASSED: North=$26,950, West=$25,800, East=$23,800, South=$17,500. Total=$94,050.");

  // -------------------------------------------------------------------------
  // TEST I: Region Profit
  // -------------------------------------------------------------------------
  console.log("\n--- TEST I: Region Profit ---");
  const qI = "What is the profit by region?";
  const resI = computeDeterministicAnalyticalResult(qI, factPack);
  if (!resI.isHandled || resI.intent !== "REGION_PROFIT") {
    throw new Error("TEST I FAILED: Did not classify as REGION_PROFIT");
  }
  const expI = resI.deterministicExplanation;
  if (!expI.includes("8,440") || !expI.includes("7,970") || !expI.includes("7,430") || !expI.includes("5,670")) {
    throw new Error(`TEST I FAILED: Regional profit values mismatch: ${expI}`);
  }
  console.log(">>> TEST I PASSED: North=$8,440, West=$7,970, East=$7,430, South=$5,670. Total=$29,510.");

  console.log("\n==================================================");
  console.log("ALL E-COMMERCE INTEGRITY TESTS (TESTS A-I) PASSED!");
  console.log("==================================================");
}

function runSemanticOverreachRegressionTests() {
  console.log("\n==================================================");
  console.log("RUNNING SEMANTIC OVERREACH & CAUSAL GUARDRAIL REGRESSION (TESTS A-F)");
  console.log("==================================================");

  const parsed = parseTabularData(SAMPLE_DATASETS.ecommerce, "csv");
  const dashboard = generateInitialDashboard(parsed);
  const factPack = dashboard.profile?.factPack;
  if (!factPack) {
    throw new Error("FAIL: factPack missing on e-commerce dashboard profile");
  }

  // -------------------------------------------------------------------------
  // TEST A: Regional comparison cannot convert correlation/difference into causation
  // -------------------------------------------------------------------------
  console.log("\n--- TEST A: Regional Comparison Non-Causality ---");
  // 1. Executive Presentation Observation 1 wording check
  const qPres = "I'm presenting this dataset to management. What are the 3 most important things they should know?";
  const resPres = computeDeterministicAnalyticalResult(qPres, factPack);
  if (!resPres.isHandled || resPres.intent !== "EXECUTIVE_PRESENTATION") {
    throw new Error("TEST A FAILED: Executive presentation query not handled");
  }
  const expPres = resPres.deterministicExplanation;

  // Preferred observational wording:
  // "South generated $17,500 in revenue versus $26,950 in North. South's average revenue per order was $2,500 versus approximately $4,492 in North."
  if (!expPres.includes("South generated $17,500 in revenue versus $26,950 in North")) {
    throw new Error(`TEST A FAILED: Missing preferred observational comparison for revenue: ${expPres}`);
  }
  if (!expPres.includes("South's average revenue per order was $2,500 versus approximately $4,492 in North")) {
    throw new Error(`TEST A FAILED: Missing preferred observational comparison for average revenue per order: ${expPres}`);
  }
  // Must NOT claim causation
  if (expPres.toLowerCase().includes("due to lower average revenue per order") || expPres.toLowerCase().includes("caused by lower average revenue")) {
    throw new Error("TEST A FAILED: Executive observation contains unsupported causal claim 'due to lower average revenue per order'");
  }
  if (!expPres.toLowerCase().includes("does not establish a causal relationship")) {
    throw new Error("TEST A FAILED: Executive presentation must explicitly state that regional differences do not establish causation");
  }

  // 2. Validator test on candidate response with causal overreach on regional comparison
  const causalRegionalCandidate = "South underperforms North by $9,450 (35.1%) in top-line revenue and $2,770 (32.8%) in profit due to lower average revenue per order, which caused the regional difference.";
  const valRegional = validateAndGroundResponse(causalRegionalCandidate, "Test insight", factPack, "Why does South underperform North?");
  if (valRegional.explanation.toLowerCase().includes("due to lower average revenue") || valRegional.explanation.toLowerCase().includes("which caused the regional")) {
    throw new Error(`TEST A FAILED: Validator failed to purge causal language from regional comparison: ${valRegional.explanation}`);
  }
  console.log(">>> TEST A PASSED: Regional comparison strictly observational; causal 'due to' eliminated; non-causality enforced.");

  // -------------------------------------------------------------------------
  // TEST B: Customer_Type = New/Returning cannot produce a retention-health conclusion
  // -------------------------------------------------------------------------
  console.log("\n--- TEST B: Customer_Type Cannot Produce Retention-Health Conclusion ---");
  // 1. Executive Presentation Observation 3 wording check
  if (!expPres.includes("Returning customers account for 61.6% of total revenue") || !expPres.includes("higher average revenue per order")) {
    throw new Error(`TEST B FAILED: Executive presentation missing observational statement on returning revenue: ${expPres}`);
  }
  // Must NOT state or imply healthy retention, strong retention, loyal customers, etc.
  const forbiddenRetentionTerms = [
    "healthy account retention",
    "healthy retention",
    "strong retention",
    "successful retention",
    "loyal customers",
    "customer loyalty",
    "retention improvement",
    "retention performance",
    "retention health"
  ];
  for (const term of forbiddenRetentionTerms) {
    if (expPres.toLowerCase().includes(term)) {
      throw new Error(`TEST B FAILED: Executive presentation contains forbidden retention claim '${term}'`);
    }
  }

  // 2. Candidate response trying to state retention health
  const candidateRetentionHealth = "Returning accounts generate 61.6% of total revenue and higher average order value, confirming healthy account retention, strong customer loyalty, and solid retention performance.";
  const valRetention = validateAndGroundResponse(candidateRetentionHealth, "Test insight", factPack, "What does customer type tell us about retention?");
  for (const term of forbiddenRetentionTerms) {
    if (valRetention.explanation.toLowerCase().includes(term)) {
      throw new Error(`TEST B FAILED: Validator allowed unsupported retention claim '${term}' to survive`);
    }
  }
  console.log(">>> TEST B PASSED: Customer_Type cannot produce retention-health conclusion; forbidden claims purged.");

  // -------------------------------------------------------------------------
  // TEST C: Returning revenue share can be calculated
  // -------------------------------------------------------------------------
  console.log("\n--- TEST C: Returning Revenue Share Calculation ---");
  const qC = "What is the revenue share of returning customers?";
  const resC = computeDeterministicAnalyticalResult(qC, factPack);
  if (!resC.isHandled || resC.intent !== "CUSTOMER_TYPE_BREAKDOWN") {
    throw new Error(`TEST C FAILED: Expected CUSTOMER_TYPE_BREAKDOWN intent, got ${resC.intent}`);
  }
  const expC = resC.deterministicExplanation;
  // 57,900 / 94,050 = 61.563% -> 61.6%
  if (!expC.includes("61.6%") && !expC.includes("61.56%")) {
    throw new Error(`TEST C FAILED: Returning revenue share 61.6% not found in: ${expC}`);
  }
  if (!expC.includes("57,900")) {
    throw new Error(`TEST C FAILED: Returning revenue $57,900 not found in: ${expC}`);
  }
  console.log(">>> TEST C PASSED: Returning revenue share deterministically calculated as 61.6% ($57,900 / $94,050).");

  // -------------------------------------------------------------------------
  // TEST D: Returning average revenue/order can be calculated
  // -------------------------------------------------------------------------
  console.log("\n--- TEST D: Returning Average Revenue per Order ---");
  const qD = "What is the average revenue per order for returning customers?";
  const resD = computeDeterministicAnalyticalResult(qD, factPack);
  if (!resD.isHandled || resD.intent !== "CUSTOMER_TYPE_BREAKDOWN") {
    throw new Error(`TEST D FAILED: Expected CUSTOMER_TYPE_BREAKDOWN intent, got ${resD.intent}`);
  }
  const expD = resD.deterministicExplanation;
  // 57,900 / 13 = 4,453.846... -> 4,453.85
  if (!expD.includes("4,453.85") && !expD.includes("4,454")) {
    throw new Error(`TEST D FAILED: Returning average revenue per order $4,453.85 not found in: ${expD}`);
  }
  if (!expD.includes("13 orders") && !expD.includes("13")) {
    throw new Error(`TEST D FAILED: Returning order count (13) not found in: ${expD}`);
  }
  console.log(">>> TEST D PASSED: Returning average revenue/order deterministically calculated as $4,453.85 across 13 orders.");

  // -------------------------------------------------------------------------
  // TEST E: Retention rate must be reported as unavailable when no retention fields exist
  // -------------------------------------------------------------------------
  console.log("\n--- TEST E: Retention Rate Unavailable Refusal ---");
  const qE = "What is our customer retention rate?";
  const resE = computeDeterministicAnalyticalResult(qE, factPack);
  if (!resE.isHandled || resE.intent !== "UNAVAILABLE_METRIC") {
    throw new Error(`TEST E FAILED: Expected UNAVAILABLE_METRIC intent, got ${resE.intent}`);
  }
  const expE = resE.deterministicExplanation;
  if (!expE.toLowerCase().includes("unavailable") && !expE.toLowerCase().includes("cannot be calculated")) {
    throw new Error(`TEST E FAILED: Must state metric is unavailable / cannot be calculated: ${expE}`);
  }
  // Check that validator intercepts fabricated retention rates
  const fakeRetentionCandidate = "Our customer retention rate is 65% based on the 13 returning accounts.";
  const valE = validateAndGroundResponse(fakeRetentionCandidate, "Test insight", factPack, qE);
  if (valE.explanation.includes("65%") && !valE.explanation.toLowerCase().includes("unavailable")) {
    throw new Error(`TEST E FAILED: Validator allowed fabricated 65% retention rate: ${valE.explanation}`);
  }
  console.log(">>> TEST E PASSED: Retention rate declared unavailable and uncomputable without customer tracking fields.");

  // -------------------------------------------------------------------------
  // TEST F: Causal wording rejection ("due to" / "caused by" / "driven by")
  // -------------------------------------------------------------------------
  console.log("\n--- TEST F: Causal Wording Rejection ---");
  const candidateF = "South underperformed North due to lower average revenue per order, which was caused by smaller basket sizes and driven by discounting.";
  const valF = validateAndGroundResponse(candidateF, "Test insight", factPack, "Analyze South underperformance");

  if (valF.explanation.toLowerCase().includes("due to") || valF.explanation.toLowerCase().includes("caused by") || valF.explanation.toLowerCase().includes("driven by")) {
    throw new Error(`TEST F FAILED: Validator failed to reject causal wording 'due to' / 'caused by' / 'driven by': ${valF.explanation}`);
  }
  console.log(">>> TEST F PASSED: Causal wording 'due to' / 'caused by' / 'driven by' cleanly rejected and reframed to observational association.");

  console.log("\n==================================================");
  console.log("ALL SEMANTIC OVERREACH TESTS (TESTS A-F) PASSED!");
  console.log("==================================================");
}

runRegressionSuite();
runEcommerceRegressionSuite();
runSemanticOverreachRegressionTests();



