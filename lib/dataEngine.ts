import Papa from "papaparse";
import {
  DashboardState,
  DatasetArchetype,
  DatasetIntelligenceProfile,
  DatasetSourceType,
} from "./types";
import { buildDatasetIntelligenceProfile } from "./dataIntelligence";
import { synthesizeDashboardSpec, refreshDashboardWithFocus, generateContextAwareSuggestions } from "./dashboardEngine";
import { generateTrajectorySeries } from "./visualizationEngine";
import { calculateDeterministicForecast, calculateGrowthIntelligence } from "./forecastEngine";

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

// Unified Tabular Ingestion & Parsing (Never invents rows or placeholder zeros)
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

  const idColumns = profile.columns.filter((c) => c.semanticType === "identifier").map((c) => c.name);
  const dateColumns = profile.columns.filter((c) => c.semanticType === "date").map((c) => c.name);
  const binaryTargetColumns = profile.columns.filter((c) => c.semanticType === "binary_target").map((c) => c.name);
  const additiveNumericColumns = profile.columns.filter((c) => c.semanticType === "additive_numeric").map((c) => c.name);
  const nonAdditiveNumericColumns = profile.columns.filter((c) => c.semanticType === "non_additive_numeric").map((c) => c.name);
  const lowCardinalityCategories = profile.columns.filter((c) => c.semanticType === "categorical" && c.cardinality === "low").map((c) => c.name);
  const highCardinalityTextColumns = profile.columns.filter((c) => c.semanticType === "high_cardinality_text" || (c.semanticType === "categorical" && c.cardinality === "high")).map((c) => c.name);
  const categoricalColumns = profile.columns.filter((c) => c.semanticType === "categorical" || c.semanticType === "high_cardinality_text").map((c) => c.name);

  return {
    data: rawData,
    columns,
    idColumns,
    binaryTargetColumns,
    nonAdditiveNumericColumns,
    additiveNumericColumns,
    categoricalColumns,
    lowCardinalityCategories,
    highCardinalityTextColumns,
    dateColumns,
    rowCount: rawData.length,
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

export { refreshDashboardWithFocus };
export const SAMPLE_DATASETS = {
  sales: `Month,Revenue,Orders,Customers,Marketing_Spend
Jan-2025,42000,310,185,8500
Feb-2025,44500,325,192,8700
Mar-2025,47200,341,205,9100
Apr-2025,46800,338,208,9000
May-2025,49500,355,219,9400
Jun-2025,52300,372,231,9800
Jul-2025,54800,389,244,10200
Aug-2025,56100,401,251,10500
Sep-2025,57900,415,263,10900
Oct-2025,61200,438,278,11400
Nov-2025,64800,461,294,12100
Dec-2025,69100,489,312,12800
Jan-2026,70400,501,318,13100
Feb-2026,73200,518,327,13500
Mar-2026,76100,536,341,13900
Apr-2026,74800,529,338,13700
May-2026,79200,557,354,14300
Jun-2026,82100,579,369,14900
Jul-2026,85600,601,384,15500
Aug-2026,88900,624,401,16100`,

  department: `Name,Department,Age,Salary,Performance
Alice,Engineering,24,52000,78
Bob,Sales,31,61000,84
Charlie,Marketing,28,57000,81
David,Engineering,35,82000,91
Emma,Sales,42,74000,76
Frank,Marketing,29,59000,88
Grace,Engineering,31,71000,85
Henry,Sales,26,51000,79`,

  marketing: `Month,Category,Revenue
Jan-2026,Electronics,42000
Jan-2026,Clothing,18000
Jan-2026,Home,12000
Feb-2026,Electronics,45000
Feb-2026,Clothing,19000
Feb-2026,Home,13500`,

  sales25: `Date,Revenue,Cost,Units
2026-01-05,1200,700,2
2026-01-12,1800,1050,3
2026-01-19,1750,1000,3
2026-01-26,2900,1650,5
2026-02-02,2300,1350,4
2026-02-09,4100,2400,7
2026-02-16,3500,2050,6
2026-02-23,2950,1700,5
2026-03-02,4700,2700,8
2026-03-09,4650,2680,8
2026-03-16,3600,2100,6
2026-03-23,5900,3400,10
2026-03-30,8100,4700,14
2026-04-06,4200,2450,7
2026-04-13,5300,3100,9
2026-04-20,7600,4400,13
2026-04-27,4800,2800,8
2026-05-04,5900,3450,10
2026-05-11,3700,2150,6
2026-05-15,6400,3700,11
2026-05-18,9100,5200,16
2026-05-20,4300,2500,7
2026-05-22,5400,3150,9
2026-05-26,4900,2850,8
2026-05-29,7800,4500,13`,
};
