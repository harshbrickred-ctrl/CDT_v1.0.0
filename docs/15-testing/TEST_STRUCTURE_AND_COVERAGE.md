# Test Structure and Coverage — CDT

## Purpose

Describe test layout and coverage expectations.

## Audience

Engineering, QA.

## Scope

MVP planned structure (pre-code).

## Definitions

See [../README.md](../README.md).

---

## Planned layout

```text
apps/api/src/**/*.spec.ts
apps/api/test/           # e2e
apps/web/src/**/*.test.tsx
packages/shared-utils/src/**/*.test.ts
docs/15-testing/v1-catalog/
```

## Coverage targets (MVP exit)

| Area | Target |
|------|--------|
| shared-utils calcs | ≥90% |
| leave/timesheet/review services | critical paths 100% lined in catalog |
| authz matrix | full matrix cases |

## References

- [TESTING_STRATEGY.md](./TESTING_STRATEGY.md)  
