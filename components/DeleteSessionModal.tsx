"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import { AnalysisSession } from "@/lib/types";
import {
  modalBackdropVariants,
  modalContentVariants,
  buttonTapMotion,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

interface DeleteSessionModalProps {
  session: AnalysisSession | null;
  isActiveSession: boolean;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (sessionId: string) => Promise<void>;
}

export const DeleteSessionModal: React.FC<DeleteSessionModalProps> = ({
  session,
  isActiveSession,
  isOpen,
  onClose,
  onConfirmDelete,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Reset state on open/close or session change
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setConfirmInput("");
      setIsDeleting(false);
      setErrorMessage(null);
      // Ensure initial focus is on Cancel button for safety (prevents accidental Enter -> Delete)
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);
    }
  }, [isOpen, session?.sessionId]);

  // Focus input when moving to step 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 50);
    }
  }, [step]);

  // Safe Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (isDeleting) return; // Block while operation in progress
        if (step === 2) {
          // Return to safe step 1
          setStep(1);
          setConfirmInput("");
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, step, isDeleting, onClose]);

  if (!isOpen || !session) return null;

  const isDeleteConfirmed = confirmInput.trim().toUpperCase() === "DELETE";

  const handleProceedToStep2 = () => {
    setStep(2);
    setErrorMessage(null);
  };

  const handleExecuteDelete = async () => {
    if (!isDeleteConfirmed || isDeleting) return;
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await onConfirmDelete(session.sessionId);
      // Parent closes modal on success
    } catch (err: any) {
      console.error("Session deletion failed:", err);
      setIsDeleting(false);
      setErrorMessage("Unable to delete this analysis. Your session is still safe.");
    }
  };

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-desc"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans overflow-hidden"
      >
        {/* Backdrop: Dark overlay + Blur filter */}
        <motion.div
          key="delete-backdrop"
          variants={modalBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={() => {
            if (!isDeleting) onClose();
          }}
          className="fixed inset-0 backdrop-blur-md bg-[#212222]/80 cursor-pointer"
        />

        {/* Modal Dialog Content Container */}
        <motion.div
          key="delete-dialog"
          variants={shouldReduceMotion ? undefined : modalContentVariants}
          initial={shouldReduceMotion ? undefined : "hidden"}
          animate={shouldReduceMotion ? undefined : "visible"}
          exit={shouldReduceMotion ? undefined : "exit"}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-md rounded-2xl bg-[#18191b] border border-white/15 p-6 shadow-2xl overflow-hidden"
        >
          {/* Close button (safe dismiss) */}
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close dialog"
            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#C86342]/15 border border-[#C86342]/30 text-[#C86342] flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="delete-modal-title"
                className="text-base font-bold text-white tracking-tight font-mono uppercase"
              >
                {step === 1 ? "Delete Analysis?" : "Confirm Permanent Deletion"}
              </h2>
              <p className="text-[11px] text-white/50 font-mono">
                [Accidental Deletion Protection Shield]
              </p>
            </div>
          </div>

          {/* Stage 1: Initial Warning & Cancel Default Focus */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                <div id="delete-modal-desc" className="text-xs text-white/80 leading-relaxed font-sans space-y-2">
                  <p>
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-white font-mono underline decoration-[#C86342]/60 underline-offset-2">
                      &quot;{session.title || "Untitled Analysis"}&quot;
                    </span>
                    ?
                  </p>
                  <p className="text-white/60">
                    This will permanently remove this analysis from your session history. This action cannot be undone.
                  </p>
                </div>

                {/* Active Session Warning Banner */}
                {isActiveSession && (
                  <div className="rounded-xl border border-[#C86342]/30 bg-[#C86342]/10 p-3 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-[#C86342] shrink-0 mt-0.5" />
                    <div className="text-[11px] text-white/90 leading-tight">
                      <span className="font-bold text-[#C86342] font-mono block mb-0.5">
                        [Active Analysis]
                      </span>
                      You are currently viewing this analysis. Deleting it will close the workspace and return to the landing state.
                    </div>
                  </div>
                )}

                {/* Stage 1 Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
                  <motion.button
                    ref={cancelButtonRef}
                    {...(shouldReduceMotion ? {} : buttonTapMotion)}
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 text-xs font-semibold font-mono transition-colors cursor-pointer border border-white/10 focus:ring-2 focus:ring-white/40 focus:outline-none"
                  >
                    [Cancel]
                  </motion.button>
                  <motion.button
                    {...(shouldReduceMotion ? {} : buttonTapMotion)}
                    type="button"
                    onClick={handleProceedToStep2}
                    className="px-4 py-2 rounded-xl bg-[#C86342] hover:opacity-90 text-white text-xs font-semibold font-mono transition-opacity cursor-pointer shadow-md"
                  >
                    [Delete Analysis]
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Stage 2: Typed Confirmation Protection */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                <div id="delete-modal-desc" className="text-xs text-white/80 leading-relaxed font-sans space-y-2">
                  <p>
                    You are about to permanently delete:
                  </p>
                  <p className="font-semibold text-white font-mono text-sm bg-white/5 p-2 rounded-lg border border-white/10 truncate">
                    {session.title || "Untitled Analysis"}
                  </p>
                  <p className="text-white/60">
                    This cannot be undone. To prevent accidental data loss, please type{" "}
                    <span className="font-bold text-[#C86342] font-mono select-all">DELETE</span> to confirm.
                  </p>
                </div>

                {/* Typed Input Field */}
                <div>
                  <label htmlFor="confirm-delete-input" className="sr-only">
                    Type DELETE to confirm
                  </label>
                  <input
                    id="confirm-delete-input"
                    ref={textInputRef}
                    type="text"
                    value={confirmInput}
                    disabled={isDeleting}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && isDeleteConfirmed && !isDeleting) {
                        handleExecuteDelete();
                      }
                    }}
                    placeholder="Type DELETE to confirm"
                    autoComplete="off"
                    spellCheck="false"
                    className="w-full rounded-xl bg-[#212222] border border-white/20 px-3.5 py-2.5 text-xs font-mono text-white placeholder:text-white/30 focus:border-[#C86342] focus:ring-1 focus:ring-[#C86342] focus:outline-none transition-colors disabled:opacity-50"
                  />
                </div>

                {/* Error Banner if Deletion Fails */}
                {errorMessage && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200 font-mono flex items-center justify-between">
                    <span>{errorMessage}</span>
                    <button
                      type="button"
                      onClick={handleExecuteDelete}
                      className="text-[#C86342] underline ml-2 hover:text-white cursor-pointer font-bold"
                    >
                      [Try Again]
                    </button>
                  </div>
                )}

                {/* Stage 2 Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
                  <motion.button
                    {...(shouldReduceMotion ? {} : buttonTapMotion)}
                    type="button"
                    disabled={isDeleting}
                    onClick={() => {
                      setStep(1);
                      setConfirmInput("");
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 text-xs font-semibold font-mono transition-colors cursor-pointer border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    [Cancel]
                  </motion.button>
                  <motion.button
                    {...(shouldReduceMotion ? {} : buttonTapMotion)}
                    type="button"
                    disabled={!isDeleteConfirmed || isDeleting}
                    onClick={handleExecuteDelete}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-semibold font-mono transition-all flex items-center gap-1.5 shadow-md",
                      isDeleting
                        ? "bg-[#C86342]/60 text-white cursor-wait"
                        : isDeleteConfirmed
                        ? "bg-[#C86342] hover:opacity-90 text-white cursor-pointer"
                        : "bg-white/10 text-white/30 border border-white/5 cursor-not-allowed"
                    )}
                  >
                    {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isDeleting ? "[Deleting...]" : "[Delete Analysis]"}</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
