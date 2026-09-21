import {
  ColumnIntelligence,
  ColumnNumericStats,
  ColumnValueFrequency,
  DataQualityIntelligence,
  DatasetArchetype,
  DatasetIntelligenceProfile,
  DatasetSummaryNarrative,
  SemanticColumnType,
  TemporalIntelligence,
} from "./types";
import { discoverRelationships } from "./relationshipEngine";
import { detectAnalyticalCapabilities } from "./capabilityEngine";
import { parseDatePeriod, analyzeDateSpacing } from "./temporalUtils";
import { calculateGrowthIntelligence, calculateDeterministicForecast } from "./forecastEngine";

// Calculate numeric distribution statistics
export function calculateNumericStats(values: number[]): ColumnNumericStats | undefined {
  const valid = values.filter((v) => typeof v === "number" && !isNaN(v) && isFinite(v)).sort((a, b) => a - b);
  if (valid.length === 0) return undefined;

  const min = valid[0];
  const max = valid[valid.length - 1];
  const sum = valid.reduce((a, b) => a + b, 0);
  const mean = sum / valid.length;
  const median = valid[Math.floor(valid.length * 0.5)] || 0;
  const q1 = valid[Math.floor(valid.length * 0.25)] || min;
  const q3 = valid[Math.floor(valid.length * 0.75)] || max;

  const variance = valid.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / valid.length;
  const stdDev = Math.sqrt(variance);

  return {
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    sum: Math.round(sum * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    q1: Math.round(q1 * 100) / 100,
    q3: Math.round(q3 * 100) / 100,
  };
}

// Calculate top frequencies for categorical fields
export function calculateTopFrequencies(values: any[]): ColumnValueFrequency[] {
  const counts: Record<string, number> = {};
  let total = 0;

  values.forEach((v) => {
    if (v !== null && v !== undefined && v !== "") {
      const key = String(v).trim();
      counts[key] = (counts[key] || 0) + 1;
      total += 1;
    }
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([value, count]) => ({
      value,
      count,
      pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }));
}

// Detect temporal metadata and continuity using deterministic date parsing
export function analyzeTemporalColumn(data: Record<string, any>[], dateColName: string): TemporalIntelligence {
  const dateValues: { raw: string; parsed: any; sortKey: number }[] = [];

  data.forEach((row) => {
    const raw = row[dateColName];
    if (raw !== null && raw !== undefined && raw !== "") {
      const parsed = parseDatePeriod(raw);
      if (parsed) {
        dateValues.push({ raw: String(raw), parsed, sortKey: parsed.sortKey });
      }
    }
  });

  if (dateValues.length === 0) {
    return {
      hasTemporal: false,
      observationCount: 0,
      isContinuous: false,
      continuityScore: 0,
    };
  }

  // Sort chronologically
  dateValues.sort((a, b) => a.sortKey - b.sortKey);
  const first = dateValues[0].parsed;
  const last = dateValues[dateValues.length - 1].parsed;

  // Use robust date spacing analyzer to infer true frequency & regularity
  const spacing = analyzeDateSpacing(dateValues);

  const startLabel = first.displayLabel;
  const endLabel = last.displayLabel;

  return {
    hasTemporal: true,
    dateColumn: dateColName,
    startDate: first.raw,
    endDate: last.raw,
    startLabel,
    endLabel,
    observationCount: dateValues.length,
    frequency: spacing.frequency,
    isContinuous: spacing.isRegular,
    continuityScore: spacing.continuityScore,
    isRegular: spacing.isRegular,
    averageIntervalDays: spacing.averageIntervalDays,
    minIntervalDays: spacing.minIntervalDays,
    maxIntervalDays: spacing.maxIntervalDays,
    granularityLabel: spacing.granularityLabel,
    timeSpanDescription: spacing.timeSpanDescription,
    spanDays: spacing.spanDays,
    duplicateTimestampsCount: spacing.duplicateTimestampsCount,
    orderedLabels: dateValues.map((d) => d.parsed.displayLabel),
  };
}

// Deep column profiling & semantic classification
export function profileColumns(data: Record<string, any>[], columns: string[]): ColumnIntelligence[] {
  const rowCount = data.length;

  return columns.map((col) => {
    const colLower = col.toLowerCase();
    const rawValues = data.map((r) => r[col]);
    const validValues = rawValues.filter((v) => v !== null && v !== undefined && v !== "");
    const missingCount = rowCount - validValues.length;
    const missingRate = rowCount > 0 ? Math.round((missingCount / rowCount) * 1000) / 10 : 0;

    const uniqueValues = Array.from(new Set(validValues.map((v) => String(v).trim())));
    const uniqueCount = uniqueValues.length;

    // Check numeric presence
    const numericValues = validValues.map((v) => Number(v)).filter((v) => !isNaN(v) && isFinite(v));
    const isMostlyNumeric = validValues.length > 0 && numericValues.length >= validValues.length * 0.75;

    // Check date presence
    const dateParsedCount = validValues.filter((v) => parseDatePeriod(v) !== null).length;
    const isMostlyDate = validValues.length > 0 && dateParsedCount >= validValues.length * 0.75;

    // 1. Date Check (Higher precedence than generic text/numbers)
    const isDateName =
      colLower.includes("date") ||
      colLower.includes("quarter") ||
      colLower.includes("month") ||
      colLower.includes("year") ||
      colLower.includes("timestamp") ||
      colLower.includes("period") ||
      colLower === "time" ||
      colLower === "day" ||
      colLower === "week";

    if (isMostlyDate || (isDateName && !isMostlyNumeric)) {
      return {
        name: col,
        semanticType: "date",
        dataType: "date",
        missingCount,
        missingRate,
        uniqueCount,
        cardinality: uniqueCount > 20 ? "high" : "medium",
        topValues: calculateTopFrequencies(validValues),
      };
    }

    // 2. Identifier & Unique Entity Name Check
    const isNameCol =
      colLower === "name" ||
      colLower === "student_name" ||
      colLower === "employee_name" ||
      colLower === "user_name" ||
      colLower === "username" ||
      colLower === "first_name" ||
      colLower === "last_name" ||
      colLower === "full_name" ||
      colLower === "email" ||
      colLower.endsWith("_name");

    const isIdCol =
      colLower === "id" ||
      colLower.endsWith("_id") ||
      colLower.endsWith("id") ||
      colLower === "code" ||
      colLower.endsWith("_code") ||
      colLower === "ssn" ||
      colLower === "ticket" ||
      colLower === "uuid" ||
      (uniqueCount === rowCount && rowCount >= 4 && !isMostlyNumeric) ||
      (isNameCol && uniqueCount >= rowCount * 0.7);

    if (isIdCol || (isNameCol && !isMostlyNumeric)) {
      return {
        name: col,
        semanticType: isIdCol ? "identifier" : "high_cardinality_text",
        dataType: isMostlyNumeric ? "number" : "string",
        missingCount,
        missingRate,
        uniqueCount,
        cardinality: uniqueCount === rowCount ? "unique" : "high",
        topValues: calculateTopFrequencies(validValues),
      };
    }

    // 3. Binary / Target Flag Check
    const isBinary =
      uniqueCount <= 2 &&
      uniqueValues.every((v) => v === "0" || v === "1" || v === "true" || v === "false" || v === "yes" || v === "no");

    const isTargetName =
      colLower.includes("stroke") ||
      colLower.includes("survived") ||
      colLower.includes("churn") ||
      colLower.includes("hypertension") ||
      colLower.includes("heart_disease") ||
      colLower.includes("target") ||
      colLower.includes("default") ||
      colLower.includes("outcome") ||
      colLower.includes("attrition") ||
      colLower.includes("converted");

    if (isBinary || (isTargetName && uniqueCount <= 5)) {
      return {
        name: col,
        semanticType: "binary_target",
        dataType: isMostlyNumeric ? "number" : "string",
        missingCount,
        missingRate,
        uniqueCount,
        cardinality: "binary",
        topValues: calculateTopFrequencies(validValues),
        numericStats: isMostlyNumeric ? calculateNumericStats(numericValues) : undefined,
      };
    }

    // 4. Numeric Measures (Additive vs Non-Additive)
    if (isMostlyNumeric) {
      const isNonAdditiveName =
        colLower.includes("age") ||
        colLower.includes("bmi") ||
        colLower.includes("gpa") ||
        colLower.includes("rate") ||
        colLower.includes("rating") ||
        colLower.includes("score") ||
        colLower.includes("percent") ||
        colLower.includes("ratio") ||
        colLower.includes("tenure") ||
        colLower.includes("pclass") ||
        colLower.includes("rank");

      return {
        name: col,
        semanticType: isNonAdditiveName ? "non_additive_numeric" : "additive_numeric",
        dataType: "number",
        missingCount,
        missingRate,
        uniqueCount,
        cardinality: uniqueCount <= 5 ? "low" : uniqueCount <= 20 ? "medium" : "high",
        numericStats: calculateNumericStats(numericValues),
        topValues: calculateTopFrequencies(validValues),
      };
    }

    // 5. Categorical Dimensions (Strictly non-unique string categories)
    const isHighCard = uniqueCount > 20 || uniqueCount >= rowCount * 0.8;

    return {
      name: col,
      semanticType: isHighCard ? "high_cardinality_text" : "categorical",
      dataType: "string",
      missingCount,
      missingRate,
      uniqueCount,
      cardinality: uniqueCount <= 6 ? "low" : uniqueCount <= 20 ? "medium" : "high",
      topValues: calculateTopFrequencies(validValues),
    };
  });
}

// Generate Dataset Summary Narrative in plain, non-technical English
export function generateDatasetSummaryNarrative(
  rowCount: number,
  colCount: number,
  profiledCols: ColumnIntelligence[],
  temporal: TemporalIntelligence,
  measures: string[],
  dimensions: string[],
  targets: string[],
  capabilities: any,
  archetype: DatasetArchetype
): DatasetSummaryNarrative {
  const isTemporal = temporal.hasTemporal;
  const measureNames = measures.map((m) => m.replace(/_/g, " "));

  let domainDescription = "";
  let datasetType = "Cross-Sectional Dataset";

  if (isTemporal && measures.length > 0) {
    const timeSpanText = temporal.startLabel && temporal.endLabel
      ? `from ${temporal.startLabel} through ${temporal.endLabel}`
      : `spanning ${temporal.observationCount} ${temporal.frequency || "time"} periods`;

    const metricsJoined = measureNames.length <= 2
      ? measureNames.join(" and ")
      : `${measureNames.slice(0, -1).join(", ")}, and ${measureNames[measureNames.length - 1]}`;

    if (temporal.isRegular) {
      if (archetype === "FINANCIAL") {
        datasetType = "Business Performance Time Series";
        domainDescription = `This dataset tracks ${temporal.frequency} business performance ${timeSpanText}. It contains ${metricsJoined}, allowing Kroma to examine growth, relationships between metrics, and future revenue projections.`;
      } else {
        datasetType = "Longitudinal Time Series";
        domainDescription = `This dataset records sequential ${temporal.frequency} observations ${timeSpanText} across ${metricsJoined}.`;
      }
    } else {
      // Irregular observation series
      datasetType = archetype === "FINANCIAL" ? "Business Performance Observations (Irregular)" : "Dated Observations (Irregular)";
      const avgInterval = temporal.averageIntervalDays ? Math.round(temporal.averageIntervalDays) : null;
      const intervalNote = avgInterval ? ` (spaced ~${avgInterval} days on average)` : "";
      domainDescription = `This dataset records ${temporal.observationCount} dated observations spanning ${temporal.startLabel || temporal.startDate} through ${temporal.endLabel || temporal.endDate}${intervalNote} across ${metricsJoined}. Observation intervals vary, supporting historical trajectory review, multi-metric tracking, and directional projections.`;
    }
  } else if (targets.length > 0) {
    datasetType = "Target Outcome Analysis";
    domainDescription = `This dataset profiles ${rowCount} records focusing on the target outcome [${targets.join(", ").replace(/_/g, " ")}].`;
  } else if (dimensions.length > 0 && measures.length > 0) {
    datasetType = "Cross-Sectional Cohort Dataset";
    domainDescription = `This dataset contains ${rowCount} individual records across ${dimensions.length} categories and ${measures.length} numeric measures.`;
  } else {
    datasetType = "General Structured Dataset";
    domainDescription = `This dataset contains ${rowCount} records and ${colCount} attributes.`;
  }

  // Temporal summary text (Exact, no timezone drift, accurate interval semantics)
  const temporalInfo = isTemporal
    ? temporal.isRegular
      ? `${temporal.observationCount} ${temporal.frequency} periods (${temporal.startLabel || temporal.startDate} to ${temporal.endLabel || temporal.endDate})`
      : `${temporal.observationCount} observations spanning ${temporal.startLabel || temporal.startDate} to ${temporal.endLabel || temporal.endDate} (irregular intervals, avg ~${temporal.averageIntervalDays ? Math.round(temporal.averageIntervalDays) : "?"}d)`
    : "Static Cross-Sectional (No time dimension)";

  // Available analysis labels - only what the dataset truly supports!
  const analysisAvailable: string[] = [];
  if (capabilities.trendAnalysis?.available && measures[0]) {
    analysisAvailable.push(`${measures[0].replace(/_/g, " ")} Trend`);
  }
  if (isTemporal && measures.length > 0) {
    analysisAvailable.push("Growth Analysis");
  }
  if (capabilities.correlationAnalysis?.available && measures.length >= 2) {
    analysisAvailable.push("Metric Relationships");
  }
  if (capabilities.timeSeriesForecasting?.available && measures[0]) {
    analysisAvailable.push(`${measures[0].replace(/_/g, " ")} Forecast`);
  }
  if (capabilities.cohortAnalysis?.available && dimensions.length > 0) {
    analysisAvailable.push("Category Comparison");
  }
  if (capabilities.targetPrediction?.available) {
    analysisAvailable.push("Outcome Risk");
  }
  if (capabilities.distributionAnalysis?.available && !isTemporal) {
    analysisAvailable.push("Distribution Spread");
  }

  if (analysisAvailable.length === 0) {
    analysisAvailable.push("Overview Analysis");
  }

  // Data Quality Text
  const missingTotal = profiledCols.reduce((acc, c) => acc + c.missingCount, 0);
  const dataQualityText = missingTotal === 0
    ? "100.0% Complete (0 missing values)"
    : `${missingTotal} missing cells across ${colCount} attributes`;

  // Rationale
  let dashboardRationale = "";
  if (isTemporal && capabilities.timeSeriesForecasting?.available) {
    if (temporal.isRegular) {
      dashboardRationale = `Kroma prioritizes historical trend lines, growth trajectory, and a deterministic 6-month forecast because the dataset contains a continuous ${temporal.frequency} time dimension without fake category assumptions.`;
    } else {
      dashboardRationale = `Kroma presents sequential trend tracking, multi-metric alignment, and a 6-period directional projection, qualifying that observation intervals are irregular across the observed ${temporal.observationCount} points.`;
    }
  } else if (dimensions.length > 0 && measures.length > 0) {
    dashboardRationale = `Kroma emphasizes comparative category totals and distributions across genuine categories in the data.`;
  } else {
    dashboardRationale = `Kroma presents metric distributions and relationships directly from the source records.`;
  }

  return {
    title: "Dataset Intelligence Summary",
    overview: domainDescription,
    datasetType,
    recordsCount: rowCount,
    attributesCount: colCount,
    dimensions: dimensions.slice(0, 4),
    measures: measures.slice(0, 4),
    temporalInfo,
    analysisAvailable,
    dataQualityText,
    dashboardRationale,
  };
}

// Deterministic Dataset Intelligence Profile Builder
export function buildDatasetIntelligenceProfile(
  data: Record<string, any>[],
  columns: string[]
): DatasetIntelligenceProfile {
  const rowCount = data.length;
  const colCount = columns.length;

  // Profile all columns
  const profiledCols = profileColumns(data, columns);

  // Group columns by semantic class
  const measures = profiledCols
    .filter((c) => c.semanticType === "additive_numeric" || c.semanticType === "non_additive_numeric")
    .map((c) => c.name);

  // STRICT DIMENSIONS: only genuine categorical columns, never dates, never unique text!
  const dimensions = profiledCols
    .filter((c) => c.semanticType === "categorical" && c.cardinality !== "unique")
    .map((c) => c.name);

  const targets = profiledCols
    .filter((c) => c.semanticType === "binary_target")
    .map((c) => c.name);

  const identifiers = profiledCols
    .filter((c) => c.semanticType === "identifier")
    .map((c) => c.name);

  const dateCol = profiledCols.find((c) => c.semanticType === "date");
  const temporal = dateCol
    ? analyzeTemporalColumn(data, dateCol.name)
    : {
        hasTemporal: false,
        observationCount: 0,
        isContinuous: false,
        continuityScore: 0,
      };

  // Evaluate Data Quality
  const missingCellsTotal = profiledCols.reduce((acc, c) => acc + c.missingCount, 0);
  const totalCells = Math.max(rowCount * colCount, 1);
  const completenessRate = Math.round(((totalCells - missingCellsTotal) / totalCells) * 1000) / 10;

  const qualityIssues: string[] = [];
  if (completenessRate < 90) qualityIssues.push(`High missing rate: ${(100 - completenessRate).toFixed(1)}% missing cells`);
  if (profiledCols.some((c) => c.missingRate > 25)) {
    const highMissing = profiledCols.filter((c) => c.missingRate > 25).map((c) => c.name);
    qualityIssues.push(`Columns with >25% missing data: ${highMissing.join(", ")}`);
  }
  if (measures.length === 0) qualityIssues.push("No continuous numeric metrics found");

  const dataQuality: DataQualityIntelligence = {
    completenessRate,
    duplicateRowCount: 0,
    missingCellsTotal,
    issues: qualityIssues,
  };

  // Discover structural relationships across columns
  const relationships = discoverRelationships(data, profiledCols, temporal);

  // Detect capabilities
  const capabilities = detectAnalyticalCapabilities({
    columns: profiledCols,
    temporal,
    measures,
    dimensions,
    targets,
    relationships,
    rowCount,
  });

  // Determine Archetype & Multi-Signal Characteristics
  const colStr = columns.join(" ").toLowerCase();
  const secondarySignals: string[] = [];

  let primaryArchetype: DatasetArchetype = "CROSS_SECTIONAL_DISCOVERY";
  let confidence = 0.85;

  const hasFinancialTerms =
    colStr.includes("amount") ||
    colStr.includes("sales") ||
    colStr.includes("revenue") ||
    colStr.includes("price") ||
    colStr.includes("cost") ||
    colStr.includes("spend") ||
    colStr.includes("budget") ||
    colStr.includes("profit") ||
    colStr.includes("expense");

  const hasProgressTerms =
    colStr.includes("weight") ||
    colStr.includes("steps") ||
    colStr.includes("reps") ||
    colStr.includes("hours") ||
    colStr.includes("pace") ||
    colStr.includes("distance") ||
    colStr.includes("calorie") ||
    colStr.includes("score") ||
    colStr.includes("unit") ||
    colStr.includes("order");

  const hasWorkflowTerms =
    colStr.includes("funnel_stage") ||
    colStr.includes("pipeline_stage") ||
    colStr.includes("deal_stage") ||
    (colStr.includes("stage") && colStr.includes("status") && !colStr.includes("student") && !colStr.includes("employee"));

  if (temporal.hasTemporal) secondarySignals.push("Temporal Time-Series");
  if (hasFinancialTerms) secondarySignals.push("Financial Value Metrics");
  if (hasWorkflowTerms) secondarySignals.push("Operational Workflow / Funnel");
  if (targets.length > 0) secondarySignals.push("Target Outcome Flag");
  if (dimensions.length > 0) secondarySignals.push("Multi-Segment Categorical");

  if (temporal.hasTemporal && measures.length > 0) {
    if (hasFinancialTerms || measures.some((m) => m.toLowerCase().includes("revenue") || m.toLowerCase().includes("spend"))) {
      primaryArchetype = "FINANCIAL";
      confidence = 0.95;
    } else {
      primaryArchetype = "QUANTITATIVE_PROGRESS";
      confidence = 0.9;
    }
  } else if (hasWorkflowTerms) {
    primaryArchetype = "CATEGORICAL_OPERATIONAL";
    confidence = 0.88;
  } else {
    primaryArchetype = "CROSS_SECTIONAL_DISCOVERY";
    confidence = 0.85;
  }

  // Calculate Growth Intelligence if temporal + measures exist
  const growth = (temporal.hasTemporal && temporal.dateColumn && measures.length > 0)
    ? calculateGrowthIntelligence(data, temporal.dateColumn, measures[0]) || undefined
    : undefined;

  // Calculate Forecast if capability is available (pass temporal context for suitability & exploratory labeling)
  const forecast = (capabilities.timeSeriesForecasting.available && temporal.dateColumn && measures.length > 0)
    ? calculateDeterministicForecast(data, temporal.dateColumn, measures[0], 6, temporal) || undefined
    : undefined;

  // Generate the grounded summary narrative
  const summaryNarrative = generateDatasetSummaryNarrative(
    rowCount,
    colCount,
    profiledCols,
    temporal,
    measures,
    dimensions,
    targets,
    capabilities,
    primaryArchetype
  );

  return {
    datasetSummary: {
      rowCount,
      columnCount: colCount,
      dataQualityScore: completenessRate,
      schemaAnomalies: qualityIssues.length,
    },
    summaryNarrative,
    columns: profiledCols,
    temporal,
    measures,
    dimensions,
    targets,
    identifiers,
    relationships,
    dataQuality,
    capabilities,
    archetype: {
      primary: primaryArchetype,
      confidence,
      secondarySignals,
      description: `${primaryArchetype} Profile with ${secondarySignals.join(", ") || "General Attributes"}`,
    },
    growth,
    forecast,
  };
}
