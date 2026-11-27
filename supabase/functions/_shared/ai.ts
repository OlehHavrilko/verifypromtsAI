// Shared AI client for edge functions.
//
// Defaults target the DeepSeek API. Any other OpenAI-compatible endpoint works
// too: OpenAI, OpenRouter, Groq, Google Gemini (compat layer), local vLLM, etc.
//
// Required secrets:
//   AI_API_KEY   — DeepSeek API key
// Optional secrets:
//   AI_BASE_URL  — default https://api.deepseek.com/v1
//   AI_MODEL     — default deepseek-chat
//   AI_PROVIDER  — label written to llm_traces, default "deepseek"
//   AI_VISION_MODEL / AI_VISION_BASE_URL / AI_VISION_API_KEY
//                — vision-capable endpoint for image analysis; DeepSeek has no
//                  vision model, so point these at another provider if needed

export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  visionModel: string;
  visionBaseUrl: string;
  visionApiKey: string;
  provider: string;
}

const DEFAULT_BASE_URL = "https://api.deepseek.com/v1";
const DEFAULT_MODEL = "deepseek-chat";
const DEFAULT_PROVIDER = "deepseek";

function env(name: string): string {
  return (Deno.env.get(name) ?? "").trim();
}

export function aiConfig(): AiConfig {
  const baseUrl = (env("AI_BASE_URL") || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = env("AI_MODEL") || DEFAULT_MODEL;
  const apiKey = env("AI_API_KEY");
  return {
    apiKey,
    baseUrl,
    model,
    visionModel: env("AI_VISION_MODEL") || model,
    visionBaseUrl: (env("AI_VISION_BASE_URL") || baseUrl).replace(/\/+$/, ""),
    visionApiKey: env("AI_VISION_API_KEY") || apiKey,
    provider: env("AI_PROVIDER") || DEFAULT_PROVIDER,
  };
}

export interface AiChatOptions {
  messages: unknown[];
  model?: string;
  stream?: boolean;
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  tools?: unknown[];
  toolChoice?: unknown;
  /** Override the configured endpoint (used by the vision call). */
  baseUrl?: string;
  apiKey?: string;
}

/**
 * Sends a chat completion request and returns the raw provider response.
 * Throws `{ status, message }` for rate limits, billing and auth problems so the
 * calling function can return an accurate HTTP status to the browser.
 */
export async function aiChat(options: AiChatOptions): Promise<Response> {
  const config = aiConfig();
  const apiKey = options.apiKey || config.apiKey;
  const baseUrl = options.baseUrl || config.baseUrl;
  if (!apiKey) {
    throw { status: 500, message: "AI_API_KEY is not configured on the server" };
  }

  const body: Record<string, unknown> = {
    model: options.model ?? config.model,
    messages: options.messages,
  };
  if (options.stream) body.stream = true;
  if (options.json) body.response_format = { type: "json_object" };
  if (options.maxTokens) body.max_tokens = options.maxTokens;
  if (options.temperature !== undefined) body.temperature = options.temperature;
  if (options.tools) body.tools = options.tools;
  if (options.toolChoice) body.tool_choice = options.toolChoice;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw { status: 429, message: "Too many requests. Please try again later." };
    }
    if (response.status === 402) {
      throw { status: 402, message: "AI provider reports insufficient credits." };
    }
    if (response.status === 401 || response.status === 403) {
      throw { status: 502, message: "AI provider rejected the configured API key." };
    }
    const errorText = await response.text().catch(() => "");
    console.error("AI provider error:", response.status, errorText.slice(0, 500));
    throw { status: 502, message: `AI provider error: ${response.status}` };
  }

  return response;
}
