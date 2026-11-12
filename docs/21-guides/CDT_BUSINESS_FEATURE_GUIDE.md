# CDT — Business Feature Guide

**Who this is for:** Delivery leads, account leads, operations, and other non-technical stakeholders who need a clear picture of what Client Delivery & Resource Tracker (CDT) does and how to use it.

**Product in one sentence:** CDT is the shared web system that replaces the delivery Excel workbook—tracking people after placement, leave, timesheets, engagement health, and invoicing with clear roles and an audit trail.

---

## Table of contents

1. [Roles at a glance](#1-roles-at-a-glance)
2. [Common concepts](#2-common-concepts)
3. [Feature catalog](#3-feature-catalog)
4. [Full happy paths by role](#4-full-happy-paths-by-role)
5. [What CDT does not do yet](#5-what-cdt-does-not-do-yet)

---

## 1. Roles at a glance

| Role (system name) | Everyday title | Main job in CDT |
|--------------------|----------------|-----------------|
| **ADMIN** | System admin | Users, dropdowns (lookups), import, audit, full access |
| **DELIVERY_OWNER** | Delivery Manager / Delivery Owner | Maintain employees & clients, enter timesheets, write delivery reviews, generate invoices |
| **ACCOUNT_OWNER** | Account Manager / Account Owner | Approve leave & timesheets, move invoices through review, watch the Approvals inbox |

You only see screens and buttons your role allows. If something is missing, ask an Admin—not engineering first.

**Demo logins (typical seed):**

| Email | Role |
|-------|------|
| `admin@sst.local` | Admin |
| `dm@brickred.local` | Delivery Owner |
| `am@brickred.local` | Account Owner |

Passwords come from your environment admin (often `Admin@123` on hosted demo).

---

## 2. Common concepts

| Concept | Plain meaning |
|---------|----------------|
| **Employee** | Any person tracked in CDT (UI word). IDs look like `CD-00001`. |
| **Billable** | Placed at a client; can have timesheets, reviews, invoices. |
| **Non-billable** | Internal roles (HR, Finance, Leadership, Delivery staff, etc.). |
| **Bench** | Between client placements; track interviews and manager feedback. |
| **Active / Released** | Currently engaged vs rolled off (history is kept). |
| **Cost center** | Filter **BrickRed** or **Agyom** in the header so KPIs and lists match that unit. |
| **Approved leave only** | Pending or rejected leave does **not** reduce timesheet days. |
| **Public IDs** | Human-friendly codes: `CD-` employee, `LV-` leave, `TSH-` timesheet, `DEL-` review, `INV-` invoice. |

---

## 3. Feature catalog

### 3.1 Sign-in

**Purpose:** Secure access with your company account.

**How to use:** Open the CDT URL → enter email and password → **Sign in**. Contact Admin if locked out.

---

### 3.2 Cost center filter & search

**Purpose:** Focus the whole app on BrickRed, Agyom, or everything; quickly find people or clients.

**How to use:** Use the header **Cost Center** dropdown and the search box. Filters carry into Dashboard and list screens.

---

### 3.3 Dashboard

**Purpose:** One place for portfolio health—headcount, bench, engagement risk, leave today, timesheet gaps, and billing amounts.

**How to use:**

1. Open **Dashboard**.  
2. Optionally set Delivery Owner, Account Owner, Client, Health, Month.  
3. Click KPI cards when you want the underlying detail list.  

**Note:** **On Leave Today** always means *today*, even if Month is set to something else.

---

### 3.4 Employees

**Purpose:** Single source of truth for every person CDT tracks.

**Tabs / categories**

| Category | Purpose | Typical fields |
|----------|---------|----------------|
| Billable | Client delivery | Client, role title, billing (hourly/fixed), managers |
| Non-billable | Internal org | Team (Support / Leadership / Delivery), support function (HR, TA, Accounts, …) |
| Bench | Awaiting placement | Bench start date, interviews scheduled, interviews cleared, feedback |

**How to use (create):**

1. **Employees** → **New**.  
2. Choose category.  
3. Fill required fields → Save. System assigns `CD-#####`.

**How to use (bench feedback):**

1. Open a Bench employee.  
2. Review **Interviews scheduled** and **Interviews cleared**.  
3. Under **Delivery Manager Feedback** / **Account Manager Feedback**, add dated notes.

**How to use (release):**

1. Open Active billable employee → **Release**.  
2. Set end date / reason → confirm.  
3. They leave Active counts; past leave/timesheets/reviews remain.

---

### 3.5 Clients

**Purpose:** Master list of client accounts, cost center, and who owns delivery vs account relationships.

**How to use:** **Clients** → create/edit name, code, cost center → assign Delivery Owners and Account Owners so the right people see that client’s employees.

---

### 3.6 Leave

**Purpose:** Record planned absence so presence and timesheets stay accurate.

**Statuses:** Pending → Approved or Rejected.

**How to use:**

1. **Leave** → **New**.  
2. Pick employee, leave type, dates, reason → Save (Pending).  
3. Account Owner approves on **Approvals** (or from the leave list if available).

---

### 3.7 Timesheets

**Purpose:** Capture monthly work delivery and attendance for **billable Active** employees.

**How to use:**

1. **Timesheets** → **New** → employee + month.  
2. Enter working days and days worked (leave days pull from **Approved** leave).  
3. Save as Pending.  
4. Account Owner approves.  

**Rules of thumb:** One timesheet per employee per month. Approving may create a **draft invoice**.

---

### 3.8 Approvals

**Purpose:** Account Owner inbox for pending leave and timesheets.

**How to use:** **Approvals** → Leave or Timesheet tab → Approve or Reject (with reason when rejecting).

---

### 3.9 Delivery reviews

**Purpose:** Monthly human judgment of engagement health and client feedback (billable).

**Health values:** On Track · At Risk · Escalated (escalated needs notes).

**Feedback values:** Good · Average · Poor.

**How to use:** **Delivery Reviews** → select employee + month → enter utilization, feedback, health → Save.

---

### 3.10 Invoices

**Purpose:** Turn approved timesheets into a billing workflow inside CDT.

**Statuses (happy path):** Pending review → Approved → Sent → Paid.  
**Alternate:** Rejected (with reason).

**How to use:**

1. Ensure timesheet is **Approved**.  
2. Generate invoice (Delivery Owner / Admin, or from approval flow).  
3. Account Owner: Approve → Mark Sent → Mark Paid (or Reject).

Amounts follow the employee’s hourly or fixed billing setup.

---

### 3.11 Settings (Admin)

| Screen | Purpose |
|--------|---------|
| Users | Create/disable accounts and assign roles |
| Lookups | Maintain dropdown lists (leave types, etc.) |
| Import | Bulk load clients/employees (dry-run then commit) |
| Audit | See who changed what |

---

## 4. Full happy paths by role

### 4.1 Admin — open the month cleanly

1. Sign in as Admin.  
2. **Settings → Users:** confirm Delivery Owner and Account Owner accounts are active.  
3. **Clients:** ensure cost centers and owners are correct.  
4. **Lookups:** confirm leave types and release reasons exist.  
5. Optional: **Import** new employees via dry-run → commit.  
6. Spot-check **Dashboard** (All cost centers) and **Audit** after a large import.  
7. Hand off to Delivery Owner for day-to-day employee/timesheet work.

---

### 4.2 Delivery Owner — from placement to invoice draft

1. Sign in as Delivery Owner; set cost center if needed.  
2. **Employees → New** (Billable) linked to the right client and billing.  
3. If someone rolls off a client onto bench: switch/create **Bench**, set interviews scheduled/cleared, add Delivery Manager feedback.  
4. Record **Leave** when they will be away.  
5. Enter monthly **Timesheet** when the period closes; leave as Pending.  
6. After Account Owner approves the timesheet, **generate Invoice** if not auto-created.  
7. Write the monthly **Delivery Review** (health + client feedback).  
8. Use **Dashboard** to chase missing timesheets, at-risk engagements, and bench aging.

---

### 4.3 Account Owner — approvals and collections

1. Sign in as Account Owner.  
2. Open **Approvals**.  
3. Clear **Leave** queue (approve genuine requests; reject with reason when needed).  
4. Clear **Timesheet** queue—only approve when days look right.  
5. Open **Invoices**: move Pending review → Approved → Sent → Paid.  
6. Reject invoices that do not match the PO/rate, with a clear reason.  
7. Check **Dashboard** for outstanding/overdue invoices and at-risk clients.  
8. On **Bench** employees you care about commercially, add **Account Manager Feedback**.

---

### 4.4 End-to-end happy path (all roles together)

```text
Admin prepares users & clients
        ↓
Delivery Owner creates Billable employee
        ↓
Delivery Owner files Leave (Pending)
        ↓
Account Owner Approves Leave
        ↓
Delivery Owner submits Timesheet (Pending)
        ↓
Account Owner Approves Timesheet → draft Invoice appears
        ↓
Delivery Owner writes Delivery Review (On Track / …)
        ↓
Account Owner Approves → Sends → Marks Paid on Invoice
        ↓
Everyone reads the same Dashboard
```

---

## 5. What CDT does not do yet

- Automatic emails / Slack notifications  
- Live sync from SST (Service Staffing Tracker)  
- Half-day leave or company holiday calendars  
- Single Sign-On (SSO)  

Those items are planned as Future; day-to-day delivery control above is what is shipped today.

---

## Related documents

| Doc | Audience |
|-----|----------|
| [USER_MANUAL.md](./USER_MANUAL.md) | Shorter daily how-to |
| [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) | Admin settings |
| [../11-security/PERMISSION_MATRIX.md](../11-security/PERMISSION_MATRIX.md) | Exact permissions |
| [../17-local-deployment/DEPLOY_VPS.md](../17-local-deployment/DEPLOY_VPS.md) | Hosting on a VPS |
