import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { trace, getUserIdFromAuth } from "../_shared/trace.ts";
import { aiChat, aiConfig } from "../_shared/ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const userId = await getUserIdFromAuth(req.headers.get("Authorization"));
  const ai = aiConfig();
  const provider = ai.provider;
  const model = ai.model;
  let action: string | undefined;

  try {
    const body = await req.json();
    const { text } = body;
    action = body.action;

    if (!text || !text.trim()) throw new Error("Text is required");

    let systemPrompt = "";
    if (action === "humanize") {
      systemPrompt = `You are an expert in deep text rewriting. Your task is to COMPLETELY rewrite the source text in your own words so it sounds natural and human-like.

CRITICAL RULES:
- DETECT the language of the input text and respond ONLY in that same language
- If text is in Russian → respond in Russian
- If text is in English → respond in English  
- If text is in Spanish → respond in Spanish
- And so on for ANY language

Content rules:
- Preserve the original meaning, facts, and author's tone
- Completely rephrase every sentence without adding introductions or conclusions
- DO NOT add phrases like "Here is the rewritten text:", no comments, explanations or conclusions
- DO NOT duplicate the source text, work only with new formulations
- Make the text more lively, natural and human-like
- Vary sentence length and structure, avoid template AI phrases

Return ONLY the new rewritten text without any explanations or additional phrases before or after it.`;
    } else if (action === "detect") {
      systemPrompt = `You are an expert in analyzing text for AI generation. Analyze the text and determine the likelihood that it was written by artificial intelligence.

CRITICAL LANGUAGE RULE: DETECT the language of the input text and respond ONLY in that same language.
- If text is in Russian → respond entirely in Russian
- If text is in English → respond entirely in English
- If text is in Spanish → respond entirely in Spanish
- And so on for ANY language

Analysis criteria:
- Template structure and phrases
- Excessive formality or perfection of text
- Lack of personal opinions and emotions
- Typical AI patterns in sentence construction
- Repetitive constructions

Respond in this format (translated to the detected language):
🤖 AI Probability: XX%

📊 AI Signs:
- [sign 1]
- [sign 2]
...

✍️ Human Signs:
- [sign 1]
- [sign 2]
...

📝 Conclusion: [brief conclusion]`;
    } else {
      throw new Error("Invalid action. Use 'humanize' or 'detect'");
    }

    const response = await aiChat({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
    });

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content;
    const usage = data.usage ?? {};

    await trace({
      user_id: userId,
      function_name: "text-tools",
      provider,
      model,
      input_tokens: usage.prompt_tokens ?? null,
      output_tokens: usage.completion_tokens ?? null,
      total_tokens: usage.total_tokens ?? null,
      latency_ms: Date.now() - startedAt,
      status: "success",
      metadata: { action },
    });

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("text-tools error:", error);
    const status = error?.status || 500;
    const message = error?.message || (error instanceof Error ? error.message : "Unknown error");

    await trace({
      user_id: userId,
      function_name: "text-tools",
      provider,
      model,
      latency_ms: Date.now() - startedAt,
      status: "error",
      error_code: String(status),
      error_message: message,
      metadata: { action },
    });

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
