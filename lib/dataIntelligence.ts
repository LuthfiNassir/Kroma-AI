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

// Detect temporal metadata and continuity
export function analyzeTemporalColumn(data: Record<string, any>[], dateColName: string): TemporalIntelligence {
  const dateValues: { raw: any; time: number }[] = [];

  data.forEach((row) => {
    const raw = row[dateColName];
    if (raw) {
      const parsed = Date.parse(String(raw));
      if (!isNaN(parsed)) {
        dateValues.push({ raw, time: parsed });
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
  dateValues.sort((a, b) => a.time - b.time);
  const minTime = dateValues[0].time;
  const maxTime = dateValues[dateValues.length - 1].time;

  // Calculate gaps between consecutive observations
  const intervals: number[] = [];
  for (let i = 1; i < dateValues.length; i++) {
    const diffDays = (dateValues[i].time - dateValues[i - 1].time) / (1000 * 60 * 60 * 24);
    if (diffDays > 0) intervals.push(diffDays);
  }

  let freq: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "irregular" = "irregular";
  let isContinuous = false;
  let continuityScore = 0.5;

  if (intervals.length > 0) {
    const avgDiff = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (avgDiff <= 1.5) freq = "daily";
    else if (avgDiff <= 8) freq = "weekly";
    else if (avgDiff <= 35) freq = "monthly";
    else if (avgDiff <= 100) freq = "quarterly";
    else if (avgDiff <= 380) freq = "yearly";

    // Standard deviation of intervals to score continuity
    const varInterval = intervals.reduce((a, b) => a + Math.pow(b - avgDiff, 2), 0) / intervals.length;
    const stdDiff = Math.sqrt(varInterval);
    continuityScore = Math.max(0, Math.min(1, 1 - (stdDiff / Math.max(avgDiff, 1))));
    isContinuous = continuityScore >= 0.5 && dateValues.length >= 6;
  }

  return {
    hasTemporal: true,
    dateColumn: dateColName,
    startDate: new Date(minTime).toISOString().slice(0, 10),
    endDate: new Date(maxTime).toISOString().slice(0, 10),
    observationCount: dateValues.length,
    frequency: freq,
    isContinuous,
    continuityScore: Math.round(continuityScore * 100) / 100,
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
    const isMostlyNumeric = numericValues.length > validValues.length * 0.6;

    // 1. Identifier & Unique Entity Name Check
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

    // 2. Date Check
    const isDateCol =
      colLower.includes("date") ||
      colLower.includes("quarter") ||
      colLower.includes("month") ||
      colLower.includes("year") ||
      colLower.includes("time") ||
      colLower.includes("timestamp") ||
      colLower.includes("day");

    if (isDateCol) {
      return {
        name: col,
        semanticType: "date",
        dataType: "date",
        missingCount,
        missingRate,
        uniqueCount,
        cardinality: uniqueCount > 20 ? "high" : "medium",
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
      colLower.includes("active") ||
      colLower.includes("target") ||
      colLower.includes("default") ||
      colLower.includes("outcome") ||
      colLower.includes("attrition") ||
      colLower.includes("converted") ||
      colLower.includes("status_flag");

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
        colLower.includes("glucose") ||
        colLower.includes("rate") ||
        colLower.includes("rating") ||
        colLower.includes("temp") ||
        colLower.includes("score") ||
        colLower.includes("percent") ||
        colLower.includes("ratio") ||
        colLower.includes("delay") ||
        colLower.includes("tenure") ||
        colLower.includes("pclass") ||
        colLower.includes("fare") ||
        colLower.includes("pressure") ||
        colLower.includes("grade") ||
        colLower.includes("cholesterol");

      const semanticType: SemanticColumnType = isNonAdditiveName ? "non_additive_numeric" : "additive_numeric";

      return {
        name: col,
        semanticType,
        dataType: "number",
        missingCount,
        missingRate,
        uniqueCount,
        cardinality: uniqueCount <= 6 ? "low" : uniqueCount <= 30 ? "medium" : "high",
        numericStats: calculateNumericStats(numericValues),
      };
    }

    // 5. Categorical Dimensions (Strict check: MUST have repeated entries if low cardinality)
    const isLowCard = uniqueCount >= 2 && uniqueCount <= 6 && (rowCount <= 3 || uniqueCount < rowCount);
    const isMedCard = uniqueCount > 6 && uniqueCount <= 25 && uniqueCount < rowCount;

    return {
      name: col,
      semanticType: isLowCard || isMedCard ? "categorical" : "high_cardinality_text",
      dataType: "string",
      missingCount,
      missingRate,
      uniqueCount,
      cardinality: isLowCard ? "low" : isMedCard ? "medium" : "high",
      topValues: calculateTopFrequencies(validValues),
    };
  });
}

// Generate deterministically grounded Dataset Summary Narrative
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
  // Construct plain-English domain description
  const colNames = profiledCols.map((c) => c.name.toLowerCase()).join(" ");
  let domainDescription = "";

  if (colNames.includes("student") || colNames.includes("gpa") || colNames.includes("grade") || colNames.includes("course")) {
    domainDescription = "This dataset contains student records describing individual demographic attributes, academic performance metrics, and department affiliations. Kroma detected a cross-sectional categorical structure rather than a sequential time-series.";
  } else if (colNames.includes("patient") || colNames.includes("stroke") || colNames.includes("bmi") || colNames.includes("glucose")) {
    domainDescription = "This dataset contains clinical health records describing individual patient attributes, biometric markers, and target diagnostic outcomes. Kroma structured this as an outcome-focused cross-sectional profile.";
  } else if (temporal.hasTemporal && measures.length > 0) {
    domainDescription = `This dataset contains transactional time-series observations tracking longitudinal ${measures.join(", ")} metrics over ${temporal.observationCount} ${temporal.frequency} intervals.`;
  } else if (colNames.includes("employee") || colNames.includes("salary") || colNames.includes("department")) {
    domainDescription = "This dataset contains organizational employee records detailing department allocations, compensation distributions, and performance metrics.";
  } else {
    domainDescription = `This dataset contains ${rowCount} records across ${colCount} attributes, structured for cross-sectional cohort evaluation and distribution analysis.`;
  }

  // Format type title
  const typeMap: Record<DatasetArchetype, string> = {
    FINANCIAL: "Financial / Transactional Time-Series",
    QUANTITATIVE_PROGRESS: "Quantitative Progress & Longitudinal Metrics",
    CATEGORICAL_OPERATIONAL: "Operational Process & Pipeline Flow",
    CROSS_SECTIONAL_DISCOVERY: "Cross-Sectional Demographic & Cohort Discovery",
  };

  const datasetType = typeMap[archetype] || "Cross-Sectional Discovery";

  // Temporal summary text
  const temporalInfo = temporal.hasTemporal
    ? `${temporal.observationCount} ${temporal.frequency} observations (${temporal.startDate} to ${temporal.endDate})`
    : "Static Cross-Sectional (No temporal dimension detected)";

  // Available analysis labels
  const analysisAvailable: string[] = [];
  if (capabilities.cohortAnalysis?.available) analysisAvailable.push("Cohort Comparisons");
  if (capabilities.distributionAnalysis?.available) analysisAvailable.push("Distribution & Spread");
  if (capabilities.correlationAnalysis?.available) analysisAvailable.push("Correlation Analysis");
  if (capabilities.timeSeriesForecasting?.available) analysisAvailable.push("Time-Series Forecasting");
  if (capabilities.targetPrediction?.available) analysisAvailable.push("Target Outcome Risk");
  if (capabilities.funnelAnalysis?.available) analysisAvailable.push("Funnel Throughput");

  // Quality Text
  const missingTotal = profiledCols.reduce((acc, c) => acc + c.missingCount, 0);
  const dataQualityText = missingTotal === 0
    ? "100.0% Completeness (0 missing cells detected)"
    : `${missingTotal} missing cells detected across ${colCount} attributes`;

  // Rationale
  let dashboardRationale = "";
  if (temporal.hasTemporal && capabilities.timeSeriesForecasting?.available) {
    dashboardRationale = "Kroma prioritizes longitudinal trend lines, category volume contributions, and linear continuation forecasting because sufficient continuous temporal history is present.";
  } else if (targets.length > 0) {
    dashboardRationale = `Kroma emphasizes cohort cross-tabulations and risk rate distributions against target outcome [${targets.join(", ")}] to isolate key variance factors.`;
  } else if (dimensions.length > 0 && measures.length > 0) {
    dashboardRationale = "Kroma emphasizes categorical distributions, cohort mean yields, and numeric variance spreads because the dataset lacks sequential temporal continuity for time-series forecasting.";
  } else {
    dashboardRationale = "Kroma presents categorical population distributions and complete attribute matrix breakdowns.";
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
    analysisAvailable: analysisAvailable.length > 0 ? analysisAvailable : ["Categorical Comparison", "Distribution Breakdown"],
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

  const dimensions = profiledCols
    .filter((c) => c.semanticType === "categorical" || (c.semanticType === "date" && c.cardinality === "low"))
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
    colStr.includes("unit");

  // Strict workflow terms ONLY (excludes department)
  const hasWorkflowTerms =
    colStr.includes("funnel_stage") ||
    colStr.includes("pipeline_stage") ||
    colStr.includes("deal_stage") ||
    (colStr.includes("stage") && colStr.includes("status") && !colStr.includes("student") && !colStr.includes("employee"));

  if (temporal.hasTemporal) secondarySignals.push("Temporal Time-Series");
  if (hasFinancialTerms) secondarySignals.push("Financial Value Metrics");
  if (hasWorkflowTerms) secondarySignals.push("Operational Workflow / Funnel");
  if (targets.length > 0) secondarySignals.push("Target Outcome Flag");
  if (dimensions.length > 1) secondarySignals.push("Multi-Segment Categorical");

  if (temporal.hasTemporal && measures.length > 0 && hasFinancialTerms) {
    primaryArchetype = "FINANCIAL";
    confidence = 0.95;
  } else if ((temporal.hasTemporal || colStr.includes("week") || colStr.includes("day")) && hasProgressTerms) {
    primaryArchetype = "QUANTITATIVE_PROGRESS";
    confidence = 0.9;
  } else if (hasWorkflowTerms) {
    primaryArchetype = "CATEGORICAL_OPERATIONAL";
    confidence = 0.88;
  } else {
    primaryArchetype = "CROSS_SECTIONAL_DISCOVERY";
    confidence = 0.85;
  }

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
  };
}
