import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { trace, getUserIdFromAuth, getActivePromptVersion } from "../_shared/trace.ts";
import { aiConfig } from "../_shared/ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FALLBACK_SYSTEM = `You are a world-class prompt engineer. Transform the user's idea into a precisely engineered, production-ready prompt.

CRITICAL: DETECT the language of the user's input and write the ENTIRE output in that same language.

LENGTH: {{LENGTH_INSTRUCTION}}
TONE: {{TONE_INSTRUCTION}}
STYLE: {{STYLE_INSTRUCTION}}
TARGET MODEL: {{MODEL_INSTRUCTION}}

Return ONLY the generated prompt — no meta-commentary.`;

// Route: "gateway" uses the server-configured OpenAI-compatible endpoint.
// "openai" / "anthropic" / "openrouter" are used when a user stored their own key.
type Route = "gateway" | "openai" | "anthropic" | "openrouter";

function buildProviderRequest(route: Route, apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  const authHeaders = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };

  if (route === "anthropic") {
    return {
      url: "https://api.anthropic.com/v1/messages",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: {
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        stream: true,
      },
    };
  }
  if (route === "openai") {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: authHeaders,
      body: { model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], stream: true },
    };
  }
  if (route === "openrouter") {
    return {
      url: "https://openrouter.ai/api/v1/chat/completions",
      headers: authHeaders,
      body: { model: "google/gemini-2.5-flash-preview", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], stream: true },
    };
  }
  return {
    url: `${aiConfig().baseUrl}/chat/completions`,
    headers: authHeaders,
    body: { model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], stream: true },
  };
}

async function callProviderStreaming(route: Route, apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  const config = buildProviderRequest(route, apiKey, model, systemPrompt, userPrompt);

  const res = await fetch(config.url, { method: "POST", headers: config.headers, body: JSON.stringify(config.body) });

  if (!res.ok) {
    if (res.status === 429) throw { status: 429, message: "Too many requests. Please try again later." };
    if (res.status === 402) throw { status: 402, message: "Payment required." };
    const errorText = await res.text().catch(() => "");
    console.error(`${route} error:`, res.status, errorText.slice(0, 500));
    throw { status: 502, message: `AI provider error: ${res.status}` };
  }
  return res;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const authHeader = req.headers.get("Authorization");
  const userId = await getUserIdFromAuth(authHeader);

  const ai = aiConfig();
  let provider = ai.provider;
  let route: Route = "gateway";
  let model = ai.model;
  let promptVersionId: string | null = null;
  let inputLen = 0;

  try {
    const { input, length, tone = "neutral", style = "default", targetModel = "auto" } = await req.json();
    if (!input || !input.trim()) throw new Error("Input is required");
    inputLen = input.length;

    const lengthInstructions: Record<string, string> = {
      "Краткий": "Create a concise prompt (3-5 sentences).", "Concise": "Create a concise prompt (3-5 sentences).", "Стислий": "Create a concise prompt (3-5 sentences).",
      "Сбалансированный": "Create a balanced prompt (1-2 paragraphs).", "Balanced": "Create a balanced prompt (1-2 paragraphs).", "Збалансований": "Create a balanced prompt (1-2 paragraphs).",
      "Детальный": "Create a comprehensive, detailed prompt (3-4 paragraphs).", "Detailed": "Create a comprehensive, detailed prompt (3-4 paragraphs).", "Детальний": "Create a comprehensive, detailed prompt (3-4 paragraphs).",
    };
    const toneInstructions: Record<string, string> = {
      neutral: "Use a neutral, professional tone.", formal: "Use a formal, business-like tone.",
      creative: "Use a creative, imaginative tone.", technical: "Use a technical, precise tone.", friendly: "Use a friendly, approachable tone.",
    };
    const styleInstructions: Record<string, string> = {
      default: "Structure the prompt in a standard format.", instructional: "Structure as step-by-step instructions.",
      conversational: "Structure as a natural conversation.", academic: "Structure with academic rigor.", storytelling: "Structure with narrative elements.",
    };
    const modelInstructions: Record<string, string> = {
      auto: "Optimize for general AI assistants.", gpt: "Optimize for OpenAI GPT models.",
      claude: "Optimize for Anthropic Claude models.", gemini: "Optimize for Google Gemini models.", llama: "Optimize for Meta Llama models.",
    };

    // Load active prompt version from registry
    const version = await getActivePromptVersion("generator-system");
    const template = version?.system_prompt ?? FALLBACK_SYSTEM;
    promptVersionId = version?.id ?? null;

    const systemPrompt = template
      .replace("{{LENGTH_INSTRUCTION}}", lengthInstructions[length] || lengthInstructions["Balanced"])
      .replace("{{TONE_INSTRUCTION}}", toneInstructions[tone] || toneInstructions.neutral)
      .replace("{{STYLE_INSTRUCTION}}", styleInstructions[style] || styleInstructions.default)
      .replace("{{MODEL_INSTRUCTION}}", modelInstructions[targetModel] || modelInstructions.auto);

    const userPrompt = `Transform this request into a high-quality prompt:\n\n${input}`;

    // Determine provider: server-configured AI gateway unless the user stored own key
    let apiKey = ai.apiKey;

    if (authHeader) {
      try {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: claims } = await supabaseClient.auth.getClaims(authHeader.replace("Bearer ", ""));
        if (claims?.claims?.sub) {
          const { data: apiKeys } = await supabaseClient
            .from("user_api_keys")
            .select("provider, api_key_encrypted, is_active")
            .eq("user_id", claims.claims.sub as string)
            .eq("is_active", true);

          if (apiKeys && apiKeys.length > 0) {
            const priorityOrder = ["openai", "anthropic", "openrouter"];
            const sortedKeys = apiKeys.sort(
              (a: any, b: any) => priorityOrder.indexOf(a.provider) - priorityOrder.indexOf(b.provider)
            );
            const chosen = sortedKeys[0];
            route = chosen.provider as Route;
            provider = chosen.provider;
            apiKey = chosen.api_key_encrypted;
            // Update model to provider-default for accurate cost tracking
            if (provider === "openai") model = "gpt-4o-mini";
            else if (provider === "anthropic") model = "claude-3-5-sonnet-20241022";
            else if (provider === "openrouter") model = "google/gemini-2.5-flash-preview";
          }
        }
      } catch (e) {
        console.log("Custom key check failed, using server AI gateway:", e);
      }
    }

    if (!apiKey) throw new Error("No API key available");

    console.log(`Streaming generate-prompt via ${provider} (${model}), prompt v=${version?.version}`);
    const aiResponse = await callProviderStreaming(route, apiKey, model, systemPrompt, userPrompt);

    // Wrap stream to capture TTFT and approximate output tokens
    let firstChunkAt: number | null = null;
    let charCount = 0;
    const reader = aiResponse.body!.getReader();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (firstChunkAt === null) firstChunkAt = Date.now();
            charCount += value.byteLength;
            controller.enqueue(value);
          }
          controller.close();

          // Async trace after stream completes
          const totalLatency = Date.now() - startedAt;
          const ttft = firstChunkAt ? firstChunkAt - startedAt : null;
          // Rough token estimation: 1 token ~ 4 chars (very approximate; raw bytes include SSE framing)
          const approxOutputTokens = Math.round(charCount / 12);
          const approxInputTokens = Math.round((systemPrompt.length + userPrompt.length) / 4);
          await trace({
            user_id: userId,
            function_name: "generate-prompt",
            provider,
            model,
            prompt_version_id: promptVersionId,
            input_tokens: approxInputTokens,
            output_tokens: approxOutputTokens,
            latency_ms: totalLatency,
            ttft_ms: ttft,
            status: "success",
            metadata: { length, tone, style, targetModel, input_chars: inputLen, streamed: true },
          });
        } catch (err) {
          controller.error(err);
          await trace({
            user_id: userId,
            function_name: "generate-prompt",
            provider,
            model,
            prompt_version_id: promptVersionId,
            latency_ms: Date.now() - startedAt,
            status: "error",
            error_message: err instanceof Error ? err.message : String(err),
          });
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error: any) {
    console.error("generate-prompt error:", error);
    const status = error?.status || 500;
    const message = error?.message || (error instanceof Error ? error.message : "Unknown error");

    await trace({
      user_id: userId,
      function_name: "generate-prompt",
      provider,
      model,
      prompt_version_id: promptVersionId,
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
