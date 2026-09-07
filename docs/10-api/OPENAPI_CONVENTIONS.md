# OpenAPI Conventions — CDT

## Purpose

Standardize Swagger/OpenAPI documentation for the CDT NestJS API.

## Audience

Backend engineers, API consumers, QA.

## Scope

MVP OpenAPI 3.x served at `/docs` (Swagger UI) and `/docs-json`.

## Definitions

| Term | Definition |
|------|------------|
| OperationId | Stable unique operation name |
| Tag | Module-aligned grouping |
| Bearer auth | HTTP bearer JWT scheme |

---

## 1. Document metadata

```yaml
openapi: 3.0.3
info:
  title: Client Delivery & Resource Tracker API
  version: 1.0.0-mvp
servers:
  - url: http://localhost:3000/api/v1
```

## 2. Security schemes

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

Default security: `bearerAuth` on all operations except those marked `@Public()`.

## 3. Tags (align to modules)

| Tag | Module |
|-----|--------|
| Auth | AuthModule |
| Users | UsersModule |
| Clients | ClientsModule |
| Candidates | CandidatesModule |
| Leaves | LeaveModule |
| Timesheets | TimesheetsModule |
| Delivery Reviews | DeliveryReviewsModule |
| Dashboard | DashboardModule |
| Lookups | LookupsModule |
| Audit Logs | AuditModule |
| Health | HealthModule |

## 4. Naming

| Item | Convention |
|------|------------|
| operationId | `camelCase` verb + resource: `createCandidate`, `approveLeave`, `upsertTimesheet` |
| Path params | `{id}` with description “UUID or public id” |
| Schemas | `PascalCase` DTO names: `CreateLeaveRequest`, `TimesheetDto` |
| Enums | Match Prisma enums exactly |

## 5. Nest/Swagger practices

- `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation({ operationId, summary })`
- `@ApiOkResponse` / `@ApiCreatedResponse` with envelope wrappers or documented `data` schemas
- `@ApiExtraModels` for generic envelope if used
- Document `409` on unique period upserts and `400` BR codes

## 6. Envelope schemas

Document both success and error envelopes (see Errors doc) as reusable components:

- `SuccessEnvelope`
- `ListEnvelope`
- `ErrorEnvelope`

## 7. Examples

Every write operation should include at least one request example; timesheet and delivery-review examples must show derived vs required fields clearly (`attendancePct` response-only).

## 8. Versioning

| Approach | MVP |
|----------|-----|
| URL version | `/api/v1` |
| info.version | Semver of API contract |
| Deprecation | `deprecated: true` on operations before removal |

## MVP vs Future

| Topic | MVP | Future |
|-------|-----|--------|
| Published portal | Local Swagger | Developer portal |
| Contract tests | Optional | CI against OpenAPI |
| Webhooks section | No | Billing/SST events |

## Trade-offs

| Decision | Why |
|----------|-----|
| Hand-annotated Nest decorators | Stays close to code |
| Stable operationIds | Client generation friendly |

## Recommendations

- Fail CI if Swagger build throws (missing DTO decorators).
- Export `openapi.json` artifact in CI for FE type generation later.

## References

- [API_CATALOG.md](./API_CATALOG.md)
- [ERRORS_PAGINATION_FILTERING.md](./ERRORS_PAGINATION_FILTERING.md)
- [../08-backend/CROSS_CUTTING.md](../08-backend/CROSS_CUTTING.md)
