# Metrics & Alerts — CDT

## Purpose

List actionable alerts for V1 operations without noisy pages.

## Audience

Ops, on-call engineer.

## Scope

MVP single-host. Notification channels: email/Teams as available. In-app user notifications remain Future product scope.

## Definitions

| Term | Definition |
|------|------------|
| Page | Wake on-call |
| Ticket | Create next-business-day item |

---

## 1. Alert catalog

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| APIDown | `/health` fail 2m | Page | Check container/host; rollback if needed |
| DBDown | Postgres health fail | Page | Restart volume host; restore if corrupt |
| High5xx | 5xx rate > 5% 5m | Page | Check logs; recent deploy |
| HighLatency | p95 > 2s 10m | Ticket | Investigate slow queries |
| DiskLow | < 15% free | Page | Expand disk; purge old backups carefully |
| BackupFailed | job non-zero | Page | Rerun backup; do not deploy further |
| MigrateFail | deploy migrate error | Page | Stop release; restore plan |

---

## 2. Business watches (non-paging)

| Watch | Meaning |
|-------|---------|
| Pending leave backlog growth | HR capacity |
| Overdue delivery reviews count | Delivery manager follow-up (list in app; no push MVP) |
| Import error rate | Admin data quality |

---

## 3. Silence & maintenance

During planned cutover, silence High5xx briefly; keep APIDown/DBDown active.

---

## 4. Runbook link

Incidents: [../20-maintenance/SUPPORT_DR_INCIDENT.md](../20-maintenance/SUPPORT_DR_INCIDENT.md).

---

## References

- [OBSERVABILITY.md](./OBSERVABILITY.md)
- [../16-cicd/RELEASE_AND_ROLLBACK.md](../16-cicd/RELEASE_AND_ROLLBACK.md)
