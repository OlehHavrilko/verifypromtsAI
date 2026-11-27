# Деплой на GitHub Pages

Фронтенд — статический бандл Vite, который публикуется на GitHub Pages из
GitHub Actions. Бэкенд (Supabase) живёт отдельно и деплоится своим workflow или
локально через CLI — см. [SETUP.md](SETUP.md).

---

## Как это устроено

```
push в main
  ├─ ci.yml            → lint + typecheck + тесты + build (проверка)
  └─ deploy-pages.yml  → build → dist/ → 404.html + .nojekyll → GitHub Pages
```

`deploy-pages.yml`:

1. ставит зависимости (`npm ci`) и собирает приложение с
   `VITE_BASE_PATH=/<имя-репозитория>/`;
2. дописывает `dist/404.html` и `dist/.nojekyll`
   (`scripts/build-pages-fallback.mjs`);
3. включает Pages (source: GitHub Actions) и публикует артефакт;
4. адрес сайта — `https://<user>.github.io/<repo>/`.

Переменные окружения фронтенда берутся из **преременных репозитория**
(Settings → Secrets and variables → Actions → Variables): `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, опционально `VITE_SITE_URL` и `VITE_STRIPE_*`.
Это публичные значения, они попадают в бандл — секретов там быть не должно.

---

## SPA-роутинг

GitHub Pages — статический хостинг, поэтому прямые ссылки вида
`/verifypromtsAI/pricing` он отдаёт как 404. Используется стандартная схема:

- `404.html` перехватывает запрос и редиректит на
  `/<repo>/?redirect=<исходный путь>`;
- инлайн-скрипт в `index.html` до старта React восстанавливает путь через
  `history.replaceState`;
- `BrowserRouter` работает с `basename = import.meta.env.BASE_URL`.

Если хостите на своём домене (root), сборка с пустым `VITE_BASE_PATH` даёт
корректные `/pricing` и т. п.

---

## Свой домен

1. **Settings → Pages → Custom domain** → `promptforge.example.com`.
2. В DNS: `CNAME promptforge.example.com → <user>.github.io`.
3. В `public/` положите файл `CNAME` с доменом (иначе Pages может сбросить его).
4. Соберите без подпути: в `deploy-pages.yml` замените
   `VITE_BASE_PATH: /${{ github.event.repository.name }}/` на `VITE_BASE_PATH: /`,
   добавьте `VITE_SITE_URL: https://promptforge.example.com`.
5. В Supabase Auth обновите Site URL / Redirect URLs, в Supabase secrets —
   `APP_SITE_URL`.

---

## Ручной запуск

Actions → **Deploy to GitHub Pages** → *Run workflow*. Полезно после изменения
переменных репозитория: они применяются только при новой сборке.

## Троблшутинг

| Симптом | Причина / решение |
| --- | --- |
| Страница 404 сразу после деплоя | Pages ещё не включён: Settings → Pages → Source = GitHub Actions, перезапустите workflow |
| Пустой экран, в консоли ошибка Supabase | Не заданы `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (или сборка сделана до их добавления) |
| Прямые ссылки 404 | Не сгенерирован `dist/404.html` — проверьте шаг «Add SPA fallback» |
| Ассеты 404 | Неверный `VITE_BASE_PATH`: для project-сайта обязателен `/<repo>/` |
| Логин не возвращает в приложение | В Supabase Auth Site URL не совпадает с Pages-адресом |
| Stripe возвращает на `localhost` | Не задан `APP_SITE_URL` в секретах Supabase |
| `Resource not accessible by integration` при включении Pages | Включите Pages вручную: Settings → Pages → Source = GitHub Actions |

---

## Откат

Pages хранит историю деплоев: Actions → нужный run → *Redeploy*, либо
`git revert` и обычный push. Бэкенд откатывается миграциями Supabase — они
применяются только вручную через `supabase.yml` / `supabase db push`.
