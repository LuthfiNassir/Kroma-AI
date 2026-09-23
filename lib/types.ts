export type ChartType =
  | "bar"
  | "line"
  | "pie"
  | "area"
  | "histogram"
  | "scatter"
  | "bubble"
  | "boxplot"
  | "heatmap"
  | "treemap"
  | "sankey"
  | "none";

export type DatasetArchetype =
  | "FINANCIAL"
  | "QUANTITATIVE_PROGRESS"
  | "CATEGORICAL_OPERATIONAL"
  | "CROSS_SECTIONAL_DISCOVERY";

export type SemanticColumnType =
  | "identifier"
  | "date"
  | "binary_target"
  | "ordinal_target"
  | "nominal_target"
  | "numeric_target"
  | "additive_numeric"
  | "non_additive_numeric"
  | "categorical"
  | "high_cardinality_text";

export type TargetOutcomeType = "binary" | "ordinal" | "nominal" | "numeric";

export interface TargetOutcomeDistributionItem {
  label: string;
  count: number;
  percentage: number;
  ordinalRank?: number;
}

export interface TargetOutcomeIntelligence {
  targetColumn: string;
  targetType: TargetOutcomeType;
  distribution: TargetOutcomeDistributionItem[];
  highRiskRate?: number;
  adverseRate?: number;
  displayMetricLabel: string;
  displayMetricValue: string;
  subtext: string;
  ordinalMapping?: Record<string, number>;
}

export interface DeterministicCorrelation {
  variableA: string;
  variableB: string;
  coefficient: number;
  n: number;
  direction: "positive" | "negative";
  strength: "strong" | "moderate" | "weak";
  method: string;
}

export interface CategoricalGroupItem {
  group: string;
  count: number;
  percentage: number;
  total: number;
  average: number;
  median?: number;
  min: number;
  max: number;
}

export interface CategoricalGroupBreakdown {
  dimension: string;
  measure: string;
  groups: CategoricalGroupItem[];
}

export interface FullNumericColumnStat {
  name: string;
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  q1: number;
  q3: number;
  iqr: number;
}

export interface DerivedMetricDefinition {
  name: string;
  formula: string;
  sourceColumns: string[];
  total?: number;
  mean?: number;
  format?: "currency" | "percent" | "number";
}

export interface AnalysisContext {
  datasetId: string;
  datasetFingerprint: string;
  rowCount: number;
  columns: string[];
  columnTypes: Record<string, SemanticColumnType | string>;
  dateColumn?: string;
  numericColumns: string[];
  categoricalColumns: string[];
  measures: string[];
  dimensions: string[];
  archetype: DatasetArchetype;
  deterministicFacts: Record<string, any>;
  derivedMetrics: Record<string, DerivedMetricDefinition>;
  availableMetrics: string[];
  sourceDataset?: string;
  tableData?: Record<string, any>[];
  factPack?: VerifiedFactPack;
}

export interface VerifiedFactPack {
  metadata: {
    datasetId?: string;
    datasetFingerprint: string;
    rowCount: number;
    columnCount: number;
    columnNames: string[];
    numericColumns: string[];
    categoricalColumns: string[];
    dateColumns: string[];
    missingValueCounts: Record<string, number>;
    dataCompleteness: number;
    detectedArchetype: DatasetArchetype;
    targetColumn?: string;
    targetType?: TargetOutcomeType;
  };
  tableData?: Record<string, any>[];
  analysisContext?: AnalysisContext;
  numericStats: Record<string, FullNumericColumnStat>;
  groupStats: CategoricalGroupBreakdown[];
  targetIntelligence?: TargetOutcomeIntelligence;
  correlations: DeterministicCorrelation[];
  limitations: string[];
  reconciliationResult?: any;
}

export interface ColumnValueFrequency {
  value: string;
  count: number;
  pct: number;
}

export interface ColumnNumericStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  sum: number;
  stdDev: number;
  q1: number;
  q3: number;
}

export interface ColumnIntelligence {
  name: string;
  semanticType: SemanticColumnType;
  dataType: "number" | "string" | "date" | "boolean";
  missingCount: number;
  missingRate: number;
  uniqueCount: number;
  cardinality: "binary" | "low" | "medium" | "high" | "unique";
  numericStats?: ColumnNumericStats;
  topValues?: ColumnValueFrequency[];
}

