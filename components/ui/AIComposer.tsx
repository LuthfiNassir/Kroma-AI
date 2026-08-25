import React, { useState, KeyboardEvent } from "react";
import { Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIComposerProps {
  onSend: (prompt: string) => void;
  isLoading?: boolean;
  suggestions?: string[];
  placeholder?: string;
}

export const AIComposer: React.FC<AIComposerProps> = ({
  onSend,
  isLoading = false,
  suggestions = [
    "Summarize key trends",
    "Show top 5 items",
    "Calculate averages",
    "Distribution by category",
  ],
  placeholder = "Ask any data question or request analysis...",
}) => {
  const [value, setValue] = useState("");

  const handleSend = () => {
    if (!value.trim() || isLoading) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSend(suggestion);
  };

  return (
    <div className="w-full max-w-[720px] mx-auto space-y-2.5">
      {/* Suggestion Chips */}
      {suggestions.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-[11px] font-medium tracking-wider text-white/40 uppercase shrink-0 mr-1">
            [Suggestions]
          </span>
          {suggestions.map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(sug)}
              disabled={isLoading}
              className="rounded-full px-3 py-1 text-xs bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20 transition shrink-0 cursor-pointer disabled:opacity-50"
            >
              {sug}
            </button>
          ))}
        </div>
      )}

      {/* Floating Composer Container */}
      <div className="rounded-2xl bg-[#18191b] border border-white/15 p-3 shadow-2xl focus-within:border-[#A5329E]/60 transition-all duration-200">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          rows={2}
          className="bg-transparent text-white placeholder-white/40 resize-none outline-none text-sm w-full min-h-[48px] block font-sans"
        />

        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Sparkles className="w-3.5 h-3.5 text-[#A5329E]" />
            <span>[Local Ollama / AI Mode]</span>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!value.trim() || isLoading}
            className={cn(
              "rounded-xl bg-[#FE6749] text-white px-4 py-2 text-xs font-semibold hover:bg-[#e85a3c] transition-all duration-150 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
              isLoading && "animate-pulse"
            )}
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
  );
};
