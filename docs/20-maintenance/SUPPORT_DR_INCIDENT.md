# Support, DR & Incident — CDT

## Purpose

Operational support model, disaster recovery expectations, and incident handling for CDT V1.

## Audience

Support, ops, engineering on-call, Delivery leads.

## Scope

MVP single-host. Notifications product feature is Future; this doc covers **ops** alerting only.

## Definitions

| Term | Definition |
|------|------------|
| RPO | Recovery Point Objective |
| RTO | Recovery Time Objective |
| Sev1 | System down / data loss risk |

---

## 1. Support tiers

| Tier | Examples | Response |
|------|----------|----------|
| L1 | Password reset request routed to Admin; how-to | User manuals; Admin guide |
| L2 | Wrong Leave Days suspicion; import errors | Engineering + QA catalog cases |
| L3 | DB corruption; security incident | On-call + leadership |

Roles: ADMIN handles user provisioning; engineering handles defects.

---

## 2. DR targets (V1 suggested)

| Metric | Target |
|--------|--------|
| RPO | ≤ 24h (daily backup); improve to ≤ 1h if WAL archiving enabled |
| RTO | ≤ 4h restore to last backup on standby host |

### Backup

- Nightly `pg_dump` (or snapshot) to offline storage  
- Weekly restore test on non-prod  
- Retain per policy (e.g. 30 days)

### Restore drill

1. Provision empty Postgres  
2. Restore dump  
3. Point API at restored DB  
4. Verify login + sample candidate 360  
5. Record results  

---

## 3. Incident process

1. **Detect** — alert or user report  
2. **Triage** — Sev1–Sev4  
3. **Mitigate** — rollback / restore / feature flag import off  
4. **Communicate** — Delivery/HR stakeholders  
5. **Resolve** — fix forward  
6. **Postmortem** — blameless; update runbooks/tests  

### Sev guide

| Sev | Example |
|-----|---------|
| 1 | API/DB down; backup failed before cutover |
| 2 | Attendance calc wrong in prod |
| 3 | Single client filter UI bug |
| 4 | Cosmetic |

---

## 4. Common incidents

| Symptom | First checks |
|---------|--------------|
| Nobody can login | API health, DB, JWT secrets, clock skew |
| Leave Days wrong | Approved-only rule; overlap; shared-utils version |
| DR utilization blank | Matching month TS missing |
| Duplicate month TS allowed | Unique index missing / old build |
| Dashboard Active wrong | Released still Active; cache |

---

## 5. Contacts (fill at deploy)

| Role | Contact |
|------|---------|
| On-call eng | ________ |
| Product | ________ |
| Delivery sponsor | ________ |

---

## References

- [../18-monitoring/METRICS_AND_ALERTS.md](../18-monitoring/METRICS_AND_ALERTS.md)
- [../16-cicd/RELEASE_AND_ROLLBACK.md](../16-cicd/RELEASE_AND_ROLLBACK.md)
- [../21-guides/TROUBLESHOOTING_AND_FAQ.md](../21-guides/TROUBLESHOOTING_AND_FAQ.md)
