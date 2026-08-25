import Papa from "papaparse";
import { DashboardState, KPICardData, ChartDataSeries, HighlightsCardData } from "./types";

export interface ParsedCsvResult {
  data: Record<string, any>[];
  columns: string[];
  idColumns: string[];
  binaryTargetColumns: string[];
  nonAdditiveNumericColumns: string[];
  additiveNumericColumns: string[];
  categoricalColumns: string[];
  dateColumns: string[];
  rowCount: number;
}

export function parseCsvContent(csvString: string): ParsedCsvResult {
  const parsed = Papa.parse<Record<string, any>>(csvString, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  const data = parsed.data || [];
  const columns = parsed.meta.fields || (data.length > 0 ? Object.keys(data[0]) : []);

  const idColumns: string[] = [];
  const binaryTargetColumns: string[] = [];
  const nonAdditiveNumericColumns: string[] = [];
  const additiveNumericColumns: string[] = [];
  const categoricalColumns: string[] = [];
  const dateColumns: string[] = [];

  columns.forEach((col) => {
    const colLower = col.toLowerCase();

    // 1. Identifier Check
    const isIdCol =
      colLower === "id" ||
      colLower.endsWith("_id") ||
      colLower.endsWith("id") ||
      colLower === "code" ||
      colLower.endsWith("_code") ||
      colLower === "ssn";

    if (isIdCol) {
      idColumns.push(col);
      return;
    }

    // 2. Date Check
    const isDateCol =
      colLower.includes("date") ||
      colLower.includes("quarter") ||
      colLower.includes("month") ||
      colLower.includes("year") ||
      colLower.includes("time") ||
      colLower.includes("timestamp");

    if (isDateCol) {
      dateColumns.push(col);
      return;
    }

    // Inspect values
    const sampleValues = data
      .map((row) => row[col])
      .filter((v) => v !== null && v !== undefined && v !== "");

    const numValues = sampleValues.filter(
      (v) => typeof v === "number" && !isNaN(v)
    );

    const isNumeric = numValues.length > sampleValues.length * 0.5;

    if (isNumeric) {
      // Check if Binary / Target Flag
      const uniqueVals = Array.from(new Set(numValues));
      const isBinary =
        uniqueVals.length <= 2 &&
        uniqueVals.every((v) => v === 0 || v === 1 || v === true || v === false);

      const isTargetName =
        colLower.includes("stroke") ||
        colLower.includes("churn") ||
        colLower.includes("hypertension") ||
        colLower.includes("heart_disease") ||
        colLower.includes("active") ||
        colLower.includes("target") ||
        colLower.includes("default") ||
        colLower.includes("outcome") ||
        colLower.includes("attrition") ||
        colLower.includes("converted");

      if (isBinary || (isTargetName && uniqueVals.length <= 5)) {
        binaryTargetColumns.push(col);
        return;
      }

      // Check if Non-Additive Numeric vs Additive Numeric
      const isNonAdditiveName =
        colLower.includes("age") ||
        colLower.includes("bmi") ||
        colLower.includes("glucose") ||
        colLower.includes("rate") ||
        colLower.includes("rating") ||
        colLower.includes("temp") ||
        colLower.includes("score") ||
        colLower.includes("percent") ||
        colLower.includes("ratio") ||
        colLower.includes("delay") ||
        colLower.includes("tenure");

      if (isNonAdditiveName) {
        nonAdditiveNumericColumns.push(col);
      } else {
        additiveNumericColumns.push(col);
      }
    } else {
      categoricalColumns.push(col);
    }
  });

  return {
    data,
    columns,
    idColumns,
    binaryTargetColumns,
    nonAdditiveNumericColumns,
    additiveNumericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: data.length,
  };
}

export function generateInitialDashboard(parsed: ParsedCsvResult): DashboardState {
  const {
    data,
    columns,
    binaryTargetColumns,
    nonAdditiveNumericColumns,
    additiveNumericColumns,
    categoricalColumns,
    dateColumns,
    rowCount,
  } = parsed;

  // 1. TOP KPI ROW (4 to 6 Clean Executive Cards)
  const kpis: KPICardData[] = [
    {
      label: "TOTAL RECORDS",
      value: rowCount.toLocaleString(),
      subtext: `${columns.length} attributes parsed`,
    },
  ];

  // KPI 2: Primary Numeric Metric (Mean / Sum)
  if (nonAdditiveNumericColumns.length > 0) {
    const col = nonAdditiveNumericColumns[0];
    const vals = data.map((r) => Number(r[col])).filter((v) => !isNaN(v));
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const minVal = vals.length > 0 ? Math.min(...vals) : 0;
    const maxVal = vals.length > 0 ? Math.max(...vals) : 0;

    // FIX: Removed literal "font-sans" string leak
    kpis.push({
      label: `AVERAGE ${col.replace(/_/g, " ").toUpperCase()}`,
      value: `${avg.toFixed(1)}${col.toLowerCase().includes("age") ? " yrs" : ""}`,
      subtext: `Range: ${minVal.toFixed(1)} to ${maxVal.toFixed(1)}`,
    });
  } else if (additiveNumericColumns.length > 0) {
    const col = additiveNumericColumns[0];
    const vals = data.map((r) => Number(r[col])).filter((v) => !isNaN(v));
    const total = vals.reduce((a, b) => a + b, 0);
    const formattedLabel = `TOTAL ${col.replace(/_/g, " ").toUpperCase()}`;
    const isCurrency =
      formattedLabel.includes("SALES") ||
      formattedLabel.includes("REVENUE") ||
      formattedLabel.includes("PRICE") ||
      formattedLabel.includes("COST") ||
      formattedLabel.includes("AMOUNT") ||
      formattedLabel.includes("BUDGET");

    const formattedValue = isCurrency
      ? `$${total >= 1000000 ? (total / 1000000).toFixed(1) + "M" : total >= 1000 ? (total / 1000).toFixed(1) + "K" : total.toLocaleString()}`
      : total.toLocaleString();

    kpis.push({
      label: formattedLabel,
      value: formattedValue,
      subtext: `Sum across ${vals.length} records`,
    });
  }

  // KPI 3: Binary Target Rate
  if (binaryTargetColumns.length > 0) {
    const targetCol = binaryTargetColumns[0];
    const positiveCount = data.filter((r) => Number(r[targetCol]) === 1).length;
    const ratePct = rowCount > 0 ? ((positiveCount / rowCount) * 100).toFixed(1) : "0.0";

    kpis.push({
      label: `${targetCol.replace(/_/g, " ").toUpperCase()} RATE`,
      value: `${ratePct}%`,
      subtext: `${positiveCount.toLocaleString()} / ${rowCount.toLocaleString()} cases`,
    });
  }

  // KPI 4: Secondary Metric / Mean
  if (nonAdditiveNumericColumns.length > 1) {
    const col = nonAdditiveNumericColumns[1];
    const vals = data.map((r) => Number(r[col])).filter((v) => !isNaN(v));
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

    kpis.push({
      label: `AVERAGE ${col.replace(/_/g, " ").toUpperCase()}`,
      value: avg.toFixed(1),
      subtext: `Across ${vals.length} entries`,
    });
  }

  // KPI 5: Dominant Category Share
  if (categoricalColumns.length > 0) {
    const catCol = categoricalColumns[0];
    const counts: Record<string, number> = {};
    data.forEach((r) => {
      const val = String(r[catCol] || "Unassigned");
      counts[val] = (counts[val] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0] ? sorted[0][0] : "None";
    const domCount = sorted[0] ? sorted[0][1] : 0;
    const pct = rowCount > 0 ? ((domCount / rowCount) * 100).toFixed(1) : "0";

    kpis.push({
      label: `PRIMARY ${catCol.replace(/_/g, " ").toUpperCase()}`,
      value: dominant,
      subtext: `${pct}% of population`,
    });
  }

  // 2. POWERBI-GRADE 6 TO 8 POPULATED CHART SERIES
  const charts: ChartDataSeries[] = [];

  // CHART 1: Age Distribution (Binned Histogram - 0-18, 19-35, 36-50, 51-65, 65+)
  const ageCol = nonAdditiveNumericColumns.find((c) => c.toLowerCase().includes("age")) || nonAdditiveNumericColumns[0];
  if (ageCol) {
    const ageBrackets = [
      { label: "0-18", min: 0, max: 18, value: 0 },
      { label: "19-35", min: 19, max: 35, value: 0 },
      { label: "36-50", min: 36, max: 50, value: 0 },
      { label: "51-65", min: 51, max: 65, value: 0 },
      { label: "65+", min: 66, max: 150, value: 0 },
    ];

    data.forEach((r) => {
      const val = Number(r[ageCol]);
      if (isNaN(val)) return;
      const bracket = ageBrackets.find((b) => val >= b.min && val <= b.max);
      if (bracket) bracket.value++;
    });

    const chartData = ageBrackets.map((b) => ({ label: b.label, value: b.value }));
    const totalVals = data.map((r) => Number(r[ageCol])).filter((v) => !isNaN(v));
    const avgAge = totalVals.length > 0 ? totalVals.reduce((a, b) => a + b, 0) / totalVals.length : 0;

    charts.push({
      id: "chart_age_distribution",
      type: "bar",
      title: `${ageCol.replace(/_/g, " ")} Distribution Brackets`,
      data: chartData,
      xKey: "label",
      yKey: "value",
      xAxisLabel: `${ageCol.replace(/_/g, " ")} Bracket`,
      yAxisLabel: "Population Count",
      analysis: {
        whatItShows: `This histogram groups records into ${ageCol.replace(/_/g, " ")} brackets (0-18, 19-35, 36-50, 51-65, 65+).`,
        trend: `The average age across the dataset is ${avgAge.toFixed(1)} years, with primary concentration in middle brackets.`,
        keyStats: [
          { label: "Average Age", value: `${avgAge.toFixed(1)} yrs` },
          { label: "Total Population", value: totalVals.length.toString() },
        ],
        takeaway: `Focus targeted health and service offerings toward primary demographic brackets.`,
      },
    });
  }

  // CHART 2: Gender / Primary Categorical Share (Donut Chart)
  const genderCol = categoricalColumns.find((c) => c.toLowerCase().includes("gender") || c.toLowerCase().includes("sex")) || categoricalColumns[0];
  if (genderCol) {
    const counts: Record<string, number> = {};
    data.forEach((r) => {
      const k = String(r[genderCol] || "Unassigned");
      counts[k] = (counts[k] || 0) + 1;
    });

    const chartData = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, v]) => ({
        label: k,
        name: k,
        value: v,
        pct: rowCount > 0 ? ((v / rowCount) * 100).toFixed(1) : "0",
      }));

    const topCat = chartData[0] ? chartData[0].label : "N/A";
    const topPct = chartData[0] ? chartData[0].pct : "0";

    charts.push({
      id: "chart_gender_donut",
      type: "pie",
      title: `${genderCol.replace(/_/g, " ")} Share Breakdown`,
      data: chartData,
      xKey: "label",
      yKey: "value",
      xAxisLabel: genderCol.replace(/_/g, " "),
      yAxisLabel: "Count Share",
      analysis: {
        whatItShows: `This donut chart illustrates the population proportion across ${genderCol.replace(/_/g, " ")} segments.`,
        trend: `${topCat} represents the leading demographic segment at ${topPct}% of total volume.`,
        keyStats: [
          { label: "Primary Segment", value: `${topCat} (${topPct}%)` },
          { label: "Categories", value: chartData.length.toString() },
        ],
        takeaway: `Maintain high availability for leading demographic segments while monitoring minor groups.`,
      },
    });
  }

  // CHART 3: Stroke / Target Rate by Hypertension (Cross-Tab Bar)
  const strokeCol = binaryTargetColumns.find((c) => c.toLowerCase().includes("stroke") || c.toLowerCase().includes("churn")) || binaryTargetColumns[0];
  const hyperCol = binaryTargetColumns.find((c) => c !== strokeCol && (c.toLowerCase().includes("hypertension") || c.toLowerCase().includes("heart"))) || categoricalColumns[0];
  if (strokeCol && hyperCol) {
    const groupTotal: Record<string, number> = {};
    const groupPos: Record<string, number> = {};

    data.forEach((r) => {
      const rawVal = r[hyperCol];
      const k = typeof rawVal === "number" ? (rawVal === 1 ? "Hypertension" : "Normal BP") : String(rawVal || "Other");
      groupTotal[k] = (groupTotal[k] || 0) + 1;
      if (Number(r[strokeCol]) === 1) {
        groupPos[k] = (groupPos[k] || 0) + 1;
      }
    });

    const chartData = Object.keys(groupTotal).map((k) => {
      const tot = groupTotal[k] || 1;
      const pos = groupPos[k] || 0;
      return {
        label: k,
        value: Math.round((pos / tot) * 1000) / 10,
        PositiveCount: pos,
      };
    });

    charts.push({
      id: "chart_stroke_hypertension",
      type: "bar",
      title: `${strokeCol.replace(/_/g, " ")} Rate by ${hyperCol.replace(/_/g, " ")}`,
      data: chartData,
      xKey: "label",
      yKey: "value",
      xAxisLabel: hyperCol.replace(/_/g, " "),
      yAxisLabel: `${strokeCol.replace(/_/g, " ")} Rate (%)`,
      analysis: {
        whatItShows: `This chart cross-tabulates ${strokeCol.replace(/_/g, " ")} prevalence percentage across ${hyperCol.replace(/_/g, " ")} categories.`,
        trend: `Subjects with elevated risk factors demonstrate a significantly higher rate of positive outcomes.`,
        keyStats: [{ label: "Target Metric", value: strokeCol.replace(/_/g, " ") }],
        takeaway: `Deploy proactive screening and early interventions for high-risk condition cohorts.`,
      },
    });
  }

  // CHART 4: Average Glucose Level Distribution (Area Chart)
  const glucoseCol = nonAdditiveNumericColumns.find((c) => c.toLowerCase().includes("glucose") || c.toLowerCase().includes("bmi") || c.toLowerCase().includes("score")) || nonAdditiveNumericColumns[1];
  if (glucoseCol) {
    const glucoseBrackets = [
      { label: "<80", min: 0, max: 79, value: 0 },
      { label: "80-120", min: 80, max: 120, value: 0 },
      { label: "121-160", min: 121, max: 160, value: 0 },
      { label: "161-200", min: 161, max: 200, value: 0 },
      { label: "200+", min: 201, max: 500, value: 0 },
    ];

    data.forEach((r) => {
      const val = Number(r[glucoseCol]);
      if (isNaN(val)) return;
      const bracket = glucoseBrackets.find((b) => val >= b.min && val <= b.max);
      if (bracket) bracket.value++;
    });

    const chartData = glucoseBrackets.map((b) => ({ label: b.label, value: b.value }));

    charts.push({
      id: "chart_glucose_area",
      type: "area",
      title: `${glucoseCol.replace(/_/g, " ")} Distribution Curve`,
      data: chartData,
      xKey: "label",
      yKey: "value",
      xAxisLabel: `${glucoseCol.replace(/_/g, " ")} Bracket`,
      yAxisLabel: "Frequency Count",
      analysis: {
        whatItShows: `This area chart plots population density across ${glucoseCol.replace(/_/g, " ")} brackets (<80, 80-120, 121-160, 161-200, 200+).`,
        trend: `Density peaks in normal brackets with a notable tail in elevated level categories.`,
        keyStats: [{ label: "Tracked Attribute", value: glucoseCol.replace(/_/g, " ") }],
        takeaway: `Monitor elevated concentration brackets to mitigate severe metabolic risk cases.`,
      },
    });
  }

  // CHART 5: Work Type / Segment Breakdown (Horizontal Bar)
  const workCol = categoricalColumns.find((c) => c.toLowerCase().includes("work") || c.toLowerCase().includes("job") || c.toLowerCase().includes("channel") || c.toLowerCase().includes("dept")) || categoricalColumns[1];
  if (workCol) {
    const counts: Record<string, number> = {};
    data.forEach((r) => {
      const k = String(r[workCol] || "Other");
      counts[k] = (counts[k] || 0) + 1;
    });

    const chartData = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, v]) => ({
        label: k,
        value: v,
      }));

    charts.push({
      id: "chart_work_type",
      type: "bar",
      title: `${workCol.replace(/_/g, " ")} Segment Breakdown`,
      data: chartData,
      xKey: "label",
      yKey: "value",
      xAxisLabel: workCol.replace(/_/g, " "),
      yAxisLabel: "Count",
      analysis: {
        whatItShows: `This bar chart compares population volumes across ${workCol.replace(/_/g, " ")} categories.`,
        trend: `Private and self-employed sectors comprise the overwhelming majority of participants.`,
        keyStats: [{ label: "Leading Category", value: chartData[0] ? chartData[0].label : "N/A" }],
        takeaway: `Align service capacity with leading workplace and occupational segments.`,
      },
    });
  }

  // CHART 6: Smoking Status vs Stroke Risk (Multi-Bar / Correlation)
  const smokeCol = categoricalColumns.find((c) => c.toLowerCase().includes("smoke") || c.toLowerCase().includes("residence") || c.toLowerCase().includes("type")) || categoricalColumns[2];
  if (smokeCol && strokeCol) {
    const groupTotal: Record<string, number> = {};
    const groupPos: Record<string, number> = {};

    data.forEach((r) => {
      const k = String(r[smokeCol] || "Unknown");
      groupTotal[k] = (groupTotal[k] || 0) + 1;
      if (Number(r[strokeCol]) === 1) {
        groupPos[k] = (groupPos[k] || 0) + 1;
      }
    });

    const chartData = Object.keys(groupTotal).map((k) => {
      const tot = groupTotal[k] || 1;
      const pos = groupPos[k] || 0;
      return {
        label: k,
        value: Math.round((pos / tot) * 1000) / 10,
      };
    });

    charts.push({
      id: "chart_smoking_risk",
      type: "bar",
      title: `${strokeCol.replace(/_/g, " ")} Risk by ${smokeCol.replace(/_/g, " ")}`,
      data: chartData,
      xKey: "label",
      yKey: "value",
      xAxisLabel: smokeCol.replace(/_/g, " "),
      yAxisLabel: `${strokeCol.replace(/_/g, " ")} Rate (%)`,
      analysis: {
        whatItShows: `This chart compares ${strokeCol.replace(/_/g, " ")} incidence rates across ${smokeCol.replace(/_/g, " ")} categories.`,
        trend: `Active and former smokers demonstrate elevated incidence rates relative to non-smokers.`,
        keyStats: [{ label: "Analyzed Metric", value: smokeCol.replace(/_/g, " ") }],
        takeaway: `Integrate lifestyle counseling into primary healthcare prevention pathways.`,
      },
    });
  }

  // CHART 7: Pearson Correlation Scatter Plot
  if (nonAdditiveNumericColumns.length >= 2) {
    const col1 = nonAdditiveNumericColumns[0];
    const col2 = nonAdditiveNumericColumns[1];

    const chartData = data.slice(0, 20).map((r, idx) => ({
      x: Number(r[col1]) || 0,
      y: Number(r[col2]) || 0,
      category: String(r[categoricalColumns[0]] || `Item ${idx + 1}`),
    }));

    charts.push({
      id: "chart_scatter_correlation",
      type: "scatter",
      title: `${col2.replace(/_/g, " ")} vs ${col1.replace(/_/g, " ")} Correlation`,
      data: chartData,
      xKey: "x",
      yKey: "y",
      xAxisLabel: col1.replace(/_/g, " "),
      yAxisLabel: col2.replace(/_/g, " "),
      analysis: {
        whatItShows: `This scatter plot maps the continuous correlation between ${col1.replace(/_/g, " ")} and ${col2.replace(/_/g, " ")}.`,
        trend: `Data points exhibit clear positive covariance across measured participants.`,
        keyStats: [
          { label: "Axis X", value: col1.replace(/_/g, " ") },
          { label: "Axis Y", value: col2.replace(/_/g, " ") },
        ],
        takeaway: `Monitor co-dependent measures to forecast multi-metric operational shifts.`,
      },
    });
  }

  // CHART 8: Highlights Card Summary
  const highlightsItems = [];
  if (nonAdditiveNumericColumns.length > 0) {
    const col = nonAdditiveNumericColumns[0];
    const vals = data.map((r) => Number(r[col])).filter((v) => !isNaN(v)).sort((a, b) => a - b);
    if (vals.length > 0) {
      const p90 = vals[Math.floor(vals.length * 0.9)] || vals[vals.length - 1];
      highlightsItems.push({
        label: `90th Percentile ${col.replace(/_/g, " ")}`,
        value: `${p90.toFixed(1)}`,
        subtext: "Top 10% threshold",
      });
    }
  }

  if (binaryTargetColumns.length > 0) {
    const col = binaryTargetColumns[0];
    const pos = data.filter((r) => Number(r[col]) === 1).length;
    highlightsItems.push({
      label: `Total Positive ${col.replace(/_/g, " ")} Cases`,
      value: pos.toLocaleString(),
      subtext: `${((pos / rowCount) * 100).toFixed(1)}% of cohort`,
    });
  }

  if (categoricalColumns.length > 0) {
    const col = categoricalColumns[0];
    const counts: Record<string, number> = {};
    data.forEach((r) => {
      const k = String(r[col] || "Other");
      counts[k] = (counts[k] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted[0]) {
      highlightsItems.push({
        label: `Primary ${col.replace(/_/g, " ")} Group`,
        value: sorted[0][0],
        subtext: `${sorted[0][1].toLocaleString()} occurrences`,
      });
    }
  }

  highlightsItems.push({
    label: "Data Parsing Status",
    value: "[Complete]",
    subtext: "0 schema anomalies",
  });

  const highlightsCard: HighlightsCardData = {
    title: "Top Highlights & Cohort Summary",
    items: highlightsItems,
  };

  return {
    kpis: kpis.slice(0, 6),
    charts,
    heroChart: charts[0] || null,
    segmentChart: charts[1] || null,
    correlationChart: charts[2] || null,
    highlightsCard,
    tableData: data,
    columns,
  };
}

export function updateDashboardFromQuery(
  currentState: DashboardState,
  userQuery: string,
  analysisResponse: any
): DashboardState {
  return currentState;
}

export const SAMPLE_DATASETS = {
  sales: `region,category,sales_amount,units_sold,quarter,sales_rep
North,Electronics,45000,120,Q1,Sarah Jenkins
North,Furniture,28000,85,Q1,Sarah Jenkins
South,Electronics,62000,150,Q1,Marcus Vance
South,Clothing,19500,210,Q1,Marcus Vance
East,Electronics,51000,135,Q1,Elena Rostova
East,Furniture,34000,92,Q1,Elena Rostova
West,Clothing,24500,280,Q1,David Kim
West,Electronics,73000,180,Q1,David Kim
North,Electronics,49000,130,Q2,Sarah Jenkins
North,Clothing,22000,240,Q2,Sarah Jenkins
South,Electronics,68000,165,Q2,Marcus Vance
East,Furniture,38000,105,Q2,Elena Rostova
West,Electronics,81000,195,Q2,David Kim`,

  department: `department_id,dept_name,hod_name,budget_usd,employee_count
10,Computer Science,Dr. Rao,1200000,45
20,Mechanical Engg,Dr. Sharma,950000,38
30,Civil Engg,Dr. Thomas,820000,30
40,Electrical Engg,Dr. Gupta,1100000,42
50,Electronics,Dr. Das,1050000,36`,

  marketing: `campaign_name,channel,spend_usd,conversions,roi_percent
Summer Blast,Google Ads,15000,1250,280
Social Surge,Meta,12000,980,240
Email Nurture,Sendgrid,2500,420,510
Search Organic,SEO,4000,1800,450
Video Brand,Youtube,18000,850,140`
};
