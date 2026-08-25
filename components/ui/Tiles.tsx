"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Tiles({ className }: { className?: string }) {
  const rows = 35;
  const cols = 20;
  const rowsArray = Array.from({ length: rows });
  const colsArray = Array.from({ length: cols });

  return (
    <div
      className={cn(
        "absolute inset-0 z-0 flex w-full h-full justify-center overflow-hidden pointer-events-auto",
        className
      )}
      style={{
        maskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, black 15%, transparent 85%)",
        WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, black 15%, transparent 85%)",
      }}
    >
      <div className="flex">
        {rowsArray.map((_, i) => (
          <div key={`row-${i}`} className="w-12 h-12 border-l border-white/[0.08] shrink-0">
            {colsArray.map((_, j) => (
              <motion.div
                key={`col-${j}`}
                whileHover={{
                  backgroundColor: "rgba(254, 103, 73, 0.28)",
                  borderColor: "rgba(254, 103, 73, 0.6)",
                  transition: { duration: 0 },
                }}
                animate={{
                  backgroundColor: "transparent",
                  transition: { duration: 1.2 },
                }}
                className="w-12 h-12 border-r border-t border-white/[0.08] cursor-crosshair transition-colors duration-300"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
