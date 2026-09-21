"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  X,
  Sparkles,
  BarChart2,
  CheckCircle2,
  Info,
  Lightbulb,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Cpu,
  Plus,
  Minus,
  RotateCcw,
} from "lucide-react";
import { ChartDataSeries } from "@/lib/types";
import { ChartCard } from "./ChartCard";
import {
  ChartViewport,
  createInitialViewport,
  zoomViewportAtAnchor,
  panViewport,
  resolveZoomedDomain,
} from "@/lib/zoomEngine";
import {
  modalBackdropVariants,
  modalContentVariants,
  staggerContainer,
  modalSectionReveal,
  buttonTapMotion,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

interface ChartModalProps {
  chart: ChartDataSeries | null;
  onClose: () => void;
}

export const ChartModal: React.FC<ChartModalProps> = ({ chart, onClose }) => {
  const shouldReduceMotion = useReducedMotion();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Modal-local analytical chart viewport (strictly modal-local, never mutates baseline dashboard)
  const [viewport, setViewport] = useState<ChartViewport>(() => createInitialViewport(chart));

  // Ref for chart plotting canvas (for scoped trackpad / wheel zoom)
  const chartCanvasRef = useRef<HTMLDivElement>(null);

  // Reset zoom state on new chart or close
  useEffect(() => {
    setViewport(createInitialViewport(chart));
    setShowTechnicalDetails(false);
  }, [chart?.id, chart?.title]);

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

  // Analytical Zoom Handlers (Centered at 0.5 for button clicks)
  const handleZoomIn = useCallback(() => {
    setViewport((prev) => zoomViewportAtAnchor(prev, chart, 1.4, 0.5, 0.5));
  }, [chart]);

  const handleZoomOut = useCallback(() => {
    setViewport((prev) => zoomViewportAtAnchor(prev, chart, 0.7, 0.5, 0.5));
  }, [chart]);

  const handleReset = useCallback(() => {
    setViewport(createInitialViewport(chart));
  }, [chart]);

  const handlePanLeft = useCallback(() => {
    setViewport((prev) => panViewport(prev, chart, -1));
  }, [chart]);

  const handlePanRight = useCallback(() => {
    setViewport((prev) => panViewport(prev, chart, 1));
  }, [chart]);

  // Resolve viewport to data slice and recalibrated axes domains deterministically
  const zoomedResult = resolveZoomedDomain(chart, viewport);

  // Direct Trackpad Pinch & Mouse-Wheel Zoom strictly scoped to the Chart Plotting Area
  // Follows cursor focal position: the point under the cursor remains under the cursor
  useEffect(() => {
    const el = chartCanvasRef.current;
    if (!el) return;

    let touchStartDist = 0;
    let touchStartAnchorX = 0.5;

    const onWheel = (e: WheelEvent) => {
      // Strictly prevent outer modal, page, or browser zoom
      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;
      const anchorRatioX = Math.max(0.02, Math.min(0.98, relativeX / rect.width));
      const anchorRatioY = Math.max(0.02, Math.min(0.98, relativeY / rect.height));

      // Horizontal trackpad gesture or shift-scroll -> Pan horizontally when zoomed
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 8) {
        const deltaSteps = e.deltaX > 0 ? 1 : -1;
        setViewport((prev) => panViewport(prev, chart, deltaSteps));
        return;
      }

      // Trackpad pinch-to-zoom (fires wheel with ctrlKey=true) or standard mouse wheel
      let zoomFactor = 1.0;
      if (e.ctrlKey) {
        // Trackpad pinch gesture (e.ctrlKey === true)
        zoomFactor = Math.exp(-e.deltaY * 0.015);
      } else {
        // Standard mouse wheel
        zoomFactor = Math.exp(-e.deltaY * 0.0035);
      }

      // Bound zoom factor per single wheel event to prevent sudden jumps
      zoomFactor = Math.max(0.6, Math.min(1.8, zoomFactor));

      setViewport((prev) => zoomViewportAtAnchor(prev, chart, zoomFactor, anchorRatioX, anchorRatioY));
    };

    // Touch pinch gesture support
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        touchStartDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const rect = el.getBoundingClientRect();
        const midX = (t1.clientX + t2.clientX) / 2;
        touchStartAnchorX = Math.max(0.02, Math.min(0.98, (midX - rect.left) / rect.width));
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStartDist > 0) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const factor = currentDist / touchStartDist;
        if (Math.abs(factor - 1.0) > 0.03) {
          setViewport((prev) => zoomViewportAtAnchor(prev, chart, factor, touchStartAnchorX, 0.5));
          touchStartDist = currentDist;
        }
      }
    };

    const onTouchEnd = () => {
      touchStartDist = 0;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [chart]);

  // Pointer drag to pan across data series when zoomed
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!zoomedResult.isZoomed) return;
    setIsDragging(true);
    dragStartX.current = e.clientX;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const delta = e.clientX - dragStartX.current;
    if (Math.abs(delta) > 20) {
      if (delta > 0) {
        handlePanLeft();
      } else {
        handlePanRight();
      }
      dragStartX.current = e.clientX;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {}
  };

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
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="expanded-chart-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 font-sans overflow-hidden"
        >
          {/* Backdrop with Motion Fade and Blur */}
          <motion.div
            key="modal-backdrop"
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 backdrop-blur-md bg-[#212222]/80 cursor-pointer"
          />

          {/* Modal Dialog Container - Scale & Fade, Fixed viewport height */}
          <motion.div
            key="modal-content"
            variants={shouldReduceMotion ? undefined : modalContentVariants}
            initial={shouldReduceMotion ? undefined : "hidden"}
            animate={shouldReduceMotion ? undefined : "visible"}
            exit={shouldReduceMotion ? undefined : "exit"}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-[95vw] max-w-7xl h-[90vh] max-h-[90vh] rounded-3xl bg-[#18191b] border border-white/15 p-5 md:p-6 shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header - Fixed at top, never scrolls */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[#C86342]/15 border border-[#C86342]/30 text-[#C86342] flex items-center justify-center shrink-0">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="expanded-chart-title"
                    className="text-base sm:text-lg md:text-xl font-bold text-white tracking-tight font-mono uppercase truncate"
                  >
                    {chart.title}
                  </h2>
                  <p className="text-[11px] text-white/50 font-mono truncate">
                    [Interactive Deep-Dive & Decision Intelligence]
                  </p>
                </div>
              </div>

              <motion.button
                {...(shouldReduceMotion ? {} : buttonTapMotion)}
                type="button"
                onClick={onClose}
                aria-label="Close chart modal"
                className="rounded-full px-4 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer border border-white/10 font-mono shrink-0 ml-3"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </motion.button>
            </div>

            {/* Modal Body: Two-Column Layout */}
            <div className="flex-1 min-h-0 pt-4 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden">
              {/* Left Pane: Fixed Stationary Chart Canvas (Does NOT scroll) */}
              <div className="lg:col-span-7 h-full min-h-0 rounded-2xl bg-[#212222] border border-white/10 p-4 flex flex-col justify-between shadow-inner overflow-hidden">
                {/* Visual Canvas Top Bar with Interactive Zoom Controls */}
                <div className="flex items-center justify-between mb-2 shrink-0 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-white/60 uppercase tracking-wider">
                      [Visual Canvas]
                    </span>
                    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 text-white/70">
                      [{chart.forecastBadge || (chart.isForecastChart ? "FORECAST" : chart.type?.toUpperCase() || "CHART")}]
                    </span>
                  </div>

                  {/* Interactive Analytical Zoom Controls */}
                  <div className="flex items-center gap-1 bg-[#18191b] border border-white/10 p-1 rounded-xl font-mono text-xs">
                    {/* Pan Controls (Active when zoomed) */}
                    {zoomedResult.isZoomed && (
                      <>
                        <button
                          type="button"
                          disabled={!zoomedResult.canPanLeft}
                          onClick={handlePanLeft}
                          title="Pan Left"
                          aria-label="Pan chart left"
                          className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          disabled={!zoomedResult.canPanRight}
                          onClick={handlePanRight}
                          title="Pan Right"
                          aria-label="Pan chart right"
                          className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                        >
                          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <span className="h-4 w-px bg-white/10 mx-0.5" />
                      </>
                    )}

                    {/* Zoom Out Button */}
                    <button
                      type="button"
                      disabled={!zoomedResult.isZoomed}
                      onClick={handleZoomOut}
                      title="Zoom Out (−) or scroll down"
                      aria-label="Zoom out chart"
                      className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                    >
                      <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>

                    {/* Zoom Readout */}
                    <span className="px-1.5 text-[11px] font-bold text-white/90 select-none min-w-[36px] text-center">
                      {viewport.zoom.toFixed(1)}x
                    </span>

                    {/* Zoom In Button */}
                    <button
                      type="button"
                      disabled={viewport.zoom >= 8.0}
                      onClick={handleZoomIn}
                      title="Zoom In (+) or trackpad pinch / scroll up"
                      aria-label="Zoom in chart"
                      className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>

                    {/* Reset Zoom Button */}
                    <button
                      type="button"
                      disabled={!zoomedResult.isZoomed}
                      onClick={handleReset}
                      title="Reset Zoom to Baseline"
                      aria-label="Reset zoom to baseline"
                      className={cn(
                        "px-2 h-6 rounded-lg border flex items-center gap-1 text-[10px] font-bold cursor-pointer transition",
                        zoomedResult.isZoomed
                          ? "bg-[#C86342]/15 border-[#C86342]/40 text-[#C86342] hover:bg-[#C86342]/25"
                          : "bg-white/5 border-white/10 text-white/30 disabled:cursor-not-allowed"
                      )}
                    >
                      <RotateCcw className="w-3 h-3" aria-hidden="true" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {/* Chart Rendering Container with Recalibrated Visible Data and Domains */}
                <div
                  ref={chartCanvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className={cn(
                    "flex-1 min-h-0 w-full h-full relative select-none",
                    zoomedResult.isZoomed && "cursor-grab active:cursor-grabbing"
                  )}
                >
                  <ChartCard
                    series={chart}
                    zoomedData={zoomedResult.visibleData}
                    yDomain={zoomedResult.yDomain}
                    xDomain={zoomedResult.xDomain}
                    isZoomed={zoomedResult.isZoomed}
                    isModal={true}
                    className="bg-transparent border-0 shadow-none hover:border-transparent p-0 h-full w-full cursor-default"
                  />
                </div>

                {/* Sub-chart Domain Inspection Footer */}
                {zoomedResult.isZoomed && (
                  <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/50 shrink-0">
                    <span>
                      [Focus: Showing {zoomedResult.visibleCount} of {zoomedResult.totalPoints} records]
                    </span>
                    <span className="text-[#C86342]">
                      [Axes deterministically recalibrated · Pinch/scroll or drag to pan]
                    </span>
                  </div>
                )}
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
                    <Info className="w-3.5 h-3.5 text-[#C86342]" />
                    <span>[What This Chart Shows]</span>
                  </div>
                  <p className="text-xs text-white/90 leading-relaxed bg-white/[0.03] p-3.5 rounded-2xl border border-white/5 font-sans">
                    {analysis?.whatItShows ||
                      `This chart compares ${chart.yAxisLabel || "values"} across different ${chart.xAxisLabel || "groups"} in the dataset.`}
                  </p>
                </motion.div>

                {/* 2. The Main Finding */}
                <motion.div variants={modalSectionReveal} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C86342] uppercase tracking-wider font-mono">
                    <TrendingUp className="w-3.5 h-3.5 text-[#C86342]" />
                    <span>[Main Finding]</span>
                  </div>
                  <div className="bg-[#C86342]/10 border border-[#C86342]/25 p-3.5 rounded-2xl text-xs text-white/95 font-medium leading-relaxed">
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
                        <CheckCircle2 className="w-4 h-4 text-[#C86342] shrink-0 mt-0.5" />
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
                      aria-expanded={showTechnicalDetails}
                      onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 font-mono text-xs text-white/60 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Cpu className="w-3.5 h-3.5 text-[#C86342]" />
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
