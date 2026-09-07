# Coding Standards — CDT

## Purpose

Establish consistent TypeScript / NestJS / React practices for the CDT monorepo.

## Audience

All engineers; PR reviewers.

## Scope

MVP codebase under `apps/` and `packages/`. Aligns with SST sibling patterns adapted to delivery-control domain.

## Definitions

| Term | Definition |
|------|------------|
| Feature module | Nest module owning one bounded context |
| Public ID | Display ID (`CD-00001`); not the DB primary key |

---

## 1. Language & tooling

| Rule | Standard |
|------|----------|
| Language | TypeScript strict |
| Package manager | pnpm (no npm/yarn lockfiles) |
| Formatter | Prettier |
| Linter | ESLint via `@cdt/eslint-config` |
| Node | LTS version pinned in `.nvmrc` / engines |

---

## 2. General TypeScript

- Prefer `unknown` over `any`; narrow explicitly.
- Export types from `@cdt/shared-types`; do not duplicate DTO interfaces in apps.
- Use branded/public-id string types where helpful; never treat UUID and public ID interchangeably.
- No default exports except where framework requires (e.g. some React lazy boundaries).
- Async functions: always handle rejection; no floating promises (lint rule).

---

## 3. NestJS (`@cdt/api`)

### Structure

- One feature folder per domain: `candidates/`, `leave/`, `timesheets/`, `delivery-reviews/`, `dashboard/`, …
- Pattern: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, `*.repository.ts` (optional).
- Business rules live in services (or domain helpers in `@cdt/shared-utils`), **not** in controllers.

### Controllers

- Thin: validate → call service → map response.
- Use DTOs with class-validator **or** Zod pipes consistently (pick one style per module; prefer Zod shared schemas).
- Versioned prefix: `/api/v1`.

### Services

- Enforce BR-01..BR-12 server-side.
- Attendance %, leave overlap, month matching must call shared-utils (single implementation).
- Transactions for multi-table writes (e.g. release candidate + audit).

### Prisma

- Access Prisma only inside the owning module (or a dedicated repository).
- No cross-module raw Prisma poking into another aggregate without a published service method.
- Migrations are additive; never edit applied SQL.

### AuthZ

- Every mutating route has auth guard + roles/permissions check.
- Do not rely on UI hiding alone.

### Logging

- Pino structured logs; include `requestId`, `actorId`, `entityType`, `entityId` on mutations.
- Never log passwords, tokens, or full PII dumps.

---

## 4. React (`@cdt/web`)

### Structure

```text
src/
  app/           # router, providers
  features/      # candidates, leave, timesheets, delivery-reviews, dashboard, admin
  shared/        # ui primitives, api client, hooks
  pages/         # route entry components (thin)
```

### Patterns

- TanStack Query for server state; no duplicate global Redux for MVP.
- React Hook Form + Zod resolvers aligned to shared schemas.
- Role-based route/nav filtering; still expect API 403.
- Prefer feature folders over type folders (`components/`, `hooks/` at root).

### UI

- Tailwind + ShadCN; reuse tokens from design system docs.
- Accessible labels on all form controls; tables keyboard-navigable.
- Loading / empty / error states for every list view.

---

## 5. Naming

| Kind | Convention |
|------|------------|
| Files | `kebab-case.ts` / `PascalCase.tsx` for components |
| DB tables | `snake_case` plural via Prisma `@@map` |
| Public IDs | `CD-`, `LV-`, `TSH-`, `DEL-` + zero-padded sequence |
| Test IDs | `TC-{SUITE}-{NNN}` |
| Env vars | `SCREAMING_SNAKE` |

---

## 6. Error handling

| Layer | Behavior |
|-------|----------|
| Domain rule violation | 422 with stable `code` (e.g. `TIMESHEET_MONTH_EXISTS`) |
| Auth missing | 401 |
| Forbidden | 403 |
| Not found | 404 |
| Unexpected | 500; log + generic message |

Do not leak stack traces to clients in production.

---

## 7. Comments & docs

- Prefer clear names over narrating comments.
- Document non-obvious business rules with BR-id references.
- Public contracts live in `docs/10-api`; update when endpoints change.

---

## 8. Forbidden in MVP

- Microservices splits inside CDT
- Client-only enforcement of leave/attendance rules
- Hardcoded admin credentials
- Notification spam without ADR (notifications are Future)
- Editing historical Approved leave silently without audit

---

## References

- [GIT_AND_PR.md](./GIT_AND_PR.md)
- [../13-monorepo/PACKAGES_AND_SHARED_LIBS.md](../13-monorepo/PACKAGES_AND_SHARED_LIBS.md)
- [../21-guides/NESTJS_DEVELOPER_HANDBOOK.md](../21-guides/NESTJS_DEVELOPER_HANDBOOK.md)
