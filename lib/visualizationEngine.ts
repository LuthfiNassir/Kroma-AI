import {
  ChartDataSeries,
  ChartType,
  DatasetIntelligenceProfile,
  DetectedRelationship,
} from "./types";

// Linear Projection Trajectory Generator
export function generateTrajectorySeries(
  data: Record<string, any>[],
  xCol: string,
  yCol: string,
  whatIfDeltaPercent: number = 0
): Record<string, any>[] {
  const trajectory: Record<string, any>[] = [];

  const points = data
    .map((r) => ({
      x: String(r[xCol] || "Period"),
      y: Number(r[yCol]) || 0,
    }))
    .filter((p) => !isNaN(p.y) && isFinite(p.y));

  if (points.length === 0) return trajectory;

  // Add historical points
  points.forEach((p) => {
    trajectory.push({
      x: p.x,
      historical: p.y,
      projected: null,
      whatIf: null,
    });
  });

  const lastVal = points[points.length - 1].y;
  const firstVal = points[0].y;
  const trendSlope = points.length > 1 ? (lastVal - firstVal) / points.length : 0;

  // Bridge point (connects historical to projected)
  trajectory[trajectory.length - 1].projected = lastVal;
  trajectory[trajectory.length - 1].whatIf = lastVal;

  // 4 future projection periods
  for (let i = 1; i <= 4; i++) {
    const projBase = Math.round((lastVal + trendSlope * i) * 10) / 10;
    const whatIfVal = Math.round((projBase * (1 + whatIfDeltaPercent / 100)) * 10) / 10;

    trajectory.push({
      x: `Forecast +${i}`,
      historical: null,
      projected: Math.max(projBase, 0),
      whatIf: Math.max(whatIfVal, 0),
    });
  }

  return trajectory;
}

