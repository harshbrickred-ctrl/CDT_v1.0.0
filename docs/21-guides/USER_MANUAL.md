# User Manual — CDT

## Purpose

Day-to-day instructions for Delivery Managers, HR, and Internal Managers using Client Delivery & Resource Tracker.

## Audience

End users (non-admin).

## Scope

MVP screens: Dashboard, Candidates, Leave, Timesheets, Delivery Reviews. Notifications are not sent automatically.

## Definitions

| Term | Meaning |
|------|---------|
| Active | Currently deployed; counts in headcount |
| Released | Rolled off; history kept |
| Attendance % | Days Worked ÷ Working Days |
| Engagement Health | Your judgment: On Track / At Risk / Escalated |

---

## 1. Sign in

Open CDT → enter email/password from your admin → Dashboard.

If locked out, contact an ADMIN (not engineering first).

---

## 2. Dashboard

**Filters:** Client, Engagement Health, Month.

**KPIs:** Active Candidates, Pending Leave Approvals, Pending Timesheet Approvals, Avg Utilization, health breakdown, Good feedback, Released in month.

**On Leave Today:** who is on Approved leave **today**. Changing the Month filter does **not** change this tile.

---

## 3. Candidates

### Add deployed person

Candidates → New → client, project/account, role, managers, start date, work location → Status Active → Save.

System assigns `CD-#####`.

### Release

Open candidate → Release → set Contract End Date → confirm.

Person drops from Active headcount; Leave/Timesheet/Reviews remain for history.

---

## 4. Leave

1. Leave → New → select candidate (name/client fill in).  
2. Choose type; From / To (days auto = inclusive calendar days).  
3. Save as Pending.  
4. HR (or authorized role) Approves or Rejects.

**Important:** Only **Approved** leave counts toward Timesheet Leave Days. Pending and Rejected do not.

---

## 5. Timesheets

1. Timesheets → New → candidate + period.  
2. Enter Working Days and Days Worked.  
3. Leave Days calculate from Approved overlapping leave.  
4. Attendance % calculates automatically (example: 21 ÷ 23 = **91.3%**).  
5. Submit; HR approves as required.

**One timesheet per candidate per calendar month.** A second July entry is blocked.

---

## 6. Delivery Reviews

1. Delivery Reviews → New → candidate + any date in the review month.  
2. Utilization pulls from that month’s timesheet (blank if none).  
3. Set Client Feedback and Engagement Health.  
4. If health is **At Risk** or **Escalated**, Escalation Notes are required (including Poor + At Risk).  
5. Save.

**One review per candidate per calendar month.**

Health is your judgment — the system does not auto-set it from utilization.

---

## 7. Search & 360

Use search for public IDs (`CD-`, `LV-`, `TSH-`, `DEL-`) or names.

Candidate detail shows placement plus related leave, timesheets, and reviews.

---

## 8. Role quick guide

| Role | Typical actions |
|------|-----------------|
| DELIVERY_MANAGER | Candidates, reviews, dashboard |
| HR | Leave/timesheet approvals |
| INTERNAL_MANAGER | Visibility / escalation context; dashboard |
| ADMIN | Users, masters, import (see Admin Guide) |

---

## References

- [ADMIN_GUIDE.md](./ADMIN_GUIDE.md)
- [TROUBLESHOOTING_AND_FAQ.md](./TROUBLESHOOTING_AND_FAQ.md)
- [../15-testing/v1-catalog/12-ui-uat.md](../15-testing/v1-catalog/12-ui-uat.md)
