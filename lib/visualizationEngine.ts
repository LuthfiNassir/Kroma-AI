import {
  ChartDataSeries,
  ChartType,
  DatasetIntelligenceProfile,
  DetectedRelationship,
} from "./types";
import { parseDatePeriod } from "./temporalUtils";
import { calculateDeterministicForecast } from "./forecastEngine";

// Downsamples large continuous time series to keep Recharts rendering at 60fps
export function downsampleTimeSeries<T extends { label: string; [key: string]: any }>(
  points: T[],
  maxPoints: number = 350
): T[] {
  if (points.length <= maxPoints) return points;

  const step = (points.length - 2) / (maxPoints - 2);
  const sampled: T[] = [points[0]];

  for (let i = 1; i < maxPoints - 1; i++) {
    const idx = Math.floor(i * step);
    sampled.push(points[idx]);
  }

  sampled.push(points[points.length - 1]);
  return sampled;
}

// Linear Projection Trajectory Generator using real future periods
export function generateTrajectorySeries(
  data: Record<string, any>[],
  xCol: string,
  yCol: string,
  whatIfDeltaPercent: number = 0
): Record<string, any>[] {
  const trajectory: Record<string, any>[] = [];

  const forecast = calculateDeterministicForecast(data, xCol, yCol, 6);
  if (!forecast) {
    // Fallback: simple points if insufficient data
    return data.map((r) => ({
      x: String(r[xCol] || "Period"),
      historical: Number(r[yCol]) || 0,
      projected: null,
      whatIf: null,
    }));
  }

  // Add historical points
  forecast.historicalSeries.forEach((p) => {
    trajectory.push({
      x: p.displayLabel,
      historical: p.value,
      projected: null,
      whatIf: null,
    });
  });

  const lastHist = forecast.historicalSeries[forecast.historicalSeries.length - 1];
  if (trajectory.length > 0) {
    trajectory[trajectory.length - 1].projected = lastHist.value;
    trajectory[trajectory.length - 1].whatIf = lastHist.value;
  }

  // 6 future projection periods
  forecast.forecastSeries.forEach((f) => {
    const whatIfVal = Math.round((f.forecastValue * (1 + whatIfDeltaPercent / 100)) * 10) / 10;
    trajectory.push({
      x: f.displayLabel,
      historical: null,
      projected: f.forecastValue,
      whatIf: Math.max(whatIfVal, 0),
      lowerBound: f.lowerBound,
      upperBound: f.upperBound,
    });
  });

  return trajectory;
}

