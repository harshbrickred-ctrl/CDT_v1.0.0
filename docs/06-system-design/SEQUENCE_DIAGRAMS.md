# Sequence Diagrams — CDT

## Purpose

Document key runtime sequences for implementers, QA, and design reviewers.

## Audience

Backend/frontend engineers, QA, tech leads.

## Scope

MVP critical paths: login; leave create → approve → timesheet calc; delivery review utilization; soft-release candidate.

## Definitions

| Term | Definition |
|------|------------|
| Access token | Short-lived JWT (Bearer) |
| Refresh token | Longer-lived, hashed at rest, rotatable |
| yearMonth | Canonical period key `YYYY-MM` |
| Soft release | Set candidate `status=RELEASED` / `releasedAt`; retain rows |

---

## 1. Login

```mermaid
sequenceDiagram
  participant UI as SPA
  participant API as AuthController
  participant S as AuthService
  participant DB as PostgreSQL

  UI->>API: POST /api/v1/auth/login {email, password}
  API->>S: validate credentials
  S->>DB: find user by email (active)
  S->>S: verify password hash
  alt invalid
    API-->>UI: 401 INVALID_CREDENTIALS
  else valid
    S->>DB: store refresh token hash
    S-->>API: accessToken + refreshToken + user
    API-->>UI: 200 + Set-Cookie refresh (httpOnly) optional
  end
```

### Refresh (silent)

```mermaid
sequenceDiagram
  participant UI
  participant API
  participant DB
  UI->>API: POST /auth/refresh
  API->>DB: lookup refresh hash, not revoked, not expired
  API->>DB: rotate refresh (revoke old, insert new)
  API-->>UI: new accessToken (+ refresh)
```

---

## 2. Create leave → approve → timesheet calculation

```mermaid
sequenceDiagram
  participant UI
  participant LeaveAPI as LeaveController
  participant LeaveSvc as LeaveService
  participant TSAPI as TimesheetsController
  participant TSSvc as TimesheetsService
  participant DB
  participant Audit

  Note over UI,Audit: A. Create & submit leave
  UI->>LeaveAPI: POST /leaves JWT (HR|DM|ADMIN)
  LeaveAPI->>LeaveSvc: create DRAFT/PENDING
  LeaveSvc->>DB: insert leave LV-#####
  LeaveSvc->>Audit: LEAVE_CREATED
  LeaveAPI-->>UI: 201 LeaveDto

  UI->>LeaveAPI: POST /leaves/:id/submit
  LeaveAPI->>LeaveSvc: DRAFT→PENDING
  LeaveSvc->>DB: update status
  LeaveSvc->>Audit: LEAVE_SUBMITTED

  Note over UI,Audit: B. Approve (DELIVERY_MANAGER|ADMIN)
  UI->>LeaveAPI: POST /leaves/:id/approve
  LeaveAPI->>LeaveSvc: PENDING→APPROVED
  LeaveSvc->>DB: update + approverId + approvedAt
  LeaveSvc->>Audit: LEAVE_APPROVED
  LeaveAPI-->>UI: 200

  Note over UI,Audit: C. Timesheet upsert + recalc
  UI->>TSAPI: PUT /timesheets {candidateId, yearMonth, workingDays, ...}
  TSAPI->>TSSvc: upsert unique candidate+month
  TSSvc->>DB: sum APPROVED leave days overlapping month
  TSSvc->>TSSvc: daysWorked = f(workingDays, approvedLeave, adjustments)
  TSSvc->>TSSvc: attendancePct = daysWorked / workingDays
  TSSvc->>DB: upsert timesheet TSH-#####
  TSSvc->>Audit: TIMESHEET_UPSERTED
  TSAPI-->>UI: 200 TimesheetDto (attendancePct)
```

### Calculation notes (normative for MVP)

| Input | Source |
|-------|--------|
| `workingDays` | Request body or period config |
| `approvedLeaveDays` | Sum of approved leave intersecting `yearMonth` |
| `daysWorked` | Service-computed (never trust client-only %) |
| `attendancePct` | `daysWorked / workingDays` (0 if workingDays=0 → 400) |

