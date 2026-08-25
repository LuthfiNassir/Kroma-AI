import React from "react";
import { KPICardData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  data: KPICardData;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ data, className }) => {
  return (
    <div
      className={cn(
        "rounded-2xl bg-[#18191b] border border-white/10 p-4 sm:p-5 flex flex-col justify-between min-h-[120px] min-w-0 shadow-lg hover:border-white/20 transition-all duration-200",
        className
      )}
    >
      {/* Top Label */}
      <div className="truncate text-[11px] font-semibold text-white/50 uppercase tracking-wider font-mono">
        {data.label}
      </div>

      {/* Middle Value */}
      <div className="text-2xl lg:text-3xl font-bold text-white tracking-tight font-mono my-1 truncate">
        {data.value}
      </div>

      {/* Bottom Subtext Pill */}
      <div className="mt-1">
        <span className="text-xs text-white/70 whitespace-normal leading-tight line-clamp-1 block font-mono">
          {data.subtext || "[Verified]"}
        </span>
      </div>
    </div>
  );
};
