# Admin Guide — CDT

## Purpose

Day-to-day administration for CDT: users, lookups, import, audit, and environment hygiene.

## Audience

Users with role `ADMIN`.

## Scope

Shipped Settings screens and seed/clean operations. Notifications are not sent automatically.

---

## 1. Sign in

1. Open the CDT URL (local `http://localhost:5173` or your Vercel/VPS host).  
2. Sign in with the seeded admin (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, e.g. `admin@sst.local`).  
3. You land on **Dashboard**. Use the cost-center filter (All / BrickRed / Agyom) as needed.

---

## 2. Users

**Settings → Users**

| Task | How |
|------|-----|
| Create user | New → email, full name, role (`ADMIN`, `DELIVERY_OWNER`, `ACCOUNT_OWNER`), password → Save |
| Disable | Edit → set inactive (login blocked) |
| Least privilege | Prefer Delivery/Account Owner for daily work; keep few Admins |

Demo accounts (seed): `dm@brickred.local` (Delivery Owner), `am@brickred.local` (Account Owner).

---

## 3. Lookups

**Settings → Lookups**

Maintain dropdown codes (leave types, release reasons, work locations, cost centers, etc.). Prefer activating/deactivating over deleting codes that already appear on historical rows.

---

## 4. Clients

**Clients**

- Create clients with unique name, optional code, cost center.  
- Assign **Delivery Owners** and **Account Owners** so scoped users see the right portfolio.

---

## 5. Import

**Settings → Import**

1. Choose clients or employees.  
2. Paste JSON or CSV.  
3. **Dry-run** → fix errors → **Commit**.  

Employees require `category`: `BILLABLE`, `NON_BILLABLE`, or `BENCH` with category-specific columns (see import template notes on the page).

---

## 6. Audit

**Settings → Audit**

Read-only trail of create/update/import-style actions. Use when investigating “who changed what.”

---

## 7. Data hygiene (ops)

| Command | Effect |
|---------|--------|
| `pnpm db:seed` | Full demo portfolio (local/dev) |
| `pnpm db:clean` | Wipe business data; keep users/lookups |
| Hosted start | `seed-prod` = foundation users/lookups only |

Never commit real `.env` secrets. Rotate JWT secrets after any leak.

---

## References

- [USER_MANUAL.md](./USER_MANUAL.md)
- [CDT_BUSINESS_FEATURE_GUIDE.md](./CDT_BUSINESS_FEATURE_GUIDE.md)
- [../11-security/AUTH_RBAC.md](../11-security/AUTH_RBAC.md)
