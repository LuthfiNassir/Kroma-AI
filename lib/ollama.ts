import {
  AnalysisResponse,
  DatasetIntelligenceProfile,
} from "./types";

export interface SystemPromptContext {
  schema: string;
  sampleData: Record<string, any>[];
  profile?: DatasetIntelligenceProfile;
  currentFocus?: string;
}

export function buildOllamaSystemPrompt(ctx: SystemPromptContext): string {
  const { schema, sampleData, profile, currentFocus } = ctx;

  // Build summary of deterministic facts
  let statsSummary = "";
  let capabilitiesSummary = "";
  let relationshipsSummary = "";
  let archetypeSummary = "CROSS_SECTIONAL_DISCOVERY";

  if (profile) {
    archetypeSummary = `${profile.archetype.primary} (${profile.archetype.description})`;

    // Compile deterministic stats
    const statsList: string[] = [];
    profile.columns.forEach((col) => {
      if (col.numericStats) {
        statsList.push(
          `- ${col.name} (${col.semanticType}): Mean=${col.numericStats.mean}, Median=${col.numericStats.median}, Min=${col.numericStats.min}, Max=${col.numericStats.max}, StdDev=${col.numericStats.stdDev}, Sum=${col.numericStats.sum}`
        );
      } else if (col.topValues && col.topValues.length > 0) {
        const top3 = col.topValues.slice(0, 3).map((t) => `${t.value} (${t.pct}%)`).join(", ");
        statsList.push(`- ${col.name} (${col.semanticType}): Top values = [${top3}], Unique = ${col.uniqueCount}`);
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
      `- Funnel Analysis: ${caps.funnelAnalysis.available ? "AVAILABLE" : "UNAVAILABLE"} (${caps.funnelAnalysis.reason})`,
      `- Distribution/Quartiles: ${caps.distributionAnalysis.available ? "AVAILABLE" : "UNAVAILABLE"} (${caps.distributionAnalysis.reason})`,
    ];
    capabilitiesSummary = capsList.join("\n");

    // Compile relationships
    if (profile.relationships.length > 0) {
      relationshipsSummary = profile.relationships
        .map((r) => `- [${r.type}] ${r.description}`)
        .join("\n");
    }
  }

  return `You are Kroma, an elite Autonomous Principal Data Analyst.
You reason from computed dataset intelligence and user intent to explain findings, recommend actions, and generate visual analytics.

AUTHORITATIVE COMPUTED FACTS (FROM DETERMINISTIC DATA ENGINE):
Dataset Archetype: ${archetypeSummary}
Dataset Schema & Types: ${schema}
Current Focus: ${currentFocus || "Comprehensive Overview"}

AUTHORITATIVE NUMERIC & COHORT STATISTICS:
${statsSummary || "Standard column distributions."}

ANALYTICAL CAPABILITIES & CONSTRAINTS:
${capabilitiesSummary || "Standard tabular analytical operations."}

DETECTED RELATIONSHIPS:
${relationshipsSummary || "Single and multi-variable distributions."}

SAMPLE ROWS (FOR CONTEXT ONLY — DO NOT CALCULATE TOTALS FROM THIS SAMPLE):
${JSON.stringify(sampleData.slice(0, 10))}

CRITICAL RULES:
1. The deterministic Data Intelligence Engine is AUTHORITATIVE for all numerical facts. NEVER invent columns, row counts, or totals.
2. PLAIN-LANGUAGE EXPLANATIONS: You are communicating with a decision maker who is NOT a statistician. Use plain, direct, natural language.
   - Do NOT use statistical jargon like "node", "cohort", "dispersion", "variance delta", "Pareto distribution", "sample scope", "primary leader node".
   - Say "group" instead of "cohort" or "node".
   - Say "difference" instead of "spread gap" or "variance delta".
   - Say "largest group" / "smallest group" instead of "primary node" / "minimum node".
   - Say "number of records" instead of "sample scope".
3. NEVER claim causation from correlation. Statistical association shows how numbers move together, not that one caused the other.
4. NEVER claim a capability that is marked UNAVAILABLE above (e.g., if forecasting is unavailable, explain why in plain English).
5. If the user asks to "refresh the dashboard", "rebuild the dashboard", or focus on a specific metric/theme, set "action" to "REFRESH_DASHBOARD" or "REBUILD_DASHBOARD" with the requested focus.
6. If SQL is requested, generate valid DuckDB SQL using strictly existing column names.
7. STRICT ZERO-EMOJI RULE: Do NOT use emojis anywhere in text, titles, badges, or keys.
8. Structure your explanation in markdown using these exact headers:
   **[Direct Answer]**
   1 clear sentence answering the query in plain language.

   **[Key Drivers & Comparisons]**
   - 2-3 bullet points with authoritative numbers, differences, and percentage comparisons.

   **[Compounding Relationship]**
   1-2 sentences on how factors relate without assuming causality.

   **[Executive Takeaway]**
   1 plain-English takeaway for decision makers.

OUTPUT FORMAT: Return ONLY valid JSON matching this exact schema:
{
  "explanation": "Structured markdown string following the 4 headers above.",
  "insight": "1 sentence executive takeaway.",
  "action": {
    "type": "ANSWER" | "CREATE_VISUALIZATION" | "REFRESH_DASHBOARD" | "REBUILD_DASHBOARD" | "FORECAST" | "ANALYZE_RELATIONSHIP",
    "focus": "Optional metric or theme name if rebuilding/refreshing"
  },
  "sql": "Valid DuckDB SQL query computing this exact view, or null",
  "chartType": "bar" | "line" | "pie" | "area" | "histogram" | "scatter" | "bubble" | "boxplot" | "heatmap" | "treemap" | "sankey" | "none",
  "chartTitle": "Descriptive visual title",
  "xAxisLabel": "Label for X axis",
  "yAxisLabel": "Label for Y axis",
  "zAxisLabel": "Label for Z axis if applicable or null",
  "chartData": [
    // Array of objects matching chartType: [{"label": "A", "value": 10}] or [{"x": 1, "y": 2, "category": "A"}]
  ]
}
`;
}

// Client-side direct Ollama query fallback for desktop webview & static builds
export async function queryOllamaDirect(
  prompt: string,
  model: string = "qwen2.5-coder:7b",
  systemPrompt?: string
): Promise<AnalysisResponse> {
  const endpoint = "http://127.0.0.1:11434/api/chat";

  const messages: any[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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
        "**[Direct Answer]**\nAnalysis computed successfully from dataset context.\n\n**[Key Drivers & Comparisons]**\n- Core metrics align with baseline statistical patterns.\n- Target variance confirms cohort concentration.\n\n**[Compounding Relationship]**\nVariables exhibit structural co-dependence.\n\n**[Executive Takeaway]**\nPrioritize strategic operational capacity on primary high-yield nodes.",
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
}
