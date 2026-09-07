# Local Setup — CDT

## Purpose

Bring up CDT for development once application packages exist. Until then, this is the **target** bootstrap.

## Audience

Developers.

## Scope

Windows/macOS/Linux with Docker Desktop + pnpm. Ports aligned with monorepo docs.

## Definitions

| Term | Definition |
|------|------------|
| Seed | Prisma seed creating admin, roles sample, lookups, optional July fixtures |

---

## 1. Prerequisites

| Tool | Notes |
|------|-------|
| Node.js LTS (22+) | engines field when set |
| pnpm | via corepack |
| Docker Desktop | Postgres (+ optional monitoring) |
| Git | clone monorepo |

---

## 2. First-time setup

```bash
cd CDT_v1_monorepo
cp .env.example .env
# edit SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / JWT secrets

docker compose -f docker/docker-compose.yml up -d postgres

pnpm install
pnpm --filter @cdt/shared-types build
pnpm --filter @cdt/shared-utils build
pnpm --filter @cdt/api prisma:generate
pnpm --filter @cdt/api exec prisma migrate dev --name init
pnpm --filter @cdt/api prisma:seed

pnpm dev
```

| Piece | URL |
|-------|-----|
| Web | http://localhost:5173 |
| API | http://localhost:3000 |
| Health | http://localhost:3000/health |
| Swagger | http://localhost:3000/api/docs |
| Postgres host port | **5434** (avoids SST Compose on 5433) |

`pnpm dev` runs Turbo for `@cdt/api` and `@cdt/web`.

---

## 3. Common failures

| Symptom | Fix |
|---------|-----|
| Cannot find `@cdt/shared-types` | Build shared packages first |
| Seed throws | Set `SEED_ADMIN_*` in `.env` |
| Port clash with SST | Use Compose mapped **5434** |
| Prisma migrate drift | Reset local DB only (`down -v`) — never on shared envs |

---

## 4. Useful scripts (planned)

| Script | Purpose |
|--------|---------|
| `pnpm dev` | API + Web |
| `pnpm build` | All packages |
| `pnpm test` | Unit tests |
| `pnpm --filter @cdt/api prisma:studio` | DB UI |

---

## 5. Docs-first note

Phase A may have **no** `apps/` yet. Use this doc as the contract for scaffolding; do not invent alternate ports or package names.

---

## References

- [DOCKER_COMPOSE.md](./DOCKER_COMPOSE.md)
- [SEED_AND_MIGRATION.md](./SEED_AND_MIGRATION.md)
- [../13-monorepo/ENV_AND_VERSIONING.md](../13-monorepo/ENV_AND_VERSIONING.md)
- [../FLOW.md](../FLOW.md)
