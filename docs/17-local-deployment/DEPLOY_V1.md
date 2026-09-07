# Deploy V1 — CDT

## Purpose

Runbook for first production-like (V1) deployment of Client Delivery & Resource Tracker on a single host or internal VM using Docker Compose.

## Audience

Ops, engineering lead.

## Scope

On-prem / single-node V1. Cloud migration is [../19-cloud/CLOUD_MIGRATION_PLAN.md](../19-cloud/CLOUD_MIGRATION_PLAN.md).

## Definitions

| Term | Definition |
|------|------------|
| V1 host | Server running Compose stack + backups |
| Cutover | Moment CDT becomes SoR vs Excel |

---

## 1. Architecture on the host

```text
[Users Browser]
      │
      ▼
[Reverse proxy / TLS] ──► web (static) ──► api:3000 ──► postgres
                              │
                              └── /metrics (internal only)
```

---

## 2. Preconditions

- [ ] DNS / URL agreed  
- [ ] TLS certificates  
- [ ] Secrets provisioned (JWT, DB password)  
- [ ] Backup storage path  
- [ ] UAT sign-off for build to deploy  
- [ ] Excel archive plan ready  

---

## 3. Deploy steps

1. Copy release artifacts / `git checkout vX.Y.Z`  
2. Place `.env` (never commit)  
3. `docker compose up -d postgres` → wait healthy  
4. `prisma migrate deploy`  
5. One-time admin bootstrap if empty DB  
6. Start `api` then `web`  
7. Configure reverse proxy to Web; proxy `/api` to API  
8. Smoke: health, login, create test candidate in non-prod first  
9. Import Excel (dry-run → commit) on cutover window  
10. Disable Excel write access  

---

## 4. Post-deploy verification

| Check | Expected |
|-------|----------|
| `GET /health` | ok + version |
| Login all 4 roles | success |
| July spot-check | 91.3% / utilization |
| Duplicate client | rejected |
| Backup job | succeeds |

---

## 5. Cutover communication

Announce: URL, support contact, Excel read-only location, known limitations (no notifications in MVP).

---

## 6. Rollback

Follow [../16-cicd/RELEASE_AND_ROLLBACK.md](../16-cicd/RELEASE_AND_ROLLBACK.md). Keep pre-cutover DB dump until parallel-run ends.

---

## References

- [DOCKER_COMPOSE.md](./DOCKER_COMPOSE.md)
- [SEED_AND_MIGRATION.md](./SEED_AND_MIGRATION.md)
- [../15-testing/v1-catalog/11-signoff.md](../15-testing/v1-catalog/11-signoff.md)
- [../20-maintenance/SUPPORT_DR_INCIDENT.md](../20-maintenance/SUPPORT_DR_INCIDENT.md)
