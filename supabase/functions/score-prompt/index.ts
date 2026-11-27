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

  try {
    const { prompt } = await req.json();

    if (!prompt || !prompt.trim()) throw new Error("Prompt is required");

    const systemPrompt = `You are an expert in prompt engineering and AI prompt analysis. Analyze the given prompt and provide a quality score with detailed feedback.

CRITICAL LANGUAGE RULE: DETECT the language of the input prompt and respond ONLY in that same language.
- If prompt is in Russian → respond entirely in Russian
- If prompt is in English → respond entirely in English
- If prompt is in Ukrainian → respond entirely in Ukrainian
- And so on for ANY language

Evaluate the prompt on these criteria (each scored 0-10):
1. CLARITY - How clear and unambiguous is the prompt?
2. SPECIFICITY - How specific and detailed is the task description?
3. STRUCTURE - How well-organized and formatted is the prompt?
4. CONTEXT - Does the prompt provide sufficient context and constraints?
5. ACTIONABILITY - How actionable are the instructions for the AI?

Respond in this EXACT JSON format (translate labels to detected language):
{
  "overall_score": <number 0-100>,
  "criteria": {
    "clarity": {"score": <0-10>, "comment": "<brief comment>"},
    "specificity": {"score": <0-10>, "comment": "<brief comment>"},
    "structure": {"score": <0-10>, "comment": "<brief comment>"},
    "context": {"score": <0-10>, "comment": "<brief comment>"},
    "actionability": {"score": <0-10>, "comment": "<brief comment>"}
  },
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "improved_prompt": "<your improved version of the prompt>"
}

Be constructive and helpful. Provide specific, actionable improvements.`;

    const response = await aiChat({
      model,
      json: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
    });

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content;
    const usage = data.usage ?? {};

    let result;
    try {
      let jsonStr = (resultText ?? "").trim();
      const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (fence) jsonStr = fence[1].trim();
      if (!jsonStr.startsWith("{")) {
        const first = jsonStr.indexOf("{");
        const last = jsonStr.lastIndexOf("}");
        if (first !== -1 && last > first) jsonStr = jsonStr.slice(first, last + 1);
      }
      result = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response as JSON:", resultText);
      throw new Error("Failed to parse scoring response");
    }

    await trace({
      user_id: userId,
      function_name: "score-prompt",
      provider,
      model,
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
    console.error("score-prompt error:", error);
    const status = error?.status || 500;
    const message = error?.message || (error instanceof Error ? error.message : "Unknown error");

    await trace({
      user_id: userId,
      function_name: "score-prompt",
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
