# User Manual — CDT

## Purpose

Day-to-day instructions for Delivery Owners and Account Owners using Client Delivery & Resource Tracker.

## Audience

End users (non-admin). Admins also use [ADMIN_GUIDE.md](./ADMIN_GUIDE.md).

## Scope

Shipped screens: Dashboard, Employees, Leave, Timesheets, Delivery Reviews, Approvals, Invoices, Clients. Notifications are not automatic.

## Definitions

| Term | Meaning |
|------|---------|
| Employee | Person tracked in CDT (billable, non-billable, or bench) |
| Active / Released | Currently engaged vs rolled off (history kept) |
| Attendance % | Days Worked ÷ Working Days |
| Engagement Health | On Track / At Risk / Escalated |
| Cost center | BrickRed or Agyom filter in the header |

### Roles

| Role | You typically… |
|------|----------------|
| Delivery Owner | Maintain employees, enter timesheets, write delivery reviews, generate invoices |
| Account Owner | Approve leave/timesheets, review invoices, watch Approvals |

For a fuller non-technical walkthrough, see [CDT_BUSINESS_FEATURE_GUIDE.md](./CDT_BUSINESS_FEATURE_GUIDE.md).

---

## 1. Sign in

Open CDT → enter email/password from your admin → Dashboard.

Use the **cost center** control when you want BrickRed-only or Agyom-only numbers.

---

## 2. Dashboard

**Filters:** Delivery Owner, Account Owner, Client, Health, Month, plus shell cost center.

**KPIs** include headcount, bench, engagement health, missing/pending timesheets, leave today, invoicing amounts, and feedback.

**On Leave Today** uses **today’s date** and ignores the Month filter.

---

## 3. Employees

### Categories

| Tab | Who |
|-----|-----|
| Billable | Placed at a client (billing + reviews + timesheets) |
| Non-billable | Internal SUPPORT / LEADERSHIP / DELIVERY |
| Bench | Between placements; interviews + manager feedback |

### Add billable employee

Employees → New → category Billable → client, role, dates, billing → Save (`CD-#####`).

### Bench

Set bench start, **interviews scheduled**, **interviews cleared** (cleared cannot exceed scheduled). On the detail page, add **Delivery Manager Feedback** and **Account Manager Feedback** entries.

### Release

Open employee → Release → contract end / reason → confirm. They leave Active headcount; history remains.

---

## 4. Leave

1. Leave → New → employee, type, dates, reason → Save (Pending).  
2. Account Owner (or Admin) Approves or Rejects on **Approvals** or the leave row.

**Only Approved** leave counts in timesheet leave days.

---

## 5. Timesheets

1. Timesheets → New → billable employee + month.  
2. Enter working days / days worked (leave days from Approved leave).  
3. Attendance % calculates automatically.  
4. Submit Pending → Account Owner approves.

**One timesheet per employee per calendar month.** Approving may create a draft invoice.

---

## 6. Delivery reviews

Delivery Reviews → upsert for billable employee + month → utilization, client feedback, engagement health. Escalated requires notes.

---

## 7. Approvals (Account Owner)

Approvals → Leave tab / Timesheet tab → Approve or Reject with reason when needed.

---

## 8. Invoices

Invoices list statuses: Pending review → Approved → Sent → Paid (or Rejected).

- Delivery Owner can **generate** from approved timesheets.  
- Account Owner drives approve / send / paid / reject.

---

## 9. Clients

Maintain client name, code, cost center, and owner assignments so Delivery/Account Owners see the right portfolio.

---

## References

- [CDT_BUSINESS_FEATURE_GUIDE.md](./CDT_BUSINESS_FEATURE_GUIDE.md)
- [../11-security/PERMISSION_MATRIX.md](../11-security/PERMISSION_MATRIX.md)
