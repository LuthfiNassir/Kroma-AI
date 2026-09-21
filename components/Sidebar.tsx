"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Plus,
  ChevronLeft,
  MoreHorizontal,
  Pencil,
  Sparkles,
  Archive,
  ArchiveRestore,
  Trash2,
} from "lucide-react";
import { AnalysisSession } from "@/lib/types";
import { BrandMark } from "@/components/ui/BrandMark";
import { buttonTapMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { getSessionIconComponent, ChangeIconModal } from "./ChangeIconModal";
import { RenameSessionModal } from "./RenameSessionModal";

interface SidebarProps {
  sessions: AnalysisSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onRequestDeleteSession: (session: AnalysisSession, e: React.MouseEvent) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onNavigateHome?: () => void;
  onRenameSession?: (sessionId: string, newTitle: string) => void;
  onChangeIcon?: (sessionId: string, newIcon: string) => void;
  onToggleArchive?: (sessionId: string) => void;
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
  onRenameSession,
  onChangeIcon,
  onToggleArchive,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [menuOpenSessionId, setMenuOpenSessionId] = useState<string | null>(null);
  const [renamingSession, setRenamingSession] = useState<AnalysisSession | null>(null);
  const [changingIconSession, setChangingIconSession] = useState<AnalysisSession | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenSessionId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpenSessionId(null);
      }
    };

    if (menuOpenSessionId) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpenSessionId]);

  return (
    <>
      <motion.aside
        animate={{ width: isOpen ? 288 : 80 }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
        }
        className="bg-[#18191b] border-r border-white/10 flex flex-col h-full relative z-20 shrink-0 overflow-hidden select-none"
      >
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div
          className={cn(
            "border-b border-white/10 flex items-center shrink-0 h-[60px]",
            isOpen ? "px-3.5 justify-between" : "justify-center"
          )}
        >
          {isOpen ? (
            <>
              {/* Expanded: logo + wordmark navigates home */}
              <motion.button
                {...(shouldReduceMotion ? {} : buttonTapMotion)}
                type="button"
                onClick={onNavigateHome}
                aria-label="Go to Kroma Home"
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

              {/* Collapse chevron */}
              <motion.button
                {...(shouldReduceMotion ? {} : buttonTapMotion)}
                type="button"
                onClick={onToggleOpen}
                aria-label="Collapse sidebar"
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer transition shrink-0 ml-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </motion.button>
            </>
          ) : (
            /* Collapsed: logo expands sidebar, does NOT navigate */
            <motion.button
              {...(shouldReduceMotion ? {} : buttonTapMotion)}
              type="button"
              onClick={onToggleOpen}
              aria-label="Open sidebar"
              className="p-2 rounded-xl hover:bg-white/10 transition cursor-pointer flex items-center justify-center"
            >
              <BrandMark className="w-7 h-7" priority />
            </motion.button>
          )}
        </div>

        {/* ── NEW CONVERSATION BUTTON ──────────────────────────────── */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          {isOpen ? (
            <motion.button
              {...(shouldReduceMotion ? {} : buttonTapMotion)}
              type="button"
              onClick={onNewSession}
              aria-label="New conversation"
              className="w-full rounded-xl bg-[#C86342] text-white font-semibold text-xs py-2.5 px-4 shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>[New Conversation]</span>
            </motion.button>
          ) : (
            <motion.button
              {...(shouldReduceMotion ? {} : buttonTapMotion)}
              type="button"
              onClick={onNewSession}
              aria-label="New conversation"
              title="New Conversation"
              className="w-14 h-10 rounded-xl bg-[#C86342] text-white flex items-center justify-center mx-auto hover:opacity-90 transition-opacity cursor-pointer shadow-md"
            >
              <Plus className="w-5 h-5" />
            </motion.button>
          )}
        </div>

        {/* ── MAIN BODY ────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          {isOpen ? (
            /* ── EXPANDED: full session history ───────────────────── */
            <motion.div
              key="expanded-sessions"
              initial={shouldReduceMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={shouldReduceMotion ? {} : { opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="h-full overflow-y-auto px-2.5 py-2 space-y-1.5 no-scrollbar"
            >
              <div className="px-2 py-1 text-[11px] font-semibold text-white/40 uppercase tracking-widest font-mono">
                [Conversations]
              </div>

              {sessions.length === 0 ? (
                <div className="p-4 text-center text-xs text-white/40 border border-dashed border-white/10 rounded-xl font-mono">
                  No saved conversations
                </div>
              ) : (
                sessions.map((session) => {
                  const isActive = session.sessionId === activeSessionId;
                  const hasData = Boolean(session.dashboardState);
                  const SessionIcon = getSessionIconComponent(session.icon, hasData);
                  const isMenuOpen = menuOpenSessionId === session.sessionId;

                  return (
                    <div key={session.sessionId} className="relative">
                      <motion.div
                        whileHover={shouldReduceMotion ? {} : { x: 2 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => onSelectSession(session.sessionId)}
                        className={cn(
                          "rounded-xl p-2.5 text-sm text-left transition-colors flex items-center justify-between cursor-pointer group relative",
                          isActive
                            ? "bg-white/10 text-white font-medium border border-white/15 border-l-4 border-l-[#C86342]"
                            : "text-white/70 hover:bg-white/5 hover:text-white border border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 overflow-hidden pr-1 flex-1">
                          <SessionIcon
                            className={cn(
                              "w-4 h-4 shrink-0 transition-colors",
                              isActive ? "text-[#C86342]" : "text-white/40 group-hover:text-white/70"
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-white leading-tight">
                              {session.title || "New conversation"}
                            </p>
                            <p className="text-[10px] text-white/40 truncate font-mono mt-0.5">
                              {hasData
                                ? `${session.rowCount || 0} rows • ${new Date(session.createdAt).toLocaleDateString()}`
                                : `Chat • ${new Date(session.createdAt).toLocaleDateString()}`}
                              {session.isArchived ? " • [Archived]" : ""}
                            </p>
                          </div>
                        </div>

                        {/* Contextual Menu Trigger (⋯) */}
                        <div className="flex items-center shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenSessionId(isMenuOpen ? null : session.sessionId);
                            }}
                            aria-label="Conversation options"
                            className={cn(
                              "rounded-lg p-1.5 transition cursor-pointer",
                              isMenuOpen
                                ? "bg-white/15 text-white opacity-100"
                                : "opacity-0 group-hover:opacity-60 hover:!opacity-100 text-white/50 hover:text-white hover:bg-white/10"
                            )}
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>

                      {/* Contextual Popover Menu */}
                      <AnimatePresence>
                        {isMenuOpen && (
                          <motion.div
                            ref={menuRef}
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            transition={{ duration: 0.12 }}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-2 top-full mt-1 w-44 rounded-xl bg-[#18191b] border border-white/15 p-1 shadow-2xl z-50 font-sans"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenSessionId(null);
                                setRenamingSession(session);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer font-mono text-left"
                            >
                              <Pencil className="w-3.5 h-3.5 text-[#C86342]" />
                              <span>Rename</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenSessionId(null);
                                setChangingIconSession(session);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer font-mono text-left"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#A5329E]" />
                              <span>Change icon</span>
                            </button>

                            {onToggleArchive && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuOpenSessionId(null);
                                  onToggleArchive(session.sessionId);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer font-mono text-left"
                              >
                                {session.isArchived ? (
                                  <>
                                    <ArchiveRestore className="w-3.5 h-3.5 text-white/60" />
                                    <span>Unarchive</span>
                                  </>
                                ) : (
                                  <>
                                    <Archive className="w-3.5 h-3.5 text-white/60" />
                                    <span>Archive</span>
                                  </>
                                )}
                              </button>
                            )}

                            <div className="h-px bg-white/10 my-1" />

                            <button
                              type="button"
                              onClick={(e) => {
                                setMenuOpenSessionId(null);
                                onRequestDeleteSession(session, e);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/15 rounded-lg transition cursor-pointer font-mono text-left"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              <span>Delete</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </motion.div>
          ) : (
            /* ── COLLAPSED: intentional vertical branding rail ─────── */
            <motion.div
              key="collapsed-brand"
              initial={shouldReduceMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={shouldReduceMotion ? {} : { opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="h-full flex items-center justify-center pointer-events-none"
              aria-hidden="true"
            >
              {/* Vertical "KROMA AI" lettering — editorial / intentional */}
              <div
                className="flex flex-col items-center gap-0 select-none"
                style={{
                  writingMode: "vertical-rl",
                  textOrientation: "mixed",
                  transform: "rotate(180deg)",
                  letterSpacing: "0.22em",
                }}
              >
                <span
                  className="text-[50px] font-semibold font-sans text-white/5 uppercase tracking-[0.22em]"
                >
                  KROMA AI
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── FOOTER STATUS ────────────────────────────────────────── */}
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
            <div className="py-4 flex items-center justify-center">
              <span
                className="w-2 h-2 rounded-full bg-[#C86342] animate-pulse block"
                title="[Kroma Engine: Localhost]"
              />
            </div>
          )}
        </div>
      </motion.aside>

      {/* Rename Modal */}
      {renamingSession && (
        <RenameSessionModal
          isOpen={Boolean(renamingSession)}
          currentTitle={renamingSession.title || ""}
          onClose={() => setRenamingSession(null)}
          onSave={(newTitle) => {
            if (onRenameSession && renamingSession) {
              onRenameSession(renamingSession.sessionId, newTitle);
            }
            setRenamingSession(null);
          }}
        />
      )}

      {/* Change Icon Modal */}
      {changingIconSession && (
        <ChangeIconModal
          isOpen={Boolean(changingIconSession)}
          currentIcon={changingIconSession.icon}
          hasDataset={Boolean(changingIconSession.dashboardState)}
          onClose={() => setChangingIconSession(null)}
          onSelectIcon={(iconName) => {
            if (onChangeIcon && changingIconSession) {
              onChangeIcon(changingIconSession.sessionId, iconName);
            }
            setChangingIconSession(null);
          }}
        />
      )}
    </>
  );
};
