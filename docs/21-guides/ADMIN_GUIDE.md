# Admin Guide — CDT

## Purpose

Operator guide for ADMIN users: users, clients, lookups, import, audit, and cutover tasks.

## Audience

Application administrators.

## Scope

MVP. Push notifications are not available.

## Definitions

| Term | Definition |
|------|------------|
| SoR | System of record (CDT after cutover) |
| Dry-run | Import validation without commit |

---

## 1. First login

1. Open the CDT URL.  
2. Sign in with the bootstrap admin credentials issued by engineering.  
3. Change password if policy requires (when feature exists) / rotate seed password after first deploy.  
4. Create named admin backup account before day-to-day use.

---

## 2. Manage users

| Task | Steps |
|------|-------|
| Create user | Users → New → email, name, role (`ADMIN`, `DELIVERY_MANAGER`, `HR`, `INTERNAL_MANAGER`) → save |
| Deactivate | Users → select → Deactivate (blocks login) |
| Reset access | Coordinate password reset per org policy |

**Least privilege:** prefer DELIVERY_MANAGER / HR over ADMIN for daily work.

---

## 3. Clients & lookups

### Clients

- Create clients before candidates.  
- Names are **normalized** (trim/casefold): duplicates are rejected.  
- Prefer fixing spelling once; do not create near-duplicates (`Acme` vs `Acme Corp`) unless truly different legal entities.

### Lookups (Setup Lists)

Maintain: leave types, employment statuses, work locations, client feedback, engagement health, approval statuses.

Deactivating a value hides it from new forms but keeps history readable.

---

## 4. Excel import (migration)

1. Obtain latest workbook export.  
2. Use Admin → Import → select entity pack.  
3. **Dry-run** and download/error list.  
4. Fix duplicates, missing clients, bad dates.  
5. **Commit** when clean.  
6. Spot-check:
   - Active headcount vs Excel  
   - Sample candidate 360  
   - July attendance 91.3% fixture if used  
7. Record import batch id in change log.

Server recalculates Leave Days and Attendance % — do not expect file formulas to win.

---

## 5. Audit

Admin → Audit: filter by actor, entity type, date.

Use after disputed approve/reject or unexpected release.

---

## 6. Overdue delivery reviews

Open the overdue list (Reports/Admin). Contact Delivery Managers manually — MVP has **no** automatic email/push.

---

## 7. Spreadsheet retirement checklist

1. Parallel run complete  
2. Import reconciled  
3. UAT sign-off filed  
4. Excel file moved to read-only archive  
5. Announce CDT URL as SoR  

---

## References

- [USER_MANUAL.md](./USER_MANUAL.md)
- [TROUBLESHOOTING_AND_FAQ.md](./TROUBLESHOOTING_AND_FAQ.md)
- [../15-testing/v1-catalog/11-signoff.md](../15-testing/v1-catalog/11-signoff.md)
- [../17-local-deployment/SEED_AND_MIGRATION.md](../17-local-deployment/SEED_AND_MIGRATION.md)
