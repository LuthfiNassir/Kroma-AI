import {
  AnalyticalCapabilities,
  ColumnIntelligence,
  DetectedRelationship,
  TemporalIntelligence,
} from "./types";

interface CapabilityInput {
  columns: ColumnIntelligence[];
  temporal: TemporalIntelligence;
  measures: string[];
  dimensions: string[];
  targets: string[];
  relationships: DetectedRelationship[];
  rowCount: number;
}

export function detectAnalyticalCapabilities(input: CapabilityInput): AnalyticalCapabilities {
  const { columns, temporal, measures, dimensions, targets, relationships, rowCount } = input;

  // 1. Time-Series Forecasting (Strictly Conditional on Real Time History)
  const canForecast =
    temporal.hasTemporal &&
    temporal.observationCount >= 6 &&
    measures.length > 0;

  const forecastReason = !temporal.hasTemporal
    ? "This dataset does not contain a time dimension, so a time-based forecast is not appropriate."
    : temporal.observationCount < 6
    ? `This dataset does not contain enough consistent history to produce a dependable forecast (${temporal.observationCount} periods; at least 6 required).`
    : measures.length === 0
    ? "No numeric measures available to project."
    : !temporal.isContinuous || temporal.isRegular === false
    ? `6-period directional projection enabled (exploratory; note irregular intervals across ${temporal.observationCount} observations).`
    : `6-month deterministic projection supported across ${temporal.observationCount} ${temporal.frequency} periods.`;

  // 2. Trend Analysis
  const canTrend = temporal.hasTemporal && temporal.observationCount >= 3 && measures.length > 0;
  const trendReason = canTrend
    ? `Sequential tracking supported across ${temporal.observationCount} periods.`
    : "Requires a time dimension paired with numeric measures.";

  // 3. Target Outcome Prediction
  const canPredict = targets.length > 0 && (measures.length > 0 || dimensions.length > 0);
  const predictReason = canPredict
    ? `Target outcome [${targets.join(", ")}] identified with supporting attributes.`
    : "No binary target or discrete outcome variable detected in schema.";

  // 4. Numeric Correlation / Relationship Analysis
  const canCorrelate = measures.length >= 2 && rowCount >= 5;
  const corrReason = canCorrelate
    ? `Relationship analysis enabled across ${measures.length} numeric measures.`
    : "Requires at least 2 distinct numeric measures with enough records to compare.";

  // 5. Cohort Analysis & Segmentation (STRICT: Dimensions MUST Exist)
  const canCohort = dimensions.length >= 1 && (measures.length >= 1 || targets.length >= 1);
  const cohortReason = canCohort
    ? `Group comparisons enabled across ${dimensions.length} categories.`
    : "No categorical groupings exist in this dataset.";

  // 6. Funnel / Operational Process Flow
  const workflowCols = columns.filter((c) => {
    const n = c.name.toLowerCase();
    return n.includes("stage") || n.includes("status") || n.includes("step") || n.includes("phase");
  });
  const canFunnel = workflowCols.length >= 1 && (dimensions.length >= 1 || measures.length >= 1);
  const funnelReason = canFunnel
    ? `Process progression detected via [${workflowCols.map((c) => c.name).join(", ")}].`
    : "No multi-stage workflow or status attributes found.";

  // 7. Segmentation Analysis
  const canSegment = dimensions.length >= 1;
  const segmentReason = canSegment
    ? `${dimensions.length} categories available for comparison.`
    : "No categorical grouping columns exist in this dataset.";

  // 8. Distribution & Spread Analysis
  const canDistribute = measures.length >= 1 && rowCount >= 8;
  const distReason = canDistribute
    ? `Number spread calculable across ${measures.length} measures.`
    : "Requires numeric attributes with at least 8 records.";

  // 9. Anomaly & Outlier Detection
  const canOutlier = measures.length >= 1 && rowCount >= 10;
  const outlierReason = canOutlier
    ? `Pattern tracking and sudden shift detection active.`
    : "Requires at least 10 records for reliable pattern detection.";

  return {
    timeSeriesForecasting: {
      available: canForecast,
      reason: forecastReason,
      relevantColumns: temporal.dateColumn && measures[0] ? [temporal.dateColumn, measures[0]] : [],
    },
    trendAnalysis: {
      available: canTrend,
      reason: trendReason,
      relevantColumns: temporal.dateColumn && measures[0] ? [temporal.dateColumn, measures[0]] : [],
    },
    targetPrediction: {
      available: canPredict,
      reason: predictReason,
      relevantColumns: [...targets, ...measures.slice(0, 2), ...dimensions.slice(0, 2)],
    },
    correlationAnalysis: {
      available: canCorrelate,
      reason: corrReason,
      relevantColumns: measures.slice(0, 4),
    },
    cohortAnalysis: {
      available: canCohort,
      reason: cohortReason,
      relevantColumns: [...dimensions.slice(0, 2), ...measures.slice(0, 2)],
    },
    funnelAnalysis: {
      available: canFunnel,
      reason: funnelReason,
      relevantColumns: workflowCols.map((c) => c.name),
    },
    segmentationAnalysis: {
      available: canSegment,
      reason: segmentReason,
      relevantColumns: dimensions.slice(0, 3),
    },
    distributionAnalysis: {
      available: canDistribute,
      reason: distReason,
      relevantColumns: measures.slice(0, 3),
    },
    outlierAnalysis: {
      available: canOutlier,
      reason: outlierReason,
      relevantColumns: measures.slice(0, 3),
    },
  };
}
