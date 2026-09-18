"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { DatasetSummaryNarrative } from "@/lib/types";
import { cardEntrance, staggerContainer, slideUp } from "@/lib/motion";
import { Layers, Database, Sparkles, CheckCircle2, Clock, BarChart3, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatasetSummaryCardProps {
  summary?: DatasetSummaryNarrative;
  className?: string;
}

export const DatasetSummaryCard: React.FC<DatasetSummaryCardProps> = ({ summary, className }) => {
  const shouldReduceMotion = useReducedMotion();

  if (!summary) return null;

  return (
    <motion.div
      variants={cardEntrance}
      className={cn(
        "rounded-3xl bg-[#18191b] border border-white/10 p-5 md:p-6 space-y-4 shadow-xl font-sans relative overflow-hidden",
        className
      )}
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#C86342]/15 border border-[#C86342]/30 text-[#C86342] flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              [{summary.title.toUpperCase()}]
            </h3>
            <p className="text-[10px] text-white/50 font-mono">
              Autonomous dataset schema profiling & analytical rationale
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 text-white/70">
            {summary.recordsCount} records • {summary.attributesCount} attributes
          </span>
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-mono bg-[#A5329E]/20 text-[#FE88ED] border border-[#A5329E]/40 font-semibold">
            [{summary.datasetType}]
          </span>
        </div>
      </div>

      {/* Main Plain-English Overview */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 text-xs text-white/90 leading-relaxed font-sans">
        <p>{summary.overview}</p>
      </div>

      {/* Structured Multi-Attribute Metadata Grid */}
      <motion.div
        variants={staggerContainer(0.04, 0.02)}
        initial={shouldReduceMotion ? undefined : "hidden"}
        animate={shouldReduceMotion ? undefined : "visible"}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-[11px]"
      >
        {/* Dimensions */}
        <motion.div variants={slideUp} className="rounded-xl bg-white/[0.02] border border-white/5 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase">
            <Layers className="w-3 h-3 text-[#C86342]" />
            <span>[Dimensions]</span>
          </div>
          <div className="text-white/80 font-medium truncate">
            {summary.dimensions.length > 0 ? summary.dimensions.join(" • ") : "[None Identified]"}
          </div>
        </motion.div>

        {/* Measures */}
        <motion.div variants={slideUp} className="rounded-xl bg-white/[0.02] border border-white/5 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase">
            <BarChart3 className="w-3 h-3 text-[#A5329E]" />
            <span>[Measures]</span>
          </div>
          <div className="text-white/80 font-medium truncate">
            {summary.measures.length > 0 ? summary.measures.join(" • ") : "[Discrete Counts]"}
          </div>
        </motion.div>

        {/* Temporal Info */}
        <motion.div variants={slideUp} className="rounded-xl bg-white/[0.02] border border-white/5 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase">
            <Clock className="w-3 h-3 text-white/40" />
            <span>[Temporal Scope]</span>
          </div>
          <div className="text-white/80 font-medium truncate">
            {summary.temporalInfo || "[Static Non-Temporal]"}
          </div>
        </motion.div>

        {/* Data Quality */}
        <motion.div variants={slideUp} className="rounded-xl bg-white/[0.02] border border-white/5 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>[Data Quality]</span>
          </div>
          <div className="text-white/80 font-medium truncate">
            {summary.dataQualityText}
          </div>
        </motion.div>
      </motion.div>

      {/* Analysis Available Pills Row */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-1 font-mono text-[10px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-white/40 uppercase mr-1">Analysis Available:</span>
          {summary.analysisAvailable.map((item, idx) => (
            <span
              key={idx}
              className="rounded-md px-2 py-0.5 bg-white/[0.04] border border-white/10 text-white/80"
            >
              {`[${item}]`}
            </span>
          ))}
        </div>
      </div>

    </motion.div>
  );
};
