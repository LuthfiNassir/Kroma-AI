"use client";

import React, { useRef, useState, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { RadialGradient } from "@/components/ui/RadialGradient";
import { Tiles } from "@/components/ui/Tiles";
import { BrandMark } from "@/components/ui/BrandMark";
import { SAMPLE_DATASETS, validateTabularInput, extractPromptAndData } from "@/lib/dataEngine";
import { DatasetSourceType } from "@/lib/types";
import {
  staggerContainer,
  slideUp,
  chipEntrance,
  bannerSlideDown,
  buttonTapMotion,
  ambientFloatVariants,
} from "@/lib/motion";
import {
  Paperclip,
  Sparkles,
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

export function KromaComposer({ onAnalyze, isAnalyzing = false }: KromaComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputText, setInputText] = useState("");
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const shouldReduceMotion = useReducedMotion();

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
    // Reset input so same file can be re-selected if needed
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
      setErrorMessage("Ask a question, paste tabular data, or attach a CSV file to analyze.");
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
    setErrorMessage("No tabular dataset detected. Please paste your tabular data rows or attach a CSV file to begin analysis.");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

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
    <div className="relative min-h-[calc(100vh-60px)] w-full flex flex-col items-center justify-center p-4 md:p-6 overflow-hidden bg-[#212222]">
      {/* 1. Atmospheric Glow Layer with slow ambient motion */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        variants={shouldReduceMotion ? undefined : ambientFloatVariants}
        initial="initial"
        animate="animate"
      >
        <RadialGradient />
      </motion.div>

      {/* 2. Interactive Background Tiles */}
      <Tiles />

      {/* 3. Foreground Content with Staggered Entrance */}
      <motion.div
        className="relative z-10 max-w-2xl w-full text-center space-y-6"
        variants={staggerContainer(0.08, 0.05)}
        initial={shouldReduceMotion ? "visible" : "hidden"}
        animate="visible"
      >
        {/* Brand Header Badge */}
        <motion.div variants={slideUp} className="inline-block">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <BrandMark className="w-4 h-4" />
            <span className="text-[11px] font-mono tracking-widest text-[#FE6749] uppercase font-semibold">
              KROMA · AUTONOMOUS DATA INTELLIGENCE
            </span>
          </div>
        </motion.div>

        {/* Hero Heading */}
        <motion.h1
          variants={slideUp}
          className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight font-sans"
        >
          Transform data into <br />
          <span className="text-[#FE6749]">visual intelligence.</span>
        </motion.h1>

        {/* Supporting Subtitle */}
        <motion.p
          variants={slideUp}
          className="text-xs md:text-sm text-white/60 max-w-lg mx-auto leading-relaxed font-sans"
        >
          Ask a question, paste data, or attach a CSV. Kroma handles the analysis.
        </motion.p>

        {/* 4. THE UNIVERSAL AI COMPOSER CARD */}
        <motion.form
          variants={slideUp}
          onSubmit={handleSubmit}
          className={`rounded-3xl border p-4 md:p-5 bg-[#18191b]/95 backdrop-blur-md shadow-2xl text-left space-y-3 transition-all duration-200 ${
            isFocused
              ? "border-[#FE6749]/60 shadow-[0_0_30px_rgba(254,103,73,0.15)] bg-[#18191b]"
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

          {/* Attached File Chip with AnimatePresence */}
          <AnimatePresence mode="popLayout">
            {attachedFile && (
              <motion.div
                key="attached-file-chip"
                variants={chipEntrance}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white/90"
              >
                <FileText className="w-3.5 h-3.5 text-[#FE6749]" />
                <span className="font-semibold">{attachedFile.name}</span>
                <span className="text-white/40 text-[10px]">
                  ({(attachedFile.size / 1024).toFixed(1)} KB)
                </span>
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={handleRemoveAttachment}
                  className="ml-1 p-0.5 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition cursor-pointer"
                  title="Remove attachment"
                >
                  <X className="w-3 h-3" />
                </motion.button>
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
              rows={4}
              placeholder={
                attachedFile
                  ? `Ask a question about ${attachedFile.name}, or leave empty for automatic intelligence dashboard...`
                  : "Ask Kroma anything about your data, or paste tabular rows directly..."
              }
              className="w-full rounded-2xl bg-[#212222]/80 border border-white/10 p-3.5 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-[#FE6749]/80 transition-colors duration-150 resize-y min-h-[110px] max-h-[320px]"
            />
          </div>

          {/* Live Tabular Data Detection Badge with AnimatePresence */}
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
                <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 flex items-center justify-between text-[11px] font-mono text-white/80">
                  <div className="flex items-center gap-1.5 text-[#FE6749]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>[Tabular Data Detected]</span>
                  </div>
                  <span className="text-white/60">
                    {liveDetection.rowCount} records • {liveDetection.columnCount} attributes (
                    {liveDetection.columns.slice(0, 3).join(", ")}
                    {liveDetection.columns.length > 3 ? "..." : ""})
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Banner with AnimatePresence */}
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
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 flex items-center gap-2 text-xs font-mono text-red-300">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Controls Bar */}
          <div className="flex items-center justify-between pt-1">
            {/* Left: Attachment Button */}
            <motion.button
              {...(shouldReduceMotion ? {} : buttonTapMotion)}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded-xl border border-white/10 bg-[#212222] text-xs font-mono text-white/70 hover:text-white hover:border-[#FE6749]/50 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Attach CSV or TSV file"
            >
              <Paperclip className="w-3.5 h-3.5 text-[#FE6749]" />
              <span>[Attach CSV]</span>
            </motion.button>

            {/* Right: Analyze Button */}
            <motion.button
              {...(shouldReduceMotion ? {} : buttonTapMotion)}
              type="submit"
              disabled={isAnalyzing}
              className="px-5 py-2.5 rounded-xl bg-[#FE6749] hover:bg-[#e85a3c] text-white font-mono text-xs font-semibold transition-colors flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>[Analyzing Data...]</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>[Analyze Data]</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </motion.button>
          </div>
        </motion.form>

        {/* 5. Secondary Demo Dataset Chips */}
        <motion.div
          variants={slideUp}
          className="flex items-center justify-center gap-2 flex-wrap pt-1 font-sans"
        >
          <span className="text-xs text-white/40 font-mono">Try sample datasets:</span>
          {(["sales", "department", "marketing"] as const).map((sampleKey) => {
            const label = sampleKey.charAt(0).toUpperCase() + sampleKey.slice(1);
            return (
              <motion.button
                {...(shouldReduceMotion ? {} : buttonTapMotion)}
                key={sampleKey}
                type="button"
                onClick={() => handleSampleClick(sampleKey)}
                className="rounded-full px-3 py-1 bg-white/5 border border-white/10 text-xs font-mono text-white/70 hover:border-[#FE6749]/50 hover:text-white transition-colors cursor-pointer"
              >
                {`[Sample: ${label}]`}
              </motion.button>
            );
          })}
        </motion.div>
      </motion.div>
    </div>
  );
}
