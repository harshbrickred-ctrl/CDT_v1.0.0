# Requirement Traceability Matrix (RTM) — CDT MVP

## Purpose

Trace Word/Excel source fields and FR IDs to domain entities, APIs, UI screens, business rules, and UAT scenarios.

## Audience

Engineers, QA, auditors of scope.

## Scope

MVP only. Future modules not fully traced.

## Definitions

| Column | Meaning |
|--------|---------|
| Source | Word § / Excel sheet concept |
| FR | Functional requirement ID |
| BR | Business rule ID |
| Entity | Domain entity / field |
| API | Primary endpoint family |
| UI | Screen |
| UAT | §25 scenario # |

---

## Candidates (Candidate Master)

| Source field | FR | BR | Entity.field | API | UI | UAT |
|--------------|----|----|--------------|-----|-----|-----|
| Candidate ID | FR-CAN-02 | BR-02, BR-29 | Candidate.publicId | `/candidates` | Candidates / Detail | 1 |
| Candidate Name | FR-CAN-01 | — | name | same | form | 1 |
| Client | FR-CAN-01, FR-CLI-03 | BR-11 | clientId | same | select | 11 |
| Project/Account | FR-CAN-01 | — | projectAccount | same | form | 1 |
| Role | FR-CAN-01 | — | role | same | form | 1 |
| Client Reporting Manager | FR-CAN-08 | — | clientReportingManager | same | form | — |
| Internal Manager | FR-CAN-08 | — | internalManagerUserId / text | same | form | — |
| Client Start Date | FR-CAN-01 | — | clientStartDate | same | form | 1 |
| Contract End Date | FR-CAN-04 | BR-23 | contractEndDate | PATCH release | release dialog | 10 |
| Work Location | FR-CAN-01, FR-MD-04 | BR-12 | workLocationId | same | select | — |
| Employment Status | FR-CAN-03/04 | BR-03, BR-25 | employmentStatus | same | badge | 10 |

## Leave

| Source field | FR | BR | Entity.field | API | UI | UAT |
|--------------|----|----|--------------|-----|-----|-----|
| Leave ID | FR-LV-03 | BR-29 | Leave.publicId | `/leaves` | Leave | 2 |
| Candidate | FR-LV-01 | BR-01 | candidateId | same | select | 1–2 |
| Leave Type | FR-LV-02, FR-MD-02 | BR-12 | leaveTypeId | same | select | 2 |
| From / To | FR-LV-02 | BR-17 | fromDate, toDate | same | form | 2–3 |
| Number of Days | FR-LV-02 | BR-17 | days (derived) | same | read-only | 2 |
| Status | FR-LV-04 | BR-04, BR-18 | status | approve/reject | Approvals | 2–4 |
| Approved By / Remarks | FR-LV-04, FR-AUD-01 | BR-30 | approvedBy, remarks | same | form | 3–4 |

## Timesheet

| Source field | FR | BR | Entity.field | API | UI | UAT |
|--------------|----|----|--------------|-----|-----|-----|
| Timesheet ID | FR-TS-03 | BR-29 | Timesheet.publicId | `/timesheets` | Timesheets | 5 |
| Candidate | FR-TS-01 | BR-01 | candidateId | same | select | 5 |
| Period Start/End | FR-TS-02 | BR-16 | periodStart, periodEnd | same | form | 5 |
| Calendar month key | FR-TS-06 | BR-14 | yearMonth | same | derived | 12 |
| Working Days | FR-TS-02 | BR-06 | workingDays | same | form | 5 |
| Days Worked | FR-TS-02 | BR-06 | daysWorked | same | form | 5 |
| Leave Days | FR-TS-04 | BR-04, BR-05, BR-20 | leaveDays (derived) | same | read-only | 2–4 |
| Attendance % | FR-TS-05 | BR-06 | attendancePct (derived) | same | read-only | 5 |
| Approval | FR-TS-07 | BR-19, BR-30 | approvalStatus | Approvals | Approvals | — |

## Delivery Review

