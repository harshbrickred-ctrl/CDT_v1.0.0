# 12 — UI UAT (Browser)

## Purpose

Product/QA browser journeys covering the end-to-end delivery-control loop. Complements API-focused cases.

## Audience

Product, QA, Delivery Manager / HR representatives.

## Scope

Happy path + mandatory UAT scenarios in the SPA. Use seeded July fixtures.

---

## Journey A — Placement to dashboard

### TC-UI-001 — Login as Delivery Manager

Steps: Open app → login `delivery.mgr@…` → land on Dashboard.  
Expected: Role-appropriate nav (Candidates, Leave, Timesheets, Delivery Reviews, Dashboard).

### TC-UI-002 — Create Active candidate (UAT)

Steps: Candidates → New → fill Acme placement → save.  
Expected: Toast/success; appears in list as Active; public ID shown; available in Leave/TS/DR pickers.

### TC-UI-003 — Create Pending leave

Steps: Leave → New → select candidate → dates → save.  
Expected: Pending badge; days calculated inclusively.

### TC-UI-004 — HR approves leave (UAT chain)

Steps: Logout → login HR → Approvals/Leave queue → Approve.  
Expected: Approved; later TS Leave Days includes it if overlapping.

### TC-UI-005 — July timesheet 91.3% (UAT)

Steps: Timesheets → New → July period → WD 23 / Worked 21 → save.  
Expected: Attendance **91.3%**; Leave Days shows Approved overlaps only.

### TC-UI-006 — Block second July timesheet (UAT)

Steps: Attempt another July TS for same candidate.  
Expected: Inline/API error; no second row.

### TC-UI-007 — July delivery review utilization (UAT)

Steps: Delivery Reviews → New → July date → observe Utilization.  
Expected: **91.3** pulled; feedback/health editable.

### TC-UI-008 — Poor + At Risk notes required (UAT)

Steps: Set Poor + At Risk with empty notes → save; then add notes → save.  
Expected: First blocked; second succeeds.

### TC-UI-009 — Block second July review (UAT)

Steps: Attempt second July DR.  
Expected: Error; no duplicate month.

### TC-UI-010 — Dashboard filters (UAT)

Steps: Set Client=Acme, Month=July; inspect KPIs/charts; change month; check On Leave Today.  
Expected: KPIs follow client+month; On Leave Today ignores month (BR-10).

### TC-UI-011 — Release candidate (UAT)

Steps: Open candidate → Release + end date → confirm → Dashboard.  
Expected: Active headcount down; history on detail remains.

### TC-UI-012 — Admin duplicate client (UAT)

Steps: Login Admin → Clients → create duplicate Acme name.  
Expected: Validation error.

---

## Journey B — AuthZ smoke in UI

### TC-UI-020 — HR cannot open Users admin

Expected: Nav hidden; deep link shows forbidden.

### TC-UI-021 — INTERNAL_MANAGER read dashboard

Expected: KPIs visible; create DR hidden/forbidden.

---

## Journey C — Search / 360

### TC-UI-030 — Search by public ID

Steps: Search `CD-00001` / `TSH-JUL-01`.  
Expected: Navigate to entity.

### TC-UI-031 — Candidate 360

Steps: Open candidate detail.  
Expected: Leave, TS, DR timeline sections.

---

## Execution notes

| Field | Value |
|-------|-------|
| Browser | Chrome / Edge latest |
| Viewport | Desktop 1440 + spot-check mobile 390 |
| Build | ________ |
| Tester | ________ |
| Date | ________ |

---

## References

- [11-signoff.md](./11-signoff.md)
- [README.md](./README.md)
- [../../21-guides/USER_MANUAL.md](../../21-guides/USER_MANUAL.md)
