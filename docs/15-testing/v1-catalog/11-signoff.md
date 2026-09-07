# 11 — Sign-off

## Purpose

Formal UAT exit checklist before declaring CDT the system of record and retiring the spreadsheet.

## Audience

Product owner, QA lead, engineering lead, Delivery operations sponsor.

## Scope

MVP Must catalog. Waivers require written risk acceptance.

---

## 1. Preconditions

- [ ] Fresh UAT environment seeded with [00-test-data.md](./00-test-data.md) July pack  
- [ ] Build/version recorded: _______________  
- [ ] Migration revision recorded: _______________  
- [ ] No open S1 defects  
- [ ] S2 defects waived or fixed  

---

## 2. Mandatory UAT scenario checklist

| # | Scenario | Case IDs | Pass? | Initials |
|---|----------|----------|-------|----------|
| 1 | Create active candidate available in Leave/TS/DR | TC-CAN-001, TC-CAN-010 | ☐ | |
| 2 | Pending leave does not affect Leave Days | TC-LV-010, TC-TS-010 | ☐ | |
| 3 | Approved leave included when overlapping | TC-LV-011, TC-TS-011 | ☐ | |
| 4 | Rejected leave excluded | TC-LV-012, TC-TS-012 | ☐ | |
| 5 | July TS 23/21 → 91.3% attendance | TC-TS-020 | ☐ | |
| 6 | July DR pulls utilization | TC-DR-020 | ☐ | |
| 7 | Poor + At Risk requires escalation notes | TC-DR-030 | ☐ | |
| 8 | Dashboard client+month filters | TC-DASH-010 | ☐ | |
| 9 | On Leave Today ignores month filter | TC-DASH-020 | ☐ | |
| 10 | Release decreases active headcount; history remains | TC-CAN-030, TC-DASH-030 | ☐ | |
| 11 | Duplicate client names prevented | TC-MD-020 | ☐ | |
| 12 | Second timesheet/review same month blocked | TC-TS-030, TC-DR-040 | ☐ | |

---

## 3. Suite completion

| Suite | Executed by | Date | Result |
|-------|-------------|------|--------|
| 01 Smoke | | | |
| 02 Auth | | | |
| 03 Master data | | | |
| 04 Candidates | | | |
| 05 Leave | | | |
| 06 Timesheets | | | |
| 07 Delivery reviews | | | |
| 08 AuthZ | | | |
| 09 Dashboard | | | |
| 10 Audit/Import | | | |
| 12 UI UAT | | | |

---

## 4. Spreadsheet retirement readiness

| Gate | Owner | Done |
|------|-------|------|
| Excel extract imported & reconciled | Admin | ☐ |
| Parallel run period complete (dates: ______) | Ops | ☐ |
| Excel set read-only / archived path documented | Ops | ☐ |
| Users trained (Admin + User manuals) | Delivery lead | ☐ |
| Support contact / incident path known | Ops | ☐ |

---

## 5. Signatures

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product owner | | | |
| QA lead | | | |
| Engineering lead | | | |
| Delivery ops sponsor | | | |

**Decision:** ☐ CDT accepted as SoR — retire spreadsheet writes  
**Decision:** ☐ Conditional accept — waivers attached  
**Decision:** ☐ Rejected — return to remediations  

---

## References

- [TRACEABILITY.md](./TRACEABILITY.md)
- [12-ui-uat.md](./12-ui-uat.md)
- [../../12-planning/SPRINT_AND_MILESTONES.md](../../12-planning/SPRINT_AND_MILESTONES.md)
