# CDT codebase flow — beginner one-stop

This file walks the **shipped** Client Delivery & Resource Tracker (CDT) monorepo: UI vs API, login, and how Employees → Leave → Timesheet → Delivery Review → Invoices → Dashboard connect.

It is a **codebase orientation**, not a replacement for the rest of `docs/`.

**What you will be able to answer after this doc**

- What CDT does in one sentence  
- Which folder is UI vs API vs shared libraries  
- What happens at Login  
- How the delivery-control pipeline connects  
- How Nest modules, Prisma, and the SPA talk to each other  

---

## Table of contents

1. [What CDT is](#1-what-cdt-is)
2. [How to run it locally](#2-how-to-run-it-locally)
3. [Monorepo map](#3-monorepo-map)
4. [One request, end to end](#4-one-request-end-to-end)
5. [Frontend boot](#5-frontend-boot)
6. [Auth in depth](#6-auth-in-depth)
7. [Who sees which nav](#7-who-sees-which-nav)
8. [Delivery-control pipeline](#8-delivery-control-pipeline)
9. [Backend modules](#9-backend-modules)
10. [Shared packages and tests](#10-shared-packages-and-tests)
11. [Where do I look?](#11-where-do-i-look)

---

## 1. What CDT is

CDT is a **multi-user post-placement delivery control** system. Delivery and Account Owners track whether people are **present**, **delivering time**, whether the **client engagement is healthy**, and whether **invoices** move through review.

| Dimension | Measured by |
|-----------|-------------|
| Presence | Approved leave + On Leave Today |
| Work delivery | Timesheet Days Worked / Attendance % |
| Engagement health | Delivery Review (human judgment) |
| Billing | Invoice lifecycle from approved timesheets |

### Glossary

| Term | Meaning |
|------|---------|
| **CDT** | Client Delivery & Resource Tracker |
| **Employee** | UI term for a person record. API/DB: `Candidate`, public ID `CD-00001` |
| **Category** | `BILLABLE` · `NON_BILLABLE` · `BENCH` |
| **Leave** | Leave request/record. `LV-00001` |
| **Timesheet** | Period work record. `TSH-00001` |
| **Delivery Review** | Monthly engagement health. `DEL-00001` |
| **Invoice** | Billing snapshot. `INV-00001` |
| **Attendance %** | Days Worked ÷ Working Days |
| **Engagement Health** | On Track / At Risk / Escalated |
| **Cost center** | `BRICKRED` / `AGYOM` shell filter |
| **Lookup** | Admin-seeded dropdown values |
| **Public ID** | Human-readable id; internal PK is UUID |

### Roles

| Prisma `Role` | Typical job |
|---------------|-------------|
| `ADMIN` | Users, lookups, audit, import, all domain |
| `DELIVERY_OWNER` | Employees, clients, timesheets, delivery reviews, generate invoices |
| `ACCOUNT_OWNER` | Approvals inbox; leave/TS approve; invoice review |

Further reading: [11-security/AUTH_RBAC.md](./11-security/AUTH_RBAC.md), [21-guides/CDT_BUSINESS_FEATURE_GUIDE.md](./21-guides/CDT_BUSINESS_FEATURE_GUIDE.md).

---

## 2. How to run it locally

See [17-local-deployment/LOCAL_SETUP.md](./17-local-deployment/LOCAL_SETUP.md) and root `README.md`:

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

| Piece | URL / port |
|-------|------------|
| Web (Vite) | http://localhost:5173 |
| API | http://localhost:3000 |
| Health | http://localhost:3000/health |
| Swagger | http://localhost:3000/api/docs |
| Postgres | host port **5434** |

**Admin login** comes from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.  
Demo: `dm@brickred.local`, `am@brickred.local`.

**Shared packages first.** API imports `@cdt/shared-types` and `@cdt/shared-utils` from `dist/`.

---

## 3. Monorepo map

```text
CDT_v1_monorepo/
  apps/
    api/                 # @cdt/api  NestJS + Prisma
    web/                 # @cdt/web  Vite React
  packages/
    shared-types/
    shared-utils/
    eslint-config/
    typescript-config/
  docker/
  docs/
  render.yaml            # Render Blueprint (API + Postgres)
```

---

## 4. One request, end to end

```text
Browser (React)
  → Axios + Bearer access token
  → Nest controller (@Roles)
  → Service (business rules + Prisma)
  → PostgreSQL
```

Vite embeds `VITE_API_BASE_URL` (e.g. `http://localhost:3000/api/v1`).

---

## 5. Frontend boot

1. `LoginPage` → `POST /auth/login`  
2. Tokens + user in auth context  
3. Shell: cost-center filter, nav by role  
4. Pages under `apps/web/src/pages/`  

Primary routes: `/dashboard`, `/employees`, `/leave`, `/timesheets`, `/delivery-reviews`, `/approvals`, `/invoices`, `/clients`, `/settings/*`.

---

## 6. Auth in depth

- Login returns access + refresh  
- Refresh rotates refresh token hash in DB  
- Logout revokes refresh  
- Guards: JWT then Roles  

Details: [11-security/AUTH_RBAC.md](./11-security/AUTH_RBAC.md).

---

## 7. Who sees which nav

| Area | ADMIN | DELIVERY_OWNER | ACCOUNT_OWNER |
|------|-------|----------------|---------------|
| Dashboard / Employees / Leave / TS / Reviews / Clients / Invoices | Y | Y | Y |
| Approvals | Y | — | Y |
| Settings (Users, Lookups, Audit, Import) | Y | — | — |

Matrix: [11-security/PERMISSION_MATRIX.md](./11-security/PERMISSION_MATRIX.md).

---

## 8. Delivery-control pipeline

```text
Employee (BILLABLE Active)
  → Leave (Pending → Approved)
  → Timesheet (Pending → Approved)   # only billable
  → Invoice (PENDING_REVIEW → …)     # from approved TS
  → Delivery Review (health)
  → Dashboard KPIs
```

**Non-billable / bench** employees appear on Employees and dashboard bench metrics; they do **not** get timesheets, invoices, or delivery reviews.

---

## 9. Backend modules

Under `apps/api/src/`: `auth`, `users`, `clients`, `candidates`, `leaves`, `timesheets`, `delivery-reviews`, `invoices`, `dashboard`, `lookups`, `import`, `search`, `audit`, `health`.

---

## 10. Shared packages and tests

- `@cdt/shared-types` — DTOs / pagination helpers  
- `@cdt/shared-utils` — billing helpers, public IDs  
- CI: `.github/workflows/ci.yml` (`build-test`)  

---

## 11. Where do I look?

| Question | Doc / path |
|----------|------------|
| How do I use the product (business)? | [21-guides/CDT_BUSINESS_FEATURE_GUIDE.md](./21-guides/CDT_BUSINESS_FEATURE_GUIDE.md) |
| Permissions | [11-security/PERMISSION_MATRIX.md](./11-security/PERMISSION_MATRIX.md) |
| API list | [10-api/API_CATALOG.md](./10-api/API_CATALOG.md) |
| Screens | [09-frontend/FEATURE_MODULES.md](./09-frontend/FEATURE_MODULES.md) |
| VPS deploy | [17-local-deployment/DEPLOY_VPS.md](./17-local-deployment/DEPLOY_VPS.md) |
