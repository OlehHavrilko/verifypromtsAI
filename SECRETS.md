# Секреты и переменные: что, где взять и куда положить

Карта всех значений PromptLab: какие есть, в каком кабинете их взять, где они
хранятся и что из этого публичное. Проект Supabase уже создан:
**`ymceuebfejaemtaxlatc`** (`https://ymceuebfejaemtaxlatc.supabase.co`, регион eu-west-1).

## В двух словах

Есть три кабинета, и ключи идут из них в одном направлении — в настройки GitHub-репозитория:

```
DeepSeek  → ключ sk-…                ──┐
                                      ├─→  GitHub (Variables + Secrets)  →  Actions  →  деплой
Supabase  → URL, publishable key,    ──┘
            project ref, access token,
            пароль БД
```

- **GitHub → Variables** — то, что должно попасть в браузер (URL Supabase и его
  publishable-ключ). Видно всем, это нормально.
- **GitHub → Secrets** — служебные ключи, которыми GitHub Actions деплоит бэкенд
  (токен Supabase, ref проекта, пароль БД, ключ DeepSeek). В браузер не попадают.
- **Supabase → Edge Functions → Secrets** — рабочая копия `AI_API_KEY`. Её туда
  автоматически кладёт workflow `Deploy Supabase backend`, руками ничего не надо.

### Куда НЕ надо ничего вставлять

- `service_role` / `SUPABASE_SECRET_KEY` — функции получают его сами, а во фронтенд
  и в GitHub он попадать не должен.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase сам
  прокидывает их в edge-функции.
- Любые `LOVABLE_*` — их больше не существует в проекте.

## TL;DR — минимум для первого теста

Нужно **6 значений**. Пять кладутся в GitHub, одно — секретом функций.

| # | Значение | Куда | Тип |
| --- | --- | --- | --- |
| 1 | `SUPABASE_ACCESS_TOKEN` | GitHub → Secrets | секрет |
| 2 | `SUPABASE_PROJECT_REF` = `ymceuebfejaemtaxlatc` | GitHub → Secrets | секрет |
| 3 | `SUPABASE_DB_PASSWORD` | GitHub → Secrets | секрет |
| 4 | `AI_API_KEY` (DeepSeek) | GitHub → Secrets | секрет |
| 5 | `VITE_SUPABASE_URL` | GitHub → Variables | публично |
| 6 | `VITE_SUPABASE_PUBLISHABLE_KEY` | GitHub → Variables | публично |

Дальше: **Actions → Deploy Supabase backend → Run workflow** (применит миграции,
проставит секреты функций, выложит 10 функций) → **Actions → Deploy to GitHub
Pages → Run workflow** (пересоберёт фронтенд с ключами).

---

## 1. Что где лежит

```
GitHub repo (OlehHavrilko/verifypromtsAI)
├── Variables (видны всем, попадают в JS-бандл)
│   ├── VITE_SUPABASE_URL              → в браузер
│   ├── VITE_SUPABASE_PUBLISHABLE_KEY  → в браузер
│   ├── VITE_SITE_URL                  → в браузер (canonical/OG, опционально)
│   ├── APP_SITE_URL                   → в Supabase secrets (Stripe redirect)
│   └── AI_MODEL                       → в Supabase secrets (deepseek-chat)
└── Secrets (шифруются, в бандл не попадают)
    ├── SUPABASE_ACCESS_TOKEN          → GitHub Actions деплоит бэкенд
    ├── SUPABASE_PROJECT_REF           → GitHub Actions знает, куда деплоить
    ├── SUPABASE_DB_PASSWORD           → GitHub Actions применяет миграции
    └── AI_API_KEY                     → в Supabase secrets (LLM-вызовы)

Supabase project ymceuebfejaemtaxlatc → Settings → Edge Functions → Secrets
├── AI_API_KEY            (из GitHub secret, ставит workflow)
├── AI_MODEL              (из GitHub variable, ставит workflow)
├── AI_JUDGE_MODEL        (опционально, eval-судья)
├── AI_VISION_*           (опционально, анализ изображений)
├── APP_SITE_URL          (опционально, Stripe)
└── STRIPE_*              (опционально, при включённой монетизации)
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` и `SUPABASE_SERVICE_ROLE_KEY` edge-функциям
подставляет сам Supabase — их никуда добавлять не нужно. `LOVABLE_*` больше нет.

---

## 2. Supabase: где взять каждое значение

| Значение | Где взять |
| --- | --- |
| **Project ref** — `ymceuebfejaemtaxlatc` | URL дашборда `supabase.com/dashboard/project/ymceuebfejaemtaxlatc`, либо **Project Settings → General → Reference ID** |
| **Project URL** — `https://ymceuebfejaemtaxlatc.supabase.co` | **Project Settings → API → Project URL** |
| **Publishable key** — `sb_publishable_…` | **Project Settings → API Keys → Publishable key** (для старых проектов — legacy `anon` в **Settings → API**) |
| **DB password** — придуман при создании проекта | **Project Settings → Database → Database password**; если забыт — там же *Reset database password*. Восстановить старый нельзя |
| **Access token** — `sbp_…` | [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) → **Generate new token**, имя `github-actions`, срок любой |

> ⚠️ `service_role` / `secret` key нужен только серверным функциям и **не** должен
> попадать ни в GitHub, ни во фронтенд. Инъекция уже встроена в edge runtime.

## 3. DeepSeek: ключ

