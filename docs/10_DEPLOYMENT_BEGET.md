# 10. Beget VPS Deployment

## Статус и границы

Документ описывает подготовку QuoteFlow к deployment на существующий Beget VPS. Он не разрешает и не выполняет deployment автоматически.

Согласовано:

- публичный репозиторий `stalar78/quoteflow-demo` существовал с момента создания;
- MIT License: `Copyright (c) 2026 Stanislav Larin (Stalar Vision)`;
- адрес `https://quoteflow.stalarvision.ru/`;
- Docker Compose публикует только frontend на `127.0.0.1:8081`;
- backend доступен только внутри Docker network;
- TLS и Internet ingress обеспечивает системный Nginx;
- `site-stalarvision` не изменяется;
- deployment разрешается только после отдельной проверки ресурсов и полного audit.

## Топология

```text
Internet
  -> system Nginx :443 / TLS
  -> 127.0.0.1:8081
  -> frontend container (unprivileged Nginx :8080)
  -> backend:8000 over Docker bridge network
  -> backend container (unprivileged FastAPI)
```

Backend не публикует host port. Порт `8081` не открывается в UFW и недоступен с внешнего интерфейса.

## Подготовленные файлы

- `compose.production.yaml` — отдельный hardened production Compose;
- `.env.production.example` — безопасный шаблон без secrets;
- `deploy/nginx/quoteflow.http.conf` — временный HTTP vhost для первого Certbot issuance;
- `deploy/nginx/quoteflow.https.conf` — финальный HTTPS vhost с rate limiting и security headers;
- `LICENSE` — MIT License проекта.

Локальный `compose.yaml` и порт `127.0.0.1:8080` сохраняются для development/QA.

## Environment requirements

До deployment владелец проверяет сервер, ничего не устанавливая и не удаляя:

```bash
uname -a
lsb_release -a
free -h
df -h /
swapon --show
docker version
docker compose version
docker info
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker system df
sudo nginx -v
sudo nginx -T >/tmp/nginx-before-quoteflow.txt
sudo certbot certificates
sudo ss -ltnp
sudo ufw status verbose
getent hosts quoteflow.stalarvision.ru
```

Перед продолжением требуется:

- поддерживаемая Ubuntu и работающий Docker Engine с Compose plugin;
- работающий system Nginx и Certbot;
- свободный `127.0.0.1:8081`;
- минимум 5 GiB свободного диска для build/image/rollback reserve;
- достаточная available RAM для одновременного Node/Python image build; при низком запасе сначала согласовать swap или build вне VPS;
- DNS `A`/`AAAA` поддомена указывает только на этот VPS;
- текущие Nginx configs и certificates сохранены;
- нет конфликтующего `server_name quoteflow.stalarvision.ru`;
- рабочий каталог QuoteFlow отделён от каталога `site-stalarvision`.

Порог RAM намеренно не зафиксирован до просмотра фактической нагрузки сервера. Resource limits контейнеров добавляются только после этого review.

## Production environment

На сервере создать `.env.production` из примера и заменить image tag полным reviewed Git SHA:

```text
COMPOSE_PROJECT_NAME=quoteflow
QUOTEFLOW_IMAGE_TAG=<reviewed-full-git-sha>
QUOTEFLOW_FRONTEND_BIND=127.0.0.1:8081
QUOTEFLOW_CORS_ALLOW_ORIGINS=https://quoteflow.stalarvision.ru
QUOTEFLOW_REQUEST_SIZE_LIMIT_BYTES=262144
```

Файл `.env.production` не коммитится. QuoteFlow не требует application secrets, database credentials или persistent volumes.

## Pre-deployment audit

Выполнить до первого `up`:

1. `git status --short` пустой, HEAD совпадает с reviewed merge commit.
2. GitHub Actions для merge commit зелёный.
3. `npm ci`, frontend tests/build/lint, `npm audit`, `npm audit --omit=dev` проходят.
4. Backend tests/import/wheel smoke и `pip-audit` проходят.
5. Gitleaks выполняет полный `--log-opts=--all` scan с `--redact`.
6. GitHub Secret Scanning и Push Protection включены.
7. `docker compose --env-file .env.production -f compose.production.yaml config --quiet` проходит.
8. Production images собираются с `--pull`; Docker Scout Critical/High findings рассмотрены без automatic force-fix.
9. В repository/history/images нет credentials, private keys, реальных данных или generated PDFs.
10. CORS содержит только `https://quoteflow.stalarvision.ru`.

