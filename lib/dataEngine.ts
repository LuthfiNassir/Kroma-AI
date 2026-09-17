import Papa from "papaparse";
import {
  DashboardState,
  DatasetArchetype,
  DatasetIntelligenceProfile,
  DatasetSourceType,
  SemanticColumnType,
} from "./types";
import { buildDatasetIntelligenceProfile } from "./dataIntelligence";
import { synthesizeDashboardSpec, refreshDashboardWithFocus, generateContextAwareSuggestions } from "./dashboardEngine";
import { generateTrajectorySeries } from "./visualizationEngine";

export interface ParsedCsvResult {
  data: Record<string, any>[];
  columns: string[];
  idColumns: string[];
  binaryTargetColumns: string[];
  nonAdditiveNumericColumns: string[];
  additiveNumericColumns: string[];
  categoricalColumns: string[];
  lowCardinalityCategories: string[];
  highCardinalityTextColumns: string[];
  dateColumns: string[];
  rowCount: number;
  profile?: DatasetIntelligenceProfile;
  sourceType?: DatasetSourceType;
}

export interface TabularValidationResult {
  isValid: boolean;
  error?: string;
  rowCount: number;
  columnCount: number;
  columns: string[];
  previewRows: Record<string, any>[];
  delimiter?: string;
}

// Pre-flight Tabular Validation for CSV and Pasted Text
export function validateTabularInput(rawText: string): TabularValidationResult {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: "Paste some tabular data to continue.",
      rowCount: 0,
      columnCount: 0,
      columns: [],
      previewRows: [],
    };
  }

  const parsed = Papa.parse<Record<string, any>>(trimmed, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: true,
    delimiter: "", // Auto-detect delimiter (comma, tab, semicolon, pipe)
  });

  const fields = (parsed.meta.fields || []).map((f) => (f ? f.trim() : "")).filter((f) => f.length > 0);
  const rows = (parsed.data || []).filter((r) => r && Object.keys(r).length > 0);

  if (fields.length === 0) {
    return {
      isValid: false,
      error: "Couldn't read this as tabular data. Check that your first row contains column names and that each row uses the same separators.",
      rowCount: 0,
      columnCount: 0,
      columns: [],
      previewRows: [],
    };
  }

  if (rows.length === 0) {
    return {
      isValid: false,
      error: "Detected column headers, but no data records were found. Please provide at least one data row.",
      rowCount: 0,
      columnCount: fields.length,
      columns: fields,
      previewRows: [],
    };
  }

  return {
    isValid: true,
    rowCount: rows.length,
    columnCount: fields.length,
    columns: fields,
    previewRows: rows.slice(0, 5),
    delimiter: parsed.meta.delimiter,
  };
}

export interface ExtractedInput {
  hasTable: boolean;
  prompt?: string;
  tableText?: string;
  sourceType: DatasetSourceType;
  title: string;
}

// Deterministically separate natural language user prompt from pasted tabular data
export function extractPromptAndData(text: string): ExtractedInput {
  const trimmed = text.trim();
  if (!trimmed) {
    return { hasTable: false, sourceType: "pasted", title: "dataset" };
  }

  // 1. Check if the entire text is a valid tabular dataset
  const wholeCheck = validateTabularInput(trimmed);
  if (wholeCheck.isValid && wholeCheck.rowCount >= 1) {
    return {
      hasTable: true,
      tableText: trimmed,
      prompt: "Analyze this dataset and generate the most appropriate dashboard.",
      sourceType: "pasted",
      title: `pasted_dataset_${new Date().toISOString().slice(0, 10)}`,
    };
  }

  // 2. Check if text has a prompt preamble followed by a tabular dataset
  const lines = trimmed.split(/\r?\n/);
  for (let i = 0; i < lines.length - 1; i++) {
    const potentialTable = lines.slice(i).join("\n").trim();
    const check = validateTabularInput(potentialTable);
    if (check.isValid && check.rowCount >= 1 && check.columnCount >= 2) {
      const promptPart = lines.slice(0, i).join(" ").trim();
      return {
        hasTable: true,
        prompt: promptPart || "Analyze this dataset and generate the most appropriate dashboard.",
        tableText: potentialTable,
        sourceType: "pasted",
        title: `pasted_dataset_${new Date().toISOString().slice(0, 10)}`,
      };
    }
  }

  // 3. Pure natural language prompt
  return {
    hasTable: false,
    prompt: trimmed,
    sourceType: "pasted",
    title: "dataset",
  };
}

