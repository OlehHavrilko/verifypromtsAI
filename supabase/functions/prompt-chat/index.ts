import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { trace, getUserIdFromAuth } from "../_shared/trace.ts";
import { aiChat, aiConfig } from "../_shared/ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Rough token estimator (chars / 4) used when SSE doesn't include final usage block.
function estimateTokens(text: string): number {
  return Math.ceil((text || "").length / 4);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const userId = await getUserIdFromAuth(req.headers.get("Authorization"));
  const ai = aiConfig();
  const provider = ai.provider;
  const model = ai.model;

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error("Messages array is required");
    }

    const systemPrompt = `You are PromptForge AI — an expert prompt engineer assistant. Your role is to help users iteratively improve their AI prompts through conversation.

CRITICAL LANGUAGE RULE: DETECT the language of the user's messages and ALWAYS respond in that same language.

Your capabilities:
1. **Create** — Generate high-quality prompts from scratch based on user ideas
2. **Improve** — Take existing prompts and make them more effective, specific, and structured
3. **Analyze** — Explain why a prompt works or doesn't, identify weaknesses
4. **Adapt** — Modify prompts for different AI models (GPT, Claude, Gemini, Llama)
5. **Teach** — Explain prompt engineering techniques and best practices

Guidelines:
- Be concise but thorough. Use markdown formatting for readability.
- When showing improved prompts, wrap them in code blocks for easy copying.
- Suggest specific improvements rather than vague advice.
- Ask clarifying questions when the user's intent is unclear.
- If the user provides a prompt, analyze it first, then offer an improved version.
- Use bullet points and headers to structure your responses.
- Remember the full conversation context to provide iterative improvements.`;

    const inputText = messages.map((m: any) => typeof m.content === "string" ? m.content : "").join("\n");
    const inputTokensEstimate = estimateTokens(systemPrompt + "\n" + inputText);

    const response = await aiChat({
      model,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    });

    if (!response.body) throw new Error("No response body");

    // Tee the upstream stream: one branch goes back to the client unchanged,
    // the other we read in the background to compute TTFT, tokens, and write
    // a single trace row when the stream ends.
    const [clientStream, traceStream] = response.body.tee();

    (async () => {
      let firstChunkAt: number | null = null;
      let outputText = "";
      let usage: any = null;
      let textBuffer = "";
      let status: "success" | "error" = "success";
      let errorMessage: string | null = null;

      try {
        const reader = traceStream.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (firstChunkAt === null) firstChunkAt = Date.now();
          textBuffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, idx);
            textBuffer = textBuffer.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (typeof delta === "string") outputText += delta;
              if (parsed.usage) usage = parsed.usage;
            } catch { /* ignore partial */ }
          }
        }
      } catch (e: any) {
        status = "error";
        errorMessage = String(e?.message ?? e);
      }

      const inputTokens = usage?.prompt_tokens ?? inputTokensEstimate;
      const outputTokens = usage?.completion_tokens ?? estimateTokens(outputText);

      await trace({
        user_id: userId,
        function_name: "prompt-chat",
        provider,
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: usage?.total_tokens ?? (inputTokens + outputTokens),
        latency_ms: Date.now() - startedAt,
        ttft_ms: firstChunkAt ? firstChunkAt - startedAt : null,
        status,
        error_message: errorMessage,
        metadata: {
          messages_count: messages.length,
          tokens_estimated: !usage,
          stream: true,
        },
      });
    })();

    return new Response(clientStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error: any) {
    console.error("prompt-chat error:", error);
    const status = error?.status || 500;
    const message = error?.message || (error instanceof Error ? error.message : "Unknown error");

    await trace({
      user_id: userId,
      function_name: "prompt-chat",
      provider,
      model,
      latency_ms: Date.now() - startedAt,
      status: "error",
      error_code: String(status),
      error_message: message,
    });

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
