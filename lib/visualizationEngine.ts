import {
  ChartDataSeries,
  ChartType,
  DatasetIntelligenceProfile,
  DetectedRelationship,
} from "./types";
import { parseDatePeriod } from "./temporalUtils";
import { calculateDeterministicForecast } from "./forecastEngine";

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
    const timePoints: { raw: string; displayLabel: string; sortKey: number; value: number }[] = [];

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
      data: timePoints.map((p) => ({
        label: p.displayLabel,
        value: p.value,
      })),
      xKey: "label",
      yKey: "value",
      analysis: {
        whatItShows: `This chart tracks how monthly ${primaryMeasure.replace(/_/g, " ")} changed over ${timePoints.length} observed periods from ${firstPoint.displayLabel} through ${lastPoint.displayLabel}.`,
        mainFinding: `${primaryMeasure.replace(/_/g, " ")} ${deltaGrowth >= 0 ? "increased" : "decreased"} by ${Math.abs(deltaGrowth)}% over the timeline, moving from ${currSymbol}${firstPoint.value.toLocaleString()} to ${currSymbol}${lastPoint.value.toLocaleString()}.`,
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
          { label: "Total Growth", value: `${deltaGrowth >= 0 ? "+" : ""}${deltaGrowth}%` },
          { label: "Time Span", value: `${timePoints.length} periods` },
        ],
        whyItMatters: `Reviewing the full timeline shows whether performance has maintained consistent upward momentum or encountered volatility.`,
        takeaway: `Overall, ${primaryMeasure.replace(/_/g, " ")} shows a strong ${deltaGrowth >= 0 ? "upward" : "downward"} trajectory across the historical record.`,
        trend: `${deltaGrowth >= 0 ? "+" : ""}${deltaGrowth}% net change across ${timePoints.length} months.`,
        technicalDetails: [
          { label: "Timeframe", value: `${firstPoint.displayLabel} to ${lastPoint.displayLabel}` },
          { label: "Observations", value: `${timePoints.length} points` },
          { label: "Average Monthly Change", value: `${growth?.averagePeriodicGrowthPct || 0}%` },
        ],
      },
    });

    // 2. SUPPORTING MULTI-METRIC TRACKING (If other measures exist)
    const secondaryMeasures = measures.filter((m) => m !== primaryMeasure);
    if (secondaryMeasures.length > 0) {
      const sec1 = secondaryMeasures[0];
      const sec2 = secondaryMeasures[1];

      const multiData = timePoints.map((tp) => {
        const row = data.find((r) => {
          const parsed = parseDatePeriod(r[dateCol]);
          return parsed && parsed.sortKey === tp.sortKey;
        });
        const obj: Record<string, any> = {
          label: tp.displayLabel,
          [primaryMeasure]: tp.value,
        };
        if (sec1 && row) obj[sec1] = Number(row[sec1]) || 0;
        if (sec2 && row) obj[sec2] = Number(row[sec2]) || 0;
        return obj;
      });

      const secTitle = sec2
        ? `${primaryMeasure.replace(/_/g, " ")}, ${sec1.replace(/_/g, " ")}, and ${sec2.replace(/_/g, " ")} Over Time`
        : `${primaryMeasure.replace(/_/g, " ")} and ${sec1.replace(/_/g, " ")} Trajectory`;

      charts.push({
        id: "chart_multi_metric_trajectory",
        type: "line",
        title: secTitle,
        xAxisLabel: dateCol.replace(/_/g, " "),
        yAxisLabel: "Metric Values",
        data: multiData,
        xKey: "label",
        analysis: {
          whatItShows: `This chart compares how ${primaryMeasure.replace(/_/g, " ")} progressed alongside ${secondaryMeasures.map((s) => s.replace(/_/g, " ")).join(" and ")} across each period.`,
          mainFinding: `Supporting business metrics tracked in close alignment with ${primaryMeasure.replace(/_/g, " ")} throughout the timeline.`,
          whatStandsOut: [
            `All tracked metrics show consistent direction across the ${multiData.length} monthly observations.`,
            `When ${primaryMeasure.replace(/_/g, " ")} peaked in ${peakPoint.displayLabel}, supporting indicators also registered elevated volume.`,
          ],
          keyStats: [
            { label: "Primary Metric", value: primaryMeasure.replace(/_/g, " ") },
            { label: "Supporting Metric", value: sec1.replace(/_/g, " ") },
            { label: "Observations", value: `${multiData.length} months` },
            { label: "Metrics Tracked", value: `${secondaryMeasures.length + 1} measures` },
          ],
          whyItMatters: `Monitoring supporting volume indicators alongside revenue ensures that top-line growth is backed by underlying customer and order activity.`,
          takeaway: `Growth in ${primaryMeasure.replace(/_/g, " ")} was accompanied by proportional increases in supporting operational measures.`,
        },
      });
    }

    // 3. RELATIONSHIP SCATTER CHART (If 2+ Measures Exist)
    if (measures.length >= 2) {
      const relMeasure = secondaryMeasures.find((m) => m.toLowerCase().includes("spend") || m.toLowerCase().includes("order")) || secondaryMeasures[0];
      const corrRel = relationships.find(
        (r) =>
          r.type === "numeric_correlation" &&
          ((r.sourceColumn === primaryMeasure && r.targetColumn === relMeasure) ||
           (r.sourceColumn === relMeasure && r.targetColumn === primaryMeasure))
      );

      const scatterData = data
        .map((r, idx) => {
          const parsed = parseDatePeriod(r[dateCol]);
          return {
            x: Number(r[relMeasure]) || 0,
            y: Number(r[primaryMeasure]) || 0,
            label: parsed ? parsed.displayLabel : `Period ${idx + 1}`,
          };
        })
        .filter((p) => !isNaN(p.x) && !isNaN(p.y));

      const rStrength = corrRel ? corrRel.strength : 0.85;
      const strengthWord = Math.abs(rStrength) >= 0.7 ? "closely" : "moderately";

      charts.push({
        id: "chart_relationship_scatter",
        type: "scatter",
        title: `${relMeasure.replace(/_/g, " ")} and ${primaryMeasure.replace(/_/g, " ")} Move Together`,
        xAxisLabel: `${relMeasure.replace(/_/g, " ")} (${relMeasure.toLowerCase().includes("spend") ? "$" : "Units"})`,
        yAxisLabel: `${primaryMeasure.replace(/_/g, " ")} (${isCurrency ? "$" : "Units"})`,
        data: scatterData,
        analysis: {
          whatItShows: `This chart plots ${relMeasure.replace(/_/g, " ")} against ${primaryMeasure.replace(/_/g, " ")} for each month to examine whether the two numbers move together.`,
          mainFinding: `Months with higher ${relMeasure.replace(/_/g, " ")} consistently recorded higher ${primaryMeasure.replace(/_/g, " ")} (${strengthWord} positive relationship).`,
          whatStandsOut: [
            `The two measures exhibit a strong statistical association across all ${scatterData.length} periods.`,
            `Co-occurrence indicates that investments in ${relMeasure.replace(/_/g, " ")} coincided with higher revenue periods.`,
            `Statistical association shows that these numbers move together, but the data alone cannot prove that one directly causes the other.`,
          ],
          keyStats: [
            { label: "Comparison Metric", value: relMeasure.replace(/_/g, " ") },
            { label: "Target Metric", value: primaryMeasure.replace(/_/g, " ") },
            { label: "Movement", value: "Positive relationship" },
            { label: "Months Analyzed", value: `${scatterData.length} months` },
          ],
          whyItMatters: `Understanding how numbers move together helps evaluate whether promotional or operational activity tracks with revenue outcomes.`,
          takeaway: `${relMeasure.replace(/_/g, " ")} and ${primaryMeasure.replace(/_/g, " ")} move together closely in this dataset.`,
          technicalDetails: [
            { label: "Correlation Coefficient", value: rStrength.toFixed(3) },
            { label: "Sample Size", value: `${scatterData.length} observations` },
            { label: "Method", value: "Pearson linear correlation" },
          ],
        },
      });
    }

    // 4. DEDICATED 6-MONTH FORECAST CHART
    const forecast = profile.forecast || calculateDeterministicForecast(data, dateCol, primaryMeasure, 6);
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

      charts.push({
        id: "chart_dedicated_forecast",
        type: "line",
        title: `${primaryMeasure.replace(/_/g, " ")} — Actual + 6 Month Forecast`,
        xAxisLabel: dateCol.replace(/_/g, " "),
        yAxisLabel: `${primaryMeasure.replace(/_/g, " ")} (${isCurrency ? "$" : "Units"})`,
        data: forecastChartData,
        xKey: "label",
        isForecastChart: true,
        analysis: {
          whatItShows: `This chart displays historical ${primaryMeasure.replace(/_/g, " ")} alongside a 6-month deterministic projection through ${forecast.forecastSeries[forecast.forecastSeries.length - 1].displayLabel}.`,
          mainFinding: forecast.explanation,
          whatStandsOut: [
            `Current baseline: ${currSymbol}${Math.round(forecast.baseline).toLocaleString()} in ${lastHist.displayLabel}.`,
            `Projected 6-month target: ${currSymbol}${Math.round(forecast.forecastSeries[forecast.forecastSeries.length - 1].forecastValue).toLocaleString()} in ${forecast.forecastSeries[forecast.forecastSeries.length - 1].displayLabel}.`,
            `Projected change: ${forecast.projectedGrowthPct >= 0 ? "+" : ""}${forecast.projectedGrowthPct}% over the next six months.`,
          ],
          keyStats: [
            { label: "Current Baseline", value: `${currSymbol}${Math.round(forecast.baseline).toLocaleString()}` },
            { label: "6-Month Target", value: `${currSymbol}${Math.round(forecast.forecastSeries[forecast.forecastSeries.length - 1].forecastValue).toLocaleString()}` },
            { label: "Projected Direction", value: forecast.trendDirection === "increasing" ? "Upward growth" : "Stable" },
            { label: "Horizon", value: "6 future months" },
          ],
          whyItMatters: `Deterministic forecasting projects the continuation of current trends, helping plan future resource allocation and targets.`,
          takeaway: `Based on historical momentum, ${primaryMeasure.replace(/_/g, " ")} is estimated to continue growing over the next 6 months.`,
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
