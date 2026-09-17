"use client";

import React, { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { DashboardState, ChartDataSeries } from "@/lib/types";
import { MetricCard } from "./MetricCard";
import { ChartCard } from "./ChartCard";
import { WhatIfWidget } from "./WhatIfWidget";
import { DataTable } from "./DataTable";
import { DatasetSummaryCard } from "./DatasetSummaryCard";
import { staggerContainer, cardEntrance, slideUp, subtleHoverMotion } from "@/lib/motion";
import { Sparkles, Activity } from "lucide-react";

interface BentoGridProps {
  dashboardState: DashboardState;
  onSelectChart?: (chart: ChartDataSeries) => void;
}

export const BentoGrid: React.FC<BentoGridProps> = ({
  dashboardState,
  onSelectChart,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const {
    profileType,
    profile,
    focus,
    kpis,
    charts,
    highlightsCard,
    tableData,
    columns,
    projectionData,
    forecastingSupported,
    forecastReason,
  } = dashboardState;

  const [activeProjectionData, setActiveProjectionData] = useState(projectionData || []);

  useEffect(() => {
    setActiveProjectionData(projectionData || []);
  }, [projectionData]);

  const handleApplyDelta = (deltaPercent: number) => {
    if (!projectionData) return;
    const updated = projectionData.map((item) => {
      if (item.projected !== null && item.projected !== undefined) {
        return {
          ...item,
          whatIf: Math.round((item.projected * (1 + deltaPercent / 100)) * 10) / 10,
        };
      }
      return item;
    });
    setActiveProjectionData(updated);
  };

  const highlightItems = highlightsCard?.items || [
    { label: "Data Quality Ratio", value: "100.0%", subtext: "0 schema anomalies" },
    { label: "Total Columns", value: `${columns.length} attrs`, subtext: "Successfully parsed" },
  ];

  // Compile active capability labels
  const caps = profile?.capabilities;
  const activeCapabilities: string[] = [];
  if (caps?.trendAnalysis.available) activeCapabilities.push("Trend Analysis");
  if (caps?.timeSeriesForecasting.available) activeCapabilities.push("Forecasting");
  if (caps?.correlationAnalysis.available) activeCapabilities.push("Correlation");
  if (caps?.cohortAnalysis.available) activeCapabilities.push("Cohorts");
  if (caps?.targetPrediction.available) activeCapabilities.push("Outcome Prediction");
  if (caps?.funnelAnalysis.available) activeCapabilities.push("Funnel Flow");
  if (caps?.distributionAnalysis.available) activeCapabilities.push("Distributions");

  const summary = dashboardState.summaryNarrative || profile?.summaryNarrative;

  return (
    <motion.div
      variants={staggerContainer(0.06, 0.02)}
      initial={shouldReduceMotion ? "visible" : "hidden"}
      animate="visible"
      className="w-full space-y-5"
    >
      {/* 0. DATASET SUMMARY PROFILE & RATIONALE WIDGET */}
      {summary && <DatasetSummaryCard summary={summary} />}

      {/* 1. DATASET INTELLIGENCE & CAPABILITY BAR */}
      <motion.div
        variants={cardEntrance}
        className="rounded-2xl bg-[#18191b] border border-white/10 p-4 space-y-3 shadow-lg"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FE6749] inline-block animate-pulse" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              [{profileType || "DATASET INTELLIGENCE"} PROFILE CANVAS]
            </span>
            {focus && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-mono bg-[#A5329E]/30 text-[#FE88ED] border border-[#A5329E]/50">
                [Focus: {focus}]
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 text-white/70">
              {tableData.length} records • {columns.length} attributes
            </span>
            {profile?.temporal.hasTemporal && (
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 text-white/70">
                {profile.temporal.observationCount} {profile.temporal.frequency} periods
              </span>
            )}
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 text-[#FE6749]">
              [{charts.length} Visual Perspectives]
            </span>
          </div>
        </div>

        {/* Capability Badges Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] font-mono">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-white/40 text-[10px] uppercase mr-1">Analysis Available:</span>
            {activeCapabilities.map((cap, idx) => (
              <span
                key={idx}
                className="rounded-md px-2 py-0.5 text-[10px] bg-white/[0.04] border border-white/10 text-white/80"
              >
                {`[${cap}]`}
              </span>
            ))}
          </div>

          {profile?.dataQuality && (
            <div className="text-[10px] text-white/50">
              Quality Score: <span className="text-white font-bold">{profile.dataQuality.completenessRate}%</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* 2. PRIMARY SOURCE DATASET TABLE */}
      <DataTable
        columns={columns}
        data={tableData}
        sourceType={dashboardState.sourceType}
      />

      {/* 3. TOP EXECUTIVE KPI ROW */}
      <motion.div
        variants={staggerContainer(0.04, 0.02)}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {kpis.slice(0, 4).map((kpi, idx) => (
          <div key={idx} className="min-w-0">
            <MetricCard data={kpi} />
          </div>
        ))}
      </motion.div>

      {/* 4. AUTONOMOUS ARCHETYPE BENTO GRID (VISUAL ANALYSIS) */}
      <motion.div
        variants={staggerContainer(0.05, 0.02)}
        className="grid grid-cols-1 md:grid-cols-12 gap-4"
      >
        {charts.map((chartWidget, idx) => {
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

        {/* HIGHLIGHTS SUMMARY CARD */}
        <motion.div
          variants={cardEntrance}
          {...(shouldReduceMotion ? {} : subtleHoverMotion)}
          className="md:col-span-6 rounded-3xl bg-[#18191b] border border-white/10 p-5 flex flex-col justify-between shadow-xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FE6749]" />
              <h3 className="text-sm font-semibold text-white tracking-tight uppercase font-mono">
                {highlightsCard?.title || "[Executive Intelligence Summary]"}
              </h3>
            </div>
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 text-white/60">
              [{highlightItems.length} Metrics]
            </span>
          </div>

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
        </motion.div>
      </motion.div>

      {/* 5. CONDITIONAL WHAT-IF SCENARIO WIDGET */}
      {forecastingSupported && activeProjectionData && activeProjectionData.length > 0 ? (
        <motion.div variants={cardEntrance}>
          <WhatIfWidget
            projectionData={activeProjectionData}
            onApplyDelta={handleApplyDelta}
          />
        </motion.div>
      ) : (
        <motion.div
          variants={cardEntrance}
          className="rounded-2xl bg-[#18191b]/70 border border-white/5 p-4 flex items-center justify-between text-xs font-mono text-white/50"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-white/30" />
            <span>[Forecasting Engine Inactive]</span>
          </div>
          <span>{forecastReason || "Requires continuous temporal dimension with sufficient historical observations."}</span>
        </motion.div>
      )}
    </motion.div>
  );
};
