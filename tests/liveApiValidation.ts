import { parseTabularData, SAMPLE_DATASETS, generateInitialDashboard } from "../lib/dataEngine";

async function runLiveValidation() {
  console.log("=== RUNNING LIVE API VALIDATION (http://localhost:3000/api/analyze) ===");

  const parsed = parseTabularData(SAMPLE_DATASETS.churn, "csv");
  const dashboard = generateInitialDashboard(parsed);
  const profile = dashboard.profile;
  const factPack = profile?.factPack;

  const testQueries = [
    {
      id: "TEST 1 — BASIC FACTUAL CONSISTENCY",
      query: "What is the total number of customers, and how many are High, Medium, and Low risk?",
      validate: (res: any) => {
        const exp = res.explanation || "";
        return exp.includes("30") && exp.includes("6") && exp.includes("8") && exp.includes("16");
      },
    },
    {
      id: "TEST 2 — COMBINED CALCULATION",
      query: "What is the total Monthly_Revenue, and what percentage of total revenue comes from Low-risk customers?",
      validate: (res: any) => {
        const exp = res.explanation || "";
        return exp.includes("16,241") && (exp.includes("90.17%") || exp.includes("90.2%")) && exp.includes("14,644");
      },
    },
    {
      id: "TEST 3 — RANKED GROUP COMPARISON",
      query: "Rank the three Churn_Risk groups by average Monthly_Revenue and show the exact averages.",
      validate: (res: any) => {
        const exp = res.explanation || "";
        return exp.includes("915.25") && exp.includes("164.75") && exp.includes("46.50");
      },
    },
    {
      id: "TEST 4 — INDIVIDUAL ROW LOOKUP",
      query: "Which customers are classified as High Risk? Give me their IDs and Monthly_Revenue.",
      validate: (res: any) => {
        const exp = res.explanation || "";
        const ids = ["C005", "C008", "C012", "C017", "C023", "C029"];
        return ids.every((id) => exp.includes(id)) && exp.includes("35.00");
      },
    },
    {
      id: "TEST 5 — FILTERED ANALYSIS (COUNT)",
      query: "How many customers have more than 5 Support_Tickets and are classified as High Risk?",
      validate: (res: any) => {
        const exp = res.explanation || "";
        return exp.includes("6 customers") || exp.includes("6 accounts") || exp.includes("6");
      },
    },
    {
      id: "TEST 5B — FILTERED ANALYSIS (IDS)",
      query: "Show me those customer IDs.",
      validate: (res: any) => {
        const exp = res.explanation || "";
        const ids = ["C005", "C008", "C012", "C017", "C023", "C029"];
        return ids.every((id) => exp.includes(id));
      },
    },
    {
      id: "TEST 6 — CORRELATION",
      query: "What are the three strongest correlations with Churn_Risk? Give me the coefficient and explain what the sign means.",
      validate: (res: any) => {
        const exp = res.explanation || "";
        return exp.includes("-0.960") && (exp.includes("+0.938") || exp.includes("0.938")) && !exp.toLowerCase().includes("p <");
      },
    },
    {
      id: "TEST 7 — MEMORY / RECALCULATION (INITIAL)",
      query: "How many High-risk customers are there?",
      validate: (res: any) => {
        const exp = res.explanation || "";
        return exp.includes("6 customers") || exp.includes("6");
      },
    },
    {
      id: "TEST 7B — MEMORY / RECALCULATION (INDEPENDENT)",
      query: "Earlier you said there are 6 High-risk customers. Ignore that previous answer completely. Recalculate the number directly from the full dataset. What is the result?",
      validate: (res: any) => {
        const exp = res.explanation || "";
        return exp.includes("6 customers") || exp.includes("6");
      },
    },
    {
      id: "TEST 8 — UNSUPPORTED INDIVIDUAL PROBABILITY",
      query: "Give me the probability that customer C005 will churn.",
      validate: (res: any) => {
        const exp = res.explanation || "";
        return (
          exp.includes("No individual churn probability can be established") &&
          exp.includes("C005") &&
          !/\b\d{1,2}%\b/.test(exp.split("[Analytical Limitation]")[0])
        );
      },
    },
    {
      id: "TEST 9 — EXECUTIVE REASONING TEST",
      query: "I'm presenting this dataset to management tomorrow. Give me the three most important things I should know, but clearly separate what the data directly demonstrates from what would require further investigation. Do not claim causation.",
      validate: (res: any) => {
        const exp = res.explanation || "";
        return (
          exp.includes("DIRECTLY DEMONSTRATED") &&
          exp.includes("SUGGESTED / WORTH INVESTIGATING") &&
          exp.includes("NOT ESTABLISHED") &&
          !exp.toLowerCase().includes("customer lifetime value") &&
          !exp.toLowerCase().includes("will reduce churn")
        );
      },
    },
  ];

  let allPassed = true;

  for (const t of testQueries) {
    console.log(`\n========================================`);
    console.log(`RUNNING: ${t.id}`);
    console.log(`Query: "${t.query}"`);

    const resp = await fetch("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: t.query,
        schema: parsed.columns,
        sampleData: parsed.data.slice(0, 3),
        profile,
        factPack,
      }),
    });

    if (!resp.ok) {
      console.error(`HTTP ERROR ${resp.status}`);
      allPassed = false;
      continue;
    }

    const data = await resp.json();
    const passed = t.validate(data);
    console.log(`Result: ${passed ? "PASSED" : "FAILED"}`);
    console.log(`Insight: "${data.insight}"`);
    console.log(`Explanation Preview (first 250 chars):\n${(data.explanation || "").slice(0, 250)}...`);

    if (!passed) {
      allPassed = false;
      console.error(`VALIDATION FAILED FOR: ${t.id}`);
      console.error(`Full Explanation:\n${data.explanation}`);
    }
  }

  console.log("\n========================================");
  if (allPassed) {
    console.log(">>> ALL LIVE API TESTS PASSED WITH 100% SUCCESS <<<");
  } else {
    console.error(">>> SOME LIVE API TESTS FAILED <<<");
    process.exit(1);
  }
}

runLiveValidation().catch((err) => {
  console.error("Live validation script error:", err);
  process.exit(1);
});
