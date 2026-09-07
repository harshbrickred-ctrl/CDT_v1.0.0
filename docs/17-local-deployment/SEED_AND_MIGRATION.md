# Seed & Migration — CDT

## Purpose

Describe Prisma migration discipline and seed contents for local/UAT/bootstrap.

## Audience

Developers, admins performing controlled bootstrap.

## Scope

MVP. Production re-seed is forbidden except documented one-time bootstrap.

## Definitions

| Term | Definition |
|------|------------|
| Migration | Prisma SQL revision under `apps/api/prisma/migrations` |
| Seed | `prisma/seed.ts` idempotent-ish bootstrap |

---

## 1. Migration rules

1. Create migrations via `prisma migrate dev` locally.  
2. Never edit applied migrations; add a new one.  
3. Expand/contract for breaking column changes.  
4. Uniqueness indexes required for:
   - normalized client name  
   - timesheet `(candidateId, calendarMonth)`  
   - delivery review `(candidateId, calendarMonth)`  
5. Review migrations in PR with schema diff.

---

## 2. Seed contents (MVP)

| Entity | Seed behavior |
|--------|---------------|
| Roles | Enum in schema; no table rows if enum-based |
| Admin user | From `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` |
| Sample users | DELIVERY_MANAGER, HR, INTERNAL_MANAGER (dev/UAT) |
| Lookups | Leave types, statuses, feedback, health, work locations |
| Clients | Acme Corp, Globex (dev/UAT) |
| July fixtures | Optional `seed:july` — Jordan Lee pack for UAT |

**Fail loud** if admin seed env vars missing.

---

## 3. Commands

```bash
pnpm --filter @cdt/api prisma:generate
pnpm --filter @cdt/api exec prisma migrate dev --name <name>
pnpm --filter @cdt/api exec prisma migrate deploy   # CI/UAT/prod
pnpm --filter @cdt/api prisma:seed
pnpm --filter @cdt/api seed:july-fixtures           # planned optional
```

---

## 4. Excel migration (cutover)

1. Export sheets from legacy workbook (Candidates, Leave, Timesheet, Delivery, Setup).  
2. Map columns to import templates.  
3. Dry-run import (TC-IMP-001).  
4. Fix duplicates / date issues.  
5. Commit import.  
6. Recompute Leave Days / Attendance server-side; do not trust spreadsheet-derived attendance blindly.  
7. Spot-check July example and Active headcount vs Excel.  
8. Freeze Excel writes.

Details for operators: [../21-guides/ADMIN_GUIDE.md](../21-guides/ADMIN_GUIDE.md).

---

## 5. Environments

| Env | migrate | seed |
|-----|---------|------|
| Local | `migrate dev` | yes |
| CI | `migrate deploy` on ephemeral DB | optional |
| UAT | `migrate deploy` | yes once + july fixtures |
| Prod V1 | `migrate deploy` | one-time admin only |

---

## References

- [LOCAL_SETUP.md](./LOCAL_SETUP.md)
- [../15-testing/v1-catalog/00-test-data.md](../15-testing/v1-catalog/00-test-data.md)
- [../07-database/MIGRATION_AND_BACKUP.md](../07-database/MIGRATION_AND_BACKUP.md)