## Контролируемый первый запуск — только после отдельного разрешения

```bash
cd /home/stanislav/project/quoteflow
git fetch --ff-only origin main
git checkout main
git pull --ff-only origin main
git status --short
git rev-parse HEAD

docker compose --env-file .env.production -f compose.production.yaml config --quiet
docker compose --env-file .env.production -f compose.production.yaml build --pull
docker compose --env-file .env.production -f compose.production.yaml up -d --wait
```

До подключения system Nginx проверить loopback:

```bash
curl --fail --silent --show-error http://127.0.0.1:8081/ >/dev/null
curl --fail --silent --show-error http://127.0.0.1:8081/api/health
docker compose --env-file .env.production -f compose.production.yaml ps
docker compose --env-file .env.production -f compose.production.yaml port backend 8000
```

Последняя команда не должна возвращать host endpoint.

## TLS и system Nginx

1. Скопировать только bootstrap config в новый отдельный vhost QuoteFlow.
2. Выполнить `sudo nginx -t` и только затем reload.
3. Получить отдельный certificate через `sudo certbot --nginx -d quoteflow.stalarvision.ru`.
4. Убедиться, что certificate paths существуют.
5. Заменить bootstrap vhost финальным reviewed HTTPS config.
6. Снова выполнить `sudo nginx -t`, reload и public smoke.

Не редактировать vhost, каталог или deployment существующего `site-stalarvision`.

## Health-check plan

### На уровне контейнеров

- backend: `GET /api/health` внутри container;
- frontend: `GET /` внутри container;
- `restart: unless-stopped` применяется только к process failure;
- Docker health status проверяется через `docker compose ps` и `docker inspect`.

### На уровне host

- `curl http://127.0.0.1:8081/`;
- `curl http://127.0.0.1:8081/api/health`;
- проверка отсутствия host port backend;
- проверка Nginx error/access logs без request bodies.

### На публичном уровне

- HTTPS certificate и redirect HTTP -> HTTPS;
- `/`, `/api/health`, calculation preview и PDF;
- malformed JSON, unknown field, oversized body и `429 RATE_LIMITED`; 
- security headers, cache policy, fixed PDF filename и request ID;
- responsive/browser QA и axe scan.

Важно: Docker healthcheck сам по себе не является внешним monitoring. После стабильного запуска отдельно согласовать uptime monitor; не добавлять внешнюю отправку автоматически.

## Rollback

Перед rollout записать:

- текущий Git SHA;
- текущий `QUOTEFLOW_IMAGE_TAG`; 
- image digests frontend/backend;
- копию активного Nginx vhost;
- вывод `docker compose ps`.

Production images помечаются reviewed Git SHA и не удаляются до завершения post-deploy QA.

Rollback приложения:

1. Вернуть предыдущий `QUOTEFLOW_IMAGE_TAG` в `.env.production`.
2. Выполнить `docker compose --env-file .env.production -f compose.production.yaml up -d --no-build --wait`.
3. Проверить loopback health и public HTTPS.

Rollback Nginx:

1. Восстановить сохранённый QuoteFlow vhost или временно отключить только его symlink.
2. Выполнить `sudo nginx -t`.
3. Выполнить `sudo systemctl reload nginx`.

Не выполнять `docker system prune`, не удалять предыдущие images и не изменять конфигурацию `site-stalarvision` во время rollback.

## Acceptance criteria

- только system Nginx слушает public `80/443`; 
- QuoteFlow frontend доступен на host только через `127.0.0.1:8081`; 
- backend не имеет host/public port;
- оба container healthy и non-root;
- приложение доступно по `https://quoteflow.stalarvision.ru/`; 
- CORS exact, rate limiting и safe error envelopes проверены;
- JSON/CSV, API preview, browser print и server PDF работают;
- logs не содержат request bodies или пользовательский текст;
- rollback проверен хотя бы до уровня config/image selection;
- `site-stalarvision` не изменён.
