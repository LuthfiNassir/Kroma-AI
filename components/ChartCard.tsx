"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
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
  ScatterChart,
  Scatter,
  Treemap,
} from "recharts";
import { ChartDataSeries, ChartType } from "@/lib/types";
import { cardEntrance, subtleHoverMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  series: ChartDataSeries | null;
  defaultType?: ChartType;
  accentColor?: string;
  secondaryColor?: string;
  className?: string;
  onClick?: () => void;
  // Modal-local analytical zoom props
  zoomedData?: any[];
  yDomain?: [number | "auto", number | "auto"];
  xDomain?: [number | "auto", number | "auto"];
  isZoomed?: boolean;
  isHero?: boolean;
  isModal?: boolean;
}

const COLOR_PALETTE = ["#C86342", "#A5329E", "#FE88ED", "#FF9E88", "#7D2277", "#38BDF8", "#34D399"];

// Custom SVG Renderer for Boxplot
const CustomBoxPlotRenderer: React.FC<{ data: any[]; accentColor: string }> = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  return (
    <div className="w-full h-full flex flex-col justify-around py-2 px-4 space-y-2 overflow-y-auto font-mono no-scrollbar">
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
              <div
                className="absolute h-0.5 bg-white/30"
                style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
              />
              <div className="absolute h-3 w-0.5 bg-white/40" style={{ left: `${minPct}%` }} />
              <div className="absolute h-3 w-0.5 bg-white/40" style={{ left: `${maxPct}%` }} />
              <div
                className="absolute h-4 rounded bg-[#A5329E]/40 border border-[#FE88ED]/50"
                style={{ left: `${q1Pct}%`, width: `${boxWidthPct}%` }}
              />
              <div
                className="absolute h-4 w-1 bg-[#C86342] z-10 rounded-full"
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

export const ChartCard: React.FC<ChartCardProps> = ({
  series,
  defaultType = "bar",
  accentColor = "#C86342",
  className,
  onClick,
  zoomedData,
  yDomain,
  xDomain,
  isZoomed = false,
  isHero = false,
  isModal = false,
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (!series || !series.data || !Array.isArray(series.data) || series.data.length === 0) {
    return (
      <div
        className={cn(
          "rounded-3xl bg-[#18191b] border border-white/10 p-6 h-[340px] min-h-[340px] max-h-[340px] flex items-center justify-center text-center text-white/40 font-mono text-xs",
          className
        )}
      >
        <span>[Insufficient data for visualization]</span>
      </div>
    );
  }

  // Use zoomed data slice if passed (expanded view), otherwise baseline dashboard dataset
  const effectiveData = (zoomedData && zoomedData.length > 0) ? zoomedData : series.data;

  const chartType: ChartType = (series.type && series.type !== "none" ? series.type : defaultType) as ChartType;
  const isMultiCohort = effectiveData.length >= 4;
  const isForecastChart = series.isForecastChart || (effectiveData[0]?.historical !== undefined && effectiveData[0]?.forecast !== undefined);

  const xAxisTitle = series.xAxisLabel || series.xKey || "Category";
  const yAxisTitle = series.yAxisLabel || series.yKey || "Value";

  // Data key mappers
  const xKey = series.xKey || (effectiveData[0]?.label !== undefined ? "label" : effectiveData[0]?.x !== undefined ? "x" : "name");
  const yKey = series.yKey || (effectiveData[0]?.value !== undefined ? "value" : effectiveData[0]?.y !== undefined ? "y" : "value");

  // Semantic value formatter for tooltips & axes (currency, percentage, count, or indexed)
  const formatSpecificMetric = (val: any, targetContext?: string) => {
    if (typeof val !== "number" || isNaN(val)) return String(val ?? "");
    if (series.isIndexed) {
      return `${Number(val.toFixed(1)).toLocaleString()} (Index)`;
    }
    const context = (targetContext || "").toLowerCase();
    const isCount = /\b(units?|counts?|items?|orders?|quantity|users?|sessions?|rows?)\b/i.test(context);
    if (isCount) {
      return Number(val.toFixed(0)).toLocaleString();
    }
    const isCurrency = /\b(revenue|sales|profit|cost|price|spend|budget|expense|salary|amount|fare|\$)\b/i.test(context);
    const isPercent = /\b(pct|rate|ratio|percent|percentage|margin|%)\b/i.test(context);

    if (isCurrency) {
      return `$${Number(val.toFixed(2)).toLocaleString()}`;
    }
    if (isPercent) {
      return `${Number(val.toFixed(2)).toLocaleString()}%`;
    }
    return Number(val.toFixed(2)).toLocaleString();
  };

  const formatMetricValue = (val: any, nameKey?: string) => {
    return formatSpecificMetric(val, nameKey || yAxisTitle);
  };

  // Calculate total volume for pie/donut legend percentage
  const totalPieVolume = effectiveData.reduce((acc, curr) => acc + (Number(curr[yKey]) || 0), 0);

  // Multi-series keys for line charts
  const multiSeriesKeys = chartType === "line" && !isForecastChart && effectiveData[0]
    ? Object.keys(effectiveData[0]).filter(
        (k) => k !== xKey && k !== "label" && k !== "name" && k !== "category" && typeof effectiveData[0][k] === "number"
      )
    : [];

  // Deterministic canvas height based on widget tier and extra header/legend presence
  const hasExtraLegend = isForecastChart || multiSeriesKeys.length > 1;
  const isDonut = chartType === "pie";

  let canvasHeight = 220; // default standard
  if (isModal) {
    canvasHeight = 420;
  } else if (isHero) {
    if (isDonut) canvasHeight = 220;
    else if (hasExtraLegend) canvasHeight = 235;
    else canvasHeight = 260;
  } else {
    if (isDonut) canvasHeight = 180;
    else if (hasExtraLegend) canvasHeight = 195;
    else canvasHeight = 220;
  }

  return (
    <motion.div
      variants={cardEntrance}
      {...(onClick && !shouldReduceMotion ? subtleHoverMotion : {})}
      onClick={onClick}
      className={cn(
        "rounded-3xl bg-[#18191b] border border-white/10 p-6 flex flex-col justify-between shadow-xl relative overflow-hidden transition-colors duration-200 group min-w-0 w-full",
        isModal ? "h-full w-full" : isHero ? "h-[380px] min-h-[380px] max-h-[380px]" : "h-[340px] min-h-[340px] max-h-[340px]",
        onClick && "cursor-pointer hover:border-[#C86342]/50",
        className
      )}
    >
      {/* Hover Enlarge Indicator Badge (On dashboard cards only) */}
      {onClick && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <span className="rounded-full px-2.5 py-1 text-[10px] font-mono bg-[#C86342] text-white shadow-md flex items-center gap-1">
            <Maximize2 className="w-3 h-3" />
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3 pr-8 transition-all shrink-0">
        <div className="min-w-0 flex-1">
          <h3 
            title={series.title || undefined}
            className="text-sm font-semibold text-white tracking-tight uppercase font-mono truncate"
          >
            {series.title || "[Data Visualization]"}
          </h3>
          <p 
            title={isForecastChart ? "Actual History vs 6-Month Projection" : `Axis: ${xAxisTitle} vs ${yAxisTitle}`}
            className="text-xs text-white/50 font-mono truncate"
          >
            {isForecastChart ? "Actual History vs 6-Month Projection" : `Axis: ${xAxisTitle} vs ${yAxisTitle}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {isZoomed && (
            <span className="rounded-full px-2 py-0.5 text-[9px] font-mono bg-[#C86342]/20 text-[#C86342] border border-[#C86342]/40">
              [ZOOMED VIEW]
            </span>
          )}
          <div className="rounded-full px-2.5 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 text-white/70">
            {series.forecastBadge
              ? `[${series.forecastBadge}]`
              : isForecastChart
              ? "[FORECAST]"
              : `[${chartType.toUpperCase()} CHART]`}
          </div>
        </div>
      </div>

      {/* Forecast Indicator Pill Legend */}
      {isForecastChart && (
        <div className="flex items-center gap-3 mb-2 font-mono text-[11px] shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-[#C86342] rounded-full inline-block" />
            <span className="text-white/80 font-semibold">Actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-[#FE88ED] border-b border-dashed border-[#FE88ED] inline-block" />
            <span className="text-[#FE88ED] font-semibold">
              {series.isExploratoryForecast ? "Directional Projection (+6 Periods)" : "Forecast (+6 Periods)"}
            </span>
          </div>
        </div>
      )}

      {/* Multi-series Pill Legend */}
      {multiSeriesKeys.length > 1 && (
        <div className="flex items-center gap-3 mb-2 font-mono text-[10px] flex-wrap shrink-0">
          {multiSeriesKeys.map((k, i) => (
            <div key={k} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: COLOR_PALETTE[i % COLOR_PALETTE.length] }}
              />
              <span className="text-white/80 capitalize">{k.replace(/_/g, " ")}</span>
            </div>
          ))}
        </div>
      )}

      {/* Responsive Width, Stable Fixed-Height Chart Canvas Container */}
      <div
        className={cn(
          "w-full relative font-mono overflow-hidden shrink-0",
          isModal ? "h-full flex-1 min-h-[350px]" : ""
        )}
        style={
          isModal
            ? undefined
            : {
                height: `${canvasHeight}px`,
                minHeight: `${canvasHeight}px`,
                maxHeight: `${canvasHeight}px`,
              }
        }
      >
        {chartType === "boxplot" ? (
          <CustomBoxPlotRenderer data={effectiveData} accentColor={accentColor} />
        ) : chartType === "heatmap" ? (
          <CustomHeatmapRenderer data={effectiveData} accentColor={accentColor} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "area" ? (
              <AreaChart data={effectiveData} margin={{ top: 10, right: 10, left: -10, bottom: isMultiCohort ? 25 : 0 }}>
                <defs>
                  <linearGradient id={`gradient_${series.id || "card"}`} x1="0" y1="0" x2="0" y2="1">
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
                  interval={effectiveData.length > 12 ? "preserveStartEnd" : 0}
                  angle={isMultiCohort ? -20 : 0}
                  textAnchor={isMultiCohort ? "end" : "middle"}
                />
                <YAxis
                  width={42}
                  domain={yDomain || ["auto", "auto"]}
                  stroke="rgba(255, 255, 255, 0.4)"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => formatMetricValue(val)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#212222",
                    borderColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "12px",
                    color: "#ffffff",
                    fontSize: "12px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                  }}
                  formatter={(val: any, name: any) => [
                    formatMetricValue(val, String(name)),
                    String(name).replace(/_/g, " "),
                  ]}
                  labelFormatter={(label: any) => `${xAxisTitle}: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey={yKey}
                  stroke={accentColor}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill={`url(#gradient_${series.id || "card"})`}
                  isAnimationActive={!shouldReduceMotion}
                  animationDuration={350}
                  animationEasing="ease-out"
                />
              </AreaChart>
            ) : chartType === "line" ? (
              <LineChart data={effectiveData} margin={{ top: 10, right: 10, left: -10, bottom: isMultiCohort ? 25 : 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis
                  dataKey={xKey}
                  stroke="rgba(255, 255, 255, 0.4)"
                  fontSize={10}
                  tickLine={false}
                  interval={effectiveData.length > 12 ? "preserveStartEnd" : 0}
                  angle={isMultiCohort ? -20 : 0}
                  textAnchor={isMultiCohort ? "end" : "middle"}
                />
                <YAxis
                  width={42}
                  domain={yDomain || ["auto", "auto"]}
                  stroke="rgba(255, 255, 255, 0.4)"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => formatMetricValue(val)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#212222",
                    borderColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "12px",
                    color: "#ffffff",
                    fontSize: "12px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                  }}
                  formatter={(val: any, name: any) => [
                    formatMetricValue(val, String(name)),
                    String(name).replace(/_/g, " "),
                  ]}
                  labelFormatter={(label: any) => `${xAxisTitle}: ${label}`}
                />
                {isForecastChart ? (
                  <>
                    <Line
                      name="Actual"
                      type="monotone"
                      dataKey="historical"
                      stroke="#C86342"
                      strokeWidth={3}
                      dot={{ fill: "#C86342", r: 3 }}
                      activeDot={{ r: 5, fill: "#ffffff" }}
                      isAnimationActive={!shouldReduceMotion}
                      connectNulls={false}
                    />
                    <Line
                      name="Forecast"
                      type="monotone"
                      dataKey="forecast"
                      stroke="#FE88ED"
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      dot={{ fill: "#FE88ED", r: 4 }}
                      activeDot={{ r: 6, fill: "#ffffff" }}
                      isAnimationActive={!shouldReduceMotion}
                      connectNulls={true}
                    />
                  </>
                ) : multiSeriesKeys.length > 0 ? (
                  multiSeriesKeys.map((key, i) => (
                    <Line
                      key={key}
                      name={key.replace(/_/g, " ")}
                      type="monotone"
                      dataKey={key}
                      stroke={COLOR_PALETTE[i % COLOR_PALETTE.length]}
                      strokeWidth={i === 0 ? 3 : 2}
                      dot={{ fill: COLOR_PALETTE[i % COLOR_PALETTE.length], r: 3 }}
                      activeDot={{ r: 5, fill: "#ffffff" }}
                      isAnimationActive={!shouldReduceMotion}
                    />
                  ))
                ) : (
                  <Line
                    type="monotone"
                    dataKey={yKey}
                    stroke={accentColor}
                    strokeWidth={3}
                    dot={{ fill: accentColor, r: 4 }}
                    activeDot={{ r: 6, fill: "#ffffff" }}
                    isAnimationActive={!shouldReduceMotion}
                    animationDuration={350}
                    animationEasing="ease-out"
                  />
                )}
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
                  formatter={(val: any, name: any) => [
                    formatMetricValue(val, String(name)),
                    String(name).replace(/_/g, " "),
                  ]}
                />
                <Pie
                  data={effectiveData}
                  dataKey={yKey}
                  nameKey={xKey}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  isAnimationActive={!shouldReduceMotion}
                  animationDuration={350}
                  animationEasing="ease-out"
                >
                  {effectiveData.map((entry, index) => (
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
              <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={xDomain || ["auto", "auto"]}
                  stroke="rgba(255, 255, 255, 0.4)"
                  fontSize={11}
                  tickFormatter={(val) => formatSpecificMetric(val, xAxisTitle)}
                />
                <YAxis
                  width={42}
                  dataKey="y"
                  type="number"
                  domain={yDomain || ["auto", "auto"]}
                  stroke="rgba(255, 255, 255, 0.4)"
                  fontSize={11}
                  tickFormatter={(val) => formatSpecificMetric(val, yAxisTitle)}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    backgroundColor: "#212222",
                    borderColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "12px",
                    color: "#ffffff",
                    fontSize: "12px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                  }}
                  formatter={(val: any, name: any) => {
                    const isX = String(name).toLowerCase() === "x";
                    const label = isX ? xAxisTitle : yAxisTitle;
                    return [
                      formatSpecificMetric(val, label),
                      label.replace(/_/g, " "),
                    ];
                  }}
                />
                <Scatter
                  data={effectiveData}
                  fill={accentColor}
                  isAnimationActive={!shouldReduceMotion}
                  animationDuration={350}
                  animationEasing="ease-out"
                />
              </ScatterChart>
            ) : chartType === "treemap" ? (
              <Treemap
                data={effectiveData}
                dataKey="value"
                nameKey="name"
                aspectRatio={4 / 3}
                stroke="#18191b"
                fill={accentColor}
                isAnimationActive={!shouldReduceMotion}
              />
            ) : (
              /* Default "bar" or "histogram" */
              <BarChart data={effectiveData} margin={{ top: 10, right: 10, left: -10, bottom: isMultiCohort ? 30 : 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis
                  dataKey={xKey}
                  stroke="rgba(255, 255, 255, 0.4)"
                  fontSize={10}
                  tickLine={false}
                  interval={effectiveData.length > 12 ? "preserveStartEnd" : 0}
                  angle={isMultiCohort ? -25 : 0}
                  textAnchor={isMultiCohort ? "end" : "middle"}
                />
                <YAxis
                  width={42}
                  domain={yDomain || ["auto", "auto"]}
                  stroke="rgba(255, 255, 255, 0.4)"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => formatMetricValue(val, yAxisTitle)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#212222",
                    borderColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "12px",
                    color: "#ffffff",
                    fontSize: "12px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                  }}
                  formatter={(val: any, name: any) => [
                    formatMetricValue(val, String(name)),
                    String(name).replace(/_/g, " "),
                  ]}
                  labelFormatter={(label: any) => `${xAxisTitle}: ${label}`}
                />
                <Bar
                  dataKey={yKey}
                  fill={accentColor}
                  radius={[8, 8, 0, 0]}
                  isAnimationActive={!shouldReduceMotion}
                  animationDuration={350}
                  animationEasing="ease-out"
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* DEDICATED STRUCTURED DONUT CHART LEGEND */}
      {chartType === "pie" && (
        <div className="mt-3 pt-3 border-t border-white/10 font-mono text-[11px] grid grid-cols-2 gap-1.5">
          {effectiveData.map((item, idx) => {
            const catName = String(item[xKey] || item.label || item.name || `Item ${idx + 1}`);
            const val = Number(item[yKey] || item.value) || 0;
            const pct = item.pct || (totalPieVolume > 0 ? ((val / totalPieVolume) * 100).toFixed(1) : "0");
            const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];

            return (
              <div key={idx} className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0 inline-block"
                  style={{ backgroundColor: color }}
                />
                <span className="text-white/80 font-medium truncate">{catName}:</span>
                <span className="text-white/50 font-bold shrink-0">{val} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
