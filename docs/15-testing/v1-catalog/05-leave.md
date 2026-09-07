# 05 — Leave

## Purpose

Leave create, day calculation, approval gate, and impact rules on Timesheet Leave Days.

## Cases

### TC-LV-001 — Create Pending leave

| Field | Value |
|-------|-------|
| FR/BR | FR-LV-01 |
| Role | HR or DELIVERY_MANAGER per matrix |
| Steps | Select Active candidate; type; from/to; save |
| Expected | Status Pending; public ID `LV-#####`; name/client derived |
| Sev | S1 |

### TC-LV-002 — Inclusive calendar days

| Field | Value |
|-------|-------|
| FR/BR | FR-LV-02 |
| Steps | From 2026-07-03 to 2026-07-04 |
| Expected | Number of Days = 2 |
| Sev | S1 |

### TC-LV-003 — Approve leave

| Field | Value |
|-------|-------|
| FR/BR | FR-LV-03 |
| Role | HR |
| Steps | Approve Pending leave; set approver/remarks |
| Expected | Status Approved |
| Sev | S1 |

### TC-LV-004 — Reject leave

| Field | Value |
|-------|-------|
| FR/BR | FR-LV-03 |
| Steps | Reject Pending leave |
| Expected | Status Rejected |
| Sev | S1 |

### TC-LV-010 — Pending leave does not affect Leave Days (UAT)

| Field | Value |
|-------|-------|
| FR/BR | BR-04 |
| Preconditions | July TS exists or create TS for July; only Pending leave overlaps (no Approved) |
| Steps | 1) Ensure overlapping leave is Pending 2) Recalculate/view Timesheet Leave Days |
| Expected | Leave Days does **not** include Pending days |
| Sev | S1 |
| UAT | **Mandatory** |

### TC-LV-011 — Approved leave included when overlapping (UAT)

| Field | Value |
|-------|-------|
| FR/BR | BR-04, BR-05 |
| Preconditions | Approved leave 2026-07-03..07-04 (2 days); July TS period |
| Steps | View/create July timesheet Leave Days |
| Expected | Leave Days includes 2 (plus any other Approved overlaps only) |
| Sev | S1 |
| UAT | **Mandatory** |

### TC-LV-012 — Rejected leave excluded (UAT)

| Field | Value |
|-------|-------|
| FR/BR | BR-04 |
| Preconditions | Rejected leave overlaps July |
| Steps | View July timesheet Leave Days |
| Expected | Rejected days not included |
| Sev | S1 |
| UAT | **Mandatory** |

### TC-LV-020 — Approval queue filter

| Field | Value |
|-------|-------|
| FR/BR | FR-LV-04 |
| Role | HR |
| Steps | Filter Pending + client Acme |
| Expected | Only matching Pending leaves |
| Sev | S3 |

### TC-LV-030 — Invalid date range

| Field | Value |
|-------|-------|
| FR/BR | FR-LV-02 |
| Steps | To date before From date |
| Expected | 422 |
| Sev | S2 |

---

## References

- [06-timesheets.md](./06-timesheets.md)
- [00-test-data.md](./00-test-data.md)
