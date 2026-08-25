"use client";

import React from "react";
import { ChartCard } from "@/components/ChartCard";
import { ChartDataSeries, ChartType } from "@/lib/types";

interface DynamicChartProps {
  series: ChartDataSeries | null;
  defaultType?: ChartType;
  accentColor?: string;
  secondaryColor?: string;
  className?: string;
  onClick?: () => void;
}

export const DynamicChart: React.FC<DynamicChartProps> = (props) => {
  return <ChartCard {...props} />;
};

export default DynamicChart;
