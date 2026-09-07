# Documentation Review Findings — CDT Phase A

## Purpose

Record the mandatory QA revisit of the CDT documentation suite before Phase B (development).

## Audience

Product, engineering leads, QA.

## Scope

Full catalog under `docs/` as of Phase A completion. Issues are either **Fixed**, **Accepted (documented default)**, or **Deferred (Future)**.

## Definitions

| Status | Meaning |
|--------|---------|
| Fixed | Docs corrected in this pass |
| Accepted | Intentional MVP default; stakeholders may reopen via change control |
| Deferred | Explicitly Future / out of MVP |

---

## 1. Review checklist

| Check | Result |
|-------|--------|
| SST-parity folder catalog (00–21 + indexes) | Pass — 91 markdown files present |
| Source BR-01–BR-12 present in Business Rules | Pass |
| Locked defaults D-1–D-10 in Charter | Pass |
| UAT §25 → `12-ui-uat.md` | Pass |
| FR → RTM → tests | Pass (with ID alias note) |
| Design system distinct from SST | Pass (slate + amber, Fraunces/DM Sans) |
| No Phase B application code claimed as done | Pass |

---

## 2. Issues found and resolutions

### F-01 — Leave/timesheet approval role contradiction

| Field | Value |
|-------|-------|
| Severity | High |
| Symptom | `PERMISSION_MATRIX` / `AUTH_RBAC` / `API_CATALOG` gave **DELIVERY_MANAGER** leave approve and denied **HR**; authz catalog and Word source assign approvals to HR |
| Resolution | **Fixed** — Approvals = `ADMIN` + `HR`. DM owns candidates, timesheet entry, delivery reviews. Updated matrix, AUTH_RBAC, API catalog, added TC-AZ-025/026 |
| Status | Fixed |

### F-02 — Postgres host port clash with SST

| Field | Value |
|-------|-------|
| Severity | Medium |
| Symptom | Some docs used **5433** (same as SST); FLOW/FAQ used **5434** |
| Resolution | **Fixed** — Canonical host port **5434** in LOCAL_SETUP, DOCKER_COMPOSE, ENV_AND_VERSIONING, MONOREPO_STRUCTURE |
| Status | Fixed |

### F-03 — `month_key` vs `year_month` naming

| Field | Value |
|-------|-------|
| Severity | Medium |
| Symptom | Indexing/early drafts used `month_key`; ER/Prisma use `year_month` |
| Resolution | **Fixed** — Column name **`year_month`**; domain synonym MonthKey documented in INDEXING_AND_AUDIT and DOMAIN_MODEL |
| Status | Fixed |

### F-04 — Candidate create roles for HR

| Field | Value |
|-------|-------|
| Severity | Medium |
| Symptom | API catalog allowed HR to create/release candidates; authz catalog and source emphasize DM for candidate master |
| Resolution | **Fixed** — Candidate create/update/release = `ADMIN` + `DELIVERY_MANAGER` only |
| Status | Fixed |

### F-05 — BR number drift in early INDEXING draft

| Field | Value |
|-------|-------|
| Severity | Medium |
| Symptom | INDEXING referenced BR-15/21/24 for uniqueness/client rules that BUSINESS_RULES assigns differently (BR-14/15 uniqueness, BR-27 clients) |
| Resolution | **Fixed** — INDEXING rewritten against current BUSINESS_RULES |
| Status | Fixed |

### F-06 — Test ID dual scheme (`CA-*` vs `TC-*`)

| Field | Value |
|-------|-------|
| Severity | Low |
| Symptom | Short suite tables and long TC-* cases coexist; TRACEABILITY mostly TC-* |
| Resolution | **Fixed** — Alias section added to TRACEABILITY.md |
| Status | Fixed |

### F-07 — Employment status “On Leave” vs Leave records

| Field | Value |
|-------|-------|
| Severity | Medium |
| Symptom | Setup lists may include On Leave / Backup-Bench while presence is leave-driven |
| Resolution | **Accepted** — Charter D-8 / BR-29 (rules doc): authoritative presence = Leave records; employment status On Leave is optional/informational |
| Status | Accepted |

### F-08 — Soft-delete columns on operational tables

