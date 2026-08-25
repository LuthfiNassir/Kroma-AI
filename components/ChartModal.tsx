import React, { useEffect } from "react";
import { X, Sparkles, TrendingUp, BarChart2, HelpCircle, Activity } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { ChartDataSeries } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChartModalProps {
  chart: ChartDataSeries | null;
  onClose: () => void;
}

const COLOR_PALETTE = ["#FE6749", "#A5329E", "#FE88ED", "#FF9E88", "#7D2277", "#D44333"];

export const ChartModal: React.FC<ChartModalProps> = ({ chart, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!chart) return null;

  const chartType = chart.type || "bar";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 backdrop-blur-md bg-black/70 transition-opacity duration-300"
      />

      {/* Modal Dialog Container */}
      <div className="relative z-10 max-w-5xl w-[90vw] max-h-[90vh] rounded-3xl bg-[#18191b] border border-white/15 p-6 md:p-8 shadow-2xl overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200 flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FE6749]/15 border border-[#FE6749]/30 text-[#FE6749] flex items-center justify-center">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {chart.title}
              </h2>
              <p className="text-xs text-white/50 font-mono">
                [Expanded Analytical Deep-Dive]
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition flex items-center gap-1.5 cursor-pointer border border-white/10"
          >
            <span>[Close]</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body Layout: 60% Left Graph / 40% Right Analytical Narrative */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel (60% width) */}
          <div className="lg:col-span-7 rounded-2xl bg-[#212222] border border-white/10 p-5 flex flex-col justify-between min-h-[380px] shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-white/50 uppercase tracking-widest">
                [Interactive Visual Canvas]
              </span>
              <span className="text-[10px] font-mono text-white/40">
                {chart.xKey} vs {chart.yKey}
              </span>
            </div>

            <div className="w-full h-[320px] relative">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "area" ? (
                  <AreaChart data={chart.data} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCoralModal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FE6749" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#FE6749" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                    <XAxis dataKey={chart.xKey} stroke="rgba(255, 255, 255, 0.5)" fontSize={12} tickLine={false} />
                    <YAxis stroke="rgba(255, 255, 255, 0.5)" fontSize={12} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#212222",
                        borderColor: "rgba(255, 255, 255, 0.2)",
                        borderRadius: "14px",
                        color: "#ffffff",
                        fontSize: "13px",
                      }}
                    />
                    <Area type="monotone" dataKey={chart.yKey} stroke="#FE6749" strokeWidth={3} fillOpacity={1} fill="url(#colorCoralModal)" />
                  </AreaChart>
                ) : chartType === "line" ? (
                  <LineChart data={chart.data} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                    <XAxis dataKey={chart.xKey} stroke="rgba(255, 255, 255, 0.5)" fontSize={12} tickLine={false} />
                    <YAxis stroke="rgba(255, 255, 255, 0.5)" fontSize={12} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#212222",
                        borderColor: "rgba(255, 255, 255, 0.2)",
                        borderRadius: "14px",
                        color: "#ffffff",
                        fontSize: "13px",
                      }}
                    />
                    <Line type="monotone" dataKey={chart.yKey} stroke="#FE6749" strokeWidth={3.5} dot={{ fill: "#FE6749", r: 5 }} activeDot={{ r: 8, fill: "#ffffff" }} />
                  </LineChart>
                ) : chartType === "pie" ? (
                  <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#212222",
                        borderColor: "rgba(255, 255, 255, 0.2)",
                        borderRadius: "14px",
                        color: "#ffffff",
                        fontSize: "13px",
                      }}
                    />
                    <Pie
                      data={chart.data}
                      dataKey={chart.yKey}
                      nameKey={chart.xKey}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={5}
                    >
                      {chart.data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} stroke="#18191b" strokeWidth={2} />
                      ))}
                    </Pie>
                  </PieChart>
                ) : (
                  <BarChart data={chart.data} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                    <XAxis dataKey={chart.xKey} stroke="rgba(255, 255, 255, 0.5)" fontSize={12} tickLine={false} />
                    <YAxis stroke="rgba(255, 255, 255, 0.5)" fontSize={12} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#212222",
                        borderColor: "rgba(255, 255, 255, 0.2)",
                        borderRadius: "14px",
                        color: "#ffffff",
                        fontSize: "13px",
                      }}
                    />
                    <Bar dataKey={chart.yKey} fill="#A5329E" radius={[8, 8, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Panel (40% width): Structured Analytical Narrative */}
          <div className="lg:col-span-5 space-y-4">
            {/* Section 1: What this chart shows */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block font-mono">
                [What this chart shows]
              </span>
              <p className="text-xs text-white/90 leading-relaxed font-sans bg-white/[0.03] p-3 rounded-xl border border-white/5">
                {chart.analysis?.whatItShows ||
                  `This chart plots how ${chart.yKey} is distributed across ${chart.xKey}.`}
              </p>
            </div>

            {/* Section 2: Trend Analysis */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[#FE6749] uppercase tracking-wider block font-mono">
                [Trend Analysis]
              </span>
              <p className="text-xs text-white/80 leading-relaxed font-sans bg-white/[0.02] p-3 rounded-xl border border-white/5">
                {chart.analysis?.trend ||
                  `Values move through peaks and dips across periods. Overall numbers demonstrate solid performance strength.`}
              </p>
            </div>

            {/* Section 3: Key Numbers */}
            {chart.analysis?.keyStats && chart.analysis.keyStats.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block font-mono">
                  [Key Numbers]
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {chart.analysis.keyStats.map((stat, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-white/5 border border-white/10 p-2.5 flex flex-col justify-between"
                    >
                      <span className="text-[10px] text-white/50 uppercase font-mono truncate">
                        {stat.label}
                      </span>
                      <span className="text-sm font-semibold text-white font-mono mt-0.5 truncate">
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 4: Strategic Takeaway Callout */}
            <div className="rounded-xl border-l-2 border-[#A5329E] bg-[#A5329E]/10 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[#FE88ED]">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">
                  [Strategic Takeaway]
                </span>
              </div>
              <p className="text-xs text-white/90 leading-relaxed">
                {chart.analysis?.takeaway ||
                  "Focus resource allocation on identified peak categories to maximize overall return."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
