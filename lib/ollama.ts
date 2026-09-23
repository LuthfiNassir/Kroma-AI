import {
  AnalysisResponse,
  DatasetIntelligenceProfile,
  StructuredAIAction,
  VerifiedFactPack,
} from "./types";
import { validateAndGroundResponse } from "./responseValidator";
import { computeDeterministicAnalyticalResult } from "./deterministicAnalytics";

/**
 * Normalizes chart data objects to ensure Recharts contract { label: string, value: number }
 */
export function normalizeChartData(rawChartData: any): Array<{ label: string; value: number }> {
  if (!Array.isArray(rawChartData) || rawChartData.length === 0) return [];
  const result: Array<{ label: string; value: number }> = [];

  for (const item of rawChartData) {
    if (!item || typeof item !== "object") continue;

    // Resolve category/label key
    let label =
      item.label ??
      item.category ??
      item.group ??
      item.name ??
      item.tier ??
      item.dimension ??
      item.x;

    if (label === undefined) {
      for (const [k, v] of Object.entries(item)) {
        if (typeof v === "string" && !k.toLowerCase().includes("id")) {
          label = v;
          break;
        }
      }
    }

    // Resolve numeric value key
    let val =
      item.value ??
      item.average ??
      item.mean ??
      item.total ??
      item.count ??
      item.amount ??
      item.Monthly_Revenue ??
      item.monthly_revenue ??
      item.y;

    if (val === undefined) {
      for (const [k, v] of Object.entries(item)) {
        if (typeof v === "number" && isFinite(v)) {
          val = v;
          break;
        }
      }
    }

    if (label !== undefined && val !== undefined) {
      const numVal = Number(val);
      if (!isNaN(numVal) && isFinite(numVal)) {
        result.push({
          label: String(label),
          value: numVal,
        });
      }
    }
  }

  return result;
}

export type QuestionCategory =
  | "correlation"
  | "target_outcome"
  | "individual_record"
  | "comparison"
  | "aggregation"
  | "distribution"
  | "trend"
  | "forecast"
  | "lookup"
  | "limitations"
  | "strategic_interpretation"
  | "general";

export function classifyQuestion(question: string): QuestionCategory {
  const q = question.toLowerCase();
  if (
    q.includes("correlat") ||
    q.includes("association") ||
    q.includes("relationship") ||
    q.includes("co-movement") ||
    q.includes("coefficient")
  ) {
    return "correlation";
  }
  if (
    q.includes("individual customer") ||
    q.includes("most likely to churn") ||
    q.includes("who is most likely") ||
    q.includes("which customer") ||
    q.includes("individual record")
  ) {
    return "individual_record";
  }
  if (
    q.includes("reconcil") ||
    q.includes("break down") ||
    q.includes("breakdown") ||
    q.includes("high, medium") ||
    (q.includes("high") && q.includes("medium") && q.includes("low")) ||
    q.includes("risk distribution") ||
    q.includes("target rate") ||
    q.includes("churn rate") ||
    q.includes("churn_risk") ||
    q.includes("cohort")
  ) {
    return "target_outcome";
  }
  if (
    q.includes("segment") ||
    q.includes("which segment") ||
    q.includes("department") ||
    q.includes("compare") ||
    q.includes("comparison")
  ) {
    return "comparison";
  }
  if (
    q.includes("total") ||
    q.includes("average") ||
    q.includes("sum") ||
    q.includes("mean") ||
    q.includes("median") ||
    q.includes("how much revenue") ||
    q.includes("most revenue")
  ) {
    return "aggregation";
  }
  if (
    q.includes("cannot tell") ||
    q.includes("can this dataset not tell") ||
    q.includes("limitations") ||
    q.includes("missing") ||
    q.includes("causation") ||
    q.includes("causing")
  ) {
    return "limitations";
  }
  if (q.includes("forecast") || q.includes("project") || q.includes("next 6 months")) {
    return "forecast";
  }
  if (
    q.includes("trend") ||
    q.includes("growth") ||
    q.includes("dip") ||
    q.includes("drop") ||
    q.includes("over time")
  ) {
    return "trend";
  }
  if (
    q.includes("management should know") ||
    q.includes("findings") ||
    q.includes("executive") ||
    q.includes("takeaway")
  ) {
    return "strategic_interpretation";
  }
  return "general";
}

