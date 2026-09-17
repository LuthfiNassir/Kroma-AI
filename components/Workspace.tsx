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
  refreshDashboardWithFocus
} from "@/lib/dataEngine";
import { buildOllamaSystemPrompt, queryOllamaDirect } from "@/lib/ollama";
import { Sidebar } from "./Sidebar";
import { BentoGrid } from "./BentoGrid";
import { ChatPanel } from "./ChatPanel";
import { KromaComposer } from "./KromaComposer";
import { ChartModal } from "./ChartModal";
import { StaticGrid } from "./ui/StaticGrid";
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

  // Load sessions on initial render
  useEffect(() => {
    async function loadData() {
      const loaded = await fetchSessions();
      setSessions(loaded);
      if (loaded.length > 0) {
        setActiveSession(loaded[0]);
      }
    }
    loadData();
  }, []);

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
      const parsed = parseTabularData(rawContent, sourceType);
      const initialDashboard = generateInitialDashboard(parsed);
      initialDashboard.sourceType = sourceType;
      const profile = initialDashboard.profile;

      const topChart = initialDashboard.charts[0];
      const topKpi = initialDashboard.kpis[1];

      const takeawayText = topChart?.analysis?.whatItShows || 
        `Total primary value is ${topKpi?.value || 0} across ${parsed.rowCount} records. Primary category commands dominant volume share.`;

      // Construct rich analytical discovery greeting
      const activeCaps = profile ? [
        profile.capabilities.trendAnalysis.available ? "Trend Analysis" : null,
        profile.capabilities.timeSeriesForecasting.available ? "Forecasting" : null,
        profile.capabilities.correlationAnalysis.available ? "Correlation" : null,
        profile.capabilities.cohortAnalysis.available ? "Cohort Breakdowns" : null,
        profile.capabilities.targetPrediction.available ? "Target Prediction" : null,
        profile.capabilities.distributionAnalysis.available ? "Distributions" : null,
      ].filter(Boolean).join(", ") : "Standard Analytics";

      const newSessionId = `session_${Date.now()}`;
      const displayTitle = sourceType === "pasted"
        ? (fileName || `pasted_data_${new Date().toISOString().slice(0, 10)}`)
        : fileName.replace(/\.csv$/i, "").replace(/_/g, " ");

      const initialMessages: ChatMessage[] = [];

      // If user provided a specific custom prompt, include user message
      if (userPrompt && !userPrompt.startsWith("Analyze this dataset and generate")) {
        initialMessages.push({
          id: `msg_user_${Date.now()}`,
          role: "user",
          content: userPrompt,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      }

      initialMessages.push({
        id: `msg_init_${Date.now()}`,
        role: "assistant",
        content: `**[Dataset Intelligence Profile Generated]**\nParsed **${displayTitle}** (${sourceType === "pasted" ? "Direct Input" : "CSV Ingest"}) with ${parsed.rowCount} rows, ${parsed.columns.length} attributes, and ${profile?.dataQuality.completenessRate || 100}% completeness score.\n\n**[Detected Capabilities]**\n- ${activeCaps}\n\n**[Executive Summary]**\n${takeawayText}`,
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

  // Handle new analysis (reset view to uploader)
  const handleNewSession = () => {
    setActiveSession(null);
  };

  // Handle selecting a session
  const handleSelectSession = (id: string) => {
    const target = sessions.find((s) => s.sessionId === id);
    if (target) {
      setActiveSession(target);
    }
  };

  // Handle deleting a session
  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteSession(id);
    const updated = sessions.filter((s) => s.sessionId !== id);
    setSessions(updated);
    if (activeSession?.sessionId === id) {
      setActiveSession(updated[0] || null);
    }
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

      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const refreshMsg: ChatMessage = {
        id: `msg_refresh_${Date.now()}`,
        role: "assistant",
        content: focus
          ? `**[Analysis Rebuilt]**\nDashboard successfully re-synthesized around focus: "${focus}".`
          : `**[Analysis Refreshed]**\nData intelligence, relationships, capabilities, and visualizations re-evaluated against full dataset (${activeSession.rowCount} records).`,
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

    // Intent detection for rebuild / refresh requests
    const promptLower = prompt.toLowerCase();
    const isRebuildOrRefresh =
      promptLower.includes("refresh") ||
      promptLower.includes("rebuild") ||
      promptLower.includes("re-analyze") ||
      promptLower.includes("reanalyze");

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

      // Check if Ollama failed but user requested refresh / rebuild
      if ((!responseData || responseData.error) && isRebuildOrRefresh) {
        let detectedFocus: string | undefined;
        if (promptLower.includes("around ") || promptLower.includes("on ") || promptLower.includes("focus")) {
          const match = prompt.match(/(?:around|on|for|focus on)\s+([a-zA-Z0-9_\s]+)/i);
          if (match && match[1]) {
            detectedFocus = match[1].replace(/dashboard|analysis|dataset/gi, "").trim();
          }
        }
        const updatedDashboard = refreshDashboardWithFocus(
          activeSession.dashboardState.tableData,
          activeSession.dashboardState.columns,
          detectedFocus
        );
        const assistantMsg: ChatMessage = {
          id: `msg_ast_${Date.now()}`,
          role: "assistant",
          content: detectedFocus
            ? `**[Direct Answer]**\nDashboard successfully re-synthesized around focus: "${detectedFocus}".\n\n**[Key Drivers & Comparisons]**\n- Deterministic data engine re-evaluated full dataset (${activeSession.rowCount} records).\n- Archetype profile: [${updatedDashboard.profileType}].\n\n**[Compounding Relationship]**\nVisual perspectives prioritized according to "${detectedFocus}".\n\n**[Executive Takeaway]**\nFocus updated successfully.`
            : `**[Direct Answer]**\nDashboard analysis successfully refreshed.\n\n**[Key Drivers & Comparisons]**\n- Deterministic data intelligence and quality metrics verified across ${activeSession.rowCount} records.\n- ${updatedDashboard.charts.length} dynamic analytical perspectives rendered.\n\n**[Compounding Relationship]**\nAll statistical distributions and relationships recomputed.\n\n**[Executive Takeaway]**\nFull dashboard regenerated.`,
          insight: `Archetype: [${updatedDashboard.profileType}] • ${updatedDashboard.charts.length} visual perspectives rendered.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        const finalMessages = [...updatedMessages, assistantMsg];
        const finalSession = {
          ...activeSession,
          dashboardState: updatedDashboard,
          messages: finalMessages,
        };
        setActiveSession(finalSession);
        await saveSession(finalSession);
        return;
      }

      if (!responseData || responseData.error) {
        // Kroma engine connection failure
        const errorMsg: ChatMessage = {
          id: `msg_err_${Date.now()}`,
          role: "assistant",
          content:
            responseData?.error ||
            "[Error: Unable to connect to local Ollama server at http://127.0.0.1:11434. Please ensure Ollama is running with model 'qwen2.5-coder:7b'].",
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        const finalMessages = [...updatedMessages, errorMsg];
        const finalSession = { ...activeSession, messages: finalMessages };
        setActiveSession(finalSession);
        await saveSession(finalSession);
        return;
      }

      // Check for Structured Actions (REFRESH_DASHBOARD / REBUILD_DASHBOARD)
      let updatedDashboard = activeSession.dashboardState;
      let actionExecutedText = "";

      if (
        (responseData.action &&
          (responseData.action.type === "REFRESH_DASHBOARD" || responseData.action.type === "REBUILD_DASHBOARD")) ||
        (!responseData.action && isRebuildOrRefresh)
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
        actionExecutedText = rebuildFocus
          ? `\n\n**[Action Executed]**\nDashboard successfully re-synthesized around focus: "${rebuildFocus}".`
          : `\n\n**[Action Executed]**\nDashboard successfully refreshed with current dataset intelligence.`;
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
        onDeleteSession={handleDeleteSession}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Top Navbar Header */}
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
                  "px-3 py-1.5 text-xs rounded-xl font-medium font-mono transition-colors cursor-pointer flex items-center gap-1.5 border border-white/10 bg-[#212222] text-white/90 hover:text-white hover:border-[#FE6749]/50 hover:bg-[#18191b]",
                  isRefreshing && "opacity-60 cursor-not-allowed text-[#FE6749]"
                )}
                title="Re-run data intelligence and regenerate dashboard"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-[#FE6749]", isRefreshing && "animate-spin")} />
                <span>{isRefreshing ? "[Re-analyzing...]" : "[Refresh Analysis]"}</span>
              </motion.button>

              {/* Layout Switcher Tabs */}
              <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex items-center gap-1 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("split")}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "split"
                      ? "bg-[#FE6749] text-white shadow"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">[Split View]</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("dashboard")}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "dashboard"
                      ? "bg-[#FE6749] text-white shadow"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">[Dashboard]</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("chat")}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "chat"
                      ? "bg-[#FE6749] text-white shadow"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">[Chat Stream]</span>
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Compact Refresh Error Notification */}
        <AnimatePresence>
          {refreshError && (
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-between text-xs font-mono text-red-300 z-10"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span>[Refresh Error: {refreshError}]</span>
              </div>
              <button
                type="button"
                onClick={() => handleRefreshDashboard()}
                className="text-[#FE6749] underline hover:text-white transition-colors cursor-pointer"
              >
                [Retry]
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Body with View Transition */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {!activeSession ? (
              /* Universal AI Composer Landing Screen */
              <motion.div
                key="landing-composer"
                variants={shouldReduceMotion ? undefined : pageViewVariants}
                initial={shouldReduceMotion ? undefined : "hidden"}
                animate={shouldReduceMotion ? undefined : "visible"}
                exit={shouldReduceMotion ? undefined : "exit"}
                className="h-full flex items-center justify-center p-4 md:p-6 overflow-y-auto"
              >
                <KromaComposer onAnalyze={handleAnalyze} isAnalyzing={isAnalyzingNew} />
              </motion.div>
            ) : (
              /* Active Session Layout (Uses StaticGrid primitive ONLY) */
              <motion.div
                key={`workspace-${activeSession.sessionId}`}
                variants={shouldReduceMotion ? undefined : pageViewVariants}
                initial={shouldReduceMotion ? undefined : "hidden"}
                animate={shouldReduceMotion ? undefined : "visible"}
                exit={shouldReduceMotion ? undefined : "exit"}
                className="h-full w-full relative"
              >
                <StaticGrid />

                {/* Re-analysis State Overlay */}
                <AnimatePresence>
                  {isRefreshing && (
                    <motion.div
                      variants={fadeIn}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="absolute inset-0 z-30 bg-black/40 backdrop-blur-xs flex items-center justify-center pointer-events-none"
                    >
                      <div className="rounded-2xl bg-[#18191b] border border-[#FE6749]/40 px-5 py-3 shadow-2xl flex items-center gap-3 font-mono text-xs text-white">
                        <Loader2 className="w-4 h-4 text-[#FE6749] animate-spin" />
                        <span>[Re-analyzing dataset intelligence & updating dashboard...]</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative z-10 h-full w-full">
                  {activeTab === "split" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 h-full overflow-hidden">
                      {/* Left Column: Bento Grid Dashboard */}
                      <div className="lg:col-span-7 h-full overflow-y-auto p-4 md:p-6 space-y-4 border-r border-white/10 no-scrollbar">
                        <ErrorBoundary fallbackTitle="Dashboard Analytics Diagnostic">
                          <BentoGrid
                            key={`bento-${activeSession.sessionId}`}
                            dashboardState={activeSession.dashboardState}
                            onSelectChart={(chart) => setActiveModalChart(chart)}
                          />
                        </ErrorBoundary>
                      </div>

                      {/* Right Column: AI Chat Panel */}
                      <div className="lg:col-span-5 h-full overflow-hidden">
                        <ErrorBoundary fallbackTitle="Chat Interface Diagnostic">
                          <ChatPanel
                            messages={activeSession.messages}
                            onSendMessage={handleSendMessage}
                            isLoading={isLoading}
                            suggestions={activeSession.dashboardState.suggestions}
                          />
                        </ErrorBoundary>
                      </div>
                    </div>
                  )}

                  {activeTab === "dashboard" && (
                    <div className="h-full overflow-y-auto p-4 md:p-6 no-scrollbar">
                      <div className="max-w-7xl mx-auto">
                        <ErrorBoundary fallbackTitle="Dashboard Analytics Diagnostic">
                          <BentoGrid
                            key={`bento-${activeSession.sessionId}`}
                            dashboardState={activeSession.dashboardState}
                            onSelectChart={(chart) => setActiveModalChart(chart)}
                          />
                        </ErrorBoundary>
                      </div>
                    </div>
                  )}

                  {activeTab === "chat" && (
                    <div className="h-full max-w-4xl mx-auto border-x border-white/10">
                      <ErrorBoundary fallbackTitle="Chat Interface Diagnostic">
                        <ChatPanel
                          messages={activeSession.messages}
                          onSendMessage={handleSendMessage}
                          isLoading={isLoading}
                          suggestions={activeSession.dashboardState.suggestions}
                        />
                      </ErrorBoundary>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Expandable Chart Zoom Modal */}
      <ChartModal
        chart={activeModalChart}
        onClose={() => setActiveModalChart(null)}
      />
    </div>
  );
};
