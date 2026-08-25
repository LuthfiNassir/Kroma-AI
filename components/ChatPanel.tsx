import React, { useState, useEffect, useRef, KeyboardEvent } from "react";
import { ChevronDown, ChevronUp, Code, Sparkles, Terminal, BarChart2, Send, AlertTriangle } from "lucide-react";
import { ChatMessage } from "@/lib/types";
import { ChartCard } from "./ChartCard";
import { BrandMark } from "@/components/ui/BrandMark";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (prompt: string) => void;
  isLoading: boolean;
  suggestions?: string[];
}

// Lightweight structured markdown renderer
const FormattedMarkdown: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  // Split into paragraphs/blocks
  const blocks = content.split(/\n\n+/);

  return (
    <div className="space-y-3 font-sans text-xs leading-relaxed text-white/90">
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Check if block starts with a bold header like **[Direct Answer]** or **[Key Drivers]**
        const isHeaderBlock = trimmed.startsWith("**[") && trimmed.includes("]**");

        if (isHeaderBlock) {
          const closingIndex = trimmed.indexOf("]**");
          const headerText = trimmed.substring(3, closingIndex); // Extract text inside [ ]
          const restText = trimmed.substring(closingIndex + 3).trim();

          return (
            <div key={bIdx} className="space-y-1.5 pt-1">
              <div className="inline-block rounded-md bg-[#FE6749]/15 border border-[#FE6749]/30 px-2 py-0.5 text-[11px] font-mono font-bold text-[#FE6749] uppercase tracking-wider">
                [{headerText}]
              </div>
              {restText && <div className="text-white/85 pl-0.5">{renderFormattedText(restText)}</div>}
            </div>
          );
        }

        // Bullet point list block
        if (trimmed.includes("\n- ") || trimmed.startsWith("- ")) {
          const lines = trimmed.split("\n");
          return (
            <ul key={bIdx} className="space-y-1.5 pl-1 my-1">
              {lines.map((line, lIdx) => {
                const cleanLine = line.replace(/^- /, "").trim();
                if (!cleanLine) return null;
                return (
                  <li key={lIdx} className="flex items-start gap-2 text-white/85">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FE6749] shrink-0 mt-1.5" />
                    <span>{renderFormattedText(cleanLine)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // Normal paragraph
        return (
          <p key={bIdx} className="text-white/85">
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
}) => {
  const [openSqlId, setOpenSqlId] = useState<string | null>(null);
  const [inputPrompt, setInputPrompt] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const defaultSuggestions = [
    "Which product generates highest revenue?",
    "Show average order value by item",
    "Compare unit sales vs revenue",
    "Summarize top performing categories",
  ];

  const activeSuggestions = suggestions && suggestions.length > 0 ? suggestions : defaultSuggestions;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = (promptToSend?: string) => {
    const targetPrompt = promptToSend || inputPrompt;
    if (!targetPrompt.trim() || isLoading) return;
    onSendMessage(targetPrompt.trim());
    setInputPrompt("");
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

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden bg-[#212222]">
      {/* 1. SCROLLABLE MESSAGE FEED (Flex-1) */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4 p-4 pr-2 no-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FE6749]/10 border border-[#FE6749]/30 flex items-center justify-center text-[#FE6749]">
              <BrandMark className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-white tracking-tight">
              [Kroma Autonomous Intelligence]
            </h3>
            <p className="text-xs text-white/50 max-w-sm">
              Ask natural language queries across any dataset domain. All answers, multi-cohort comparisons, and SQL blocks render inline in this thread.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";

            if (isUser) {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="rounded-2xl rounded-tr-sm bg-white/10 border border-white/15 px-4 py-2.5 text-sm text-white max-w-[80%] shadow-sm">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <span className="text-[9px] text-white/40 block text-right mt-1 font-mono">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            }

            // Error Bubble
            if (msg.isError) {
              return (
                <div key={msg.id} className="flex justify-start">
                  <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-xs text-red-300 space-y-2 max-w-[90%] shadow-xl font-mono">
                    <div className="flex items-center gap-2 text-red-400 font-semibold uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4" />
                      <span>[Kroma Engine Error]</span>
                    </div>
                    <p className="leading-relaxed">{msg.content}</p>
                    <span className="text-[9px] text-red-400/50 block text-right">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            }

            const isSqlOpen = openSqlId === msg.id;

            return (
              <div key={msg.id} className="flex justify-start">
                <div className="rounded-2xl bg-[#18191b] border border-white/10 p-4 text-sm text-white space-y-3.5 max-w-[90%] md:max-w-[85%] shadow-xl">
                  {/* Assistant Header */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <BrandMark className="w-4 h-4" />
                      <span className="text-xs font-bold text-white tracking-tight">
                        [Kroma Intelligence]
                      </span>
                      <span className="rounded-full px-2 py-0.5 text-[9px] font-mono bg-[#A5329E]/30 text-[#FE88ED] border border-[#A5329E]/50">
                        Qwen 2.5 Coder
                      </span>
                    </div>
                    <span className="text-[10px] text-white/40 font-mono">
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Main Formatted Explanation */}
                  <FormattedMarkdown content={msg.content} />

                  {/* Inline Question-Specific Chart */}
                  {msg.inlineChart && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#FE6749] uppercase tracking-wider">
                        <BarChart2 className="w-3.5 h-3.5" />
                        <span>[Multi-Cohort Comparison]</span>
                      </div>
                      <ChartCard
                        series={msg.inlineChart}
                        defaultType={msg.inlineChart.type || "bar"}
                        accentColor="#FE6749"
                        secondaryColor="#A5329E"
                        className="min-h-[280px] p-4 bg-[#212222] border-white/10 cursor-default"
                      />
                    </div>
                  )}

                  {/* Executive Takeaway Banner */}
                  {msg.insight && (
                    <div className="rounded-xl bg-[#A5329E]/10 border-l-2 border-[#A5329E] p-3 text-xs text-white/90 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-[#A5329E] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[#FE88ED] block text-[11px] uppercase tracking-wider mb-0.5 font-mono">
                          [Executive Takeaway]
                        </span>
                        <p className="text-white/80">{msg.insight}</p>
                      </div>
                    </div>
                  )}

                  {/* Collapsible SQL Block */}
                  {msg.sqlQuery && (
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => toggleSql(msg.id)}
                        className="rounded-lg px-2.5 py-1 text-[11px] font-mono bg-white/5 border border-white/10 text-white/70 hover:text-white flex items-center gap-2 transition cursor-pointer"
                      >
                        <Code className="w-3 h-3 text-[#FE6749]" />
                        <span>[DuckDB SQL Query]</span>
                        {isSqlOpen ? (
                          <ChevronUp className="w-3 h-3 ml-auto" />
                        ) : (
                          <ChevronDown className="w-3 h-3 ml-auto" />
                        )}
                      </button>

                      {isSqlOpen && (
                        <div className="rounded-xl bg-[#0e0f11] border border-white/10 p-3 font-mono text-xs text-white/70 overflow-x-auto">
                          <div className="flex items-center justify-between text-[10px] text-white/40 mb-1 border-b border-white/5 pb-1">
                            <span>[SQL Syntax]</span>
                            <Terminal className="w-3 h-3" />
                          </div>
                          <pre className="text-emerald-400 font-mono text-[11px] whitespace-pre-wrap">
                            {msg.sqlQuery}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-[#18191b] border border-[#FE6749]/40 p-3.5 text-xs text-[#FE6749] flex items-center gap-2.5 animate-pulse font-mono shadow-lg">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>[Kroma is analyzing your dataset with Qwen 2.5 Coder...]</span>
            </div>
          </div>
        )}

        {/* Scroll End Anchor */}
        <div ref={messagesEndRef} className="h-6 shrink-0" />
      </div>

      {/* 2. DOCKED COMPOSER FOOTER */}
      <div className="shrink-0 p-4 pt-2 border-t border-white/10 bg-[#212222] space-y-2">
        {/* Suggestion Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {activeSuggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(s)}
              disabled={isLoading}
              className="rounded-full px-3 py-1 bg-white/5 border border-white/10 hover:border-[#FE6749]/60 text-xs text-white/80 whitespace-nowrap transition cursor-pointer disabled:opacity-50 font-mono"
            >
              {s}
            </button>
          ))}
        </div>

        {/* AI Composer Box */}
        <div className="rounded-2xl bg-[#18191b] border border-white/15 p-3 focus-within:border-[#A5329E]/60 transition shadow-2xl">
          <textarea
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Kroma any dataset question..."
            disabled={isLoading}
            rows={2}
            className="w-full bg-transparent text-sm text-white placeholder-white/40 outline-none resize-none min-h-[44px] block font-sans"
          />
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
            <span className="text-[11px] text-white/40 font-mono">
              [Kroma Local Engine / Qwen 2.5 Coder]
            </span>
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!inputPrompt.trim() || isLoading}
              className="rounded-xl bg-[#FE6749] text-white px-4 py-1.5 text-xs font-semibold hover:bg-[#e85a3c] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span>[Analyzing...]</span>
              ) : (
                <>
                  <span>[Send]</span>
                  <Send className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
