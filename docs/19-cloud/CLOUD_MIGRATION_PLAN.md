# Cloud Migration Plan — CDT (Future)

## Purpose

Outline how CDT can move from single-host V1 Compose to a cloud-hosted architecture without rewriting the modular monolith prematurely.

## Audience

Architects, platform, engineering lead.

## Scope

**Future.** MVP ships Docker-first / on-prem style. This plan is architectural guidance only.

## Definitions

| Term | Definition |
|------|------------|
| Lift | Move containers as-is |
| Improve | Managed DB, secrets, CDN |

---

## 1. Target shape (indicative)

```text
Internet → CDN (Web static) → Load balancer → Nest API (containers)
                                              ↓
                                         Managed PostgreSQL
                                              ↓
                                      Logs/Metrics (cloud native)
```

SSO and multi-region are later phases.

---

## 2. Phased approach

| Phase | Work |
|-------|------|
| P0 V1 | Compose on VM; proven backups |
| P1 | Managed Postgres; object storage for import files |
| P2 | Container orchestrator (ECS/AKS/GKE/Nomad) |
| P3 | Secrets manager; private metrics; WAF |
| P4 | SSO; optional read replicas for dashboard |

---

## 3. Non-negotiables when migrating

- Same BR calc via `@cdt/shared-utils`  
- Migration expand/contract discipline  
- Audit retention requirements preserved  
- No silent change to Attendance % or uniqueness  

---

## 4. Risks

| Risk | Mitigation |
|------|------------|
| Latency to DB | Same-region placement |
| Secret sprawl | Central secrets; rotate JWT |
| Split-brain with Excel | Excel already retired before cloud move |

---

## 5. Explicitly deferred with cloud

- Live SST sync adapters  
- Billing tracker integration  
- Push notification fleet  

Each needs its own ADR when pulled into scope.

---

## References

- [../14-standards/adr/0002-modular-monolith.md](../14-standards/adr/0002-modular-monolith.md)
- [../17-local-deployment/DEPLOY_V1.md](../17-local-deployment/DEPLOY_V1.md)
- [../06-system-design/DEPLOYMENT.md](../06-system-design/DEPLOYMENT.md)
