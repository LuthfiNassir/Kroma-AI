"use client";

import React from "react";
import { Maximize2 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  Treemap,
} from "recharts";
import { ChartDataSeries, ChartType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  series: ChartDataSeries | null;
  defaultType?: ChartType;
  accentColor?: string;
  secondaryColor?: string;
  className?: string;
  onClick?: () => void;
}

const COLOR_PALETTE = ["#FE6749", "#A5329E", "#FE88ED", "#FF9E88", "#7D2277", "#38BDF8", "#34D399"];

// Custom SVG Renderer for Boxplot
const CustomBoxPlotRenderer: React.FC<{ data: any[]; accentColor: string }> = ({ data, accentColor }) => {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  return (
    <div className="w-full h-full flex flex-col justify-around py-2 px-4 space-y-2 overflow-y-auto font-mono">
      {data.map((item, idx) => {
        const cat = item.category || item.label || `Cohort ${idx + 1}`;
        const min = Number(item.min) || 0;
        const q1 = Number(item.q1) || 20;
        const median = Number(item.median) || 50;
        const q3 = Number(item.q3) || 75;
        const max = Number(item.max) || 100;

        const maxVal = Math.max(...data.map((d) => Number(d.max) || 100), 1);
        const toPct = (val: number) => Math.min(Math.max((val / maxVal) * 100, 0), 100);

        const minPct = toPct(min);
        const q1Pct = toPct(q1);
        const medianPct = toPct(median);
        const q3Pct = toPct(q3);
        const maxPct = toPct(max);
        const boxWidthPct = Math.max(q3Pct - q1Pct, 1);

        return (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-[10px] text-white/70">
              <span className="font-semibold text-white truncate max-w-[120px]">{cat}</span>
              <span className="text-white/40">Med: {median} | Range: [{min} - {max}]</span>
            </div>
            <div className="h-6 w-full relative bg-white/5 rounded-md overflow-hidden flex items-center px-1">
              {/* Whisker Line */}
              <div
                className="absolute h-0.5 bg-white/30"
                style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
              />
              {/* Whisker End Caps */}
              <div className="absolute h-3 w-0.5 bg-white/40" style={{ left: `${minPct}%` }} />
              <div className="absolute h-3 w-0.5 bg-white/40" style={{ left: `${maxPct}%` }} />
              {/* Q1-Q3 Box */}
              <div
                className="absolute h-4 rounded bg-[#A5329E]/40 border border-[#FE88ED]/50"
                style={{ left: `${q1Pct}%`, width: `${boxWidthPct}%` }}
              />
              {/* Median Line */}
              <div
                className="absolute h-4 w-1 bg-[#FE6749] z-10 rounded-full"
                style={{ left: `${medianPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Custom SVG Renderer for Heatmap Matrix
const CustomHeatmapRenderer: React.FC<{ data: any[]; accentColor: string }> = ({ data, accentColor }) => {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  const xLabels = Array.from(new Set(data.map((d) => String(d.x || d.label || "X"))));
  const yLabels = Array.from(new Set(data.map((d) => String(d.y || d.category || "Y"))));

  const maxVal = Math.max(...data.map((d) => Number(d.value) || 1), 1);

  return (
    <div className="w-full h-full flex flex-col justify-center p-2 font-mono text-[10px]">
      <div
        className="grid gap-1.5 w-full h-full"
        style={{
          gridTemplateColumns: `auto repeat(${xLabels.length}, minmax(0, 1fr))`,
        }}
      >
        <div className="h-6" />
        {xLabels.map((x, idx) => (
          <div key={idx} className="h-6 flex items-center justify-center text-white/50 font-semibold truncate px-1">
            {x}
          </div>
        ))}

        {yLabels.map((y, yIdx) => (
          <React.Fragment key={yIdx}>
            <div className="flex items-center text-white/60 font-semibold truncate pr-2 text-right">
              {y}
            </div>
            {xLabels.map((x, xIdx) => {
              const match = data.find((d) => String(d.x || d.label) === x && String(d.y || d.category) === y);
              const val = match ? Number(match.value) || 0 : 0;
              const opacity = Math.max(val / maxVal, 0.15);

              return (
                <div
                  key={xIdx}
                  title={`${y} x ${x}: ${val}`}
                  className="rounded-lg border border-white/10 flex items-center justify-center p-2 transition hover:scale-105"
                  style={{
                    backgroundColor: accentColor,
                    opacity: opacity,
                  }}
                >
                  <span className="font-bold text-white shadow-sm">{val}</span>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// Custom SVG Renderer for Sankey Flow Diagram
const CustomSankeyRenderer: React.FC<{ data: any[] }> = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  const sources = Array.from(new Set(data.map((d) => String(d.source || "Source"))));
  const targets = Array.from(new Set(data.map((d) => String(d.target || "Target"))));

  const totalVal = data.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

  return (
    <div className="w-full h-full flex items-center justify-between p-4 font-mono relative overflow-hidden">
      {/* Sources Column */}
      <div className="flex flex-col justify-around h-full space-y-2 z-10">
        {sources.map((s, idx) => (
          <div
            key={idx}
            className="rounded-xl bg-[#FE6749] border border-white/20 px-3 py-1.5 text-xs font-bold text-white shadow-lg text-center truncate max-w-[120px]"
          >
            {s}
          </div>
        ))}
      </div>

      {/* Connection Flow List */}
      <div className="flex-1 px-4 space-y-2 my-auto z-10">
        {data.slice(0, 5).map((flow, idx) => {
          const val = Number(flow.value) || 0;
          const pct = totalVal > 0 ? Math.round((val / totalVal) * 100) : 0;
          return (
            <div
              key={idx}
              className="rounded-lg bg-white/5 border border-white/10 p-2 flex items-center justify-between text-[10px] text-white/80"
            >
              <span className="text-[#FE6749] font-semibold">{flow.source}</span>
              <span className="text-white/40">-- {val} ({pct}%) --&gt;</span>
              <span className="text-[#A5329E] font-semibold">{flow.target}</span>
            </div>
          );
        })}
      </div>

      {/* Targets Column */}
      <div className="flex flex-col justify-around h-full space-y-2 z-10">
        {targets.map((t, idx) => (
          <div
            key={idx}
            className="rounded-xl bg-[#A5329E] border border-white/20 px-3 py-1.5 text-xs font-bold text-white shadow-lg text-center truncate max-w-[120px]"
          >
            {t}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ChartCard: React.FC<ChartCardProps> = ({
  series,
  defaultType = "bar",
  accentColor = "#FE6749",
  secondaryColor = "#A5329E",
  className,
  onClick,
}) => {
  if (!series || !series.data || !Array.isArray(series.data) || series.data.length === 0) {
    return (
      <div
        className={cn(
          "rounded-3xl bg-[#18191b] border border-white/10 p-6 min-h-[320px] flex items-center justify-center text-center text-white/40 font-mono text-xs",
          className
        )}
      >
        <span>[Insufficient data for visualization]</span>
      </div>
    );
  }

  const chartType: ChartType = (series.type && series.type !== "none" ? series.type : defaultType) as ChartType;
  const isMultiCohort = series.data.length >= 4;

  const xAxisTitle = series.xAxisLabel || series.xKey || "Category";
  const yAxisTitle = series.yAxisLabel || series.yKey || "Value";
  const zAxisTitle = series.zAxisLabel || "Intensity";

  // Data key mappers
  const xKey = series.xKey || (series.data[0]?.label !== undefined ? "label" : series.data[0]?.x !== undefined ? "x" : "name");
  const yKey = series.yKey || (series.data[0]?.value !== undefined ? "value" : series.data[0]?.y !== undefined ? "y" : "value");

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-3xl bg-[#18191b] border border-white/10 p-6 min-h-[340px] flex flex-col justify-between shadow-xl relative overflow-hidden cursor-pointer hover:border-[#FE6749]/50 transition-all duration-200 group",
        className
      )}
    >
      {/* Hover Enlarge Indicator Badge */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        <span className="rounded-full px-2.5 py-1 text-[10px] font-mono bg-[#FE6749] text-white shadow-md flex items-center gap-1">
          <Maximize2 className="w-3 h-3" />
          <span>[Click to Expand]</span>
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 pr-16 group-hover:pr-28 transition-all">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight uppercase font-mono truncate">
            {series.title || "[Data Visualization]"}
          </h3>
          <p className="text-[11px] text-white/50 tracking-wider font-mono">
            Axis: {xAxisTitle} vs {yAxisTitle} {series.zAxisLabel ? `vs ${zAxisTitle}` : ""}
          </p>
        </div>
        <div className="rounded-full px-2.5 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 text-white/70 shrink-0">
          [{chartType.toUpperCase()} CHART]
        </div>
      </div>

      {/* Explicit Height Chart Canvas Container */}
      <div className="w-full h-[260px] min-h-[260px] relative font-mono">
        {chartType === "boxplot" ? (
          <CustomBoxPlotRenderer data={series.data} accentColor={accentColor} />
        ) : chartType === "heatmap" ? (
          <CustomHeatmapRenderer data={series.data} accentColor={accentColor} />
        ) : chartType === "sankey" ? (
          <CustomSankeyRenderer data={series.data} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "area" ? (
              <AreaChart data={series.data} margin={{ top: 10, right: 10, left: -20, bottom: isMultiCohort ? 25 : 0 }}>
                <defs>
                  <linearGradient id="colorCoralCard" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accentColor} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={accentColor} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis
                  dataKey={xKey}
                  stroke="rgba(255, 255, 255, 0.4)"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={isMultiCohort ? -20 : 0}
                  textAnchor={isMultiCohort ? "end" : "middle"}
                />
                <YAxis stroke="rgba(255, 255, 255, 0.4)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#212222",
                    borderColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "12px",
                    color: "#ffffff",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={yKey}
                  stroke={accentColor}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCoralCard)"
                />
              </AreaChart>
            ) : chartType === "line" ? (
              <LineChart data={series.data} margin={{ top: 10, right: 10, left: -20, bottom: isMultiCohort ? 25 : 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis
                  dataKey={xKey}
                  stroke="rgba(255, 255, 255, 0.4)"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={isMultiCohort ? -20 : 0}
                  textAnchor={isMultiCohort ? "end" : "middle"}
                />
                <YAxis stroke="rgba(255, 255, 255, 0.4)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#212222",
                    borderColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "12px",
                    color: "#ffffff",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={yKey}
                  stroke={accentColor}
                  strokeWidth={3}
                  dot={{ fill: accentColor, r: 4 }}
                  activeDot={{ r: 6, fill: "#ffffff" }}
                />
              </LineChart>
            ) : chartType === "pie" ? (
              <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
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
                  data={series.data}
                  dataKey={yKey}
                  nameKey={xKey}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                >
                  {series.data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                      stroke="#18191b"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
              </PieChart>
            ) : chartType === "scatter" ? (
              <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="x" type="number" stroke="rgba(255, 255, 255, 0.4)" fontSize={11} />
                <YAxis dataKey="y" type="number" stroke="rgba(255, 255, 255, 0.4)" fontSize={11} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    backgroundColor: "#212222",
                    borderColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "12px",
                    color: "#ffffff",
                    fontSize: "12px",
                  }}
                />
                <Scatter data={series.data} fill={accentColor} />
              </ScatterChart>
            ) : chartType === "bubble" ? (
              <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="x" type="number" stroke="rgba(255, 255, 255, 0.4)" fontSize={11} />
                <YAxis dataKey="y" type="number" stroke="rgba(255, 255, 255, 0.4)" fontSize={11} />
                <ZAxis dataKey="z" range={[60, 400]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    backgroundColor: "#212222",
                    borderColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "12px",
                    color: "#ffffff",
                    fontSize: "12px",
                  }}
                />
                <Scatter data={series.data} fill={secondaryColor} />
              </ScatterChart>
            ) : chartType === "treemap" ? (
              <Treemap
                data={series.data}
                dataKey="value"
                nameKey="name"
                aspectRatio={4 / 3}
                stroke="#18191b"
                fill={accentColor}
              />
            ) : (
              /* Default "bar" or "histogram" */
              <BarChart data={series.data} margin={{ top: 10, right: 10, left: -20, bottom: isMultiCohort ? 30 : 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis
                  dataKey={xKey}
                  stroke="rgba(255, 255, 255, 0.4)"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={isMultiCohort ? -25 : 0}
                  textAnchor={isMultiCohort ? "end" : "middle"}
                />
                <YAxis stroke="rgba(255, 255, 255, 0.4)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#212222",
                    borderColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "12px",
                    color: "#ffffff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey={yKey} fill={accentColor} radius={[8, 8, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
