"use client";

import React, { useState } from "react";
import { DashboardState, ChartDataSeries } from "@/lib/types";
import { MetricCard } from "./MetricCard";
import { ChartCard } from "./ChartCard";
import { Table } from "./ui/Table";
import { ChevronDown, ChevronUp, Table as TableIcon, Sparkles } from "lucide-react";

interface BentoGridProps {
  dashboardState: DashboardState;
  onSelectChart?: (chart: ChartDataSeries) => void;
}

export const BentoGrid: React.FC<BentoGridProps> = ({
  dashboardState,
  onSelectChart,
}) => {
  const { kpis, charts, highlightsCard, tableData, columns } = dashboardState;
  const [tableOpen, setTableOpen] = useState(false);

  // Highlights Card items fallback
  const highlightItems = highlightsCard?.items || [
    { label: "Data Quality Ratio", value: "100.0%", subtext: "0 schema anomalies" },
    { label: "Total Columns", value: `${columns.length} attrs`, subtext: "Successfully parsed" },
  ];

  return (
    <div className="w-full space-y-4">
      {/* 1. TOP EXECUTIVE KPI ROW (Dynamic Grid 4 to 6 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {kpis.map((kpi, idx) => (
          <MetricCard key={idx} data={kpi} />
        ))}
      </div>

      {/* 2. AUTONOMOUS DYNAMIC BENTO GRID (12-Column Responsive Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {charts.map((chartWidget, idx) => {
          // Dynamic Column Span Mapping as specified:
          // Chart 1 (Age Distribution): md:col-span-8
          // Chart 2 (Gender Donut): md:col-span-4
          // Chart 3 (Stroke Rate): md:col-span-6
          // Chart 4 (Glucose Distribution): md:col-span-6
          // Chart 5 (Work Type): md:col-span-6
          // Chart 6 (Smoking Risk): md:col-span-6
          let colSpanClass = "md:col-span-6";

          if (idx === 0) {
            colSpanClass = "md:col-span-8";
          } else if (idx === 1 || chartWidget.type === "pie") {
            colSpanClass = "md:col-span-4";
          } else if (chartWidget.type === "area" || idx % 5 === 0) {
            colSpanClass = "md:col-span-6";
          }

          return (
            <div key={chartWidget.id || `widget_${idx}`} className={colSpanClass}>
              <ChartCard
                series={chartWidget}
                defaultType={chartWidget.type || "bar"}
                accentColor={idx % 2 === 0 ? "#FE6749" : "#A5329E"}
                secondaryColor={idx % 2 === 0 ? "#A5329E" : "#FE6749"}
                className="h-full min-h-[340px]"
                onClick={() => onSelectChart && onSelectChart(chartWidget)}
              />
            </div>
          );
        })}

        {/* HIGHLIGHTS SUMMARY CARD (Span 6 / 12 Columns) */}
        <div className="md:col-span-6 rounded-3xl bg-[#18191b] border border-white/10 p-5 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FE6749]" />
              <h3 className="text-sm font-semibold text-white tracking-tight uppercase font-mono">
                {highlightsCard?.title || "[Top Highlights & Cohort Summary]"}
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
