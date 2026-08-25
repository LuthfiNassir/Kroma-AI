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
  gradientFrom = "rgba(165, 50, 158, 0.18)",
  gradientTo = "#212222",
  gradientSize = "120% 120%",
  gradientPosition = "50% 0%",
  gradientStop = "0%",
}: RadialGradientProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 w-full h-full -z-20 pointer-events-none",
        className
      )}
      style={{
        background: `radial-gradient(${gradientSize} at ${gradientPosition}, ${gradientFrom} ${gradientStop}, ${gradientTo} 70%)`,
      }}
    />
  );
}