export interface TemporalIntelligence {
  hasTemporal: boolean;
  dateColumn?: string;
  startDate?: string;
  endDate?: string;
  startLabel?: string;
  endLabel?: string;
  observationCount: number;
  frequency?: "hourly" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "irregular";
  isContinuous: boolean;
  continuityScore: number;
  isRegular?: boolean;
  averageIntervalDays?: number;
  minIntervalDays?: number;
  maxIntervalDays?: number;
  granularityLabel?: string;
  timeSpanDescription?: string;
  spanDays?: number;
  duplicateTimestampsCount?: number;
  orderedLabels?: string[];
}

export interface DataQualityIntelligence {
  completenessRate: number;
  duplicateRowCount: number;
  missingCellsTotal: number;
  issues: string[];
}

export type RelationshipType =
  | "numeric_correlation"
  | "temporal_trend"
  | "category_breakdown"
  | "cross_tabulation"
  | "process_funnel"
  | "hierarchy"
  | "target_outcome";

export interface DetectedRelationship {
  id: string;
  type: RelationshipType;
  sourceColumn: string;
  targetColumn: string;
  strength: number; // e.g. correlation coefficient (-1 to 1) or variance ratio
  description: string;
  recommendedChart: ChartType;
  insights: string;
}

export interface CapabilityDetail {
  available: boolean;
  reason: string;
  relevantColumns: string[];
}

export interface AnalyticalCapabilities {
  trendAnalysis: CapabilityDetail;
  timeSeriesForecasting: CapabilityDetail;
  targetPrediction: CapabilityDetail;
  correlationAnalysis: CapabilityDetail;
  cohortAnalysis: CapabilityDetail;
  funnelAnalysis: CapabilityDetail;
  segmentationAnalysis: CapabilityDetail;
  distributionAnalysis: CapabilityDetail;
  outlierAnalysis: CapabilityDetail;
}

export interface ArchetypeIntelligence {
  primary: DatasetArchetype;
  confidence: number;
  secondarySignals: string[];
  description: string;
}

export interface DatasetSummaryNarrative {
  title: string;
  overview: string;
  datasetType: string;
  recordsCount: number;
  attributesCount: number;
  dimensions: string[];
  measures: string[];
  temporalInfo?: string;
  analysisAvailable: string[];
  dataQualityText: string;
  dashboardRationale: string;
}

export interface PeriodChange {
  period: string;
  previousPeriod: string;
  previousValue: number;
  currentValue: number;
  change: number;
  pctChange: number;
}

export interface GrowthIntelligence {
  targetMetric: string;
  startPeriod: string;
  endPeriod: string;
  startValue: number;
  endValue: number;
  totalChange: number;
  totalGrowthPct: number;
  averagePeriodicGrowthPct: number;
  periodChanges: PeriodChange[];
  largestIncrease: PeriodChange | null;
  largestDecline: PeriodChange | null;
  recentDirection: "increasing" | "decreasing" | "flat";
  // Comprehensive statistics separating endpoint change from actual trend
  firstValue: number;
  latestValue: number;
  endpointChangePercent: number;
  minValue: number;
  maxValue: number;
  meanValue: number;
  medianValue: number;
  trendDirection: "increasing" | "decreasing" | "flat" | "fluctuating";
  trendSlope: number;
  volatility: "low" | "moderate" | "high";
  volatilityScore: number;
  isSustained: boolean;
  narrativeSummary: string;
}

export interface ForecastSuitability {
  isSuitable: boolean;
  confidenceTier: "high" | "moderate" | "exploratory" | "unsuitable";
  displayTitle: string; // e.g. "6-Period Directional Projection" vs "6-Month Forecast"
  frequency: "hourly" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "irregular";
  isRegular: boolean;
  observationCount: number;
  uniquePeriodsCount: number;
  spanDays: number;
  missingnessRate: number;
  duplicateTimestampsCount: number;
  reasons: string[];
  limitations: string;
}

export interface ForecastPoint {
  period: string;
  displayLabel: string;
  forecastValue: number;
  lowerBound?: number;
  upperBound?: number;
}

export interface ForecastResult {
  targetMetric: string;
  historicalSeries: { period: string; displayLabel: string; value: number }[];
  forecastSeries: ForecastPoint[];
  horizon: number;
  method: string;
  trendDirection: "increasing" | "decreasing" | "flat";
  baseline: number;
  projectedGrowthPct: number;
  confidenceLevel: string;
  limitations: string;
  explanation: string;
  suitability?: ForecastSuitability;
  isExploratory?: boolean;
  displayTitle?: string;
}

