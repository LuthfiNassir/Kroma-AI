"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface RadialGradientProps {
  className?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientSize?: string;
  gradientPosition?: string;
  gradientStop?: string;
}

export function RadialGradient({
  className,
  gradientFrom = "rgba(165, 50, 158, 0.35)",
  gradientTo = "#18191b",
  gradientSize = "100% 100%",
  gradientPosition = "50% 20%",
  gradientStop = "0%",
}: RadialGradientProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 w-full h-full pointer-events-none z-0",
        className
      )}
      style={{
        background: `radial-gradient(${gradientSize} at ${gradientPosition}, ${gradientFrom} ${gradientStop}, ${gradientTo} 70%)`,
      }}
    />
  );
}