// Unified Tabular Ingestion, Parsing & Imputation (for CSV & Pasted Text)
export function parseTabularData(
  rawText: string,
  sourceType: DatasetSourceType = "csv"
): ParsedCsvResult {
  const parsed = Papa.parse<Record<string, any>>(rawText.trim(), {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: true,
    delimiter: "", // Auto-detect comma, tab, semicolon, pipe
  });

  const rawData = (parsed.data || []).filter((r) => r && Object.keys(r).length > 0);
  const fields = (parsed.meta.fields || (rawData.length > 0 ? Object.keys(rawData[0]) : [])).map((f) => (f ? f.trim() : "")).filter((f) => f.length > 0);
  const columns = fields;

  // Build full dataset intelligence profile
  const profile = buildDatasetIntelligenceProfile(rawData, columns);

  // Partition helper arrays for backward compatibility
  const idColumns = profile.columns.filter((c) => c.semanticType === "identifier").map((c) => c.name);
  const dateColumns = profile.columns.filter((c) => c.semanticType === "date").map((c) => c.name);
  const binaryTargetColumns = profile.columns.filter((c) => c.semanticType === "binary_target").map((c) => c.name);
  const additiveNumericColumns = profile.columns.filter((c) => c.semanticType === "additive_numeric").map((c) => c.name);
  const nonAdditiveNumericColumns = profile.columns.filter((c) => c.semanticType === "non_additive_numeric").map((c) => c.name);
  const lowCardinalityCategories = profile.columns.filter((c) => c.semanticType === "categorical" && c.cardinality === "low").map((c) => c.name);
  const highCardinalityTextColumns = profile.columns.filter((c) => c.semanticType === "high_cardinality_text" || (c.semanticType === "categorical" && c.cardinality === "high")).map((c) => c.name);
  const categoricalColumns = profile.columns.filter((c) => c.semanticType === "categorical" || c.semanticType === "high_cardinality_text").map((c) => c.name);

  // STEP 1: SAFE BI-MODAL MISSING VALUE IMPUTATION
  const imputedData = rawData.map((row) => {
    const newRow = { ...row };
    columns.forEach((col) => {
      const val = newRow[col];
      if (val === null || val === undefined || val === "") {
        if (additiveNumericColumns.includes(col)) {
          newRow[col] = 0;
        } else if (nonAdditiveNumericColumns.includes(col)) {
          const colInfo = profile.columns.find((c) => c.name === col);
          newRow[col] = colInfo?.numericStats?.median || 0;
        } else if (categoricalColumns.includes(col)) {
          newRow[col] = "[Unassigned]";
        }
      }
    });
    return newRow;
  });

  return {
    data: imputedData,
    columns,
    idColumns,
    binaryTargetColumns,
    nonAdditiveNumericColumns,
    additiveNumericColumns,
    categoricalColumns,
    lowCardinalityCategories,
    highCardinalityTextColumns,
    dateColumns,
    rowCount: imputedData.length,
    profile,
    sourceType,
  };
}

export const parseCsvContent = parseTabularData;

// Archetype Classifier
export function detectDatasetArchetype(parsed: ParsedCsvResult): DatasetArchetype {
  if (parsed.profile) {
    return parsed.profile.archetype.primary;
  }
  const tempProfile = buildDatasetIntelligenceProfile(parsed.data, parsed.columns);
  return tempProfile.archetype.primary;
}

// Dynamic Initial Dashboard Generator
export function generateInitialDashboard(parsed: ParsedCsvResult): DashboardState {
  const profile = parsed.profile || buildDatasetIntelligenceProfile(parsed.data, parsed.columns);
  return synthesizeDashboardSpec(profile, parsed.data);
}

// Dynamic Suggestions Generator
export function generateDynamicSuggestions(parsed: ParsedCsvResult): string[] {
  const profile = parsed.profile || buildDatasetIntelligenceProfile(parsed.data, parsed.columns);
  return generateContextAwareSuggestions(profile);
}

