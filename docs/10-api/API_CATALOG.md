# API Catalog — CDT REST API

## Purpose

Normative endpoint catalog for MVP `/api/v1`.

## Audience

Backend, frontend, QA.

## Scope

MVP resources only. SST sync / billing export / notifications are Future.

## Definitions

| Term | Definition |
|------|------------|
| publicId | Business id `CD-#####`, `LV-#####`, `TSH-#####`, `DEL-#####` |
| `:id` | UUID or publicId where noted |
| yearMonth | `YYYY-MM` |

Base URL: `http://localhost:3000/api/v1`  
Auth: `Authorization: Bearer <accessToken>` unless Public.

Roles: `ADMIN`, `DELIVERY_MANAGER`, `HR`, `INTERNAL_MANAGER`.

---

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | Public | `{ email, password }` → tokens + user |
| POST | `/auth/refresh` | Cookie/body | Rotate refresh → new access |
| POST | `/auth/logout` | Auth | Revoke refresh |
| GET | `/auth/me` | Auth | Current user |

### Login

```json
// request
{ "email": "dm@example.com", "password": "********" }
// response 200
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "user": {
      "id": "uuid",
      "email": "dm@example.com",
      "fullName": "Dana Manager",
      "role": "DELIVERY_MANAGER"
    }
  }
}
```

---

## Users (ADMIN)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/users` | ADMIN | Paginated users |
| GET | `/users/:id` | ADMIN | Detail |
| POST | `/users` | ADMIN | Create `{ email, fullName, role, password }` |
| PATCH | `/users/:id` | ADMIN | Update role/name/`isActive` |
| POST | `/users/:id/reset-password` | ADMIN | Set temporary password |

Filters: `q`, `role`, `isActive`, `page`, `pageSize`, `sort`

---

## Clients

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/clients` | Auth | List |
| GET | `/clients/:id` | Auth | Detail |
| POST | `/clients` | ADMIN, DELIVERY_MANAGER | Create |
| PATCH | `/clients/:id` | ADMIN, DELIVERY_MANAGER | Update |
| DELETE | `/clients/:id` | ADMIN | Soft delete |

### Create request

```json
{ "name": "Acme Corp", "code": "ACME", "isActive": true }
```

---

## Candidates

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/candidates` | Auth | List + filters |
| GET | `/candidates/:id` | Auth | Detail (`UUID` or `CD-#####`) |
| POST | `/candidates` | ADMIN, DELIVERY_MANAGER | Create — allocates `CD-` |
| PATCH | `/candidates/:id` | ADMIN, DELIVERY_MANAGER | Update |
| POST | `/candidates/:id/release` | ADMIN, DELIVERY_MANAGER | Soft release |

Filters: `clientId`, `status=ACTIVE|RELEASED`, `q`, `page`, `pageSize`, `sort`

### Create request

```json
{
  "clientId": "uuid",
  "fullName": "Alex Candidate",
  "email": "alex@example.com",
  "mobile": "+91...",
  "roleTitle": "Java Developer",
  "joinedOn": "2026-07-01",
  "sstReference": null
}
```

### Release request

```json
{ "reason": "Project ended", "effectiveDate": "2026-08-31" }
```

### Create response (identity)

```json
{
  "id": "uuid",
  "publicId": "CD-00042",
  "status": "ACTIVE",
  "clientId": "uuid",
  "fullName": "Alex Candidate"
}
```

---

## Leaves

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/leaves` | Auth | List |
| GET | `/leaves/:id` | Auth | Detail (`UUID` or `LV-#####`) |
| POST | `/leaves` | ADMIN, DELIVERY_MANAGER, HR | Create DRAFT/PENDING |
| PATCH | `/leaves/:id` | ADMIN, DELIVERY_MANAGER, HR | Edit when DRAFT |
| POST | `/leaves/:id/submit` | ADMIN, DELIVERY_MANAGER, HR | → PENDING |
| POST | `/leaves/:id/approve` | ADMIN, HR | → APPROVED |
| POST | `/leaves/:id/reject` | ADMIN, HR | → REJECTED `{ reason }` |
| POST | `/leaves/:id/cancel` | ADMIN, DELIVERY_MANAGER, HR | → CANCELLED |

Filters: `candidateId`, `status`, `from`, `to`, `page`, `pageSize`

### Create request

```json
{
  "candidateId": "uuid",
  "leaveTypeCode": "ANNUAL",
  "startDate": "2026-08-10",
  "endDate": "2026-08-12",
  "days": 3,
  "reason": "Family",
  "submit": true
}
```

---

