# Release & Rollback — CDT

## Purpose

Describe how to cut a V1 release and roll back safely for the modular monolith + SPA.

## Audience

Engineering lead, ops.

## Scope

Docker Compose / single-host V1. Multi-region cloud cutovers are Future.

## Definitions

| Term | Definition |
|------|------------|
| Release | Tagged version of API + Web + applied migrations |
| Rollback | Return to prior running version; migrations may be expand/contract limited |

---

## 1. Release train

1. `main` green on CI  
2. UAT catalog sign-off for the build (or patch delta)  
3. Tag `vX.Y.Z`  
4. Build images / artifacts with version stamp  
5. Backup database  
6. Apply Prisma migrations  
7. Deploy API  
8. Deploy Web  
9. Smoke: `/health`, login, July fixture spot-check  
10. Announce to Delivery / HR  

---

## 2. Pre-release checklist

| Check | Done |
|-------|------|
| CHANGELOG / release notes | ☐ |
| Migrations reviewed (expand/contract) | ☐ |
| Env vars present on target | ☐ |
| Seed **not** re-run on prod accidentally | ☐ |
| Backup verified restorable | ☐ |

---

## 3. Rollback strategies

| Situation | Action |
|-----------|--------|
| Web-only bug | Redeploy previous Web artifact; API unchanged |
| API bug, no migration | Redeploy previous API image |
| Bad migration applied | Restore DB backup + previous API/Web; **do not** casually down-migrate production without plan |
| Data corruption from import | Restore backup; disable import; postmortem |

### Migration rule

Prefer **expand → migrate data → contract** so rollback of app code remains possible without destructive down migrations.

---

## 4. Hotfix

1. Branch `fix/…` from tag or `main`  
2. Patch + regression on failing catalog case  
3. Tag `vX.Y.Z+1`  
4. Fast-track smoke + affected UAT cases  

---

## 5. Communication

| Audience | Message |
|----------|---------|
| Users | Brief downtime window if needed |
| Support | Version, known issues, rollback contact |
| Product | Sign-off linkage |

---

## References

- [GITHUB_ACTIONS.md](./GITHUB_ACTIONS.md)
- [../17-local-deployment/DEPLOY_V1.md](../17-local-deployment/DEPLOY_V1.md)
- [../20-maintenance/SUPPORT_DR_INCIDENT.md](../20-maintenance/SUPPORT_DR_INCIDENT.md)
