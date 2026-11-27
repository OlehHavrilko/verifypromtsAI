# PromptForge (verifypromtsAI)

Веб-приложение для конструирования, оценки и переиспользования AI-промптов.
Собственный проект: фронтенд — статический бандл на GitHub Pages, бэкенд — свой
проект Supabase (Postgres + Auth + Edge Functions), LLM-вызовы идут через любой
OpenAI-совместимый провайдер с вашим ключом.

> Приложение собрано как самостоятельная кодовая база: никакой Lovable-инфраструктуры
> (`lovable-tagger`, брокер авторизации Lovable, AI-gateway Lovable) в нём нет.

---

## Что умеет

| Раздел | Возможности |
| --- | --- |
| **Генератор** | Промпт из идеи с настройками длины, тона, стиля и целевой модели; стриминг ответа |
| **Оценка** | Скоринг промпта по 5 критериям (ясность, конкретность, структура, контекст, применимость) + улучшенная версия |
| **Чат** | Итеративное улучшение промптов в диалоге |
| **Изображения** | Анализ картинки vision-моделью и подсказки для промпта |
| **Текстовые инструменты** | «Очеловечивание» текста и детекция AI-текста |
| **Библиотека** | Сохранённые промпты, теги, коллекции, избранное, импорт/экспорт |
| **История и лимиты** | История генераций, дневные/месячные лимиты по тарифу |
| **Админка** | Реестр ключей, версии системных промптов, eval-наборы и прогоны, наблюдаемость LLM-трейсов |
| **Монетизация (опционально)** | Stripe Checkout + Customer Portal, тарифы Free / Pro / Business |
| **Прочее** | Три языка (en/ru/ua), тёмная/светлая тема, PWA-дружелюбная вёрстка |

---

## Стек

- **Frontend:** React 18, TypeScript, Vite 5, Tailwind CSS, shadcn/ui (Radix), Zustand, React Router
- **Backend:** Supabase (Postgres + RLS, Auth, 10 Edge Functions на Deno)
- **LLM:** DeepSeek API по умолчанию; подойдёт любой OpenAI-совместимый endpoint (OpenAI, OpenRouter, Groq, Gemini compat, локальный vLLM)
- **Хостинг:** GitHub Pages (статика) + GitHub Actions (CI и деплой)
- **Платежи (опционально):** Stripe

---

## Быстрый старт

```bash
npm install
cp .env.example .env      # вписать URL и publishable key своего Supabase
npm run dev               # http://localhost:8080
```

Бэкенд поднимается отдельно — см. **[SETUP.md](SETUP.md)**:

1. создать свой проект Supabase;
2. `supabase db push` — применить миграции из `supabase/migrations`;
3. `supabase functions deploy` — выложить edge-функции;
4. `supabase secrets set AI_API_KEY=...` и остальные секреты.

Без настроенного Supabase приложение всё равно открывается, но показывает баннер
«Supabase не настроен» и не может выполнять запросы к данным.

### Скрипты

```bash
npm run dev        # dev-сервер Vite (порт 8080)
npm run build      # production-сборка в dist/
npm run preview    # локальный просмотр сборки
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
npm run test:validate
```

---

## Архитектура

```
src/
├── components/            # UI: генератор, скоринг, настройки, shadcn/ui
├── hooks/                 # useAuth, useSubscription, useUsageLimits, useIsAdmin
├── integrations/supabase/ # клиент Supabase + сгенерированные типы БД
├── lib/                   # i18n, stripes, store, утилиты
└── pages/                 # роуты приложения и публичные страницы

supabase/
├── functions/             # edge-функции (Deno)
│   ├── _shared/ai.ts      # единый OpenAI-совместимый клиент + конфиг
│   ├── _shared/trace.ts   # телеметрия LLM и реестр системных промптов
│   └── */index.ts         # generate/score/enhance/chat/text-tools/analyze-image/run-eval/Stripe
├── migrations/            # схема БД, RLS, триггеры, RPC
└── config.toml            # локальная конфигурация Supabase CLI

.github/workflows/
├── ci.yml                 # lint + typecheck + тесты + build на push/PR
├── deploy-pages.yml       # сборка и публикация на GitHub Pages
└── supabase.yml           # ручной деплой миграций и функций
```

### Как устроены AI-вызовы

Все функции используют один модуль `supabase/functions/_shared/ai.ts`:

| Секрет | Назначение | По умолчанию |
| --- | --- | --- |
| `AI_API_KEY` | ключ DeepSeek API (обязателен) | — |
| `AI_BASE_URL` | OpenAI-совместимый endpoint | `https://api.deepseek.com/v1` |
| `AI_MODEL` | модель по умолчанию | `deepseek-chat` |
| `AI_PROVIDER` | метка провайдера в трейсах | `deepseek` |
| `AI_JUDGE_MODEL` | модель-судья для eval-прогонов | = `AI_MODEL` |
| `AI_VISION_MODEL`, `AI_VISION_BASE_URL`, `AI_VISION_API_KEY` | vision-провайдер для анализа изображений (у DeepSeek vision-модели нет) | = `AI_*` |

Пользователь может подключить и свой ключ (OpenAI / Anthropic / OpenRouter) в
**Settings → AI-провайдеры** — тогда `generate-prompt` маршрутизирует запрос
напрямую к выбранному провайдеру.

---

## Деплой

- **Фронтенд:** GitHub Actions собирает Vite-бандл и публикует его на GitHub Pages
  (`.github/workflows/deploy-pages.yml`). Подробности и настройка домена —
  [DEPLOYMENT.md](DEPLOYMENT.md).
- **Бэкенд:** свой проект Supabase, деплой миграций и функций — вручную или через
  `supabase.yml` (`workflow_dispatch`).
- **Секреты:** публичные ключи фронтенда — переменные репозитория
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`), серверные ключи — secrets
  Supabase, токены деплоя — secrets GitHub.

Пошаговая инструкция: **[SETUP.md](SETUP.md)**.

---

## Лицензия

MIT.
