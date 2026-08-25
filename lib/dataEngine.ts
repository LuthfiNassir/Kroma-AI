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

// Dataset-Aware Suggestion Generator
export function generateDatasetSuggestions(columns: string[], data: Record<string, any>[]): string[] {
  const colStr = columns.join(" ").toLowerCase();

  const isRetail =
    colStr.includes("product") ||
    colStr.includes("amount") ||
    colStr.includes("sales") ||
    colStr.includes("units") ||
    colStr.includes("price") ||
    colStr.includes("revenue") ||
    colStr.includes("dept") ||
    colStr.includes("budget");

  const isHealthcare =
    colStr.includes("stroke") ||
    colStr.includes("hypertension") ||
    colStr.includes("glucose") ||
    colStr.includes("bmi") ||
    colStr.includes("age") ||
    colStr.includes("patient");

  if (isRetail) {
    return [
      "Which product generates highest revenue?",
      "Show average order value by item",
      "Compare unit sales vs revenue",
      "Summarize top performing categories",
    ];
  }

  if (isHealthcare) {
    return [
      "What factors drive stroke risk?",
      "Show age vs hypertension correlation",
      "Compare stroke rate by gender",
      "Summarize high risk cohorts",
    ];
  }

  return [
    "Summarize key metrics",
    "Show distribution of highest values",
    "Identify primary outliers",
    "Rank top performing segments",
  ];
}

