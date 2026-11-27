// Shared AI client for edge functions.
//
// Any OpenAI-compatible endpoint works: OpenAI, OpenRouter, Groq, DeepSeek,
// Google Gemini (OpenAI compatibility layer), local vLLM, etc.
//
// Required secrets:
//   AI_API_KEY   — provider key
// Optional secrets:
//   AI_BASE_URL  — default https://api.openai.com/v1
//   AI_MODEL     — default gpt-4o-mini
//   AI_VISION_MODEL — model for image analysis, defaults to AI_MODEL
//   AI_PROVIDER  — label written to llm_traces, default "openai"

export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  visionModel: string;
  provider: string;
}

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

function env(name: string): string {
  return (Deno.env.get(name) ?? "").trim();
}

export function aiConfig(): AiConfig {
  const baseUrl = (env("AI_BASE_URL") || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = env("AI_MODEL") || DEFAULT_MODEL;
  return {
    apiKey: env("AI_API_KEY"),
    baseUrl,
    model,
    visionModel: env("AI_VISION_MODEL") || model,
    provider: env("AI_PROVIDER") || "openai",
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
}

/**
 * Sends a chat completion request and returns the raw provider response.
 * Throws `{ status, message }` for rate limits, billing and auth problems so the
 * calling function can return an accurate HTTP status to the browser.
 */
export async function aiChat(options: AiChatOptions): Promise<Response> {
  const config = aiConfig();
  if (!config.apiKey) {
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

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
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
