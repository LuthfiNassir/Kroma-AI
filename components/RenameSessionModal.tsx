"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { modalBackdropVariants, modalContentVariants, buttonTapMotion } from "@/lib/motion";
import { Edit3, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RenameSessionModalProps {
  isOpen: boolean;
  currentTitle: string;
  onClose: () => void;
  onSave: (newTitle: string) => void;
}

export const RenameSessionModal: React.FC<RenameSessionModalProps> = ({
  isOpen,
  currentTitle,
  onClose,
  onSave,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [title, setTitle] = useState(currentTitle);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle);
      setError(null);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, currentTitle]);

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

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Conversation title cannot be empty.");
      return;
    }
    if (trimmed.length > 60) {
      setError("Title must be 60 characters or fewer.");
      return;
    }
    onSave(trimmed);
    onClose();
  };

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

          {/* Modal Dialog Content */}
          <motion.div
            variants={shouldReduceMotion ? undefined : modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-[#18191b] border border-white/15 p-6 shadow-2xl z-10 font-sans"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#C86342]/15 border border-[#C86342]/30 flex items-center justify-center text-[#C86342]">
                <Edit3 className="w-4 h-4" />
              </div>
              <div>
                <h3 id="rename-modal-title" className="text-sm font-bold text-white tracking-tight font-mono">
                  [Rename Conversation]
                </h3>
                <p className="text-[11px] text-white/50 font-mono">
                  Give this conversation a concise, recognizable name.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={title}
                  maxLength={60}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Conversation title"
                  className={cn(
                    "w-full rounded-xl bg-[#212222] border px-3.5 py-2.5 text-sm text-white placeholder-white/40 outline-none transition-colors font-sans",
                    error
                      ? "border-red-500/60 focus:border-red-500"
                      : "border-white/15 focus:border-[#C86342]/70"
                  )}
                />
                {error && (
                  <div className="flex items-center gap-1.5 text-xs text-red-400 font-mono mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="text-[10px] text-white/40 text-right font-mono">
                  {title.length}/60
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2 text-xs font-mono font-medium text-white/70 hover:text-white hover:bg-white/5 border border-white/10 transition cursor-pointer"
                >
                  Cancel
                </button>
                <motion.button
                  {...(shouldReduceMotion ? {} : buttonTapMotion)}
                  type="submit"
                  disabled={!title.trim()}
                  className="rounded-xl px-4 py-2 text-xs font-mono font-semibold bg-[#C86342] text-white hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md"
                >
                  Save
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
