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
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { ChartDataSeries } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  series: ChartDataSeries | null;
  defaultType?: "bar" | "line" | "pie" | "scatter" | "area" | "none";
  accentColor?: string;
  secondaryColor?: string;
  className?: string;
  onClick?: () => void;
}

const COLOR_PALETTE = ["#FE6749", "#A5329E", "#FE88ED", "#FF9E88", "#7D2277", "#D44333"];

export const ChartCard: React.FC<ChartCardProps> = ({
  series,
  defaultType = "bar",
  accentColor = "#FE6749",
  secondaryColor = "#A5329E",
  className,
  onClick,
}) => {
  if (!series || !series.data || series.data.length === 0) {
    return (
      <div
        className={cn(
          "rounded-3xl bg-[#18191b] border border-white/10 p-6 min-h-[320px] flex flex-col items-center justify-center text-center text-white/40",
          className
        )}
      >
        <span className="text-xs font-mono">[No visualization data available]</span>
      </div>
    );
  }

  const chartType = series.type && series.type !== "none" ? series.type : defaultType;
  const isMultiCohort = series.data.length >= 4;

  const xAxisTitle = series.xAxisLabel || series.xKey;
  const yAxisTitle = series.yAxisLabel || series.yKey;

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-3xl bg-[#18191b] border border-white/10 p-6 min-h-[320px] flex flex-col justify-between shadow-xl relative overflow-hidden cursor-pointer hover:border-[#FE6749]/50 transition-all duration-200 group",
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
            Axis: {xAxisTitle} vs {yAxisTitle}
          </p>
        </div>
        <div className="rounded-full px-2.5 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 text-white/70 shrink-0">
          [{chartType.toUpperCase()} CHART]
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[240px] relative">
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
                dataKey={series.xKey}
                stroke="rgba(255, 255, 255, 0.4)"
                fontSize={10}
                tickLine={false}
                interval={0}
                angle={isMultiCohort ? -20 : 0}
                textAnchor={isMultiCohort ? "end" : "middle"}
              />
              <YAxis
                stroke="rgba(255, 255, 255, 0.4)"
                fontSize={11}
                tickLine={false}
              />
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
                dataKey={series.yKey}
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
                dataKey={series.xKey}
                stroke="rgba(255, 255, 255, 0.4)"
                fontSize={10}
                tickLine={false}
                interval={0}
                angle={isMultiCohort ? -20 : 0}
                textAnchor={isMultiCohort ? "end" : "middle"}
              />
              <YAxis
                stroke="rgba(255, 255, 255, 0.4)"
                fontSize={11}
                tickLine={false}
              />
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
                dataKey={series.yKey}
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
                dataKey={series.yKey}
                nameKey={series.xKey}
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
          ) : (
            <BarChart data={series.data} margin={{ top: 10, right: 10, left: -20, bottom: isMultiCohort ? 30 : 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis
                dataKey={series.xKey}
                stroke="rgba(255, 255, 255, 0.4)"
                fontSize={10}
                tickLine={false}
                interval={0}
                angle={isMultiCohort ? -25 : 0}
                textAnchor={isMultiCohort ? "end" : "middle"}
              />
              <YAxis
                stroke="rgba(255, 255, 255, 0.4)"
                fontSize={11}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#212222",
                  borderColor: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "12px",
                  color: "#ffffff",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey={series.yKey}
                fill={accentColor}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