// Trajectory Generator Alias
export function generateProjectionTrajectory(
  data: Record<string, any>[],
  xCol: string,
  yCol: string,
  whatIfDeltaPercent: number = 0
): Record<string, any>[] {
  return generateTrajectorySeries(data, xCol, yCol, whatIfDeltaPercent);
}

// Update Dashboard from conversational query
export function updateDashboardFromQuery(
  currentDashboard: DashboardState,
  query: string,
  analysis: any
): DashboardState {
  if (!analysis || analysis.chartType === "none" || !analysis.chartData || analysis.chartData.length === 0) {
    return currentDashboard;
  }

  const newChart = {
    id: `query_chart_${Date.now()}`,
    type: analysis.chartType,
    title: analysis.chartTitle || "Query Focused Visual",
    data: analysis.chartData,
    xKey: "label",
    yKey: "value",
    xAxisLabel: analysis.xAxisLabel || "Category",
    yAxisLabel: analysis.yAxisLabel || "Value",
    analysis: {
      whatItShows: analysis.explanation,
      trend: analysis.insight || "Conversational analytical visual perspective.",
      keyStats: [
        { label: "Query Context", value: query },
        { label: "Data Points", value: `${analysis.chartData.length}` },
        { label: "Perspective", value: "[Ad-Hoc Analysis]" },
        { label: "Verification", value: "[Verified]" },
      ],
      takeaway: analysis.insight || "Direct analytical observation from dataset context.",
    },
  };

  return {
    ...currentDashboard,
    heroChart: newChart,
    charts: [newChart, ...currentDashboard.charts.filter((c) => c.id !== newChart.id)],
  };
}

// Demo Datasets
export const SAMPLE_DATASETS = {
  sales: `date,product_category,region,sales_amount,units_sold,cost,profit
2024-01-01,Enterprise Software,North America,12500,5,3000,9500
2024-01-02,Cloud Hosting,Europe,8400,12,2100,6300
2024-01-03,Hardware Devices,Asia Pacific,15200,45,9000,6200
2024-01-04,Consulting Services,North America,9800,8,1500,8300
2024-01-05,Enterprise Software,Europe,14200,6,3400,10800
2024-01-06,Cloud Hosting,North America,11000,15,2800,8200
2024-01-07,Hardware Devices,Europe,16500,50,9800,6700
2024-01-08,Consulting Services,Asia Pacific,12000,10,1800,10200
2024-01-09,Enterprise Software,North America,13500,5,3200,10300
2024-01-10,Cloud Hosting,Asia Pacific,9500,14,2400,7100
2024-01-11,Hardware Devices,North America,18000,55,10500,7500
2024-01-12,Consulting Services,Europe,10500,9,1600,8900
2024-01-13,Enterprise Software,Europe,15000,6,3600,11400
2024-01-14,Cloud Hosting,North America,12500,16,3000,9500`,

  department: `employee_id,department,role,salary,performance_score,tenure_years,satisfaction_rating
101,Engineering,Senior Architect,165000,9.4,5,4.8
102,Engineering,Frontend Engineer,120000,8.8,3,4.2
103,Design,Lead Product Designer,145000,9.1,4,4.9
104,Product,Director of Product,175000,9.6,6,4.6
105,Marketing,Growth Lead,115000,8.2,2,3.9
106,Engineering,Backend Engineer,130000,8.9,3,4.4
107,Sales,Enterprise AE,140000,9.0,4,4.1
108,Operations,Operations Manager,110000,8.5,3,4.0
109,Design,UI Designer,105000,8.7,2,4.5
110,Engineering,DevOps Engineer,135000,9.2,4,4.7`,

  marketing: `campaign_name,channel,spend,impressions,clicks,conversions,revenue
Q1 Brand Awareness,LinkedIn,4500,120000,2400,85,14500
Search Intent Alpha,Google Ads,8200,350000,14200,420,38000
Product Launch Retarget,Meta,3800,95000,3100,110,12400
Developer Outreach,X (Twitter),2900,80000,1800,45,7200
Partner Webinar Series,Direct Email,1500,25000,1200,95,16000
Content Syndication,Medium,1800,45000,950,30,4800
Executive Roundtables,Events,9500,15000,800,60,28500`,
};

export { buildDatasetIntelligenceProfile, refreshDashboardWithFocus };
