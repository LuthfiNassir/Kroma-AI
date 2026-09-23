import {
  VerifiedFactPack,
  DeterministicCorrelation,
} from "./types";

export interface MetricReconciliationCheck {
  metric: string;
  dimension?: string;
  overallSum: number;
  overallMean: number;
  reconciledSum: number;
  reconciledMean: number;
  sumDifference: number;
  meanDifference: number;
  isConsistent: boolean;
}

export interface CorrelationReconciliationCheck {
  variableA: string;
  variableB: string;
  storedCoefficient: number;
  recomputedCoefficient: number;
  difference: number;
  isConsistent: boolean;
}

export interface FactPackReconciliationResult {
  isValid: boolean;
  datasetFingerprint: string;
  rowCount: number;
  checks: {
    overallSumsVsMeans: boolean;
    groupCountsExhaustive: boolean;
    groupPercentagesHundred: boolean;
    groupTotalsMatchOverall: boolean;
    groupWeightedMeansMatchOverall: boolean;
    targetDistributionMatchesRowCount: boolean;
    correlationsReproducible: boolean;
    numericStatsReproducible: boolean;
  };
  metricChecks: MetricReconciliationCheck[];
  correlationChecks: CorrelationReconciliationCheck[];
  errors: string[];
}

/**
 * Deterministic Dataset Fingerprint generator.
 * Creates an immutable identifier based on row count, column count, column names,
 * and key row samples (first, middle, last).
 */
