# Client Delivery & Resource Tracker (CDT)

Post-placement delivery control: **Employees** → Leave → Timesheet → Delivery Review → Dashboard → Invoicing.

UI says **Employee**; API/DB still use `candidates` / public IDs `CD-#####`.

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

Single organization tenant (`brickred`) with **cost centers** `BRICKRED` / `AGYOM` for filtering clients and employees in the signed-in shell.

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
| `ADMIN` | Everything (users, lookups, audit, import) |
| `DELIVERY_OWNER` | Employees, clients, timesheet entry, delivery reviews, generate invoices |
| `ACCOUNT_OWNER` | Leave/timesheet **approvals**, invoice review lifecycle, dashboard |

Demo: `dm@brickred.local` (Delivery Owner), `am@brickred.local` (Account Owner).

## Docs

| Doc | Audience |
|-----|----------|
| [docs/README.md](docs/README.md) | Engineering index |
| [docs/21-guides/CDT_BUSINESS_FEATURE_GUIDE.md](docs/21-guides/CDT_BUSINESS_FEATURE_GUIDE.md) | Non-technical feature + happy-path guide |
| [docs/17-local-deployment/DEPLOY_VPS.md](docs/17-local-deployment/DEPLOY_VPS.md) | VPS / Docker Compose production |

## Hosted testing (Vercel + Render)

| Piece | Host |
|--------|------|
| Web (`apps/web`) | [Vercel](https://vercel.com) — project root `apps/web` |
| API + Postgres | [Render](https://render.com) — Blueprint from repo-root [`render.yaml`](render.yaml) |

1. Push to GitHub, then on Render: **New → Blueprint** → select this repo. Set `SEED_ADMIN_PASSWORD`, `SEED_DEMO_PASSWORD`, and `CORS_ORIGIN` (your Vercel URL).
2. On Vercel: import the repo with Root Directory `apps/web`. Set `VITE_API_BASE_URL` to `https://cdt-api-470n.onrender.com/api/v1` (use your actual Render host).
3. Redeploy the web app after the API URL is known so Vite embeds the correct API base.

**Current testing URLs**
- Web: https://cdt-web-kappa.vercel.app
- API: https://cdt-api-470n.onrender.com
- Admin: `admin@sst.local` / `Admin@123`