| Field | Value |
|-------|-------|
| Severity | Low |
| Symptom | ER adds `deleted_at` on leaves/timesheets/reviews while BR-03 emphasizes soft **release** for candidates (not delete) |
| Resolution | **Accepted** — Soft-delete is for admin corrections; Released candidates remain non-deleted. New ops records blocked for Released (BR-24) |
| Status | Accepted |

### F-09 — Draft/submit leave states beyond Pending

| Field | Value |
|-------|-------|
| Severity | Low |
| Symptom | API catalog mentions DRAFT/submit; Business Rules MVP transitions are Pending→Approved/Rejected |
| Resolution | **Accepted** — Treat create-as-Pending as MVP default; optional Draft is non-normative UX sugar if implemented without changing BR-18 |
| Status | Accepted |

### F-10 — Half-days, holidays, hours, notifications, live SST

| Field | Value |
|-------|-------|
| Severity | Info |
| Symptom | Source §19 gaps |
| Resolution | **Deferred** — FUTURE_MODULES + Charter out of scope |
| Status | Deferred |

### F-11 — Design system light vs dark default wording

| Field | Value |
|-------|-------|
| Severity | Low |
| Symptom | Early draft mentioned dark surfaces; DESIGN_SYSTEM settles on light ops chrome + amber accent |
| Resolution | **Accepted** — DESIGN_SYSTEM.md is normative; implement light-first |
| Status | Accepted |

### F-12 — Path `/leaves` vs module name `leave`

| Field | Value |
|-------|-------|
| Severity | Low |
| Symptom | Nest module folder `leave` vs REST `/leaves` |
| Resolution | **Accepted** — REST plural `/leaves`; module folder may be `leave` or `leaves` at implementation |
| Status | Accepted |

---

## 3. BR-01–BR-12 coverage map

| BR | Business Rules | Domain / API validation | UAT / tests |
|----|----------------|-------------------------|-------------|
| BR-01 | Yes | DOMAIN + API 400 | UAT-01, CA-03 |
| BR-02 | Yes | publicId immutable | CA-02 |
| BR-03 | Yes | release endpoint | UAT-10, CA-05 |
| BR-04 | Yes | leave days calc | UAT-02–04 |
| BR-05 | Yes | overlap sum | TC-LV / TS suites |
| BR-06 | Yes | attendance calc | UAT-05 |
| BR-07 | Yes | utilization lookup | UAT-06 |
| BR-08 | Yes | timesheetMissing | DR-02 |
| BR-09 | Yes | notes required | UAT-07 |
| BR-10 | Yes | dashboard query | UAT-09 |
| BR-11 | Yes | Client entity | UAT-11 |
| BR-12 | Yes | lookups | MD suites |

BR-13+ locked defaults likewise covered in BUSINESS_RULES and tests.

---

## 4. Glossary lock (canonical)

| Term | Canonical form |
|------|----------------|
| Month period key | DB/API: `yearMonth` / `year_month` |
| Leave resource path | `/api/v1/leaves` |
| Web app package | `@cdt/web` in `apps/web` |
| Postgres host port | **5434** |
| Approver roles | ADMIN, HR |
| Candidate writers | ADMIN, DELIVERY_MANAGER |
| Public IDs | `CD-`, `LV-`, `TSH-`, `DEL-` |

---

## 5. Sign-off for Phase A

| Role | Outcome |
|------|---------|
| Doc authoring | Complete |
| QA revisit | Complete — findings above closed or accepted |
| Late overwrite check | Delivery docs pass refreshed FLOW/guides; **FLOW Postgres port re-aligned to 5434** |
| Phase B start | **Requires explicit user approval** |

## References

- [README.md](./README.md)  
- [00-initiation/PROJECT_CHARTER.md](./00-initiation/PROJECT_CHARTER.md)  
- [01-business-analysis/BUSINESS_RULES.md](./01-business-analysis/BUSINESS_RULES.md)  
- [11-security/PERMISSION_MATRIX.md](./11-security/PERMISSION_MATRIX.md)  
- [15-testing/v1-catalog/12-ui-uat.md](./15-testing/v1-catalog/12-ui-uat.md)  
