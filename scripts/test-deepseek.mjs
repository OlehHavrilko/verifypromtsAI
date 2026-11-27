// Быстрая проверка DeepSeek API перед деплоем.
//
//   AI_API_KEY=sk-... npm run test:deepseek
//   AI_API_KEY=sk-... npm run test:deepseek -- deepseek-reasoner
//
// Проверяет ключ, доступ к /models и короткий chat-completion.
// Дополнительно можно задать AI_BASE_URL (по умолчанию https://api.deepseek.com/v1).

const apiKey = (process.env.AI_API_KEY || "").trim();
const baseUrl = (process.env.AI_BASE_URL || "https://api.deepseek.com/v1").replace(/\/+$/, "");
const model = process.argv[2] || process.env.AI_MODEL || "deepseek-chat";

if (!apiKey) {
  console.error("AI_API_KEY не задан. Пример: AI_API_KEY=sk-... npm run test:deepseek");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };

async function checkModels() {
  const res = await fetch(`${baseUrl}/models`, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET /models → ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const ids = (data.data ?? []).map((m) => m.id);
  console.log(`✓ ключ принят, моделей доступно: ${ids.length}`);
  console.log(`  ${ids.join(", ") || "<пусто>"}`);
  if (ids.length && !ids.includes(model)) {
    console.warn(`! модели "${model}" нет в списке — проверьте AI_MODEL`);
  }
}

async function checkChat() {
  const startedAt = Date.now();
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Answer with exactly one short sentence." },
        { role: "user", content: "Скажи, что DeepSeek API работает, и назови себя." },
      ],
      temperature: 0.2,
      max_tokens: 60,
    }),
  });
  const latency = Date.now() - startedAt;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`POST /chat/completions → ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  const usage = data.usage ?? {};
  console.log(`✓ chat completion ok (${latency} ms, model=${data.model ?? model})`);
  console.log(`  ответ: ${text}`);
  console.log(
    `  токены: вход ${usage.prompt_tokens ?? "?"}, выход ${usage.completion_tokens ?? "?"}, всего ${usage.total_tokens ?? "?"}`,
  );
}

try {
  console.log(`Endpoint: ${baseUrl}`);
  console.log(`Model:    ${model}`);
  await checkModels();
  await checkChat();
  console.log("\nDeepSeek API готов: тот же ключ можно класть в секреты Supabase (AI_API_KEY).");
} catch (error) {
  console.error(`\n✗ ${error.message}`);
  if (/401|403/.test(error.message)) console.error("  Ключ отклонён — проверьте AI_API_KEY.");
  if (/402/.test(error.message)) console.error("  Недостаточно баланса на аккаунте DeepSeek.");
  process.exit(1);
}
