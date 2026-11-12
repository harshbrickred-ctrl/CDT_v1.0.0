# Seed & Migration — CDT

## Purpose

Describe Prisma migration discipline and seed contents for local/UAT/bootstrap.

## Audience

Developers, admins performing controlled bootstrap.

## Scope

Shipped schema. Hosted re-seed of demo portfolio is intentional only when operators run full `seed.ts`.

## Definitions

| Term | Definition |
|------|------------|
| Migration | Prisma SQL under `apps/api/prisma/migrations` |
| Full seed | `prisma/seed.ts` — foundation + demo portfolio |
| Prod seed | `prisma/seed-prod.ts` — users + lookups only |

---

## 1. Migration rules

1. Create migrations via `prisma migrate dev` locally.  
2. Never edit applied migrations; add a new one.  
3. CI / VPS / Render: `prisma migrate deploy`.  
4. Review migrations in PR with schema diff.

---

## 2. Seed contents

| Entity | Behavior |
|--------|----------|
| Organization | `brickred` tenant |
| Admin | `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` |
| Demo users | `dm@brickred.local` (`DELIVERY_OWNER`), `am@brickred.local` (`ACCOUNT_OWNER`) via `SEED_DEMO_PASSWORD` (falls back to admin password) |
| Lookups | Leave types, statuses, feedback, health, work locations, cost centers, release reasons |
| Full seed clients | Acme, Globex, Initech, Umbrella, Stark, Wayne (+ inactive Cobalt) |
| Full seed employees | Billable / non-billable / bench with leaves, TS, reviews, invoices, bench feedback |

**Fail loud** if admin seed env vars missing.

Hosted API start (`start:render`): migrate deploy → **seed-prod** → serve. Demo portfolio requires an explicit full seed against `DATABASE_URL`.

Clean business data (keep logins/lookups): `pnpm db:clean`.

---

## 3. Commands

```bash
pnpm --filter @cdt/api prisma:generate
pnpm --filter @cdt/api exec prisma migrate dev --name <name>
pnpm --filter @cdt/api exec prisma migrate deploy
pnpm --filter @cdt/api prisma:seed
pnpm db:clean
```

---

## 4. Environments

| Env | migrate | seed |
|-----|---------|------|
| Local | `migrate dev` | full seed OK |
| CI | `migrate deploy` | foundation as needed |
| Hosted (Render) | `migrate deploy` on boot | seed-prod on boot |
| VPS | `migrate deploy` | foundation or full per ops policy |

---

## References

- [LOCAL_SETUP.md](./LOCAL_SETUP.md)
- [DEPLOY_VPS.md](./DEPLOY_VPS.md)
- [../21-guides/ADMIN_GUIDE.md](../21-guides/ADMIN_GUIDE.md)
