"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface TilesProps {
  className?: string;
  cellSize?: number;
}

export function Tiles({ className, cellSize = 56 }: TilesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cellElementsRef = useRef<(HTMLDivElement | null)[]>([]);
  const timeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const [gridDimensions, setGridDimensions] = useState({ cols: 0, rows: 0 });

  // Compute grid columns and rows based on container dimensions
  const updateGridSize = useCallback(() => {
    if (typeof window === "undefined") return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const cols = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);
    setGridDimensions((prev) => {
      if (prev.cols === cols && prev.rows === rows) return prev;
      return { cols, rows };
    });
  }, [cellSize]);

  useEffect(() => {
    updateGridSize();
    window.addEventListener("resize", updateGridSize, { passive: true });
    return () => window.removeEventListener("resize", updateGridSize);
  }, [updateGridSize]);

  // Handle pointer proximity interaction
  useEffect(() => {
    const { cols, rows } = gridDimensions;
    if (cols === 0 || rows === 0) return;

    // Immediately synchronize cell element references from DOM
    if (gridRef.current && gridRef.current.children.length > 0) {
      cellElementsRef.current = Array.from(gridRef.current.children) as (HTMLDivElement | null)[];
    } else if (!cellElementsRef.current || cellElementsRef.current.length !== cols * rows) {
      cellElementsRef.current = new Array(cols * rows).fill(null);
    }

    let animationFrameId: number;

    const handlePointerMove = (e: PointerEvent) => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;

        const centerCol = Math.floor(relX / cellSize);
        const centerRow = Math.floor(relY / cellSize);

        // Fallback: if elements are not yet cached, grab from gridRef
        if (gridRef.current && (!cellElementsRef.current || !cellElementsRef.current[0])) {
          cellElementsRef.current = Array.from(gridRef.current.children) as (HTMLDivElement | null)[];
        }

        // Interact with cells in a local proximity field (radius of ~2 cells)
        const radius = 2;
        for (let r = centerRow - radius; r <= centerRow + radius; r++) {
          for (let c = centerCol - radius; c <= centerCol + radius; c++) {
            if (r < 0 || r >= rows || c < 0 || c >= cols) continue;

            const index = r * cols + c;
            let el = cellElementsRef.current[index];
            if (!el && gridRef.current) {
              el = (gridRef.current.children[index] as HTMLDivElement) || null;
              cellElementsRef.current[index] = el;
            }
            if (!el) continue;

            const dx = c - centerCol;
            const dy = r - centerRow;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 2.2) continue;

            // Clear any active decay timeout for this cell
            const existingTimeout = timeoutsRef.current.get(index);
            if (existingTimeout) {
              clearTimeout(existingTimeout);
              timeoutsRef.current.delete(index);
            }

            // Proximity styling:
            // - dist < 0.8: Direct center square (Coral highlight)
            // - 0.8 <= dist <= 1.5: Immediate adjacent squares (Velvet Orchid tint)
            // - 1.5 < dist <= 2.2: Outer perimeter squares (Subtle border highlight)
            if (dist < 0.8) {
              el.style.transition = "background-color 0.05s ease-out, border-color 0.05s ease-out";
              el.style.backgroundColor = "rgba(200, 99, 66, 0.22)";
              el.style.borderColor = "rgba(200, 99, 66, 0.45)";
            } else if (dist <= 1.45) {
              el.style.transition = "background-color 0.08s ease-out, border-color 0.08s ease-out";
              el.style.backgroundColor = "rgba(165, 50, 158, 0.12)";
              el.style.borderColor = "rgba(200, 99, 66, 0.24)";
            } else {
              el.style.transition = "background-color 0.12s ease-out, border-color 0.12s ease-out";
              el.style.backgroundColor = "rgba(165, 50, 158, 0.05)";
              el.style.borderColor = "rgba(255, 255, 255, 0.10)";
            }

            // Schedule smooth decay back to baseline resting state
            const timeout = setTimeout(() => {
              if (el) {
                el.style.transition = "background-color 1.2s ease-out, border-color 1.2s ease-out";
                el.style.backgroundColor = "transparent";
                el.style.borderColor = "rgba(255, 255, 255, 0.04)";
              }
              timeoutsRef.current.delete(index);
            }, 120);

            timeoutsRef.current.set(index, timeout);
          }
        }
      });
    };

    const handlePointerLeave = () => {
      // Fade all cells smoothly on window leave
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current.clear();
      cellElementsRef.current.forEach((el) => {
        if (el) {
          el.style.transition = "background-color 1.2s ease-out, border-color 1.2s ease-out";
          el.style.backgroundColor = "transparent";
          el.style.borderColor = "rgba(255, 255, 255, 0.04)";
        }
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave, { passive: true });

    const activeTimeouts = timeoutsRef.current;
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      cancelAnimationFrame(animationFrameId);
      activeTimeouts.forEach((timeout) => clearTimeout(timeout));
      activeTimeouts.clear();
    };
  }, [gridDimensions, cellSize]);

  const totalCells = gridDimensions.cols * gridDimensions.rows;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        "absolute inset-0 z-0 w-full h-full overflow-hidden pointer-events-none select-none bg-[#212222]",
        className
      )}
    >
      {/* Grid of Individual Square Cells */}
      <div
        ref={gridRef}
        className="w-full h-full"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridDimensions.cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${gridDimensions.rows}, ${cellSize}px)`,
        }}
      >
        {Array.from({ length: totalCells }).map((_, index) => (
          <div
            key={index}
            ref={(el) => {
              cellElementsRef.current[index] = el;
            }}
            className="border-r border-b border-white/[0.04] transition-colors duration-1000 ease-out will-change-[background-color,border-color]"
            style={{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              backgroundColor: "transparent",
            }}
          />
        ))}
      </div>
    </div>
  );
}
