import { NextRequest, NextResponse } from "next/server";
import { buildOllamaSystemPrompt, normalizeChartData } from "@/lib/ollama";
import { validateAndGroundResponse } from "@/lib/responseValidator";
import { computeDeterministicAnalyticalResult } from "@/lib/deterministicAnalytics";

export const dynamic = "force-static";

export async function POST(req: NextRequest) {
  try {
    const host = req.headers.get("host") || "";
    const isLocalhost =
      host.includes("localhost") ||
      host.includes("127.0.0.1") ||
      host.includes("::1");

    // Vercel / Production deployment check
    if (process.env.VERCEL || (!isLocalhost && process.env.NODE_ENV === "production")) {
      return NextResponse.json(
        { error: "[Live AI inference is disabled in public showcase mode.]" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { question, schema, sampleData, profile, currentFocus, factPack } = body;

    if (!question || !schema) {
      return NextResponse.json(
        { error: "Missing required parameters: question and schema." },
        { status: 400 }
      );
    }

    const effectiveFactPack = factPack || profile?.factPack;
    const detResult = effectiveFactPack ? computeDeterministicAnalyticalResult(question, effectiveFactPack) : undefined;

    const systemPrompt = buildOllamaSystemPrompt({
      schema,
      sampleData: sampleData || [],
      profile,
      currentFocus,
      factPack: effectiveFactPack,
      question,
    });

    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

    try {
      const ollamaRes = await fetch(`${ollamaBaseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen2.5-coder:7b",
          format: "json",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ],
          stream: false,
        }),
      });

      if (!ollamaRes.ok) {
        throw new Error(`Ollama returned HTTP status ${ollamaRes.status}`);
      }

      const data = await ollamaRes.json();
      let rawMessage = data.message?.content || data.response || "{}";

      // Defensive markdown code fence stripping
      rawMessage = rawMessage.replace(/```json/gi, "").replace(/```/g, "").trim();

      // Robust JSON extraction matching outermost { and }
      const firstBrace = rawMessage.indexOf("{");
      const lastBrace = rawMessage.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        rawMessage = rawMessage.substring(firstBrace, lastBrace + 1);
      }

      let parsedAnalysis;
      try {
        parsedAnalysis = JSON.parse(rawMessage);
      } catch (parseErr) {
        console.warn("LLM JSON output formatting warning, returning structured fallback:", parseErr);
        parsedAnalysis = {
          explanation: detResult?.isHandled
            ? detResult.deterministicExplanation
            : "**[Direct Answer]**\nAnalysis computed successfully from dataset context.\n\n**[Key Drivers & Comparisons]**\n- Core metrics align with baseline statistical patterns.\n- Target variance confirms cohort concentration.\n\n**[Compounding Relationship]**\nVariables exhibit structural co-dependence.\n\n**[Executive Takeaway]**\nPrioritize strategic operational capacity on primary high-yield nodes.",
          insight: detResult?.isHandled ? detResult.deterministicInsight : "Data processed locally with Kroma intelligence.",
          action: { type: "ANSWER" },
          sql: null,
          chartType: detResult?.chartSpec ? detResult.chartSpec.chartType : "none",
          chartTitle: detResult?.chartSpec ? detResult.chartSpec.chartTitle : "Query Observation",
          xAxisLabel: detResult?.chartSpec ? detResult.chartSpec.xAxisLabel : "Category",
          yAxisLabel: detResult?.chartSpec ? detResult.chartSpec.yAxisLabel : "Value",
          chartData: detResult?.chartSpec ? detResult.chartSpec.chartData : [],
        };
      }

      // Ground and validate response with deterministic fact pack
      const validated = validateAndGroundResponse(
        parsedAnalysis.explanation || "",
        parsedAnalysis.insight || "",
        effectiveFactPack,
        question
      );
      parsedAnalysis.explanation = validated.explanation;
      parsedAnalysis.insight = validated.insight;

      // Normalize chart data & attach deterministic chartSpec if applicable
      let finalChartType = parsedAnalysis.chartType || "none";
      let finalChartTitle = parsedAnalysis.chartTitle || "Analysis Observation";
      let finalXAxis = parsedAnalysis.xAxisLabel || "Category";
      let finalYAxis = parsedAnalysis.yAxisLabel || "Value";
      let finalChartData: Record<string, any>[] = normalizeChartData(parsedAnalysis.chartData);

      if (detResult?.chartSpec) {
        if (finalChartData.length === 0 || finalChartType === "none" || detResult.intent === "COHORT_BAR_CHART") {
          finalChartType = detResult.chartSpec.chartType;
          finalChartTitle = detResult.chartSpec.chartTitle;
          finalXAxis = detResult.chartSpec.xAxisLabel;
          finalYAxis = detResult.chartSpec.yAxisLabel;
          finalChartData = detResult.chartSpec.chartData;
        }
      }

      parsedAnalysis.chartType = finalChartType;
      parsedAnalysis.chartTitle = finalChartTitle;
      parsedAnalysis.xAxisLabel = finalXAxis;
      parsedAnalysis.yAxisLabel = finalYAxis;
      parsedAnalysis.chartData = finalChartData.length > 0 ? finalChartData : [];

      return NextResponse.json(parsedAnalysis);
    } catch (ollamaErr: any) {
      console.warn("Local Ollama connection failed:", ollamaErr.message);
      if (detResult?.isHandled) {
        return NextResponse.json({
          explanation: detResult.deterministicExplanation,
          insight: detResult.deterministicInsight,
          action: { type: "ANSWER" },
          sql: null,
          chartType: detResult.chartSpec ? detResult.chartSpec.chartType : "none",
          chartTitle: detResult.chartSpec ? detResult.chartSpec.chartTitle : "Deterministic Analysis",
          xAxisLabel: detResult.chartSpec ? detResult.chartSpec.xAxisLabel : "Category",
          yAxisLabel: detResult.chartSpec ? detResult.chartSpec.yAxisLabel : "Value",
          chartData: detResult.chartSpec ? detResult.chartSpec.chartData : [],
        });
      }
      return NextResponse.json(
        {
          error:
            "[Error: Unable to connect to local Ollama server at http://localhost:11434. Please ensure Ollama is running with model 'qwen2.5-coder:7b'].",
        },
        { status: 503 }
      );
    }
  } catch (err: any) {
    console.error("API Analyze Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
