# Cross-Cutting Concerns — CDT API

## Purpose

Document cross-cutting NestJS mechanisms shared by all CDT modules.

## Audience

Backend engineers, security, QA.

## Scope

MVP: auth guards, validation, errors, logging, audit hooks, config, pagination. Distributed tracing vendor APM is Future.

## Definitions

| Term | Definition |
|------|------------|
| Envelope | Standard JSON response wrapper |
| Guard | Nest can-activate authz/authn |
| Filter | Maps exceptions to HTTP |

---

## 1. Configuration

- `@nestjs/config` with Joi/Zod env validation at boot
- Fail fast if `DATABASE_URL` or JWT secrets missing
- Separate `access` vs `refresh` secrets

## 2. Authentication & authorization

| Mechanism | Use |
|-----------|-----|
| `JwtAuthGuard` global | All routes except `@Public()` |
| `RolesGuard` | `@Roles(...)` metadata |
| `@CurrentUser()` | Param decorator |

Server RBAC is authoritative; UI hiding is UX only.

## 3. Validation

| Layer | Tool |
|-------|------|
| HTTP DTO | class-validator |
| Shared contracts | Zod in `packages/shared-types` |
| Parse UUID/publicId | Custom pipe accepting both where documented |

Reject unknown fields (`whitelist: true`, `forbidNonWhitelisted: true`).

## 4. Exception filter

```json
{
  "success": false,
  "error": {
    "code": "ESCALATION_NOTES_REQUIRED",
    "message": "Escalation notes are required when health is ESCALATED",
    "details": []
  },
  "meta": { "requestId": "..." }
}
```

Map Prisma `P2002` → `409 UNIQUE_PERIOD` for timesheet/review.

## 5. Response interceptor

Success envelope (list):

```json
{
  "success": true,
  "data": [ ... ],
  "meta": { "page": 1, "pageSize": 20, "total": 100, "requestId": "..." }
}
```

## 6. Logging (Pino)

| Field | Include |
|-------|---------|
| requestId | Yes |
| userId / role | Yes when authed |
| method/path/status/duration | Yes |
| secrets / PII passwords | Never |

## 7. Audit hook

- `AuditService.record({ entityType, entityId, action, before, after })`
- Called from application services inside transactions
- Redaction utility for sensitive fields

## 8. Pagination & filtering

Common query DTO:

| Param | Default | Notes |
|-------|---------|-------|
| page | 1 | 1-based |
| pageSize | 20 | max 100 |
| sort | `-createdAt` | `-` prefix desc |
| q | — | name/publicId search where applicable |

Resource-specific filters documented in API catalog (`yearMonth`, `clientId`, `status`, `health`, `candidateId`).

## 9. CORS & security headers

- CORS limited to `CORS_ORIGIN`
- Helmet (or equivalent) in `main.ts`
- Rate-limit login endpoint (MVP basic / Future gateway)

## 10. Health & metrics

| Endpoint | Cross-cutting owner |
|----------|---------------------|
| `/health` | HealthModule |
| `/ready` | DB ping |
| `/metrics` | prom-client histograms/counters |

## MVP vs Future

| Concern | MVP | Future |
|---------|-----|--------|
| Request tracing | requestId log field | OpenTelemetry |
| Rate limiting | Login only | Gateway WAF |
| Feature flags | Env booleans | Dedicated service |

## Trade-offs

| Decision | Why |
|----------|-----|
| Global JWT guard | Safer default deny |
| Envelopes | Consistent FE error handling |
| Sync audit in TX | Stronger consistency than fire-and-forget |

## Recommendations

- Centralize error codes in `common/errors/codes.ts` shared with FE types.
- Add integration tests for guard + filter combinations on one happy and one forbidden path per module.

## References

- [NESTJS_ARCHITECTURE.md](./NESTJS_ARCHITECTURE.md)
- [../10-api/ERRORS_PAGINATION_FILTERING.md](../10-api/ERRORS_PAGINATION_FILTERING.md)
- [../11-security/AUTH_RBAC.md](../11-security/AUTH_RBAC.md)
- [../11-security/AUDIT_LOGGING.md](../11-security/AUDIT_LOGGING.md)
