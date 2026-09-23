"use client";

import React, { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { BrandMark } from "@/components/ui/BrandMark";
import { SAMPLE_DATASETS, validateTabularInput, extractPromptAndData } from "@/lib/dataEngine";
import { DatasetSourceType } from "@/lib/types";
import {
  chipEntrance,
  bannerSlideDown,
  buttonTapMotion,
} from "@/lib/motion";
import {
  Paperclip,
  ArrowRight,
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface AttachedFile {
  name: string;
  content: string;
  size: number;
}

interface KromaComposerProps {
  onAnalyze: (payload: {
    rawContent: string;
    fileName: string;
    sourceType: DatasetSourceType;
    userPrompt?: string;
  }) => void;
  isAnalyzing?: boolean;
}

const LOADING_STAGES = [
  "Kroma is reading your data...",
  "Understanding structure...",
  "Finding useful patterns...",
  "Building your analysis...",
];

export function KromaComposer({ onAnalyze, isAnalyzing = false }: KromaComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [inputText, setInputText] = useState("");
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  // Derived active state: user has typed/pasted content, or attached a CSV file
  const isActive = inputText.trim().length > 0 || Boolean(attachedFile);

  // Dynamic Auto-Resize: compact resting state (84px) to viewport-aware maximum
  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const minHeight = 84;
    // Calculate viewport-aware max height, reserving space for action controls, metadata, and breathing room
    const available = typeof window !== "undefined" ? window.innerHeight - 260 : 380;
    const maxHeight = Math.max(160, Math.min(380, available));
    const scrollHeight = el.scrollHeight;
    const targetHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    el.style.height = `${targetHeight}px`;
    el.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputText, adjustTextareaHeight]);

  // Window resize re-calculation
  useEffect(() => {
    window.addEventListener("resize", adjustTextareaHeight, { passive: true });
    return () => window.removeEventListener("resize", adjustTextareaHeight);
  }, [adjustTextareaHeight]);

  // Cycle through intelligent loading messages when analyzing
  useEffect(() => {
    if (!isAnalyzing) {
      setLoadingStageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStageIndex((prev) => (prev < LOADING_STAGES.length - 1 ? prev + 1 : prev));
    }, 450);
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Live detection of tabular data inside input text
  const liveDetection = useMemo(() => {
    if (attachedFile) return null;
    const trimmed = inputText.trim();
    if (!trimmed) return null;
    const extracted = extractPromptAndData(trimmed);
    if (extracted.hasTable && extracted.tableText) {
      return validateTabularInput(extracted.tableText);
    }
    return null;
  }, [inputText, attachedFile]);

  // Handle file selection from paperclip button
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setAttachedFile({
            name: file.name,
            content,
            size: file.size,
          });
          setErrorMessage(null);
        }
      };
      reader.readAsText(file);
    }
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleRemoveAttachment = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAttachedFile(null);
  };

  // Submit Handler: Unifies CSV attachment, pasted data, and user prompt
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    // 1. Attached CSV File (+ optional user prompt)
    if (attachedFile) {
      const prompt = inputText.trim() || "Analyze this dataset and generate the most appropriate dashboard.";
      onAnalyze({
        rawContent: attachedFile.content,
        fileName: attachedFile.name,
        sourceType: "csv",
        userPrompt: prompt,
      });
      return;
    }

    const trimmed = inputText.trim();
    if (!trimmed) {
      setErrorMessage("Ask a question, paste tabular data, or attach a CSV file.");
      return;
    }

    // 2. Direct Pasted Data (+ optional prompt)
    const extracted = extractPromptAndData(trimmed);
    if (extracted.hasTable && extracted.tableText) {
      onAnalyze({
        rawContent: extracted.tableText,
        fileName: extracted.title,
        sourceType: "pasted",
        userPrompt: extracted.prompt,
      });
      return;
    }

    // 3. Natural Language Prompt without attached file or data
    onAnalyze({
      rawContent: "",
      fileName: "",
      sourceType: "prompt_only",
      userPrompt: trimmed,
    });
  };

  // Keyboard: Enter submits (unless Shift is held for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Example Prompt Click
  const handlePromptClick = (promptText: string) => {
    setInputText(promptText);
    onAnalyze({
      rawContent: "",
      fileName: "",
      sourceType: "prompt_only",
      userPrompt: promptText,
    });
  };

  // Sample Dataset Click
  const handleSampleClick = (sampleKey: "sales" | "department" | "marketing" | "sales25" | "churn") => {
    const raw = SAMPLE_DATASETS[sampleKey];
    onAnalyze({
      rawContent: raw,
      fileName: `sample_${sampleKey}.csv`,
      sourceType: "csv",
      userPrompt: `Analyze ${sampleKey} dataset and generate executive intelligence dashboard.`,
    });
  };

  return (
    <div className="w-full max-w-[880px] mx-auto flex flex-col items-center px-3 sm:px-6 transition-all duration-300">
      {/* ─────────────────────────────────────────────────────────────
          1. HERO / BRAND HEADER:
             State 1 Idle: Full Landing Presentation
             State 2 Active: Minimal Focused Wordmark
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {!isActive ? (
          <motion.div
            key="landing-hero"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{
              opacity: 1,
              height: "auto",
              marginBottom: 32,
              transition: {
                duration: shouldReduceMotion ? 0 : 0.25,
                ease: [0.16, 1, 0.3, 1],
              },
            }}
            exit={{
              opacity: 0,
              height: 0,
              marginBottom: 0,
              transition: {
                duration: shouldReduceMotion ? 0 : 0.2,
                ease: [0.16, 1, 0.3, 1],
              },
            }}
            className="w-full flex flex-col items-center text-center select-none overflow-hidden"
          >
            {/* Subtle KROMA Badge */}
            <div className="mb-4 sm:mb-5 inline-block">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-sm">
                <BrandMark className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono tracking-widest text-[#C86342] uppercase font-semibold">
                  KROMA — AUTONOMOUS DATA ANALYST
                </span>
              </div>
            </div>

            {/* Hero Heading: Primary focal point */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[50px] font-bold tracking-tight text-white leading-[1.14] font-display max-w-2xl">
              Transform data <br />
              <span className="text-[#C86342]">into visual intelligence.</span>
            </h1>

            {/* Supporting Subtitle: Generous separation */}
            <p className="mt-3.5 sm:mt-4 text-sm sm:text-base text-white/60 max-w-lg leading-relaxed font-sans font-normal">
              Ask a question, paste your data, or attach a CSV.
              <br className="hidden sm:inline" />
              {" "}Kroma figures out what matters.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="active-header"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{
              opacity: 1,
              height: "auto",
              marginBottom: 16,
              transition: {
                duration: shouldReduceMotion ? 0 : 0.24,
                ease: [0.16, 1, 0.3, 1],
              },
            }}
            exit={{
              opacity: 0,
              height: 0,
              marginBottom: 0,
              transition: {
                duration: shouldReduceMotion ? 0 : 0.18,
                ease: [0.16, 1, 0.3, 1],
              },
            }}
            className="flex items-center justify-center gap-2 select-none overflow-hidden"
          >
            <BrandMark className="w-4 h-4 opacity-85" />
            <span className="text-md font-mono font-semibold tracking-[0.24em] text-white/70 uppercase">
              KROMA
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN COMPOSER: Wide, lightweight, dynamic auto-expanding
      ───────────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        className={`w-full rounded-2xl border bg-[#18191b]/95 backdrop-blur-xl shadow-2xl transition-all duration-250 p-4 sm:p-5 flex flex-col gap-0.2 ${isActive
          ? "border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          : "border-white/15 hover:border-white/25"
          } ${isFocused
            ? "border-[#C86342]/70 shadow-[0_0_35px_rgba(200,99,66,0.12)] ring-1 ring-[#C86342]/20"
            : ""
          }`}
      >
        {/* Hidden File Input for Paperclip */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.txt"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Attached File Badge */}
        <AnimatePresence mode="popLayout">
          {attachedFile && (
            <motion.div
              key="attached-file-chip"
              variants={chipEntrance}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-xs font-mono text-white/90 shadow-sm self-start"
            >
              <FileText className="w-4 h-4 text-[#C86342]" />
              <span className="font-semibold truncate max-w-[260px] sm:max-w-[400px]">
                {attachedFile.name}
              </span>
              <span className="text-white/40 text-[11px]">
                ({(attachedFile.size / 1024).toFixed(1)} KB)
              </span>
              <button
                type="button"
                onClick={handleRemoveAttachment}
                className="ml-1 p-0.5 rounded hover:bg-white/15 text-white/40 hover:text-white transition cursor-pointer"
                title="Remove attachment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea Area: Seamless, internal scrollbar when exceeding max-height */}
        <div className="w-full relative">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setErrorMessage(null);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={
              attachedFile
                ? `Ask a question about ${attachedFile.name}, or click Ask to analyze...`
                : "Ask Kroma anything, paste tabular records, or describe your analysis..."
            }
            className={`w-full bg-transparent border-0 p-1 text-[13.5px] leading-relaxed text-white placeholder:text-white/35 focus:outline-none focus:ring-0 resize-none transition-[height] duration-75 ${liveDetection ? "font-mono" : "font-sans"
              }`}
            style={{
              minHeight: "84px",
              maxHeight: "min(380px, calc(100vh - 260px))",
            }}
          />
        </div>

        {/* Subtle Detected Data Metadata Row */}
        <AnimatePresence>
          {liveDetection && liveDetection.isValid && (
            <motion.div
              key="live-detection-banner"
              variants={bannerSlideDown}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="overflow-hidden"
            >
              <div className="pt-3 border-t border-white/[0.07] flex items-center justify-between text-xs font-mono text-white/70 px-1">
                <div className="flex items-center gap-2 text-[#C86342] font-semibold tracking-wider text-[11px]">
                  <CheckCircle2 className="w-4 h-4 text-[#C86342]" />
                  <span>DATA DETECTED</span>
                </div>
                <span className="text-white/50 text-[11px]">
                  {liveDetection.rowCount} rows · {liveDetection.columnCount} columns
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Notification */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              key="error-banner"
              variants={bannerSlideDown}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="overflow-hidden"
            >
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2 flex items-center gap-2 text-xs font-mono text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Action Controls */}
        <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.07]">
          {/* Left: Attach CSV Button */}
          <motion.button
            {...(shouldReduceMotion ? {} : buttonTapMotion)}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 text-xs font-mono text-white/75 hover:text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-[0.98]"
            title="Attach CSV or TSV file"
          >
            <Paperclip className="w-4 h-4 text-[#C86342]" />
            <span>Attach CSV</span>
          </motion.button>

          {/* Right: Submit / Intelligent Loading Stage */}
          <motion.button
            {...(shouldReduceMotion ? {} : buttonTapMotion)}
            type="submit"
            disabled={isAnalyzing}
            className="px-5 py-2 rounded-xl bg-[#C86342] hover:bg-[#ba5938] text-white font-mono text-xs font-semibold tracking-wide transition-all flex items-center gap-2 shadow-md shadow-[#C86342]/20 hover:shadow-[#C86342]/35 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[11px] font-mono">{LOADING_STAGES[loadingStageIndex]}</span>
              </>
            ) : (
              <>
                <span>Ask</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </div>
      </form>

      {/* ─────────────────────────────────────────────────────────────
          3. SUGGESTION PROMPTS: State 1 Idle Presentation (Collapses in Active State)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {!isActive && (
          <motion.div
            key="landing-suggestions"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{
              opacity: 1,
              height: "auto",
              marginTop: 28,
              transition: {
                duration: shouldReduceMotion ? 0 : 0.25,
                ease: [0.16, 1, 0.3, 1],
              },
            }}
            exit={{
              opacity: 0,
              height: 0,
              marginTop: 0,
              transition: {
                duration: shouldReduceMotion ? 0 : 0.2,
                ease: [0.16, 1, 0.3, 1],
              },
            }}
            className="w-full flex flex-col items-center text-center font-mono select-none overflow-hidden"
          >
            <div className="flex items-center justify-center gap-2 sm:gap-2.5 flex-wrap text-xs text-white/40">
              <span className="text-white/40 text-[11px] tracking-wide mr-1">Try asking:</span>
              {[
                "Analyze my sales",
                "Find unusual trends",
                "Forecast revenue",
              ].map((promptText) => (
                <button
                  key={promptText}
                  type="button"
                  onClick={() => handlePromptClick(promptText)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] hover:text-white border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer text-[11.5px] text-white/65 shadow-sm active:scale-[0.98]"
                >
                  "{promptText}"
                </button>
              ))}
            </div>

            {/* Reference Dataset Demo Links */}
            <div className="flex items-center justify-center gap-2 text-[11px] text-white/35 mt-4 pt-1 flex-wrap">
              <span>or explore reference data:</span>
              <button
                type="button"
                onClick={() => handleSampleClick("churn")}
                className="hover:text-white/80 underline underline-offset-4 decoration-white/20 hover:decoration-[#C86342]/70 transition-colors cursor-pointer text-[#C86342]/90 hover:text-[#C86342]"
              >
                Customer Churn (30 Obs)
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => handleSampleClick("sales25")}
                className="hover:text-white/80 underline underline-offset-4 decoration-white/20 hover:decoration-[#C86342]/70 transition-colors cursor-pointer"
              >
                Sales (25 Obs)
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => handleSampleClick("sales")}
                className="hover:text-white/80 underline underline-offset-4 decoration-white/20 hover:decoration-[#C86342]/70 transition-colors cursor-pointer"
              >
                Sales (20 mo)
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => handleSampleClick("department")}
                className="hover:text-white/80 underline underline-offset-4 decoration-white/20 hover:decoration-[#C86342]/70 transition-colors cursor-pointer"
              >
                Department
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => handleSampleClick("marketing")}
                className="hover:text-white/80 underline underline-offset-4 decoration-white/20 hover:decoration-[#C86342]/70 transition-colors cursor-pointer"
              >
                Marketing
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
