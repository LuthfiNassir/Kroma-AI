"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, Database, ChevronLeft } from "lucide-react";
import { AnalysisSession } from "@/lib/types";
import { BrandMark } from "@/components/ui/BrandMark";
import { buttonTapMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface SidebarProps {
  sessions: AnalysisSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onRequestDeleteSession: (session: AnalysisSession, e: React.MouseEvent) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onNavigateHome?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onRequestDeleteSession,
  isOpen,
  onToggleOpen,
  onNavigateHome,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.aside
      animate={{ width: isOpen ? 288 : 80 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="bg-[#18191b] border-r border-white/10 flex flex-col h-full relative z-20 shrink-0 overflow-hidden select-none"
    >
      {/* Dedicated Header Layout - Matches 60px Topbar Height & Horizontal Arrangement */}
      {isOpen ? (
        <div className="px-3.5 border-b border-white/10 flex items-center justify-between shrink-0 h-[60px]">
          <motion.button
            {...(shouldReduceMotion ? {} : buttonTapMotion)}
            type="button"
            onClick={onNavigateHome}
            title="Go to Kroma Home / Landing Page"
            className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-85 transition cursor-pointer"
          >
            <BrandMark className="w-7 h-7 shrink-0" priority />
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white tracking-tight leading-none truncate font-mono">
                Kroma
              </h1>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-mono mt-1 truncate">
                Autonomous Data Analyst
              </p>
            </div>
          </motion.button>
          <motion.button
            {...(shouldReduceMotion ? {} : buttonTapMotion)}
            type="button"
            onClick={onToggleOpen}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer transition shrink-0 ml-2"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
        </div>
      ) : (
        /* Collapsed Dedicated Header: Centered Logo ONLY, clicks to expand sidebar, h-[60px] matching navbar */
        <div className="border-b border-white/10 flex items-center justify-center shrink-0 h-[60px]">
          <motion.button
            {...(shouldReduceMotion ? {} : buttonTapMotion)}
            type="button"
            onClick={onToggleOpen}
            title="Expand Sidebar"
            className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer flex items-center justify-center shrink-0"
          >
            <BrandMark className="w-7 h-7" priority />
          </motion.button>
        </div>
      )}

      {/* Top Action: New Analysis Button */}
      <div className="p-3 shrink-0">
        {isOpen ? (
          <motion.button
            {...(shouldReduceMotion ? {} : buttonTapMotion)}
            type="button"
            onClick={onNewSession}
            className="w-full rounded-xl bg-[#C86342] text-white font-semibold text-xs py-2.5 px-4 shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer font-mono"
          >
            <Plus className="w-4 h-4" />
            <span>[New Analysis]</span>
          </motion.button>
        ) : (
          <motion.button
            {...(shouldReduceMotion ? {} : buttonTapMotion)}
            type="button"
            onClick={onNewSession}
            title="New Analysis"
            className="w-12 h-12 rounded-xl bg-[#C86342] text-white flex items-center justify-center mx-auto hover:opacity-90 transition-opacity cursor-pointer shadow-md shrink-0"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        )}
      </div>

      {/* Session History List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5 no-scrollbar min-h-0">
        {isOpen && (
          <div className="px-2 py-1 text-[11px] font-semibold text-white/40 uppercase tracking-widest font-mono">
            [Session History]
          </div>
        )}

        {sessions.length === 0 ? (
          isOpen ? (
            <div className="p-4 text-center text-xs text-white/40 border border-dashed border-white/10 rounded-xl font-mono">
              No saved analyses
            </div>
          ) : null
        ) : (
          sessions.map((session) => {
            const isActive = session.sessionId === activeSessionId;

            if (!isOpen) {
              // Collapsed Sidebar Session Item: Centered icon only, no text, no delete button
              return (
                <motion.div
                  key={session.sessionId}
                  onClick={() => onSelectSession(session.sessionId)}
                  title={session.title || "Analysis Session"}
                  className={cn(
                    "w-12 h-12 mx-auto rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 group relative",
                    isActive
                      ? "bg-white/10 text-white border border-white/15"
                      : "text-white/50 hover:bg-white/5 hover:text-white border border-transparent"
                  )}
                >
                  <Database
                    className={cn(
                      "w-5 h-5 shrink-0 transition-colors",
                      isActive ? "text-[#C86342]" : "text-white/40 group-hover:text-white/70"
                    )}
                  />
                </motion.div>
              );
            }

            // Expanded Sidebar Session Item: Full Details + Multi-layer safe delete trigger
            return (
              <motion.div
                key={session.sessionId}
                whileHover={{ x: 2 }}
                transition={{ duration: 0.15 }}
                onClick={() => onSelectSession(session.sessionId)}
                className={cn(
                  "rounded-xl p-3 text-sm text-left transition-colors flex items-center justify-between cursor-pointer group relative overflow-hidden",
                  isActive
                    ? "bg-white/10 text-white font-medium border border-white/15 border-l-4 border-l-[#C86342]"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                  <Database className={cn("w-4 h-4 shrink-0", isActive ? "text-[#C86342]" : "text-white/40")} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white leading-tight">
                      {session.title || "Untitled Analysis"}
                    </p>
                    <p className="text-[10px] text-white/40 truncate font-mono">
                      {session.rowCount} rows • {new Date(session.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => onRequestDeleteSession(session, e)}
                    title="Delete Session"
                    className="rounded-lg p-1 text-white/40 hover:text-[#C86342] hover:bg-white/10 text-xs transition cursor-pointer font-mono font-bold"
                  >
                    [X]
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Footer Status Badge */}
      <div className="border-t border-white/10 bg-white/[0.01] shrink-0">
        {isOpen ? (
          <div className="p-3.5">
            <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C86342] animate-pulse" />
                <span className="text-[11px] font-mono text-white/80">[Kroma Engine: Localhost]</span>
              </div>
              <span className="text-[10px] text-white/40 font-mono">v1.0</span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 flex items-center justify-center">
            <span
              className="w-2.5 h-2.5 rounded-full bg-[#C86342] animate-pulse block"
              title="[Kroma Engine: Localhost]"
            />
          </div>
        )}
      </div>
    </motion.aside>
  );
};
