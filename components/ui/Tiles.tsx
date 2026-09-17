"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function Tiles({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-0 z-0 w-full h-full pointer-events-none overflow-hidden",
        className
      )}
      style={{
        maskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, black 15%, transparent 85%)",
        WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, black 15%, transparent 85%)",
        backgroundImage:
          "linear-gradient(to right, rgba(255, 255, 255, 0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.07) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    />
  );
}