| Source field | FR | BR | Entity.field | API | UI | UAT |
|--------------|----|----|--------------|-----|-----|-----|
| Delivery ID | FR-DR-02 | BR-29 | DeliveryReview.publicId | `/delivery-reviews` | Delivery Reviews | 6 |
| Candidate | FR-DR-01 | BR-01 | candidateId | same | select | 6 |
| Review period / month | FR-DR-07 | BR-07, BR-15 | reviewDate / yearMonth | same | form | 6, 12 |
| Utilization % | FR-DR-03/04 | BR-07, BR-08 | utilizationPct | same | read-only | 6 |
| Client Feedback | FR-DR-05 | BR-22 | clientFeedback | same | select | 7 |
| Engagement Health | FR-DR-05 | BR-09, BR-21 | engagementHealth | same | select | 7 |
| Escalation Notes | FR-DR-06 | BR-09 | escalationNotes | same | textarea | 7 |
| Reviewer / Date | FR-DR-08 | BR-30 | reviewedBy, reviewDate | same | form | 6 |

## Clients & Setup

| Source | FR | BR | Entity | API | UI | UAT |
|--------|----|----|--------|-----|-----|-----|
| Client list / filter | FR-CLI-01/02 | BR-11, BR-27 | Client | `/clients` | Clients | 11 |
| Setup dropdowns | FR-MD-01…08 | BR-12 | LookupValue | `/lookups` | Settings | — |

## Dashboard

| Source KPI | FR | BR | API | UI | UAT |
|------------|----|----|-----|-----|-----|
| Client / Health / Month filters | FR-DASH-01 | BR-26 | `/dashboard` | Dashboard | 8 |
| Active Candidates | FR-DASH-02 | BR-25 | same | KPI | 10 |
| On Leave Today | FR-DASH-03 | BR-10 | same | KPI | 9 |
| Pending Leave Approvals | FR-DASH-04 | BR-26 | same | KPI | 8 |
| Pending Timesheet Approvals | FR-DASH-05 | BR-26 | same | KPI | 8 |
| Avg Utilization % | FR-DASH-06 | BR-28 | same | KPI | 8 |
| Health breakdown/chart | FR-DASH-07 | — | same | chart | 8 |
| Released (Selected Month) | FR-DASH-08 | BR-23 | same | KPI | 10 |
| Good Client Feedback | FR-DASH-09 | BR-22 | same | KPI | 8 |
| Top-five clients | FR-DASH-10 | — | same | chart | 8 |
| Missing TS/DR | FR-DASH-11 | BR-08 | same | alert | — |

## Auth, Audit, Import

| Capability | FR | BR | API | UI | UAT |
|------------|----|----|-----|-----|-----|
| Login / JWT | FR-AUTH-01…03 | — | `/auth` | Login | — |
| Users & roles | FR-AUTH-04 | — | `/users` | Settings/Users | — |
| Approval audit | FR-AUD-01 | BR-30 | `/audit` | Audit | 3–4 |
| Health audit | FR-AUD-02 | BR-30 | `/audit` | Audit | 7 |
| Excel import | FR-IMP-01 | — | `/imports` | Settings/Import | — |
| SST import seam | FR-IMP-02 | — | `/imports/sst` | Settings/Import | 1 |

## UAT §25 coverage checklist

| # | Scenario | Primary FR/BR | Covered |
|---|----------|---------------|---------|
| 1 | Create Active candidate available in selectors | FR-CAN-01, BR-01 | Yes |
| 2 | Pending leave excluded from Leave Days | FR-LV-05, BR-04 | Yes |
| 3 | Approved leave included on overlap | BR-05 | Yes |
| 4 | Rejected leave excluded | BR-04 | Yes |
| 5 | 23/21 → 91.3% | BR-06 | Yes |
| 6 | DR pulls month utilization | BR-07 | Yes |
| 7 | At Risk requires notes | BR-09 | Yes |
| 8 | Dashboard filters scope | FR-DASH-01 | Yes |
| 9 | On Leave Today ignores month | BR-10 | Yes |
| 10 | Release reduces Active; history remains | BR-03, BR-25 | Yes |
| 11 | Duplicate client identity prevented | BR-11, BR-27 | Yes |
| 12 | Duplicate TS/DR same month blocked | BR-14, BR-15 | Yes |

## Trade-offs

| Choice | Pros | Cons |
|--------|------|------|
| Trace to Word §§ + Excel concepts | Faithful to source | Column letters less stable than SST Excel RTM |
| Include UAT column | Test-ready | Must update when scenarios expand |

## References

- [FUNCTIONAL_REQUIREMENTS.md](./FUNCTIONAL_REQUIREMENTS.md)  
- [BUSINESS_RULES.md](./BUSINESS_RULES.md)  
- [SOURCE_UNDERSTANDING.md](../00-initiation/SOURCE_UNDERSTANDING.md)  
- [../02-srs/SRS.md](../02-srs/SRS.md)  