Rejected/draft/cancelled leave **must not** affect the sum.

---

## 3. Delivery review + utilization

```mermaid
sequenceDiagram
  participant UI
  participant DR as DeliveryReviewsController
  participant S as DeliveryReviewsService
  participant TS as TimesheetsService
  participant DB
  participant Audit

  UI->>DR: PUT /delivery-reviews {candidateId, yearMonth, health, notes?}
  DR->>S: upsert
  S->>DB: ensure candidate ACTIVE or historically visible
  S->>TS: load timesheet for candidate+month (optional attach)
  S->>S: if health=ESCALATED require escalationNotes
  alt missing notes
    DR-->>UI: 400 ESCALATION_NOTES_REQUIRED
  else ok
    S->>DB: upsert unique DEL-##### 
    S->>S: utilization snapshot from timesheet attendance/utilization fields
    S->>Audit: DELIVERY_REVIEW_UPSERTED
    DR-->>UI: 200 DeliveryReviewDto
  end

  Note over UI,DB: Dashboard read path
  UI->>DR: GET /dashboard/utilization?yearMonth=&clientId=
  DR->>DB: aggregate by candidate+month
  DR-->>UI: utilization rows + health RAG
```

Utilization is reported **by candidate + month**. MVP sources primary % from timesheet attendance/utilization fields; review stores judgment + optional snapshot.

---

## 4. Soft-release candidate

```mermaid
sequenceDiagram
  participant UI
  participant Cand as CandidatesController
  participant S as CandidatesService
  participant DB
  participant Audit

  UI->>Cand: POST /candidates/:id/release {reason?, effectiveDate?}
  Cand->>S: softRelease
  S->>DB: load candidate
  alt already RELEASED
    Cand-->>UI: 409 ALREADY_RELEASED
  else active
    S->>DB: status=RELEASED, releasedAt=now, releasedById
    Note over S,DB: Leave/Timesheet/Reviews retained
    S->>Audit: CANDIDATE_RELEASED
    Cand-->>UI: 200 CandidateDto
  end
```

Released candidates:

- Excluded from default “active” lists (`status=ACTIVE` filter).
- Still addressable by publicId/UUID for history.
- Blocked from new leave/timesheet/review creates (MVP rule); historical edits per RBAC.

---

## 5. Unauthorized / forbidden (cross-cutting)

```mermaid
sequenceDiagram
  participant UI
  participant Guard
  participant Ctrl
  UI->>Guard: request without/invalid JWT
  Guard-->>UI: 401
  UI->>Guard: valid JWT, wrong role
  Guard-->>UI: 403
  Guard->>Ctrl: pass
```

## MVP vs Future

| Sequence | MVP | Future |
|----------|-----|--------|
| Login | Password + JWT/refresh | SSO redirect + OIDC |
| Leave→TS | Manual approve + PUT timesheet | Auto-recalc on approve event / queue |
| Review | Sync PUT | Notifications on ESCALATED |
| Release | Soft status | SST/Billing outbound events |

## Trade-offs

| Choice | Why |
|--------|-----|
| Explicit timesheet PUT after approve | Clear audit boundary; simpler MVP transactions |
| Utilization on review/dashboard reads | Avoid dual-write races in MVP |
| Soft release blocks new period docs | Prevents zombie open months |

## Recommendations

- Implement approve and timesheet recalc in separate API calls for MVP; add domain events later if auto-recalc is required.
- Always write audit rows in the same DB transaction as the state change.

## References

- [DATA_FLOW.md](./DATA_FLOW.md)
- [../10-api/API_CATALOG.md](../10-api/API_CATALOG.md)
- [../11-security/AUTH_RBAC.md](../11-security/AUTH_RBAC.md)
- [../07-database/ER_AND_SCHEMA.md](../07-database/ER_AND_SCHEMA.md)
