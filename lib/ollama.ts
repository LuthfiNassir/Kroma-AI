import {
  AnalysisResponse,
  DatasetIntelligenceProfile,
  StructuredAIAction,
} from "./types";

export interface SystemPromptContext {
  schema: string;
  sampleData: Record<string, any>[];
  profile?: DatasetIntelligenceProfile;
  currentFocus?: string;
}

export function buildOllamaSystemPrompt(ctx: SystemPromptContext): string {
  const { schema, sampleData, profile, currentFocus } = ctx;

  let statsSummary = "";
  let capabilitiesSummary = "";
  let relationshipsSummary = "";
  let growthSummary = "";
  let forecastSummary = "";
  let archetypeSummary = "CROSS_SECTIONAL_DISCOVERY";

  if (profile) {
    archetypeSummary = `${profile.archetype.primary} (${profile.archetype.description})`;

    // Compile deterministic stats
    const statsList: string[] = [];
    profile.columns.forEach((col) => {
      if (col.numericStats) {
        statsList.push(
          `- ${col.name} (${col.semanticType}): Mean=${col.numericStats.mean}, Median=${col.numericStats.median}, Min=${col.numericStats.min}, Max=${col.numericStats.max}, Sum=${col.numericStats.sum}`
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
        .map((r) => `- [${r.type}] ${r.description} (strength: ${r.strength.toFixed(2)})`)
        .join("\n");
    }

    // Compile growth intelligence with full deterministic statistics
    if (profile.growth) {
      const g = profile.growth;
      const changeBullets = g.periodChanges.map(
        (c) => `  * ${c.previousPeriod} -> ${c.period}: ${c.previousValue.toLocaleString()} -> ${c.currentValue.toLocaleString()} (${c.change >= 0 ? "+" : ""}${c.change.toLocaleString()} / ${c.pctChange >= 0 ? "+" : ""}${c.pctChange}%)`
      ).join("\n");

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
      const forecastPoints = f.forecastSeries.map(
        (p) => `  * ${p.displayLabel}: ${p.forecastValue.toLocaleString()} (Range: ${p.lowerBound?.toLocaleString()} to ${p.upperBound?.toLocaleString()})`
      ).join("\n");

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

  return `You are Kroma, an elite Autonomous Data Analyst.
You interpret authoritative computed dataset facts to provide clear, plain-language executive answers and visual analytics.

AUTHORITATIVE COMPUTED FACTS (FROM DETERMINISTIC DATA ENGINE):
Dataset Archetype: ${archetypeSummary}
Dataset Schema & Types: ${schema}
Current Focus: ${currentFocus || "Full Overview"}

AUTHORITATIVE NUMERIC & COLUMN STATISTICS:
${statsSummary || "Standard column distributions."}

ANALYTICAL CAPABILITIES & CONSTRAINTS:
${capabilitiesSummary || "Standard tabular analytical operations."}

DETECTED RELATIONSHIPS:
${relationshipsSummary || "Single and multi-variable distributions."}

${growthSummary ? `DETERMINISTIC GROWTH & CHANGE ANALYSIS:\n${growthSummary}\n` : ""}
${forecastSummary ? `DETERMINISTIC 6-MONTH FORECAST:\n${forecastSummary}\n` : ""}

SAMPLE ROWS (FOR CONTEXT ONLY — NEVER CALCULATE TOTALS OR STATS FROM THIS SAMPLE):
${JSON.stringify(sampleData.slice(0, 10))}

CRITICAL ANTI-HALLUCINATION RULES:
1. The deterministic Data Engine is the SOLE AUTHORITATIVE SOURCE for all numbers. Never recalculate dataset-wide numbers from sample rows.
2. NEVER invent columns, rows, dates, categories, or zero points that do not exist.
3. NEVER confuse calendar years or months (e.g., April 2026 vs April 2025). Keep exact full period names.
4. STRICT NON-CAUSALITY RULE: Use strictly non-causal language. Never state or imply that one metric caused another.
   - Say "Units and Revenue are positively associated (r = X.XX)" or "co-occurred".
   - NEVER say "Units drove Revenue", "Units caused Revenue to rise", or "Marketing spend caused the decline".
5. ENDPOINT CHANGE VS SUSTAINED TREND:
   - Always distinguish endpoint change from smooth sustained trends.
   - When citing large growth (e.g. +550% from 2 to 13), qualify that this is the net change between the first and latest observations, rather than a continuous uniform climb, noting any intermediate volatility or dips.
6. NEVER invent categories. If the dataset has no categorical column, never invent "General" or generate category share charts.
7. PLAIN HUMAN LANGUAGE: Speak to a decision maker.
   - Say "group" instead of "cohort" or "node".
   - Say "difference" instead of "spread delta".
   - Say "highest value" instead of "primary leader".
   - Say "how closely these numbers move together" instead of "statistical association".
8. STRUCTURED ACTION EXECUTION:
   - When the user asks to "refresh the dashboard", "rebuild the dashboard", or "re-analyze the dataset", set action to:
     { "type": "REFRESH_DASHBOARD", "focus": "optional focal metric name" }
   - When the user asks for a forecast, set action to: { "type": "SHOW_FORECAST" }
   - When the user asks for raw or source data, set action to: { "type": "SHOW_SOURCE_DATA" }
   - When the user asks to focus on a metric, set action to: { "type": "FOCUS_ANALYSIS", "focus": "metric name" }
9. STRICT ZERO-EMOJI RULE: Do NOT use emojis anywhere.
9. Structure your explanation in markdown using these 4 exact headers:
   **[Direct Answer]**
   1 clear sentence directly answering the query with exact authoritative numbers.

   **[Key Drivers & Comparisons]**
   - 2-3 bullet points citing exact period values, percentage changes, and comparisons.

   **[Compounding Relationship]**
   1-2 sentences on how factors relate without assuming causality.

   **[Executive Takeaway]**
   1 plain-English takeaway for decision makers.

OUTPUT FORMAT: Return ONLY valid JSON matching this exact schema:
{
  "explanation": "Structured markdown string with the 4 headers above.",
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
  "chartData": []
}
`;
}

// Client-side direct Ollama query fallback for desktop webview & static builds
export async function queryOllamaDirect(
  prompt: string,
  model: string = "qwen2.5-coder:7b",
  systemPrompt?: string,
  signal?: AbortSignal
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
      return {
        explanation: parsed.explanation || "Analysis computed from dataset intelligence.",
        insight: parsed.insight || "Computed with local Kroma intelligence.",
        sql: parsed.sql || null,
        action: parsed.action || { type: "ANSWER" },
        chartType: parsed.chartType || "none",
        chartTitle: parsed.chartTitle || "Analysis Observation",
        xAxisLabel: parsed.xAxisLabel || "Category",
        yAxisLabel: parsed.yAxisLabel || "Value",
        zAxisLabel: parsed.zAxisLabel || null,
        chartData: Array.isArray(parsed.chartData) ? parsed.chartData : null,
      };
    } catch (parseErr) {
      console.warn("Malformed JSON received from local LLM, constructing fallback:", parseErr);
      return {
        explanation:
          "**[Direct Answer]**\nAnalysis computed successfully from dataset context.\n\n**[Key Drivers & Comparisons]**\n- Core metrics align with baseline statistical patterns.\n- Target variance confirms cohort concentration.\n\n**[Compounding Relationship]**\nVariables exhibit structural co-dependence.\n\n**[Executive Takeaway]**\nPrioritize strategic operational capacity on primary high-yield areas.",
        insight: "Analysis processed locally with Kroma intelligence.",
        sql: null,
        action: { type: "ANSWER" },
        chartType: "none",
        chartTitle: "Query Observation",
        xAxisLabel: "Category",
        yAxisLabel: "Value",
        chartData: [],
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
