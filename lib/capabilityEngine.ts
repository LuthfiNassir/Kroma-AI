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

  // 1. Time-Series Forecasting (Strictly Conditional)
  const canForecast =
    temporal.hasTemporal &&
    temporal.observationCount >= 6 &&
    temporal.isContinuous &&
    measures.length > 0;

  const forecastReason = !temporal.hasTemporal
    ? "No temporal dimension detected in dataset."
    : temporal.observationCount < 6
    ? `Insufficient historical observations (${temporal.observationCount} records; minimum 6 required).`
    : !temporal.isContinuous
    ? `Temporal continuity gaps detected (${temporal.frequency} intervals with irregular timestamps).`
    : measures.length === 0
    ? "No continuous numeric measures available to project."
    : `${temporal.observationCount} ${temporal.frequency} observations detected with high temporal continuity (${(temporal.continuityScore * 100).toFixed(0)}%).`;

  // 2. Trend Analysis
  const canTrend = temporal.hasTemporal && temporal.observationCount >= 3 && measures.length > 0;
  const trendReason = canTrend
    ? `Sequential tracking supported across ${temporal.observationCount} temporal points.`
    : "Requires a temporal dimension paired with numeric measures.";

  // 3. Target Outcome Prediction
  const canPredict = targets.length > 0 && (measures.length > 0 || dimensions.length > 0);
  const predictReason = canPredict
    ? `Target outcome flag [${targets.join(", ")}] identified with ${measures.length + dimensions.length} explanatory feature attributes.`
    : "No binary target or discrete outcome variable detected in schema.";

  // 4. Numeric Correlation Analysis
  const canCorrelate = measures.length >= 2 && rowCount >= 5;
  const corrReason = canCorrelate
    ? `Multi-measure correlation engine enabled across ${measures.length} continuous metrics.`
    : "Requires at least 2 distinct continuous numeric metrics with sufficient variance.";

  // 5. Cohort Analysis & Segmentation
  const canCohort = dimensions.length >= 1 && (measures.length >= 1 || targets.length >= 1);
  const cohortReason = canCohort
    ? `Comparative cohort grouping enabled across ${dimensions.length} discrete categorical dimensions.`
    : "Requires at least one low-to-medium cardinality categorical dimension.";

  // 6. Funnel / Operational Process Flow
  const workflowCols = columns.filter((c) => {
    const n = c.name.toLowerCase();
    return n.includes("stage") || n.includes("status") || n.includes("step") || n.includes("phase") || n.includes("state");
  });
  const canFunnel = workflowCols.length >= 1 && (dimensions.length >= 1 || measures.length >= 1);
  const funnelReason = canFunnel
    ? `Operational pipeline progression detected via [${workflowCols.map((c) => c.name).join(", ")}].`
    : "No multi-stage operational lifecycle or status workflow attributes found.";

  // 7. Segmentation Analysis
  const canSegment = dimensions.length >= 1;
  const segmentReason = canSegment
    ? `${dimensions.length} categorical dimensions available for population stratification.`
    : "No distinct categorical segmentation dimensions found.";

  // 8. Distribution & Quartile Analysis
  const canDistribute = measures.length >= 1 && rowCount >= 10;
  const distReason = canDistribute
    ? `Statistical spread and quartile distributions calculable across ${measures.length} continuous metrics.`
    : "Requires continuous numeric attributes with at least 10 records.";

  // 9. Anomaly & Outlier Detection
  const canOutlier = measures.length >= 1 && rowCount >= 15;
  const outlierReason = canOutlier
    ? `Interquartile range (IQR) and standard deviation thresholding active for outlier isolation.`
    : "Requires at least 15 numeric records for reliable statistical thresholding.";

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
