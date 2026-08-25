import { NextRequest, NextResponse } from "next/server";
import { buildOllamaSystemPrompt } from "@/lib/ollama";

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
    const { question, schema, sampleData } = body;

    if (!question || !schema) {
      return NextResponse.json(
        { error: "Missing required parameters: question and schema." },
        { status: 400 }
      );
    }

    const systemPrompt = buildOllamaSystemPrompt({
      schema,
      sampleData: sampleData || [],
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
      const rawMessage = data.message?.content || "{}";
      const parsedAnalysis = JSON.parse(rawMessage);

      return NextResponse.json(parsedAnalysis);
    } catch (ollamaErr: any) {
      console.warn("Local Ollama connection failed:", ollamaErr.message);
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
