# CDT codebase flow — beginner one-stop (planned)

This file walks the **planned** Client Delivery & Resource Tracker (CDT) monorepo. Phase A is documentation-first: `apps/` may not exist yet. Read this as the intended map so scaffolding matches product intent.

It is a **codebase orientation**, not a replacement for the rest of `docs/`. Product rules, ADRs, test catalogs, and deploy runbooks stay in their folders.

**What you will be able to answer after this doc**

- What CDT does in one sentence  
- Which folder is UI vs API vs shared libraries  
- What happens at Login  
- How Candidate → Leave → Timesheet → Delivery Review → Dashboard connects  
- How Nest modules, Prisma, and the SPA will talk to each other  

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

CDT is a **multi-user post-placement delivery control** system. After SST marks someone Joined, Delivery/HR track whether they are **present**, **delivering time**, and whether the **client engagement is healthy**.

It replaces the shared Excel Client Delivery Tracker workbook.

| Dimension | Measured by |
|-----------|-------------|
| Presence | Approved leave + On Leave Today |
| Work delivery | Timesheet Days Worked / Attendance % |
| Engagement health | Delivery Review (human judgment) |

### Glossary

| Term | Meaning |
|------|---------|
| **CDT** | Client Delivery & Resource Tracker |
| **Candidate** | Deployed person at a client. Public ID `CD-00001` |
| **Leave** | Leave request/record. `LV-00001` |
| **Timesheet** | Period work record. `TSH-00001` |
| **Delivery Review** | Monthly engagement health. `DEL-00001` |
| **Attendance %** | Days Worked ÷ Working Days (e.g. 21/23 → 91.3%) |
| **Engagement Health** | On Track / At Risk / Escalated |
| **RAG (health)** | Visual language for engagement health (not SST hiring SLA RAG) |
| **SST** | Upstream Service Staffing Tracker |
| **Lookup** | Admin-seeded dropdown values |
| **Public ID** | Human-readable id; internal PK is UUID |
| **MVP** | Delivery control + auth + audit + import; notifications Future |

### Roles

| Prisma `Role` | Typical job |
|---------------|-------------|
| `ADMIN` | Users, clients, lookups, audit, import |
| `DELIVERY_MANAGER` | Candidates, delivery reviews, dashboard |
| `HR` | Leave / timesheet approvals |
| `INTERNAL_MANAGER` | Visibility / escalation context; dashboard read |

Further reading: [01-business-analysis/WORKFLOWS.md](./01-business-analysis/WORKFLOWS.md), [04-domain/DOMAIN_MODEL.md](./04-domain/DOMAIN_MODEL.md).

---

## 2. How to run it locally

Target bootstrap (when apps exist) — see also [17-local-deployment/LOCAL_SETUP.md](./17-local-deployment/LOCAL_SETUP.md):

```bash
cp .env.example .env
docker compose -f docker/docker-compose.yml up -d postgres
pnpm install
pnpm --filter @cdt/shared-types build
pnpm --filter @cdt/shared-utils build
pnpm --filter @cdt/api prisma:generate
pnpm --filter @cdt/api exec prisma migrate dev --name init
pnpm --filter @cdt/api prisma:seed
pnpm dev
```

| Piece | URL / port |
|-------|------------|
| Web (Vite) | http://localhost:5173 |
| API | http://localhost:3000 |
| Health | http://localhost:3000/health |
| Swagger | http://localhost:3000/api/docs |
| Postgres | host port **5434** (avoids SST on 5433) |

**Admin login is not hardcoded.** Seed reads `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

**Shared packages first.** API imports `@cdt/shared-types` and `@cdt/shared-utils` from `dist/`.

**Notifications are Future.** SMTP may exist for later; MVP flows must work without mail.

---

## 3. Monorepo map

```text
CDT_v1_monorepo/
  apps/
    api/                 # @cdt/api  NestJS + Prisma
    web/                 # @cdt/web  Vite React (alt folder: DeliveryDashboard)
  packages/
    shared-types/        # @cdt/shared-types
    shared-utils/        # @cdt/shared-utils
    eslint-config/
    typescript-config/
  docker/
  docs/
  pnpm-workspace.yaml
  turbo.json
