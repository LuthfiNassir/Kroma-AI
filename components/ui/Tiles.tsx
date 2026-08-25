"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Tiles({ className }: { className?: string }) {
  const rows = 40;
  const cols = 24;
  const rowsArray = Array.from({ length: rows });
  const colsArray = Array.from({ length: cols });

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-0 flex w-screen h-screen justify-center items-center overflow-hidden",
        className
      )}
      style={{
        maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black 10%, transparent 80%)",
        WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black 10%, transparent 80%)",
      }}
    >
      <div className="flex pointer-events-auto">
        {rowsArray.map((_, i) => (
          <div key={`row-${i}`} className="w-12 h-12 border-l border-white/[0.06] shrink-0">
            {colsArray.map((_, j) => (
              <motion.div
                key={`col-${j}`}
                whileHover={{
                  backgroundColor: "rgba(254, 103, 73, 0.25)",
                  borderColor: "rgba(254, 103, 73, 0.5)",
                  transition: { duration: 0 },
                }}
                animate={{
                  backgroundColor: "transparent",
                  transition: { duration: 1.5 },
                }}
                className="w-12 h-12 border-r border-t border-white/[0.06] transition-colors duration-500 cursor-crosshair"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
