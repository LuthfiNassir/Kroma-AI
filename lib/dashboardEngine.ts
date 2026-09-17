import {
  DashboardState,
  DatasetIntelligenceProfile,
  HighlightsCardData,
  KPICardData,
} from "./types";
import { buildDatasetIntelligenceProfile } from "./dataIntelligence";
import { buildVisualizationCards, generateTrajectorySeries } from "./visualizationEngine";
import { calculateDeterministicForecast } from "./forecastEngine";

// Dynamic Context-Aware Prompt Synthesis
export function generateContextAwareSuggestions(profile: DatasetIntelligenceProfile): string[] {
  const { measures, dimensions, targets, capabilities, temporal, growth } = profile;
  const primaryMeasure = measures[0] || "Value";
  const secMeasure = measures[1] || primaryMeasure;
  const primaryDim = dimensions[0] || "";
  const targetCol = targets[0] || "";

  const suggestions: string[] = [];

  if (temporal.hasTemporal) {
    if (capabilities.timeSeriesForecasting.available) {
      suggestions.push(`What do you expect ${primaryMeasure.replace(/_/g, " ")} to look like over the next 6 months?`);
    }
    if (growth?.largestDecline) {
      suggestions.push(`Why did ${primaryMeasure.replace(/_/g, " ")} dip in ${growth.largestDecline.period}?`);
    }
    if (measures.length >= 2) {
      suggestions.push(`Analyze relationship between ${secMeasure.replace(/_/g, " ")} and ${primaryMeasure.replace(/_/g, " ")}`);
    }
    suggestions.push(`Refresh the dashboard and focus on ${primaryMeasure.replace(/_/g, " ")}, ${secMeasure.replace(/_/g, " ")} and the forecast`);
    suggestions.push("Show me the raw data");
  } else {
    if (targetCol) {
      suggestions.push(`What factors most strongly correlate with ${targetCol.replace(/_/g, " ")}?`);
    } else if (dimensions.length > 0 && measures.length > 0) {
      suggestions.push(`Compare ${primaryMeasure.replace(/_/g, " ")} distribution across ${primaryDim.replace(/_/g, " ")}`);
    }
    if (measures.length >= 2) {
      suggestions.push(`Analyze correlation between ${primaryMeasure.replace(/_/g, " ")} and ${secMeasure.replace(/_/g, " ")}`);
    }
    suggestions.push(`Re-analyze the dataset and focus on ${primaryMeasure.replace(/_/g, " ")}`);
    suggestions.push("Show me the raw data");
  }

  return suggestions;
}

