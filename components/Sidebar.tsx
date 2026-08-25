import React from "react";
import { Plus, Database, ChevronLeft, ChevronRight, X } from "lucide-react";
import { AnalysisSession } from "@/lib/types";
import { BrandMark } from "@/components/ui/BrandMark";
import { cn } from "@/lib/utils";

interface SidebarProps {
  sessions: AnalysisSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isOpen,
  onToggleOpen,
}) => {
  return (
    <aside
      className={cn(
        "bg-[#18191b] border-r border-white/10 flex flex-col h-full transition-all duration-300 relative z-20 shrink-0",
        isOpen ? "w-64 md:w-72" : "w-16"
      )}
    >
      {/* Toggle Button */}
      <button
        type="button"
        onClick={onToggleOpen}
        className="absolute -right-3 top-6 bg-[#212222] border border-white/20 text-white/70 hover:text-white rounded-full p-1 shadow-md cursor-pointer transition z-30"
      >
        {isOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between h-[60px]">
        {isOpen ? (
          <div className="flex items-center gap-2.5">
            <BrandMark className="w-7 h-7" />
            <div>
              <h1 className="text-base font-bold text-white tracking-tight leading-none">
                Kroma
              </h1>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-mono mt-0.5">
                Autonomous Data Analyst
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto">
            <BrandMark className="w-7 h-7" />
          </div>
        )}
      </div>

      {/* Top Action Button */}
      <div className="p-4">
        {isOpen ? (
          <button
            type="button"
            onClick={onNewSession}
            className="w-full rounded-xl bg-[#FE6749] text-white font-semibold text-xs py-2.5 px-4 shadow-lg hover:bg-[#e85a3c] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>[+ New Analysis]</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onNewSession}
            title="New Analysis"
            className="w-10 h-10 rounded-xl bg-[#FE6749] text-white flex items-center justify-center mx-auto hover:bg-[#e85a3c] transition cursor-pointer"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Session History List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 no-scrollbar">
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
            return (
              <div
                key={session.sessionId}
                onClick={() => onSelectSession(session.sessionId)}
                className={cn(
                  "rounded-xl p-3 text-sm text-left transition flex items-center justify-between cursor-pointer group relative overflow-hidden",
                  isActive
                    ? "bg-white/10 text-white font-medium border border-white/15 border-l-4 border-l-[#FE6749]"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                  <Database className={cn("w-4 h-4 shrink-0", isActive ? "text-[#FE6749]" : "text-white/40")} />
                  {isOpen && (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white leading-tight">
                        {session.title || "Untitled Analysis"}
                      </p>
                      <p className="text-[10px] text-white/40 truncate font-mono">
                        {session.rowCount} rows • {new Date(session.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {isOpen && (
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                    {isActive && (
                      <span className="rounded-full px-1.5 py-0.5 text-[9px] font-mono bg-[#A5329E]/30 text-[#FE88ED] border border-[#A5329E]/50 mr-1">
                        [Active]
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => onDeleteSession(session.sessionId, e)}
                      title="Delete Session"
                      className="rounded-lg p-1 text-white/40 hover:text-red-400 hover:bg-white/10 text-xs transition cursor-pointer font-mono font-bold"
                    >
                      [X]
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Status Badge */}
      <div className="p-4 border-t border-white/10 bg-white/[0.01]">
        {isOpen ? (
          <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-white/80">[Kroma Engine: Localhost]</span>
            </div>
            <span className="text-[10px] text-white/40 font-mono">v1.0</span>
          </div>
        ) : (
          <div className="w-2 h-2 rounded-full bg-emerald-400 mx-auto" />
        )}
      </div>
    </aside>
  );
};
