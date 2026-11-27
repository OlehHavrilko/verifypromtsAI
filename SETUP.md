# Настройка собственного окружения

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

## 2. AI-провайдер

Все LLM-вызовы идут через один OpenAI-совместимый клиент
(`supabase/functions/_shared/ai.ts`). Подойдёт OpenAI, OpenRouter, Groq, DeepSeek,
Gemini (OpenAI-совместимый слой) или локальный vLLM.

Задайте секреты edge-функций:

```bash
supabase secrets set \
  AI_API_KEY=sk-... \
  AI_MODEL=gpt-4o-mini \
  AI_VISION_MODEL=gpt-4o-mini \
  AI_JUDGE_MODEL=gpt-4o-mini \
  APP_SITE_URL=https://<user>.github.io/<repo>
```

`AI_BASE_URL` нужен только для не-OpenAI провайдера, например:

```bash
# OpenRouter
supabase secrets set AI_BASE_URL=https://openrouter.ai/api/v1 AI_MODEL=google/gemini-2.5-flash
# Gemini (OpenAI compatibility)
supabase secrets set AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai AI_MODEL=gemini-2.0-flash
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
| Variable | `VITE_STRIPE_*` | ID продуктов и цен (если включён Stripe) |
| Secret | `SUPABASE_ACCESS_TOKEN` | токен Supabase для workflow `supabase.yml` |
| Secret | `SUPABASE_PROJECT_REF` | ref проекта |
| Secret | `SUPABASE_DB_PASSWORD` | пароль БД |

**Settings → Pages → Source**: `GitHub Actions`. Если оставить `Deploy from a
branch`, workflow `deploy-pages.yml` сам включит нужный источник при первом запуске
(`enablement: true`).

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
supabase functions serve  # отдельный терминал, секреты из supabase/functions/.env
```

---

## Чек-лист

- [ ] `supabase db push` прошёл без ошибок
- [ ] `supabase functions deploy` — 10 функций в статусе ACTIVE
- [ ] `AI_API_KEY` задан, `generate-prompt` отвечает 200
- [ ] Auth Site URL / Redirect URLs указывают на Pages-адрес
- [ ] Переменные `VITE_SUPABASE_*` добавлены в GitHub
- [ ] Pages включён, первый деплой зелёный
- [ ] (опционально) Stripe-продукты, цены и секреты заданы