```

Details: [13-monorepo/MONOREPO_STRUCTURE.md](./13-monorepo/MONOREPO_STRUCTURE.md).

---

## 4. One request, end to end

Example: create a July timesheet.

```text
Browser form (RHF + Zod)
  → Axios POST /api/v1/timesheets + Bearer JWT
  → Nest TimesheetsController
  → TimesheetsService
       → CandidatesService.assertExists
       → unique month check
       → LeaveService.sumApprovedOverlap
       → attendancePct(daysWorked, workingDays)  // shared-utils
       → Prisma create + AuditService
  → JSON { publicId: TSH-00001, leaveDays, attendancePct }
  → React Query invalidates lists
```

---

## 5. Frontend boot

Planned `apps/web/src` boot:

1. `main.tsx` → providers (QueryClient, Auth, Router)  
2. Routes: `/login`, `/dashboard`, `/candidates`, `/leave`, `/timesheets`, `/delivery-reviews`, `/admin/*`  
3. Auth hydrate from storage → `/me`  
4. Nav filtered by role  

Design system: Tailwind + ShadCN per `05-ux`.

---

## 6. Auth in depth

```text
POST /auth/login → access + refresh
Authorization: Bearer <access>
POST /auth/refresh → new access
POST /auth/logout → revoke refresh
```

Guards on API: JWT → Roles/Permissions. UI hide ≠ security.

---

## 7. Who sees which nav

| Area | ADMIN | DELIVERY_MANAGER | HR | INTERNAL_MANAGER |
|------|:-----:|:----------------:|:--:|:----------------:|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Candidates | ✓ | ✓ | limited | read* |
| Leave | ✓ | ✓ | ✓ | read* |
| Timesheets | ✓ | ✓ | ✓ | read* |
| Delivery Reviews | ✓ | ✓ | ✗ create | read* |
| Users / Import / Audit | ✓ | ✗ | ✗ | ✗ |

\*Exact read vs write: [11-security/PERMISSION_MATRIX.md](./11-security/PERMISSION_MATRIX.md).

---

## 8. Delivery-control pipeline

```text
SST Joined (upstream, manual/MVP entry)
    → Candidate Master (Active)
    → Leave (Pending → Approved|Rejected)
    → Timesheet (Leave Days from Approved overlap; Attendance %)
    → Delivery Review (Utilization from TS month; Health judgment)
    → Dashboard
    → Release (history retained)
```

### Must-remember rules

| Rule | Behavior |
|------|----------|
| BR-01 | Candidate before Leave/TS/DR |
| BR-04/05 | Approved overlapping leave only in Leave Days |
| BR-06 | Attendance = Worked / Working Days |
| BR-07/08 | DR utilization by Candidate + month |
| BR-09 | At Risk/Escalated need notes |
| BR-10 | On Leave Today ignores month filter |
| Uniqueness | One TS and one DR per candidate/month; unique client names |

---

## 9. Backend modules

| Module | Responsibility |
|--------|----------------|
| `auth` / `users` | JWT, roles |
| `master-data` | Clients, lookups |
| `candidates` | Lifecycle Active→Released |
| `leave` | Requests + approval |
| `timesheets` | Period + derived metrics |
| `delivery-reviews` | Monthly health |
| `dashboard` | Aggregates |
| `audit` / `import` | Trail + Excel bridge |
| `health` | Liveness/metrics |

Architecture ADR: [14-standards/adr/0002-modular-monolith.md](./14-standards/adr/0002-modular-monolith.md).

---

## 10. Shared packages and tests

| Package | Role |
|---------|------|
| `@cdt/shared-types` | Zod DTOs, Role enums |
| `@cdt/shared-utils` | Leave overlap, attendance, month key, client normalize |

Tests: unit on utils first; API integration; catalog in `15-testing/v1-catalog`.

---

## 11. Where do I look?

| Question | Doc / path |
|----------|------------|
| Why MVP excludes notifications? | [adr/0001-mvp-delivery-control-first.md](./14-standards/adr/0001-mvp-delivery-control-first.md) |
| Sprint order | [12-planning/](./12-planning/) |
| UAT July 91.3% | [15-testing/v1-catalog/06-timesheets.md](./15-testing/v1-catalog/06-timesheets.md) |
| Nest how-to | [21-guides/NESTJS_DEVELOPER_HANDBOOK.md](./21-guides/NESTJS_DEVELOPER_HANDBOOK.md) |
| Engineering overview | [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) |
| Deploy | [17-local-deployment/DEPLOY_V1.md](./17-local-deployment/DEPLOY_V1.md) |

---

## References

- [README.md](./README.md)
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
- [13-monorepo/MONOREPO_STRUCTURE.md](./13-monorepo/MONOREPO_STRUCTURE.md)
- Source Word: `Client_Delivery_Tracker_In-Depth_Understanding_Document.docx`
