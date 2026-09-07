# Client Delivery & Resource Tracker — Documentation Index

## Purpose

Complete enterprise documentation for building **Client Delivery & Resource Tracker (CDT)** from scratch. These docs are the system of record for product intent, architecture, and implementation standards.

## Audience

| Audience | Start here |
|----------|------------|
| **Beginners — planned codebase walkthrough** | **[FLOW.md](./FLOW.md)** |
| Team Lead / new engineers | [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) |
| Beginners — high-level architecture | [06-system-design/BEGINNER_HIGH_LEVEL_ARCHITECTURE.md](./06-system-design/BEGINNER_HIGH_LEVEL_ARCHITECTURE.md) |
| New to NestJS | [21-guides/NESTJS_DEVELOPER_HANDBOOK.md](./21-guides/NESTJS_DEVELOPER_HANDBOOK.md) |
| Product / BA | [00-initiation/VISION.md](./00-initiation/VISION.md) |
| Architects | [06-system-design/HIGH_LEVEL_ARCHITECTURE.md](./06-system-design/HIGH_LEVEL_ARCHITECTURE.md) |
| Security | [11-security/AUTH_RBAC.md](./11-security/AUTH_RBAC.md) |
| QA / SDET | [15-testing/TESTING_STRATEGY.md](./15-testing/TESTING_STRATEGY.md) |
| Ops | [17-local-deployment/LOCAL_SETUP.md](./17-local-deployment/LOCAL_SETUP.md) |
| Doc QA findings | [DOC_REVIEW_FINDINGS.md](./DOC_REVIEW_FINDINGS.md) |

## Scope

| Label | Meaning |
|-------|---------|
| **MVP** | Build now: Candidate Master, Leave, Timesheet, Delivery Review, Dashboard, Clients, Master Data, Auth / RBAC / Audit |
| **Future** | Architected only: live SST sync, billing tracker integration, notifications, half-days/holidays, multi-engagement, SSO, cloud |

**Excel / Word source of truth:** `Client_Delivery_Tracker_In-Depth_Understanding_Document.docx` (and referenced workbook + workflow guide).

## Reading order (recommended)

1. [FLOW.md](./FLOW.md) — planned monorepo, domain chain, screens  
2. [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) — engineering overview  
3. [00-initiation](./00-initiation/) → [01-business-analysis](./01-business-analysis/) → [02-srs](./02-srs/) → [03-prd](./03-prd/)  
4. [04-domain](./04-domain/) → [05-ux](./05-ux/)  
5. [06-system-design](./06-system-design/) → [07-database](./07-database/) → [08-backend](./08-backend/) → [09-frontend](./09-frontend/) → [10-api](./10-api/) → [11-security](./11-security/)  
6. [12-planning](./12-planning/) → [13-monorepo](./13-monorepo/) → [14-standards](./14-standards/)  
7. [15-testing](./15-testing/) → [16-cicd](./16-cicd/) → [17-local-deployment](./17-local-deployment/) → [18-monitoring](./18-monitoring/)  
8. [19-cloud](./19-cloud/) → [20-maintenance](./20-maintenance/) → [21-guides](./21-guides/)  

## Document catalog

| Folder | Contents |
|--------|----------|
| `00-initiation` | Vision, project charter, source understanding |
| `01-business-analysis` | FRs, NFRs, rules, personas, workflows, RTM |
| `02-srs` | IEEE-style Software Requirements Specification |
| `03-prd` | Product Requirements Document |
| `04-domain` | Domain model, processes, future modules |
| `05-ux` | IA, flows, wireframes, design system |
| `06-system-design` | HLA, C4, sequences, data flow, deployment, scale |
| `07-database` | ER/schema, Prisma, indexes/audit, migrations |
| `08-backend` | NestJS architecture, modules, cross-cutting |
| `09-frontend` | React architecture, features, auth/routing, state |
| `10-api` | Endpoint catalog, OpenAPI, errors/pagination |
| `11-security` | Auth/RBAC, permissions, OWASP, audit |
| `12-planning` | Epics/stories, sprints, dependencies |
| `13-monorepo` | Turborepo layout, packages, env/versioning |
| `14-standards` | Coding, git/PR, ADRs |
| `15-testing` | Strategy, structure, UAT catalog |
| `16-cicd` | GitHub Actions, release/rollback |
| `17-local-deployment` | Local setup, Docker Compose, seed/migrate |
| `18-monitoring` | Observability, metrics/alerts |
| `19-cloud` | Cloud migration plan (future) |
| `20-maintenance` | Support, DR, incident |
| `21-guides` | Admin, user manual, FAQ, NestJS handbook |

## Definitions

| Term | Definition |
|------|------------|
| CDT | Client Delivery & Resource Tracker |
| Candidate | Deployed person at a client (post-Joined from SST) |
| Leave | Leave request/record with approval gate |
| Timesheet | Period work record; Attendance % = Days Worked / Working Days |
| Delivery Review | Monthly engagement health judgment |
| Engagement Health | On Track / At Risk / Escalated (human judgment) |
| RAG (health) | Visual language for engagement health (not SST hiring SLA RAG) |
| SST | Service Staffing Tracker (upstream) |
| RTM | Requirement Traceability Matrix |
| ADR | Architecture Decision Record |
| Public ID | Human-readable ID (`CD-00001`, `LV-00001`, `TSH-00001`, `DEL-00001`) |

## Stack reference

Turborepo · pnpm · React · Vite · Tailwind · ShadCN · TanStack Query · React Router · RHF · Zod · Axios · NestJS · Prisma · PostgreSQL · JWT + Refresh · Passport · Swagger · Pino · Docker Compose · GitHub Actions · Prometheus · Grafana · Loki

## References

- Source Word doc at Brickred root  
- Sibling product docs: SST `SST_v1_monorepo/docs/` (pattern reference only)  
- Industry: IEEE 830 (SRS), C4 model, OWASP ASVS, 12-Factor App  
