import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { trace, getUserIdFromAuth } from "../_shared/trace.ts";
import { aiChat, aiConfig } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const userId = await getUserIdFromAuth(req.headers.get("Authorization"));
  const ai = aiConfig();
  const provider = ai.provider;
  const model = ai.visionModel;

  try {
    const { imageBase64, userPrompt } = await req.json();
    if (!imageBase64) throw new Error("No image provided");

    const systemPrompt = `You are an expert image analyst. Describe in detail what is shown in the image. Mention the main objects, colors, composition, mood, and any interesting details.

CRITICAL LANGUAGE RULE: 
- If the user's message/prompt is in Russian → respond entirely in Russian
- If the user's message/prompt is in English → respond entirely in English
- If the user's message/prompt is in any other language → respond in that same language
- If no user message provided, respond in English by default`;

    const userMessage = userPrompt || "Describe this image in detail:";

    const response = await aiChat({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userMessage },
            { type: "image_url", image_url: { url: imageBase64 } },
          ],
        },
      ],
    });

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content;
    const usage = data.usage ?? {};

    await trace({
      user_id: userId,
      function_name: "analyze-image",
      provider,
      model,
      input_tokens: usage.prompt_tokens ?? null,
      output_tokens: usage.completion_tokens ?? null,
      total_tokens: usage.total_tokens ?? null,
      latency_ms: Date.now() - startedAt,
      status: "success",
      metadata: { has_user_prompt: !!userPrompt },
    });

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error analyzing image:", error);
    const status = error?.status || 500;
    const message = error?.message || (error instanceof Error ? error.message : "Failed to analyze image");

    await trace({
      user_id: userId,
      function_name: "analyze-image",
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
