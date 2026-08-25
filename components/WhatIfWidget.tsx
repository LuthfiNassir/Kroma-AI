"use client";

import React, { useState } from "react";
import { Sliders, Sparkles, TrendingUp, RotateCcw } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";

interface WhatIfWidgetProps {
  projectionData?: Record<string, any>[];
  className?: string;
  onApplyDelta?: (deltaPercent: number, description: string) => void;
}

export const WhatIfWidget: React.FC<WhatIfWidgetProps> = ({
  projectionData = [],
  className,
  onApplyDelta,
}) => {
  const [deltaPercent, setDeltaPercent] = useState<number>(10);
  const [scenarioInput, setScenarioInput] = useState<string>("");
  const [activePreset, setActivePreset] = useState<string>("+10% Growth");

  // Calculate dynamic projected curve based on current delta slider
  const chartData = projectionData.map((item) => {
    if (item.projected !== null && item.projected !== undefined) {
      const adjusted = Math.round((item.projected * (1 + deltaPercent / 100)) * 10) / 10;
      return {
        ...item,
        whatIf: adjusted,
      };
    }
    return item;
  });

  const handleApplyPreset = (percent: number, label: string) => {
    setDeltaPercent(percent);
    setActivePreset(label);
    if (onApplyDelta) onApplyDelta(percent, label);
  };

  const handleParseCustomInput = () => {
    if (!scenarioInput.trim()) return;
    const text = scenarioInput.toLowerCase();
    let num = 10;

    const match = text.match(/(-?\d+)/);
    if (match) {
      num = parseInt(match[1], 10);
      if (text.includes("cut") || text.includes("reduce") || text.includes("drop") || text.includes("decrease")) {
        num = -Math.abs(num);
      }
    }

    setDeltaPercent(num);
    setActivePreset(`Custom (${num >= 0 ? "+" : ""}${num}%)`);
    if (onApplyDelta) onApplyDelta(num, scenarioInput);
  };

  const handleReset = () => {
    setDeltaPercent(0);
    setScenarioInput("");
    setActivePreset("Baseline Continuation");
    if (onApplyDelta) onApplyDelta(0, "Baseline Continuation");
  };

  return (
    <div
      className={cn(
        "rounded-3xl bg-[#18191b] border border-white/10 p-6 space-y-5 shadow-xl font-sans relative overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#A5329E]/15 border border-[#A5329E]/30 text-[#FE88ED] flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-tight font-mono">
              [Interactive What-If Scenario Engine]
            </h3>
            <p className="text-xs text-white/50 font-mono">
              Simulate dynamic parameter shifts & redraw projected future trajectory in real time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full px-3 py-1 text-[10px] font-mono bg-[#A5329E]/20 text-[#FE88ED] border border-[#A5329E]/40 font-bold">
            [{activePreset}]
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full px-3 py-1 bg-white/5 hover:bg-white/10 text-[10px] font-mono text-white/70 transition flex items-center gap-1 border border-white/10 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>[Reset]</span>
          </button>
        </div>
      </div>

      {/* Preset Quick Buttons & Custom Input */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Preset Chips */}
        <div className="md:col-span-7 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleApplyPreset(15, "+15% Velocity Boost")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-mono transition border cursor-pointer",
              deltaPercent === 15
                ? "bg-[#FE6749] text-white border-[#FE6749]"
                : "bg-white/5 text-white/70 border-white/10 hover:border-white/30"
            )}
          >
            [+15% Velocity Boost]
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset(-20, "-20% Expense Cut")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-mono transition border cursor-pointer",
              deltaPercent === -20
                ? "bg-[#FE6749] text-white border-[#FE6749]"
                : "bg-white/5 text-white/70 border-white/10 hover:border-white/30"
            )}
          >
            [-20% Expense Cut]
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset(10, "+10% Conversion Rate")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-mono transition border cursor-pointer",
              deltaPercent === 10
                ? "bg-[#FE6749] text-white border-[#FE6749]"
                : "bg-white/5 text-white/70 border-white/10 hover:border-white/30"
            )}
          >
            [+10% Conversion]
          </button>
        </div>

        {/* Custom Text Prompt Input */}
        <div className="md:col-span-5 flex items-center gap-2">
          <input
            type="text"
            value={scenarioInput}
            onChange={(e) => setScenarioInput(e.target.value)}
            placeholder="e.g. Cut expenses by 15%..."
            className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/40 outline-none focus:border-[#A5329E] font-mono"
          />
          <button
            type="button"
            onClick={handleParseCustomInput}
            className="rounded-xl bg-[#A5329E] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#8e2988] transition cursor-pointer font-mono shrink-0"
          >
            [Run Projection]
          </button>
        </div>
      </div>

      {/* Slider Controls */}
      <div className="space-y-1 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-white/60">[Parameter Delta Slider]</span>
          <span className="text-[#FE88ED] font-bold">
            {deltaPercent >= 0 ? `+${deltaPercent}%` : `${deltaPercent}%`} Adjustment
          </span>
        </div>
        <input
          type="range"
          min="-50"
          max="50"
          value={deltaPercent}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            setDeltaPercent(val);
            setActivePreset(`Slider (${val >= 0 ? "+" : ""}${val}%)`);
            if (onApplyDelta) onApplyDelta(val, `Slider ${val}%`);
          }}
          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FE6749]"
        />
      </div>

      {/* Trajectory Recharts Projection Canvas */}
      <div className="w-full h-[240px] min-h-[240px] relative font-mono bg-[#212222] p-3 rounded-2xl border border-white/10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FE6749" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#FE6749" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorWhatIf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A5329E" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#A5329E" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis dataKey="x" stroke="rgba(255, 255, 255, 0.4)" fontSize={10} tickLine={false} />
            <YAxis stroke="rgba(255, 255, 255, 0.4)" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#212222",
                borderColor: "rgba(255, 255, 255, 0.15)",
                borderRadius: "12px",
                color: "#ffffff",
                fontSize: "12px",
              }}
            />
            {/* Historical Baseline Line */}
            <Area
              type="monotone"
              dataKey="historical"
              stroke="#FE6749"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorHistorical)"
              name="Historical Baseline"
            />
            {/* What-If Projected Delta Curve */}
            <Area
              type="monotone"
              dataKey="whatIf"
              stroke="#FE88ED"
              strokeWidth={2}
              strokeDasharray="4 4"
              fillOpacity={1}
              fill="url(#colorWhatIf)"
              name="Scenario Projection"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WhatIfWidget;
