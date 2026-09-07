# 09 — Dashboard

## Purpose

KPI cards, filters, On Leave Today semantics, and headcount after release.

## Cases

### TC-DASH-001 — KPI cards render

| Field | Value |
|-------|-------|
| FR/BR | FR-DASH-01 |
| Role | DELIVERY_MANAGER |
| Steps | Open Dashboard |
| Expected | Active Candidates, Pending Leave, Pending Timesheet, Avg Utilization, Health counts, Good feedback, Released (month) visible |
| Sev | S2 |

### TC-DASH-010 — Dashboard client + month filters (UAT)

| Field | Value |
|-------|-------|
| FR/BR | FR-DASH-02 |
| Preconditions | Data for Acme (July) and Globex (other month) |
| Steps | 1) Filter Client=Acme Corp, Month=July 2026 2) Observe KPIs/charts 3) Switch Client=Globex |
| Expected | Metrics and charts recompute to selected client + month scope |
| Sev | S1 |
| UAT | **Mandatory** |

### TC-DASH-020 — On Leave Today ignores month filter (UAT)

| Field | Value |
|-------|-------|
| FR/BR | BR-10 |
| Preconditions | `LV-TODAY` Approved covering today; Dashboard showing On Leave Today = K |
| Steps | 1) Note On Leave Today value 2) Change Month filter to a different month (e.g. January 2025) 3) Change Client if needed but keep candidate in scope for client filter rules as documented |
| Expected | On Leave Today remains based on **current date** leave overlap; does **not** drop solely because month filter changed |
| Sev | S1 |
| UAT | **Mandatory** |

### TC-DASH-021 — On Leave Today respects Active + approved leave today

| Field | Value |
|-------|-------|
| FR/BR | BR-10 |
| Steps | Release candidate who was on leave today; refresh |
| Expected | No longer counted in On Leave Today |
| Sev | S2 |

### TC-DASH-030 — Release decreases active headcount (UAT companion)

| Field | Value |
|-------|-------|
| FR/BR | FR-DASH-04, BR-03 |
| Preconditions | See TC-CAN-030 |
| Steps | Compare Active Candidates before/after release |
| Expected | Decrements by 1; Released (Selected Month) increments when end date in selected month |
| Sev | S1 |
| UAT | **Mandatory** (with TC-CAN-030) |

### TC-DASH-040 — Health breakdown filter

| Field | Value |
|-------|-------|
| FR/BR | FR-DASH-02 |
| Steps | Filter Engagement Health=At Risk |
| Expected | Breakdown/list scoped to At Risk reviews for Client/Month |
| Sev | S3 |

### TC-DASH-050 — Avg Utilization from timesheets in scope

| Field | Value |
|-------|-------|
| FR/BR | FR-DASH-01 |
| Preconditions | July Acme TS 91.3% |
| Steps | Filter Acme + July |
| Expected | Avg Utilization reflects in-scope timesheets (91.3% if single) |
| Sev | S2 |

---

## References

- [04-candidates.md](./04-candidates.md)
- [00-test-data.md](./00-test-data.md)
