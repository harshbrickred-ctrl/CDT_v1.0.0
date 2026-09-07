# 08 — Authorization Matrix

## Purpose

Prove role permissions for ADMIN, DELIVERY_MANAGER, and ACCOUNT_MANAGER on critical operations.

## Matrix (expected)

| Operation | ADMIN | DELIVERY_MANAGER | ACCOUNT_MANAGER |
|-----------|:-----:|:----------------:|:---------------:|
| Manage users | ✓ | ✗ | ✗ |
| Manage clients / lookups | ✓ | ✗ | ✗ |
| Create/update Active candidate | ✓ | ✓ | ✗ |
| Release candidate | ✓ | ✓ | ✗ |
| Create leave | ✓ | ✓ | ✗ |
| Approve/reject leave | ✓ | ✗ | ✓ |
| Create timesheet | ✓ | ✓ | ✗ |
| Approve/reject timesheet | ✓ | ✗ | ✓ |
| Create/update delivery review | ✓ | ✓ | ✗ |
| Generate invoice | ✓ | ✓ | ✓ |
| Approve/reject invoice | ✓ | ✗ | ✓ |
| View dashboard | ✓ | ✓ | ✓ |
| View audit | ✓ | ✗ | ✗ |
| Run import | ✓ | ✗ | ✗ |

## Cases

### TC-AZ-001 — Unauthenticated mutate → 401

| Field | Value |
|-------|-------|
| FR/BR | FR-AUTH-01 |
| Steps | POST candidate without token |
| Expected | 401 |
| Sev | S1 |

### TC-AZ-010 — ACCOUNT_MANAGER cannot manage users

| Field | Value |
|-------|-------|
| Role | ACCOUNT_MANAGER |
| Steps | POST /users |
| Expected | 403 |
| Sev | S1 |

### TC-AZ-025 — DELIVERY_MANAGER cannot approve leave

| Field | Value |
|-------|-------|
| Role | DELIVERY_MANAGER |
| Steps | POST /leaves/:id/approve |
| Expected | 403 |
| Sev | S1 |

### TC-AZ-026 — ACCOUNT_MANAGER can approve leave

| Field | Value |
|-------|-------|
| Role | ACCOUNT_MANAGER |
| Steps | POST /leaves/:id/approve on Pending leave |
| Expected | 200 / Approved |
| Sev | S1 |

### TC-AZ-030 — ACCOUNT_MANAGER cannot create delivery review

| Field | Value |
|-------|-------|
| Role | ACCOUNT_MANAGER |
| Steps | POST delivery-review |
| Expected | 403 |
| Sev | S1 |

### TC-AZ-040 — DELIVERY_MANAGER can create DR

| Field | Value |
|-------|-------|
| Role | DELIVERY_MANAGER |
| Steps | POST delivery-review with valid payload |
| Expected | 201 |
| Sev | S2 |

### TC-AZ-050 — DELIVERY_MANAGER cannot import Excel

| Field | Value |
|-------|-------|
| Role | DELIVERY_MANAGER |
| Steps | POST import |
| Expected | 403 |
| Sev | S2 |

### TC-AZ-055 — DELIVERY_MANAGER can generate invoice

| Field | Value |
|-------|-------|
| Role | DELIVERY_MANAGER |
| Steps | POST /invoices/generate with approved timesheet |
| Expected | 201 |
| Sev | S2 |

### TC-AZ-056 — DELIVERY_MANAGER cannot approve invoice

| Field | Value |
|-------|-------|
| Role | DELIVERY_MANAGER |
| Steps | POST /invoices/:id/approve |
| Expected | 403 |
| Sev | S2 |

### TC-AZ-070 — UI nav hides forbidden modules

| Field | Value |
|-------|-------|
| Role | ACCOUNT_MANAGER |
| Steps | Inspect nav |
| Expected | Approvals + Invoices visible; no Users/Import |
| Sev | S3 |

---

## References

- [../../11-security/PERMISSION_MATRIX.md](../../11-security/PERMISSION_MATRIX.md)
- [02-auth-users.md](./02-auth-users.md)
