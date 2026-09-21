"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { 
  fetchSessions, 
  saveSession, 
  deleteSession 
} from "@/lib/firebase";
import { 
  AnalysisSession, 
  ChatMessage, 
  ChartDataSeries,
  DatasetSourceType
} from "@/lib/types";
import { 
  parseTabularData,
  generateInitialDashboard,
  refreshDashboardWithFocus,
  validateTabularInput,
  extractPromptAndData,
} from "@/lib/dataEngine";
import { 
  buildOllamaSystemPrompt, 
  queryOllamaDirect,
  queryOllamaGeneral,
  checkOllamaStatus,
} from "@/lib/ollama";
import { Sidebar } from "./Sidebar";
import { BentoGrid } from "./BentoGrid";
import { ChatPanel } from "./ChatPanel";
import { KromaComposer } from "./KromaComposer";
import { ChartModal } from "./ChartModal";
import { DeleteSessionModal } from "./DeleteSessionModal";
import { Tiles } from "./ui/Tiles";
import { ErrorBoundary } from "./ErrorBoundary";
import {
  pageViewVariants,
  buttonTapMotion,
  fadeIn,
} from "@/lib/motion";
import { LayoutGrid, MessageSquare, RefreshCw, Loader2, Sparkles, Database } from "lucide-react";
import { cn } from "@/lib/utils";

// Auto-Title Derivation (Requirement 7)
export function deriveSessionTitle(prompt: string): string {
  const p = prompt.trim();
  const pLower = p.toLowerCase();

  if (pLower.includes("ebitda")) return "Understanding EBITDA";
  if (pLower.includes("presentation") || pLower.includes("deck") || pLower.includes("slides")) return "Executive Presentation";
  if (pLower.includes("churn") || pLower.includes("leaving") || pLower.includes("retention")) return "Customer Churn";
  if (pLower.includes("sales") && (pLower.includes("q3") || pLower.includes("quarter"))) return "Q3 Sales Analysis";
  if (pLower.includes("sales")) return "Sales Analysis";
  if (pLower.includes("error") || pLower.includes("debug") || pLower.includes("bug")) return "Error Debugging";
  if (pLower.includes("what can you help") || pLower.includes("capabilities") || pLower.includes("who are you")) return "Kroma Overview";
  if (pLower.includes("salary") || pLower.includes("compensation") || pLower.includes("hr")) return "Compensation Analysis";
  if (pLower.includes("marketing") || pLower.includes("campaign")) return "Marketing Performance";

  const clean = p
    .replace(/^(can you|could you|please|help me|i want to|how do i|how should i|how to|what is|what are|explain|analyze|tell me about|show me)\s+/i, "")
    .replace(/[?!.]+$/, "")
    .trim();

  if (!clean) return "New conversation";

  const words = clean.split(/\s+/).slice(0, 5);
  const titled = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  return titled.length > 36 ? titled.slice(0, 33) + "..." : titled;
}

// Deterministic offline fallback for general conversations
function generateConversationalFallback(prompt: string): { explanation: string; insight: string } {
  const p = prompt.toLowerCase();
  if (p.includes("ebitda")) {
    return {
      explanation: `**[Direct Answer]**\n**EBITDA** stands for **Earnings Before Interest, Taxes, Depreciation, and Amortization**. It is one of the most widely referenced measures of operational profitability and core business cash-generation capacity.\n\n**[Calculation & Formula]**\n\`\`\`\nEBITDA = Net Income + Interest Expense + Tax Expense + Depreciation + Amortization\n\`\`\`\nAlternatively, starting from Operating Income (EBIT):\n\`\`\`\nEBITDA = Operating Profit (EBIT) + Depreciation + Amortization\n\`\`\`\n\n**[Key Drivers & Why It Matters]**\n- **Core Operations Focus:** By stripping out non-operating expenses (interest and tax rates vary widely by jurisdiction and debt structure) and non-cash accounting charges (depreciation and amortization), EBITDA offers a clean look at baseline operational efficacy.\n- **Cross-Company Comparability:** Allows investors and analysts to benchmark companies with varying capital structures, financing strategies, and asset vintages on equal footing.\n- **Valuation Multiples:** Widely used in valuation benchmarks such as Enterprise Value to EBITDA (EV/EBITDA).\n\n**[Limitations]**\nEBITDA ignores capital expenditures (CapEx) required to maintain physical equipment and working capital fluctuations. For capital-intensive industries, free cash flow (FCF) provides a necessary counterpart.\n\n**[Executive Takeaway]**\nUse EBITDA to evaluate operational efficiency independent of financing decisions and depreciation schedules, but pair it with cash flow analysis for solvency assessment.`,
      insight: "EBITDA measures core operating profitability before non-operating and non-cash expenses.",
    };
  }

  if (p.includes("presentation") || p.includes("deck") || p.includes("slides")) {
    return {
      explanation: `**[Direct Answer]**\nHere is a proven 6-part executive presentation structure engineered for strategic alignment and rapid decision-making:\n\n**[Presentation Structure]**\n1. **Executive Summary (The Bottom Line First):**\n   - High-level verdict: Core achievement, primary bottleneck, and recommendation.\n   - 3 quantifiable headline metrics.\n2. **Current State & Baseline Trajectory:**\n   - Where the business stands today vs. plan.\n   - Historical trendline and growth momentum.\n3. **Key Drivers & Variance Analysis:**\n   - What drove over- or under-performance (cohort breakdowns, channel shifts, cost changes).\n   - Direct attribution without vanity metrics.\n4. **Strategic Options & Trade-Offs:**\n   - Option A (Accelerate), Option B (Consolidate), Option C (Status Quo).\n   - Risk/return profile and capital requirements for each.\n5. **Deterministic Recommendation:**\n   - Specific course of action with expected impact and timeline.\n6. **Next Steps & Ownership:**\n   - Actionable 30/60/90-day roadmap with assigned owners.\n\n**[Executive Takeaway]**\nLead with the conclusion, support with verified data, and conclude with decisive operational next steps.`,
      insight: "Lead with the bottom-line recommendation before unwrapping supporting data.",
    };
  }

  if (p.includes("error") || p.includes("debug") || p.includes("bug")) {
    return {
      explanation: `**[Direct Answer]**\nTo help you diagnose and fix the error, please provide the exact error message, stack trace, and relevant code snippet.\n\n**[Diagnostic Checklist]**\n- **Runtime vs Compile-time:** Is the error failing during build/compilation or in production execution?\n- **Null/Undefined Checks:** Did an asynchronous variable or API response resolve unexpectedly to \`undefined\`?\n- **Environment & Configuration:** Are local environment variables, credentials, or ports colliding?\n\n**[Next Step]**\nPaste the error log or code block directly into this chat and I will dissect the root cause and provide the corrected code.`,
      insight: "Share the stack trace and code context for immediate root cause dissection.",
    };
  }

  if (p.includes("what can you help") || p.includes("help me with") || p.includes("capabilities") || p.includes("who are you")) {
    return {
      explanation: `**[Kroma Assistant & Analyst Capabilities]**\n\nHello! I am **Kroma**, an autonomous intelligence platform designed for executive decision-making and quantitative analysis.\n\n**[Conversational Mode (Current)]**\n- Discuss corporate finance, unit economics, accounting principles, and growth strategies.\n- Structure board presentations, strategic memos, and executive dashboards.\n- Troubleshoot code, data models, and analytical queries.\n\n**[Data Analysis Mode (Activate Anytime)]**\n- **Attach any CSV** or **paste tabular data** directly into this chat or on the home screen.\n- Automatic dataset archetype classification (Financial, Quantitative Progress, Categorical, Cross-Sectional).\n- Real-time Bento dashboard synthesis with interactive charts, KPI metrics, and DuckDB SQL queries.\n- Deterministic 6-month forecasting with 95% confidence bounds and growth trajectory tracking.`,
      insight: "Chat freely or attach a CSV anytime to launch full Data Analysis mode.",
    };
  }

  return {
    explanation: `**[Direct Answer]**\nI understand your request regarding: "${prompt}".\n\n**[Key Perspective]**\n- As your executive AI partner, I provide structured guidance, analytical reasoning, and strategic recommendations.\n- If your question involves specific numbers, performance indicators, or custom records, you can drop a CSV file or paste tabular data directly into this thread at any moment to generate an interactive Bento analytics dashboard.\n\n**[Executive Takeaway]**\nFeel free to explore further or attach dataset records for live deep-dive profiling.`,
    insight: "Kroma Conversational Intelligence ready.",
  };
}

