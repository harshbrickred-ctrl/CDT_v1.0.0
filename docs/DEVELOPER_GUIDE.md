# Client Delivery & Resource Tracker — Engineering Overview

## Purpose

High-level engineering brief for leaders and senior contributors joining the **Client Delivery & Resource Tracker (CDT)** program. It explains *what* the product is, *why* it exists, *how* the system is shaped, and *where* deeper specifications live.

This document is intentionally strategic. It does not replace detailed design, API contracts, or implementation handbooks.

## Audience

| Audience | How to use this guide |
|----------|------------------------|
| **Team Lead / Engineering Manager** (primary) | System context, ownership boundaries, decisions, risks, and doc map |
| Tech Lead / Architect | Entry point before C4, ADRs, and module design |
| Senior engineer (any stack) | Orientation before domain and API deep-dives |
| Product / Delivery partners | Shared language for scope and platform constraints |

**Hands-on NestJS implementers:** [21-guides/NESTJS_DEVELOPER_HANDBOOK.md](./21-guides/NESTJS_DEVELOPER_HANDBOOK.md).

**Beginner planned codebase walkthrough:** [FLOW.md](./FLOW.md).

**Beginner high-level architecture:** [06-system-design/BEGINNER_HIGH_LEVEL_ARCHITECTURE.md](./06-system-design/BEGINNER_HIGH_LEVEL_ARCHITECTURE.md).

## Document control

| Attribute | Value |
|-----------|--------|
| Product | Client Delivery & Resource Tracker (CDT) |
| Classification | Internal engineering |
| Standards alignment | IEEE-style SRS/PRD set, C4 model, OWASP ASVS themes, 12-Factor ops mindset, ADR governance |
| Source of product truth | `docs/` tree |
| Legacy operational baseline | Client Delivery Tracker Excel + workflow guide |
| Phase | A — documentation first; application code deferred until docs approved |

---

## 1. Executive summary

### 1.1 One-sentence product definition

**CDT** is the multi-user **system of record** for *post-placement delivery control*—digitizing the Excel workbook that tracks deployed candidates’ leave, timesheets, delivery health, and operational dashboards.

### 1.2 North star

Eliminate spreadsheet fragility and give **Delivery Managers**, **HR**, and **Internal Managers** shared real-time visibility with **authentication**, **role-based access**, and an **auditable mutation trail**—then retire the spreadsheet.

### 1.3 What leaders own in this codebase

| Layer | Ownership expectation |
|-------|------------------------|
| Product fidelity | Excel process parity for Candidate/Leave/TS/DR/Dashboard; no silent divergence from BRs |
| Architecture integrity | Modular monolith boundaries; clean seams for SST sync / billing / notifications later |
| Security & compliance | JWT auth, RBAC matrix, audit logging, careful PII handling |
| Delivery quality | Shared types, test strategy, CI gates, observability hooks |
| Documentation discipline | Decisions as ADRs; contracts in `docs/10-api` and Prisma design |

### 1.4 Elevator architecture

```text
Browser (React SPA) ──REST + JWT──► NestJS API (modular monolith) ──Prisma──► PostgreSQL
                                              │
                                              ├── optional company SMTP (Future notify)
                                              └── optional /metrics (Prometheus)
```

There is **no** BFF, message bus, or microservices mesh in MVP. Complexity is managed through **module boundaries inside one API** and a **monorepo** with shared contracts (`@cdt/*`).

---

## 2. Business context

### 2.1 Problem

Post-placement delivery is operated from a sophisticated Excel workbook. Spreadsheets do not provide:

- Safe concurrent multi-user editing  
- Authentication and least-privilege access  
- End-to-end audit of critical mutations  
- Reliable, filterable operational KPIs  
- A clean path to integrate with SST and billing companions later  

### 2.2 Outcomes the platform must deliver

| Goal | Priority | Engineering implication |
|------|----------|-------------------------|
| Replace Excel as SoR for delivery control | P0 | Full CRUD + import for core entities |
| Enforce leave approval → timesheet leave calc | P0 | Server-side BR-04..06 |
| Delivery review utilization + health notes | P0 | BR-07..09 |
| Dashboard parity including On Leave Today | P0 | BR-10 filter semantics |
| Auth, RBAC, audit logs | P0 | Guards/matrix on mutating surfaces |
| Excel migration fidelity | P0 | Dry-run + commit import |
| Notifications / live SST sync | P1 / Future | Do not block SoR |

Full vision: [00-initiation/VISION.md](./00-initiation/VISION.md).  
Product detail: [03-prd/PRD.md](./03-prd/PRD.md).

### 2.3 Scope governance (MVP vs Future)

| In MVP | Explicitly Future |
|--------|-------------------|
| Candidate Master + Active→Released | Live SST Joined sync |
| Leave + approval gate | Push/email notifications |
| Timesheet + leave overlap + attendance % | Half-days / holiday calendars |
| Delivery Review + utilization pull | Multi-engagement concurrent placements |
| Dashboard KPIs + filters | Timesheet & Billing Tracker deep integration |
| Auth (JWT), RBAC, audit, Excel import, search/360 | SSO; cloud multi-region |

