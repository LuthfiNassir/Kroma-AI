"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function RadialGradient({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-0 w-full h-full pointer-events-none z-0",
        className
      )}
      style={{
        background:
          "radial-gradient(circle 750px at 50% -80px, rgba(165, 50, 158, 0.22), transparent 70%), radial-gradient(circle 500px at 50% 30%, rgba(254, 103, 73, 0.08), transparent 70%)",
      }}
    />
  );
}
