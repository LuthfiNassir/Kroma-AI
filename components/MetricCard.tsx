import React from "react";
import { KPICardData } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  data: KPICardData;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ data, className }) => {
  return (
    <div
      className={cn(
        "rounded-2xl bg-[#18191b] border border-white/10 p-5 flex flex-col justify-between min-h-[120px] shadow-lg hover:border-white/20 transition-all duration-200",
        className
      )}
    >
      {/* Top Label */}
      <div className="text-[11px] font-semibold text-white/50 uppercase tracking-widest font-mono truncate">
        {data.label}
      </div>

      {/* Middle Value */}
      <div className="text-3xl md:text-4xl font-semibold text-white tracking-tight my-1.5 font-sans">
        {data.value}
      </div>

      {/* Bottom Subtext Pill Badge */}
      <div className="mt-1">
        <Badge variant="default" className="text-[10px] truncate max-w-full">
          {data.subtext || "[Verified]"}
        </Badge>
      </div>
    </div>
  );
};
