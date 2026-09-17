"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  priority?: boolean;
  size?: number;
}

export function BrandMark({ className = "w-6 h-6", priority = false }: BrandMarkProps) {
  return (
    <div className={cn("relative inline-flex items-center justify-center shrink-0 overflow-hidden rounded-md", className)}>
      <Image
        alt="Kroma Logo"
        className="w-full h-full object-contain select-none pointer-events-none"
        height={128}
        priority={priority}
        src="/app-icon.png"
        width={128}
      />
    </div>
  );
}