export interface DatasetIntelligenceProfile {
  datasetSummary: {
    rowCount: number;
    columnCount: number;
    dataQualityScore: number;
    schemaAnomalies: number;
  };
  summaryNarrative?: DatasetSummaryNarrative;
  columns: ColumnIntelligence[];
  temporal: TemporalIntelligence;
  measures: string[];
  dimensions: string[];
  targets: string[];
  identifiers: string[];
  relationships: DetectedRelationship[];
  dataQuality: DataQualityIntelligence;
  capabilities: AnalyticalCapabilities;
  archetype: ArchetypeIntelligence;
  growth?: GrowthIntelligence;
  forecast?: ForecastResult;
  forecastSuitability?: ForecastSuitability;
  targetIntelligence?: TargetOutcomeIntelligence;
  factPack?: VerifiedFactPack;
  analysisContext?: AnalysisContext;
}

export interface KPICardData {
  label: string;
  value: string | number;
  subtext: string;
}

export interface KeyStat {
  label: string;
  value: string;
}

export interface TechnicalDetailItem {
  label: string;
  value: string;
}

export interface ChartAnalysis {
  whatItShows: string;
  mainFinding?: string;
  whatStandsOut?: string[];
  whyItMatters?: string;
  keyStats: KeyStat[];
  takeaway: string;
  trend?: string;
  technicalDetails?: TechnicalDetailItem[];
}

export interface ChartDataSeries {
  id?: string;
  type: ChartType;
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  zAxisLabel?: string;
  data: Record<string, any>[];
  xKey?: string;
  yKey?: string;
  analysis?: ChartAnalysis;
  isForecastChart?: boolean;
  isIndexed?: boolean;
  isExploratoryForecast?: boolean;
  forecastBadge?: string;
}

export interface HighlightItem {
  label: string;
  value: string;
  subtext?: string;
}

export interface HighlightsCardData {
  title: string;
  items: HighlightItem[];
}

export type ActionType =
  | "ANSWER"
  | "CREATE_VISUALIZATION"
  | "REFRESH_DASHBOARD"
  | "REBUILD_DASHBOARD"
  | "FORECAST"
  | "SHOW_FORECAST"
  | "SHOW_TREND"
  | "SHOW_SOURCE_DATA"
  | "FOCUS_ANALYSIS"
  | "NEW_ANALYSIS"
  | "ANALYZE_RELATIONSHIP";

export interface StructuredAIAction {
  type: ActionType;
  focus?: string;
  filters?: Record<string, any>;
  targetMetric?: string;
  targetDimension?: string;
}

export type DatasetSourceType = "csv" | "pasted" | "prompt_only";

export interface DashboardState {
  profileType: DatasetArchetype;
  profile?: DatasetIntelligenceProfile;
  summaryNarrative?: DatasetSummaryNarrative;
  focus?: string;
  sourceType?: DatasetSourceType;
  kpis: KPICardData[];
  charts: ChartDataSeries[];
  heroChart?: ChartDataSeries | null;
  segmentChart?: ChartDataSeries | null;
  correlationChart?: ChartDataSeries | null;
  forecastChart?: ChartDataSeries | null;
  highlightsCard?: HighlightsCardData | null;
  tableData: Record<string, any>[];
  columns: string[];
  suggestions?: string[];
  projectionData?: Record<string, any>[];
  forecastResult?: ForecastResult | null;
  growthIntelligence?: GrowthIntelligence | null;
  forecastingSupported?: boolean;
  forecastReason?: string;
  whatIfParams?: {
    deltaPercent?: number;
    deltaAmount?: number;
    description?: string;
  };
  analysisContext?: AnalysisContext;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: StructuredAIAction;
  sqlQuery?: string | null;
  insight?: string | null;
  inlineChart?: ChartDataSeries | null;
  inlineTable?: Record<string, any>[] | null;
  timestamp: string;
  isError?: boolean;
  isOfflineCard?: boolean;
  offlineMetadata?: {
    endpoint: string;
    model: string;
    status: string;
  };
}

export interface AnalysisSession {
  sessionId: string;
  title: string;
  sourceType?: DatasetSourceType;
  createdAt: string;
  updatedAt?: string;
  rowCount?: number;
  columnCount?: number;
  messages: ChatMessage[];
  dashboardState?: DashboardState;
  analysisContext?: AnalysisContext;
  icon?: string;
  isCustomTitle?: boolean;
  isArchived?: boolean;
}

export interface AnalysisResponse {
  explanation: string;
  insight: string;
  sql: string | null;
  action?: StructuredAIAction;
  chartType: ChartType;
  chartTitle?: string | null;
  xAxisLabel?: string | null;
  yAxisLabel?: string | null;
  zAxisLabel?: string | null;
  chartData?: Record<string, any>[] | null;
}
