# Настройка собственного окружения

Нужен быстрый справочник «какой ключ где взять и куда положить»? Он в
**[SECRETS.md](SECRETS.md)**. Здесь — те же шаги, но с объяснениями.

Пошаговая инструкция: свой Supabase, свой AI-ключ, опционально Stripe, затем
подключение GitHub Actions. Никаких Lovable-аккаунтов и Lovable Cloud не требуется.

---

## 1. Supabase: свой проект

1. Создайте проект на [supabase.com/dashboard](https://supabase.com/dashboard).
2. Запишите **Project ref** и пароль БД.
3. Установите Supabase CLI и залинкуйте проект:

   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref <your-project-ref>
   ```

4. Примените схему БД (11 миграций: profiles, saved_prompts, generation_history,
   usage_limits, user_templates, template_ratings, user_api_keys, user_roles,
   prompt_templates/versions, llm_traces, eval_*):

   ```bash
   supabase db push
   ```

5. Возьмите публичные ключи фронтенда: **Project Settings → API**
   - `Project URL` → `VITE_SUPABASE_URL`
   - `Publishable key` (или legacy `anon` key) → `VITE_SUPABASE_PUBLISHABLE_KEY`

   Эти значения публичны — данные защищает RLS.

---

## 2. AI-провайдер: DeepSeek API

По умолчанию все LLM-вызовы идут в **DeepSeek API** через общий
OpenAI-совместимый клиент (`supabase/functions/_shared/ai.ts`). Ключ берётся на
[platform.deepseek.com](https://platform.deepseek.com/api_keys).

### Проверить ключ ещё до деплоя

```bash
AI_API_KEY=sk-... npm run test:deepseek                 # deepseek-chat
AI_API_KEY=sk-... npm run test:deepseek -- deepseek-reasoner
```

Скрипт [scripts/test-deepseek.mjs](scripts/test-deepseek.mjs) проверяет ключ,
список моделей и короткий chat-completion, печатает задержку и расход токенов.
Если он зелёный — тот же ключ можно класть в секреты Supabase.

### Секреты edge-функций

Если деплоите через GitHub Actions (рекомендуется), секреты проставит
[supabase.yml](.github/workflows/supabase.yml) — нужен только GitHub-secret
`AI_API_KEY` (см. шаг 5). Вручную:

```bash
supabase secrets set \
  AI_API_KEY=sk-... \
  AI_MODEL=deepseek-chat \
  AI_JUDGE_MODEL=deepseek-chat \
  APP_SITE_URL=https://<user>.github.io/<repo>
```

`AI_MODEL=deepseek-reasoner` включает reasoning-модель (дороже и медленнее, но
сильнее в сложных промптах). `AI_BASE_URL` и `AI_PROVIDER` уже имеют значения по
умолчанию (`https://api.deepseek.com/v1`, `deepseek`) — менять их не нужно.

### Анализ изображений

Vision-модели у DeepSeek нет, поэтому «Анализ изображений» нужно направить на
другой OpenAI-совместимый провайдер (OpenAI, OpenRouter, Gemini compat). Остальные
функции продолжат ходить в DeepSeek:

```bash
supabase secrets set \
  AI_VISION_MODEL=gpt-4o-mini \
  AI_VISION_BASE_URL=https://api.openai.com/v1 \
  AI_VISION_API_KEY=sk-...
```

### Другой провайдер целиком

```bash
# OpenRouter
supabase secrets set AI_BASE_URL=https://openrouter.ai/api/v1 AI_MODEL=google/gemini-2.5-flash AI_PROVIDER=openrouter
# OpenAI
supabase secrets set AI_BASE_URL=https://api.openai.com/v1 AI_MODEL=gpt-4o-mini AI_PROVIDER=openai
```

> `APP_SITE_URL` — полный публичный адрес приложения **с подпутём** GitHub Pages,
> без завершающего слеша. Он нужен для redirect'ов Stripe.

Разверните функции:

```bash
supabase functions deploy
```

`supabase/config.toml` уже содержит `verify_jwt = false` для всех функций: они
сами проверяют пользователя там, где это нужно.

---

## 3. Auth (вход по email)

**Dashboard → Authentication → URL Configuration**:

- **Site URL**: `https://<user>.github.io/<repo>/`
- **Redirect URLs**: добавьте
  - `https://<user>.github.io/<repo>/`
  - `http://localhost:8080`

Подтверждение email можно отключить для локальной разработки:
**Authentication → Providers → Email → Confirm email**.

### Первый администратор

Зарегистрируйте пользователя в приложении, затем выполните в SQL Editor:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::app_role from auth.users where email = 'you@example.com'
on conflict do nothing;
```

После этого откроются `/admin/prompts`, `/admin/evals`, `/admin/observability`,
`/admin/api-keys`.

---

## 4. Stripe (опционально)

Без Stripe приложение работает в тарифе Free: просмотр тарифов есть, кнопка
оплаты вернёт ошибку «STRIPE_SECRET_KEY is not set».

1. Создайте два продукта с рекуррентными ценами (Pro / Business).
2. Добавьте секреты Supabase:

   ```bash
   supabase secrets set \
     STRIPE_SECRET_KEY=sk_live_... \
     STRIPE_PRODUCT_PRO=prod_... \
     STRIPE_PRODUCT_BUSINESS=prod_...
   ```

3. Передайте **публичные** ID цен во фронтенд (переменные репозитория GitHub):
   `VITE_STRIPE_PRODUCT_PRO`, `VITE_STRIPE_PRICE_PRO`,
   `VITE_STRIPE_PRODUCT_BUSINESS`, `VITE_STRIPE_PRICE_BUSINESS`.
4. В Stripe Dashboard включите Customer Portal (Billing → Customer portal).

---

## 5. GitHub: переменные и секреты

**Settings → Secrets and variables → Actions**

| Тип | Имя | Значение |
| --- | --- | --- |
| Variable | `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
| Variable | `VITE_SUPABASE_PUBLISHABLE_KEY` | publishable/anon key |
| Variable | `VITE_SITE_URL` | `https://<user>.github.io/<repo>` (для canonical/OG) |
| Variable | `APP_SITE_URL` | тот же адрес со слэшем на конце — уходит в секреты функций |
| Variable | `AI_MODEL` | `deepseek-chat` (или `deepseek-reasoner`) |
| Variable | `VITE_STRIPE_*` | ID продуктов и цен (если включён Stripe) |
| Secret | `SUPABASE_ACCESS_TOKEN` | токен Supabase для workflow `supabase.yml` |
| Secret | `SUPABASE_PROJECT_REF` | ref проекта |
| Secret | `SUPABASE_DB_PASSWORD` | пароль БД |
| Secret | `AI_API_KEY` | ключ DeepSeek — проставляется в секреты функций автоматически |

### Бэкенд в один запуск

1. Добавьте четыре секрета `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`,
   `SUPABASE_DB_PASSWORD`, `AI_API_KEY` и переменные `VITE_SUPABASE_*`,
   `APP_SITE_URL`, `AI_MODEL`.
2. Actions → **Deploy Supabase backend** → *Run workflow* (все галки включены).
   Workflow применит миграции, проставит секреты функций и выложит 10 функций.
3. Actions → **Deploy to GitHub Pages** → *Run workflow*, чтобы пересобрать
   фронтенд уже с ключами Supabase.

После этого баннер «Supabase не настроен» исчезнет, а генератор, скоринг, чат и
текстовые инструменты начнут отвечать через DeepSeek.

**Settings → Pages → Source**: `GitHub Actions`.

После пуша в `main` workflow соберёт приложение с базой
`/<repo-name>/` и опубликует на `https://<user>.github.io/<repo>/`.

---

## 6. Локальная разработка

```bash
cp .env.example .env      # вписать VITE_SUPABASE_*
npm install
npm run dev               # http://localhost:8080
```

Edge-функции локально:

```bash
supabase start            # поднимает Postgres + Auth + Functions в Docker
cp supabase/functions/.env.example supabase/functions/.env   # и вписать AI_API_KEY
supabase functions serve  # отдельный терминал
```

---

## Чек-лист

- [ ] `npm run test:deepseek` проходит с вашим ключом
- [ ] `supabase db push` прошёл без ошибок
- [ ] `supabase functions deploy` — 10 функций в статусе ACTIVE
- [ ] `AI_API_KEY` задан в секретах функций, `generate-prompt` отвечает 200
- [ ] Auth Site URL / Redirect URLs указывают на Pages-адрес
- [ ] Переменные `VITE_SUPABASE_*` добавлены в GitHub
- [ ] Pages включён, первый деплой зелёный
- [ ] (опционально) Stripe-продукты, цены и секреты заданы
