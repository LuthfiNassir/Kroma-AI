"use client";

import React, { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Code,
  Sparkles,
  Terminal,
  BarChart2,
  Send,
  AlertTriangle,
  Paperclip,
  UploadCloud,
  FileText,
  X,
} from "lucide-react";
import { ChatMessage, DatasetSourceType } from "@/lib/types";
import { ChartCard } from "./ChartCard";
import { BrandMark } from "@/components/ui/BrandMark";
import {
  chatMessageUser,
  chatMessageAssistant,
  buttonTapMotion,
  bannerSlideDown,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (prompt: string) => void;
  isLoading: boolean;
  suggestions?: string[];
  hasDataset?: boolean;
  onAttachData?: (payload: {
    rawContent: string;
    fileName: string;
    sourceType: DatasetSourceType;
    userPrompt?: string;
  }) => void;
  ollamaStatus?: "connected" | "connecting" | "offline";
  onRetryConnection?: () => void;
}

// Lightweight structured markdown renderer
const FormattedMarkdown: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  // Split into paragraphs/blocks
  const blocks = content.split(/\n\n+/);

  return (
    <div className="space-y-4.5 font-sans text-sm leading-relaxed text-white/90">
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Check if block starts with a bold header like **[Direct Answer]** or **[Key Drivers]**
        const isHeaderBlock = trimmed.startsWith("**[") && trimmed.includes("]**");

        if (isHeaderBlock) {
          const closingIndex = trimmed.indexOf("]**");
          const headerText = trimmed.substring(3, closingIndex);
          const restText = trimmed.substring(closingIndex + 3).trim();

          return (
            <div key={bIdx} className="space-y-2.5 pt-3 pb-1">
              <div className="inline-block rounded-md bg-[#C86342]/15 border border-[#C86342]/30 px-3 py-1 text-xs font-mono font-bold text-[#C86342] uppercase tracking-wider">
                [{headerText}]
              </div>
              {restText && <div className="text-white/90 pl-0.5 leading-relaxed">{renderFormattedText(restText)}</div>}
            </div>
          );
        }

        // Bullet point list block
        if (trimmed.includes("\n- ") || trimmed.startsWith("- ")) {
          const lines = trimmed.split("\n");
          return (
            <ul key={bIdx} className="space-y-3 pl-1.5 my-3">
              {lines.map((line, lIdx) => {
                const cleanLine = line.replace(/^- /, "").trim();
                if (!cleanLine) return null;
                return (
                  <li key={lIdx} className="flex items-start gap-2.5 text-white/85">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C86342] shrink-0 mt-2" />
                    <span>{renderFormattedText(cleanLine)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // Normal paragraph
        return (
          <p key={bIdx} className="text-white/85 leading-relaxed">
            {renderFormattedText(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

// Inline bolding parser helper
function renderFormattedText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  isLoading,
  suggestions,
  hasDataset = false,
  onAttachData,
  ollamaStatus,
  onRetryConnection,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [openSqlId, setOpenSqlId] = useState<string | null>(null);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Derived state: true when composer contains non-whitespace text
  const hasInputContent = inputPrompt.trim().length > 0;

  // Dynamic Auto-Resize: compact resting state (48px) to viewport-aware maximum
  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const minHeight = 48;
    // Viewport-aware max height, reserving space for top nav and message list visibility
    const available = typeof window !== "undefined" ? window.innerHeight - 340 : 240;
    const maxHeight = Math.max(160, Math.min(240, available));
    const scrollHeight = el.scrollHeight;
    const targetHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    el.style.height = `${targetHeight}px`;
    el.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputPrompt, adjustTextareaHeight]);

  useEffect(() => {
    window.addEventListener("resize", adjustTextareaHeight, { passive: true });
    return () => window.removeEventListener("resize", adjustTextareaHeight);
  }, [adjustTextareaHeight]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = (promptToSend?: string) => {
    const targetPrompt = promptToSend || inputPrompt;
    if (!targetPrompt.trim() || isLoading) return;

    // Chat input routes strictly to onSendMessage for AI conversation against active dataset.
    onSendMessage(targetPrompt.trim());
    setInputPrompt("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "48px";
      textareaRef.current.style.overflowY = "hidden";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleSql = (id: string) => {
    setOpenSqlId((prev) => (prev === id ? null : id));
  };

  // Handle Paperclip File Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0] && onAttachData) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          onAttachData({
            rawContent: content,
            fileName: file.name,
            sourceType: "csv",
            userPrompt: inputPrompt.trim() || undefined,
          });
          setInputPrompt("");
        }
      };
      reader.readAsText(file);
    }
    if (e.target) {
      e.target.value = "";
    }
  };

  // Drag and Drop Handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files && files[0] && onAttachData) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          onAttachData({
            rawContent: content,
            fileName: file.name,
            sourceType: "csv",
            userPrompt: inputPrompt.trim() || undefined,
          });
          setInputPrompt("");
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col h-full w-full relative overflow-hidden bg-[#212222]"
    >
      {/* Hidden File Input for Paperclip */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Drag & Drop Overlay */}
      <AnimatePresence>
        {isDraggingOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#18191b]/95 border-2 border-dashed border-[#C86342] flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm"
          >
            <UploadCloud className="w-12 h-12 text-[#C86342] animate-bounce mb-3" />
            <h4 className="text-sm font-bold font-mono text-white mb-1">
              [DROP CSV DATASET TO ATTACH]
            </h4>
            <p className="text-xs text-white/60 font-mono max-w-xs">
              Attaching valid tabular data will activate Kroma Data Analysis Mode.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. SCROLLABLE MESSAGE FEED */}
      <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar">
        <div className="w-full max-w-[1140px] mx-auto px-4 sm:px-6 md:px-10 pt-8 pb-12 space-y-10 sm:space-y-12">
          {messages.length === 0 ? (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#C86342]/10 border border-[#C86342]/30 flex items-center justify-center text-[#C86342] shadow-lg shadow-[#C86342]/10">
                <BrandMark className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight font-mono">
                  [Kroma Conversational Intelligence]
                </h3>
                <p className="text-xs sm:text-sm text-white/50 max-w-md font-sans leading-relaxed">
                  Chat naturally with Kroma like a general AI assistant. When you want to analyze data, simply attach a CSV or paste tabular records at any time.
                </p>
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isUser = msg.role === "user";

                if (isUser) {
                  return (
                    <motion.div
                      key={msg.id}
                      variants={shouldReduceMotion ? undefined : chatMessageUser}
                      initial={shouldReduceMotion ? undefined : "hidden"}
                      animate={shouldReduceMotion ? undefined : "visible"}
                      className="flex justify-end w-full"
                    >
                      <div className="rounded-2xl rounded-tr-sm bg-[#27292c] border border-white/20 px-6 py-4 text-sm text-white max-w-[85%] md:max-w-[70%] shadow-lg font-sans leading-relaxed">
                        <p className="whitespace-pre-wrap text-white/95">{msg.content}</p>
                        <span className="text-[10px] text-white/40 block text-right mt-2 font-mono">
                          {msg.timestamp}
                        </span>
                      </div>
                    </motion.div>
                  );
                }

                // Structured Ollama Offline Diagnostic Card
                if (msg.isOfflineCard || (msg.isError && msg.offlineMetadata) || (msg.isError && msg.content.includes("Ollama"))) {
                  const meta = msg.offlineMetadata || {
                    status: "Offline",
                    endpoint: "127.0.0.1:11434",
                    model: "qwen2.5-coder:7b",
                  };

                  return (
                    <motion.div
                      key={msg.id}
                      variants={shouldReduceMotion ? undefined : chatMessageAssistant}
                      initial={shouldReduceMotion ? undefined : "hidden"}
                      animate={shouldReduceMotion ? undefined : "visible"}
                      className="flex justify-start w-full"
                    >
                      <div className="w-full rounded-2xl bg-[#18191b] border border-amber-500/30 p-6 sm:p-7 md:p-8 text-xs text-white/90 space-y-5 shadow-2xl font-mono">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                          <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>[KROMA ENGINE OFFLINE]</span>
                          </div>
                          <span className="text-[10px] text-white/40">{msg.timestamp}</span>
                        </div>

                        {/* Diagnostic Summary */}
                        <p className="font-sans text-sm leading-relaxed text-white/80">
                          {msg.content || "Local inference engine is unreachable. Analytical computing and dashboard widgets remain fully operational using deterministic processing."}
                        </p>

                        {/* Diagnostic Status Table */}
                        <div className="bg-[#212222] rounded-xl p-4 border border-white/10 space-y-2.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-white/50">Ollama Status:</span>
                            <span className="text-red-400 font-bold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block animate-pulse" />
                              {meta.status}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white/50">Local Endpoint:</span>
                            <span className="text-white/80 font-mono">{meta.endpoint}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white/50">Target Model:</span>
                            <span className="text-[#FE88ED] font-mono">{meta.model}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white/50">Deterministic Engine:</span>
                            <span className="text-emerald-400 font-bold">100% Operational</span>
                          </div>
                        </div>

                        {/* Action Row */}
                        <div className="pt-1 flex items-center gap-3 flex-wrap">
                          {onRetryConnection && (
                            <button
                              type="button"
                              onClick={onRetryConnection}
                              className="px-3.5 py-2 rounded-xl bg-[#C86342] hover:bg-[#b05335] text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              [Retry Connection]
                            </button>
                          )}
                          <span className="text-[11px] text-white/40 font-mono">
                            Launch: <code className="bg-white/10 px-1.5 py-0.5 rounded text-white/70">ollama run {meta.model}</code>
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                // Generic Error Bubble
                if (msg.isError) {
                  return (
                    <motion.div
                      key={msg.id}
                      variants={shouldReduceMotion ? undefined : chatMessageAssistant}
                      initial={shouldReduceMotion ? undefined : "hidden"}
                      animate={shouldReduceMotion ? undefined : "visible"}
                      className="flex justify-start w-full"
                    >
                      <div className="w-full rounded-2xl rounded-tl-sm bg-red-500/10 border border-red-500/30 p-6 text-sm text-red-300 space-y-3 shadow-xl font-mono">
                        <div className="flex items-center gap-2 text-red-400 font-semibold uppercase tracking-wider text-xs">
                          <AlertTriangle className="w-4 h-4" />
                          <span>[Kroma Engine Alert]</span>
                        </div>
                        <p className="leading-relaxed font-sans">{msg.content}</p>
                        <span className="text-[10px] text-red-400/50 block text-right">
                          {msg.timestamp}
                        </span>
                      </div>
                    </motion.div>
                  );
                }

                const isSqlOpen = openSqlId === msg.id;

                return (
                  <motion.div
                    key={msg.id}
                    variants={shouldReduceMotion ? undefined : chatMessageAssistant}
                    initial={shouldReduceMotion ? undefined : "hidden"}
                    animate={shouldReduceMotion ? undefined : "visible"}
                    className="flex justify-start w-full"
                  >
                    <div className="w-full rounded-2xl rounded-tl-sm bg-[#18191b] border border-white/10 p-6 sm:p-8 md:p-9 text-sm text-white space-y-6 shadow-2xl">

                      {/* Main Formatted Explanation */}
                      <FormattedMarkdown content={msg.content} />
                      <span className="text-[10px] text-white/40 font-mono">
                        {msg.timestamp}
                      </span>

                      {/* Inline Question-Specific Chart (if any) */}
                      {msg.inlineChart && (
                        <div className="my-5 pt-2 pb-1 space-y-4">
                          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#C86342] uppercase tracking-wider pl-0.5">
                            <BarChart2 className="w-4 h-4 text-[#C86342]" />
                            <span>[Multi-Cohort Comparison]</span>
                          </div>
                          <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#141517] p-5 sm:p-6 shadow-inner">
                            <ChartCard
                              series={msg.inlineChart}
                              defaultType={msg.inlineChart.type || "bar"}
                              accentColor="#C86342"
                              secondaryColor="#A5329E"
                              className="min-h-[280px] h-[200px] border-0 bg-transparent pl-3 cursor-default"
                            />
                          </div>
                        </div>
                      )}

                      {/* Collapsible SQL Block */}
                      {msg.sqlQuery && (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => toggleSql(msg.id)}
                            className="rounded-lg px-3 py-1.5 text-xs font-mono bg-white/5 border border-white/10 text-white/70 hover:text-white flex items-center gap-2 transition cursor-pointer"
                          >
                            <Code className="w-3.5 h-3.5 text-[#C86342]" />
                            <span>[SQL Query]</span>
                            {isSqlOpen ? (
                              <ChevronUp className="w-3.5 h-3.5 ml-auto" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                            )}
                          </button>

                          <AnimatePresence>
                            {isSqlOpen && (
                              <motion.div
                                variants={bannerSlideDown}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="overflow-hidden"
                              >
                                <div className="rounded-xl bg-[#0e0f11] border border-white/10 p-3.5 font-mono text-xs text-white/70 overflow-x-auto">
                                  <div className="flex items-center justify-between text-[10px] text-white/40 mb-1.5 border-b border-white/5 pb-1.5">
                                    <span>[SQL Syntax]</span>
                                    <Terminal className="w-3 h-3" />
                                  </div>
                                  <pre className="text-emerald-400 font-mono text-[11px] whitespace-pre-wrap">
                                    {msg.sqlQuery}
                                  </pre>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {/* Loading Indicator */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                variants={chatMessageAssistant}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="flex justify-start w-full"
              >
                <div className="rounded-2xl bg-[#18191b] border border-[#C86342]/40 p-4 text-xs sm:text-sm text-[#C86342] flex items-center gap-3 animate-pulse font-mono shadow-lg">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>[Kroma is analyzing with Qwen 2.5 Coder...]</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scroll End Anchor */}
          <div ref={messagesEndRef} className="h-6 shrink-0" />
        </div>
      </div>

      {/* 2. PERSISTENT COMPOSER FOOTER */}
      <div className="shrink-0 border-t border-white/10 bg-[#212222]/95 backdrop-blur-md pt-4 pb-5 sm:pb-7">
        <div className="w-full max-w-[1140px] mx-auto px-4 sm:px-6 md:px-10">
          {/* AI Composer Box: Matches landing-page composer focus, auto-expand, and scrollbar behavior */}
          <div
            className={cn(
              "rounded-2xl bg-[#18191b] border transition-all duration-200 p-4 sm:p-4.5 flex flex-col shadow-xl",
              hasInputContent
                ? "border-white/20 shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
                : "border-white/15 hover:border-white/25",
              isFocused && "border-[#C86342]/70 shadow-[0_0_30px_rgba(200,99,66,0.14)] ring-1 ring-[#C86342]/20"
            )}
          >
            <textarea
              ref={textareaRef}
              value={inputPrompt}
              onChange={(e) => {
                setInputPrompt(e.target.value);
                adjustTextareaHeight();
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={
                hasDataset
                  ? "Ask Kroma any dataset question..."
                  : "Ask Kroma anything, paste data, or attach a CSV..."
              }
              disabled={isLoading}
              className="w-full bg-transparent text-sm leading-relaxed text-white placeholder:text-white/40 outline-none resize-none block font-sans transition-[height] duration-75 p-1"
              style={{
                minHeight: "48px",
                maxHeight: "min(240px, calc(100vh - 360px))",
              }}
            />
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/[0.08] shrink-0">
              <div className="flex items-center gap-2">
                {/* Paperclip Button to Attach Dataset */}
                {onAttachData && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach CSV dataset"
                    className="rounded-lg px-2.5 py-1.5 text-white/50 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition cursor-pointer flex items-center gap-1.5 text-[11px] font-mono"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-[#C86342]" />
                    <span className="hidden sm:inline">Attach CSV</span>
                  </button>
                )}
                <span className="text-[11px] text-white/40 font-mono">
                  [Kroma Engine / Localhost]
                </span>
              </div>

              <motion.button
                {...(shouldReduceMotion ? {} : buttonTapMotion)}
                type="button"
                onClick={() => handleSend()}
                disabled={!hasInputContent || isLoading}
                className="rounded-xl bg-[#C86342] hover:bg-[#ba5938] text-white px-5 py-2 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-[#C86342]/20 active:scale-[0.98]"
              >
                {isLoading ? (
                  <span>[Analyzing...]</span>
                ) : (
                  <>
                    <span>[Send]</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
