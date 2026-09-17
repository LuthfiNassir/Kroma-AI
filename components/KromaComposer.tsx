"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
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
  const [inputText, setInputText] = useState("");
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();

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

    // 3. Natural Language Prompt without attached file or data (Normal Prompt Handling)
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
  const handleSampleClick = (sampleKey: "sales" | "department" | "marketing") => {
    const raw = SAMPLE_DATASETS[sampleKey];
    onAnalyze({
      rawContent: raw,
      fileName: `sample_${sampleKey}.csv`,
      sourceType: "csv",
      userPrompt: `Analyze ${sampleKey} dataset and generate executive intelligence dashboard.`,
    });
  };

  return (
    <div className="relative w-full max-w-[720px] flex flex-col items-center justify-center p-2 sm:p-4">
      {/* Foreground Content (Centered, Minimal, Non-Scrollable) */}
      <div className="w-full text-center space-y-4">
        {/* Subtle Brand Header */}
        <div className="inline-block">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <BrandMark className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono tracking-widest text-[#FE6749] uppercase font-semibold">
              KROMA — AUTONOMOUS DATA ANALYST
            </span>
          </div>
        </div>

        {/* Short Hero Heading */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight font-sans">
          Transform data <br />
          <span className="text-[#FE6749]">into visual intelligence.</span>
        </h1>

        {/* Short Supporting Text */}
        <p className="text-xs md:text-sm text-white/60 max-w-md mx-auto leading-relaxed font-sans">
          Ask a question, paste your data, or attach a CSV.<br className="hidden sm:inline" />
          Kroma figures out what matters.
        </p>

        {/* 3. THE UNIVERSAL AI COMPOSER CARD */}
        <form
          onSubmit={handleSubmit}
          className={`rounded-2xl border p-3 sm:p-4 bg-[#18191b]/95 backdrop-blur-md shadow-2xl text-left space-y-2.5 transition-all duration-200 ${
            isFocused
              ? "border-[#FE6749]/60 shadow-[0_0_25px_rgba(254,103,73,0.12)] bg-[#18191b]"
              : "border-white/15 hover:border-white/25"
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

          {/* Attached File Chip */}
          <AnimatePresence mode="popLayout">
            {attachedFile && (
              <motion.div
                key="attached-file-chip"
                variants={chipEntrance}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white/90"
              >
                <FileText className="w-3.5 h-3.5 text-[#FE6749]" />
                <span className="font-semibold truncate max-w-[200px]">{attachedFile.name}</span>
                <span className="text-white/40 text-[10px]">
                  ({(attachedFile.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  type="button"
                  onClick={handleRemoveAttachment}
                  className="ml-1 p-0.5 rounded hover:bg-white/10 text-white/40 hover:text-white transition cursor-pointer"
                  title="Remove attachment"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Multiline Universal Composer Textarea */}
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setErrorMessage(null);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder={
                attachedFile
                  ? `Ask a question about ${attachedFile.name}, or press Ask to analyze...`
                  : "Ask Kroma anything..."
              }
              className="w-full rounded-xl bg-[#212222]/80 border border-white/10 p-3 text-xs font-mono text-white placeholder:text-white/35 focus:outline-none focus:border-[#FE6749]/80 transition-colors duration-150 resize-none min-h-[72px] max-h-[160px] overflow-y-auto"
            />
          </div>

          {/* Compact Tabular Detection Badge */}
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
                <div className="rounded-lg bg-white/5 border border-[#FE6749]/30 px-3 py-1.5 flex items-center justify-between text-[11px] font-mono text-white/80">
                  <div className="flex items-center gap-1.5 text-[#FE6749] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>[DATA DETECTED]</span>
                  </div>
                  <span className="text-white/60">
                    {liveDetection.rowCount} rows · {liveDetection.columnCount} columns
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Banner */}
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
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 flex items-center gap-2 text-xs font-mono text-red-300">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Controls Bar */}
          <div className="flex items-center justify-between pt-0.5">
            {/* Left: Attachment Button */}
            <motion.button
              {...(shouldReduceMotion ? {} : buttonTapMotion)}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#212222] text-xs font-mono text-white/70 hover:text-white hover:border-[#FE6749]/50 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Attach CSV or TSV file"
            >
              <Paperclip className="w-3.5 h-3.5 text-[#FE6749]" />
              <span>+ Attach CSV</span>
            </motion.button>

            {/* Right: Submit / Intelligent Loading Stage */}
            <motion.button
              {...(shouldReduceMotion ? {} : buttonTapMotion)}
              type="submit"
              disabled={isAnalyzing}
              className="px-4 py-1.5 rounded-xl bg-[#FE6749] hover:bg-[#e85a3c] text-white font-mono text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-[11px] font-mono">{LOADING_STAGES[loadingStageIndex]}</span>
                </>
              ) : (
                <>
                  <span>Ask</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </motion.button>
          </div>
        </form>

        {/* 4. Subtle Example Prompts */}
        <div className="flex flex-col items-center gap-1.5 pt-1 font-mono">
          <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-white/40">
            <span>Try asking:</span>
            {[
              "Analyze my sales",
              "Find unusual trends",
              "Forecast revenue",
            ].map((promptText) => (
              <button
                key={promptText}
                type="button"
                onClick={() => handlePromptClick(promptText)}
                className="px-2.5 py-0.5 rounded-md bg-white/5 hover:bg-white/10 hover:text-white border border-white/5 hover:border-white/20 transition-colors cursor-pointer text-[11px] text-white/60"
              >
                "{promptText}"
              </button>
            ))}
          </div>

          {/* Reference Dataset Demo Links */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-white/30 pt-0.5">
            <span>or explore reference data:</span>
            <button
              type="button"
              onClick={() => handleSampleClick("sales")}
              className="hover:text-white/70 underline underline-offset-2 transition-colors cursor-pointer"
            >
              Sales (20 mo)
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => handleSampleClick("department")}
              className="hover:text-white/70 underline underline-offset-2 transition-colors cursor-pointer"
            >
              Department
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => handleSampleClick("marketing")}
              className="hover:text-white/70 underline underline-offset-2 transition-colors cursor-pointer"
            >
              Marketing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
