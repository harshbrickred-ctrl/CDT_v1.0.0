# Functional Requirements — CDT MVP

## Purpose

Specify what the system must do for MVP, traced to the Excel/Word source and locked defaults.

## Audience

Product, engineers, QA.

## Scope

**MVP** functional requirements. Future capabilities labeled or deferred to [../04-domain/FUTURE_MODULES.md](../04-domain/FUTURE_MODULES.md).

## Definitions

| ID prefix | Area |
|-----------|------|
| FR-AUTH | Authentication & users |
| FR-MD | Master data / Setup |
| FR-CLI | Clients |
| FR-CAN | Candidate Master |
| FR-LV | Leave |
| FR-TS | Timesheet |
| FR-DR | Delivery Review |
| FR-DASH | Dashboard |
| FR-APPR | Approvals |
| FR-AUD | Audit |
| FR-IMP | Import / export |

---

## FR-AUTH — Authentication & users

| ID | Requirement | Priority | Label |
|----|-------------|----------|-------|
| FR-AUTH-01 | Users sign in with email + password | Must | MVP |
| FR-AUTH-02 | System issues short-lived JWT access token + refresh token | Must | MVP |
| FR-AUTH-03 | Refresh rotates access token; revoke refresh on logout | Must | MVP |
| FR-AUTH-04 | Admin can create/disable users and assign roles: `ADMIN`, `DELIVERY_MANAGER`, `HR`, `INTERNAL_MANAGER` | Must | MVP |
| FR-AUTH-05 | Password stored with strong hash (bcrypt/argon2) | Must | MVP |
| FR-AUTH-06 | Failed login rate limiting | Should | MVP |
| FR-AUTH-07 | SSO / IdP federation | Could | Future |

## FR-MD — Master data (Setup Lists)

| ID | Requirement | Source | Priority | Label |
|----|-------------|--------|----------|-------|
| FR-MD-01 | Manage Employment Status values (Active, Released, optional On Leave, Backup/Bench) | Setup | Must | MVP |
| FR-MD-02 | Manage Leave Type values (Casual, Sick, Earned, Unpaid, Maternity, Paternity, …) | Setup | Must | MVP |
| FR-MD-03 | Manage Leave / Timesheet Approval Status values | Setup | Must | MVP |
| FR-MD-04 | Manage Work Location values (Onsite, Remote, Hybrid) | Setup | Must | MVP |
| FR-MD-05 | Manage Client Feedback values (Good, Average, Poor) | Setup | Must | MVP |
| FR-MD-06 | Manage Engagement Health values (On Track, At Risk, Escalated) | Setup | Must | MVP |
| FR-MD-07 | Activate/deactivate lookup values without breaking historical rows | — | Must | MVP |
| FR-MD-08 | Seed defaults matching workbook Setup Lists | Excel | Must | MVP |

## FR-CLI — Clients

| ID | Requirement | Priority | Label |
|----|-------------|----------|-------|
| FR-CLI-01 | Create/list/update Clients as normalized entities | Must | MVP |
| FR-CLI-02 | Enforce unique client identity after trim + case-insensitive normalize | Must | MVP |
| FR-CLI-03 | Candidates reference `clientId` (not free-text as identity) | Must | MVP |
| FR-CLI-04 | Soft-deactivate client; block new Active candidates for inactive clients | Should | MVP |

## FR-CAN — Candidate Master

