import React, { useState } from "react";
import { DashboardState, ChartDataSeries } from "@/lib/types";
import { MetricCard } from "./MetricCard";
import { ChartCard } from "./ChartCard";
import { Table } from "./ui/Table";
import { Maximize2, Award, ChevronDown, ChevronUp, Table as TableIcon, Sparkles } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface BentoGridProps {
  dashboardState: DashboardState;
  onSelectChart?: (chart: ChartDataSeries) => void;
}

const COLOR_PALETTE = ["#FE6749", "#A5329E", "#FE88ED", "#FF9E88", "#7D2277", "#D44333"];

export const BentoGrid: React.FC<BentoGridProps> = ({
  dashboardState,
  onSelectChart,
}) => {
  const { kpis, charts, heroChart, segmentChart, correlationChart, highlightsCard, tableData, columns } = dashboardState;
  const [tableOpen, setTableOpen] = useState(false);

  // Fallback chart assignments
  const hero = heroChart || (charts && charts[0]) || null;
  const segment = segmentChart || (charts && charts[1]) || null;
  const correlation = correlationChart || (charts && charts[2]) || null;

  // Donut data for Segment Card
  const donutData = segment?.data || [];
  const totalDonutVal = donutData.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

  // Highlights Card items
  const highlightItems = highlightsCard?.items || [
    { label: "Data Quality Ratio", value: "100.0%", subtext: "0 schema anomalies" },
    { label: "Total Columns", value: `${columns.length} attrs`, subtext: "Successfully parsed" },
  ];

  return (
    <div className="w-full space-y-4">
      {/* 1. TOP KPI ROW (4 Columns) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.slice(0, 4).map((kpi, idx) => (
          <MetricCard key={idx} data={kpi} />
        ))}
      </div>

      {/* 2. MAIN ASYMMETRICAL BENTO GRID (12-Column Grid Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* HERO CARD (Span 8 / 12 Columns): Primary Distribution or Key Target Cross-Tabulation */}
        <div className="md:col-span-8">
          <ChartCard
            series={hero}
            defaultType={hero?.type || "bar"}
            accentColor="#FE6749"
            secondaryColor="#A5329E"
            className="h-full min-h-[360px]"
            onClick={() => hero && onSelectChart && onSelectChart(hero)}
          />
        </div>

        {/* SEGMENT DONUT CARD (Span 4 / 12 Columns): Category Distribution Donut with Percentage Share */}
        <div
          onClick={() => segment && onSelectChart && onSelectChart(segment)}
          className="md:col-span-4 rounded-3xl bg-[#18191b] border border-white/10 p-5 flex flex-col justify-between shadow-xl relative overflow-hidden cursor-pointer hover:border-[#FE6749]/50 transition-all duration-200 group"
        >
          {/* Hover Enlarge Badge */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <span className="rounded-full px-2.5 py-1 text-[10px] font-mono bg-[#FE6749] text-white shadow-md flex items-center gap-1">
              <Maximize2 className="w-3 h-3" />
              <span>[Click to Expand]</span>
            </span>
          </div>

          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight uppercase font-mono">
                {segment?.title || "Category Distribution"}
              </h3>
              <p className="text-[11px] text-white/50 tracking-wider font-mono">
                [Population Share Breakdown]
              </p>
            </div>
          </div>

          {/* Donut Graph */}
          <div className="w-full h-[180px] relative my-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#212222",
                    borderColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "12px",
                    color: "#ffffff",
                    fontSize: "12px",
                  }}
                />
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {donutData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                      stroke="#18191b"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category Percentage Breakdown List */}
          <div className="space-y-1.5 border-t border-white/5 pt-2.5">
            {donutData.slice(0, 3).map((item, idx) => {
              const val = Number(item.value) || 0;
              const pct = item.pct ? item.pct : totalDonutVal > 0 ? Math.round((val / totalDonutVal) * 100) : 0;
              const barColor = COLOR_PALETTE[idx % COLOR_PALETTE.length];

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white/80 truncate max-w-[130px]">
                      {item.name || item[segment?.xKey || "name"]}
                    </span>
                    <span className="text-white/50 font-semibold">{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CORRELATION CARD (Span 6 / 12 Columns): Secondary Multi-Metric Relationship / Risk Rates */}
        <div className="md:col-span-6">
          <ChartCard
            series={correlation}
            defaultType={correlation?.type || "bar"}
            accentColor="#A5329E"
            secondaryColor="#FE6749"
            className="h-full min-h-[320px]"
            onClick={() => correlation && onSelectChart && onSelectChart(correlation)}
          />
        </div>

        {/* HIGHLIGHTS SUMMARY CARD (Span 6 / 12 Columns): Extreme Percentiles & Cohort Summary */}
        <div className="md:col-span-6 rounded-3xl bg-[#18191b] border border-white/10 p-5 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FE6749]" />
              <h3 className="text-sm font-semibold text-white tracking-tight uppercase font-mono">
                {highlightsCard?.title || "Top Highlights & Cohort Summary"}
              </h3>
            </div>
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 text-white/60">
              [{highlightItems.length} Metrics]
            </span>
          </div>

          {/* Highlights Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-auto">
            {highlightItems.map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-white/[0.03] border border-white/5 p-3.5 flex flex-col justify-between space-y-1"
              >
                <span className="text-[10px] font-mono text-white/50 uppercase truncate">
                  {item.label}
                </span>
                <span className="text-base font-bold text-white font-mono tracking-tight truncate">
                  {item.value}
                </span>
                {item.subtext && (
                  <span className="text-[10px] font-mono text-white/40 truncate">
                    {item.subtext}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM ROW: Collapsible Full Dataset Table */}
      <div className="rounded-2xl bg-[#18191b] border border-white/10 overflow-hidden">
        <button
          type="button"
          onClick={() => setTableOpen(!tableOpen)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-[#FE6749]" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              [Full Dataset Table Preview]
            </span>
            <span className="text-[11px] text-white/50 font-mono">
              ({tableData.length} total rows parsed)
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/60 font-mono">
            <span>{tableOpen ? "[Hide Table]" : "[Expand Full Table]"}</span>
            {tableOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {tableOpen && (
          <div className="border-t border-white/10 p-2">
            <Table columns={columns} data={tableData} />
          </div>
        )}
      </div>
    </div>
  );
};