// Generate Dashboard Specification & State deterministically
export function synthesizeDashboardSpec(
  profile: DatasetIntelligenceProfile,
  data: Record<string, any>[],
  focus?: string
): DashboardState {
  const { measures, dimensions, targets, temporal, datasetSummary, capabilities, archetype, growth } = profile;
  const rowCount = datasetSummary.rowCount;

  // Identify primary focal metric
  let primaryMeasure = measures[0] || "Value";
  if (focus) {
    const focusLower = focus.toLowerCase();
    const matched = measures.find((m) => focusLower.includes(m.toLowerCase()));
    if (matched) primaryMeasure = matched;
  }

  const numVals = data.map((r) => Number(r[primaryMeasure])).filter((v) => !isNaN(v) && isFinite(v));
  const totalVal = numVals.reduce((a, b) => a + b, 0);
  const avgVal = numVals.length > 0 ? totalVal / numVals.length : 0;

  const isCurrency =
    primaryMeasure.toLowerCase().includes("amount") ||
    primaryMeasure.toLowerCase().includes("sales") ||
    primaryMeasure.toLowerCase().includes("revenue") ||
    primaryMeasure.toLowerCase().includes("price") ||
    primaryMeasure.toLowerCase().includes("cost") ||
    primaryMeasure.toLowerCase().includes("spend") ||
    primaryMeasure.toLowerCase().includes("profit") ||
    primaryMeasure.toLowerCase().includes("salary") ||
    primaryMeasure.toLowerCase().includes("budget") ||
    primaryMeasure.toLowerCase().includes("expense");

  const currSymbol = isCurrency ? "$" : "";

  // 1. Synthesize 4 Dynamic Executive KPIs
  const kpis: KPICardData[] = [];

  if (temporal.hasTemporal && temporal.dateColumn) {
    // TEMPORAL KPI ROW (NO FAKE CATEGORIES)
    const startVal = growth ? growth.startValue : (numVals[0] || 0);
    const endVal = growth ? growth.endValue : (numVals[numVals.length - 1] || 0);
    const growthRate = growth ? growth.totalGrowthPct : (startVal > 0 ? Math.round(((endVal - startVal) / startVal) * 1000) / 10 : 0);
    const timeSpanLabel = temporal.startLabel && temporal.endLabel
      ? `${temporal.startLabel} -> ${temporal.endLabel}`
      : `${temporal.observationCount} periods`;

    kpis.push(
      {
        label: `TOTAL ${primaryMeasure.replace(/_/g, " ").toUpperCase()}`,
        value: `${currSymbol}${Math.round(totalVal).toLocaleString()}`,
        subtext: `Aggregated across ${rowCount} periods`,
      },
      {
        label: `LATEST ${primaryMeasure.replace(/_/g, " ").toUpperCase()}`,
        value: `${currSymbol}${Math.round(endVal).toLocaleString()}`,
        subtext: temporal.endLabel ? `Recorded in ${temporal.endLabel}` : "Most recent period",
      },
      {
        label: "OVERALL GROWTH",
        value: `${growthRate >= 0 ? "+" : ""}${growthRate}%`,
        subtext: `Net change over timeline`,
      },
      {
        label: "TIME SCOPE",
        value: `${temporal.observationCount} ${temporal.frequency === "monthly" ? "Months" : "Periods"}`,
        subtext: timeSpanLabel,
      }
    );
  } else {
    // CROSS-SECTIONAL KPI ROW
    const primaryDim = dimensions[0];
    const topDimVal = primaryDim
      ? profile.columns.find((c) => c.name === primaryDim)?.topValues?.[0]?.value || "Primary Group"
      : undefined;

    kpis.push(
      {
        label: "TOTAL RECORDS",
        value: rowCount.toLocaleString(),
        subtext: `${profile.columns.length} parsed attributes`,
      },
      {
        label: `AVERAGE ${primaryMeasure.replace(/_/g, " ").toUpperCase()}`,
        value: `${currSymbol}${avgVal.toFixed(1)}${primaryMeasure.toLowerCase().includes("age") ? " yrs" : ""}`,
        subtext: "Mean across all records",
      },
      {
        label: targets[0] ? `${targets[0].replace(/_/g, " ").toUpperCase()} RATE` : "DATA COMPLETENESS",
        value: targets[0]
          ? `${((data.filter((r) => Number(r[targets[0]]) === 1).length / Math.max(rowCount, 1)) * 100).toFixed(1)}%`
          : `${profile.dataQuality.completenessRate}%`,
        subtext: targets[0] ? "Observed outcome rate" : "0 schema anomalies",
      },
      {
        label: primaryDim ? `LARGEST ${primaryDim.replace(/_/g, " ").toUpperCase()}` : "HIGHEST RECORDED",
        value: primaryDim ? String(topDimVal) : `${currSymbol}${Math.max(...(numVals.length > 0 ? numVals : [0])).toLocaleString()}`,
        subtext: primaryDim ? "Highest representation" : "Maximum value",
      }
    );
  }

  // 2. Build Visualizations
  const charts = buildVisualizationCards(profile, data, primaryMeasure);

  // 3. Conditional Deterministic Forecasting / Trajectory
  let projectionData: Record<string, any>[] | undefined;
  const forecast = profile.forecast || (
    capabilities.timeSeriesForecasting.available && temporal.dateColumn
      ? calculateDeterministicForecast(data, temporal.dateColumn, primaryMeasure, 6)
      : null
  );

  if (capabilities.timeSeriesForecasting.available && temporal.dateColumn) {
    projectionData = generateTrajectorySeries(data, temporal.dateColumn, primaryMeasure, 0);
  }

  // 4. Executive Highlights Card
  const highlightsItems = [
    {
      label: `Total ${primaryMeasure.replace(/_/g, " ")}`,
      value: isCurrency ? `$${Math.round(totalVal).toLocaleString()}` : Math.round(totalVal).toLocaleString(),
      subtext: `${rowCount} total records analyzed`,
    },
    {
      label: temporal.hasTemporal ? "Historical Direction" : "Primary Group",
      value: temporal.hasTemporal
        ? (growth && growth.totalGrowthPct >= 0 ? `+${growth.totalGrowthPct}% Growth` : "Stable Trend")
        : (dimensions[0] ? String(data[0]?.[dimensions[0]] || "Overview") : "Direct Overview"),
      subtext: temporal.hasTemporal ? `${temporal.startLabel || "Start"} to ${temporal.endLabel || "End"}` : "Dominant segment",
    },
    {
      label: forecast ? "6-Month Projection" : "Archetype Classification",
      value: forecast
        ? `${currSymbol}${Math.round(forecast.forecastSeries[forecast.forecastSeries.length - 1].forecastValue).toLocaleString()}`
        : `[${archetype.primary}]`,
      subtext: forecast ? `Estimated by ${forecast.forecastSeries[forecast.forecastSeries.length - 1].displayLabel}` : archetype.description,
    },
    {
      label: "Data Completeness",
      value: `${profile.dataQuality.completenessRate}%`,
      subtext: `${profile.dataQuality.issues.length === 0 ? "100% clean records" : profile.dataQuality.issues.join("; ")}`,
    },
  ];

  const highlightsCard: HighlightsCardData = {
    title: focus ? `Executive Intelligence Summary [Focus: ${focus}]` : "Executive Intelligence Summary",
    items: highlightsItems,
  };

  const suggestions = generateContextAwareSuggestions(profile);

  return {
    profileType: archetype.primary,
    profile,
    summaryNarrative: profile.summaryNarrative,
    focus,
    kpis: kpis.slice(0, 4),
    charts,
    heroChart: charts[0] || null,
    segmentChart: charts[1] || null,
    correlationChart: charts[2] || null,
    forecastChart: charts.find((c) => c.isForecastChart) || null,
    highlightsCard,
    tableData: data,
    columns: profile.columns.map((c) => c.name),
    suggestions,
    projectionData,
    forecastResult: forecast,
    growthIntelligence: growth,
    forecastingSupported: capabilities.timeSeriesForecasting.available,
    forecastReason: capabilities.timeSeriesForecasting.reason,
    whatIfParams: {
      deltaPercent: 0,
      description: "Baseline Trend Projection",
    },
  };
}

// Re-analyze full dataset deterministically with optional focal theme
export function refreshDashboardWithFocus(
  data: Record<string, any>[],
  columns: string[],
  focus?: string
): DashboardState {
  const profile = buildDatasetIntelligenceProfile(data, columns);
  return synthesizeDashboardSpec(profile, data, focus);
}