// Build specific visualization card series from profile and relationship metadata
export function buildVisualizationCards(
  profile: DatasetIntelligenceProfile,
  data: Record<string, any>[],
  focusMetric?: string
): ChartDataSeries[] {
  const { measures, dimensions, targets, relationships, temporal, datasetSummary } = profile;
  const charts: ChartDataSeries[] = [];
  const rowCount = datasetSummary.rowCount;

  // Prioritize primary measure based on user focus if provided
  let primaryMeasure = focusMetric || measures[0] || "Value";
  if (!measures.includes(primaryMeasure) && measures.length > 0) {
    primaryMeasure = measures[0];
  }

  const primaryDim = dimensions[0] || "Category";
  const isCurrency =
    primaryMeasure.toLowerCase().includes("amount") ||
    primaryMeasure.toLowerCase().includes("sales") ||
    primaryMeasure.toLowerCase().includes("revenue") ||
    primaryMeasure.toLowerCase().includes("price") ||
    primaryMeasure.toLowerCase().includes("cost") ||
    primaryMeasure.toLowerCase().includes("spend") ||
    primaryMeasure.toLowerCase().includes("profit") ||
    primaryMeasure.toLowerCase().includes("expense");

  // 1. Hero Chart (Time Series Trend or Primary Cohort Bar)
  if (temporal.hasTemporal && temporal.dateColumn) {
    // Time Series Aggregation
    const timeMap: Record<string, { sum: number; count: number }> = {};
    data.forEach((r) => {
      const k = String(r[temporal.dateColumn!] || "Period");
      const v = Number(r[primaryMeasure]) || 0;
      if (!timeMap[k]) timeMap[k] = { sum: 0, count: 0 };
      timeMap[k].sum += v;
      timeMap[k].count += 1;
    });

    const timeData = Object.entries(timeMap)
      .map(([k, stat]) => ({
        label: k,
        value: Math.round(stat.sum * 10) / 10,
        avg: stat.count > 0 ? Math.round((stat.sum / stat.count) * 10) / 10 : 0,
      }))
      .slice(0, 24);

    const firstPeriod = timeData[0] ? timeData[0].value : 0;
    const lastPeriod = timeData[timeData.length - 1] ? timeData[timeData.length - 1].value : 0;
    const deltaGrowth = firstPeriod > 0 ? Math.round(((lastPeriod - firstPeriod) / firstPeriod) * 1000) / 10 : 0;
    
    // Find peak and trough
    const sortedTime = [...timeData].sort((a, b) => b.value - a.value);
    const peakPoint = sortedTime[0] || { label: "Period", value: 0 };
    const lowPoint = sortedTime[sortedTime.length - 1] || { label: "Period", value: 0 };

    charts.push({
      id: "chart_hero_trend",
      type: "area",
      title: `${primaryMeasure.replace(/_/g, " ").toUpperCase()} OVER TIME`,
      xAxisLabel: temporal.dateColumn.replace(/_/g, " "),
      yAxisLabel: `${primaryMeasure.replace(/_/g, " ")} (${isCurrency ? "$" : "Units"})`,
      data: timeData,
      xKey: "label",
      yKey: "value",
      analysis: {
        whatItShows: `This chart tracks how ${primaryMeasure.replace(/_/g, " ")} changed over ${timeData.length} ${temporal.frequency || "time"} periods from ${timeData[0]?.label || "start"} to ${timeData[timeData.length - 1]?.label || "end"}.`,
        mainFinding: `${primaryMeasure.replace(/_/g, " ")} ${deltaGrowth >= 0 ? "increased" : "decreased"} by ${Math.abs(deltaGrowth)}% over the observed time window, moving from ${isCurrency ? "$" : ""}${firstPeriod.toLocaleString()} to ${isCurrency ? "$" : ""}${lastPeriod.toLocaleString()}.`,
        whatStandsOut: [
          `The highest value recorded was ${isCurrency ? "$" : ""}${peakPoint.value.toLocaleString()} in ${peakPoint.label}.`,
          `The lowest value recorded was ${isCurrency ? "$" : ""}${lowPoint.value.toLocaleString()} in ${lowPoint.label}.`,
          `The net difference between the start and end of the timeline is ${isCurrency ? "$" : ""}${Math.abs(Math.round(lastPeriod - firstPeriod)).toLocaleString()}.`,
        ],
        keyStats: [
          { label: "Starting Value", value: `${isCurrency ? "$" : ""}${firstPeriod.toLocaleString()}` },
          { label: "Latest Value", value: `${isCurrency ? "$" : ""}${lastPeriod.toLocaleString()}` },
          { label: "Net Change", value: `${deltaGrowth >= 0 ? "+" : ""}${deltaGrowth}%` },
          { label: "Time Periods", value: `${timeData.length} periods` },
        ],
        whyItMatters: `Tracking changes over time provides a clear view of historical direction, showing whether numbers are steadily rising, dropping, or staying consistent.`,
        takeaway: `Overall, ${primaryMeasure.replace(/_/g, " ")} has trended ${deltaGrowth >= 0 ? "upward" : "downward"} across the observed timeframe.`,
        trend: `${deltaGrowth >= 0 ? "+" : ""}${deltaGrowth}% net change across ${timeData.length} time periods.`,
      },
    });
  } else {
    // Cohort Hero Bar Chart
    const catMap: Record<string, number> = {};
    data.forEach((r) => {
      const k = String(r[primaryDim] || "General");
      const v = Number(r[primaryMeasure]) || 1;
      catMap[k] = (catMap[k] || 0) + v;
    });

    const catData = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k, v]) => ({ label: k, value: Math.round(v * 10) / 10 }));

    const topCategory = catData[0] ? catData[0].label : "Primary Group";
    const topVal = catData[0] ? catData[0].value : 0;
    const lowestCategory = catData[catData.length - 1] ? catData[catData.length - 1].label : "Smallest Group";
    const lowestVal = catData[catData.length - 1] ? catData[catData.length - 1].value : 0;
    const diff = Math.round(topVal - lowestVal);
    const totalCatVal = catData.reduce((acc, curr) => acc + curr.value, 0);
    const topPct = totalCatVal > 0 ? Math.round((topVal / totalCatVal) * 100) : 0;
    const top2Pct = catData.length > 1 && totalCatVal > 0 ? Math.round(((topVal + (catData[1]?.value || 0)) / totalCatVal) * 100) : topPct;

    charts.push({
      id: "chart_hero_cohort",
      type: "bar",
      title: `${primaryMeasure.replace(/_/g, " ").toUpperCase()} BY ${primaryDim.replace(/_/g, " ").toUpperCase()}`,
      xAxisLabel: primaryDim.replace(/_/g, " "),
      yAxisLabel: `Total ${primaryMeasure.replace(/_/g, " ")} (${isCurrency ? "$" : "Units"})`,
      data: catData,
      xKey: "label",
      yKey: "value",
      analysis: {
        whatItShows: `This chart compares ${primaryMeasure.replace(/_/g, " ")} across ${catData.length} ${primaryDim.replace(/_/g, " ")} groups.`,
        mainFinding: `${topCategory} is the largest group with ${isCurrency ? "$" : ""}${topVal.toLocaleString()} in ${primaryMeasure.replace(/_/g, " ")}, compared with ${isCurrency ? "$" : ""}${lowestVal.toLocaleString()} for ${lowestCategory}.`,
        whatStandsOut: [
          catData.length > 2
            ? `${topCategory} and ${catData[1]?.label} account for ${top2Pct}% of the total volume in this comparison.`
            : `${topCategory} accounts for ${topPct}% of the total volume.`,
          `There is a ${isCurrency ? "$" : ""}${diff.toLocaleString()} difference between the highest and lowest groups.`,
          `There are ${catData.length} distinct groups compared in this chart.`,
        ],
        keyStats: [
          { label: "Largest Group", value: `${topCategory} (${isCurrency ? "$" : ""}${topVal.toLocaleString()})` },
          { label: "Smallest Group", value: `${lowestCategory} (${isCurrency ? "$" : ""}${lowestVal.toLocaleString()})` },
          { label: "Difference", value: `${isCurrency ? "$" : ""}${diff.toLocaleString()}` },
          { label: "Groups Compared", value: `${catData.length} groups` },
        ],
        whyItMatters: `Comparing totals across ${primaryDim.replace(/_/g, " ")} shows where the majority of ${primaryMeasure.replace(/_/g, " ")} is concentrated.`,
        takeaway: `${topCategory} represents the largest share of ${primaryMeasure.replace(/_/g, " ")} in this dataset.`,
        trend: `${topCategory} leads with ${isCurrency ? "$" : ""}${topVal.toLocaleString()}, exceeding ${lowestCategory} by ${isCurrency ? "$" : ""}${diff.toLocaleString()}.`,
      },
    });
  }

  // 2. Volume Share Donut (STRICTLY LOW CARDINALITY ONLY: <= 6 unique values)
  const lowCardDim = profile.columns.find(
    (c) => c.semanticType === "categorical" && c.cardinality === "low" && c.uniqueCount <= 6
  );

  if (lowCardDim) {
    const donutCounts: Record<string, number> = {};
    data.forEach((r) => {
      const k = String(r[lowCardDim.name] || "Other");
      donutCounts[k] = (donutCounts[k] || 0) + 1;
    });

    const donutData = Object.entries(donutCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({
        label: k,
        name: k,
        value: v,
        pct: rowCount > 0 ? ((v / rowCount) * 100).toFixed(1) : "0",
      }));

    const topShare = donutData[0] ? donutData[0].label : "N/A";
    const topVal = donutData[0] ? donutData[0].value : 0;
    const topPct = donutData[0] ? donutData[0].pct : "0";
    const lowestShare = donutData[donutData.length - 1] ? donutData[donutData.length - 1].label : "N/A";
    const lowestVal = donutData[donutData.length - 1] ? donutData[donutData.length - 1].value : 0;
    const lowestPct = donutData[donutData.length - 1] ? donutData[donutData.length - 1].pct : "0";

    charts.push({
      id: "chart_secondary_donut",
      type: "pie",
      title: `${lowCardDim.name.replace(/_/g, " ").toUpperCase()} VOLUME SHARE`,
      xAxisLabel: lowCardDim.name.replace(/_/g, " "),
      yAxisLabel: "Volume Share",
      data: donutData,
      xKey: "label",
      yKey: "value",
      analysis: {
        whatItShows: `This chart shows how the ${rowCount} records are divided across ${donutData.length} ${lowCardDim.name.replace(/_/g, " ")} categories.`,
        mainFinding: `${topShare} makes up the largest share at ${topPct}% (${topVal.toLocaleString()} records), followed by ${donutData[1]?.label || "other groups"}.`,
        whatStandsOut: [
          `About ${Math.round(Number(topPct))}% of all records belong to the ${topShare} group.`,
          `${lowestShare} is the smallest group, accounting for ${lowestPct}% (${lowestVal.toLocaleString()} records).`,
          `There are ${donutData.length} distinct categories in this distribution.`,
        ],
        keyStats: [
          { label: "Largest Share", value: `${topShare} (${topPct}%)` },
          { label: "Smallest Share", value: `${lowestShare} (${lowestPct}%)` },
          { label: "Categories", value: `${donutData.length} categories` },
          { label: "Total Records", value: `${rowCount} records` },
        ],
        whyItMatters: `Category breakdowns provide a fast snapshot of group balance and show whether any single group commands most of the dataset.`,
        takeaway: `${topShare} is the most common category in this dataset.`,
        trend: `${topShare} is the largest group, representing ${topPct}% of all records.`,
      },
    });
  }

  // 3. Correlation Scatter Chart (If 2+ Measures Exist)
  if (measures.length >= 2) {
    const secMeasure = measures.find((m) => m !== primaryMeasure) || measures[1];
    const corrRel = relationships.find(
      (r) => r.type === "numeric_correlation" && (r.sourceColumn === primaryMeasure || r.targetColumn === primaryMeasure)
    );

    const scatterData = data
      .slice(0, 40)
      .map((r, i) => ({
        x: Number(r[primaryMeasure]) || 0,
        y: Number(r[secMeasure]) || 0,
        category: String(r[primaryDim] || `Point ${i + 1}`),
        label: String(r[primaryDim] || `P${i + 1}`),
      }))
      .filter((p) => !isNaN(p.x) && !isNaN(p.y));

    if (scatterData.length >= 5) {
      const rStrength = corrRel ? corrRel.strength : 0;
      const strengthWord = Math.abs(rStrength) >= 0.7 ? "strong" : Math.abs(rStrength) >= 0.4 ? "moderate" : "slight";
      const dirWord = rStrength > 0.1 ? "positive" : rStrength < -0.1 ? "inverse" : "neutral";

      charts.push({
        id: "chart_correlation_scatter",
        type: "scatter",
        title: `${primaryMeasure.replace(/_/g, " ").toUpperCase()} VS ${secMeasure.replace(/_/g, " ").toUpperCase()}`,
        xAxisLabel: primaryMeasure.replace(/_/g, " "),
        yAxisLabel: secMeasure.replace(/_/g, " "),
        data: scatterData,
        analysis: {
          whatItShows: `This chart compares ${primaryMeasure.replace(/_/g, " ")} against ${secMeasure.replace(/_/g, " ")} across ${scatterData.length} data points to see how the two numbers relate.`,
          mainFinding: corrRel
            ? `There is a ${strengthWord} ${dirWord} relationship between ${primaryMeasure.replace(/_/g, " ")} and ${secMeasure.replace(/_/g, " ")} (correlation score: ${rStrength}).`
            : `Data points show how ${primaryMeasure.replace(/_/g, " ")} and ${secMeasure.replace(/_/g, " ")} align across individual records.`,
          whatStandsOut: [
            Math.abs(rStrength) > 0.3
              ? `Higher values of ${primaryMeasure.replace(/_/g, " ")} generally align with ${rStrength > 0 ? "higher" : "lower"} values of ${secMeasure.replace(/_/g, " ")}.`
              : `Values are dispersed with no single dominant linear relationship.`,
            `The visual maps ${scatterData.length} individual data points across both measures.`,
            `Statistical association shows how numbers move together and does not prove that one causes the other.`,
          ],
          keyStats: [
            { label: "X-Axis Metric", value: primaryMeasure.replace(/_/g, " ") },
            { label: "Y-Axis Metric", value: secMeasure.replace(/_/g, " ") },
            { label: "Relationship", value: `${strengthWord} ${dirWord}` },
            { label: "Data Points", value: `${scatterData.length} points` },
          ],
          whyItMatters: `Examining relationships between metrics helps identify if changes in one number typically accompany changes in another.`,
          takeaway: Math.abs(rStrength) > 0.3
            ? `${primaryMeasure.replace(/_/g, " ")} and ${secMeasure.replace(/_/g, " ")} exhibit a noticeable ${dirWord} relationship in this dataset.`
            : `The relationship between ${primaryMeasure.replace(/_/g, " ")} and ${secMeasure.replace(/_/g, " ")} is relatively independent.`,
          trend: corrRel ? corrRel.description : `Comparison between ${primaryMeasure.replace(/_/g, " ")} and ${secMeasure.replace(/_/g, " ")}.`,
        },
      });
    }
  }

  // 4. Target Outcome Cross-Tabulation (If Target Outcome Column Exists)
  if (targets.length > 0) {
    const targetCol = targets[0];
    const groupTotals: Record<string, number> = {};
    const groupPositives: Record<string, number> = {};

    data.forEach((r) => {
      const k = String(r[primaryDim] || "General");
      groupTotals[k] = (groupTotals[k] || 0) + 1;
      if (Number(r[targetCol]) === 1 || String(r[targetCol]).toLowerCase() === "true" || String(r[targetCol]).toLowerCase() === "yes") {
        groupPositives[k] = (groupPositives[k] || 0) + 1;
      }
    });

    const crossData = Object.keys(groupTotals)
      .slice(0, 6)
      .map((k) => {
        const tot = groupTotals[k] || 1;
        const pos = groupPositives[k] || 0;
        return {
          label: k,
          value: Math.round((pos / tot) * 1000) / 10,
        };
      })
      .sort((a, b) => b.value - a.value);

    const topGroup = crossData[0] || { label: "N/A", value: 0 };
    const bottomGroup = crossData[crossData.length - 1] || { label: "N/A", value: 0 };
    const rateDiff = Math.round((topGroup.value - bottomGroup.value) * 10) / 10;

    charts.push({
      id: "chart_target_outcome",
      type: "bar",
      title: `${targetCol.replace(/_/g, " ").toUpperCase()} RATE BY ${primaryDim.replace(/_/g, " ").toUpperCase()}`,
      xAxisLabel: primaryDim.replace(/_/g, " "),
      yAxisLabel: `${targetCol.replace(/_/g, " ")} Rate (%)`,
      data: crossData,
      xKey: "label",
      yKey: "value",
      analysis: {
        whatItShows: `This chart compares the rate of ${targetCol.replace(/_/g, " ")} across different ${primaryDim.replace(/_/g, " ")} groups.`,
        mainFinding: `${topGroup.label} has the highest rate at ${topGroup.value}%, compared with ${bottomGroup.label} at ${bottomGroup.value}%.`,
        whatStandsOut: [
          `The difference between the highest and lowest group rate is ${rateDiff} percentage points.`,
          `Rates vary across the ${crossData.length} groups analyzed.`,
          `${topGroup.label} represents the group with the highest outcome frequency.`,
        ],
        keyStats: [
          { label: "Highest Rate", value: `${topGroup.label} (${topGroup.value}%)` },
          { label: "Lowest Rate", value: `${bottomGroup.label} (${bottomGroup.value}%)` },
          { label: "Difference", value: `${rateDiff}% points` },
          { label: "Groups Compared", value: `${crossData.length} groups` },
        ],
        whyItMatters: `Comparing outcome rates highlights which groups see the outcome most frequently and which see it least.`,
        takeaway: `${topGroup.label} has the highest frequency of ${targetCol.replace(/_/g, " ")} among the groups in this dataset.`,
        trend: `${topGroup.label} records the highest rate at ${topGroup.value}%, exceeding ${bottomGroup.label} by ${rateDiff} points.`,
      },
    });
  }

  return charts;
}