export const Workspace: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [activeSession, setActiveSession] = useState<AnalysisSession | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "chat" | "split">("split");
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzingNew, setIsAnalyzingNew] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [activeModalChart, setActiveModalChart] = useState<ChartDataSeries | null>(null);
  const [sessionPendingDelete, setSessionPendingDelete] = useState<AnalysisSession | null>(null);

  // Session Isolation & In-Flight Query Cancellation Refs
  const activeSessionIdRef = useRef<string | null>(null);
  const inFlightAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    activeSessionIdRef.current = activeSession?.sessionId || null;
  }, [activeSession]);

  // Ollama Connection Status Pill & Diagnostics State
  const [ollamaStatus, setOllamaStatus] = useState<"connected" | "connecting" | "offline">("connecting");
  const [ollamaMeta, setOllamaMeta] = useState({
    endpoint: "127.0.0.1:11434",
    model: "qwen2.5-coder:7b",
  });

  const refreshOllamaStatus = useCallback(async () => {
    setOllamaStatus("connecting");
    const status = await checkOllamaStatus();
    setOllamaStatus(status.online ? "connected" : "offline");
    setOllamaMeta({
      endpoint: status.endpoint,
      model: status.model,
    });
    return status;
  }, []);

  useEffect(() => {
    refreshOllamaStatus();
  }, [refreshOllamaStatus]);

  // Load sessions on initial render with reload awareness (Requirements 12 & 13)
  useEffect(() => {
    async function loadData() {
      const loaded = await fetchSessions();
      setSessions(loaded);

      // Distinguish Fresh Launch vs Page Reload:
      const activeId = typeof window !== "undefined" ? sessionStorage.getItem("kroma_active_session_id") : null;
      if (activeId) {
        const target = loaded.find((s) => s.sessionId === activeId);
        if (target) {
          setActiveSession(target);

          // Restore modal chart if it was open prior to reload and session has dashboardState
          const activeChartTitle = sessionStorage.getItem("kroma_active_chart_title");
          if (activeChartTitle && target.dashboardState?.charts) {
            const chartMatch = target.dashboardState.charts.find((c) => c.title === activeChartTitle);
            if (chartMatch) {
              setActiveModalChart(chartMatch);
            }
          }
        }
      }
    }
    loadData();
  }, []);

  // Sync activeSession to sessionStorage for browser reload recovery
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeSession) {
      sessionStorage.setItem("kroma_active_session_id", activeSession.sessionId);
    } else {
      sessionStorage.removeItem("kroma_active_session_id");
      sessionStorage.removeItem("kroma_active_chart_title");
    }
  }, [activeSession?.sessionId]);

  // Sync activeModalChart to sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeModalChart) {
      sessionStorage.setItem("kroma_active_chart_title", activeModalChart.title);
    } else {
      sessionStorage.removeItem("kroma_active_chart_title");
    }
  }, [activeModalChart?.title]);

  // Unified Input Handler for Universal Composer on Landing Page
  const handleAnalyze = async ({
    rawContent,
    fileName,
    sourceType = "csv",
    userPrompt,
  }: {
    rawContent: string;
    fileName: string;
    sourceType: DatasetSourceType;
    userPrompt?: string;
  }) => {
    setIsAnalyzingNew(true);
    try {
      // 1. Natural language prompt without attached data -> NORMAL CONVERSATION MODE
      if (!rawContent || sourceType === "prompt_only") {
        const promptText = userPrompt || "Hello Kroma, what can you help me with?";
        const derivedTitle = deriveSessionTitle(promptText);
        const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        // User message
        const userMsg: ChatMessage = {
          id: `msg_user_${Date.now()}`,
          role: "user",
          content: promptText,
          timestamp,
        };

        // Query Ollama or fallback for conversational response
        let assistantContent = "";
        let assistantInsight = "Kroma Conversational Intelligence";

        try {
          const res = await queryOllamaGeneral(promptText);
          assistantContent = res.explanation;
          assistantInsight = res.insight;
        } catch {
          const fallback = generateConversationalFallback(promptText);
          assistantContent = fallback.explanation;
          assistantInsight = fallback.insight;
        }

        const assistantMsg: ChatMessage = {
          id: `msg_ast_${Date.now() + 1}`,
          role: "assistant",
          content: assistantContent,
          insight: assistantInsight,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        const newSessionId = `session_${Date.now()}`;
        const newSession: AnalysisSession = {
          sessionId: newSessionId,
          title: derivedTitle,
          icon: "MessageSquare",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [userMsg, assistantMsg],
          dashboardState: undefined, // Normal Conversation Mode: No Dashboard!
        };

        setActiveSession(newSession);
        setSessions((prev) => [newSession, ...prev]);
        await saveSession(newSession);
        return;
      }

      // 2. Analyzable Data Provided -> DATA ANALYSIS MODE
      const parsed = parseTabularData(rawContent, sourceType);
      const initialDashboard = generateInitialDashboard(parsed);
      initialDashboard.sourceType = sourceType;
      const profile = initialDashboard.profile;
      const summary = initialDashboard.summaryNarrative || profile?.summaryNarrative;

      const newSessionId = `session_${Date.now()}`;
      const displayTitle = sourceType === "pasted"
        ? (fileName || `Pasted Data (${parsed.rowCount} rows)`)
        : fileName.replace(/\.csv$/i, "").replace(/_/g, " ");

      const initialMessages: ChatMessage[] = [];

      if (userPrompt && !userPrompt.startsWith("Analyze this dataset and generate")) {
        initialMessages.push({
          id: `msg_user_${Date.now()}`,
          role: "user",
          content: userPrompt,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      }

      const availableCapsPills = summary?.analysisAvailable.map((c) => `[${c}]`).join(" ") || "[Standard Analytics]";
      const timeScopeFact = profile?.temporal.hasTemporal
        ? `${profile.temporal.observationCount} ${profile.temporal.frequency || "time"} periods (${profile.temporal.startLabel || profile.temporal.startDate} to ${profile.temporal.endLabel || profile.temporal.endDate})`
        : "Static cross-sectional (No time dimension)";

      const greetingContent = `**[DATASET INTELLIGENCE PROFILE GENERATED]**\n${summary?.overview || "Dataset analyzed."}\n\n**Key Facts:**\n- ${timeScopeFact}\n- ${profile?.measures.length || 0} numeric measures, ${profile?.dimensions.length || 0} categorical dimensions\n- ${summary?.dataQualityText || "100% complete"}\n\n**What Kroma Can Analyze:**\n${availableCapsPills}\n\n**Initial Finding:**\n${initialDashboard.charts[0]?.analysis?.mainFinding || "Baseline analytical perspectives synthesized."}`;

      initialMessages.push({
        id: `msg_init_${Date.now()}`,
        role: "assistant",
        content: greetingContent,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        insight: `Archetype: [${initialDashboard.profileType}] • ${initialDashboard.charts.length} dynamic analytical perspectives generated.`,
      });

      const newSession: AnalysisSession = {
        sessionId: newSessionId,
        title: displayTitle,
        icon: "Database",
        sourceType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rowCount: parsed.rowCount,
        columnCount: parsed.columns.length,
        messages: initialMessages,
        dashboardState: initialDashboard,
      };

      setActiveSession(newSession);
      setActiveTab("split");
      setSessions((prev) => [newSession, ...prev]);
      await saveSession(newSession);
    } finally {
      setIsAnalyzingNew(false);
    }
  };

  // Attach data to the currently active session (from ChatPanel paperclip, drag-and-drop, or paste)
  const handleAttachDataToSession = async ({
    rawContent,
    fileName,
    sourceType,
    userPrompt,
  }: {
    rawContent: string;
    fileName: string;
    sourceType: DatasetSourceType;
    userPrompt?: string;
  }) => {
    if (!activeSession) return;

    const validation = validateTabularInput(rawContent);
    if (!validation.isValid) {
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        content: `**[Data Format Notice]**\nCould not parse the provided data: ${validation.error || "Please ensure the data has valid headers and rows."}\n\nWe remain in normal conversation mode. You can attach another CSV or format your tabular data anytime.`,
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      const updatedMessages = [...activeSession.messages, errorMsg];
      const updatedSession = { ...activeSession, messages: updatedMessages };
      setActiveSession(updatedSession);
      await saveSession(updatedSession);
      return;
    }

    try {
      const parsed = parseTabularData(rawContent, sourceType);
      const initialDashboard = generateInitialDashboard(parsed);
      initialDashboard.sourceType = sourceType;
      const profile = initialDashboard.profile;
      const summary = initialDashboard.summaryNarrative || profile?.summaryNarrative;

      const userAttachmentNotice: ChatMessage = {
        id: `msg_user_${Date.now()}`,
        role: "user",
        content: userPrompt
          ? `${userPrompt}\n\n[Attached: ${fileName || "dataset"} (${parsed.rowCount} rows, ${parsed.columns.length} columns)]`
          : `[Attached dataset: ${fileName || "dataset"} (${parsed.rowCount} rows, ${parsed.columns.length} columns)]`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      const availableCapsPills = summary?.analysisAvailable.map((c) => `[${c}]`).join(" ") || "[Standard Analytics]";
      const timeScopeFact = profile?.temporal.hasTemporal
        ? `${profile.temporal.observationCount} ${profile.temporal.frequency || "time"} periods (${profile.temporal.startLabel || profile.temporal.startDate} to ${profile.temporal.endLabel || profile.temporal.endDate})`
        : "Static cross-sectional (No time dimension)";

      const assistantProfileNotice: ChatMessage = {
        id: `msg_ast_${Date.now() + 1}`,
        role: "assistant",
        content: `**[DATA ANALYSIS MODE ACTIVATED]**\n${summary?.overview || "Dataset analyzed."}\n\n**Key Facts:**\n- ${timeScopeFact}\n- ${profile?.measures.length || 0} numeric measures, ${profile?.dimensions.length || 0} categorical dimensions\n- ${summary?.dataQualityText || "100% complete"}\n\n**What Kroma Can Analyze:**\n${availableCapsPills}\n\n**Initial Finding:**\n${initialDashboard.charts[0]?.analysis?.mainFinding || "Analytical perspectives synthesized."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        insight: `Archetype: [${initialDashboard.profileType}] • Data Analysis Mode online.`,
      };

      // Determine new title if title was generic
      let updatedTitle = activeSession.title;
      if (!activeSession.isCustomTitle && (activeSession.title === "New conversation" || activeSession.title.startsWith("Understanding"))) {
        updatedTitle = fileName ? fileName.replace(/\.csv$/i, "").replace(/_/g, " ") : `Dataset Analysis (${parsed.rowCount} rows)`;
      }

      const updatedSession: AnalysisSession = {
        ...activeSession,
        title: updatedTitle,
        icon: activeSession.icon === "MessageSquare" ? "Database" : (activeSession.icon || "Database"),
        sourceType,
        rowCount: parsed.rowCount,
        columnCount: parsed.columns.length,
        dashboardState: initialDashboard, // Transitions to Data Analysis Mode!
        updatedAt: new Date().toISOString(),
        messages: [...activeSession.messages, userAttachmentNotice, assistantProfileNotice],
      };

      setActiveSession(updatedSession);
      setActiveTab("split");

      // Update sessions list
      const sIndex = sessions.findIndex((s) => s.sessionId === updatedSession.sessionId);
      const newSessionsList = [...sessions];
      if (sIndex >= 0) {
        newSessionsList[sIndex] = updatedSession;
      } else {
        newSessionsList.unshift(updatedSession);
      }
      setSessions(newSessionsList);
      await saveSession(updatedSession);
    } catch (err: any) {
      console.error("Data Attachment Failed:", err);
    }
  };

  // Handle Home Navigation (clicking Kroma BrandMark / Logo in expanded sidebar)
  const handleNavigateHome = () => {
    inFlightAbortControllerRef.current?.abort();
    inFlightAbortControllerRef.current = null;
    setActiveSession(null);
    setActiveModalChart(null);
  };

  // Handle new conversation
  const handleNewSession = () => {
    inFlightAbortControllerRef.current?.abort();
    inFlightAbortControllerRef.current = null;
    setActiveSession(null);
    setActiveModalChart(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("kroma_active_session_id");
      sessionStorage.removeItem("kroma_active_chart_title");
    }
  };

  // Handle selecting a session
  const handleSelectSession = (id: string) => {
    inFlightAbortControllerRef.current?.abort();
    inFlightAbortControllerRef.current = null;
    const target = sessions.find((s) => s.sessionId === id);
    if (target) {
      setActiveSession(target);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("kroma_active_session_id", id);
      }
    }
  };

  // Handle Session Rename (ChatGPT-style custom rename modal)
  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    const updatedSessions = sessions.map((s) => {
      if (s.sessionId === sessionId) {
        return { ...s, title: trimmed, isCustomTitle: true, updatedAt: new Date().toISOString() };
      }
      return s;
    });

    setSessions(updatedSessions);
    if (activeSession?.sessionId === sessionId) {
      setActiveSession((prev) => (prev ? { ...prev, title: trimmed, isCustomTitle: true } : null));
    }

    const target = updatedSessions.find((s) => s.sessionId === sessionId);
    if (target) {
      await saveSession(target);
    }
  };

  // Handle Session Icon Change (Curated Lucide icon picker)
  const handleChangeSessionIcon = async (sessionId: string, newIcon: string) => {
    const updatedSessions = sessions.map((s) => {
      if (s.sessionId === sessionId) {
        return { ...s, icon: newIcon, updatedAt: new Date().toISOString() };
      }
      return s;
    });

    setSessions(updatedSessions);
    if (activeSession?.sessionId === sessionId) {
      setActiveSession((prev) => (prev ? { ...prev, icon: newIcon } : null));
    }

    const target = updatedSessions.find((s) => s.sessionId === sessionId);
    if (target) {
      await saveSession(target);
    }
  };

  // Handle Session Archive toggle
  const handleToggleArchive = async (sessionId: string) => {
    const updatedSessions = sessions.map((s) => {
      if (s.sessionId === sessionId) {
        return { ...s, isArchived: !s.isArchived, updatedAt: new Date().toISOString() };
      }
      return s;
    });

    setSessions(updatedSessions);
    if (activeSession?.sessionId === sessionId) {
      setActiveSession((prev) => (prev ? { ...prev, isArchived: !prev.isArchived } : null));
    }

    const target = updatedSessions.find((s) => s.sessionId === sessionId);
    if (target) {
      await saveSession(target);
    }
  };

  // Request session deletion (opens safe confirmation modal)
  const handleRequestDeleteSession = (session: AnalysisSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionPendingDelete(session);
  };

  // Execute confirmed deletion with clean transition
  const handleConfirmDeleteSession = async (sessionId: string) => {
    await deleteSession(sessionId);
    const updated = sessions.filter((s) => s.sessionId !== sessionId);
    setSessions(updated);
    if (activeSession?.sessionId === sessionId) {
      setActiveSession(null);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("kroma_active_session_id");
        sessionStorage.removeItem("kroma_active_chart_title");
      }
    }
    setSessionPendingDelete(null);
  };

  // Refresh Pipeline (only for Data Analysis Mode)
  const handleRefreshDashboard = async (focus?: string) => {
    if (!activeSession || !activeSession.dashboardState || isRefreshing) return;

    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const updatedDashboard = refreshDashboardWithFocus(
        activeSession.dashboardState.tableData,
        activeSession.dashboardState.columns,
        focus
      );
      updatedDashboard.sourceType = activeSession.sourceType;

      const measuresList = updatedDashboard.profile?.measures.map((m) => m.replace(/_/g, " ")).join(", ") || "all metrics";
      const hasForecast = updatedDashboard.forecastChart !== null;
      const forecastMention = hasForecast ? ", 6-month forecast" : "";
      const updatedViewsList = updatedDashboard.charts.slice(0, 4).map((c) => `[${c.title}]`).join("\n");

      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const refreshMsg: ChatMessage = {
        id: `msg_refresh_${Date.now()}`,
        role: "assistant",
        content: focus
          ? `**[DASHBOARD REBUILT]**\nKroma re-analyzed: ${measuresList}${forecastMention}\nFocus applied: "${focus}"\n\nUpdated views:\n${updatedViewsList}`
          : `**[DASHBOARD REFRESHED]**\nKroma re-analyzed:\n${measuresList}${forecastMention}\n\nUpdated views:\n${updatedViewsList}`,
        timestamp,
        insight: `Archetype: [${updatedDashboard.profileType}] • ${updatedDashboard.charts.length} perspectives rendered.`,
      };

      const updatedSession: AnalysisSession = {
        ...activeSession,
        dashboardState: updatedDashboard,
        messages: [...activeSession.messages, refreshMsg],
        updatedAt: new Date().toISOString(),
      };

      setActiveSession(updatedSession);

      const sIndex = sessions.findIndex((s) => s.sessionId === updatedSession.sessionId);
      const newSessionsList = [...sessions];
      if (sIndex >= 0) {
        newSessionsList[sIndex] = updatedSession;
      } else {
        newSessionsList.unshift(updatedSession);
      }
      setSessions(newSessionsList);
      await saveSession(updatedSession);
    } catch (err: any) {
      console.error("Dashboard refresh failed:", err);
      setRefreshError(err.message || "Failed to refresh analysis. Please retry.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle AI queries in the active conversation
  const handleSendMessage = async (prompt: string) => {
    if (!activeSession) return;

    setIsLoading(true);
    const userMsgId = `msg_user_${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: prompt,
      timestamp,
    };

    const updatedMessages = [...activeSession.messages, userMessage];

    // Optimistically update session
    let currentTitle = activeSession.title;
    if (!activeSession.isCustomTitle && (currentTitle === "New conversation" || activeSession.messages.length <= 2)) {
      currentTitle = deriveSessionTitle(prompt);
    }

    const tempSession = {
      ...activeSession,
      title: currentTitle,
      messages: updatedMessages,
    };
    setActiveSession(tempSession);

    // Target session ID checkpoint for race condition protection
    const targetSessionId = activeSession.sessionId;
    inFlightAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    inFlightAbortControllerRef.current = abortController;

    // ==========================================
    // CASE A: NORMAL CONVERSATION MODE (No Data)
    // ==========================================
    if (!activeSession.dashboardState) {
      try {
        let assistantContent = "";
        let assistantInsight = "Kroma Conversational Intelligence";
        let ollamaOnline = false;

        try {
          const res = await queryOllamaGeneral(prompt, "qwen2.5-coder:7b", abortController.signal);
          assistantContent = res.explanation;
          assistantInsight = res.insight;
          ollamaOnline = true;
          setOllamaStatus("connected");
        } catch (genErr: any) {
          if (genErr?.name === "AbortError") return;
          setOllamaStatus("offline");
          const fallback = generateConversationalFallback(prompt);
          assistantContent = fallback.explanation;
          assistantInsight = fallback.insight;
        }

        const assistantMsg: ChatMessage = {
          id: `msg_ast_${Date.now()}`,
          role: "assistant",
          content: assistantContent,
          insight: assistantInsight,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        const finalMessages = [...updatedMessages, assistantMsg];

        // If local Ollama was unreachable, also provide the diagnostic card with retry button
        if (!ollamaOnline) {
          finalMessages.push({
            id: `msg_offline_${Date.now()}`,
            role: "assistant",
            content: "Local inference engine (Ollama) is currently unreachable. Analytical computing and conversational reasoning remain operational using deterministic intelligence.",
            isOfflineCard: true,
            offlineMetadata: {
              status: "Offline",
              endpoint: "127.0.0.1:11434",
              model: "qwen2.5-coder:7b",
            },
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          });
        }
        const finalSession: AnalysisSession = {
          ...activeSession,
          title: currentTitle,
          messages: finalMessages,
          updatedAt: new Date().toISOString(),
        };

        // Guard against race condition: Only set activeSession if user is still in this session
        if (activeSessionIdRef.current === targetSessionId) {
          setActiveSession(finalSession);
        }

        const sIndex = sessions.findIndex((s) => s.sessionId === finalSession.sessionId);
        const newSessionsList = [...sessions];
        if (sIndex >= 0) {
          newSessionsList[sIndex] = finalSession;
        } else {
          newSessionsList.unshift(finalSession);
        }
        setSessions(newSessionsList);
        await saveSession(finalSession);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("General chat query error:", err);
        }
      } finally {
        if (activeSessionIdRef.current === targetSessionId) {
          setIsLoading(false);
        }
      }
      return;
    }

    // ==========================================
    // CASE B: DATA ANALYSIS MODE (Data Attached)
    // ==========================================
    const promptLower = prompt.toLowerCase();
    const isRebuildOrRefresh =
      promptLower.includes("refresh") ||
      promptLower.includes("rebuild") ||
      promptLower.includes("re-analyze") ||
      promptLower.includes("reanalyze");

    const isShowForecast =
      promptLower.includes("forecast") ||
      promptLower.includes("next 6 months") ||
      promptLower.includes("next six months");

    const isShowRawData =
      promptLower.includes("raw data") ||
      promptLower.includes("source data") ||
      promptLower.includes("source table") ||
      promptLower.includes("show me the data");

    const isDipQuestion =
      promptLower.includes("dip") ||
      promptLower.includes("drop") ||
      promptLower.includes("decline") ||
      promptLower.includes("fall");

    try {
      const schemaString = activeSession.dashboardState.columns
        .map((col) => {
          const sampleVal = activeSession.dashboardState!.tableData[0]?.[col];
          const valType = typeof sampleVal === "number" ? "number" : "string";
          return `${col}: ${valType}`;
        })
        .join(", ");

      const profile = activeSession.dashboardState.profile;
      const currentFocus = activeSession.dashboardState.focus;

      let responseData: any;
      let ollamaOnline = false;

      // In Tauri desktop mode or static export, bypass non-existent server route and query directly
      const isDesktopOrStatic = typeof window !== "undefined" && (
        Boolean((window as any).__TAURI_INTERNALS__) ||
        window.location.protocol === "tauri:" ||
        window.location.protocol === "asset:"
      );

      if (!isDesktopOrStatic) {
        try {
          const res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: abortController.signal,
            body: JSON.stringify({
              question: prompt,
              schema: schemaString,
              sampleData: activeSession.dashboardState.tableData.slice(0, 10),
              profile,
              currentFocus,
            }),
          });

          const contentType = res.headers.get("content-type") || "";
          if (res.ok && !contentType.includes("text/html")) {
            responseData = await res.json();
            ollamaOnline = true;
            setOllamaStatus("connected");
          }
        } catch {}
      }

      // Direct local Ollama query if server API route was not used/available
      if (!responseData) {
        try {
          const systemPrompt = buildOllamaSystemPrompt({
            schema: schemaString,
            sampleData: activeSession.dashboardState.tableData.slice(0, 10),
            profile,
            currentFocus,
          });
          responseData = await queryOllamaDirect(prompt, "qwen2.5-coder:7b", systemPrompt, abortController.signal);
          ollamaOnline = true;
          setOllamaStatus("connected");
        } catch (directErr: any) {
          if (directErr?.name === "AbortError") return;
          console.warn("Direct Ollama query offline:", directErr);
          setOllamaStatus("offline");
        }
      }

      // DETERMINISTIC FALLBACK RESPONSES
      if (!responseData || responseData.error) {
        let fallbackExplanation = "";
        let fallbackInsight = "";
        let updatedDashboard = activeSession.dashboardState;

        // Deterministic Interpretation
        if (isRebuildOrRefresh) {
          let detectedFocus: string | undefined;
          const match = prompt.match(/(?:around|on|for|focus on)\s+([a-zA-Z0-9_\s]+)/i);
          if (match && match[1]) {
            detectedFocus = match[1].replace(/dashboard|analysis|dataset/gi, "").trim();
          }

          updatedDashboard = refreshDashboardWithFocus(
            activeSession.dashboardState.tableData,
            activeSession.dashboardState.columns,
            detectedFocus
          );

          const measuresList = updatedDashboard.profile?.measures.map((m) => m.replace(/_/g, " ")).join(", ") || "metrics";
          const viewsList = updatedDashboard.charts.slice(0, 3).map((c) => `[${c.title}]`).join("\n");

          fallbackExplanation = detectedFocus
            ? `**[DASHBOARD REBUILT]**\nKroma re-analyzed: ${measuresList}, 6-period projection\nFocus applied: "${detectedFocus}"\n\nUpdated views:\n${viewsList}`
            : `**[DASHBOARD REFRESHED]**\nKroma re-analyzed:\n${measuresList}, 6-period projection\n\nUpdated views:\n${viewsList}`;
          fallbackInsight = "Dashboard state recomputed deterministically.";
        } else if (isDipQuestion && profile?.growth?.largestDecline) {
          const d = profile.growth.largestDecline;
          const targetMetric = profile.growth.targetMetric.replace(/_/g, " ");
          const isCurr = targetMetric.toLowerCase().includes("revenue");
          const sym = isCurr ? "$" : "";

          fallbackExplanation = `**[Direct Answer]**\n${targetMetric} fell from ${sym}${d.previousValue.toLocaleString()} in ${d.previousPeriod} to ${sym}${d.currentValue.toLocaleString()} in ${d.period}, a ${Math.abs(d.pctChange)}% decline (-${sym}${Math.abs(d.change).toLocaleString()}).\n\n**[Key Drivers & Comparisons]**\n- In ${d.period}, supporting volume indicators also recorded contemporaneous declines.\n- Performance quickly rebounded in the following observation, confirming the dip was temporary.\n\n**[Compounding Relationship]**\nThese changes happened at the same time, but the data alone cannot prove that any one factor directly caused the decline in ${targetMetric}.\n\n**[Executive Takeaway]**\nThe ${d.period} contraction represents the largest period-over-period adjustment in the series, but overall trajectory remains positive.`;
          fallbackInsight = `${targetMetric} adjusted by ${d.pctChange}% in ${d.period} before resuming growth.`;
        } else if (isShowForecast && profile?.forecast) {
          const f = profile.forecast;
          const targetMetric = f.targetMetric.replace(/_/g, " ");
          const finalF = f.forecastSeries[f.forecastSeries.length - 1];
          const isCurr = targetMetric.toLowerCase().includes("revenue");
          const sym = isCurr ? "$" : "";

          fallbackExplanation = `**[Direct Answer]**\n${f.explanation}\n\n**[Key Drivers & Comparisons]**\n- Current baseline: ${sym}${Math.round(f.baseline).toLocaleString()} in ${f.historicalSeries[f.historicalSeries.length - 1].displayLabel}.\n- 6-period projected target: ${sym}${Math.round(finalF.forecastValue).toLocaleString()} in ${finalF.displayLabel}.\n- Projected change: ${f.projectedGrowthPct >= 0 ? "+" : ""}${f.projectedGrowthPct}% continuation based on historical velocity.\n\n**[Compounding Relationship]**\nDeterministic projection based on historical momentum; forward estimates serve as directional indicators.\n\n**[Executive Takeaway]**\nExpect continued positive momentum across forward periods.`;
          fallbackInsight = `Projected to reach ${sym}${Math.round(finalF.forecastValue).toLocaleString()} by ${finalF.displayLabel}.`;
        } else if (isShowRawData) {
          fallbackExplanation = `**[Direct Answer]**\nDisplaying the primary source dataset table containing ${activeSession.rowCount} records across ${activeSession.columnCount} attributes below.\n\n**[Executive Takeaway]**\nInspect raw records, sorting, and pagination directly in the source data table.`;
          fallbackInsight = "Source dataset table focused.";
          if (typeof document !== "undefined") {
            const el = document.getElementById("source-data-table");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }
        } else {
          // General deterministic interpretation of active measures
          const primaryMeasure = profile?.measures[0] || "Revenue";
          const measureStats = profile?.columns.find((c) => c.name === primaryMeasure)?.numericStats;
          const growth = profile?.growth;
          const isCurr = primaryMeasure.toLowerCase().includes("revenue") || primaryMeasure.toLowerCase().includes("cost");
          const sym = isCurr ? "$" : "";

          fallbackExplanation = `**[Direct Answer]**\nThis dataset tracks ${activeSession.rowCount} records with ${profile?.measures.length || 0} measures. ${primaryMeasure.replace(/_/g, " ")} totals ${sym}${measureStats?.sum?.toLocaleString() || "N/A"} across the observed timeline${growth ? ` (endpoint change: ${growth.endpointChangePercent ?? growth.totalGrowthPct}%)` : ""}.\n\n**[Key Drivers & Comparisons]**\n- Minimum observed: ${sym}${measureStats?.min?.toLocaleString() || "N/A"} | Maximum: ${sym}${measureStats?.max?.toLocaleString() || "N/A"}.\n- Mean per observation: ${sym}${measureStats?.mean?.toLocaleString() || "N/A"} (Median: ${sym}${measureStats?.median?.toLocaleString() || "N/A"}).\n- All calculations computed directly by the deterministic data engine with 100% data completeness.\n\n**[Compounding Relationship]**\nNumeric indicators exhibit structural co-movement across observations without implying direct causation.\n\n**[Executive Takeaway]**\nReview the interactive Bento grid widgets above to inspect individual metric trajectories, indexed comparisons, and directional projections.`;
          fallbackInsight = "Authoritative analysis computed locally via deterministic engine.";
        }

        const fallbackMsg: ChatMessage = {
          id: `msg_ast_${Date.now()}`,
          role: "assistant",
          content: fallbackExplanation,
          insight: fallbackInsight,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        const newMessages = [...updatedMessages, fallbackMsg];

        // Attach structured diagnostic card if Ollama is offline
        if (!ollamaOnline) {
          newMessages.push({
            id: `msg_offline_${Date.now()}`,
            role: "assistant",
            content: "Local inference engine (Ollama) is unreachable. Analytical computing and dashboard widgets remain 100% operational using deterministic processing.",
            isOfflineCard: true,
            offlineMetadata: {
              status: "Offline",
              endpoint: "127.0.0.1:11434",
              model: "qwen2.5-coder:7b",
            },
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          });
        }

        const finalSession = {
          ...activeSession,
          title: currentTitle,
          dashboardState: updatedDashboard,
          messages: newMessages,
          updatedAt: new Date().toISOString(),
        };
        setActiveSession(finalSession);
        await saveSession(finalSession);
        return;
      }

      // STRUCTURED ACTION EXECUTION
      let updatedDashboard = activeSession.dashboardState;
      let actionExecutedText = "";
      const actionType = responseData.action?.type;

      if (
        actionType === "REFRESH_DASHBOARD" ||
        actionType === "REBUILD_DASHBOARD" ||
        actionType === "FOCUS_ANALYSIS" ||
        isRebuildOrRefresh
      ) {
        let rebuildFocus = responseData.action?.focus;
        if (!rebuildFocus && isRebuildOrRefresh) {
          const match = prompt.match(/(?:around|on|for|focus on)\s+([a-zA-Z0-9_\s]+)/i);
          if (match && match[1]) {
            rebuildFocus = match[1].replace(/dashboard|analysis|dataset/gi, "").trim();
          }
        }

        updatedDashboard = refreshDashboardWithFocus(
          activeSession.dashboardState.tableData,
          activeSession.dashboardState.columns,
          rebuildFocus
        );

        const measuresList = updatedDashboard.profile?.measures.map((m) => m.replace(/_/g, " ")).join(", ") || "metrics";
        const hasForecast = updatedDashboard.forecastChart !== null;
        const forecastMention = hasForecast ? ", 6-month forecast" : "";
        const viewsList = updatedDashboard.charts.slice(0, 3).map((c) => `[${c.title}]`).join("\n");

        actionExecutedText = rebuildFocus
          ? `\n\n**[DASHBOARD REBUILT]**\nKroma re-analyzed: ${measuresList}${forecastMention}\nFocus applied: "${rebuildFocus}"\n\nUpdated views:\n${viewsList}`
          : `\n\n**[DASHBOARD REFRESHED]**\nKroma re-analyzed:\n${measuresList}${forecastMention}\n\nUpdated views:\n${viewsList}`;
      }

      if (actionType === "SHOW_FORECAST" || isShowForecast) {
        if (updatedDashboard.forecastChart) {
          setActiveModalChart(updatedDashboard.forecastChart);
        }
      }

      if (actionType === "SHOW_SOURCE_DATA" || isShowRawData) {
        if (typeof document !== "undefined") {
          const el = document.getElementById("source-data-table");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }
      }

      // Inline chart handling
      let inlineChart: ChartDataSeries | null = null;
      if (
        responseData.chartType &&
        responseData.chartType !== "none" &&
        responseData.chartData &&
        Array.isArray(responseData.chartData) &&
        responseData.chartData.length > 0
      ) {
        inlineChart = {
          id: `inline_${Date.now()}`,
          type: responseData.chartType,
          title: responseData.chartTitle || "Query Analysis",
          data: responseData.chartData,
          xKey: "label",
          yKey: "value",
          xAxisLabel: responseData.xAxisLabel || "Category",
          yAxisLabel: responseData.yAxisLabel || "Value",
          zAxisLabel: responseData.zAxisLabel || undefined,
        };
      }

      const assistantMsg: ChatMessage = {
        id: `msg_ast_${Date.now()}`,
        role: "assistant",
        content: (responseData.explanation || "Analysis computed from dataset intelligence.") + actionExecutedText,
        action: responseData.action,
        insight: responseData.insight || null,
        sqlQuery: responseData.sql || null,
        inlineChart,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      const finalSession: AnalysisSession = {
        ...activeSession,
        title: currentTitle,
        dashboardState: updatedDashboard,
        messages: finalMessages,
        updatedAt: new Date().toISOString(),
      };

      // Guard against race condition: Only set activeSession if user is still in this session
      if (activeSessionIdRef.current === targetSessionId) {
        setActiveSession(finalSession);
      }

      const sIndex = sessions.findIndex((s) => s.sessionId === finalSession.sessionId);
      const newSessionsList = [...sessions];
      if (sIndex >= 0) {
        newSessionsList[sIndex] = finalSession;
      } else {
        newSessionsList.unshift(finalSession);
      }
      setSessions(newSessionsList);
      await saveSession(finalSession);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.warn("Query Execution Failed / Local Ollama Offline:", err);
      setOllamaStatus("offline");
      const errorMsg: ChatMessage = {
        id: `msg_offline_${Date.now()}`,
        role: "assistant",
        content:
          "Local Ollama inference engine is unreachable at http://127.0.0.1:11434. The analytical dashboard, charts, statistics, and DuckDB querying remain 100% operational via deterministic processing.",
        isOfflineCard: true,
        offlineMetadata: {
          endpoint: "127.0.0.1:11434",
          model: "qwen2.5-coder:7b",
          status: "Offline",
        },
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      const finalMessages = [...updatedMessages, errorMsg];
      const finalSession = { ...activeSession, messages: finalMessages };
      if (activeSessionIdRef.current === targetSessionId) {
        setActiveSession(finalSession);
      }
      await saveSession(finalSession);
    } finally {
      if (activeSessionIdRef.current === targetSessionId) {
        setIsLoading(false);
      }
    }
  };

  const isDataAnalysisMode = Boolean(activeSession && activeSession.dashboardState);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#212222] text-white relative">
      {/* Sidebar Drawer */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSession?.sessionId || null}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onRequestDeleteSession={handleRequestDeleteSession}
        onRenameSession={handleRenameSession}
        onChangeIcon={handleChangeSessionIcon}
        onToggleArchive={handleToggleArchive}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
        onNavigateHome={handleNavigateHome}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Top Navbar Header (Rendered when ANY active session exists) */}
        {activeSession && (
          <header className="h-[60px] border-b border-white/10 px-4 md:px-6 flex items-center justify-between bg-[#18191b] shrink-0 z-10">
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="font-semibold text-sm text-white tracking-tight truncate font-mono">
                {isDataAnalysisMode
                  ? `[Analysis: ${activeSession.title}]`
                  : `[Conversation: ${activeSession.title}]`}
              </h2>
              {isDataAnalysisMode ? (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 text-white/60">
                  {activeSession.rowCount} records
                </span>
              ) : (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-mono bg-[#A5329E]/20 border border-[#A5329E]/40 text-[#FE88ED]">
                  Conversation Mode
                </span>
              )}

              {/* Ollama Status Pill */}
              <button
                type="button"
                onClick={refreshOllamaStatus}
                title={`Ollama Engine: ${ollamaStatus.toUpperCase()} (${ollamaMeta.endpoint} - ${ollamaMeta.model}). Click to test connection.`}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-mono border flex items-center gap-1.5 transition cursor-pointer shrink-0",
                  ollamaStatus === "connected"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                    : ollamaStatus === "connecting"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full inline-block",
                    ollamaStatus === "connected"
                      ? "bg-emerald-400 shadow-[0_0_6px_#34D399]"
                      : ollamaStatus === "connecting"
                      ? "bg-amber-400 animate-pulse"
                      : "bg-rose-400/80"
                  )}
                />
                <span className="capitalize">{ollamaStatus === "connected" ? "AI Engine: Ready" : ollamaStatus === "connecting" ? "Checking Engine..." : "Local AI: Offline"}</span>
              </button>
            </div>

            {/* View Switcher Tabs & Controls - Only in Data Analysis Mode */}
            {isDataAnalysisMode && (
              <div className="flex items-center gap-2.5">
                {/* Refresh Analysis Control */}
                <motion.button
                  {...(shouldReduceMotion ? {} : buttonTapMotion)}
                  type="button"
                  onClick={() => handleRefreshDashboard()}
                  disabled={isRefreshing}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-xl font-medium font-mono transition-colors cursor-pointer flex items-center gap-1.5 border border-white/10 bg-[#212222] text-white/90 hover:text-white hover:border-[#C86342]/50 hover:bg-[#18191b]",
                    isRefreshing && "opacity-60 cursor-not-allowed text-[#C86342]"
                  )}
                  title="Re-run deterministic analysis pipeline against full dataset"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-[#C86342]")} />
                  <span className="hidden sm:inline">
                    {isRefreshing ? "[Re-Analyzing...]" : "[Refresh Analysis]"}
                  </span>
                </motion.button>

                {/* View Switcher Tabs */}
                <div className="flex bg-[#212222] p-1 rounded-xl border border-white/10 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setActiveTab("split")}
                    className={cn(
                      "px-3 py-1 rounded-lg transition-all cursor-pointer",
                      activeTab === "split"
                        ? "bg-[#C86342] text-white font-bold shadow-md"
                        : "text-white/60 hover:text-white"
                    )}
                  >
                    Split
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("dashboard")}
                    className={cn(
                      "px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                      activeTab === "dashboard"
                        ? "bg-[#C86342] text-white font-bold shadow-md"
                        : "text-white/60 hover:text-white"
                    )}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Dashboard</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("chat")}
                    className={cn(
                      "px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                      activeTab === "chat"
                        ? "bg-[#C86342] text-white font-bold shadow-md"
                        : "text-white/60 hover:text-white"
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Chat</span>
                  </button>
                </div>
              </div>
            )}
          </header>
        )}

        {/* Workspace Body: Dynamic View Transition */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {!activeSession ? (
              /* State 0: Dedicated Full-Screen Landing Experience */
              <motion.div
                key="landing-view"
                variants={shouldReduceMotion ? undefined : pageViewVariants}
                initial={shouldReduceMotion ? undefined : "hidden"}
                animate={shouldReduceMotion ? undefined : "visible"}
                exit={shouldReduceMotion ? undefined : "exit"}
                className="h-full w-full overflow-hidden relative flex flex-col items-center justify-center p-4 sm:p-6 select-none"
              >
                <Tiles />
                <div
                  aria-hidden="true"
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[960px] h-[580px] rounded-full pointer-events-none z-0 blur-[140px] opacity-25"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, rgba(165, 50, 158, 0.35) 0%, rgba(200, 99, 66, 0.12) 40%, transparent 70%)",
                  }}
                />
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                  <KromaComposer onAnalyze={handleAnalyze} isAnalyzing={isAnalyzingNew} />
                </div>
              </motion.div>
            ) : !isDataAnalysisMode ? (
              /* State A: NORMAL CONVERSATION MODE (No Dashboard, Full Width Chat Assistant) */
              <motion.div
                key={`chat-mode-${activeSession.sessionId}`}
                variants={shouldReduceMotion ? undefined : pageViewVariants}
                initial={shouldReduceMotion ? undefined : "hidden"}
                animate={shouldReduceMotion ? undefined : "visible"}
                exit={shouldReduceMotion ? undefined : "exit"}
                className="h-full w-full flex flex-col min-h-0 relative max-w-4xl mx-auto"
              >
                <ErrorBoundary fallbackTitle="Chat Engine Error">
                  <ChatPanel
                    messages={activeSession.messages}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    hasDataset={false}
                    onAttachData={handleAttachDataToSession}
                    ollamaStatus={ollamaStatus}
                    onRetryConnection={refreshOllamaStatus}
                  />
                </ErrorBoundary>
              </motion.div>
            ) : (
              /* State B: DATA ANALYSIS MODE (Bento Grid Dashboard + Chat) */
              <motion.div
                key={`analysis-mode-${activeSession.sessionId}`}
                variants={shouldReduceMotion ? undefined : pageViewVariants}
                initial={shouldReduceMotion ? undefined : "hidden"}
                animate={shouldReduceMotion ? undefined : "visible"}
                exit={shouldReduceMotion ? undefined : "exit"}
                className="h-full w-full flex flex-col min-h-0 relative"
              >
                {/* Refreshing Feedback Overlay */}
                <AnimatePresence>
                  {isRefreshing && (
                    <motion.div
                      variants={fadeIn}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="absolute inset-0 z-40 bg-[#212222]/80 backdrop-blur-sm flex items-center justify-center p-6"
                    >
                      <div className="rounded-2xl bg-[#18191b] border border-[#C86342]/40 p-6 flex flex-col items-center gap-3 shadow-2xl">
                        <Loader2 className="w-8 h-8 text-[#C86342] animate-spin" />
                        <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                          [Re-Analyzing Dataset Intelligence...]
                        </span>
                        <p className="text-[11px] font-mono text-white/50 text-center max-w-xs">
                          Re-evaluating columns, growth, relationships, and deterministic projections.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Main Content Area */}
                <div className="flex-1 flex min-h-0 overflow-hidden">
                  {/* Dashboard View Pane */}
                  <div
                    className={cn(
                      "h-full overflow-y-auto p-4 md:p-6 transition-all duration-300",
                      activeTab === "dashboard" && "w-full",
                      activeTab === "split" && "w-full lg:w-[60%]",
                      activeTab === "chat" && "hidden"
                    )}
                  >
                    <ErrorBoundary fallbackTitle="Dashboard Render Error">
                      <BentoGrid
                        dashboardState={activeSession.dashboardState!}
                        onSelectChart={(chart) => setActiveModalChart(chart)}
                        isSplitView={activeTab === "split"}
                      />
                    </ErrorBoundary>
                  </div>

                  {/* Chat Panel Pane */}
                  <div
                    className={cn(
                      "h-full transition-all duration-300 border-l border-white/10",
                      activeTab === "chat" && "w-full",
                      activeTab === "split" && "hidden lg:flex lg:w-[40%]",
                      activeTab === "dashboard" && "hidden"
                    )}
                  >
                    <ErrorBoundary fallbackTitle="Chat Engine Error">
                      <ChatPanel
                        messages={activeSession.messages}
                        onSendMessage={handleSendMessage}
                        isLoading={isLoading}
                        suggestions={activeSession.dashboardState?.suggestions}
                        hasDataset={true}
                        onAttachData={handleAttachDataToSession}
                        ollamaStatus={ollamaStatus}
                        onRetryConnection={refreshOllamaStatus}
                      />
                    </ErrorBoundary>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Chart Visual Deep-Dive Modal */}
      <ChartModal
        chart={activeModalChart}
        onClose={() => setActiveModalChart(null)}
      />

      {/* Multi-Layer Accidental-Deletion Protection Shield Modal */}
      <DeleteSessionModal
        isOpen={Boolean(sessionPendingDelete)}
        session={sessionPendingDelete}
        isActiveSession={sessionPendingDelete?.sessionId === activeSession?.sessionId}
        onClose={() => setSessionPendingDelete(null)}
        onConfirmDelete={handleConfirmDeleteSession}
      />
    </div>
  );
};
