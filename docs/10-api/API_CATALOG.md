# API Catalog — CDT REST API

## Purpose

Normative endpoint catalog for shipped `/api/v1` (aligned to Nest controllers).

## Audience

Backend, frontend, QA.

## Scope

Shipped resources. Live SST sync / external billing export / notifications are Future.

## Definitions

| Term | Definition |
|------|------------|
| publicId | Business id `CD-`, `LV-`, `TSH-`, `DEL-`, `INV-` |
| `:id` | UUID or publicId where supported |
| yearMonth | `YYYY-MM` |
| Employee | UI term; API resource path remains `/candidates` |

Base URL: `http://localhost:3000/api/v1`  
Auth: `Authorization: Bearer <accessToken>` unless Public.

Roles: `ADMIN`, `DELIVERY_OWNER`, `ACCOUNT_OWNER`.

---

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | Public | `{ email, password }` → tokens + user |
| POST | `/auth/refresh` | Body refresh | Rotate tokens |
| POST | `/auth/logout` | Auth | Revoke refresh |
| GET | `/auth/me` | Auth | Current user |

---

## Users

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/users` | ADMIN (+ limited DO for assign lists) | Paginated |
| POST / PATCH | `/users`… | ADMIN | Create / update |

---

## Clients

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/clients` | Auth | List (`costCenter`, ownership) |
| POST / PATCH / DELETE | `/clients`… | ADMIN, DELIVERY_OWNER | Mutate |

Body includes `name`, `code`, `costCenter` (`BRICKRED`\|`AGYOM`), ownership user ids.

---

## Candidates (Employees)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/candidates` | Auth | List + filters |
| GET | `/candidates/:id` | Auth | Detail + bench feedback |
| POST | `/candidates` | ADMIN, DELIVERY_OWNER | Create — allocates `CD-` |
| PATCH | `/candidates/:id` | ADMIN, DELIVERY_OWNER | Update |
| POST | `/candidates/:id/release` | ADMIN, DELIVERY_OWNER | Soft release |
| POST | `/candidates/:id/bench-feedback` | Auth (detail) | Add DM/AO feedback entry |

Filters: `clientId`, `status`, `category`, `costCenter`, `q`, pagination.

Categories: `BILLABLE` | `NON_BILLABLE` | `BENCH`.

Bench fields: `benchStartDate`, `interviewsScheduledCount`, `interviewsClearedCount` (cleared ≤ scheduled).

---

## Leaves

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/leaves` | Auth | List |
| POST / PATCH | `/leaves`… | ADMIN, DELIVERY_OWNER | Create / update Pending |
| POST | `/leaves/:id/approve` | ADMIN, ACCOUNT_OWNER | Approve |
| POST | `/leaves/:id/reject` | ADMIN, ACCOUNT_OWNER | Reject |

---

## Timesheets

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/timesheets` | Auth | List |
| POST / PATCH | `/timesheets`… | ADMIN, DELIVERY_OWNER | Create / update (billable Active only) |
| POST | `/timesheets/:id/approve` | ADMIN, ACCOUNT_OWNER | Approve (may auto-create draft invoice) |
| POST | `/timesheets/:id/reject` | ADMIN, ACCOUNT_OWNER | Reject |

Unique per employee + `yearMonth`.

---

## Delivery reviews

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/delivery-reviews` | Auth | List |
| POST / PUT / PATCH | `/delivery-reviews`… | ADMIN, DELIVERY_OWNER | Upsert (billable Active only) |

`engagementHealth`: `ON_TRACK` | `AT_RISK` | `ESCALATED`  
`clientFeedback`: `GOOD` | `AVERAGE` | `POOR`  
Escalation notes required when `ESCALATED`.

---

## Invoices

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/invoices` | Auth | List |
| POST | `/invoices/generate` | ADMIN, DELIVERY_OWNER, ACCOUNT_OWNER | From approved timesheet |
| POST | `/invoices/:id/approve` | ADMIN, ACCOUNT_OWNER | → APPROVED |
| POST | `/invoices/:id/send` | ADMIN, ACCOUNT_OWNER | → SENT |
| POST | `/invoices/:id/paid` | ADMIN, ACCOUNT_OWNER | → PAID |
| POST | `/invoices/:id/reject` | ADMIN, ACCOUNT_OWNER | → REJECTED |

Statuses: `PENDING_REVIEW` → `APPROVED` → `SENT` → `PAID`, or `REJECTED`.

---

## Dashboard / Search

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/dashboard/summary` | Auth | KPI payload (`costCenter`, filters) |
| GET | `/search` | Auth | Employees / clients quick search |

---

## Lookups / Audit / Import

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/lookups`… | Auth | Read vocabularies |
| POST / PATCH | `/lookups`… | ADMIN | Mutate |
| GET | `/audit` | ADMIN | Audit trail |
| POST | `/import/dry-run` | ADMIN | Validate payload |
| POST | `/import/commit` | ADMIN | Persist import |

---

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | Public | Liveness (`/health` on app root, not under `/api/v1`) |

Swagger UI: `/api/docs`.

## References

- [OPENAPI_CONVENTIONS.md](./OPENAPI_CONVENTIONS.md)
- [../11-security/PERMISSION_MATRIX.md](../11-security/PERMISSION_MATRIX.md)
- Live OpenAPI from running API is authoritative for field shapes.
