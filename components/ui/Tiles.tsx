"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TilesProps {
  className?: string;
  rows?: number;
  cols?: number;
  tileClassName?: string;
  tileSize?: "sm" | "md" | "lg";
}

const tileSizes = {
  sm: "w-8 h-8",
  md: "w-10 h-10 md:w-12 md:h-12",
  lg: "w-12 h-12 md:w-16 md:h-16",
};

export function Tiles({
  className,
  rows = 40,
  cols = 14,
  tileClassName,
  tileSize = "md",
}: TilesProps) {
  const rowsArray = new Array(rows).fill(1);
  const colsArray = new Array(cols).fill(1);

  return (
    <div
      className={cn(
        "absolute inset-0 z-0 flex w-full h-full justify-center overflow-hidden pointer-events-auto opacity-30 mask-radial-fade",
        className
      )}
    >
      {rowsArray.map((_, i) => (
        <div
          key={`row-${i}`}
          className={cn(
            tileSizes[tileSize],
            "border-l border-white/[0.04] relative shrink-0",
            tileClassName
          )}
        >
          {colsArray.map((_, j) => (
            <motion.div
              key={`col-${j}`}
              whileHover={{
                backgroundColor: "rgba(254, 103, 73, 0.22)",
                borderColor: "rgba(254, 103, 73, 0.4)",
                transition: { duration: 0 },
              }}
              animate={{
                transition: { duration: 1.5 },
              }}
              className={cn(
                tileSizes[tileSize],
                "border-r border-t border-white/[0.04] relative cursor-crosshair transition-colors",
                tileClassName
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
