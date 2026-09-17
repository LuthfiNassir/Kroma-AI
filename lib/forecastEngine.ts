import { ForecastPoint, ForecastResult, GrowthIntelligence, PeriodChange } from "./types";
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
  };
}

export function calculateDeterministicForecast(
  data: Record<string, any>[],
  dateCol: string,
  targetMetric: string,
  horizon: number = 6
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
  const futurePeriods = generateFuturePeriods(lastPeriodObj, horizon, "monthly");

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

  const explanation = trendDirection === "increasing"
    ? `Based on the direction of historical ${targetMetric.replace(/_/g, " ")}, Kroma estimates that ${targetMetric.replace(/_/g, " ")} will continue increasing over the next six months, projected to reach approximately ${formattedFinal} by ${forecastSeries[forecastSeries.length - 1].displayLabel} (a ${projectedGrowthPct >= 0 ? "+" : ""}${projectedGrowthPct}% increase from current ${formattedBaseline}).`
    : trendDirection === "decreasing"
    ? `Based on recent trends, Kroma projects a slight contraction in ${targetMetric.replace(/_/g, " ")} over the next six months toward ${formattedFinal}.`
    : `Historical values show steady performance; ${targetMetric.replace(/_/g, " ")} is estimated to remain stable around ${formattedFinal} across the next six months.`;

  return {
    targetMetric,
    historicalSeries: points.map((p) => ({
      period: p.raw,
      displayLabel: p.period.displayLabel,
      value: p.value,
    })),
    forecastSeries,
    horizon,
    method: "Trend-based linear projection with 95% confidence bounds",
    trendDirection,
    baseline,
    projectedGrowthPct,
    confidenceLevel: "95% statistical confidence based on historical velocity",
    limitations: "Assumes continuation of historical growth rate without major external shocks or structural shifts.",
    explanation,
  };
}
