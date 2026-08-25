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

export interface KPICardData {
  label: string;
  value: string | number;
  subtext: string;
}

export interface KeyStat {
  label: string;
  value: string;
}

export interface ChartAnalysis {
  whatItShows: string;
  trend: string;
  keyStats: KeyStat[];
  takeaway: string;
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

export interface DashboardState {
  kpis: KPICardData[];
  charts: ChartDataSeries[];
  heroChart?: ChartDataSeries | null;
  segmentChart?: ChartDataSeries | null;
  correlationChart?: ChartDataSeries | null;
  highlightsCard?: HighlightsCardData | null;
  tableData: Record<string, any>[];
  columns: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sqlQuery?: string | null;
  insight?: string | null;
  inlineChart?: ChartDataSeries | null;
  inlineTable?: Record<string, any>[] | null;
  timestamp: string;
  isError?: boolean;
}

export interface AnalysisSession {
  sessionId: string;
  title: string;
  createdAt: string;
  rowCount: number;
  columnCount: number;
  messages: ChatMessage[];
  dashboardState: DashboardState;
}

export interface AnalysisResponse {
  explanation: string;
  insight: string;
  sql: string | null;
  chartType: ChartType;
  chartTitle?: string | null;
  xAxisLabel?: string | null;
  yAxisLabel?: string | null;
  zAxisLabel?: string | null;
  chartData?: Record<string, any>[] | null;
}
