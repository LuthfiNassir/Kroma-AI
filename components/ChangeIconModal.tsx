"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { modalBackdropVariants, modalContentVariants, buttonTapMotion } from "@/lib/motion";
import {
  MessageSquare,
  BarChart3,
  LineChart,
  Database,
  Briefcase,
  Wallet,
  Users,
  Activity,
  ShoppingBag,
  FlaskConical,
  FileText,
  Presentation,
  Code2,
  Globe2,
  Target,
  TrendingUp,
  Table2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Curated 17 Lucide Icons (Strict NO-EMOJIS)
export const CURATED_ICONS: { name: string; label: string; component: React.ElementType }[] = [
  { name: "MessageSquare", label: "Conversation", component: MessageSquare },
  { name: "Database", label: "Dataset", component: Database },
  { name: "BarChart3", label: "Bar Analytics", component: BarChart3 },
  { name: "LineChart", label: "Trend Line", component: LineChart },
  { name: "TrendingUp", label: "Growth", component: TrendingUp },
  { name: "Table2", label: "Tabular", component: Table2 },
  { name: "Briefcase", label: "Business", component: Briefcase },
  { name: "Wallet", label: "Finance", component: Wallet },
  { name: "Users", label: "Cohorts", component: Users },
  { name: "Activity", label: "Telemetry", component: Activity },
  { name: "ShoppingBag", label: "Commerce", component: ShoppingBag },
  { name: "FlaskConical", label: "Experiment", component: FlaskConical },
  { name: "FileText", label: "Report", component: FileText },
  { name: "Presentation", label: "Executive Deck", component: Presentation },
  { name: "Code2", label: "Code & Logic", component: Code2 },
  { name: "Globe2", label: "Global Scope", component: Globe2 },
  { name: "Target", label: "Key Goals", component: Target },
];

export const ICON_MAP: Record<string, React.ElementType> = CURATED_ICONS.reduce(
  (acc, item) => {
    acc[item.name] = item.component;
    return acc;
  },
  {} as Record<string, React.ElementType>
);

export function getSessionIconComponent(iconName?: string, hasDataset: boolean = false): React.ElementType {
  if (iconName && ICON_MAP[iconName]) {
    return ICON_MAP[iconName];
  }
  return hasDataset ? Database : MessageSquare;
}

interface ChangeIconModalProps {
  isOpen: boolean;
  currentIcon?: string;
  hasDataset?: boolean;
  onClose: () => void;
  onSelectIcon: (iconName: string) => void;
}

export const ChangeIconModal: React.FC<ChangeIconModalProps> = ({
  isOpen,
  currentIcon,
  hasDataset = false,
  onClose,
  onSelectIcon,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const effectiveCurrent = currentIcon || (hasDataset ? "Database" : "MessageSquare");

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            variants={shouldReduceMotion ? undefined : modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Content */}
          <motion.div
            variants={shouldReduceMotion ? undefined : modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="icon-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl bg-[#18191b] border border-white/15 p-5 shadow-2xl z-10 font-sans"
          >
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="w-8 h-8 rounded-xl bg-[#C86342]/15 border border-[#C86342]/30 flex items-center justify-center text-[#C86342]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 id="icon-modal-title" className="text-sm font-bold text-white tracking-tight font-mono">
                  [Change Conversation Icon]
                </h3>
                <p className="text-[11px] text-white/50 font-mono">
                  Select a curated Lucide icon.
                </p>
              </div>
            </div>

            {/* Curated Icons Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 my-4">
              {CURATED_ICONS.map((item) => {
                const IconComponent = item.component;
                const isSelected = effectiveCurrent === item.name;

                return (
                  <motion.button
                    {...(shouldReduceMotion ? {} : buttonTapMotion)}
                    key={item.name}
                    type="button"
                    onClick={() => {
                      onSelectIcon(item.name);
                      onClose();
                    }}
                    title={item.label}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-xl border transition cursor-pointer group",
                      isSelected
                        ? "bg-[#C86342]/20 border-[#C86342] text-[#C86342] shadow-sm ring-1 ring-[#C86342]/50"
                        : "bg-[#212222] border-white/10 text-white/60 hover:text-white hover:border-white/30 hover:bg-white/5"
                    )}
                  >
                    <IconComponent className={cn("w-5 h-5 transition-transform group-hover:scale-110", isSelected ? "text-[#C86342]" : "")} />
                    <span className="text-[9px] font-mono mt-1 text-white/40 truncate w-full text-center group-hover:text-white/70">
                      {item.label.split(" ")[0]}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Cancel Button */}
            <div className="flex items-center justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-1.5 text-xs font-mono font-medium text-white/70 hover:text-white hover:bg-white/5 border border-white/10 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
