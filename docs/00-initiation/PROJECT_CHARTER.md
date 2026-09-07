# Project Charter — Client Delivery & Resource Tracker

## Purpose

Authorize and bound the CDT program for documentation and subsequent engineering delivery.

## Audience

Sponsors, engineering manager, architects, product.

## Scope

Charter elements: problem, goals, constraints, risks, timeline, **assumed defaults**. Not detailed specs.

## Definitions

See [../README.md](../README.md).

---

## 1. Project identity

| Field | Value |
|-------|-------|
| Name | Client Delivery & Resource Tracker (CDT) |
| Type | Internal enterprise web application |
| Architecture | Modular monolith monorepo (SST-parity stack) |
| Phase A | Documentation only |
| Phase B | Implementation after docs sign-off |
| Phase 1 environment | Local / Docker Compose |

## 2. Objectives

1. Deliver MVP replacing Excel post-placement delivery tracking.  
2. Establish enterprise-ready codebase (tests, CI, observability, security) matching SST platform patterns.  
3. Document extension points for Future: live SST sync, notifications, half-days/hours, multi-engagement, billing companion, SSO/cloud.

## 3. In scope (MVP)

- Candidate Master CRUD + Active → Released lifecycle  
- Leave records + Pending / Approved / Rejected  
- Monthly Timesheet + derived Leave Days + Attendance %  
- Monthly Delivery Review + utilization lookup + health/feedback  
- Dashboard KPIs and filters (including On Leave Today)  
- Normalized Clients + Setup / master lists  
- Approvals queue UX  
- JWT + refresh, RBAC (`ADMIN`, `DELIVERY_MANAGER`, `HR`, `INTERNAL_MANAGER`)  
- Full audit for approvals and engagement-health changes  
- Excel/CSV import path; SST Joined **import seam** (not live sync)  
- Local Docker + monitoring stack documented  

## 4. Out of scope (MVP)

- Live SST API synchronization  
- Timesheet & Billing Tracker deep integration  
- Notifications / reminders  
- Half-days, public holidays calendar, hours-based timesheets  
- Multiple concurrent active client engagements per candidate  
- Cloud production deployment  
- SSO  
- Native mobile apps  
- Client external portal  

## 5. Assumptions

| ID | Assumption |
|----|------------|
| A-1 | MVP = Excel delivery-tracker parity + hardening (IDs, clients, audit, uniqueness) |
| A-2 | Internal users only |
| A-3 | English UI; primary timezone IST |
| A-4 | Docs-first; implementation after stakeholder confirmation of defaults |
| A-5 | Excel sample/history importable |
| A-6 | Email/password identity first |
| A-7 | Stack and monorepo conventions mirror SST |

## 6. Assumed defaults table (closes source §19)

| Topic | Default for MVP | Future |
|-------|-----------------|--------|
| Engagement model | **One active client engagement per candidate** | Multi-engagement |
| Leave days | Inclusive **calendar days** (To − From + 1) | Working-day / holiday calendars |
| Cadence | Timesheet + Delivery Review **monthly** | Weekly / configurable |
| Uniqueness | One timesheet and one delivery review per **candidate + calendar month** | Configurable |
| Roles | `ADMIN`, `DELIVERY_MANAGER`, `HR`, `INTERNAL_MANAGER` | Finer hierarchy |
| Clients | Normalized `clients` entity | — |
| Attendance | `Days Worked / Working Days` | Hours-based / adjusted formulas |
| Engagement Health | Human judgment; notes **required** if At Risk / Escalated | Optional policy thresholds |
| SST integration | Manual/API **import seam** | Live sync |
| Notifications | Out of MVP | In-app / email |
| Half-days / hours | Out of MVP | Supported |
| Audit | Full change audit for approvals + health | Extended domains |
| UI | Cool slate + amber; Fraunces + DM Sans; health-first visual language | Theme refinements |

Stakeholders confirm this table before Phase B; changes require Charter revision and RTM update.

## 7. Constraints

| Type | Constraint |
|------|------------|
| Stack | Turborepo, pnpm, React/Vite, Tailwind, ShadCN, NestJS, Prisma, PostgreSQL as specified |
| Security | OWASP-aligned; candidate/manager PII protection |
| Delivery | Docs-first blueprint; then implement |
| Cloud | Not until Phase 19 readiness |
| Visual | Must not be a teal SST clone |

## 8. Risks

| ID | Risk | Mitigation |
|----|------|------------|
| R-1 | Scope creep into billing / SST live sync | Strict MVP labeling |
| R-2 | Formula semantic drift vs Excel | BR doc + UAT §25 + RTM |
| R-3 | Free-text client duplicates | Normalized Clients (BR-11 fix) |
| R-4 | Ambiguous uniqueness / leave spanning months | Locked defaults + BR-13+ |
| R-5 | PII / approval accountability gaps | Auth + full audit day one |
| R-6 | Over-engineering | Modular monolith, YAGNI |

## 9. Timeline (planning)

| Stage | Estimate |
|-------|----------|
| Documentation complete | This `docs/` tree (Phase A) |
| Milestone 1: Auth + Clients + Masters + Candidates | Sprint 1–2 |
| Milestone 2: Leave + Approvals | Sprint 3 |
| Milestone 3: Timesheet + Delivery Review | Sprint 4–5 |
| Milestone 4: Dashboard + Import + hardening + CI/observability | Sprint 6–8 |

Exact calendar dates TBD by capacity.

## 10. Open questions (defaults applied)

All Section 19 open questions are closed by the **Assumed defaults** table above. Residual Future items remain labeled Future in domain and PRD docs.

## 11. Approval

Documentation plan approved for generation. Implementation begins after engineering consumption of this charter + PRD + stakeholder confirmation of assumed defaults.

## Trade-offs

| Choice | Pros | Cons |
|--------|------|------|
| Assumed defaults now | Concrete FRs/BRs/schema | May need late revision |
| Wait for every §19 answer | Zero assumption risk | Blocks documentation and build |

**Recommendation:** Ship docs on assumed defaults; treat Charter table as the change-control surface.

## References

- [VISION.md](./VISION.md)  
- [SOURCE_UNDERSTANDING.md](./SOURCE_UNDERSTANDING.md)  
- [../03-prd/PRD.md](../03-prd/PRD.md)  
- [../01-business-analysis/BUSINESS_RULES.md](../01-business-analysis/BUSINESS_RULES.md)  