| ID | Requirement | Source | Priority | Label |
|----|-------------|--------|----------|-------|
| FR-CAN-01 | Create candidate with name, client, project/account, role, managers, start date, work location | §7 | Must | MVP |
| FR-CAN-02 | Assign system public ID `CD-#####`; not user-editable | BR-02 | Must | MVP |
| FR-CAN-03 | Default employment status Active on create | §7 | Must | MVP |
| FR-CAN-04 | Release candidate: status Released + require Contract End Date; never hard-delete | BR-03 | Must | MVP |
| FR-CAN-05 | Enforce at most one Active engagement per person identity (one active client engagement) | Charter | Must | MVP |
| FR-CAN-06 | List/filter/search candidates (client, status, manager, location, text) | §15 | Must | MVP |
| FR-CAN-07 | Candidate Detail 360°: placement + leave + timesheets + reviews + current health | §15 | Must | MVP |
| FR-CAN-08 | Internal Manager and Client Reporting Manager stored; Internal Manager linkable to user | §4 | Should | MVP |
| FR-CAN-09 | Import candidate from SST Joined payload/CSV via documented seam | §12 | Must | MVP |
| FR-CAN-10 | Live bidirectional SST sync | — | Could | Future |

## FR-LV — Leave

| ID | Requirement | Source | Priority | Label |
|----|-------------|--------|----------|-------|
| FR-LV-01 | Create leave for existing candidate only (BR-01) | §8 | Must | MVP |
| FR-LV-02 | Capture leave type, from/to dates, remarks; compute days = inclusive calendar (To−From+1) | §8 | Must | MVP |
| FR-LV-03 | Assign public ID `LV-#####` | §6 | Must | MVP |
| FR-LV-04 | Initial status Pending; transition to Approved or Rejected with approver | §14 | Must | MVP |
| FR-LV-05 | Only Approved leave contributes to Timesheet Leave Days (BR-04/05) | §8 | Must | MVP |
| FR-LV-06 | List/filter leave by candidate, client, status, date range | — | Must | MVP |
| FR-LV-07 | Validate from ≤ to; reject invalid ranges | — | Must | MVP |
| FR-LV-08 | Half-day / hours leave | — | Could | Future |
| FR-LV-09 | Holiday/weekend exclusion from day count | — | Could | Future |

## FR-TS — Timesheet

| ID | Requirement | Source | Priority | Label |
|----|-------------|--------|----------|-------|
| FR-TS-01 | Create monthly timesheet for existing candidate (BR-01) | §9 | Must | MVP |
| FR-TS-02 | Capture period start/end, working days, days worked, remarks | §9 | Must | MVP |
| FR-TS-03 | Assign public ID `TSH-#####` | §6 | Must | MVP |
| FR-TS-04 | Derive Leave Days from Approved leave overlapping period (BR-05) | §9 | Must | MVP |
| FR-TS-05 | Derive Attendance % = Days Worked / Working Days; blank if WD empty/zero (BR-06) | §9 | Must | MVP |
| FR-TS-06 | Enforce unique timesheet per candidate + calendar month | Charter | Must | MVP |
| FR-TS-07 | Approval status Pending → Approved / Rejected with approver | §14 | Must | MVP |
| FR-TS-08 | Recalculate Leave Days when overlapping leave is approved/rejected (while timesheet editable) | — | Must | MVP |
| FR-TS-09 | List/filter by candidate, client, month, approval status | — | Must | MVP |
| FR-TS-10 | Hours-based timesheets | — | Could | Future |
| FR-TS-11 | Weekly cadence | — | Could | Future |

## FR-DR — Delivery Review

| ID | Requirement | Source | Priority | Label |
|----|-------------|--------|----------|-------|
| FR-DR-01 | Create monthly delivery review for existing candidate (BR-01) | §10 | Must | MVP |
| FR-DR-02 | Assign public ID `DEL-#####` | §6 | Must | MVP |
| FR-DR-03 | Pull Utilization % from timesheet matching Candidate + calendar month (BR-07) | §10 | Must | MVP |
| FR-DR-04 | If no matching timesheet, show explicit missing state (BR-08) | §22 | Must | MVP |
| FR-DR-05 | Capture Client Feedback and Engagement Health (human judgment) | §10 | Must | MVP |
| FR-DR-06 | Require Escalation Notes when health is At Risk or Escalated (BR-09) | §10 | Must | MVP |
| FR-DR-07 | Enforce unique review per candidate + calendar month | Charter | Must | MVP |
| FR-DR-08 | Record reviewer and review date | §10 | Must | MVP |
| FR-DR-09 | List/filter risk reviews (At Risk / Escalated), client, month | — | Must | MVP |
| FR-DR-10 | Auto-set health from utilization thresholds | — | Won't | Future (policy) |

