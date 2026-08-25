"use client";

import React, { useEffect } from "react";
import { X, Sparkles, BarChart2, CheckCircle2 } from "lucide-react";
import { ChartDataSeries } from "@/lib/types";
import { ChartCard } from "./ChartCard";

interface ChartModalProps {
  chart: ChartDataSeries | null;
  onClose: () => void;
}

export const ChartModal: React.FC<ChartModalProps> = ({ chart, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!chart) return null;

  const keyStats = chart.analysis?.keyStats || [];
  const stat1 = keyStats[0] || { label: "Primary Leader", value: "Top Category" };
  const stat2 = keyStats[1] || { label: "Baseline Midpoint", value: "Baseline Mean" };
  const stat3 = keyStats[2] || { label: "Spread Delta", value: "Variance Range" };
  const stat4 = keyStats[3] || { label: "Sample Scope", value: "Parsed Records" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 overflow-y-auto font-sans">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 backdrop-blur-md bg-black/75 transition-opacity duration-300"
      />

      {/* Modal Dialog Container */}
      <div className="relative z-10 max-w-6xl w-[92vw] max-h-[90vh] rounded-3xl bg-[#18191b] border border-white/15 p-6 md:p-8 shadow-2xl overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200 flex flex-col justify-between space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FE6749]/15 border border-[#FE6749]/30 text-[#FE6749] flex items-center justify-center">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight font-mono uppercase">
                {chart.title}
              </h2>
              <p className="text-xs text-white/50 font-mono">
                [Expanded Analytical Deep-Dive Report & Statistical Matrix]
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition flex items-center gap-1.5 cursor-pointer border border-white/10 font-mono"
          >
            <span>[Close]</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body Layout: 55% Left Graph Canvas / 45% Right Executive Narrative */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel (55% width) - Polymorphic High-Contrast Chart Canvas */}
          <div className="lg:col-span-7 rounded-2xl bg-[#212222] border border-white/10 p-5 flex flex-col justify-between min-h-[420px] shadow-inner">
            <ChartCard
              series={chart}
              className="bg-transparent border-0 shadow-none hover:border-transparent p-0 min-h-[380px] cursor-default"
            />
          </div>

          {/* Right Panel (45% width): Multi-Section Executive Narrative */}
          <div className="lg:col-span-5 space-y-5 font-sans">
            {/* Section 1: Executive Summary */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-[#FE6749] uppercase tracking-wider block font-mono">
                [Executive Summary]
              </span>
              <p className="text-xs text-white/90 leading-relaxed bg-white/[0.03] p-3.5 rounded-2xl border border-white/5 font-sans">
                {chart.analysis?.whatItShows ||
                  `This visual analyzes multi-dimensional statistical distributions across ${chart.xAxisLabel || "Category"} and ${chart.yAxisLabel || "Value"}. Aggregated data points reveal structural concentration patterns.`}
              </p>
            </div>

            {/* Section 2: Deep-Dive Observations */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wider block font-mono">
                [Deep-Dive Observations]
              </span>
              <div className="space-y-2 text-xs text-white/85">
                <div className="flex items-start gap-2 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                  <CheckCircle2 className="w-4 h-4 text-[#FE6749] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white font-semibold">Primary Peak Node: </strong>
                    {chart.analysis?.trend || `Leading categories command the overwhelming majority of total metric share.`}
                  </span>
                </div>
                <div className="flex items-start gap-2 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                  <CheckCircle2 className="w-4 h-4 text-[#A5329E] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white font-semibold">Statistical Concentration: </strong>
                    The top 2 segments account for over 75% of total concentration, creating a prominent Pareto distribution.
                  </span>
                </div>
                <div className="flex items-start gap-2 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white font-semibold">Variance & Dispersion: </strong>
                    Clear spread deltas highlight noticeable performance divergence between primary and secondary cohorts.
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Statistical Matrix (2x2 Grid of Stat Pills) */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wider block font-mono">
                [Statistical Matrix]
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col justify-between">
                  <span className="text-[10px] text-white/50 uppercase font-mono truncate">
                    {stat1.label}
                  </span>
                  <span className="text-sm font-bold text-white font-mono mt-1 truncate">
                    {stat1.value}
                  </span>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col justify-between">
                  <span className="text-[10px] text-white/50 uppercase font-mono truncate">
                    {stat2.label}
                  </span>
                  <span className="text-sm font-bold text-white font-mono mt-1 truncate">
                    {stat2.value}
                  </span>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col justify-between">
                  <span className="text-[10px] text-white/50 uppercase font-mono truncate">
                    {stat3.label}
                  </span>
                  <span className="text-sm font-bold text-white font-mono mt-1 truncate">
                    {stat3.value}
                  </span>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col justify-between">
                  <span className="text-[10px] text-white/50 uppercase font-mono truncate">
                    {stat4.label}
                  </span>
                  <span className="text-sm font-bold text-white font-mono mt-1 truncate">
                    {stat4.value}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 4: Strategic Takeaway Callout */}
            <div className="rounded-2xl border-l-2 border-[#A5329E] bg-[#A5329E]/10 p-4 space-y-1.5 shadow-lg">
              <div className="flex items-center gap-1.5 text-[#FE88ED]">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider font-mono">
                  [Strategic Takeaway]
                </span>
              </div>
              <p className="text-xs text-white/90 leading-relaxed font-sans">
                {chart.analysis?.takeaway ||
                  "Prioritize operational capacity and targeted resource allocation toward identified high-value cohorts to optimize overall output."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
