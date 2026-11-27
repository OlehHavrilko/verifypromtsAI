import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { trace, getUserIdFromAuth, getActivePromptVersion } from "../_shared/trace.ts";
import { aiChat, aiConfig } from "../_shared/ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FALLBACK_SYSTEM = `You are an elite prompt optimization specialist. Your task is to take an existing prompt and dramatically improve it while preserving the original intent.

CRITICAL: Detect the language of the input prompt and write the entire enhanced version in that same language.

Return ONLY the enhanced prompt — no meta-commentary.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const userId = await getUserIdFromAuth(req.headers.get("Authorization"));
  const ai = aiConfig();
  const provider = ai.provider;
  const model = ai.model;
  let promptVersionId: string | null = null;

  try {
    const { prompt } = await req.json();
    if (!prompt || !prompt.trim()) throw new Error("Prompt is required");

    const version = await getActivePromptVersion("enhance-system");
    const systemPrompt = version?.system_prompt ?? FALLBACK_SYSTEM;
    promptVersionId = version?.id ?? null;

    const userPrompt = `Enhance and optimize this prompt:\n\n${prompt}`;

    const res = await aiChat({
      model,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    });

    const data = await res.json();
    const result = data.choices?.[0]?.message?.content;
    const usage = data.usage ?? {};

    await trace({
      user_id: userId,
      function_name: "enhance-prompt",
      provider,
      model,
      prompt_version_id: promptVersionId,
      input_tokens: usage.prompt_tokens ?? null,
      output_tokens: usage.completion_tokens ?? null,
      total_tokens: usage.total_tokens ?? null,
      latency_ms: Date.now() - startedAt,
      status: "success",
    });

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("enhance-prompt error:", error);
    const status = error?.status || 500;
    const message = error?.message || (error instanceof Error ? error.message : "Unknown error");

    await trace({
      user_id: userId,
      function_name: "enhance-prompt",
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
