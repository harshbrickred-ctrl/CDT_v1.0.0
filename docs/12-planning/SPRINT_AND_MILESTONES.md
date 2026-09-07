# Sprint Planning & Milestones — CDT

## Purpose

Sequence CDT MVP delivery into sprints and milestones that mirror the source build order (masters → candidates → leave → timesheet → delivery review → dashboard → hardening).

## Audience

Engineering lead, developers, QA, delivery partners.

## Scope

MVP (~8–10 sprints @ 1–2 weeks for a small team). Adjust capacity freely; do not reorder hard dependencies without updating [DEPENDENCY_GRAPH.md](./DEPENDENCY_GRAPH.md).

## Definitions

| Milestone | Outcome |
|-----------|---------|
| M0 | Rules finalized; monorepo bootable |
| M1 | Auth + masters + Candidate Master |
| M2 | Leave + Timesheet |
| M3 | Delivery Review + Dashboard |
| M4 | Search/360, audit/import, UAT, spreadsheet retirement |

---

## Milestone plan

| Milestone | Sprints | Epics | Exit criteria |
|-----------|---------|-------|---------------|
| M0 | S0 | E0 (+ rules ADR) | Docs locked for MVP rules; `pnpm install` / turbo scripts |
| M1 | S1–S2 | E1, E2, E3 | Login; clients/lookups; Active candidate usable downstream |
| M2 | S3–S4 | E4, E5 | Leave approval gate; TS leave calc + attendance %; unique period |
| M3 | S5–S6 | E6, E7 | DR utilization pull; health + escalation notes; dashboard filters + On Leave Today |
| M4 | S7–S8 | E8, E9, E10 | Audit; Excel import; CI/metrics; search/360; UAT sign-off; retire spreadsheet |

## Sprint sketch

| Sprint | Focus | Demo slice |
|--------|-------|------------|
| S0 | Finalize BR-01..BR-12; scaffold monorepo | Empty apps boot |
| S1 | Auth + users + RBAC skeleton | Admin login + create user |
| S2 | Clients + lookups + Candidate CRUD/release | Active CD-00001 |
| S3 | Leave create + approve/reject | Pending excluded from Leave Days |
| S4 | Timesheet create + calc + uniqueness | July 23/21 → 91.3% |
| S5 | Delivery Review + utilization + notes rule | July DR pulls utilization |
| S6 | Dashboard KPIs + filters | Client+month; On Leave Today ignores month |
| S7 | Audit + Excel import + overdue list | Import dry-run + commit |
| S8 | Search/360 + CI + UAT + spreadsheet cutover | Catalog sign-off |

## Sprint ceremonies (lightweight)

- **Planning:** pick stories by dependency graph and unfinished UAT cases
- **Daily:** blockers (especially leave→timesheet→DR chain)
- **Review:** demo one vertical slice (API + UI)
- **Retro:** doc gaps vs Excel SoR

## Capacity note

Prefer vertical slices each sprint (API + UI + seed data for one story). Parallelize only on soft dependencies (UI shell vs API masters).

## Team assignment

Named module owners and sprint board: [TEAM_SPRINT_PLAN.md](./TEAM_SPRINT_PLAN.md).

## Spreadsheet retirement gate (M4)

| Gate | Owner | Done when |
|------|-------|-----------|
| UAT catalog pass (no open S1/S2) | QA + Product | [11-signoff.md](../15-testing/v1-catalog/11-signoff.md) |
| Excel data migrated & reconciled | Admin + Delivery | Import report + sample audits |
| Read-only Excel archive | Ops | Path documented; write access removed |
| CDT declared SoR | Product | Comms to Delivery / HR / Managers |

## References

- [TEAM_SPRINT_PLAN.md](./TEAM_SPRINT_PLAN.md)
- [DEPENDENCY_GRAPH.md](./DEPENDENCY_GRAPH.md)
- [EPICS_AND_STORIES.md](./EPICS_AND_STORIES.md)
- [../15-testing/v1-catalog/README.md](../15-testing/v1-catalog/README.md)
