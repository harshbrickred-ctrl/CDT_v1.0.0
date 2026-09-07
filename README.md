# Client Delivery & Resource Tracker (CDT)

Post-placement delivery control: Candidate Master → Leave → Timesheet → Delivery Review → Dashboard → Invoicing.

## Quick start

```bash
cp .env.example .env
docker compose -f docker/docker-compose.yml up -d postgres
pnpm install
pnpm --filter @cdt/shared-types build
pnpm --filter @cdt/shared-utils build
pnpm --filter @cdt/api prisma:generate
pnpm --filter @cdt/api exec prisma migrate dev
pnpm --filter @cdt/api prisma:seed
pnpm dev
```

| Service | URL |
|---------|-----|
| Web | http://localhost:5173 |
| API | http://localhost:3000 |
| Health | http://localhost:3000/health |
| Swagger | http://localhost:3000/api/docs |
| Postgres | localhost:**5434** |

Default admin (from seed / `.env`): `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

Demo users (same password): `dm@brickred.local`, `am@brickred.local`.

Before delivery, wipe demo/dev business data while keeping logins and lookups:

```bash
pnpm db:clean
```

Do not run `pnpm db:seed` afterward unless you want the Acme/Globex demo portfolio again.

## Monorepo

- `apps/api` — NestJS + Prisma (`@cdt/api`)
- `apps/web` — React + Vite (`@cdt/web`)
- `packages/shared-types`, `shared-utils`, `typescript-config`, `eslint-config`
- `docs/` — full product/engineering documentation

## Roles

| Role | Typical access |
|------|----------------|
| ADMIN | Everything |
| DELIVERY_MANAGER | Candidates, timesheets entry, delivery reviews, generate invoices |
| ACCOUNT_MANAGER | Leave/timesheet **approvals**, invoice review, dashboard |

## Docs

Start at [docs/README.md](docs/README.md).
