import {
  CategoricalGroupBreakdown,
  CategoricalGroupItem,
  ColumnIntelligence,
  ColumnNumericStats,
  ColumnValueFrequency,
  DataQualityIntelligence,
  DatasetArchetype,
  DatasetIntelligenceProfile,
  DatasetSummaryNarrative,
  DeterministicCorrelation,
  FullNumericColumnStat,
  SemanticColumnType,
  TargetOutcomeDistributionItem,
  TargetOutcomeIntelligence,
  TargetOutcomeType,
  TemporalIntelligence,
  VerifiedFactPack,
  AnalysisContext,
  DerivedMetricDefinition,
} from "./types";
import { discoverRelationships, calculateAllCorrelations } from "./relationshipEngine";
import { detectAnalyticalCapabilities } from "./capabilityEngine";
import { parseDatePeriod, analyzeDateSpacing } from "./temporalUtils";
import { calculateGrowthIntelligence, calculateDeterministicForecast } from "./forecastEngine";
import { generateDatasetFingerprint, validateFactPackConsistency } from "./factPackReconciliation";

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

    // 3. Target / Outcome Flag Check
    const isBinary =
      uniqueCount <= 2 &&
      uniqueValues.every((v) => ["0", "1", "true", "false", "yes", "no"].includes(v.toLowerCase()));

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
      colLower.includes("converted") ||
      colLower.includes("risk");

    const lowerVals = uniqueValues.map((v) => v.toLowerCase());
    const isOrdinalScale =
      (lowerVals.length === 3 &&
        lowerVals.includes("low") &&
        (lowerVals.includes("medium") || lowerVals.includes("med") || lowerVals.includes("moderate")) &&
        lowerVals.includes("high")) ||
      (lowerVals.length === 4 &&
        lowerVals.includes("none") &&
        lowerVals.includes("low") &&
        lowerVals.includes("medium") &&
        lowerVals.includes("high")) ||
      (lowerVals.length >= 3 &&
        lowerVals.length <= 5 &&
        lowerVals.some((v) => v.includes("tier") || v.includes("grade") || v.includes("level")));

    if (isBinary) {
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

    if (isTargetName && (isOrdinalScale || (uniqueCount <= 5 && !isMostlyNumeric))) {
      return {
        name: col,
        semanticType: isOrdinalScale ? "ordinal_target" : "nominal_target",
        dataType: "string",
        missingCount,
        missingRate,
        uniqueCount,
        cardinality: "low",
        topValues: calculateTopFrequencies(validValues),
      };
    }

    if (isTargetName && isMostlyNumeric && uniqueCount <= 10) {
      return {
        name: col,
        semanticType: "ordinal_target",
        dataType: "number",
        missingCount,
        missingRate,
        uniqueCount,
        cardinality: "low",
        topValues: calculateTopFrequencies(validValues),
        numericStats: calculateNumericStats(numericValues),
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

  // Group columns by semantic class with business measure prioritization
  const priorityScore = (name: string): number => {
    const n = name.toLowerCase();
    if (n === "revenue" || n === "sales" || n === "monthly_revenue") return 1;
    if (n === "profit" || n === "net_income") return 2;
    if (n === "cost" || n === "spend" || n === "expense") return 3;
    if (n === "units" || n === "orders" || n === "quantity" || n === "volume") return 4;
    if (n === "discount") return 5;
    return 10;
  };

  const measures = profiledCols
    .filter((c) => c.semanticType === "additive_numeric" || c.semanticType === "non_additive_numeric")
    .map((c) => c.name)
    .sort((a, b) => priorityScore(a) - priorityScore(b));

  // STRICT DIMENSIONS: only genuine categorical columns, never dates, never unique text!
  const dimensions = profiledCols
    .filter((c) => c.semanticType === "categorical" && c.cardinality !== "unique")
    .map((c) => c.name);

  const targets = profiledCols
    .filter(
      (c) =>
        c.semanticType === "binary_target" ||
        c.semanticType === "ordinal_target" ||
        c.semanticType === "nominal_target" ||
        c.semanticType === "numeric_target"
    )
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

  // Detect Target Outcome Intelligence if target column is present
  const targetCol = targets[0];
  const targetColIntel = targetCol ? profiledCols.find((c) => c.name === targetCol) : undefined;
  const targetIntelligence = targetCol ? detectTargetOutcomeIntelligence(data, targetCol, targetColIntel) : undefined;

  // Discover structural relationships across columns (including ordinal target correlations)
  const relationships = discoverRelationships(data, profiledCols, temporal, targetIntelligence);

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

  // Archetype Classification Heuristic
  let primaryArchetype: DatasetArchetype = "CROSS_SECTIONAL_DISCOVERY";
  let confidence = 0.85;
  const secondarySignals: string[] = [];

  const colStr = columns.join(" ").toLowerCase();
  const hasFinancialTerms =
    colStr.includes("revenue") ||
    colStr.includes("sales") ||
    colStr.includes("profit") ||
    colStr.includes("cost") ||
    colStr.includes("mrr") ||
    colStr.includes("arr") ||
    colStr.includes("salary") ||
    colStr.includes("price");

  const hasQuantitativeTerms =
    colStr.includes("step") ||
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

  // Compute Authoritative VerifiedFactPack
  const allCorrelations = calculateAllCorrelations(data, profiledCols, targetIntelligence);
  const factPack = calculateVerifiedFactPack(
    data,
    profiledCols,
    primaryArchetype,
    dataQuality,
    targetIntelligence,
    allCorrelations
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
    targetIntelligence,
    factPack,
    analysisContext: factPack.analysisContext,
  };
}

// Detect Target Outcome Intelligence with full ordinal / binary / nominal handling
export function detectTargetOutcomeIntelligence(
  data: Record<string, any>[],
  targetCol: string,
  targetColIntel?: ColumnIntelligence
): TargetOutcomeIntelligence {
  const rowCount = data.length;
  const rawValues = data.map((r) => r[targetCol]);
  const validValues = rawValues.filter((v) => v !== null && v !== undefined && v !== "");

  const counts: Record<string, number> = {};
  validValues.forEach((v) => {
    const k = String(v).trim();
    counts[k] = (counts[k] || 0) + 1;
  });

  const uniqueKeys = Object.keys(counts);
  const lowerMap: Record<string, string> = {};
  uniqueKeys.forEach((k) => {
    lowerMap[k.toLowerCase()] = k;
  });

  const isLowMedHigh =
    uniqueKeys.length === 3 &&
    "low" in lowerMap &&
    ("medium" in lowerMap || "med" in lowerMap || "moderate" in lowerMap) &&
    "high" in lowerMap;

  let targetType: TargetOutcomeType = "nominal";
  let ordinalMapping: Record<string, number> | undefined;
  let distribution: TargetOutcomeDistributionItem[] = [];
  let displayMetricLabel = `${targetCol.replace(/_/g, " ").toUpperCase()} RATE`;
  let displayMetricValue = "0.0%";
  let subtext = "";
  let highRiskRate: number | undefined;

  if (isLowMedHigh) {
    targetType = "ordinal";
    const lowKey = lowerMap["low"];
    const medKey = lowerMap["medium"] || lowerMap["med"] || lowerMap["moderate"];
    const highKey = lowerMap["high"];

    ordinalMapping = {
      [lowKey]: 0,
      [medKey]: 1,
      [highKey]: 2,
    };

    const countHigh = counts[highKey] || 0;
    const countMed = counts[medKey] || 0;
    const countLow = counts[lowKey] || 0;

    const pctHigh = rowCount > 0 ? Math.round((countHigh / rowCount) * 1000) / 10 : 0;
    const pctMed = rowCount > 0 ? Math.round((countMed / rowCount) * 1000) / 10 : 0;
    const pctLow = rowCount > 0 ? Math.round((countLow / rowCount) * 1000) / 10 : 0;

    distribution = [
      { label: highKey, count: countHigh, percentage: pctHigh, ordinalRank: 2 },
      { label: medKey, count: countMed, percentage: pctMed, ordinalRank: 1 },
      { label: lowKey, count: countLow, percentage: pctLow, ordinalRank: 0 },
    ];

    highRiskRate = pctHigh;
    displayMetricLabel = "HIGH-RISK RATE";
    displayMetricValue = `${pctHigh.toFixed(1)}%`;
    subtext = `${highKey}: ${pctHigh.toFixed(1)}% • ${medKey}: ${pctMed.toFixed(1)}% • ${lowKey}: ${pctLow.toFixed(1)}%`;
  } else if (
    uniqueKeys.length <= 2 &&
    uniqueKeys.every((k) => ["0", "1", "true", "false", "yes", "no"].includes(k.toLowerCase()))
  ) {
    targetType = "binary";
    const posKey = uniqueKeys.find((k) => ["1", "true", "yes"].includes(k.toLowerCase())) || uniqueKeys[0];
    const posCount = counts[posKey] || 0;
    const posPct = rowCount > 0 ? Math.round((posCount / rowCount) * 1000) / 10 : 0;

    distribution = uniqueKeys.map((k) => ({
      label: k,
      count: counts[k] || 0,
      percentage: rowCount > 0 ? Math.round(((counts[k] || 0) / rowCount) * 1000) / 10 : 0,
      ordinalRank: k.toLowerCase() === posKey.toLowerCase() ? 1 : 0,
    }));

    ordinalMapping = {};
    uniqueKeys.forEach((k) => {
      ordinalMapping![k] = k.toLowerCase() === posKey.toLowerCase() ? 1 : 0;
    });

    displayMetricLabel = `${targetCol.replace(/_/g, " ").toUpperCase()} RATE`;
    displayMetricValue = `${posPct.toFixed(1)}%`;
    subtext = `Observed rate for ${posKey}`;
    highRiskRate = posPct;
  } else if (targetColIntel && targetColIntel.dataType === "number") {
    targetType = "numeric";
    displayMetricLabel = `AVERAGE ${targetCol.replace(/_/g, " ").toUpperCase()}`;
    displayMetricValue = targetColIntel.numericStats ? targetColIntel.numericStats.mean.toFixed(1) : "N/A";
    subtext = "Observed continuous target";
  } else {
    targetType = "nominal";
    distribution = uniqueKeys.map((k) => ({
      label: k,
      count: counts[k] || 0,
      percentage: rowCount > 0 ? Math.round(((counts[k] || 0) / rowCount) * 1000) / 10 : 0,
    })).sort((a, b) => b.count - a.count);

    const top = distribution[0];
    displayMetricLabel = `${targetCol.replace(/_/g, " ").toUpperCase()} DISTRIBUTION`;
    displayMetricValue = top ? `${top.label} (${top.percentage}%)` : "N/A";
    subtext = `${uniqueKeys.length} categories`;
  }

  return {
    targetColumn: targetCol,
    targetType,
    distribution,
    highRiskRate,
    adverseRate: highRiskRate,
    displayMetricLabel,
    displayMetricValue,
    subtext,
    ordinalMapping,
  };
}

// Deterministically build isolated, immutable AnalysisContext
export function buildAnalysisContext(
  data: Record<string, any>[],
  profiledCols: ColumnIntelligence[],
  archetype: DatasetArchetype,
  datasetFingerprint: string,
  sourceDataset?: string
): AnalysisContext {
  const rowCount = data.length;
  const columns = profiledCols.map((c) => c.name);
  const columnTypes: Record<string, SemanticColumnType | string> = {};
  profiledCols.forEach((c) => {
    columnTypes[c.name] = c.semanticType;
  });

  const dateCol = profiledCols.find((c) => c.semanticType === "date");
  const numericColumns = profiledCols
    .filter((c) => c.semanticType === "additive_numeric" || c.semanticType === "non_additive_numeric")
    .map((c) => c.name);

  // Categorical dimensions (excluding identifiers, dates, and unique text)
  const categoricalColumns = profiledCols
    .filter(
      (c) =>
        (c.semanticType === "categorical" ||
          c.semanticType === "ordinal_target" ||
          c.semanticType === "nominal_target" ||
          c.semanticType === "high_cardinality_text") &&
        c.cardinality !== "unique" &&
        c.name.toLowerCase() !== "date"
    )
    .map((c) => c.name);

  const priorityScore = (name: string): number => {
    const n = name.toLowerCase();
    if (n === "revenue" || n === "sales" || n === "monthly_revenue") return 1;
    if (n === "profit" || n === "net_income") return 2;
    if (n === "cost" || n === "spend" || n === "expense") return 3;
    if (n === "units" || n === "orders" || n === "quantity" || n === "volume") return 4;
    if (n === "discount") return 5;
    return 10;
  };

  const measures = [...numericColumns].sort((a, b) => priorityScore(a) - priorityScore(b));
  const dimensions = [...categoricalColumns];

  // Derived metrics definition
  const derivedMetrics: Record<string, DerivedMetricDefinition> = {};

  // Find Revenue and Cost column candidates (case-insensitive)
  const revCol = numericColumns.find((c) => /^(revenue|sales|monthly_revenue)$/i.test(c));
  const costCol = numericColumns.find((c) => /^(cost|spend|expense)$/i.test(c));

  let totalRev = 0;
  let totalCost = 0;
  let totalProfit = 0;
  let profitMargin = 0;

  if (revCol) {
    totalRev = data.reduce((s, r) => s + (Number(r[revCol]) || 0), 0);
  }
  if (costCol) {
    totalCost = data.reduce((s, r) => s + (Number(r[costCol]) || 0), 0);
  }

  if (revCol && costCol) {
    totalProfit = Math.round((totalRev - totalCost) * 100) / 100;
    const meanProfit = rowCount > 0 ? Math.round((totalProfit / rowCount) * 100) / 100 : 0;
    profitMargin = totalRev > 0 ? Math.round(((totalProfit / totalRev) * 100) * 10) / 10 : 0;

    derivedMetrics["Profit"] = {
      name: "Profit",
      formula: `${revCol} - ${costCol}`,
      sourceColumns: [revCol, costCol],
      total: totalProfit,
      mean: meanProfit,
      format: "currency",
    };

    derivedMetrics["Profit_Margin"] = {
      name: "Profit Margin",
      formula: `(${revCol} - ${costCol}) / ${revCol}`,
      sourceColumns: [revCol, costCol],
      total: profitMargin,
      mean: profitMargin,
      format: "percent",
    };
  }

  const availableMetrics = Array.from(new Set([
    ...measures,
    ...Object.keys(derivedMetrics),
    ...(derivedMetrics["Profit_Margin"] ? ["Profit Margin", "profit_margin"] : []),
  ]));

  // Precomputed deterministic facts
  const deterministicFacts: Record<string, any> = {
    rowCount,
    columnCount: columns.length,
    datasetFingerprint,
  };

  if (revCol) {
    deterministicFacts.totalRevenue = Math.round(totalRev * 100) / 100;
    deterministicFacts.avgRevenue = rowCount > 0 ? Math.round((totalRev / rowCount) * 100) / 100 : 0;
  }
  if (costCol) {
    deterministicFacts.totalCost = Math.round(totalCost * 100) / 100;
  }
  if (revCol && costCol) {
    deterministicFacts.totalProfit = totalProfit;
    deterministicFacts.profitMargin = profitMargin;
  }

  const unitsCol = numericColumns.find((c) => /^(units|orders|quantity)$/i.test(c));
  if (unitsCol) {
    deterministicFacts.totalUnits = data.reduce((s, r) => s + (Number(r[unitsCol]) || 0), 0);
  }

  // Dimension summaries (Region, Category, Customer_Type, etc.)
  const dimensionAggregations: Record<string, any> = {};
  dimensions.forEach((dim) => {
    const uniqueGroups = Array.from(new Set(data.map((r) => String(r[dim] ?? "").trim()).filter(Boolean)));
    const groupData = uniqueGroups.map((grp) => {
      const matchingRows = data.filter((r) => String(r[dim] ?? "").trim().toLowerCase() === grp.toLowerCase());
      const count = matchingRows.length;
      const gRev = revCol ? matchingRows.reduce((s, r) => s + (Number(r[revCol]) || 0), 0) : 0;
      const gCost = costCol ? matchingRows.reduce((s, r) => s + (Number(r[costCol]) || 0), 0) : 0;
      const gProfit = revCol && costCol ? Math.round((gRev - gCost) * 100) / 100 : 0;
      const gMargin = gRev > 0 ? Math.round(((gProfit / gRev) * 100) * 10) / 10 : 0;
      const gUnits = unitsCol ? matchingRows.reduce((s, r) => s + (Number(r[unitsCol]) || 0), 0) : 0;
      return {
        group: grp,
        count,
        revenue: Math.round(gRev * 100) / 100,
        cost: Math.round(gCost * 100) / 100,
        profit: gProfit,
        profitMargin: gMargin,
        units: gUnits,
      };
    });
    dimensionAggregations[dim] = groupData;
  });
  deterministicFacts.dimensions = dimensionAggregations;

  const datasetId = `ds_${rowCount}r_${columns.length}c_${datasetFingerprint.slice(0, 8)}`;

  return {
    datasetId,
    datasetFingerprint,
    rowCount,
    columns,
    columnTypes,
    dateColumn: dateCol?.name,
    numericColumns,
    categoricalColumns,
    measures,
    dimensions,
    archetype,
    deterministicFacts,
    derivedMetrics,
    availableMetrics,
    sourceDataset,
    tableData: data,
  };
}

// Compute deterministic VerifiedFactPack from the entire dataset
export function calculateVerifiedFactPack(
  data: Record<string, any>[],
  profiledCols: ColumnIntelligence[],
  archetype: DatasetArchetype,
  dataQuality: DataQualityIntelligence,
  targetIntelligence?: TargetOutcomeIntelligence,
  correlations: DeterministicCorrelation[] = []
): VerifiedFactPack {
  const rowCount = data.length;
  const colCount = profiledCols.length;
  const columnNames = profiledCols.map((c) => c.name);

  const numericCols = profiledCols
    .filter((c) => c.semanticType === "additive_numeric" || c.semanticType === "non_additive_numeric")
    .map((c) => c.name);

  const candidateDims = profiledCols
    .filter(
      (c) =>
        (c.semanticType === "categorical" ||
          c.semanticType === "ordinal_target" ||
          c.semanticType === "nominal_target") &&
        c.uniqueCount <= 16
    )
    .map((c) => c.name);

  const dateCols = profiledCols
    .filter((c) => c.semanticType === "date")
    .map((c) => c.name);

  const missingValueCounts: Record<string, number> = {};
  profiledCols.forEach((c) => {
    missingValueCounts[c.name] = c.missingCount;
  });

  // 1. Full Numeric Stats
  const numericStats: Record<string, FullNumericColumnStat> = {};
  numericCols.forEach((colName) => {
    const vals = data
      .map((r) => Number(r[colName]))
      .filter((v) => !isNaN(v) && isFinite(v));

    if (vals.length > 0) {
      vals.sort((a, b) => a - b);
      const count = vals.length;
      const sum = vals.reduce((a, b) => a + b, 0);
      const mean = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
      const mid = Math.floor(count / 2);
      const median = count % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid];
      const min = vals[0];
      const max = vals[vals.length - 1];

      const variance = vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / Math.max(count, 1);
      const stdDev = Math.round(Math.sqrt(variance) * 100) / 100;

      const q1 = vals[Math.floor(count * 0.25)];
      const q3 = vals[Math.floor(count * 0.75)];
      const iqr = Math.round((q3 - q1) * 100) / 100;

      numericStats[colName] = {
        name: colName,
        count,
        sum: Math.round(sum * 100) / 100,
        mean,
        median: Math.round(median * 100) / 100,
        min,
        max,
        stdDev,
        q1,
        q3,
        iqr,
      };
    }
  });

  // 2. Group Stats
  const groupStats: CategoricalGroupBreakdown[] = [];
  candidateDims.forEach((dim) => {
    numericCols.forEach((measure) => {
      const groupsMap: Record<string, number[]> = {};
      data.forEach((r) => {
        const g = String(r[dim] ?? "Unspecified").trim();
        const v = Number(r[measure]);
        if (!isNaN(v) && isFinite(v)) {
          if (!groupsMap[g]) groupsMap[g] = [];
          groupsMap[g].push(v);
        }
      });

      const groupItems: CategoricalGroupItem[] = Object.keys(groupsMap).map((g) => {
        const arr = groupsMap[g];
        arr.sort((a, b) => a - b);
        const count = arr.length;
        const total = arr.reduce((acc, x) => acc + x, 0);
        const average = count > 0 ? Math.round((total / count) * 100) / 100 : 0;
        const mid = Math.floor(count / 2);
        const median = count % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
        const pct = rowCount > 0 ? Math.round((count / rowCount) * 1000) / 10 : 0;

        return {
          group: g,
          count,
          percentage: pct,
          total: Math.round(total * 100) / 100,
          average,
          median: Math.round(median * 100) / 100,
          min: arr[0] ?? 0,
          max: arr[arr.length - 1] ?? 0,
        };
      });

      groupItems.sort((a, b) => b.total - a.total);

      groupStats.push({
        dimension: dim,
        measure,
        groups: groupItems,
      });
    });
  });

  // 3. Limitations
  const limitations: string[] = [];
  if (rowCount < 50) {
    limitations.push(`Small sample size (${rowCount} records): findings describe this observed sample and should not automatically be generalized to the entire customer population.`);
  }
  limitations.push("Observational dataset: statistical associations and correlations do not establish causal relationships.");
  if (targetIntelligence?.targetType === "ordinal") {
    limitations.push(`Risk categorization (${targetIntelligence.targetColumn}): records are grouped into qualitative risk tiers (${targetIntelligence.distribution.map((d) => d.label).join(", ")}). The dataset contains no predictive probability model to rank or distinguish risk likelihood among individuals in the same tier.`);
  }
  if (dateCols.length === 0) {
    limitations.push("Cross-sectional observation: dataset lacks longitudinal timestamps or historical churn event timestamps.");
  }

  const datasetFingerprint = generateDatasetFingerprint(data, columnNames);

  const analysisContext = buildAnalysisContext(
    data,
    profiledCols,
    archetype,
    datasetFingerprint
  );

  const factPack: VerifiedFactPack = {
    metadata: {
      datasetId: analysisContext.datasetId,
      datasetFingerprint,
      rowCount,
      columnCount: colCount,
      columnNames,
      numericColumns: numericCols,
      categoricalColumns: candidateDims,
      dateColumns: dateCols,
      missingValueCounts,
      dataCompleteness: dataQuality.completenessRate,
      detectedArchetype: archetype,
      targetColumn: targetIntelligence?.targetColumn,
      targetType: targetIntelligence?.targetType,
    },
    tableData: data,
    analysisContext,
    numericStats,
    groupStats,
    targetIntelligence,
    correlations,
    limitations,
  };

  // Run deterministic reconciliation validation against exact normalized rows
  const reconciliation = validateFactPackConsistency(factPack, data);
  factPack.reconciliationResult = reconciliation;

  if (!reconciliation.isValid) {
    console.error("[FACT PACK INTEGRITY FAILURE] Fact pack failed reconciliation against raw normalized rows:", reconciliation.errors);
  }

  return factPack;
}