## Timesheets

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/timesheets` | Auth | List |
| GET | `/timesheets/:id` | Auth | Detail (`UUID` or `TSH-#####`) |
| PUT | `/timesheets` | ADMIN, DELIVERY_MANAGER | Upsert by candidate+yearMonth |
| POST | `/timesheets/:id/recalculate` | ADMIN, DELIVERY_MANAGER | Recompute from approved leave |
| POST | `/timesheets/:id/approve` | ADMIN, HR | → APPROVED |
| POST | `/timesheets/:id/reject` | ADMIN, HR | → REJECTED `{ reason }` |

Filters: `candidateId`, `clientId`, `yearMonth`, `page`, `pageSize`

### Upsert request

```json
{
  "candidateId": "uuid",
  "yearMonth": "2026-08",
  "workingDays": 22,
  "remarks": null
}
```

### Upsert response (derived fields)

```json
{
  "id": "uuid",
  "publicId": "TSH-00007",
  "candidateId": "uuid",
  "yearMonth": "2026-08",
  "workingDays": 22,
  "approvedLeaveDays": 3,
  "daysWorked": 19,
  "attendancePct": 86.36,
  "utilizationPct": 86.36
}
```

**BR:** Only `APPROVED` leave intersects the month. Duplicate period → `409 UNIQUE_PERIOD` on conflicting create semantics (PUT is idempotent upsert).

---

## Delivery reviews

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/delivery-reviews` | Auth | List |
| GET | `/delivery-reviews/:id` | Auth | Detail (`UUID` or `DEL-#####`) |
| PUT | `/delivery-reviews` | ADMIN, DELIVERY_MANAGER | Upsert by candidate+yearMonth |

Filters: `candidateId`, `clientId`, `yearMonth`, `health`, `page`, `pageSize`

### Upsert request

```json
{
  "candidateId": "uuid",
  "yearMonth": "2026-08",
  "health": "ESCALATED",
  "summary": "Delivery slippage",
  "escalationNotes": "Client escalation on 20 Aug; mitigation plan agreed."
}
```

**BR:** `health=ESCALATED` requires non-empty `escalationNotes` → else `400 ESCALATION_NOTES_REQUIRED`.

---

## Dashboard

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/dashboard/summary` | Auth | Counts: active candidates, pending leave, escalated reviews |
| GET | `/dashboard/utilization` | Auth | Utilization by candidate+month |
| GET | `/dashboard/engagement-health` | Auth | Health distribution |
| GET | `/dashboard/candidates-at-risk` | Auth | AT_RISK + ESCALATED rows |

Query: `yearMonth` (required for utilization/health), `clientId` optional.

### Utilization row (shape)

```json
{
  "candidateId": "uuid",
  "publicId": "CD-00042",
  "fullName": "Alex Candidate",
  "clientName": "Acme Corp",
  "yearMonth": "2026-08",
  "attendancePct": 86.36,
  "utilizationPct": 86.36,
  "health": "AT_RISK"
}
```

---

## Lookups

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/lookups/:type` | Auth | List values |
| POST | `/lookups/:type` | ADMIN | Create `{ code, label, sortOrder }` |
| PATCH | `/lookups/:type/:id` | ADMIN | Update label/active/sort |

`type` ∈ `LEAVE_TYPE` | `RELEASE_REASON` | (extensible)

---

## Audit logs

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/audit-logs` | ADMIN | Filter entityType, entityId, actorUserId, from, to |

---

## Health (outside or inside v1)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | Public | Liveness |
| GET | `/ready` | Public | DB ready |
| GET | `/metrics` | Public/locked | Prometheus |

---

## MVP vs Future endpoints

| Area | MVP | Future |
|------|-----|--------|
| `/integrations/sst/*` | No | Yes |
| `/integrations/billing/*` | No | Yes |
| `/notifications` | No | Yes |
| `/holidays` | No | Yes |

## Trade-offs

| Decision | Why |
|----------|-----|
| PUT upsert for TS/DR | Natural unique period key |
| Explicit recalculate | Late leave approvals without silent magic |
| Role columns in catalog | Single place for FE+BE alignment |

## Recommendations

- Keep Swagger tags identical to this catalog section headers.
- Version breaking changes under `/api/v2` later; do not silently change BR field meanings.

## References

- [OPENAPI_CONVENTIONS.md](./OPENAPI_CONVENTIONS.md)
- [ERRORS_PAGINATION_FILTERING.md](./ERRORS_PAGINATION_FILTERING.md)
- [../08-backend/MODULE_CATALOG.md](../08-backend/MODULE_CATALOG.md)
- [../11-security/PERMISSION_MATRIX.md](../11-security/PERMISSION_MATRIX.md)
