# Deploy CDT on a VPS (Docker Compose + Nginx)

## Purpose

Concrete configuration checklist to run CDT on a Linux VPS (Ubuntu 22.04/24.04 recommended): PostgreSQL, Nest API, static web, TLS reverse proxy.

## Audience

Ops / DevOps / technical lead.

## Scope

Single-host production-like deploy. Alternatives already documented: local Docker ([DOCKER_COMPOSE.md](./DOCKER_COMPOSE.md)), hosted web on Vercel + API on Render (root `README.md`).

---

## 1. Target architecture

```text
Internet
   │
   ▼
Nginx (443 TLS) ──► /           → web static (nginx or container)
                 ──► /api/      → api:3000  (NestJS)
                                  │
                                  ▼
                               postgres:5432
```

Recommended layout on the host:

```text
/opt/cdt/
  repo/                 # git clone
  .env                  # secrets (not in git)
  docker-compose.prod.yml
  nginx/cdt.conf
  backups/
```

---

## 2. VPS sizing (starting point)

| Resource | Minimum | Comfortable |
|----------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Disk | 40 GB SSD | 80 GB+ (backups) |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| Network | Public IPv4 + DNS A/AAAA | |

Open ports: **22** (SSH, key-only), **80**, **443**. Do **not** expose Postgres publicly.

---

## 3. Host packages

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git curl
sudo usermod -aG docker $USER   # re-login
```

Optional: install Node 20+ on the host only if you build outside Compose.

---

## 4. DNS & TLS

1. Point `cdt.example.com` (and optional `api.cdt.example.com`) to the VPS IP.  
2. Prefer **one hostname**: SPA at `https://cdt.example.com`, API at `https://cdt.example.com/api/`.  
3. Issue certificates with Certbot (`nginx` plugin) or terminate TLS at your cloud LB.

---

## 5. Environment variables

Create `/opt/cdt/.env` (never commit):

```bash
# --- Postgres ---
POSTGRES_USER=cdt
POSTGRES_PASSWORD=<strong-random>
POSTGRES_DB=cdt
DATABASE_URL=postgresql://cdt:<strong-random>@postgres:5432/cdt?schema=public

# --- API ---
NODE_ENV=production
PORT=3000
JWT_ACCESS_SECRET=<random-min-32-chars>
JWT_REFRESH_SECRET=<different-random-min-32-chars>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
CORS_ORIGIN=https://cdt.example.com
SEED_ADMIN_EMAIL=admin@yourcompany.com
SEED_ADMIN_PASSWORD=<strong-admin-password>
SEED_DEMO_PASSWORD=<optional>

# --- Web build (bake at image build time) ---
VITE_API_BASE_URL=https://cdt.example.com/api/v1
```

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Must reach Postgres from API container |
| `JWT_*_SECRET` | Yes | Unique per environment; rotate after leak |
| `CORS_ORIGIN` | Yes | Exact SPA origin (scheme + host, no trailing slash) |
| `VITE_API_BASE_URL` | Yes | Must include `/api/v1`; embedded at **build** |
| `SEED_ADMIN_*` | Yes for first seed | Foundation admin |

---

## 6. Example `docker-compose.prod.yml`

```yaml
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - cdt_pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10
    # no public ports

  api:
    build:
      context: ./repo
      dockerfile: apps/api/Dockerfile   # add if missing; or use a generic Node image + start script
    restart: unless-stopped
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
    expose:
      - "3000"
    command: >
      sh -c "pnpm --filter @cdt/api exec prisma migrate deploy &&
             pnpm --filter @cdt/api exec tsx prisma/seed-prod.ts &&
             node apps/api/dist/main.js"

  web:
    build:
      context: ./repo
      dockerfile: apps/web/Dockerfile
      args:
        VITE_API_BASE_URL: ${VITE_API_BASE_URL}
    restart: unless-stopped
    expose:
      - "80"

  proxy:
    image: nginx:1.27-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/cdt.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - web
      - api

volumes:
  cdt_pg_data:
```

