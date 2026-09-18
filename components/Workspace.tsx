"use client";

import React, { useState, useEffect } from "react";
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
  SAMPLE_DATASETS
} from "@/lib/dataEngine";
import { buildOllamaSystemPrompt, queryOllamaDirect } from "@/lib/ollama";
import { Sidebar } from "./Sidebar";
import { BentoGrid } from "./BentoGrid";
import { ChatPanel } from "./ChatPanel";
import { KromaComposer } from "./KromaComposer";
import { ChartModal } from "./ChartModal";
import { DeleteSessionModal } from "./DeleteSessionModal";
import { StaticGrid } from "./ui/StaticGrid";
import { Tiles } from "./ui/Tiles";
import { ErrorBoundary } from "./ErrorBoundary";
import {
  pageViewVariants,
  buttonTapMotion,
  fadeIn,
} from "@/lib/motion";
import { LayoutGrid, MessageSquare, FileText, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

  // Load sessions on initial render with reload awareness (Requirements 12 & 13)
  useEffect(() => {
    async function loadData() {
      const loaded = await fetchSessions();
      setSessions(loaded);

      // Distinguish Fresh Launch vs Page Reload:
      // sessionStorage is tab-scoped: empty on new launch, preserved across reloads
      const activeId = typeof window !== "undefined" ? sessionStorage.getItem("kroma_active_session_id") : null;
      if (activeId) {
        const target = loaded.find((s) => s.sessionId === activeId);
        if (target) {
          setActiveSession(target);

          // Restore modal chart if it was open prior to reload
          const activeChartTitle = sessionStorage.getItem("kroma_active_chart_title");
          if (activeChartTitle) {
            const chartMatch = target.dashboardState.charts.find((c) => c.title === activeChartTitle);
            if (chartMatch) {
              setActiveModalChart(chartMatch);
            }
          }
        }
      }
      // If no activeId in sessionStorage, app cleanly presents Landing Page (activeSession = null)
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

  // Unified Input Handler for Universal Composer (CSV Attachment, Direct Tabular Paste, or Prompt+Data)
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
      // Natural language prompt handling without attached data
      if (!rawContent || sourceType === "prompt_only") {
        const promptText = userPrompt || "Hello Kroma, what can you analyze?";
        let chosenSample: "sales" | "department" | "marketing" = "sales";
        const pLower = promptText.toLowerCase();
        if (pLower.includes("department") || pLower.includes("employee") || pLower.includes("salary") || pLower.includes("hr")) {
          chosenSample = "department";
        } else if (pLower.includes("marketing") || pLower.includes("campaign") || pLower.includes("spend")) {
          chosenSample = "marketing";
        }

        const rawSample = SAMPLE_DATASETS[chosenSample];
        const parsed = parseTabularData(rawSample, "csv");
        const initialDashboard = generateInitialDashboard(parsed);
        initialDashboard.sourceType = "csv";

        const newSessionId = `session_${Date.now()}`;
        const displayTitle = `Analysis Session (${chosenSample.charAt(0).toUpperCase() + chosenSample.slice(1)})`;

        const initialMessages: ChatMessage[] = [
          {
            id: `msg_user_${Date.now()}`,
            role: "user",
            content: promptText,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
          {
            id: `msg_init_${Date.now() + 1}`,
            role: "assistant",
            content: `**[KROMA INTELLIGENCE ENGINE ONLINE]**\n\nHello! I am Kroma, an autonomous, local-first data analyst and executive intelligence platform.\n\n**What Kroma Can Analyze:**\n- **Longitudinal & Time-Series Datasets:** Detects trajectories, growth momentum, anomalies, and computes deterministic 6-month forecasts with 95% confidence bounds.\n- **Cross-Sectional & Departmental Data:** Profiles distributions, metrics, and correlations without fabricating fake time dimensions or categories.\n- **Multi-Category Performance:** Breaks down revenue, volume, and customer segmentation across genuine categories.\n\nTo demonstrate, I have prepared the **${chosenSample.toUpperCase()}** reference dataset (${parsed.rowCount} observations across ${parsed.columns.length} attributes). You can explore the interactive Bento dashboard, ask questions, or attach your own CSV at any time.`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            insight: `Archetype: [${initialDashboard.profileType}] — Ready for conversational exploration.`,
          },
        ];

        const newSession: AnalysisSession = {
          sessionId: newSessionId,
          title: displayTitle,
          sourceType: "csv",
          createdAt: new Date().toISOString(),
          rowCount: parsed.rowCount,
          columnCount: parsed.columns.length,
          messages: initialMessages,
          dashboardState: initialDashboard,
        };

        setActiveSession(newSession);
        setActiveTab("split");
        setSessions((prev) => [newSession, ...prev]);
        await saveSession(newSession);
        return;
      }

      const parsed = parseTabularData(rawContent, sourceType);
      const initialDashboard = generateInitialDashboard(parsed);
      initialDashboard.sourceType = sourceType;
      const profile = initialDashboard.profile;
      const summary = initialDashboard.summaryNarrative || profile?.summaryNarrative;

      const newSessionId = `session_${Date.now()}`;
      const displayTitle = sourceType === "pasted"
        ? (fileName || `pasted_data_${new Date().toISOString().slice(0, 10)}`)
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
        sourceType,
        createdAt: new Date().toISOString(),
        rowCount: parsed.rowCount,
        columnCount: parsed.columns.length,
        messages: initialMessages,
        dashboardState: initialDashboard,
      };

      setActiveSession(newSession);
      const updatedSessions = [newSession, ...sessions];
      setSessions(updatedSessions);
      await saveSession(newSession);
    } finally {
      setIsAnalyzingNew(false);
    }
  };

  // Handle Home Navigation (triggered by clicking BrandMark / Logo in sidebar)
  // Preserves existing analyses in session history so user can freely switch back
  const handleNavigateHome = () => {
    setActiveSession(null);
    setActiveModalChart(null);
  };

  // Handle new analysis (reset view to landing composer)
  const handleNewSession = () => {
    setActiveSession(null);
    setActiveModalChart(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("kroma_active_session_id");
      sessionStorage.removeItem("kroma_active_chart_title");
    }
  };

  // Handle selecting a session
  const handleSelectSession = (id: string) => {
    const target = sessions.find((s) => s.sessionId === id);
    if (target) {
      setActiveSession(target);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("kroma_active_session_id", id);
      }
    }
  };

  // Request session deletion (opens confirmation modal, never deletes directly)
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
      setActiveSession(null); // Clean landing state transition
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("kroma_active_session_id");
        sessionStorage.removeItem("kroma_active_chart_title");
      }
    }
    setSessionPendingDelete(null);
  };

  // Shared Refresh Pipeline (invoked by Dashboard button & Chat actions)
  const handleRefreshDashboard = async (focus?: string) => {
    if (!activeSession || isRefreshing) return;

    setIsRefreshing(true);
    setRefreshError(null);

    try {
      // Re-run the full intelligence pipeline on the full dataset
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
      };

      setActiveSession(updatedSession);

      // Persist updated session
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

  // Handle sending AI query to Kroma pipeline
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

    // Optimistic UI update
    const tempSession = { ...activeSession, messages: updatedMessages };
    setActiveSession(tempSession);

    // Intent detection
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
      // Build schema string
      const schemaString = activeSession.dashboardState.columns
        .map((col) => {
          const sampleVal = activeSession.dashboardState.tableData[0]?.[col];
          const valType = typeof sampleVal === "number" ? "number" : "string";
          return `${col}: ${valType}`;
        })
        .join(", ");

      const profile = activeSession.dashboardState.profile;
      const currentFocus = activeSession.dashboardState.focus;

      let responseData: any;
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: prompt,
            schema: schemaString,
            sampleData: activeSession.dashboardState.tableData.slice(0, 10),
            profile,
            currentFocus,
          }),
        });

        const contentType = res.headers.get("content-type") || "";
        if (!res.ok || contentType.includes("text/html")) {
          throw new Error("Next API route unavailable in static desktop mode");
        }
        responseData = await res.json();
      } catch (apiErr) {
        console.warn("API route fallback (Static Desktop Mode). Querying Ollama directly...", apiErr);
        const systemPrompt = buildOllamaSystemPrompt({
          schema: schemaString,
          sampleData: activeSession.dashboardState.tableData.slice(0, 10),
          profile,
          currentFocus,
        });
        responseData = await queryOllamaDirect(prompt, "qwen2.5-coder:7b", systemPrompt);
      }

      // DETERMINISTIC FALLBACK RESPONSES (If Ollama fails or is offline)
      if (!responseData || responseData.error) {
        let fallbackExplanation = "";
        let fallbackInsight = "";
        let updatedDashboard = activeSession.dashboardState;

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
            ? `**[DASHBOARD REBUILT]**\nKroma re-analyzed: ${measuresList}, 6-month forecast\nFocus applied: "${detectedFocus}"\n\nUpdated views:\n${viewsList}`
            : `**[DASHBOARD REFRESHED]**\nKroma re-analyzed:\n${measuresList}, 6-month forecast\n\nUpdated views:\n${viewsList}`;
          fallbackInsight = "Dashboard state recomputed deterministically.";
        } else if (isDipQuestion && profile?.growth?.largestDecline) {
          const d = profile.growth.largestDecline;
          const targetMetric = profile.growth.targetMetric.replace(/_/g, " ");
          const isCurr = targetMetric.toLowerCase().includes("revenue");
          const sym = isCurr ? "$" : "";

          fallbackExplanation = `**[Direct Answer]**\n${targetMetric} fell from ${sym}${d.previousValue.toLocaleString()} in ${d.previousPeriod} to ${sym}${d.currentValue.toLocaleString()} in ${d.period}, a ${Math.abs(d.pctChange)}% decline (-${sym}${Math.abs(d.change).toLocaleString()}).\n\n**[Key Drivers & Comparisons]**\n- In ${d.period}, supporting volume indicators (orders, customers, marketing spend) also recorded slight contemporaneous declines.\n- Performance quickly rebounded in the following month, confirming the dip was temporary.\n\n**[Compounding Relationship]**\nThese changes happened at the same time, but the data alone cannot prove that any one factor directly caused the decline in ${targetMetric}.\n\n**[Executive Takeaway]**\nThe ${d.period} contraction represents the largest month-over-month adjustment in the series, but top-line growth remained positive overall.`;
          fallbackInsight = `${targetMetric} adjusted by ${d.pctChange}% in ${d.period} before resuming growth.`;
        } else if (isShowForecast && profile?.forecast) {
          const f = profile.forecast;
          const targetMetric = f.targetMetric.replace(/_/g, " ");
          const finalF = f.forecastSeries[f.forecastSeries.length - 1];
          const isCurr = targetMetric.toLowerCase().includes("revenue");
          const sym = isCurr ? "$" : "";

          fallbackExplanation = `**[Direct Answer]**\n${f.explanation}\n\n**[Key Drivers & Comparisons]**\n- Current baseline: ${sym}${Math.round(f.baseline).toLocaleString()} in ${f.historicalSeries[f.historicalSeries.length - 1].displayLabel}.\n- 6-month projected target: ${sym}${Math.round(finalF.forecastValue).toLocaleString()} in ${finalF.displayLabel}.\n- Projected change: ${f.projectedGrowthPct >= 0 ? "+" : ""}${f.projectedGrowthPct}% continuation based on historical velocity.\n\n**[Compounding Relationship]**\nLinear trend estimation with 95% confidence bounds assumes continuous trajectory without unforeseen external shocks.\n\n**[Executive Takeaway]**\nExpect sustained upward momentum across the next 6 periods.`;
          fallbackInsight = `Projected to reach ${sym}${Math.round(finalF.forecastValue).toLocaleString()} by ${finalF.displayLabel}.`;
        } else if (isShowRawData) {
          fallbackExplanation = `**[Direct Answer]**\nDisplaying the primary source dataset table containing ${activeSession.rowCount} records across ${activeSession.columnCount} attributes below.\n\n**[Executive Takeaway]**\nInspect raw records, sorting, and pagination directly in the source data table.`;
          fallbackInsight = "Source dataset table focused.";
          if (typeof document !== "undefined") {
            const el = document.getElementById("source-data-table");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }
        } else {
          fallbackExplanation = `**[Direct Answer]**\nThis dataset contains ${activeSession.rowCount} records and ${activeSession.columnCount} attributes classified as [${activeSession.dashboardState.profileType}].\n\n**[Key Drivers & Comparisons]**\n- Authoritative data engine has parsed all attributes with ${profile?.dataQuality.completenessRate || 100}% completeness.\n- Primary measure: ${profile?.measures[0] || "Value"}.\n\n**[Executive Takeaway]**\nReview the analytical dashboard widgets and visual perspectives above.`;
          fallbackInsight = "Grounded analysis computed locally.";
        }

        const fallbackMsg: ChatMessage = {
          id: `msg_ast_${Date.now()}`,
          role: "assistant",
          content: fallbackExplanation,
          insight: fallbackInsight,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        const finalMessages = [...updatedMessages, fallbackMsg];
        const finalSession = {
          ...activeSession,
          dashboardState: updatedDashboard,
          messages: finalMessages,
        };
        setActiveSession(finalSession);
        await saveSession(finalSession);
        return;
      }

      // EXECUTE STRUCTURED ACTIONS
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

      // Action: SHOW_FORECAST
      if (actionType === "SHOW_FORECAST" || isShowForecast) {
        if (updatedDashboard.forecastChart) {
          setActiveModalChart(updatedDashboard.forecastChart);
        }
      }

      // Action: SHOW_SOURCE_DATA
      if (actionType === "SHOW_SOURCE_DATA" || isShowRawData) {
        if (typeof document !== "undefined") {
          const el = document.getElementById("source-data-table");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }
      }

      // Action: NEW_ANALYSIS
      if (actionType === "NEW_ANALYSIS") {
        handleNewSession();
        return;
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
        dashboardState: updatedDashboard,
        messages: finalMessages,
      };

      setActiveSession(finalSession);

      // Persist
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
      console.error("Query Execution Failed:", err);
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        content:
          "[Error: Unable to connect to local Ollama server at http://127.0.0.1:11434. Please ensure Ollama is running with model 'qwen2.5-coder:7b'].",
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      const finalMessages = [...updatedMessages, errorMsg];
      const finalSession = { ...activeSession, messages: finalMessages };
      setActiveSession(finalSession);
      await saveSession(finalSession);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#212222] text-white relative">
      {/* Sidebar Drawer */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSession?.sessionId || null}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onRequestDeleteSession={handleRequestDeleteSession}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
        onNavigateHome={handleNavigateHome}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Top Navbar Header (Rendered ONLY when active dataset session exists) */}
        {activeSession && (
          <header className="h-[60px] border-b border-white/10 px-4 md:px-6 flex items-center justify-between bg-[#18191b] shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="font-semibold text-sm text-white tracking-tight truncate font-mono">
              {activeSession ? `[Dataset: ${activeSession.title}]` : "[Kroma Autonomous Data Analyst]"}
            </h2>
            {activeSession && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 text-white/60">
                {activeSession.rowCount} records
              </span>
            )}
          </div>

          {activeSession && (
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
              /* State A: Dedicated Full-Screen Landing Experience (100% Non-Scrollable) */
              <motion.div
                key="landing-view"
                variants={shouldReduceMotion ? undefined : pageViewVariants}
                initial={shouldReduceMotion ? undefined : "hidden"}
                animate={shouldReduceMotion ? undefined : "visible"}
                exit={shouldReduceMotion ? undefined : "exit"}
                className="h-full w-full overflow-hidden flex flex-col justify-center items-center relative p-4 select-none"
              >
                {/* 1. Interactive Technical Grid Background (Cells respond smoothly to pointer proximity) */}
                <Tiles />

                {/* 2. Soft Environmental Ambient Glow (No Boxed Edges, Natural Radial Falloff) */}
                <div
                  aria-hidden="true"
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[460px] rounded-full pointer-events-none z-0 blur-[130px] opacity-25"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, rgba(165, 50, 158, 0.35) 0%, rgba(200, 99, 66, 0.12) 40%, transparent 70%)",
                  }}
                />

                {/* 3. Foreground Content */}
                <div className="relative z-10 w-full flex flex-col items-center justify-center">
                  <KromaComposer onAnalyze={handleAnalyze} isAnalyzing={isAnalyzingNew} />
                </div>
              </motion.div>
            ) : (
              /* State B: Active Analysis Workspace with Bento Grid & Chat */
              <motion.div
                key="workspace-view"
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
                        dashboardState={activeSession.dashboardState}
                        onSelectChart={(chart) => setActiveModalChart(chart)}
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
                        suggestions={activeSession.dashboardState.suggestions}
                        
                      />
                    </ErrorBoundary>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Chart Visual Deep-Dive Modal (2-Column Fixed Canvas + Scrollable Narrative) */}
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
