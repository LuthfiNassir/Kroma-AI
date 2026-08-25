"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TilesProps {
  className?: string;
  rows?: number;
  cols?: number;
  tileClassName?: string;
}

export function Tiles({
  className,
  rows = 30,
  cols = 14,
  tileClassName,
}: TilesProps) {
  const rowsArray = new Array(rows).fill(1);
  const colsArray = new Array(cols).fill(1);

  return (
    <div
      className={cn(
        "absolute inset-0 z-[1] flex w-full h-full justify-center overflow-hidden pointer-events-auto mask-radial-vignette",
        className
      )}
    >
      {rowsArray.map((_, i) => (
        <div
          key={`row-${i}`}
          className={cn(
            "w-12 h-12 md:w-14 md:h-14 border-l border-white/10 relative shrink-0",
            tileClassName
          )}
        >
          {colsArray.map((_, j) => (
            <motion.div
              key={`col-${j}`}
              whileHover={{
                backgroundColor: "rgba(254, 103, 73, 0.3)",
                borderColor: "rgba(254, 103, 73, 0.6)",
                transition: { duration: 0 },
              }}
              animate={{
                backgroundColor: "transparent",
                transition: { duration: 1.2 },
              }}
              className={cn(
                "w-12 h-12 md:w-14 md:h-14 border-r border-t border-white/10 relative cursor-crosshair transition-colors duration-300",
                tileClassName
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
