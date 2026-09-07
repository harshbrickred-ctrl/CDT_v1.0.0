# Testing Strategy — CDT

## Purpose

Define test pyramid and quality gates for CDT.

## Audience

QA, engineering.

## Scope

MVP. Catalog in `v1-catalog/`.

## Definitions

See [../README.md](../README.md).

---

## Pyramid

| Layer | Focus |
|-------|-------|
| Unit | Attendance, leave days, overlap, normalization |
| Integration | Nest modules + Prisma test DB |
| API | Authz matrix, uniqueness 409s |
| UI UAT | Source §25 scenarios |

## Gates

CI: lint, typecheck, unit, API tests. UI UAT manual or Playwright later.

## References

- [TEST_STRUCTURE_AND_COVERAGE.md](./TEST_STRUCTURE_AND_COVERAGE.md)  
- [v1-catalog/README.md](./v1-catalog/README.md)  
