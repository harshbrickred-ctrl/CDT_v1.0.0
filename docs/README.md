# Client Delivery & Resource Tracker — Documentation Index

## Purpose

Enterprise documentation for **Client Delivery & Resource Tracker (CDT)**. Product intent, architecture, and implementation standards live here. Prefer this tree over outdated Word/Excel notes when they conflict with the shipped app.

## Audience

| Audience | Start here |
|----------|------------|
| **Business / non-technical** | **[21-guides/CDT_BUSINESS_FEATURE_GUIDE.md](./21-guides/CDT_BUSINESS_FEATURE_GUIDE.md)** |
| **Beginners — codebase walkthrough** | [FLOW.md](./FLOW.md) |
| Team Lead / new engineers | [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) |
| Beginners — high-level architecture | [06-system-design/BEGINNER_HIGH_LEVEL_ARCHITECTURE.md](./06-system-design/BEGINNER_HIGH_LEVEL_ARCHITECTURE.md) |
| NestJS implementers | [21-guides/NESTJS_DEVELOPER_HANDBOOK.md](./21-guides/NESTJS_DEVELOPER_HANDBOOK.md) |
| Product / BA | [00-initiation/VISION.md](./00-initiation/VISION.md) *(historical; verify against code)* |
| Architects | [06-system-design/HIGH_LEVEL_ARCHITECTURE.md](./06-system-design/HIGH_LEVEL_ARCHITECTURE.md) |
| Security | [11-security/AUTH_RBAC.md](./11-security/AUTH_RBAC.md) |
| QA / SDET | [15-testing/TESTING_STRATEGY.md](./15-testing/TESTING_STRATEGY.md) |
| Ops / VPS | [17-local-deployment/DEPLOY_VPS.md](./17-local-deployment/DEPLOY_VPS.md) |
| Local setup | [17-local-deployment/LOCAL_SETUP.md](./17-local-deployment/LOCAL_SETUP.md) |

## Scope (shipped vs Future)

| Label | Meaning |
|-------|---------|
| **Shipped** | Employees (billable / non-billable / bench), Leave, Timesheet, Delivery Review, Approvals, Invoices, Dashboard, Clients, Lookups, Auth / RBAC / Audit, Import |
| **Future** | Live SST sync, notifications, half-days/holidays, multi-engagement, SSO |

> Historical folders `00`–`15` may still say “Candidate Master”, `DELIVERY_MANAGER`, or `HR`. **Canonical roles and terms are below and in [11-security/AUTH_RBAC.md](./11-security/AUTH_RBAC.md).** Treat older BA/SRS/PRD text as background unless updated.

## Reading order (engineers)

1. [FLOW.md](./FLOW.md) — monorepo, domain chain, screens  
2. [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) — engineering overview  
3. [11-security/AUTH_RBAC.md](./11-security/AUTH_RBAC.md) + [PERMISSION_MATRIX.md](./11-security/PERMISSION_MATRIX.md)  
4. [10-api/API_CATALOG.md](./10-api/API_CATALOG.md) · [09-frontend/FEATURE_MODULES.md](./09-frontend/FEATURE_MODULES.md)  
5. [17-local-deployment/](./17-local-deployment/) · [17-local-deployment/DEPLOY_VPS.md](./17-local-deployment/DEPLOY_VPS.md)  

## Document catalog

| Folder | Contents |
|--------|----------|
| `00`–`05` | Initiation, BA, SRS, PRD, domain, UX *(legacy-heavy)* |
| `06`–`10` | System design, DB, backend, frontend, API |
| `11` | Auth/RBAC, permissions, OWASP, audit |
| `12`–`16` | Planning, monorepo, standards, testing, CI |
| `17` | Local setup, Docker, seed, **VPS deploy** |
| `18`–`20` | Monitoring, cloud notes, maintenance |
| `21-guides` | Admin/user manuals, **business feature guide**, FAQ, Nest handbook |

## Definitions (canonical)

| Term | Definition |
|------|------------|
| CDT | Client Delivery & Resource Tracker |
| Employee | Deployed or internal person tracked in CDT. UI label; API/DB entity remains `Candidate` with public ID `CD-#####` |
| Category | `BILLABLE` · `NON_BILLABLE` · `BENCH` |
| Leave | Leave request/record with approval gate (`LV-#####`) |
| Timesheet | Monthly work record; Attendance % = Days Worked / Working Days (`TSH-#####`) |
| Delivery Review | Monthly engagement health judgment (`DEL-#####`) |
| Invoice | Billing record linked 1:1 to an approved timesheet (`INV-#####`) |
| Engagement Health | On Track / At Risk / Escalated |
| Cost center | `BRICKRED` or `AGYOM` filter in the shell |
| Roles | `ADMIN` · `DELIVERY_OWNER` · `ACCOUNT_OWNER` |
| SST | Service Staffing Tracker (upstream; sync Future) |
| Public ID | Human-readable ID (`CD-`, `LV-`, `TSH-`, `DEL-`, `INV-`) |

## Stack reference

Turborepo · pnpm · React · Vite · Tailwind · TanStack Query · React Router · Axios · NestJS · Prisma · PostgreSQL · JWT + Refresh · Passport · Swagger · Docker Compose · GitHub Actions · Prometheus · Grafana (optional)

## References

- Root [README.md](../README.md) — quick start + hosted URLs  
- [21-guides/CDT_BUSINESS_FEATURE_GUIDE.md](./21-guides/CDT_BUSINESS_FEATURE_GUIDE.md) — shareable business guide  
- [DOC_REVIEW_FINDINGS.md](./DOC_REVIEW_FINDINGS.md) — Phase A QA log (roles section superseded by AUTH_RBAC)
