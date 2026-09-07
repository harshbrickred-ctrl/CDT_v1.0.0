# Wireframes — CDT MVP

## Purpose

Low-fidelity structural wireframes for MVP screens. Visual tokens live in [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

## Audience

UX, frontend, stakeholders.

## Scope

MVP primary screens. Not pixel-perfect mockups.

## Definitions

| Term | Definition |
|------|------------|
| W-* | Wireframe ID |
| Density | Compact table rows for ops |

---

## Common shell

```text
┌──────────────────────────────────────────────────────────┐
│ CDT wordmark (Fraunces)     [User ▾] [Theme]             │
├────────────┬─────────────────────────────────────────────┤
│ Dashboard  │  Page title                    [Primary CTA]│
│ Candidates │  Filters…                                   │
│ Leave      │  ┌────────────────────────────────────────┐ │
│ Timesheets │  │ Content (table / KPIs / form)          │ │
│ Reviews    │  │                                        │ │
│ Approvals  │  └────────────────────────────────────────┘ │
│ Clients    │                                             │
│ Settings   │                                             │
└────────────┴─────────────────────────────────────────────┘
```

Subtle slate gradient/grid background; amber accent on primary CTA and focus rings.

---

## W-1 — Dashboard

```text
Filters: [Client ▾] [Health ▾] [Month 📅]  [Reset]

┌ Active ┐ ┌ On Leave Today ┐ ┌ Pending Leave ┐ ┌ Pending TS ┐
│  42    │ │       3        │ │      5        │ │     8      │
└────────┘ └────────────────┘ └───────────────┘ └────────────┘

┌ Avg Util % ┐ ┌ Released (mo) ┐ ┌ Good Feedback ┐ ┌ Missing ┐
│   91.3     │ │       2       │ │      17       │ │  TS 2   │
└────────────┘ └───────────────┘ └───────────────┘ └─────────┘

[ Health distribution chart ]   [ Top-5 clients chart ]
```

**Notes:** On Leave Today label clarifies “ignores month filter”. Health segments use health tokens (not SST teal).

## W-2 — Candidates list

```text
[Search] [Client] [Status] [Manager]          [+ New Candidate]

| Public ID | Name | Client | Role | Status | Start | Health |
|-----------|------|--------|------|--------|-------|--------|
| CD-00012  | …    | Acme   | …    | Active | …     | ● At Risk |
```

Health column = latest review badge.

## W-3 — Candidate Detail

```text
CD-00012  Jane Doe                    Status: Active    [Release]
Client: Acme · Role: Engineer · IM: Indra · Start: 2026-04-01

[Overview] [Leave] [Timesheets] [Reviews]

Overview: placement fields (read/edit)
Latest health banner (full width, not a floating sticker)
```

## W-4 — Leave list / form

**List:** filters status/date; Approve actions for HR.

**Drawer/Modal create:**

```text
Candidate * [select]
Type *      [Casual ▾]
From * To * → Days: 3 (read-only)
Remarks
[Save Pending]
```

## W-5 — Timesheets

```text
Create:
Candidate * | Period Start/End * | Working Days * | Days Worked *
Leave Days (auto) | Attendance % (auto)
Approval badge

Duplicate month error:
"A timesheet already exists for CD-00012 / 2026-07 (TSH-00044)"
```

## W-6 — Delivery Reviews

```text
Utilization: 91.3%   or   ⚠ Timesheet missing for Jul 2026  [Create timesheet]

Client Feedback [Good/Average/Poor]
Engagement Health [On Track / At Risk / Escalated]  ← prominent control
Escalation Notes [required when At Risk/Escalated]
Reviewer / Date
```

## W-7 — Approvals

```text
Tabs: [Leave pending (5)] [Timesheets pending (8)]

Row → Approve | Reject → remarks dialog
```

## W-8 — Clients

```text
| Name | Normalized | Active | Candidates |
Add Client dialog with duplicate error callout
```

## W-9 — Settings

Users table · Lookups by category · Import uploader + report · Audit log explorer.

## W-10 — Login

Centered card on slate atmosphere; Fraunces “CDT” wordmark hero-level in viewport; DM Sans form; amber submit.

---

## Interaction notes

- Tables: sort, pagination, column filters where listed.  
- Destructive/release: confirm dialog.  
- No hero marketing cards; ops density first.  
- Health never color-only — include text label.

## Trade-offs

| Choice | Pros | Cons |
|--------|------|------|
| Drawer forms | Fast ops | Complex validation UX on small screens |
| Health on candidate list | Portfolio scanning | Extra query join |

## References

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)  
- [USER_FLOWS.md](./USER_FLOWS.md)  
- [INFORMATION_ARCHITECTURE.md](./INFORMATION_ARCHITECTURE.md)  
