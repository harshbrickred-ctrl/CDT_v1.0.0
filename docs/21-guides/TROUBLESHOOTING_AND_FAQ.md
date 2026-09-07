# Troubleshooting & FAQ — CDT

## Purpose

Solve common user and operator problems quickly.

## Audience

Users, admins, L1/L2 support.

## Scope

MVP behaviors. If a fix needs code change, file a defect with catalog case id.

---

## FAQ

### Why is Leave Days zero when I already entered leave?

Only **Approved** leave counts. Pending and Rejected are excluded by design.

### Why is Attendance % blank?

Working Days is zero or empty. Enter a positive Working Days value.

### Why is utilization blank on a delivery review?

No timesheet exists for that candidate in the same calendar month. Create/approve the timesheet first.

### Why can’t I save At Risk / Escalated?

Escalation Notes are required. Poor + At Risk also requires notes.

### Why was my second July timesheet rejected?

Only one timesheet per candidate per calendar month is allowed.

### Why was my second July review rejected?

Only one delivery review per candidate per calendar month is allowed.

### Why did Active headcount drop?

A candidate was **Released**. History is still on their profile; they no longer count as Active.

### Why can’t I create a client named like an existing one?

Duplicate names (including spacing/case variants) are blocked to keep dashboard filters clean.

### Why didn’t On Leave Today change when I changed Month?

It intentionally uses **today’s date**, not the Month filter.

### Will I get email when leave is pending?

Not in MVP. Notifications are Future. Use Dashboard pending tiles and approval queues.

### How do I get access?

Ask an ADMIN to create your user with the correct role.

---

## Troubleshooting tree

| Symptom | Check |
|---------|-------|
| Cannot login | Caps lock; deactivated user; correct env URL |
| 403 on action | Wrong role; see permission matrix |
| Candidate missing from picker | Status not Active; wrong client filter |
| Wrong Leave Days | Leave status; date overlap with period |
| Wrong 91.3% expectation | Confirm 21/23 inputs; rounding to 1 decimal |
| Import failed | Dry-run errors; duplicate clients; missing FKs |
| Dashboard empty | Filters too narrow; no seeded data |
| Postgres port clash with SST | CDT Compose maps host **5434**; SST uses **5433** |

---

## Escalate when

- Attendance math wrong after confirming inputs (S1)  
- Duplicate month rows allowed (S1)  
- Auth bypass suspected (S1)  
- Data missing after release (S1)

Include: user role, public IDs, screenshots, approximate time, environment.

---

## References

- [USER_MANUAL.md](./USER_MANUAL.md)
- [ADMIN_GUIDE.md](./ADMIN_GUIDE.md)
- [../20-maintenance/SUPPORT_DR_INCIDENT.md](../20-maintenance/SUPPORT_DR_INCIDENT.md)
- [../11-security/PERMISSION_MATRIX.md](../11-security/PERMISSION_MATRIX.md)
