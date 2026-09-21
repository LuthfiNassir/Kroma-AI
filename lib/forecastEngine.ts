import { ForecastPoint, ForecastResult, ForecastSuitability, GrowthIntelligence, PeriodChange, TemporalIntelligence } from "./types";
import { parseDatePeriod, generateFuturePeriods, NormalizedPeriod } from "./temporalUtils";

export function calculateGrowthIntelligence(
  data: Record<string, any>[],
  dateCol: string,
  metric: string
): GrowthIntelligence | null {
  const points: { period: string; sortKey: number; value: number }[] = [];

  data.forEach((row) => {
    const rawPeriod = row[dateCol];
    const parsed = parseDatePeriod(rawPeriod);
    const val = Number(row[metric]);
    if (parsed && !isNaN(val) && isFinite(val)) {
      points.push({
        period: parsed.displayLabel,
        sortKey: parsed.sortKey,
        value: val,
      });
    }
  });

  if (points.length < 2) return null;

  // Sort chronologically
  points.sort((a, b) => a.sortKey - b.sortKey);

  const startValue = points[0].value;
  const endValue = points[points.length - 1].value;
  const totalChange = Math.round((endValue - startValue) * 100) / 100;
  const totalGrowthPct = startValue !== 0
    ? Math.round(((endValue - startValue) / Math.abs(startValue)) * 1000) / 10
    : 0;

  const periodChanges: PeriodChange[] = [];
  let largestIncrease: PeriodChange | null = null;
  let largestDecline: PeriodChange | null = null;
  let sumPctChanges = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const chg = Math.round((curr.value - prev.value) * 100) / 100;
    const pct = prev.value !== 0
      ? Math.round(((curr.value - prev.value) / Math.abs(prev.value)) * 1000) / 10
      : 0;

    const item: PeriodChange = {
      period: curr.period,
      previousPeriod: prev.period,
      previousValue: prev.value,
      currentValue: curr.value,
      change: chg,
      pctChange: pct,
    };

    periodChanges.push(item);
    sumPctChanges += pct;

    if (!largestIncrease || chg > largestIncrease.change) {
      largestIncrease = item;
    }
    if (!largestDecline || chg < largestDecline.change) {
      largestDecline = item;
    }
  }

  const averagePeriodicGrowthPct = periodChanges.length > 0
    ? Math.round((sumPctChanges / periodChanges.length) * 10) / 10
    : 0;

  const recentChanges = periodChanges.slice(-3);
  const recentNet = recentChanges.reduce((acc, c) => acc + c.change, 0);
  const recentDirection = recentNet > 0 ? "increasing" : recentNet < 0 ? "decreasing" : "flat";

  const values = points.map((p) => p.value);
  const n = values.length;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const sumValue = values.reduce((a, b) => a + b, 0);
  const meanValue = Math.round((sumValue / n) * 100) / 100;
  const sortedValues = [...values].sort((a, b) => a - b);
  const medianValue = sortedValues[Math.floor(n / 2)];

  // Linear Regression for Trend Slope
  let sumT = 0;
  let sumY = 0;
  let sumTY = 0;
  let sumTT = 0;
  for (let i = 0; i < n; i++) {
    const t = i + 1;
    const y = values[i];
    sumT += t;
    sumY += y;
    sumTY += t * y;
    sumTT += t * t;
  }
  const meanT = sumT / n;
  const trendSlope = Math.round(((sumTY - n * meanT * meanValue) / (sumTT - n * meanT * meanT)) * 100) / 100;

  // Volatility & Reversals Analysis
  const variance = values.reduce((acc, v) => acc + Math.pow(v - meanValue, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const cv = meanValue !== 0 ? stdDev / Math.abs(meanValue) : 0;

  let directionReversals = 0;
  for (let i = 2; i < points.length; i++) {
    const prevDelta = points[i - 1].value - points[i - 2].value;
    const currDelta = points[i].value - points[i - 1].value;
    if ((prevDelta > 0 && currDelta < 0) || (prevDelta < 0 && currDelta > 0)) {
      directionReversals++;
    }
  }
  const reversalRate = points.length > 2 ? directionReversals / (points.length - 2) : 0;

  let volatility: "low" | "moderate" | "high" = "low";
  if (cv > 0.4 || reversalRate > 0.35) {
    volatility = "high";
  } else if (cv > 0.2 || reversalRate > 0.2) {
    volatility = "moderate";
  }

  const isSustained = volatility === "low" && ((totalGrowthPct > 15 && trendSlope > 0) || (totalGrowthPct < -15 && trendSlope < 0));

  let trendDirection: "increasing" | "decreasing" | "flat" | "fluctuating" = "flat";
  if (volatility === "high") {
    trendDirection = "fluctuating";
  } else if (trendSlope > 0.05 * (meanValue / n)) {
    trendDirection = "increasing";
  } else if (trendSlope < -0.05 * (meanValue / n)) {
    trendDirection = "decreasing";
  }

  // Narrative separating endpoint change from actual trend
  const metricDisplay = metric.replace(/_/g, " ");
  let narrativeSummary = "";
  if (volatility === "high" || !isSustained) {
    narrativeSummary = `${metricDisplay} is ${totalGrowthPct >= 0 ? "+" : ""}${totalGrowthPct}% ${totalGrowthPct >= 0 ? "higher" : "lower"} at the latest observation (${endValue}) than at the first observation (${startValue}), although the series fluctuates considerably throughout the period.`;
  } else {
    narrativeSummary = `${metricDisplay} shows sustained ${trendDirection} momentum, moving from ${startValue} to ${endValue} (${totalGrowthPct >= 0 ? "+" : ""}${totalGrowthPct}% endpoint change).`;
  }

  return {
    targetMetric: metric,
    startPeriod: points[0].period,
    endPeriod: points[points.length - 1].period,
    startValue,
    endValue,
    totalChange,
    totalGrowthPct,
    averagePeriodicGrowthPct,
    periodChanges,
    largestIncrease,
    largestDecline,
    recentDirection,
    firstValue: startValue,
    latestValue: endValue,
    endpointChangePercent: totalGrowthPct,
    minValue,
    maxValue,
    meanValue,
    medianValue,
    trendDirection,
    trendSlope,
    volatility,
    volatilityScore: Math.round(cv * 100) / 100,
    isSustained,
    narrativeSummary,
  };
}

export function calculateForecastSuitability(
  temporal?: TemporalIntelligence,
  pointsCount: number = 0,
  missingnessRate: number = 0
): ForecastSuitability {
  const isTemporal = temporal?.hasTemporal ?? false;
  const freq = temporal?.frequency || "irregular";
  const isRegular = Boolean(temporal?.isRegular);
  const spanDays = temporal?.spanDays || 0;
  const reasons: string[] = [];

  if (!isTemporal) {
    return {
      isSuitable: false,
      confidenceTier: "unsuitable",
      displayTitle: "Forecast Unavailable",
      frequency: "irregular",
      isRegular: false,
      observationCount: pointsCount,
      uniquePeriodsCount: pointsCount,
      spanDays: 0,
      missingnessRate,
      duplicateTimestampsCount: 0,
      reasons: ["No valid temporal dimension detected in dataset."],
      limitations: "Dataset does not contain chronological attributes required for forward projection.",
    };
  }

  if (pointsCount < 6) {
    return {
      isSuitable: false,
      confidenceTier: "unsuitable",
      displayTitle: "Insufficient History",
      frequency: freq,
      isRegular,
      observationCount: pointsCount,
      uniquePeriodsCount: pointsCount,
      spanDays,
      missingnessRate,
      duplicateTimestampsCount: 0,
      reasons: [`Minimum 6 observations required for statistical projection (found ${pointsCount}).`],
      limitations: "History depth is insufficient to establish dependable statistical trajectory.",
    };
  }

  if (freq === "irregular" || !isRegular) {
    return {
      isSuitable: true,
      confidenceTier: "exploratory",
      displayTitle: "6-Period Directional Projection",
      frequency: "irregular",
      isRegular: false,
      observationCount: pointsCount,
      uniquePeriodsCount: pointsCount,
      spanDays,
      missingnessRate,
      duplicateTimestampsCount: temporal?.duplicateTimestampsCount || 0,
      reasons: [
        `Contains ${pointsCount} dated observations across irregular intervals spanning ${temporal?.startLabel || ""} to ${temporal?.endLabel || ""}.`,
        "Temporal spacing is irregular; trajectory represents directional extrapolation rather than calendar-month forecast.",
      ],
      limitations: "Observations occur at irregular intervals. Projected values represent directional trend velocity rather than a fixed calendar schedule.",
    };
  }

  // Regular series
  if (pointsCount >= 12 && missingnessRate < 5) {
    return {
      isSuitable: true,
      confidenceTier: "high",
      displayTitle: freq === "monthly" ? "6-Month Forecast" : "6-Period Forecast",
      frequency: freq,
      isRegular: true,
      observationCount: pointsCount,
      uniquePeriodsCount: pointsCount,
      spanDays,
      missingnessRate,
      duplicateTimestampsCount: 0,
      reasons: [`Regular ${freq} series with robust historical depth (${pointsCount} periods).`],
      limitations: "Assumes continuation of historical velocity without major external structural shocks.",
    };
  }

  return {
    isSuitable: true,
    confidenceTier: "moderate",
    displayTitle: freq === "monthly" ? "6-Month Forecast" : "6-Period Directional Projection",
    frequency: freq,
    isRegular: true,
    observationCount: pointsCount,
    uniquePeriodsCount: pointsCount,
    spanDays,
    missingnessRate,
    duplicateTimestampsCount: 0,
    reasons: [`Regular ${freq} observations with moderate sample size (${pointsCount} periods).`],
    limitations: "Projection confidence calibrated to available historical sample size.",
  };
}

export function calculateDeterministicForecast(
  data: Record<string, any>[],
  dateCol: string,
  targetMetric: string,
  horizon: number = 6,
  temporalContext?: TemporalIntelligence
): ForecastResult | null {
  const points: { raw: string; period: NormalizedPeriod; value: number }[] = [];

  data.forEach((row) => {
    const rawPeriod = row[dateCol];
    const parsed = parseDatePeriod(rawPeriod);
    const val = Number(row[targetMetric]);
    if (parsed && !isNaN(val) && isFinite(val)) {
      points.push({
        raw: String(rawPeriod),
        period: parsed,
        value: val,
      });
    }
  });

  if (points.length < 6) {
    return null; // Insufficient history for dependable statistical forecast
  }

  // Chronological sort
  points.sort((a, b) => a.period.sortKey - b.period.sortKey);

  const n = points.length;
  const values = points.map((p) => p.value);

  // Evaluate suitability
  const suitability = calculateForecastSuitability(temporalContext, n);
  const isExploratory = suitability.confidenceTier === "exploratory";

  // Ordinary Least Squares (OLS) Linear Regression: y = a + b * t
  let sumT = 0;
  let sumY = 0;
  let sumTY = 0;
  let sumTT = 0;

  for (let i = 0; i < n; i++) {
    const t = i + 1;
    const y = values[i];
    sumT += t;
    sumY += y;
    sumTY += t * y;
    sumTT += t * t;
  }

  const meanT = sumT / n;
  const meanY = sumY / n;
  const slope = (sumTY - n * meanT * meanY) / (sumTT - n * meanT * meanT);
  const intercept = meanY - slope * meanT;

  // Calculate Standard Error of the Estimate
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const t = i + 1;
    const yHat = intercept + slope * t;
    sse += Math.pow(values[i] - yHat, 2);
  }
  const stdError = Math.sqrt(sse / Math.max(n - 2, 1));
  const ssT = sumTT - n * meanT * meanT;

  const lastPeriodObj = points[points.length - 1].period;
  const futurePeriods = generateFuturePeriods(lastPeriodObj, horizon, suitability.frequency);

  const forecastSeries: ForecastPoint[] = [];

  for (let h = 1; h <= horizon; h++) {
    const tFuture = n + h;
    const yProj = intercept + slope * tFuture;

    // 95% Confidence Interval Half-Width
    const margin = 1.96 * stdError * Math.sqrt(1 + 1 / n + Math.pow(tFuture - meanT, 2) / Math.max(ssT, 1));

    forecastSeries.push({
      period: futurePeriods[h - 1].raw,
      displayLabel: futurePeriods[h - 1].displayLabel,
      forecastValue: Math.round(Math.max(yProj, 0) * 10) / 10,
      lowerBound: Math.round(Math.max(yProj - margin, 0) * 10) / 10,
      upperBound: Math.round(Math.max(yProj + margin, 0) * 10) / 10,
    });
  }

  const baseline = values[values.length - 1];
  const finalForecast = forecastSeries[forecastSeries.length - 1].forecastValue;
  const projectedGrowthPct = baseline > 0
    ? Math.round(((finalForecast - baseline) / baseline) * 1000) / 10
    : 0;

  const trendDirection: "increasing" | "decreasing" | "flat" =
    slope > 0.05 * (baseline / n) ? "increasing" : slope < -0.05 * (baseline / n) ? "decreasing" : "flat";

  const isCurrency =
    targetMetric.toLowerCase().includes("revenue") ||
    targetMetric.toLowerCase().includes("sales") ||
    targetMetric.toLowerCase().includes("spend") ||
    targetMetric.toLowerCase().includes("cost") ||
    targetMetric.toLowerCase().includes("price") ||
    targetMetric.toLowerCase().includes("amount") ||
    targetMetric.toLowerCase().includes("profit");

  const formattedFinal = isCurrency ? `$${Math.round(finalForecast).toLocaleString()}` : Math.round(finalForecast).toLocaleString();
  const formattedBaseline = isCurrency ? `$${Math.round(baseline).toLocaleString()}` : Math.round(baseline).toLocaleString();
  const metricClean = targetMetric.replace(/_/g, " ");

  let explanation = "";
  if (isExploratory) {
    explanation = trendDirection === "increasing"
      ? `Based on historical trajectory across ${n} dated observations, Kroma estimates a directional upward trajectory over the next 6 periods toward approximately ${formattedFinal} (a ${projectedGrowthPct >= 0 ? "+" : ""}${projectedGrowthPct}% endpoint change from baseline ${formattedBaseline}). Because observations occur at irregular intervals spanning ${points[0].period.displayLabel} to ${points[points.length - 1].period.displayLabel}, this projection represents an exploratory mathematical trend rather than a calendar-month forecast.`
      : trendDirection === "decreasing"
      ? `Based on historical trajectory across ${n} dated observations, Kroma projects an exploratory downward drift toward ${formattedFinal}. Intervals are irregular, so this reflects directional velocity rather than a fixed calendar schedule.`
      : `Historical values show fluctuating performance across ${n} dated observations; projected trajectory remains steady near ${formattedFinal} across the next 6 periods.`;
  } else {
    explanation = trendDirection === "increasing"
      ? `Based on the direction of historical ${metricClean}, Kroma estimates that ${metricClean} will continue increasing over the next six months, projected to reach approximately ${formattedFinal} by ${forecastSeries[forecastSeries.length - 1].displayLabel} (a ${projectedGrowthPct >= 0 ? "+" : ""}${projectedGrowthPct}% increase from current ${formattedBaseline}).`
      : trendDirection === "decreasing"
      ? `Based on recent trends, Kroma projects a slight contraction in ${metricClean} over the next six months toward ${formattedFinal}.`
      : `Historical values show steady performance; ${metricClean} is estimated to remain stable around ${formattedFinal} across the next six months.`;
  }

  return {
    targetMetric,
    historicalSeries: points.map((p) => ({
      period: p.raw,
      displayLabel: p.period.displayLabel,
      value: p.value,
    })),
    forecastSeries,
    horizon,
    method: isExploratory ? "Trend-based directional projection (irregular spacing)" : "Trend-based linear projection with 95% confidence bounds",
    trendDirection,
    baseline,
    projectedGrowthPct,
    confidenceLevel: isExploratory ? "Exploratory / Directional (Irregular observation spacing)" : "95% statistical confidence based on historical velocity",
    limitations: suitability.limitations,
    explanation,
    suitability,
    isExploratory,
    displayTitle: suitability.displayTitle,
  };
}
