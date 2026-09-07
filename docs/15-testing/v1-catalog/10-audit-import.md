# 10 — Audit & Import

## Purpose

Mutation audit trail, overdue review listing (no notifications), and Excel migration path.

## Audit cases

### TC-AUD-001 — Create candidate writes audit

| Field | Value |
|-------|-------|
| FR/BR | FR-AUD-01 |
| Role | DELIVERY_MANAGER |
| Steps | Create candidate; Admin opens audit for entity |
| Expected | Entry with actor, action, entity id, timestamp |
| Sev | S2 |

### TC-AUD-002 — Approve leave writes audit

| Field | Value |
|-------|-------|
| FR/BR | FR-AUD-01 |
| Steps | Approve leave; inspect audit |
| Expected | Before/after status Pending→Approved |
| Sev | S2 |

### TC-AUD-003 — Admin query filters

| Field | Value |
|-------|-------|
| FR/BR | FR-AUD-02 |
| Role | ADMIN |
| Steps | Filter by entity type Timesheet + date range |
| Expected | Matching rows only |
| Sev | S3 |

### TC-AUD-004 — Non-admin cannot read audit

| Field | Value |
|-------|-------|
| Role | HR |
| Steps | GET audits |
| Expected | 403 |
| Sev | S1 |

### TC-AUD-010 — Overdue monthly reviews list (no notify)

| Field | Value |
|-------|-------|
| FR/BR | FR-AUD-03 |
| Preconditions | Active candidate missing DR for prior month |
| Steps | Open overdue reviews report/list |
| Expected | Candidate listed; **no** email/push required in MVP |
| Sev | S3 |

---

## Import cases

### TC-IMP-001 — Dry-run Excel/CSV validate

| Field | Value |
|-------|-------|
| FR/BR | FR-IMP-01/02 |
| Role | ADMIN |
| Steps | Upload extract; dry-run |
| Expected | Row-level errors reported; DB unchanged |
| Sev | S1 |

### TC-IMP-002 — Commit import clients + candidates

| Field | Value |
|-------|-------|
| FR/BR | FR-IMP-01 |
| Steps | Fix errors; commit |
| Expected | Rows created; public IDs assigned; audit entries |
| Sev | S1 |

### TC-IMP-003 — Import rejects duplicate client names

| Field | Value |
|-------|-------|
| FR/BR | BR-11 |
| Steps | Import file with duplicate normalized client |
| Expected | Row error; no duplicate client |
| Sev | S1 |

### TC-IMP-004 — Import timesheets recalculates Leave Days server-side

| Field | Value |
|-------|-------|
| FR/BR | BR-05, BR-06 |
| Steps | Import TS with wrong Leave Days/attendance in file |
| Expected | Server recomputes from Approved leave + formula; does not trust file blindly |
| Sev | S1 |

### TC-IMP-005 — Non-admin cannot import

| Field | Value |
|-------|-------|
| Role | DELIVERY_MANAGER |
| Steps | POST import |
| Expected | 403 |
| Sev | S1 |

---

## References

- [11-signoff.md](./11-signoff.md)
- [../../17-local-deployment/SEED_AND_MIGRATION.md](../../17-local-deployment/SEED_AND_MIGRATION.md)
