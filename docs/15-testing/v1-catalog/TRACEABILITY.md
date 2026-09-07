# TRACEABILITY — Must FR / Critical BR → Test cases

Status column filled during/after execution (Pass / Fail / N/A / Partial).

## Catalog ID aliases

Some suite files use short IDs (`CA-01`, `UAT-01`) and others use `TC-*` IDs. Both are valid; map as follows when executing:

| Short | TC-style |
|-------|----------|
| CA-01…CA-06 | TC-CAN-001… related |
| UAT-01…UAT-12 | TC-UI-* / §25 scenarios in `12-ui-uat.md` |
| SM-01… | TC-SMK-* |
| AZ-* / TC-AZ-* | Authz matrix |

Prefer `TC-*` IDs in automated suites when Phase B lands.

## FR-AUTH (Must)

| FR | Cases | Status |
|----|-------|--------|
| FR-AUTH-01 | TC-SMK-004–005, TC-AUTH-001, TC-AZ-001 | |
| FR-AUTH-02 | TC-AUTH-002 | |
| FR-AUTH-03 | TC-AUTH-003–004 | |
| FR-AUTH-04 | TC-DATA-001, TC-AUTH-005–007, TC-AUTH-009 | |
| FR-AUTH-05 | TC-AUTH-008, TC-MD-040, TC-AZ-* | |

## FR-MD (Must)

| FR | Cases | Status |
|----|-------|--------|
| FR-MD-01..05 | TC-MD-001–005 | |
| FR-MD-08 | TC-MD-010, TC-MD-020–021, TC-IMP-003 | |
| FR-MD-13 | TC-MD-030 | |

## FR-CAN (Must)

| FR | Cases | Status |
|----|-------|--------|
| FR-CAN-01 | TC-DATA-003, TC-CAN-001, TC-UI-002 | |
| FR-CAN-02 | TC-CAN-002 | |
| FR-CAN-03 | TC-CAN-040 | |
| FR-CAN-04 | TC-CAN-020 | |
| FR-CAN-05 | TC-CAN-030, TC-UI-011 | |
| FR-CAN-06 | TC-CAN-050, TC-UI-031 | |

## FR-LV (Must)

| FR | Cases | Status |
|----|-------|--------|
| FR-LV-01 | TC-LV-001, TC-UI-003 | |
| FR-LV-02 | TC-LV-002, TC-LV-030 | |
| FR-LV-03 | TC-LV-003–004, TC-UI-004 | |
| FR-LV-04 | TC-LV-020 | |
| FR-LV-05 | TC-LV-001 | |

## FR-TS (Must)

| FR | Cases | Status |
|----|-------|--------|
| FR-TS-01 | TC-TS-001, TC-TS-020, TC-UI-005 | |
| FR-TS-02 | TC-TS-030, TC-UI-006 | |
| FR-TS-03 | TC-TS-040–050 | |
| FR-TS-04 | TC-TS-001 | |

## FR-DR (Must)

| FR | Cases | Status |
|----|-------|--------|
| FR-DR-01 | TC-DR-001, TC-DR-020, TC-UI-007 | |
| FR-DR-02 | TC-DR-030–032, TC-UI-008 | |
| FR-DR-03 | TC-DR-040, TC-UI-009 | |
| FR-DR-04 | TC-DR-001 | |

## FR-DASH (Must)

| FR | Cases | Status |
|----|-------|--------|
| FR-DASH-01 | TC-DASH-001, TC-DASH-050 | |
| FR-DASH-02 | TC-DASH-010, TC-DASH-040, TC-UI-010 | |
| FR-DASH-03 | TC-DASH-010 | |
| FR-DASH-04 | TC-DASH-030, TC-CAN-030 | |

## FR-AUD / FR-IMP / FR-RPT

| FR | Cases | Status |
|----|-------|--------|
| FR-AUD-01 | TC-AUD-001–002 | |
| FR-AUD-02 | TC-AUD-003–004 | |
| FR-AUD-03 | TC-AUD-010 | |
| FR-IMP-01 | TC-IMP-001–002, TC-IMP-004 | |
| FR-IMP-02 | TC-IMP-001 | |
| FR-RPT-01 | TC-UI-030 | |
| FR-RPT-02 | TC-CAN-050, TC-UI-031 | |

## Critical BR

| BR | Cases | Status |
|----|-------|--------|
| BR-01 | TC-CAN-001, TC-CAN-031, TC-CAN-010 | |
| BR-02 | TC-CAN-002 | |
| BR-03 | TC-CAN-030, TC-DASH-030 | |
| BR-04 | TC-LV-010–012, TC-TS-010–012 | |
| BR-05 | TC-LV-011, TC-TS-011, TC-DATA-004 | |
| BR-06 | TC-TS-020–021, TC-DATA-004 | |
| BR-07 | TC-DR-020 | |
| BR-08 | TC-DR-021 | |
| BR-09 | TC-DR-030–032 | |
| BR-10 | TC-DASH-020–021, TC-DATA-005 | |
| BR-11 | TC-MD-020–021, TC-IMP-003 | |
| BR-12 | TC-MD-001–005 | |

## Mandatory UAT scenario index

| Scenario | Cases |
|----------|-------|
| Active candidate in Leave/TS/DR | TC-CAN-001, TC-CAN-010, TC-UI-002 |
| Pending leave ≠ Leave Days | TC-LV-010, TC-TS-010 |
| Approved overlapping leave included | TC-LV-011, TC-TS-011 |
| Rejected leave excluded | TC-LV-012, TC-TS-012 |
| July 23/21 → 91.3% | TC-TS-020, TC-UI-005 |
| July DR utilization | TC-DR-020, TC-UI-007 |
| Poor + At Risk notes | TC-DR-030, TC-UI-008 |
| Dashboard client+month | TC-DASH-010, TC-UI-010 |
| On Leave Today ignores month | TC-DASH-020 |
| Release headcount + history | TC-CAN-030, TC-DASH-030, TC-UI-011 |
| Duplicate clients blocked | TC-MD-020, TC-UI-012 |
| Second TS/DR same month blocked | TC-TS-030, TC-DR-040, TC-UI-006, TC-UI-009 |

## References

- [README.md](./README.md)
- [11-signoff.md](./11-signoff.md)
- [../../01-business-analysis/RTM.md](../../01-business-analysis/RTM.md)