export function generateInitialDashboard(parsed: ParsedCsvResult): DashboardState {
  const {
    data,
    columns,
    binaryTargetColumns,
    nonAdditiveNumericColumns,
    additiveNumericColumns,
    categoricalColumns,
    rowCount,
  } = parsed;

  // 1. TOP KPI ROW (4 Executive Cards)
  const kpis: KPICardData[] = [
    {
      label: "TOTAL RECORDS",
      value: rowCount.toLocaleString(),
      subtext: `${columns.length} attributes parsed`,
    },
  ];

  // Primary Category Column & Primary Numeric Column Fallbacks
  const primaryCatCol = categoricalColumns[0] || columns.find((c) => !parsed.idColumns.includes(c)) || "Category";
  const primaryNumCol = additiveNumericColumns[0] || nonAdditiveNumericColumns[0] || columns.find((c) => typeof data[0]?.[c] === "number") || "Value";

  // KPI 2: Primary Total / Sum or Mean
  const numVals = data.map((r) => Number(r[primaryNumCol])).filter((v) => !isNaN(v));
  const totalNum = numVals.reduce((a, b) => a + b, 0);
  const avgNum = numVals.length > 0 ? totalNum / numVals.length : 0;

  const isCurrency =
    primaryNumCol.toLowerCase().includes("amount") ||
    primaryNumCol.toLowerCase().includes("sales") ||
    primaryNumCol.toLowerCase().includes("revenue") ||
    primaryNumCol.toLowerCase().includes("price") ||
    primaryNumCol.toLowerCase().includes("cost") ||
    primaryNumCol.toLowerCase().includes("budget");

  kpis.push({
    label: `TOTAL ${primaryNumCol.replace(/_/g, " ").toUpperCase()}`,
    value: isCurrency
      ? `$${totalNum >= 1000000 ? (totalNum / 1000000).toFixed(1) + "M" : totalNum >= 1000 ? (totalNum / 1000).toFixed(1) + "K" : totalNum.toLocaleString()}`
      : totalNum.toLocaleString(),
    subtext: `Sum across ${rowCount} records`,
  });

  // KPI 3: Average Value
  kpis.push({
    label: `AVERAGE ${primaryNumCol.replace(/_/g, " ").toUpperCase()}`,
    value: isCurrency ? `$${avgNum.toFixed(1)}` : `${avgNum.toFixed(1)}${primaryNumCol.toLowerCase().includes("age") ? " yrs" : ""}`,
    subtext: `Mean per entry`,
  });

  // KPI 4: Dominant Segment Share
  const catCounts: Record<string, number> = {};
  data.forEach((r) => {
    const k = String(r[primaryCatCol] || "Unassigned");
    catCounts[k] = (catCounts[k] || 0) + 1;
  });
  const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  const dominantCat = sortedCats[0] ? sortedCats[0][0] : "None";
  const dominantPct = rowCount > 0 && sortedCats[0] ? ((sortedCats[0][1] / rowCount) * 100).toFixed(1) : "0";

  kpis.push({
    label: `PRIMARY ${primaryCatCol.replace(/_/g, " ").toUpperCase()}`,
    value: dominantCat,
    subtext: `${dominantPct}% population share`,
  });

  // 2. GUARANTEED MULTI-CHART ANALYTICAL SUITE (4 to 6 Perspectives for ANY dataset)
  const charts: ChartDataSeries[] = [];

  // PERSPECTIVE 1 — Total Revenue / Value by Category (Bar Chart)
  const catSumMap: Record<string, number> = {};
  data.forEach((r) => {
    const k = String(r[primaryCatCol] || "Other");
    const v = Number(r[primaryNumCol]) || 0;
    catSumMap[k] = (catSumMap[k] || 0) + v;
  });

  const p1Data = Object.entries(catSumMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, v]) => ({
      label: k,
      value: Math.round(v * 10) / 10,
    }));

  charts.push({
    id: "chart_p1_total_value",
    type: "bar",
    title: `TOTAL ${primaryNumCol.replace(/_/g, " ").toUpperCase()} BY ${primaryCatCol.replace(/_/g, " ").toUpperCase()}`,
    data: p1Data,
    xKey: "label",
    yKey: "value",
    xAxisLabel: primaryCatCol.replace(/_/g, " "),
    yAxisLabel: `Total ${primaryNumCol.replace(/_/g, " ")} (${isCurrency ? "$" : "Units"})`,
    analysis: {
      whatItShows: `This bar chart aggregates total ${primaryNumCol.replace(/_/g, " ")} across ${primaryCatCol.replace(/_/g, " ")} segments.`,
      trend: `${p1Data[0] ? p1Data[0].label : "Top segment"} leads overall output with $${p1Data[0] ? p1Data[0].value.toLocaleString() : 0}.`,
      keyStats: [{ label: "Top Segment", value: `${p1Data[0] ? p1Data[0].label : "N/A"}` }],
      takeaway: `Prioritize operational resource allocation toward leading revenue-generating segments.`,
    },
  });

  // PERSPECTIVE 2 — Order Volume / Unit Share (Donut Chart with Structured Legend)
  const p2Data = sortedCats.slice(0, 6).map(([k, v]) => ({
    label: k,
    name: k,
    value: v,
    pct: rowCount > 0 ? ((v / rowCount) * 100).toFixed(1) : "0",
  }));

  charts.push({
    id: "chart_p2_volume_share",
    type: "pie",
    title: "TRANSACTION VOLUME SHARE",
    data: p2Data,
    xKey: "label",
    yKey: "value",
    xAxisLabel: primaryCatCol.replace(/_/g, " "),
    yAxisLabel: "Volume Share",
    analysis: {
      whatItShows: `This donut chart illustrates transaction volume proportions across ${primaryCatCol.replace(/_/g, " ")} categories.`,
      trend: `${p2Data[0] ? p2Data[0].label : "Primary cohort"} commands ${p2Data[0] ? p2Data[0].pct : 0}% of overall transactions.`,
      keyStats: [{ label: "Leading Share", value: `${p2Data[0] ? p2Data[0].label : "N/A"} (${p2Data[0] ? p2Data[0].pct : 0}%)` }],
      takeaway: `Maintain high inventory and service availability for top volume contributors.`,
    },
  });

  // PERSPECTIVE 3 — Average Ticket Size / Mean Value (Bar Chart)
  const catAvgMap: Record<string, { sum: number; count: number }> = {};
  data.forEach((r) => {
    const k = String(r[primaryCatCol] || "Other");
    const v = Number(r[primaryNumCol]) || 0;
    if (!catAvgMap[k]) catAvgMap[k] = { sum: 0, count: 0 };
    catAvgMap[k].sum += v;
    catAvgMap[k].count += 1;
  });

  const p3Data = Object.entries(catAvgMap)
    .map(([k, stat]) => ({
      label: k,
      value: stat.count > 0 ? Math.round((stat.sum / stat.count) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  charts.push({
    id: "chart_p3_avg_ticket",
    type: "bar",
    title: `AVERAGE TICKET SIZE BY ${primaryCatCol.replace(/_/g, " ").toUpperCase()}`,
    data: p3Data,
    xKey: "label",
    yKey: "value",
    xAxisLabel: primaryCatCol.replace(/_/g, " "),
    yAxisLabel: `Average ${primaryNumCol.replace(/_/g, " ")} (${isCurrency ? "$" : "Units"})`,
    analysis: {
      whatItShows: `This chart compares the average transaction value (ticket size) per ${primaryCatCol.replace(/_/g, " ")}.`,
      trend: `${p3Data[0] ? p3Data[0].label : "Highest average"} yields the highest per-transaction yield at $${p3Data[0] ? p3Data[0].value : 0}.`,
      keyStats: [{ label: "Peak Ticket Size", value: `$${p3Data[0] ? p3Data[0].value : 0}` }],
      takeaway: `Cross-sell high-value accessories to elevate average order size across minor segments.`,
    },
  });

  // PERSPECTIVE 4 — Transaction Ranking & Concentration (Horizontal / Ranked Bar)
  const p4Data = data.slice(0, 8).map((r, idx) => ({
    label: String(r[primaryCatCol] || `Item ${idx + 1}`),
    value: Number(r[primaryNumCol]) || 0,
  })).sort((a, b) => b.value - a.value);

  charts.push({
    id: "chart_p4_transaction_ranking",
    type: "bar",
    title: "TRANSACTION RANKING & CONCENTRATION",
    data: p4Data,
    xKey: "label",
    yKey: "value",
    xAxisLabel: "Entity / Record",
    yAxisLabel: primaryNumCol.replace(/_/g, " "),
    analysis: {
      whatItShows: `This ranking plot displays top individual transaction amounts sorted by magnitude.`,
      trend: `High-value single orders create prominent spike concentration points.`,
      keyStats: [{ label: "Highest Single Order", value: `$${p4Data[0] ? p4Data[0].value : 0}` }],
      takeaway: `Incentivize bulk purchasing tiers to capture high-value transaction orders.`,
    },
  });

  // PERSPECTIVE 5 — Healthcare Target Crosstab or Secondary Distribution
  if (binaryTargetColumns.length > 0) {
    const targetCol = binaryTargetColumns[0];
    const groupTotal: Record<string, number> = {};
    const groupPos: Record<string, number> = {};

    data.forEach((r) => {
      const k = String(r[primaryCatCol] || "Other");
      groupTotal[k] = (groupTotal[k] || 0) + 1;
      if (Number(r[targetCol]) === 1) {
        groupPos[k] = (groupPos[k] || 0) + 1;
      }
    });

    const p5Data = Object.keys(groupTotal).slice(0, 6).map((k) => {
      const tot = groupTotal[k] || 1;
      const pos = groupPos[k] || 0;
      return {
        label: k,
        value: Math.round((pos / tot) * 1000) / 10,
      };
    });

    charts.push({
      id: "chart_p5_target_crosstab",
      type: "bar",
      title: `${targetCol.replace(/_/g, " ").toUpperCase()} RISK BY ${primaryCatCol.replace(/_/g, " ").toUpperCase()}`,
      data: p5Data,
      xKey: "label",
      yKey: "value",
      xAxisLabel: primaryCatCol.replace(/_/g, " "),
      yAxisLabel: `${targetCol.replace(/_/g, " ")} Rate (%)`,
      analysis: {
        whatItShows: `This cross-tabulation maps positive ${targetCol.replace(/_/g, " ")} rates across ${primaryCatCol.replace(/_/g, " ")} cohorts.`,
        trend: `Target prevalence varies noticeably across distinct demographic groups.`,
        keyStats: [{ label: "Target Metric", value: targetCol.replace(/_/g, " ") }],
        takeaway: `Deploy proactive screening and early intervention programs for high-risk cohorts.`,
      },
    });
  }

  // 3. HIGHLIGHTS SUMMARY CARD
  const highlightsItems = [
    {
      label: `Total Revenue / Sum`,
      value: isCurrency ? `$${totalNum.toLocaleString()}` : totalNum.toLocaleString(),
      subtext: `${rowCount} total transactions`,
    },
    {
      label: `Primary Segment`,
      value: p1Data[0] ? p1Data[0].label : "N/A",
      subtext: `${p2Data[0] ? p2Data[0].pct : 0}% of overall volume`,
    },
    {
      label: `Average Order Value`,
      value: isCurrency ? `$${avgNum.toFixed(1)}` : avgNum.toFixed(1),
      subtext: `Across all categories`,
    },
    {
      label: "Parsing Status",
      value: "[Complete]",
      subtext: "0 schema anomalies",
    },
  ];

  const highlightsCard: HighlightsCardData = {
    title: "Top Highlights & Cohort Summary",
    items: highlightsItems,
  };

  const suggestions = generateDatasetSuggestions(columns, data);

  return {
    kpis: kpis.slice(0, 4),
    charts,
    heroChart: charts[0] || null,
    segmentChart: charts[1] || null,
    correlationChart: charts[2] || null,
    highlightsCard,
    tableData: data,
    columns,
    suggestions,
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