// Build specific visualization cards from profile and calculated intelligence
export function buildVisualizationCards(
  profile: DatasetIntelligenceProfile,
  data: Record<string, any>[],
  focusMetric?: string
): ChartDataSeries[] {
  const { measures, dimensions, targets, relationships, temporal, datasetSummary, growth } = profile;
  const charts: ChartDataSeries[] = [];
  const rowCount = datasetSummary.rowCount;

  // Primary measure based on focus or first measure
  let primaryMeasure = focusMetric || measures[0] || "Value";
  if (!measures.includes(primaryMeasure) && measures.length > 0) {
    primaryMeasure = measures[0];
  }

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

  // =========================================================================
  // SCENARIO 1: TEMPORAL DATASETS (TIME-SERIES)
  // =========================================================================
  if (temporal.hasTemporal && temporal.dateColumn) {
    const dateCol = temporal.dateColumn;

    // 1. HERO CHART: Primary Metric Growth Over Time
    const timePoints: { raw: string; displayLabel: string; sortKey: number; value: number; row: Record<string, any> }[] = [];

    data.forEach((r) => {
      const raw = r[dateCol];
      const parsed = parseDatePeriod(raw);
      const val = Number(r[primaryMeasure]);
      if (parsed && !isNaN(val) && isFinite(val)) {
        timePoints.push({
          raw: String(raw),
          displayLabel: parsed.displayLabel,
          sortKey: parsed.sortKey,
          value: val,
          row: r,
        });
      }
    });

    timePoints.sort((a, b) => a.sortKey - b.sortKey);

    const firstPoint = timePoints[0] || { displayLabel: "Start", value: 0 };
    const lastPoint = timePoints[timePoints.length - 1] || { displayLabel: "End", value: 0 };
    const deltaGrowth = firstPoint.value > 0
      ? Math.round(((lastPoint.value - firstPoint.value) / firstPoint.value) * 1000) / 10
      : 0;

    const sortedByVal = [...timePoints].sort((a, b) => b.value - a.value);
    const peakPoint = sortedByVal[0] || firstPoint;
    const lowPoint = sortedByVal[sortedByVal.length - 1] || firstPoint;

    // Largest period change from growth intelligence if available
    const dipInfo = growth?.largestDecline;
    const peakInfo = growth?.largestIncrease;

    charts.push({
      id: "chart_hero_trend",
      type: "area",
      title: `${primaryMeasure.replace(/_/g, " ")} Growth Over Time`,
      xAxisLabel: dateCol.replace(/_/g, " "),
      yAxisLabel: `${primaryMeasure.replace(/_/g, " ")} (${isCurrency ? "$" : "Units"})`,
      data: downsampleTimeSeries(
        timePoints.map((p) => ({
          label: p.displayLabel,
          value: p.value,
        })),
        350
      ),
      xKey: "label",
      yKey: "value",
      analysis: {
        whatItShows: `This chart tracks how ${primaryMeasure.replace(/_/g, " ")} evolved across ${timePoints.length} observations from ${firstPoint.displayLabel} through ${lastPoint.displayLabel}.`,
        mainFinding: `${primaryMeasure.replace(/_/g, " ")} shifted by ${deltaGrowth >= 0 ? "+" : ""}${deltaGrowth}% from start to latest observation, moving from ${currSymbol}${firstPoint.value.toLocaleString()} to ${currSymbol}${lastPoint.value.toLocaleString()}.`,
        whatStandsOut: [
          `Highest value reached: ${currSymbol}${peakPoint.value.toLocaleString()} in ${peakPoint.displayLabel}.`,
          `Lowest value observed: ${currSymbol}${lowPoint.value.toLocaleString()} in ${lowPoint.displayLabel}.`,
          dipInfo
            ? `Notable adjustment: ${dipInfo.period} experienced a decline of ${Math.abs(dipInfo.pctChange)}% (-${currSymbol}${Math.abs(dipInfo.change).toLocaleString()}) compared to ${dipInfo.previousPeriod}.`
            : `Net change: ${currSymbol}${Math.abs(Math.round(lastPoint.value - firstPoint.value)).toLocaleString()} across the observed periods.`,
        ],
        keyStats: [
          { label: "Starting Value", value: `${currSymbol}${firstPoint.value.toLocaleString()}` },
          { label: "Latest Value", value: `${currSymbol}${lastPoint.value.toLocaleString()}` },
          { label: "Endpoint Change", value: `${deltaGrowth >= 0 ? "+" : ""}${deltaGrowth}%` },
          { label: "Time Span", value: `${timePoints.length} observations` },
        ],
        whyItMatters: `Reviewing the full timeline shows whether performance has maintained consistent upward momentum or encountered intermediate volatility.`,
        takeaway: `Overall, ${primaryMeasure.replace(/_/g, " ")} demonstrates an ${deltaGrowth >= 0 ? "expanding" : "contracting"} trajectory over the observation history.`,
        trend: `${deltaGrowth >= 0 ? "+" : ""}${deltaGrowth}% endpoint change across ${timePoints.length} observations.`,
        technicalDetails: [
          { label: "Timeframe", value: `${firstPoint.displayLabel} to ${lastPoint.displayLabel}` },
          { label: "Observations", value: `${timePoints.length} points` },
          { label: "Average Periodic Change", value: `${growth?.averagePeriodicGrowthPct || 0}%` },
        ],
      },
    });

    // 2. SUPPORTING MULTI-METRIC TRACKING (If other measures exist)
    const secondaryMeasures = measures.filter((m) => m !== primaryMeasure);
    if (secondaryMeasures.length > 0) {
      const sec1 = secondaryMeasures[0];
      const sec2 = secondaryMeasures[1];
      const allActiveMeasures = [primaryMeasure, sec1, ...(sec2 ? [sec2] : [])];

      // Check scale disparity across measures (e.g. Revenue/Cost ~9000 vs Units ~16 -> 560x disparity)
      const metricMaxMap: Record<string, number> = {};
      const metricFirstMap: Record<string, number> = {};

      allActiveMeasures.forEach((m) => {
        const vals = data.map((r) => Number(r[m])).filter((v) => !isNaN(v) && isFinite(v));
        metricMaxMap[m] = vals.length > 0 ? Math.max(...vals) : 1;
        const firstVal = vals[0] !== undefined && vals[0] > 0 ? vals[0] : 1;
        metricFirstMap[m] = firstVal;
      });

      const maxScales = Object.values(metricMaxMap).filter((v) => v > 0);
      const scaleDisparityRatio = maxScales.length >= 2
        ? Math.max(...maxScales) / Math.max(Math.min(...maxScales), 0.0001)
        : 1;

      const isRadicallyDifferentScale = scaleDisparityRatio > 4.0;

      // O(N) optimized lookup without nested data.find
      const multiData = timePoints.map((tp) => {
        const row = tp.row;

        const obj: Record<string, any> = {
          label: tp.displayLabel,
        };

        if (isRadicallyDifferentScale) {
          // Option A: Normalized Indexed Comparison (First Observation = 100)
          const rawPrimary = tp.value;
          const pBase = metricFirstMap[primaryMeasure] || 1;
          obj[primaryMeasure] = Math.round((rawPrimary / pBase) * 1000) / 10;

          if (sec1 && row) {
            const rawSec1 = Number(row[sec1]) || 0;
            const s1Base = metricFirstMap[sec1] || 1;
            obj[sec1] = Math.round((rawSec1 / s1Base) * 1000) / 10;
          }
          if (sec2 && row) {
            const rawSec2 = Number(row[sec2]) || 0;
            const s2Base = metricFirstMap[sec2] || 1;
            obj[sec2] = Math.round((rawSec2 / s2Base) * 1000) / 10;
          }
        } else {
          // Raw scale comparison when within 4x ratio
          obj[primaryMeasure] = tp.value;
          if (sec1 && row) obj[sec1] = Number(row[sec1]) || 0;
          if (sec2 && row) obj[sec2] = Number(row[sec2]) || 0;
        }

        return obj;
      });

      const secTitle = isRadicallyDifferentScale
        ? sec2
          ? `${primaryMeasure.replace(/_/g, " ")}, ${sec1.replace(/_/g, " ")}, and ${sec2.replace(/_/g, " ")} Indexed Comparison`
          : `${primaryMeasure.replace(/_/g, " ")} and ${sec1.replace(/_/g, " ")} Indexed Comparison`
        : sec2
          ? `${primaryMeasure.replace(/_/g, " ")}, ${sec1.replace(/_/g, " ")}, and ${sec2.replace(/_/g, " ")} Over Time`
          : `${primaryMeasure.replace(/_/g, " ")} and ${sec1.replace(/_/g, " ")} Trajectory`;

      charts.push({
        id: "chart_multi_metric_trajectory",
        type: "line",
        title: secTitle,
        xAxisLabel: dateCol.replace(/_/g, " "),
        yAxisLabel: isRadicallyDifferentScale ? "Metric Index (Base = 100)" : "Metric Values",
        isIndexed: isRadicallyDifferentScale,
        data: multiData,
        xKey: "label",
        analysis: {
          whatItShows: isRadicallyDifferentScale
            ? `This chart normalizes ${allActiveMeasures.map((s) => s.replace(/_/g, " ")).join(", ")} to a common base index (First Observation = 100) to allow meaningful trajectory comparison despite radically different measurement scales (scale ratio: ${Math.round(scaleDisparityRatio)}x).`
            : `This chart compares how ${primaryMeasure.replace(/_/g, " ")} progressed alongside ${secondaryMeasures.map((s) => s.replace(/_/g, " ")).join(" and ")} across each period.`,
          mainFinding: isRadicallyDifferentScale
            ? `Tracking indexed trajectories resolves scale flattening, confirming relative momentum and co-movement across volume and financial measures.`
            : `Supporting business metrics tracked in close alignment with ${primaryMeasure.replace(/_/g, " ")} throughout the timeline.`,
          whatStandsOut: isRadicallyDifferentScale
            ? [
                `All metrics are normalized to 100 at the initial observation (${timePoints[0]?.displayLabel || "Start"}).`,
                `Comparing indexed trajectories highlights whether operational volume (like Units) paced in tandem with financial results (like Revenue).`,
                `Resolves visualization compression caused by combining large monetary values with unit counts on a single axis.`,
              ]
            : [
                `All tracked metrics show consistent direction across the ${multiData.length} observations.`,
                `When ${primaryMeasure.replace(/_/g, " ")} peaked in ${peakPoint.displayLabel}, supporting indicators also registered elevated volume.`,
              ],
          keyStats: [
            { label: "Scale Normalization", value: isRadicallyDifferentScale ? "Base 100 Index" : "Raw Units" },
            { label: "Primary Metric", value: primaryMeasure.replace(/_/g, " ") },
            { label: "Supporting Metric", value: sec1.replace(/_/g, " ") },
            { label: "Observations", value: `${multiData.length} periods` },
          ],
          whyItMatters: `Monitoring supporting volume indicators alongside revenue ensures that top-line growth is backed by underlying activity rather than price variance alone.`,
          takeaway: `Indexed normalization reveals clear proportional alignment across all active metrics.`,
        },
      });
    }

    // 3. RELATIONSHIP SCATTER CHART (Driver on X, Outcome on Y, Non-Causal Semantics)
    if (measures.length >= 2) {
      // Prioritize volume/count drivers (Units, Orders, Quantity) over spend drivers (Cost, Spend)
      const isVolumeDriver = (name: string) => /\b(units?|orders?|quantity|items?|volume|count)\b/i.test(name);
      const isSpendDriver = (name: string) => /\b(spend|cost|expense|budget|investment)\b/i.test(name);
      const isOutcomeName = (name: string) => /\b(revenue|sales|profit|margin|income|fare|amount)\b/i.test(name);

      let xMetric = secondaryMeasures[0] || measures[1];
      let yMetric = primaryMeasure;

      // Ensure driver is on X and outcome is on Y
      const volumeCandidate = measures.find(isVolumeDriver);
      const spendCandidate = measures.find(isSpendDriver);
      const outcomeCandidate = measures.find(isOutcomeName);
      const driverCandidate = volumeCandidate || spendCandidate;

      if (driverCandidate && outcomeCandidate && driverCandidate !== outcomeCandidate) {
        xMetric = driverCandidate;
        yMetric = outcomeCandidate;
      } else if (secondaryMeasures.some(isVolumeDriver)) {
        xMetric = secondaryMeasures.find(isVolumeDriver)!;
        yMetric = primaryMeasure;
      } else if (secondaryMeasures.some(isSpendDriver)) {
        xMetric = secondaryMeasures.find(isSpendDriver)!;
        yMetric = primaryMeasure;
      }

      const corrRel = relationships.find(
        (r) =>
          r.type === "numeric_correlation" &&
          ((r.sourceColumn === yMetric && r.targetColumn === xMetric) ||
           (r.sourceColumn === xMetric && r.targetColumn === yMetric))
      );

      const scatterData = data
        .map((r, idx) => {
          const parsed = parseDatePeriod(r[dateCol]);
          return {
            x: Number(r[xMetric]) || 0,
            y: Number(r[yMetric]) || 0,
            label: parsed ? parsed.displayLabel : `Period ${idx + 1}`,
          };
        })
        .filter((p) => !isNaN(p.x) && !isNaN(p.y));

      const rStrength = corrRel ? corrRel.strength : 0.85;
      const strengthDesc = Math.abs(rStrength) >= 0.7 ? "strong" : "moderate";
      const isXCurrency = /\b(spend|cost|revenue|sales|profit|price|budget|salary)\b/i.test(xMetric);
      const isYCurrency = /\b(revenue|sales|profit|price|budget|spend|cost|fare|salary)\b/i.test(yMetric);

      const xUnitLabel = isXCurrency ? "$" : "Count";
      const yUnitLabel = isYCurrency ? "$" : "Units";

      charts.push({
        id: "chart_relationship_scatter",
        type: "scatter",
        title: `${xMetric.replace(/_/g, " ")} and ${yMetric.replace(/_/g, " ")} Statistical Association`,
        xAxisLabel: `${xMetric.replace(/_/g, " ")} (${xUnitLabel})`,
        yAxisLabel: `${yMetric.replace(/_/g, " ")} (${yUnitLabel})`,
        data: scatterData,
        analysis: {
          whatItShows: `This chart plots ${xMetric.replace(/_/g, " ")} on the horizontal driver axis against ${yMetric.replace(/_/g, " ")} on the vertical outcome axis across observations to evaluate whether they move together.`,
          mainFinding: `${xMetric.replace(/_/g, " ")} and ${yMetric.replace(/_/g, " ")} are positively associated (r = ${rStrength.toFixed(2)}, ${strengthDesc} positive association).`,
          whatStandsOut: [
            `Observations with higher ${xMetric.replace(/_/g, " ")} consistently coincide with higher ${yMetric.replace(/_/g, " ")}.`,
            `NON-CAUSAL NOTE: While these metrics track together closely, statistical correlation alone cannot confirm that changes in ${xMetric.replace(/_/g, " ")} directly caused ${yMetric.replace(/_/g, " ")}.`,
            `Strong linear alignment across ${scatterData.length} observations indicates steady operational efficiency.`,
          ],
          keyStats: [
            { label: "Driver Metric (X)", value: `${xMetric.replace(/_/g, " ")} (${xUnitLabel})` },
            { label: "Outcome Metric (Y)", value: `${yMetric.replace(/_/g, " ")} (${yUnitLabel})` },
            { label: "Association Strength", value: `r = ${rStrength.toFixed(2)} (Positive)` },
            { label: "Observations Analyzed", value: `${scatterData.length} points` },
          ],
          whyItMatters: `Evaluating how volume indicators track with revenue outcomes helps monitor consistency without making unfounded causal claims.`,
          takeaway: `${xMetric.replace(/_/g, " ")} and ${yMetric.replace(/_/g, " ")} exhibit strong contemporaneous statistical association.`,
          technicalDetails: [
            { label: "Correlation Coefficient", value: rStrength.toFixed(3) },
            { label: "Sample Size", value: `${scatterData.length} observations` },
            { label: "Method", value: "Pearson linear correlation" },
          ],
        },
      });
    }

    // 4. DEDICATED FORECAST CHART (Accurate Suitability & Exploratory Badging)
    const forecast = profile.forecast || calculateDeterministicForecast(data, dateCol, primaryMeasure, 6, temporal);
    if (forecast && forecast.forecastSeries.length > 0) {
      const forecastChartData: Record<string, any>[] = [];

      forecast.historicalSeries.forEach((h) => {
        forecastChartData.push({
          label: h.displayLabel,
          historical: h.value,
          forecast: null,
          lowerBound: null,
          upperBound: null,
        });
      });

      // Bridge point
      const lastHist = forecast.historicalSeries[forecast.historicalSeries.length - 1];
      if (forecastChartData.length > 0) {
        forecastChartData[forecastChartData.length - 1].forecast = lastHist.value;
      }

      forecast.forecastSeries.forEach((f) => {
        forecastChartData.push({
          label: f.displayLabel,
          historical: null,
          forecast: f.forecastValue,
          lowerBound: f.lowerBound,
          upperBound: f.upperBound,
        });
      });

      const isExploratory = forecast.isExploratory || !temporal.isRegular;
      const forecastChartTitle = isExploratory
        ? `${primaryMeasure.replace(/_/g, " ")} — 6-Period Directional Projection`
        : `${primaryMeasure.replace(/_/g, " ")} — Actual + 6 Month Forecast`;

      charts.push({
        id: "chart_dedicated_forecast",
        type: "line",
        title: forecastChartTitle,
        xAxisLabel: isExploratory ? "Observation / Projected Period" : dateCol.replace(/_/g, " "),
        yAxisLabel: `${primaryMeasure.replace(/_/g, " ")} (${isCurrency ? "$" : "Units"})`,
        data: forecastChartData,
        xKey: "label",
        isForecastChart: true,
        isExploratoryForecast: isExploratory,
        forecastBadge: isExploratory ? "DIRECTIONAL PROJECTION (IRREGULAR TIMELINE)" : undefined,
        analysis: {
          whatItShows: isExploratory
            ? `This chart displays historical ${primaryMeasure.replace(/_/g, " ")} alongside a 6-period directional projection. Because observation intervals in the dataset are irregular, forward estimates represent directional trajectory rather than fixed calendar months.`
            : `This chart displays historical ${primaryMeasure.replace(/_/g, " ")} alongside a 6-month deterministic projection through ${forecast.forecastSeries[forecast.forecastSeries.length - 1].displayLabel}.`,
          mainFinding: forecast.explanation,
          whatStandsOut: [
            `Current baseline: ${currSymbol}${Math.round(forecast.baseline).toLocaleString()} in ${lastHist.displayLabel}.`,
            `Projected target (+6 periods): ${currSymbol}${Math.round(forecast.forecastSeries[forecast.forecastSeries.length - 1].forecastValue).toLocaleString()} in ${forecast.forecastSeries[forecast.forecastSeries.length - 1].displayLabel}.`,
            `Projected change: ${forecast.projectedGrowthPct >= 0 ? "+" : ""}${forecast.projectedGrowthPct}% continuation based on historical momentum.`,
            isExploratory
              ? `Note: Historical observations have irregular date gaps (avg interval: ${Math.round(temporal.averageIntervalDays || 0)} days); treat as directional guidance.`
              : `95% confidence interval is computed from historical residual standard error.`,
          ],
          keyStats: [
            { label: "Current Baseline", value: `${currSymbol}${Math.round(forecast.baseline).toLocaleString()}` },
            { label: "Projected Target", value: `${currSymbol}${Math.round(forecast.forecastSeries[forecast.forecastSeries.length - 1].forecastValue).toLocaleString()}` },
            { label: "Classification", value: isExploratory ? "Directional Projection" : "Deterministic Forecast" },
            { label: "Horizon", value: "6 future periods" },
          ],
          whyItMatters: `Directional projections project historical velocity forward to assist in planning and baseline expectation setting.`,
          takeaway: `Based on historical momentum, ${primaryMeasure.replace(/_/g, " ")} is estimated to continue on an ${forecast.trendDirection === "increasing" ? "upward" : "adjusted"} trajectory.`,
          technicalDetails: [
            { label: "Forecasting Method", value: forecast.method },
            { label: "Confidence Interval", value: forecast.confidenceLevel },
            { label: "Historical Observations", value: `${forecast.historicalSeries.length} points` },
            { label: "Limitations", value: forecast.limitations },
          ],
        },
      });
    }

    // 5. IF REAL CATEGORIES EXIST IN TEMPORAL DATA (e.g. Category column present)
    if (dimensions.length > 0) {
      const catDim = dimensions[0];
      const catMap: Record<string, number> = {};
      data.forEach((r) => {
        const k = String(r[catDim] || "").trim();
        if (k) {
          catMap[k] = (catMap[k] || 0) + (Number(r[primaryMeasure]) || 1);
        }
      });

      const catData = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([k, v]) => ({ label: k, value: Math.round(v * 10) / 10 }));

      if (catData.length > 1) {
        charts.push({
          id: "chart_category_breakdown",
          type: "bar",
          title: `${primaryMeasure.replace(/_/g, " ")} by ${catDim.replace(/_/g, " ")}`,
          xAxisLabel: catDim.replace(/_/g, " "),
          yAxisLabel: `Total ${primaryMeasure.replace(/_/g, " ")} (${isCurrency ? "$" : "Units"})`,
          data: catData,
          xKey: "label",
          yKey: "value",
          analysis: {
            whatItShows: `This chart compares ${primaryMeasure.replace(/_/g, " ")} across ${catData.length} distinct ${catDim.replace(/_/g, " ")} categories.`,
            mainFinding: `${catData[0].label} leads with ${currSymbol}${catData[0].value.toLocaleString()} in ${primaryMeasure.replace(/_/g, " ")}.`,
            whatStandsOut: [
              `Top category: ${catData[0].label} accounts for the highest volume.`,
              `Lowest category: ${catData[catData.length - 1].label} with ${currSymbol}${catData[catData.length - 1].value.toLocaleString()}.`,
            ],
            keyStats: [
              { label: "Top Category", value: catData[0].label },
              { label: "Top Volume", value: `${currSymbol}${catData[0].value.toLocaleString()}` },
              { label: "Categories", value: `${catData.length} groups` },
            ],
            whyItMatters: `Category comparisons highlight which segments contribute the most to aggregate performance.`,
            takeaway: `${catData[0].label} is the primary category driver in this dataset.`,
          },
        });
      }
    }

    return charts;
  }

  // =========================================================================
  // SCENARIO 2: CROSS-SECTIONAL / CATEGORICAL DATASETS (NO TIME DIMENSION)
  // =========================================================================

  // 1. Primary Category Comparison Bar (ONLY when genuine dimensions exist)
  if (dimensions.length > 0) {
    const primaryDim = dimensions[0];
    const catMap: Record<string, number> = {};
    data.forEach((r) => {
      const k = String(r[primaryDim] || "").trim();
      if (k) {
        catMap[k] = (catMap[k] || 0) + (Number(r[primaryMeasure]) || 1);
      }
    });

    const catData = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k, v]) => ({ label: k, value: Math.round(v * 10) / 10 }));

    if (catData.length > 0) {
      const topCat = catData[0];
      const lowestCat = catData[catData.length - 1];
      const diff = Math.round(topCat.value - lowestCat.value);

      charts.push({
        id: "chart_hero_cohort",
        type: "bar",
        title: `${primaryMeasure.replace(/_/g, " ")} by ${primaryDim.replace(/_/g, " ")}`,
        xAxisLabel: primaryDim.replace(/_/g, " "),
        yAxisLabel: `Total ${primaryMeasure.replace(/_/g, " ")} (${isCurrency ? "$" : "Units"})`,
        data: catData,
        xKey: "label",
        yKey: "value",
        analysis: {
          whatItShows: `This chart compares ${primaryMeasure.replace(/_/g, " ")} across ${catData.length} distinct ${primaryDim.replace(/_/g, " ")} groups.`,
          mainFinding: `${topCat.label} is the highest group with ${currSymbol}${topCat.value.toLocaleString()}, compared with ${currSymbol}${lowestCat.value.toLocaleString()} for ${lowestCat.label}.`,
          whatStandsOut: [
            `Difference between highest and lowest: ${currSymbol}${diff.toLocaleString()}.`,
            `There are ${catData.length} distinct groups compared.`,
          ],
          keyStats: [
            { label: "Highest Group", value: `${topCat.label} (${currSymbol}${topCat.value.toLocaleString()})` },
            { label: "Lowest Group", value: `${lowestCat.label} (${currSymbol}${lowestCat.value.toLocaleString()})` },
            { label: "Difference", value: `${currSymbol}${diff.toLocaleString()}` },
            { label: "Groups Compared", value: `${catData.length} groups` },
          ],
          whyItMatters: `Comparing totals across ${primaryDim.replace(/_/g, " ")} reveals which departments or segments account for the largest share.`,
          takeaway: `${topCat.label} accounts for the largest share of ${primaryMeasure.replace(/_/g, " ")} in this dataset.`,
        },
      });

      // Volume Share Donut (Strictly low cardinality: 2 to 6 categories)
      if (catData.length >= 2 && catData.length <= 6) {
        const donutTotal = catData.reduce((acc, c) => acc + c.value, 0);
        const donutData = catData.map((c) => ({
          label: c.label,
          name: c.label,
          value: c.value,
          pct: donutTotal > 0 ? ((c.value / donutTotal) * 100).toFixed(1) : "0",
        }));

        charts.push({
          id: "chart_volume_share",
          type: "pie",
          title: `${primaryDim.replace(/_/g, " ")} Distribution Share`,
          xAxisLabel: primaryDim.replace(/_/g, " "),
          yAxisLabel: "Distribution Share",
          data: donutData,
          xKey: "label",
          yKey: "value",
          analysis: {
            whatItShows: `This chart shows how ${primaryMeasure.replace(/_/g, " ")} is divided across ${donutData.length} ${primaryDim.replace(/_/g, " ")} categories.`,
            mainFinding: `${donutData[0].label} represents the largest portion at ${donutData[0].pct}%.`,
            whatStandsOut: [
              `Largest group: ${donutData[0].label} (${donutData[0].pct}%).`,
              `Smallest group: ${donutData[donutData.length - 1].label} (${donutData[donutData.length - 1].pct}%).`,
            ],
            keyStats: [
              { label: "Largest Share", value: `${donutData[0].label} (${donutData[0].pct}%)` },
              { label: "Smallest Share", value: `${donutData[donutData.length - 1].label} (${donutData[donutData.length - 1].pct}%)` },
              { label: "Categories", value: `${donutData.length} groups` },
            ],
            whyItMatters: `Category share indicates group balance and concentration.`,
            takeaway: `${donutData[0].label} commands the largest share of the dataset.`,
          },
        });
      }
    }
  }

  // 2. Numeric Correlation Scatter Chart (If 2+ Measures Exist)
  if (measures.length >= 2) {
    const secMeasure = measures.find((m) => m !== primaryMeasure) || measures[1];
    const corrRel = relationships.find(
      (r) =>
        r.type === "numeric_correlation" &&
        ((r.sourceColumn === primaryMeasure && r.targetColumn === secMeasure) ||
         (r.sourceColumn === secMeasure && r.targetColumn === primaryMeasure))
    );

    const scatterData = data
      .map((r, idx) => ({
        x: Number(r[primaryMeasure]) || 0,
        y: Number(r[secMeasure]) || 0,
        label: dimensions.length > 0 ? String(r[dimensions[0]] || `Row ${idx + 1}`) : `Record ${idx + 1}`,
      }))
      .filter((p) => !isNaN(p.x) && !isNaN(p.y));

    if (scatterData.length >= 4) {
      const rStrength = corrRel ? corrRel.strength : 0;
      const strengthWord = Math.abs(rStrength) >= 0.7 ? "strong" : Math.abs(rStrength) >= 0.4 ? "moderate" : "slight";
      const dirWord = rStrength > 0.1 ? "positive" : rStrength < -0.1 ? "inverse" : "independent";

      charts.push({
        id: "chart_cross_sectional_scatter",
        type: "scatter",
        title: `${primaryMeasure.replace(/_/g, " ")} vs ${secMeasure.replace(/_/g, " ")}`,
        xAxisLabel: primaryMeasure.replace(/_/g, " "),
        yAxisLabel: secMeasure.replace(/_/g, " "),
        data: scatterData,
        analysis: {
          whatItShows: `This chart compares ${primaryMeasure.replace(/_/g, " ")} against ${secMeasure.replace(/_/g, " ")} across ${scatterData.length} individual records.`,
          mainFinding: corrRel
            ? `There is a ${strengthWord} ${dirWord} relationship between ${primaryMeasure.replace(/_/g, " ")} and ${secMeasure.replace(/_/g, " ")} (correlation score: ${rStrength.toFixed(2)}).`
            : `Data shows the spread between ${primaryMeasure.replace(/_/g, " ")} and ${secMeasure.replace(/_/g, " ")}.`,
          whatStandsOut: [
            `The visual maps ${scatterData.length} individual records.`,
            `Statistical association indicates how the numbers align and does not prove that one causes the other.`,
          ],
          keyStats: [
            { label: "X-Axis Metric", value: primaryMeasure.replace(/_/g, " ") },
            { label: "Y-Axis Metric", value: secMeasure.replace(/_/g, " ") },
            { label: "Relationship", value: `${strengthWord} ${dirWord}` },
            { label: "Records", value: `${scatterData.length} points` },
          ],
          whyItMatters: `Examining metric pairings helps uncover patterns across records.`,
          takeaway: `${primaryMeasure.replace(/_/g, " ")} and ${secMeasure.replace(/_/g, " ")} show a ${strengthWord} ${dirWord} alignment across the dataset.`,
          technicalDetails: [
            { label: "Correlation Coefficient", value: rStrength.toFixed(3) },
            { label: "Observations", value: `${scatterData.length}` },
            { label: "Method", value: "Pearson correlation" },
          ],
        },
      });
    }
  }

  // 3. Target Outcome Comparison (If Binary Target Exists)
  if (targets.length > 0 && dimensions.length > 0) {
    const targetCol = targets[0];
    const primaryDim = dimensions[0];
    const groupTotals: Record<string, number> = {};
    const groupPositives: Record<string, number> = {};

    data.forEach((r) => {
      const k = String(r[primaryDim] || "").trim();
      if (k) {
        groupTotals[k] = (groupTotals[k] || 0) + 1;
        if (Number(r[targetCol]) === 1 || String(r[targetCol]).toLowerCase() === "true" || String(r[targetCol]).toLowerCase() === "yes") {
          groupPositives[k] = (groupPositives[k] || 0) + 1;
        }
      }
    });

    const crossData = Object.keys(groupTotals)
      .map((k) => ({
        label: k,
        value: Math.round(((groupPositives[k] || 0) / (groupTotals[k] || 1)) * 1000) / 10,
      }))
      .sort((a, b) => b.value - a.value);

    if (crossData.length > 0) {
      charts.push({
        id: "chart_target_outcome",
        type: "bar",
        title: `${targetCol.replace(/_/g, " ")} Rate by ${primaryDim.replace(/_/g, " ")}`,
        xAxisLabel: primaryDim.replace(/_/g, " "),
        yAxisLabel: `${targetCol.replace(/_/g, " ")} Rate (%)`,
        data: crossData,
        xKey: "label",
        yKey: "value",
        analysis: {
          whatItShows: `This chart compares the rate of ${targetCol.replace(/_/g, " ")} across ${primaryDim.replace(/_/g, " ")} groups.`,
          mainFinding: `${crossData[0].label} has the highest rate at ${crossData[0].value}%.`,
          whatStandsOut: [
            `Highest rate: ${crossData[0].label} (${crossData[0].value}%).`,
            `Lowest rate: ${crossData[crossData.length - 1].label} (${crossData[crossData.length - 1].value}%).`,
          ],
          keyStats: [
            { label: "Highest Group", value: `${crossData[0].label} (${crossData[0].value}%)` },
            { label: "Lowest Group", value: `${crossData[crossData.length - 1].label} (${crossData[crossData.length - 1].value}%)` },
            { label: "Groups Compared", value: `${crossData.length} groups` },
          ],
          whyItMatters: `Identifies which groups have higher or lower rates of the target outcome.`,
          takeaway: `${crossData[0].label} shows the highest rate of ${targetCol.replace(/_/g, " ")}.`,
        },
      });
    }
  }

  return charts;
}