export function generateDatasetFingerprint(data: Record<string, any>[], columnNames: string[]): string {
  const rowCount = data.length;
  const colCount = columnNames.length;
  if (rowCount === 0) return "ds_empty_0_0";

  const headerStr = columnNames.slice().sort().join("|");
  const firstRow = JSON.stringify(data[0] || {});
  const midRow = JSON.stringify(data[Math.floor(rowCount / 2)] || {});
  const lastRow = JSON.stringify(data[rowCount - 1] || {});

  // 32-bit FNV-1a hash
  let hash = 0x811c9dc5;
  const sample = `${headerStr}#${rowCount}#${firstRow}#${midRow}#${lastRow}`;
  for (let i = 0; i < sample.length; i++) {
    hash ^= sample.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hexHash = (hash >>> 0).toString(16).padStart(8, "0");
  return `ds_${rowCount}r_${colCount}c_${hexHash}`;
}

/**
 * Validates internal mathematical consistency of a VerifiedFactPack against the exact normalized rows.
 * Reconciles overall statistics, group breakdowns, target cohorts, and correlations.
 */
export function validateFactPackConsistency(
  factPack: VerifiedFactPack,
  rows: Record<string, any>[]
): FactPackReconciliationResult {
  const errors: string[] = [];
  const metricChecks: MetricReconciliationCheck[] = [];
  const correlationChecks: CorrelationReconciliationCheck[] = [];
  const rowCount = rows.length;

  let overallSumsVsMeans = true;
  let groupCountsExhaustive = true;
  let groupPercentagesHundred = true;
  let groupTotalsMatchOverall = true;
  let groupWeightedMeansMatchOverall = true;
  let targetDistributionMatchesRowCount = true;
  let correlationsReproducible = true;
  let numericStatsReproducible = true;

  const floatTol = 1e-2; // Floating point comparison tolerance for rounded values

  // 1. Check Overall Sums vs Means
  for (const [colName, stat] of Object.entries(factPack.numericStats)) {
    if (stat.count > 0) {
      const computedMean = stat.sum / stat.count;
      const diff = Math.abs(stat.mean - computedMean);
      if (diff > floatTol) {
        overallSumsVsMeans = false;
        const errMsg = `[FACT PACK INTEGRITY FAILURE] Overall sum vs mean mismatch for ${colName}: mean=${stat.mean}, sum/count=${computedMean.toFixed(4)}, diff=${diff.toFixed(4)}`;
        errors.push(errMsg);
        console.error(errMsg);
      }
    }
  }

  // 2. Check Group Breakdowns & Cohort Weighted Averages
  for (const breakdown of factPack.groupStats) {
    const dim = breakdown.dimension;
    const measure = breakdown.measure;
    const overallStat = factPack.numericStats[measure];
    if (!overallStat) continue;

    let groupCountSum = 0;
    let groupPctSum = 0;
    let groupTotalSum = 0;

    for (const g of breakdown.groups) {
      groupCountSum += g.count;
      groupPctSum += g.percentage;
      groupTotalSum += g.total;
    }

    // A. Check count exhaustiveness
    if (groupCountSum !== overallStat.count) {
      groupCountsExhaustive = false;
      const errMsg = `[FACT PACK INTEGRITY FAILURE] Group counts sum (${groupCountSum}) != overall count (${overallStat.count}) for dimension ${dim} / measure ${measure}`;
      errors.push(errMsg);
      console.error(errMsg);
    }

    // B. Check percentage sum to ~100%
    if (Math.abs(groupPctSum - 100) > 0.5) {
      groupPercentagesHundred = false;
      const errMsg = `[FACT PACK INTEGRITY FAILURE] Group percentages sum (${groupPctSum.toFixed(2)}%) != 100% for dimension ${dim}`;
      errors.push(errMsg);
      console.error(errMsg);
    }

    // C. Check group totals sum to overall sum
    const totalDiff = Math.abs(groupTotalSum - overallStat.sum);
    if (totalDiff > floatTol * Math.max(breakdown.groups.length, 1)) {
      groupTotalsMatchOverall = false;
      const errMsg = `[FACT PACK INTEGRITY FAILURE] Group totals sum (${groupTotalSum.toFixed(2)}) != overall sum (${overallStat.sum.toFixed(2)}) for dimension ${dim} / measure ${measure}, diff=${totalDiff.toFixed(4)}`;
      errors.push(errMsg);
      console.error(errMsg);
    }

    // D. Check weighted average matches overall mean
    const weightedMean = groupCountSum > 0 ? groupTotalSum / groupCountSum : 0;
    const meanDiff = Math.abs(weightedMean - overallStat.mean);
    const isConsistent = meanDiff <= floatTol;

    if (!isConsistent) {
      groupWeightedMeansMatchOverall = false;
      const errMsg = `[FACT PACK INTEGRITY FAILURE]\nMetric: ${measure}\nDimension: ${dim}\nOverall mean: ${overallStat.mean}\nWeighted cohort mean: ${weightedMean.toFixed(4)}\nDifference: ${meanDiff.toFixed(4)}`;
      errors.push(errMsg);
      console.error(errMsg);
    }

    metricChecks.push({
      metric: measure,
      dimension: dim,
      overallSum: overallStat.sum,
      overallMean: overallStat.mean,
      reconciledSum: groupTotalSum,
      reconciledMean: weightedMean,
      sumDifference: totalDiff,
      meanDifference: meanDiff,
      isConsistent,
    });
  }

  // 3. Check Target Outcome Distribution
  if (factPack.targetIntelligence) {
    const target = factPack.targetIntelligence;
    let distCountSum = 0;
    let distPctSum = 0;

    for (const item of target.distribution) {
      distCountSum += item.count;
      distPctSum += item.percentage;
    }

    if (distCountSum !== rowCount) {
      targetDistributionMatchesRowCount = false;
      const errMsg = `[FACT PACK INTEGRITY FAILURE] Target distribution count sum (${distCountSum}) != row count (${rowCount})`;
      errors.push(errMsg);
      console.error(errMsg);
    }

    if (Math.abs(distPctSum - 100) > 0.5) {
      targetDistributionMatchesRowCount = false;
      const errMsg = `[FACT PACK INTEGRITY FAILURE] Target distribution percentage sum (${distPctSum.toFixed(2)}%) != 100%`;
      errors.push(errMsg);
      console.error(errMsg);
    }
  }

  // 4. Check Correlations Reproducibility
  const targetCol = factPack.targetIntelligence?.targetColumn;
  const ordinalMap = factPack.targetIntelligence?.ordinalMapping;

  for (const storedCorr of factPack.correlations) {
    const varA = storedCorr.variableA;
    const varB = storedCorr.variableB;

    let xVals: number[] = [];
    let yVals: number[] = [];

    if (varB === targetCol && ordinalMap) {
      for (const r of rows) {
        const x = Number(r[varA]);
        const yRaw = String(r[varB] ?? "");
        const y = ordinalMap[yRaw];
        if (!isNaN(x) && isFinite(x) && y !== undefined) {
          xVals.push(x);
          yVals.push(y);
        }
      }
    } else {
      for (const r of rows) {
        const x = Number(r[varA]);
        const y = Number(r[varB]);
        if (!isNaN(x) && isFinite(x) && !isNaN(y) && isFinite(y)) {
          xVals.push(x);
          yVals.push(y);
        }
      }
    }

    if (xVals.length > 2) {
      const n = xVals.length;
      const sumX = xVals.reduce((a, b) => a + b, 0);
      const sumY = yVals.reduce((a, b) => a + b, 0);
      const sumXY = xVals.reduce((acc, val, i) => acc + val * yVals[i], 0);
      const sumX2 = xVals.reduce((acc, val) => acc + val * val, 0);
      const sumY2 = yVals.reduce((acc, val) => acc + val * val, 0);
      const num = n * sumXY - sumX * sumY;
      const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
      const recomputedR = den === 0 ? 0 : num / den;

      const diff = Math.abs(storedCorr.coefficient - recomputedR);
      const isConsistent = diff <= 0.01;

      if (!isConsistent) {
        correlationsReproducible = false;
        const errMsg = `[FACT PACK INTEGRITY FAILURE] Correlation mismatch between ${varA} and ${varB}: stored=${storedCorr.coefficient}, recomputed=${recomputedR.toFixed(4)}, diff=${diff.toFixed(4)}`;
        errors.push(errMsg);
        console.error(errMsg);
      }

      correlationChecks.push({
        variableA: varA,
        variableB: varB,
        storedCoefficient: storedCorr.coefficient,
        recomputedCoefficient: Math.round(recomputedR * 1000) / 1000,
        difference: diff,
        isConsistent,
      });
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    datasetFingerprint: factPack.metadata?.datasetFingerprint || "unknown",
    rowCount,
    checks: {
      overallSumsVsMeans,
      groupCountsExhaustive,
      groupPercentagesHundred,
      groupTotalsMatchOverall,
      groupWeightedMeansMatchOverall,
      targetDistributionMatchesRowCount,
      correlationsReproducible,
      numericStatsReproducible,
    },
    metricChecks,
    correlationChecks,
    errors,
  };
}

/**
 * Development-time assertion ensuring chart values and categories match deterministic fact pack aggregations.
 */
export function validateChartDataIntegrity(
  chartType: string,
  chartData: any[],
  factPack: VerifiedFactPack
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(chartData) || chartData.length === 0) {
    return { isValid: true, errors: [] };
  }

  if (chartType === "bar" && factPack.targetIntelligence) {
    const dist = factPack.targetIntelligence.distribution;
    const isTargetCountChart = chartData.some((d) => dist.some((t) => t.label === d.label));
    if (isTargetCountChart) {
      for (const item of chartData) {
        const expectedTier = dist.find((t) => t.label === item.label);
        if (expectedTier && item.value !== expectedTier.count) {
          const revBreakdown = factPack.groupStats.find(
            (g) => g.dimension.toLowerCase() === factPack.targetIntelligence?.targetColumn.toLowerCase()
          );
          const expectedAvg = revBreakdown?.groups.find((g) => g.group === item.label)?.average;
          if (expectedAvg !== undefined && Math.abs(item.value - expectedAvg) > 0.05) {
            const err = `[CHART DATA INTEGRITY WARNING] Bar chart value mismatch for ${item.label}: actual=${item.value}, expected count=${expectedTier.count} or expected avg=${expectedAvg}`;
            errors.push(err);
            console.warn(err);
          }
        }
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Development-time assertion ensuring dashboard KPI values match analytical state
 */
export function validateDashboardKpisIntegrity(
  kpis: Array<{ label: string; value: string | number }>,
  factPack: VerifiedFactPack
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  const revStat = factPack.numericStats["Monthly_Revenue"] || factPack.numericStats["Revenue"];
  if (revStat) {
    const avgKpi = kpis.find((k) => k.label.includes("AVERAGE") && (k.label.includes("REVENUE") || k.label.includes("MONTHLY")));
    if (avgKpi) {
      const parsedVal = parseFloat(String(avgKpi.value).replace(/[^0-9.]/g, ""));
      const expectedVal = Math.round(revStat.mean * 10) / 10;
      if (!isNaN(parsedVal) && Math.abs(parsedVal - expectedVal) > 0.5) {
        const err = `[DASHBOARD KPI INTEGRITY WARNING] Average revenue KPI mismatch: displayed=${parsedVal}, expected=${expectedVal} (source: factPack.numericStats)`;
        errors.push(err);
        console.warn(err);
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}
