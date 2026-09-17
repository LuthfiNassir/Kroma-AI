"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, Sparkles, BarChart2, CheckCircle2, Info, Lightbulb, TrendingUp, ChevronDown, ChevronRight, Cpu } from "lucide-react";
import { ChartDataSeries } from "@/lib/types";
import { ChartCard } from "./ChartCard";
import {
  modalBackdropVariants,
  modalContentVariants,
  staggerContainer,
  modalSectionReveal,
  buttonTapMotion,
} from "@/lib/motion";

interface ChartModalProps {
  chart: ChartDataSeries | null;
  onClose: () => void;
}

export const ChartModal: React.FC<ChartModalProps> = ({ chart, onClose }) => {
  const shouldReduceMotion = useReducedMotion();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

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

  const analysis = chart?.analysis;
  const keyStats = analysis?.keyStats || [];
  const stat1 = keyStats[0] || { label: "Largest Group", value: "Primary Category" };
  const stat2 = keyStats[1] || { label: "Smallest Group", value: "Secondary Category" };
  const stat3 = keyStats[2] || { label: "Difference", value: "Comparison Delta" };
  const stat4 = keyStats[3] || { label: "Groups Compared", value: `${chart?.data?.length || 0} groups` };

  const observations = analysis?.whatStandsOut || [
    analysis?.trend || "Values reflect relative distribution across compared categories.",
    `Total records analyzed: ${chart?.data?.length || 0} discrete points.`,
  ];

  const technicalDetails = analysis?.technicalDetails || [];

  return (
    <AnimatePresence>
      {chart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 font-sans overflow-hidden">
          {/* Backdrop with Motion Fade */}
          <motion.div
            key="modal-backdrop"
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 backdrop-blur-md bg-black/80 cursor-pointer"
          />

          {/* Modal Dialog Container - Scale & Fade, Fixed viewport height */}
          <motion.div
            key="modal-content"
            variants={shouldReduceMotion ? undefined : modalContentVariants}
            initial={shouldReduceMotion ? undefined : "hidden"}
            animate={shouldReduceMotion ? undefined : "visible"}
            exit={shouldReduceMotion ? undefined : "exit"}
            className="relative z-10 w-[95vw] max-w-7xl h-[90vh] max-h-[90vh] rounded-3xl bg-[#18191b] border border-white/15 p-5 md:p-6 shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header - Fixed at top, never scrolls */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[#FE6749]/15 border border-[#FE6749]/30 text-[#FE6749] flex items-center justify-center shrink-0">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg md:text-xl font-bold text-white tracking-tight font-mono uppercase truncate">
                    {chart.title}
                  </h2>
                  <p className="text-[11px] text-white/50 font-mono truncate">
                    [Autonomous Visual Deep-Dive & Decision Intelligence]
                  </p>
                </div>
              </div>

              <motion.button
                {...(shouldReduceMotion ? {} : buttonTapMotion)}
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer border border-white/10 font-mono shrink-0 ml-3"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            </div>

            {/* Modal Body: Two-Column Layout */}
            <div className="flex-1 min-h-0 pt-4 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden">
              {/* Left Pane: Fixed Stationary Chart Canvas (Does NOT scroll) */}
              <div className="lg:col-span-7 h-full min-h-0 rounded-2xl bg-[#212222] border border-white/10 p-4 flex flex-col justify-between shadow-inner overflow-hidden">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <span className="text-xs font-mono font-semibold text-white/60 uppercase tracking-wider">
                    [Visual Canvas]
                  </span>
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 text-white/70">
                    [{chart.type?.toUpperCase() || "CHART"}]
                  </span>
                </div>

                <div className="flex-1 min-h-0 w-full h-full relative">
                  <ChartCard
                    series={chart}
                    className="bg-transparent border-0 shadow-none hover:border-transparent p-0 h-full w-full cursor-default"
                  />
                </div>
              </div>

              {/* Right Pane: Independently Scrollable Analysis Column */}
              <motion.div
                variants={staggerContainer(0.04, 0.05)}
                initial={shouldReduceMotion ? undefined : "hidden"}
                animate={shouldReduceMotion ? undefined : "visible"}
                className="lg:col-span-5 h-full min-h-0 overflow-y-auto pr-2 space-y-4 font-sans no-scrollbar"
              >
                {/* 1. What This Chart Shows */}
                <motion.div variants={modalSectionReveal} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white/60 uppercase tracking-wider font-mono">
                    <Info className="w-3.5 h-3.5 text-[#FE6749]" />
                    <span>[What This Chart Shows]</span>
                  </div>
                  <p className="text-xs text-white/90 leading-relaxed bg-white/[0.03] p-3.5 rounded-2xl border border-white/5 font-sans">
                    {analysis?.whatItShows ||
                      `This chart compares ${chart.yAxisLabel || "values"} across different ${chart.xAxisLabel || "groups"} in the dataset.`}
                  </p>
                </motion.div>

                {/* 2. The Main Finding */}
                <motion.div variants={modalSectionReveal} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#FE6749] uppercase tracking-wider font-mono">
                    <TrendingUp className="w-3.5 h-3.5 text-[#FE6749]" />
                    <span>[Main Finding]</span>
                  </div>
                  <div className="bg-[#FE6749]/10 border border-[#FE6749]/25 p-3.5 rounded-2xl text-xs text-white/95 font-medium leading-relaxed">
                    {analysis?.mainFinding ||
                      analysis?.trend ||
                      "The data reveals noticeable patterns and directions across the observations."}
                  </div>
                </motion.div>

                {/* 3. What Stands Out */}
                <motion.div variants={modalSectionReveal} className="space-y-1.5">
                  <span className="text-xs font-semibold text-white/60 uppercase tracking-wider block font-mono">
                    [What Stands Out]
                  </span>
                  <div className="space-y-2 text-xs text-white/85">
                    {observations.map((obs, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 bg-white/[0.02] p-2.5 rounded-xl border border-white/5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#FE6749] shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{obs}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* 4. The Numbers Behind It */}
                <motion.div variants={modalSectionReveal} className="space-y-1.5">
                  <span className="text-xs font-semibold text-white/60 uppercase tracking-wider block font-mono">
                    [The Numbers Behind It]
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
                </motion.div>

                {/* 5. Why It Matters */}
                <motion.div variants={modalSectionReveal} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white/60 uppercase tracking-wider font-mono">
                    <Lightbulb className="w-3.5 h-3.5 text-[#A5329E]" />
                    <span>[Why It Matters]</span>
                  </div>
                  <p className="text-xs text-white/85 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    {analysis?.whyItMatters ||
                      "Contextualizing these numbers provides clear decision-ready signals without requiring manual statistical recalculations."}
                  </p>
                </motion.div>

                {/* 6. Takeaway Callout Banner */}
                <motion.div
                  variants={modalSectionReveal}
                  className="rounded-2xl border-l-2 border-[#A5329E] bg-[#A5329E]/10 p-4 space-y-1.5 shadow-lg"
                >
                  <div className="flex items-center gap-1.5 text-[#FE88ED]">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider font-mono">
                      [Takeaway]
                    </span>
                  </div>
                  <p className="text-xs text-white/95 leading-relaxed font-sans font-medium">
                    {analysis?.takeaway ||
                      "Use these findings to inform operational priorities and forward projections."}
                  </p>
                </motion.div>

                {/* 7. Collapsible Technical Details (For Analysts) */}
                {technicalDetails.length > 0 && (
                  <motion.div variants={modalSectionReveal} className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 font-mono text-xs text-white/60 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Cpu className="w-3.5 h-3.5 text-[#FE6749]" />
                        <span>[Technical Details]</span>
                      </div>
                      {showTechnicalDetails ? (
                        <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                      )}
                    </button>

                    {showTechnicalDetails && (
                      <div className="mt-2 p-3 rounded-xl bg-black/40 border border-white/5 space-y-2 font-mono text-[11px]">
                        {technicalDetails.map((tech, tIdx) => (
                          <div key={tIdx} className="flex items-center justify-between border-b border-white/5 pb-1">
                            <span className="text-white/40">{tech.label}:</span>
                            <span className="text-white/80 font-bold">{tech.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