## FR-DASH — Dashboard

| ID | Requirement | Source | Priority | Label |
|----|-------------|--------|----------|-------|
| FR-DASH-01 | Filters: Client, Engagement Health, Month | §11 | Must | MVP |
| FR-DASH-02 | KPI: Active Candidates | §11 | Must | MVP |
| FR-DASH-03 | KPI: On Leave Today (current date; ignores Month — BR-10) | §11 | Must | MVP |
| FR-DASH-04 | KPI: Pending Leave Approvals | §11 | Must | MVP |
| FR-DASH-05 | KPI: Pending Timesheet Approvals | §11 | Must | MVP |
| FR-DASH-06 | KPI: Avg Utilization % for scope | §11 | Must | MVP |
| FR-DASH-07 | Health breakdown + chart | §11 | Must | MVP |
| FR-DASH-08 | Released (Selected Month) | §11 | Must | MVP |
| FR-DASH-09 | Good Client Feedback count | §11 | Must | MVP |
| FR-DASH-10 | Top-five clients chart (active headcount + avg utilization) | §11 | Must | MVP |
| FR-DASH-11 | Missing monthly Timesheets / Delivery Reviews indicator | §23 | Should | MVP |
| FR-DASH-12 | Export filtered KPI snapshot (CSV) | — | Should | MVP |

## FR-APPR — Approvals

| ID | Requirement | Priority | Label |
|----|-------------|----------|-------|
| FR-APPR-01 | Unified Approvals view for pending leave and timesheets | Must | MVP |
| FR-APPR-02 | Approve/Reject actions with remarks; RBAC-enforced | Must | MVP |
| FR-APPR-03 | Deep-link from Dashboard pending KPIs | Should | MVP |

## FR-AUD — Audit

| ID | Requirement | Priority | Label |
|----|-------------|----------|-------|
| FR-AUD-01 | Immutable audit log for leave/timesheet approval transitions | Must | MVP |
| FR-AUD-02 | Immutable audit log for engagement health (and feedback) changes | Must | MVP |
| FR-AUD-03 | Audit entries include actor, timestamp, entity, before/after | Must | MVP |
| FR-AUD-04 | Admin (and authorized roles) can query audit by entity | Must | MVP |

## FR-IMP — Import / export

| ID | Requirement | Priority | Label |
|----|-------------|----------|-------|
| FR-IMP-01 | Import Candidates / Leave / Timesheet / Delivery rows from Excel/CSV with validation report | Must | MVP |
| FR-IMP-02 | SST Joined import seam (file or API contract stub) creating/updating Candidate Master | Must | MVP |
| FR-IMP-03 | Export lists (candidates, leave, timesheets, reviews) CSV | Should | MVP |
| FR-IMP-04 | Live continuous SST sync worker | Could | Future |

## Out of scope pointers (Future)

Notifications, half-days, holiday calendars, hours, multi-engagement, SSO, billing companion UI — see [../04-domain/FUTURE_MODULES.md](../04-domain/FUTURE_MODULES.md).

## Trade-offs

| Choice | Pros | Cons |
|--------|------|------|
| Monthly uniqueness Must | Deterministic utilization join | Weekly orgs need Future |
| Import seam vs live sync | Delivers handoff without SST coupling | Manual/batch ops until Future |

## References

- [SOURCE_UNDERSTANDING.md](../00-initiation/SOURCE_UNDERSTANDING.md)  
- [BUSINESS_RULES.md](./BUSINESS_RULES.md)  
- [REQUIREMENT_TRACEABILITY_MATRIX.md](./REQUIREMENT_TRACEABILITY_MATRIX.md)  
- [../02-srs/SRS.md](../02-srs/SRS.md)  
