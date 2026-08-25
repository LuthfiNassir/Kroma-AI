"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function StaticGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed inset-0 w-screen h-screen pointer-events-none z-0",
        className
      )}
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(255, 255, 255, 0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.045) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    />
  );
}
