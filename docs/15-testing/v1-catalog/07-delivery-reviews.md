# 07 — Delivery Reviews

## Purpose

Monthly engagement reviews, utilization pull, feedback/health, escalation notes, uniqueness.

## Cases

### TC-DR-001 — Create delivery review

| Field | Value |
|-------|-------|
| FR/BR | FR-DR-01 |
| Role | DELIVERY_MANAGER |
| Steps | Select candidate; review date in month; feedback; health On Track; save |
| Expected | `DEL-#####`; name/client/role derived |
| Sev | S1 |

### TC-DR-020 — July DR pulls utilization (UAT)

| Field | Value |
|-------|-------|
| FR/BR | BR-07, FR-DR-01 |
| Preconditions | July timesheet with Attendance 91.3% exists |
| Steps | Create/open Delivery Review with review date in July 2026 |
| Expected | Utilization % = **91.3** (from matching Candidate + calendar month timesheet) |
| Sev | S1 |
| UAT | **Mandatory** |

### TC-DR-021 — Missing timesheet → blank utilization

| Field | Value |
|-------|-------|
| FR/BR | BR-08 |
| Preconditions | No TS for that month |
| Steps | Create DR for that month |
| Expected | Utilization blank/null; review still savable if other fields valid |
| Sev | S2 |

### TC-DR-030 — Poor + At Risk requires escalation notes (UAT)

| Field | Value |
|-------|-------|
| FR/BR | BR-09, FR-DR-02 |
| Role | DELIVERY_MANAGER |
| Steps | 1) Set Client Feedback=Poor, Engagement Health=At Risk, Escalation Notes empty → save 2) Add notes → save |
| Expected | Step 1 rejected (422/UI validation); Step 2 succeeds |
| Sev | S1 |
| UAT | **Mandatory** |

### TC-DR-031 — Escalated requires notes

| Field | Value |
|-------|-------|
| FR/BR | BR-09 |
| Steps | Health=Escalated without notes |
| Expected | Rejected |
| Sev | S1 |

### TC-DR-032 — On Track without notes allowed

| Field | Value |
|-------|-------|
| FR/BR | BR-09 |
| Steps | Health=On Track; notes empty |
| Expected | Allowed |
| Sev | S2 |

### TC-DR-040 — Second review same month blocked (UAT)

| Field | Value |
|-------|-------|
| FR/BR | FR-DR-03 |
| Preconditions | July DR exists for candidate |
| Steps | Create another DR with date in July 2026 for same candidate |
| Expected | 422 / conflict; unique Candidate + calendar month |
| Sev | S1 |
| UAT | **Mandatory** |

### TC-DR-050 — Engagement health is manual (not auto from utilization)

| Field | Value |
|-------|-------|
| FR/BR | FR-DR-02 |
| Steps | Set low utilization context but choose On Track |
| Expected | System does not override health |
| Sev | S2 |

---

## References

- [06-timesheets.md](./06-timesheets.md)
- [09-dashboard.md](./09-dashboard.md)
