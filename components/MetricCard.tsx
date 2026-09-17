"use client";

import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { KPICardData } from "@/lib/types";
import { cardEntrance, subtleHoverMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  data: KPICardData;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ data, className }) => {
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<string | number>(data.value);

  // Extract raw number if value is a numeric string (e.g. "$1,284.50" or "45.2%")
  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(data.value);
      return;
    }

    const rawStr = String(data.value);
    const numMatch = rawStr.match(/[-+]?[0-9]*\.?[0-9]+/);
    if (!numMatch) {
      setDisplayValue(data.value);
      return;
    }

    const targetNum = parseFloat(numMatch[0]);
    if (isNaN(targetNum)) {
      setDisplayValue(data.value);
      return;
    }

    const prefix = rawStr.slice(0, numMatch.index);
    const suffix = rawStr.slice((numMatch.index || 0) + numMatch[0].length);
    const isFloat = numMatch[0].includes(".");
    const decimals = isFloat ? (numMatch[0].split(".")[1] || "").length : 0;

    let startTime: number | null = null;
    const duration = 400; // 400ms duration

    const animateNumber = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      // Ease-out cubic calculation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentVal = targetNum * easeOut;

      const formattedVal = decimals > 0 
        ? currentVal.toFixed(decimals) 
        : Math.round(currentVal).toLocaleString();

      setDisplayValue(`${prefix}${formattedVal}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(animateNumber);
      } else {
        setDisplayValue(data.value);
      }
    };

    const animId = requestAnimationFrame(animateNumber);
    return () => cancelAnimationFrame(animId);
  }, [data.value, shouldReduceMotion]);

  return (
    <motion.div
      variants={cardEntrance}
      {...(shouldReduceMotion ? {} : subtleHoverMotion)}
      className={cn(
        "rounded-2xl bg-[#18191b] border border-white/10 p-4 sm:p-5 flex flex-col justify-between min-h-[120px] min-w-0 shadow-lg hover:border-white/20 transition-colors duration-200 cursor-default",
        className
      )}
    >
      {/* Top Label */}
      <div className="truncate text-[11px] font-semibold text-white/50 uppercase tracking-wider font-mono">
        {data.label}
      </div>

      {/* Middle Value */}
      <div className="text-2xl lg:text-3xl font-bold text-white tracking-tight font-mono my-1 truncate">
        {displayValue}
      </div>

      {/* Bottom Subtext Pill */}
      <div className="mt-1">
        <span className="text-xs text-white/70 whitespace-normal leading-tight line-clamp-1 block font-mono">
          {data.subtext || "[Verified]"}
        </span>
      </div>
    </motion.div>
  );
};
