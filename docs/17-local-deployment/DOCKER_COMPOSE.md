# Docker Compose — CDT

## Purpose

Define local/V1 Compose services for Postgres and optional observability sidecars.

## Audience

Developers, ops.

## Scope

`docker/docker-compose.yml` (planned). Application containers optional for V1; Postgres is mandatory.

## Definitions

| Term | Definition |
|------|------------|
| Service | Compose unit (`postgres`, `api`, `web`, `prometheus`, …) |

---

## 1. Recommended services

| Service | Image | Host port | Purpose |
|---------|-------|-----------|---------|
| `postgres` | `postgres:16` | 5434→5432 | Primary DB (5434 avoids SST on 5433) |
| `api` | build `@cdt/api` | 3000 | Nest API (optional in compose) |
| `web` | nginx/static or Vite preview | 5173/80 | SPA (optional) |
| `prometheus` | prom/prometheus | 9090 | Metrics |
| `grafana` | grafana/grafana | 3001 | Dashboards |
| `loki` | grafana/loki | 3100 | Logs |

---

## 2. Compose sketch

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: cdt
      POSTGRES_PASSWORD: cdt
      POSTGRES_DB: cdt
    ports:
      - "5434:5432"
    volumes:
      - cdt_pg:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cdt -d cdt"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  cdt_pg:
```

Extend with `api`/`web` when Dockerfiles exist. Keep JWT and DB passwords out of git — use `env_file: .env`.

---

## 3. Networking

- API connects via `DATABASE_URL` using host `localhost:5434` from the host machine, or `postgres:5432` from another Compose service.
- Web calls API via `VITE_API_BASE_URL` / runtime config.

---

## 4. Profiles

| Profile | Includes |
|---------|----------|
| default | postgres |
| `obs` | prometheus, grafana, loki |
| `full` | api + web + postgres + obs |

```bash
docker compose -f docker/docker-compose.yml --profile obs up -d
```

---

## 5. Data safety

- `docker compose down` keeps volume  
- `down -v` **wipes** DB — local only  
- Never wipe shared UAT without backup  

---

## References

- [LOCAL_SETUP.md](./LOCAL_SETUP.md)
- [../18-monitoring/OBSERVABILITY.md](../18-monitoring/OBSERVABILITY.md)
- [DEPLOY_V1.md](./DEPLOY_V1.md)