1. [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) → **Create API key** → `sk-…` (показывается один раз).
2. Проверьте ключ локально до деплоя:

   ```bash
   AI_API_KEY=sk-... npm run test:deepseek
   ```

   Скрипт печатает модели, задержку и расход токенов. Зелёный результат = ключ
   рабочий, его же кладём в GitHub secret `AI_API_KEY`.
3. Баланс: [platform.deepseek.com/top_up](https://platform.deepseek.com/top_up). Без
   него `generate-prompt` вернёт `402 — insufficient credits`.

---

## 4. Куда класть в GitHub

**Settings → Secrets and variables → Actions.** Отдельно две вкладки:
**Variables** (открытые) и **Secrets** (зашифрованные).

### Variables (вкладка Variables)

| Имя | Значение |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://ymceuebfejaemtaxlatc.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
| `VITE_SITE_URL` | `https://olehhavrilko.github.io/verifypromtsAI` |
| `APP_SITE_URL` | `https://olehhavrilko.github.io/verifypromtsAI` (без слэша) |
| `AI_MODEL` | `deepseek-chat` (или `deepseek-reasoner`) |
| `VITE_STRIPE_PRODUCT_PRO`, `VITE_STRIPE_PRICE_PRO`, `VITE_STRIPE_PRODUCT_BUSINESS`, `VITE_STRIPE_PRICE_BUSINESS` | только если включаете Stripe |

### Secrets (вкладка Secrets)

| Имя | Значение |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | `sbp_…` |
| `SUPABASE_PROJECT_REF` | `ymceuebfejaemtaxlatc` |
| `SUPABASE_DB_PASSWORD` | пароль БД из шага 2 |
| `AI_API_KEY` | `sk-…` DeepSeek |
| `AI_VISION_API_KEY` | опционально: ключ vision-провайдера |
| `STRIPE_SECRET_KEY` | опционально: `sk_live_…` / `sk_test_…` |

Через CLI (если `gh` залогинен):

```bash
gh variable set VITE_SUPABASE_URL --body "https://ymceuebfejaemtaxlatc.supabase.co"
gh variable set VITE_SUPABASE_PUBLISHABLE_KEY --body "sb_publishable_..."
gh variable set VITE_SITE_URL --body "https://olehhavrilko.github.io/verifypromtsAI"
gh variable set APP_SITE_URL --body "https://olehhavrilko.github.io/verifypromtsAI"
gh variable set AI_MODEL --body "deepseek-chat"

gh secret set SUPABASE_ACCESS_TOKEN --body "sbp_..."
gh secret set SUPABASE_PROJECT_REF --body "ymceuebfejaemtaxlatc"
gh secret set SUPABASE_DB_PASSWORD
gh secret set AI_API_KEY
```

---

## 5. Порядок действий, чтобы всё завелось

1. **GitHub → Settings → Secrets and variables → Actions**: добавьте 4 секрета и
   2 обязательные переменные из TL;DR.
2. **Actions → Deploy Supabase backend → Run workflow**: миграции → секреты
   функций (`AI_API_KEY`, `AI_MODEL`, `APP_SITE_URL`) → 10 edge-функций.
3. **Actions → Deploy to GitHub Pages → Run workflow**: пересборка фронтенда,
   чтобы `VITE_SUPABASE_*` попали в бандл.
4. **Supabase → Authentication → URL Configuration**:
   - Site URL: `https://olehhavrilko.github.io/verifypromtsAI/`
   - Redirect URLs: добавьте этот же адрес и `http://localhost:8080`
5. Для быстрого теста выключите подтверждение почты:
   **Authentication → Sign In / Providers → Email → Confirm email → off**.
6. Откройте сайт → **Войти** → регистрация → генератор. Если генерация вернула
   ошибку, смотрите **Supabase → Edge Functions → Logs** и
   **GitHub Actions → Deploy Supabase backend**.
7. (Опционально) первый админ — SQL Editor:

   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin'::app_role from auth.users where email = 'you@example.com'
   on conflict do nothing;
   ```

---

## 6. Что публичное, а что нет

| Значение | Публичное? | Почему |
| --- | --- | --- |
| Project URL, project ref | да | видно в URL сайта, не является секретом |
| Publishable / anon key | да | защищён RLS; безопасен для браузера |
| `VITE_*` переменные | да | попадают в JS-бандл |
| DB password, access token | **нет** | полный доступ к проекту |
| `AI_API_KEY`, `STRIPE_SECRET_KEY`, `service_role` | **нет** | деньги и обход RLS |

Правило: всё с префиксом `VITE_` живёт в Variables; всё, что даёт полный доступ или
тратит деньги, — только в Secrets.

## 7. Если что-то не работает

| Симптом | Причина / где смотреть |
| --- | --- |
| Баннер «Supabase не настроен» | не заданы `VITE_SUPABASE_*` или Pages не пересобирался после их добавления |
| `Create Pages site failed` в Actions | Pages не включён: Settings → Pages → Source = GitHub Actions |
| `supabase link` падает в workflow | неверный `SUPABASE_ACCESS_TOKEN` / `SUPABASE_PROJECT_REF` / `SUPABASE_DB_PASSWORD` |
| `402` при генерации | нет баланса на DeepSeek |
| `502 AI provider rejected the configured API key` | `AI_API_KEY` не проставлен в секреты функций; проверьте `npm run test:deepseek` и перезапустите workflow |
| `401` при логине | в Auth Redirect URLs нет адреса Pages |
| Пустой список сохранённых промптов после входа | миграции не применены (`Deploy Supabase backend`) |

Локальная альтернатива всему этому — [SETUP.md](SETUP.md), раздел про Supabase CLI.