> If Dockerfiles are not in-repo yet, build artifacts on CI/host (`pnpm build`), then run `node dist/main.js` and serve `apps/web/dist` with Nginx—same env rules apply.

---

## 7. Nginx sketch (`nginx/cdt.conf`)

```nginx
server {
  listen 80;
  server_name cdt.example.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name cdt.example.com;

  ssl_certificate     /etc/letsencrypt/live/cdt.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/cdt.example.com/privkey.pem;

  # SPA
  location / {
    proxy_pass http://web:80;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Nest API (app mounts /api/v1)
  location /api/ {
    proxy_pass http://api:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location = /health {
    proxy_pass http://api:3000/health;
  }
}
```

If the SPA and API use **different origins**, skip path proxying; set `CORS_ORIGIN` to the SPA origin and `VITE_API_BASE_URL` to the public API URL.

---

## 8. Deploy sequence

1. Clone repo to `/opt/cdt/repo`.  
2. Write `.env` and Nginx config.  
3. Build shared packages + API + web (`pnpm install`, build filters, or Compose build).  
4. `docker compose -f docker-compose.prod.yml up -d postgres` → wait healthy.  
5. Run `prisma migrate deploy` (or let API start command do it).  
6. Run **seed-prod** once (admin + lookups). Full demo seed only if you want sample portfolio.  
7. Start `api`, `web`, `proxy`.  
8. Issue/renew TLS certificates.  
9. Smoke test checklist below.

Update flow: `git pull` → rebuild images → `migrate deploy` → rolling restart API then web.

---

## 9. Post-deploy smoke checklist

| Check | Expected |
|-------|----------|
| `GET https://cdt.example.com/health` | `{"status":"ok",...}` |
| Open SPA | Login page loads over HTTPS |
| Login as admin | Dashboard |
| Login as Delivery Owner / Account Owner | Correct nav (Approvals for AO) |
| Create test employee (non-prod) | `CD-` assigned |
| Browser network | API calls go to `/api/v1` without CORS errors |
| Postgres | Not reachable from public internet |

---

## 10. Backups & ops

- Nightly `pg_dump` to `/opt/cdt/backups/` (retain ≥ 7–30 days).  
- Test restore on a scratch DB quarterly.  
- Monitor disk, API logs, and `/health`.  
- Optional: Prometheus/Grafana profile from [DOCKER_COMPOSE.md](./DOCKER_COMPOSE.md).

---

## 11. Security hardening

- SSH keys only; disable password auth.  
- Firewall: allow 22/80/443 only.  
- Strong unique JWT secrets and DB password.  
- Restrict Swagger (`/api/docs`) in production if not needed.  
- Keep `CORS_ORIGIN` tight.  
- Do not commit `.env` or `credential.md` with real secrets.

---

## 12. Configuration summary (copy/paste)

| Layer | What you must configure |
|-------|-------------------------|
| DNS | A/AAAA → VPS |
| TLS | Certificate for SPA host |
| Postgres | User, password, volume, no public port |
| API | `DATABASE_URL`, JWT secrets, `CORS_ORIGIN`, `PORT` |
| Web build | `VITE_API_BASE_URL` |
| Seed | Admin email/password on first boot |
| Reverse proxy | Route `/` → web, `/api/` → API, `/health` → API |

---

## References

- [SEED_AND_MIGRATION.md](./SEED_AND_MIGRATION.md)
- [DOCKER_COMPOSE.md](./DOCKER_COMPOSE.md)
- [DEPLOY_V1.md](./DEPLOY_V1.md) (shorter overview)
- [../13-monorepo/ENV_AND_VERSIONING.md](../13-monorepo/ENV_AND_VERSIONING.md)
- [../11-security/OWASP_AND_SECRETS.md](../11-security/OWASP_AND_SECRETS.md)
- Root [README.md](../../README.md) — Vercel + Render alternative