**Governing ADR:** [14-standards/adr/0001-mvp-delivery-control-first.md](./14-standards/adr/0001-mvp-delivery-control-first.md).

**Leadership rule:** do not expand MVP into notifications/SST sync without ADR + RTM update.

---

## 3. Domain overview (business language)

### 3.1 Delivery-control value stream

```text
Candidate Master  →  Leave  →  Timesheet  →  Delivery Review  →  Dashboard
     (Active)        (gate)     (attendance)   (health judgment)
```

### 3.2 Core entities

| Entity | Public ID | Notes |
|--------|-----------|-------|
| Client | — | Normalized unique name |
| Candidate | `CD-#####` | Master for all child records |
| Leave | `LV-#####` | Pending/Approved/Rejected |
| Timesheet | `TSH-#####` | Unique per candidate/month |
| Delivery Review | `DEL-#####` | Unique per candidate/month |

### 3.3 Critical calculations

| Metric | Formula / rule |
|--------|----------------|
| Leave days on TS | Sum **Approved** leave overlapping period |
| Attendance % | Days Worked / Working Days (21/23 → 91.3%) |
| DR utilization | From matching Candidate + calendar month TS |
| On Leave Today | Approved leave covering **today**; ignores Month filter |

---

## 4. Engineering shape

### 4.1 Monorepo packages

| Package | Role |
|---------|------|
| `@cdt/api` | NestJS modular monolith |
| `@cdt/web` | React SPA |
| `@cdt/shared-types` | Zod contracts / roles |
| `@cdt/shared-utils` | Pure BR helpers |

See [13-monorepo/MONOREPO_STRUCTURE.md](./13-monorepo/MONOREPO_STRUCTURE.md).

### 4.2 Architecture decision

Modular monolith — [adr/0002-modular-monolith.md](./14-standards/adr/0002-modular-monolith.md).

### 4.3 Build sequence (do not reorder casually)

1. Finalize rules  
2. Masters (Client, User/Role, lookups)  
3. Candidate Master + lifecycle  
4. Leave + approval  
5. Timesheet + leave calc  
6. Delivery Reviews + utilization  
7. Dashboard KPIs  
8. Reporting / search / 360  
9. Audit / overdue listing (notifications Future)  
10. Excel migration  
11. UAT  
12. Retire spreadsheet  

Detail: [12-planning/DEPENDENCY_GRAPH.md](./12-planning/DEPENDENCY_GRAPH.md).

---

## 5. Quality & risk

### 5.1 Testing

Strategy + mandatory UAT catalog (including July 91.3%, leave gate, uniqueness, dashboard filters): [15-testing/](./15-testing/).

### 5.2 Top engineering risks

| Risk | Mitigation |
|------|------------|
| Divergent attendance math UI vs API | Single implementation in `@cdt/shared-utils` |
| Duplicate client spelling splits KPIs | Normalized unique constraint |
| Accidental notification scope creep | ADR-0001; Future label |
| Spreadsheet cutover data loss | Dry-run import + backups + sign-off |
| AuthZ holes | Matrix tests every sprint |

### 5.3 Security posture

JWT + refresh, RBAC, audit on mutations, secrets via env, OWASP-minded validation. See `11-security/`.

---

## 6. Delivery & ops

| Concern | Doc |
|---------|-----|
| Sprints / owners | `12-planning/` |
| CI | `16-cicd/GITHUB_ACTIONS.md` |
| Local / V1 deploy | `17-local-deployment/` |
| Monitoring | `18-monitoring/` |
| Cloud (Future) | `19-cloud/` |
| Support / DR | `20-maintenance/` |
| End-user guides | `21-guides/` |

---

## 7. Doc map (leaders)

| Need | Start |
|------|-------|
| Planned code walkthrough | [FLOW.md](./FLOW.md) |
| Nest implementer | [21-guides/NESTJS_DEVELOPER_HANDBOOK.md](./21-guides/NESTJS_DEVELOPER_HANDBOOK.md) |
| Epics | [12-planning/EPICS_AND_STORIES.md](./12-planning/EPICS_AND_STORIES.md) |
| UAT sign-off | [15-testing/v1-catalog/11-signoff.md](./15-testing/v1-catalog/11-signoff.md) |
| Index | [README.md](./README.md) |

---

## 8. Relationship to SST

```text
SST (hiring pipeline → Joined)
        ↓  (manual entry in MVP; sync Future)
CDT (delivery control)
        ↓  (companion; out of MVP detail)
Timesheet & Billing Tracker
```

CDT must not become a second ATS. Keep the post-placement boundary clear.

---

## References

- [FLOW.md](./FLOW.md)
- [14-standards/adr/0001-mvp-delivery-control-first.md](./14-standards/adr/0001-mvp-delivery-control-first.md)
- [14-standards/adr/0002-modular-monolith.md](./14-standards/adr/0002-modular-monolith.md)
- [12-planning/EPICS_AND_STORIES.md](./12-planning/EPICS_AND_STORIES.md)
- Source: `Client_Delivery_Tracker_In-Depth_Understanding_Document.docx`
