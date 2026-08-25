import React, { useState, useEffect } from "react";
import { 
  fetchSessions, 
  saveSession, 
  deleteSession 
} from "@/lib/firebase";
import { 
  AnalysisSession, 
  ChatMessage, 
  ChartDataSeries 
} from "@/lib/types";
import { 
  parseCsvContent, 
  generateInitialDashboard 
} from "@/lib/dataEngine";
import { Sidebar } from "./Sidebar";
import { BentoGrid } from "./BentoGrid";
import { ChatPanel } from "./ChatPanel";
import { CsvUploader } from "./CsvUploader";
import { ChartModal } from "./ChartModal";
import { LayoutGrid, MessageSquare, FileText } from "lucide-react";

export const Workspace: React.FC = () => {
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [activeSession, setActiveSession] = useState<AnalysisSession | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "chat" | "split">("split");
  const [isLoading, setIsLoading] = useState(false);
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

  // Handle uploading CSV
  const handleUploadCsv = async (csvContent: string, fileName: string) => {
    const parsed = parseCsvContent(csvContent);
    const initialDashboard = generateInitialDashboard(parsed);

    const newSessionId = `session_${Date.now()}`;
    const newSession: AnalysisSession = {
      sessionId: newSessionId,
      title: fileName.replace(/\.csv$/i, "").replace(/_/g, " "),
      createdAt: new Date().toISOString(),
      rowCount: parsed.rowCount,
      columnCount: parsed.columns.length,
      messages: [
        {
          id: `msg_init_${Date.now()}`,
          role: "assistant",
          content: `Parsed dataset "${fileName}" containing ${parsed.rowCount} rows and ${parsed.columns.length} attributes. Executive Bento dashboard cards have been generated on your workspace. Ask any query below.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          insight: `Columns detected: ${parsed.columns.slice(0, 6).join(", ")}${parsed.columns.length > 6 ? "..." : ""}`,
        },
      ],
      dashboardState: initialDashboard,
    };

    setActiveSession(newSession);
    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    await saveSession(newSession);
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

    try {
      // Build schema string
      const schemaString = activeSession.dashboardState.columns
        .map((col) => {
          const sampleVal = activeSession.dashboardState.tableData[0]?.[col];
          const valType = typeof sampleVal === "number" ? "number" : "string";
          return `${col}: ${valType}`;
        })
        .join(", ");

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: prompt,
          schema: schemaString,
          sampleData: activeSession.dashboardState.tableData.slice(0, 10),
        }),
      });

      const responseData = await res.json();

      if (!res.ok || responseData.error) {
        // Kroma engine connection failure
        const errorMsg: ChatMessage = {
          id: `msg_err_${Date.now()}`,
          role: "assistant",
          content:
            responseData.error ||
            "[Error: Unable to connect to local Ollama server at http://localhost:11434. Please ensure Ollama is running with model 'qwen2.5-coder:7b'].",
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        const finalMessages = [...updatedMessages, errorMsg];
        const finalSession = { ...activeSession, messages: finalMessages };
        setActiveSession(finalSession);
        await saveSession(finalSession);
        return;
      }

      // Success - parse payload from Kroma Intelligence
      let inlineChart: ChartDataSeries | null = null;
      if (
        responseData.chartType &&
        responseData.chartType !== "none" &&
        responseData.chartData &&
        Array.isArray(responseData.chartData) &&
        responseData.chartData.length > 0
      ) {
        const formattedChartData = responseData.chartData.map((item: any) => ({
          label: String(item.label || "Segment"),
          value: Number(item.value) || 0,
        }));

        inlineChart = {
          id: `inline_${Date.now()}`,
          type: responseData.chartType,
          title: responseData.chartTitle || "Query Analysis",
          data: formattedChartData,
          xKey: "label",
          yKey: "value",
        };
      }

      const assistantMsg: ChatMessage = {
        id: `msg_ast_${Date.now()}`,
        role: "assistant",
        content: responseData.explanation || "Analysis computed from dataset context.",
        insight: responseData.insight || null,
        sqlQuery: responseData.sql || null,
        inlineChart,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      const finalSession = { ...activeSession, messages: finalMessages };

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
          "[Error: Unable to connect to local Ollama server at http://localhost:11434. Please ensure Ollama is running with model 'qwen2.5-coder:7b'].",
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#212222] text-white">
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
            <h2 className="font-semibold text-sm text-white tracking-tight truncate">
              {activeSession ? `[Dataset: ${activeSession.title}]` : "[Kroma Autonomous Data Analyst]"}
            </h2>
            {activeSession && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 text-white/60">
                {activeSession.rowCount} records
              </span>
            )}
          </div>

          {activeSession && (
            <div className="flex items-center gap-2">
              {/* Layout Switcher Tabs */}
              <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("split")}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
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
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
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
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
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

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {!activeSession ? (
            /* Upload Screen */
            <div className="h-full flex items-center justify-center p-6 overflow-y-auto">
              <CsvUploader onUploadCsv={handleUploadCsv} />
            </div>
          ) : (
            /* Active Session Layout */
            <div className="h-full w-full">
              {activeTab === "split" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 h-full overflow-hidden">
                  {/* Left Column: Bento Grid Dashboard */}
                  <div className="lg:col-span-7 h-full overflow-y-auto p-4 md:p-6 space-y-4 border-r border-white/10 no-scrollbar">
                    <BentoGrid
                      dashboardState={activeSession.dashboardState}
                      onSelectChart={(chart) => setActiveModalChart(chart)}
                    />
                  </div>

                  {/* Right Column: AI Chat Panel */}
                  <div className="lg:col-span-5 h-full overflow-hidden">
                    <ChatPanel
                      messages={activeSession.messages}
                      onSendMessage={handleSendMessage}
                      isLoading={isLoading}
                    />
                  </div>
                </div>
              )}

              {activeTab === "dashboard" && (
                <div className="h-full overflow-y-auto p-4 md:p-6 no-scrollbar">
                  <div className="max-w-7xl mx-auto">
                    <BentoGrid
                      dashboardState={activeSession.dashboardState}
                      onSelectChart={(chart) => setActiveModalChart(chart)}
                    />
                  </div>
                </div>
              )}

              {activeTab === "chat" && (
                <div className="h-full max-w-4xl mx-auto border-x border-white/10">
                  <ChatPanel
                    messages={activeSession.messages}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </div>
          )}
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