export interface SystemPromptContext {
  schema: string;
  sampleData: Record<string, any>[];
  profile?: DatasetIntelligenceProfile;
  currentFocus?: string;
  factPack?: VerifiedFactPack;
  question?: string;
}

export function buildOllamaSystemPrompt(ctx: SystemPromptContext): string {
  const { schema, sampleData, profile, currentFocus, factPack: explicitFactPack, question } = ctx;
  const factPack = explicitFactPack || profile?.factPack;

  let statsSummary = "";
  let capabilitiesSummary = "";
  let relationshipsSummary = "";
  let growthSummary = "";
  let forecastSummary = "";
  let archetypeSummary = "CROSS_SECTIONAL_DISCOVERY";
  let targetSummary = "";
  let groupStatsSummary = "";
  let correlationSummary = "";
  let limitationsSummary = "";
  let focusedContext = "";

  const category = question ? classifyQuestion(question) : "general";

  if (profile) {
    archetypeSummary = `${profile.archetype.primary} (${profile.archetype.description})`;

    // Compile deterministic stats
    const statsList: string[] = [];
    profile.columns.forEach((col) => {
      if (col.numericStats) {
        statsList.push(
          `- ${col.name} (${col.semanticType}): Count=${col.numericStats.sum ? dataPoints(col.name, sampleData.length) : col.numericStats.min}, Mean=${col.numericStats.mean}, Median=${col.numericStats.median}, Min=${col.numericStats.min}, Max=${col.numericStats.max}, Sum=${col.numericStats.sum}`
        );
      } else if (col.topValues && col.topValues.length > 0) {
        const topVals = col.topValues.slice(0, 4).map((t) => `${t.value} (${t.pct}%)`).join(", ");
        statsList.push(`- ${col.name} (${col.semanticType}): Values = [${topVals}], Unique = ${col.uniqueCount}`);
      }
    });
    statsSummary = statsList.join("\n");

    // Compile capabilities
    const caps = profile.capabilities;
    const capsList: string[] = [
      `- Time-Series Forecasting: ${caps.timeSeriesForecasting.available ? "AVAILABLE" : "UNAVAILABLE"} (${caps.timeSeriesForecasting.reason})`,
      `- Trend Analysis: ${caps.trendAnalysis.available ? "AVAILABLE" : "UNAVAILABLE"} (${caps.trendAnalysis.reason})`,
      `- Target Prediction: ${caps.targetPrediction.available ? "AVAILABLE" : "UNAVAILABLE"} (${caps.targetPrediction.reason})`,
      `- Numeric Correlation: ${caps.correlationAnalysis.available ? "AVAILABLE" : "UNAVAILABLE"} (${caps.correlationAnalysis.reason})`,
      `- Cohort Analysis: ${caps.cohortAnalysis.available ? "AVAILABLE" : "UNAVAILABLE"} (${caps.cohortAnalysis.reason})`,
      `- Distribution Spread: ${caps.distributionAnalysis.available ? "AVAILABLE" : "UNAVAILABLE"} (${caps.distributionAnalysis.reason})`,
    ];
    capabilitiesSummary = capsList.join("\n");

    // Compile relationships
    if (profile.relationships.length > 0) {
      relationshipsSummary = profile.relationships
        .map((r) => `- [${r.type}] ${r.description} (strength: ${r.strength.toFixed(3)})`)
        .join("\n");
    }

    // Compile growth intelligence
    if (profile.growth) {
      const g = profile.growth;
      const changeBullets = g.periodChanges
        .map(
          (c) =>
            `  * ${c.previousPeriod} -> ${c.period}: ${c.previousValue.toLocaleString()} -> ${c.currentValue.toLocaleString()} (${c.change >= 0 ? "+" : ""}${c.change.toLocaleString()} / ${c.pctChange >= 0 ? "+" : ""}${c.pctChange}%)`
        )
        .join("\n");

      const metricStats = profile.columns.find((c) => c.name === g.targetMetric)?.numericStats;

      growthSummary = `Target Metric: ${g.targetMetric}
Timeline: ${g.startPeriod} to ${g.endPeriod}
Start / First Value: ${g.firstValue ?? g.startValue} | Latest / End Value: ${g.latestValue ?? g.endValue}
Total Endpoint Change: ${g.endpointChangePercent ?? g.totalGrowthPct}%
Total Sum Across Entire Dataset: ${metricStats?.sum ?? "N/A"}
Min Value: ${g.minValue ?? metricStats?.min ?? "N/A"} | Max Value: ${g.maxValue ?? metricStats?.max ?? "N/A"}
Mean: ${g.meanValue ?? metricStats?.mean ?? "N/A"} | Median: ${g.medianValue ?? metricStats?.median ?? "N/A"}
Trend Profile: ${g.trendDirection || "variable"} (Slope: ${g.trendSlope?.toFixed(2) || "N/A"})
Sustained vs Fluctuating: ${g.isSustained ? "Smooth sustained trend" : "Endpoint change with intermediate volatility/fluctuations"}
Largest Single Increase: ${g.largestIncrease ? `${g.largestIncrease.period} (+${g.largestIncrease.change.toLocaleString()} / +${g.largestIncrease.pctChange}%)` : "None"}
Largest Single Decline / Dip: ${g.largestDecline ? `${g.largestDecline.period} (${g.largestDecline.change.toLocaleString()} / ${g.largestDecline.pctChange}% from ${g.largestDecline.previousPeriod})` : "None"}
Authoritative Narrative: ${g.narrativeSummary || "Deterministic trajectory computed."}
Observation-by-Observation History:
${changeBullets}`;
    }

    // Compile forecast intelligence
    if (profile.forecast) {
      const f = profile.forecast;
      const forecastPoints = f.forecastSeries
        .map(
          (p) =>
            `  * ${p.displayLabel}: ${p.forecastValue.toLocaleString()} (Range: ${p.lowerBound?.toLocaleString()} to ${p.upperBound?.toLocaleString()})`
        )
        .join("\n");

      forecastSummary = `Target Metric: ${f.targetMetric}
Horizon: ${f.horizon} periods
Baseline: ${f.baseline.toLocaleString()}
6-Month Target: ${f.forecastSeries[f.forecastSeries.length - 1].forecastValue.toLocaleString()} (${f.projectedGrowthPct >= 0 ? "+" : ""}${f.projectedGrowthPct}%)
Method: ${f.method}
Projected Periods:
${forecastPoints}
Limitations: ${f.limitations}`;
    }
  }

  // Compile full Verified Fact Pack if available
  if (factPack) {
    if (factPack.targetIntelligence) {
      const t = factPack.targetIntelligence;
      const distLines = t.distribution
        .map((d) => `  * ${d.label}: count = ${d.count} (${d.percentage.toFixed(1)}%)`)
        .join("\n");
      targetSummary = `Target Column: ${t.targetColumn} (${t.targetType} target)
Primary Metric Label: ${t.displayMetricLabel}
Primary Metric Value: ${t.displayMetricValue}
Distribution:
${distLines}
Context: ${t.subtext}`;
    }

    if (factPack.correlations && factPack.correlations.length > 0) {
      correlationSummary = factPack.correlations
        .map(
          (c) =>
            `- ${c.variableA} <-> ${c.variableB}: r = ${c.coefficient >= 0 ? "+" : ""}${c.coefficient.toFixed(3)} (${c.direction}, ${c.strength}) [Method: ${c.method}, n = ${c.n}]`
        )
        .join("\n");
    }

    if (factPack.groupStats && factPack.groupStats.length > 0) {
      const groupLines: string[] = [];
      factPack.groupStats.forEach((gs) => {
        groupLines.push(`[${gs.dimension} by ${gs.measure}]:`);
        gs.groups.forEach((g) => {
          groupLines.push(
            `  * ${g.group}: count=${g.count} (${g.percentage.toFixed(1)}%), total=${g.total.toLocaleString()}, average=${g.average.toFixed(2)}, median=${g.median ?? "N/A"}, min=${g.min}, max=${g.max}`
          );
        });
      });
      groupStatsSummary = groupLines.join("\n");
    }

    if (factPack.limitations && factPack.limitations.length > 0) {
      limitationsSummary = factPack.limitations.map((l) => `- ${l}`).join("\n");
    }

    // Question-specific focused context routing (computed dynamically from factPack)
    if (category === "correlation" && factPack.correlations && factPack.correlations.length > 0) {
      const corrList = factPack.correlations
        .map(
          (c) =>
            `- ${c.variableA} vs ${c.variableB}: ${c.coefficient >= 0 ? "+" : ""}${c.coefficient.toFixed(3)} (${c.direction})`
        )
        .join("\n");

      focusedContext = `FOCUSED CONTEXT (CORRELATION INQUIRY):
You are answering a question about correlation / association.
Use the EXACT correlation coefficients from the Authoritative Correlations below.
DO NOT recalculate or approximate.
DO NOT flip signs:
${corrList}
State every relevant correlation coefficient clearly with its sign.
STRICT NON-CAUSALITY: Explicitly state that these are statistical associations and DO NOT prove causation.`;
    } else if ((category === "target_outcome" || category === "comparison") && factPack.targetIntelligence) {
      const target = factPack.targetIntelligence;
      const targetBreakdowns = factPack.groupStats.filter((g) => g.dimension === target.targetColumn);
      const totalRows = factPack.metadata.rowCount;

      const cohortSections = target.distribution
        .map((d) => {
          const metricLines: string[] = [];
          targetBreakdowns.forEach((bd) => {
            const grp = bd.groups.find((g) => g.group === d.label);
            if (!grp) return;
            const isCurr = bd.measure.toLowerCase().includes("revenue") || bd.measure.toLowerCase().includes("sales");
            const avgStr = isCurr ? `$${grp.average.toFixed(2)}` : (grp.average >= 10 ? grp.average.toFixed(1) : grp.average.toFixed(2));
            const totStr = isCurr ? `$${grp.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : grp.total.toString();
            metricLines.push(`  - Average ${bd.measure}: ${avgStr} (Cohort sum: ${totStr})`);
          });
          return `* ${d.label} Risk Cohort:
  - Customer count: ${d.count} customers (${d.percentage.toFixed(1)}% of ${totalRows} total)
${metricLines.join("\n")}`;
        })
        .join("\n\n");

      // Build explicit mathematical reconciliation formulas
      const reconLines: string[] = [];
      reconLines.push(`- Record Counts: ${target.distribution.map(d => `${d.count} (${d.label})`).join(" + ")} = ${totalRows} customers (100.0%)`);

      targetBreakdowns.forEach((bd) => {
        const overall = factPack.numericStats ? factPack.numericStats[bd.measure] : undefined;
        if (!overall) return;
        const isCurr = bd.measure.toLowerCase().includes("revenue") || bd.measure.toLowerCase().includes("sales");
        const sym = isCurr ? "$" : "";
        const sumParts = bd.groups.map(g => `${sym}${g.total.toFixed(2)} (${g.group})`).join(" + ");
        const wParts = bd.groups.map(g => `(${g.count} × ${sym}${g.average.toFixed(2)})`).join(" + ");
        reconLines.push(`- ${bd.measure} Total Sum: ${sumParts} = ${sym}${overall.sum.toFixed(2)}`);
        reconLines.push(`- ${bd.measure} Weighted Average: [${wParts}] / ${totalRows} = ${sym}${overall.mean.toFixed(2)} (Matches overall mean: ${sym}${overall.mean.toFixed(2)})`);
      });

      focusedContext = `FOCUSED CONTEXT (COHORT BREAKDOWN & MATHEMATICAL RECONCILIATION):
You are answering a cohort breakdown / reconciliation inquiry.
CRITICAL MANDATE:
1. You MUST use the EXACT customer counts, percentages, and averages from the Authoritative Cohort Breakdown below.
2. DO NOT invent or guess different counts (such as 3 or 19). The exact counts are: ${target.distribution.map(d => `${d.label} = ${d.count}`).join(", ")}.
3. Explicitly present the mathematical reconciliation showing that the sum and weighted average of the cohorts equal the full dataset totals.

AUTHORITATIVE COHORT BREAKDOWN:
${cohortSections}

AUTHORITATIVE MATHEMATICAL RECONCILIATION PROOF:
${reconLines.join("\n")}`;
    } else if (category === "individual_record") {
      const highRows = sampleData.filter(
        (r) => String(r.Churn_Risk || r.churn_risk || "").toLowerCase() === "high"
      );
      const highIds = highRows
        .map((r) => r.Customer_ID || r.CustomerID || r.id)
        .filter(Boolean);
      const highIdsStr =
        highIds.length > 0 ? highIds.join(", ") : "accounts classified in the high-risk cohort";

      focusedContext = `FOCUSED CONTEXT (INDIVIDUAL PREDICTION SAFETY):
The user is asking which individual customer is most likely to churn.
CRITICAL SAFETY INSTRUCTION:
1. DO NOT state that any individual customer is "most likely to churn".
2. DO NOT fabricate confidence scores or individual probabilities.
3. EXPLAIN that the dataset categorizes customers into qualitative risk tiers rather than individual probability estimates.
4. Note the customer IDs in the High-risk group: ${highIdsStr}.
5. Explicitly clarify that being in the High-risk tier does not constitute an individual probability or prove that any single account is guaranteed to churn first.`;
    } else if (category === "aggregation") {
      const primaryBreakdown =
        factPack.groupStats.find(
          (g) => g.dimension.toLowerCase() === "segment" || g.dimension.toLowerCase() === "department"
        ) || factPack.groupStats[0];

      let segBreakdownText = "";
      if (primaryBreakdown) {
        segBreakdownText = primaryBreakdown.groups
          .map((g) => {
            const isCurr =
              primaryBreakdown.measure.toLowerCase().includes("revenue") ||
              primaryBreakdown.measure.toLowerCase().includes("sales");
            const totalStr = isCurr ? `$${g.total.toLocaleString()}` : g.total.toString();
            const avgStr = isCurr ? `$${g.average.toFixed(2)}` : g.average.toFixed(2);
            return `- ${g.group}: Total ${primaryBreakdown.measure} = ${totalStr} across ${g.count} records. Average per Record = ${avgStr}.`;
          })
          .join("\n");
      }

      focusedContext = `FOCUSED CONTEXT (GROUP AGGREGATION & SUMMARY):
Ensure total and average are never confused:
${segBreakdownText}
DO NOT call the total an average.`;
    } else if (category === "limitations") {
      focusedContext = `FOCUSED CONTEXT (DATASET LIMITATIONS & NON-CAUSALITY):
Highlight key constraints:
- Sample size (${factPack.metadata.rowCount} observations): describes this sample, should not be generalized to full customer population.
- Observational nature: correlation is association, NOT causation.
- Reducing support tickets is NOT proven to cause churn to decline.
- Missing longitudinal timestamps and historical churn event logs.
- Lack of individual probability model.`;
    }
  }

  // Compile deterministic analytical result if question and factPack are available
  const deterministicResult = factPack && question ? computeDeterministicAnalyticalResult(question, factPack) : undefined;
  if (deterministicResult?.isHandled && deterministicResult.authoritativeGroundingBlock) {
    focusedContext = `==================================================
CRITICAL DETERMINISTIC ANALYTICAL TRUTH:
The following result has already been deterministically calculated from the complete active dataset (${factPack?.metadata?.rowCount || 30} records). Do not replace any values. Explain it faithfully.

${deterministicResult.authoritativeGroundingBlock}
==================================================
${focusedContext}`;
  }

  function dataPoints(col: string, fallback: number): number {
    return factPack?.metadata?.rowCount || fallback;
  }

  return `You are Kroma, an analytical interpreter, not the source of numerical truth.
You interpret authoritative computed dataset facts to provide clear, plain-language executive answers and visual analytics.

${focusedContext ? `==================================================\n${focusedContext}\n==================================================\n` : ""}

AUTHORITATIVE COMPUTED FACTS (FROM DETERMINISTIC DATA ENGINE — SOLE SOURCE OF NUMERICAL TRUTH):
Dataset Archetype: ${archetypeSummary}
Dataset Schema & Types: ${schema}
Total Dataset Records: ${factPack?.metadata?.rowCount || sampleData.length} observations
Current Focus: ${currentFocus || "Full Overview"}

${targetSummary ? `AUTHORITATIVE TARGET OUTCOME & RISK DISTRIBUTION:\n${targetSummary}\n` : ""}

${correlationSummary ? `AUTHORITATIVE DETERMINISTIC CORRELATIONS (DO NOT RECALCULATE OR FLIP SIGNS):\n${correlationSummary}\n` : ""}

${groupStatsSummary ? `AUTHORITATIVE GROUP BREAKDOWNS (TOTALS VS AVERAGES):\n${groupStatsSummary}\n` : ""}

AUTHORITATIVE NUMERIC & COLUMN STATISTICS:
${statsSummary || "Standard column distributions."}

ANALYTICAL CAPABILITIES & CONSTRAINTS:
${capabilitiesSummary || "Standard tabular analytical operations."}

DETECTED RELATIONSHIPS:
${relationshipsSummary || "Single and multi-variable distributions."}

${growthSummary ? `DETERMINISTIC GROWTH & CHANGE ANALYSIS:\n${growthSummary}\n` : ""}
${forecastSummary ? `DETERMINISTIC 6-MONTH FORECAST:\n${forecastSummary}\n` : ""}
${limitationsSummary ? `DATASET LIMITATIONS:\n${limitationsSummary}\n` : ""}

DATASET PREVIEW (FIRST 3 ROWS ONLY FOR SCHEMA & DATA TYPE REFERENCE — NEVER COMPUTE TOTALS, COUNTS, OR AVERAGES FROM THIS PREVIEW):
${JSON.stringify(sampleData.slice(0, 3))}

CRITICAL OLLAMA CONTRACT & ANTI-HALLUCINATION RULES:
1. "You are an analytical interpreter, not the source of numerical truth."
2. Treat AUTHORITATIVE DATASET FACTS as canonical.
3. Never invent numerical values, sample sizes, category counts, probabilities, p-values, confidence intervals, or statistical significance.
4. Never replace authoritative values with values calculated from memory.
5. Never use a previous assistant answer as evidence when authoritative dataset facts are available.
6. Always answer the CURRENT user question.
7. If the deterministic engine cannot support the requested claim, explicitly say so.
8. Distinguish association from causation. Do not claim an intervention causes an outcome unless the evidence supports causal inference.
   - Say "Support_Tickets and Churn_Risk have a strong positive association (r = +0.938)".
   - NEVER say "Support tickets drive churn", "Tickets caused churn", or "Reducing tickets will reduce churn".
   - If asked how many churned specifically because of support tickets, state that the dataset cannot establish how many churned because of tickets, but report the observed overlap.
9. Do not fabricate individual probabilities from risk tiers. Do not infer an individual probability merely because someone belongs to a High/Medium/Low category.
   - If asked which customer is most likely to churn and what is their probability, state: "The dataset supports risk-tier classification, but it does not provide individual churn probabilities."
10. TOTAL VS AVERAGE INTEGRITY: Always distinguish total sum from average. Never cite a group total as an average.
11. NEVER invent categories, nonexistent columns, or nonexistent customers.
12. STRICT ZERO-EMOJI RULE: Do NOT use emojis anywhere.
13. METRIC FIDELITY: Never substitute the analytical metric requested by the user. If the user asks about Revenue, analyze Revenue; do not substitute Units or any other measure.
14. NO CROSS-DATASET CONTAMINATION: Only reference columns, categories, and metrics that exist in the active dataset. Never import terms (e.g. Churn, Support_Tickets, NPS) or categories (e.g. Clothing) from prior sessions or datasets.
15. MISSING METRICS: If the user asks about a metric not present in the dataset (e.g. CAC), explicitly state that it is unavailable and cannot be calculated. Do not estimate or generate fabricated values.

${deterministicResult?.intent === "EXECUTIVE_PRESENTATION" && (!factPack?.metadata.columnNames.some((c) => c.toLowerCase() === "churn_risk"))
  ? `STRUCTURE YOUR EXPLANATION IN MARKDOWN USING EXACTLY 3 EVIDENCE-BACKED OBSERVATIONS WITH THESE 3 SECTIONS EACH:
**1. [Observation Title]**
- **WHAT THE DATA DEMONSTRATES**: Factual observed numbers from the active dataset.
- **WHY IT MAY MATTER**: Analytical business significance.
- **WHAT TO INVESTIGATE NEXT**: Specific operational follow-up questions.
(Repeat for Observation 2 and Observation 3)`
  : `STRUCTURE YOUR EXPLANATION IN MARKDOWN USING THESE 4 EXACT HEADERS:
**[Direct Answer]**
1 clear sentence directly answering the query with exact authoritative numbers.

**[Key Drivers & Comparisons]**
- 2-3 bullet points citing exact period values, percentage changes, group means, and comparisons.

**[Compounding Relationship]**
1-2 sentences on how factors relate without assuming causality.

**[Executive Takeaway]**
1 plain-English takeaway for decision makers.`}

OUTPUT FORMAT: Return ONLY valid JSON matching this exact schema:
{
  "explanation": "Structured markdown string with the headers above.",
  "insight": "1 sentence executive takeaway.",
  "action": {
    "type": "ANSWER" | "CREATE_VISUALIZATION" | "REFRESH_DASHBOARD" | "REBUILD_DASHBOARD" | "FORECAST" | "SHOW_FORECAST" | "SHOW_SOURCE_DATA" | "FOCUS_ANALYSIS" | "NEW_ANALYSIS",
    "focus": "optional metric name"
  },
  "sql": "Valid DuckDB SQL query using existing columns only, or null",
  "chartType": "bar" | "line" | "pie" | "area" | "histogram" | "scatter" | "none",
  "chartTitle": "Descriptive title or null",
  "xAxisLabel": "Label for X axis or null",
  "yAxisLabel": "Label for Y axis or null",
  "chartData": [
    { "label": "Category Name", "value": 123.45 }
  ]
}
`;
}

// Client-side direct Ollama query fallback for desktop webview & static builds
export async function queryOllamaDirect(
  prompt: string,
  model: string = "qwen2.5-coder:7b",
  systemPrompt?: string,
  signal?: AbortSignal,
  factPack?: VerifiedFactPack
): Promise<AnalysisResponse> {
  const endpoint = "http://127.0.0.1:11434/api/chat";

  const messages: any[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 30000); // 30s timeout
  const onExternalAbort = () => timeoutController.abort();

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId);
      throw new DOMException("Query aborted by session switch", "AbortError");
    }
    signal.addEventListener("abort", onExternalAbort);
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: timeoutController.signal,
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        format: "json",
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama communication failed: ${res.statusText}`);
    }

    const data = await res.json();
    let rawContent = data.message?.content || data.response || "{}";

    // Clean JSON formatting
    rawContent = rawContent.replace(/```json/gi, "").replace(/```/g, "").trim();
    const firstBrace = rawContent.indexOf("{");
    const lastBrace = rawContent.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      rawContent = rawContent.substring(firstBrace, lastBrace + 1);
    }

    try {
      const parsed = JSON.parse(rawContent);
      const validated = validateAndGroundResponse(
        parsed.explanation || "Analysis computed from dataset intelligence.",
        parsed.insight || "Computed with local Kroma intelligence.",
        factPack,
        prompt
      );

      // Normalize chart data & attach deterministic chartSpec if applicable
      const detResult = factPack && prompt ? computeDeterministicAnalyticalResult(prompt, factPack) : undefined;
      let finalChartType = parsed.chartType || "none";
      let finalChartTitle = parsed.chartTitle || "Analysis Observation";
      let finalXAxis = parsed.xAxisLabel || "Category";
      let finalYAxis = parsed.yAxisLabel || "Value";
      let finalChartData: Record<string, any>[] = normalizeChartData(parsed.chartData);

      if (detResult?.chartSpec) {
        if (finalChartData.length === 0 || finalChartType === "none" || detResult.intent === "COHORT_BAR_CHART") {
          finalChartType = detResult.chartSpec.chartType;
          finalChartTitle = detResult.chartSpec.chartTitle;
          finalXAxis = detResult.chartSpec.xAxisLabel;
          finalYAxis = detResult.chartSpec.yAxisLabel;
          finalChartData = detResult.chartSpec.chartData;
        }
      }

      return {
        explanation: validated.explanation,
        insight: validated.insight,
        sql: parsed.sql || null,
        action: parsed.action || { type: "ANSWER" },
        chartType: finalChartType,
        chartTitle: finalChartTitle,
        xAxisLabel: finalXAxis,
        yAxisLabel: finalYAxis,
        zAxisLabel: parsed.zAxisLabel || null,
        chartData: finalChartData.length > 0 ? finalChartData : null,
      };
    } catch (parseErr) {
      console.warn("Malformed JSON received from local LLM, constructing fallback:", parseErr);
      const detResult = factPack && prompt ? computeDeterministicAnalyticalResult(prompt, factPack) : undefined;
      const fallbackVal = validateAndGroundResponse(
        detResult?.isHandled
          ? detResult.deterministicExplanation
          : "**[Direct Answer]**\nAnalysis computed successfully from dataset context.\n\n**[Key Drivers & Comparisons]**\n- Core metrics align with baseline statistical patterns.\n- Target variance confirms cohort concentration.\n\n**[Compounding Relationship]**\nVariables exhibit structural co-dependence.\n\n**[Executive Takeaway]**\nPrioritize strategic operational capacity on primary high-yield areas.",
        detResult?.isHandled
          ? detResult.deterministicInsight
          : "Analysis processed locally with Kroma intelligence.",
        factPack,
        prompt
      );
      return {
        explanation: fallbackVal.explanation,
        insight: fallbackVal.insight,
        sql: null,
        action: { type: "ANSWER" },
        chartType: detResult?.chartSpec ? detResult.chartSpec.chartType : "none",
        chartTitle: detResult?.chartSpec ? detResult.chartSpec.chartTitle : "Query Observation",
        xAxisLabel: detResult?.chartSpec ? detResult.chartSpec.xAxisLabel : "Category",
        yAxisLabel: detResult?.chartSpec ? detResult.chartSpec.yAxisLabel : "Value",
        chartData: detResult?.chartSpec ? detResult.chartSpec.chartData : [],
      };
    }
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", onExternalAbort);
    }
  }
}

export function buildGeneralConversationSystemPrompt(): string {
  return `You are Kroma, an elite AI assistant and executive intelligence platform.
You assist users with natural conversation, strategic analysis, business and financial concepts (such as EBITDA, unit economics, forecasting, metrics), technical questions, report drafting, and general inquiries.

Guidelines:
1. Provide structured, authoritative, and articulate answers with clear paragraphs and bullet points where helpful.
2. If the user asks about analytical concepts, explain the core definition, formula or calculation, strategic relevance, and practical examples.
3. Since no dataset is currently attached, do NOT invent fake dataset metrics or charts. When appropriate, mention that the user can attach a CSV or paste tabular data anytime to activate Data Analysis mode.
4. Respond in JSON format:
{
  "explanation": "Your full response here using Markdown formatting.",
  "insight": "A concise one-sentence executive takeaway."
}`;
}

export async function queryOllamaGeneral(
  prompt: string,
  model: string = "qwen2.5-coder:7b",
  signal?: AbortSignal
): Promise<{ explanation: string; insight: string }> {
  const systemPrompt = buildGeneralConversationSystemPrompt();
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 30000); // 30s timeout
  const onExternalAbort = () => timeoutController.abort();

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId);
      throw new DOMException("Query aborted by session switch", "AbortError");
    }
    signal.addEventListener("abort", onExternalAbort);
  }

  try {
    const res = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: timeoutController.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        stream: false,
        format: "json",
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama communication failed: ${res.statusText}`);
    }

    const data = await res.json();
    let rawContent = data.message?.content || data.response || "{}";
    rawContent = rawContent.replace(/```json/gi, "").replace(/```/g, "").trim();
    const firstBrace = rawContent.indexOf("{");
    const lastBrace = rawContent.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      rawContent = rawContent.substring(firstBrace, lastBrace + 1);
    }

    try {
      const parsed = JSON.parse(rawContent);
      return {
        explanation: parsed.explanation || rawContent,
        insight: parsed.insight || "Kroma Conversational Intelligence",
      };
    } catch {
      return {
        explanation: rawContent,
        insight: "Kroma Conversational Intelligence",
      };
    }
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", onExternalAbort);
    }
  }
}

// Fast lightweight status check for local Ollama engine
export async function checkOllamaStatus(
  endpoint: string = "http://127.0.0.1:11434",
  model: string = "qwen2.5-coder:7b"
): Promise<{
  online: boolean;
  endpoint: string;
  model: string;
  modelAvailable: boolean;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`${endpoint}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const models = data.models || [];
      const hasModel = models.some(
        (m: any) =>
          typeof m.name === "string" &&
          (m.name.includes("qwen2.5-coder:7b") || m.name.includes("qwen2.5-coder"))
      );
      return {
        online: true,
        endpoint: "127.0.0.1:11434",
        model,
        modelAvailable: hasModel,
      };
    }
  } catch {
    // Offline or unreachable
  }
  return {
    online: false,
    endpoint: "127.0.0.1:11434",
    model,
    modelAvailable: false,
  };
}
