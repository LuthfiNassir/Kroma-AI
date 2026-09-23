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
  const detectedDelimiter = parsed.meta.delimiter;

  // A valid tabular dataset for analytical intelligence requires at least 2 columns with standard delimiters (comma, tab, semicolon, pipe)
  const validDelimiters = [",", "\t", ";", "|"];
  const hasValidDelimiter = Boolean(detectedDelimiter && validDelimiters.includes(detectedDelimiter));

  if (fields.length < 2 || !hasValidDelimiter) {
    return {
      isValid: false,
      error: "Tabular data requires at least two columns separated by commas, tabs, semicolons, or pipes.",
      rowCount: 0,
      columnCount: fields.length,
      columns: fields,
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
    delimiter: detectedDelimiter,
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

  // 1. Check if the entire text is a valid tabular dataset (strictly requiring >=2 columns with valid separators)
  const wholeCheck = validateTabularInput(trimmed);
  if (wholeCheck.isValid && wholeCheck.rowCount >= 1 && wholeCheck.columnCount >= 2) {
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

  ecommerce: `Date,Order_ID,Region,Category,Product,Units,Revenue,Cost,Discount,Customer_Type
2026-01-05,ORD-1001,North,Electronics,Server & Laptops,10,14350,10320,0.05,Returning
2026-01-12,ORD-1002,West,Furniture,Executive Desk,4,3600,2400,0.05,New
2026-01-19,ORD-1003,East,Electronics,Ultrabook,5,5800,4040,0.05,Returning
2026-01-26,ORD-1004,North,Office,Laser Printer,4,2400,1560,0.00,New
2026-02-02,ORD-1005,West,Electronics,Laptop Pro,5,6200,4340,0.05,Returning
2026-02-09,ORD-1006,East,Furniture,Ergonomic Chair,6,2400,1600,0.00,New
2026-02-16,ORD-1007,North,Office,Scanner,5,2100,1365,0.05,Returning
2026-02-23,ORD-1008,West,Electronics,Monitor 4K,8,4400,3080,0.05,New
2026-03-02,ORD-1009,East,Furniture,Standing Desk,4,2850,1900,0.05,Returning
2026-03-09,ORD-1010,South,Electronics,Smartphone,5,3200,2160,0.05,Returning
2026-03-16,ORD-1011,North,Office,Paper Shredder,6,1800,1170,0.00,New
2026-03-23,ORD-1012,West,Electronics,Tablet,7,3800,2650,0.00,Returning
2026-03-30,ORD-1013,East,Electronics,Dual Monitor,7,5450,3800,0.05,New
2026-04-06,ORD-1014,South,Furniture,Filing Cabinet,4,1500,1000,0.05,New
2026-04-13,ORD-1015,South,Electronics,Tablet,6,2800,1900,0.00,New
2026-04-20,ORD-1016,North,Office,Workstation Supplies,8,3800,2470,0.10,Returning
2026-04-27,ORD-1017,West,Electronics,Smart Device,6,5100,3560,0.10,New
2026-05-04,ORD-1018,East,Furniture,Bookshelf,5,1800,1200,0.00,New
2026-05-11,ORD-1019,South,Electronics,Wireless Earbuds,8,1900,1280,0.05,Returning
2026-05-15,ORD-1020,South,Electronics,Smart Watch,6,2400,1620,0.00,New
2026-05-18,ORD-1021,North,Office,Laminator & Accessories,5,2500,1625,0.05,New
2026-05-20,ORD-1022,South,Electronics,Bluetooth Speaker,7,2100,1420,0.05,Returning
2026-05-22,ORD-1023,West,Furniture,Conference Table,3,2700,1800,0.05,Returning
2026-05-26,ORD-1024,East,Electronics,Tablet Pro,6,5500,3830,0.10,Returning
2026-05-29,ORD-1025,South,Electronics,USB-C Accessories,58,3600,2450,0.10,Returning`,

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

  churn: `Customer_ID,Segment,Monthly_Revenue,Usage_Hours,Support_Tickets,NPS,Feature_Adoption,Tenure_Months,Churn_Risk
C001,Enterprise,1076.84,27.4,1,59,80,32,Low
C002,Mid-Market,120.0,28.8,3,38,56,15,Medium
C003,Enterprise,1350.83,80.2,1,72,90,59,Low
C004,Enterprise,1190.36,67.2,1,74,90,28,Low
C005,SMB,35.0,10.5,7,11,39,4,High
C006,SMB,135.0,36.1,5,38,66,23,Medium
C007,Enterprise,1428.98,80.7,1,67,96,35,Low
C008,Mid-Market,42.0,9.7,9,18,45,3,High
C009,Enterprise,1402.29,85.0,3,80,77,29,Low
C010,Mid-Market,145.0,31.9,4,42,68,21,Medium
C011,Enterprise,1517.37,108.0,2,82,92,59,Low
C012,SMB,45.0,10.5,8,19,39,5,High
C013,Enterprise,1567.39,83.6,2,82,94,29,Low
C014,SMB,155.0,24.1,5,35,72,13,Medium
C015,Enterprise,1353.3,52.5,1,65,93,26,Low
C016,Enterprise,1453.64,73.6875,2,70,80,52,Low
C017,SMB,49.0,11.7,6,18,35,2,High
C018,Mid-Market,175.0,30.7,6,50,62,22,Medium
C019,Mid-Market,329.0,85.3,2,73,88,52,Low
C020,SMB,260.1,73.6875,2,59,92,40,Low
C021,Mid-Market,307.86,84.2,2,81,89,39,Low
C022,SMB,185.0,26.7,5,47,64,17,Medium
C023,Mid-Market,52.0,10.9,6,6,25,6,High
C024,SMB,447.11,70.2,2,73,87,33,Low
C025,Mid-Market,372.48,50.3,2,74,89,59,Low
C026,Mid-Market,195.0,25.6,4,54,52,18,Medium
C027,SMB,265.46,73.6875,2,82,83,53,Low
C028,Mid-Market,320.99,83.3,3,62,92,30,Low
C029,SMB,56.0,9.7,8,17,40,7,High
C030,SMB,208.0,25.1,5,41,70,11,Medium`,
};
