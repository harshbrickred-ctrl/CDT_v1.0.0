# Packages & Shared Libraries — CDT

## Purpose

Define what lives in shared packages versus apps, and the rules for cross-boundary imports.

## Audience

All engineers.

## Scope

MVP shared libraries. Optional `@cdt/ui` is out of MVP unless ShadCN primitives need extraction.

## Definitions

| Term | Definition |
|------|------------|
| Shared type | Contract used by API and Web |
| Shared util | Pure function safe on both sides (no Nest/React imports) |

---

## 1. Package catalog

| Package | Contents | Consumers |
|---------|----------|-----------|
| `@cdt/shared-types` | Roles, enums, Zod DTOs, public ID brands, API response shapes | api, web |
| `@cdt/shared-utils` | Inclusive leave days, leave overlap, attendance %, month key, normalize client name | api, web (display), tests |
| `@cdt/eslint-config` | Lint rules | all packages |
| `@cdt/typescript-config` | `base.json`, `nestjs.json`, `react.json` | all packages |
| `@cdt/api` | NestJS application | runtime |
| `@cdt/web` | React SPA | runtime |

---

## 2. `@cdt/shared-types` (planned)

```text
packages/shared-types/src/
  roles.ts                 # ADMIN | DELIVERY_MANAGER | HR | INTERNAL_MANAGER
  enums/
    employment-status.ts   # ACTIVE | RELEASED | ON_LEAVE | BACKUP_BENCH
    leave-status.ts        # PENDING | APPROVED | REJECTED
    leave-type.ts
    engagement-health.ts   # ON_TRACK | AT_RISK | ESCALATED
    client-feedback.ts     # GOOD | AVERAGE | POOR
    work-location.ts       # ONSITE | REMOTE | HYBRID
  dto/
    auth.ts
    candidate.ts
    leave.ts
    timesheet.ts
    delivery-review.ts
    dashboard.ts
  index.ts
```

**Rules**

- Prefer Zod schemas as source of truth; infer TypeScript types.
- Do not import Prisma client types into shared-types (keeps web free of Prisma).
- Version DTOs with additive changes; breaking changes need ADR + migration note.

---

## 3. `@cdt/shared-utils` (planned)

| Helper | Behavior |
|--------|----------|
| `inclusiveCalendarDays(from, to)` | `(to - from) + 1` |
| `leaveOverlapsPeriod(leave, period)` | Inclusive date overlap |
| `sumApprovedLeaveDays(leaves, period)` | Only `APPROVED` |
| `attendancePct(daysWorked, workingDays)` | `daysWorked / workingDays`; blank/null if workingDays ≤ 0 |
| `formatAttendancePct(n)` | One decimal display (e.g. `91.3`) |
| `calendarMonthKey(date)` | `YYYY-MM` for TS↔DR match |
| `normalizeClientName(name)` | Trim + collapse internal spaces; casefold for uniqueness |

**Rules**

- Pure functions only; no `process.env`, no Nest DI, no React hooks.
- Unit-test every calculation used by BR-04..BR-08.
- API may re-export or wrap; Web may use for client-side preview only — **server remains authoritative**.

---

## 4. Import boundaries

```text
web ──► shared-types, shared-utils
api ──► shared-types, shared-utils, prisma
web ✗── api source
api ✗── web source
shared-* ✗── apps/*
```

Violations fail lint (eslint `no-restricted-imports`) and PR review.

---

## 5. Versioning of shared packages

- Workspace protocol: `"@cdt/shared-types": "workspace:*"`
- No independent npm publish in MVP.
- Breaking shared change: bump internal note in PR + update both apps in same PR.

---

## 6. Testing ownership

| Package | Test focus |
|---------|------------|
| shared-utils | Leave overlap, attendance, month key, client normalize |
| shared-types | Zod parse reject invalid payloads |
| api | Module services + integration |
| web | Component / Playwright later |

---

## References

- [MONOREPO_STRUCTURE.md](./MONOREPO_STRUCTURE.md)
- [ENV_AND_VERSIONING.md](./ENV_AND_VERSIONING.md)
- [../15-testing/TEST_STRUCTURE_AND_COVERAGE.md](../15-testing/TEST_STRUCTURE_AND_COVERAGE.md)
