# CDT v1 smoke execution (dev)

Date: 2026-08-27

## Automated smoke (API)

| Check | Result |
|-------|--------|
| GET /health | Pass |
| Admin login | Pass |
| Create client | Pass |
| Create candidate CD-00001 | Pass |
| Leave create Pending (2 days) | Pass |
| Leave approve (Admin) | Pass |
| Timesheet July 23/21 → attendance **91.3**, leaveDays **2** | Pass |
| Delivery review utilization **91.3** | Pass |
| Dashboard summary | Pass |
| DM leave approve → **403** | Pass |

## Build

| Package | Result |
|---------|--------|
| @cdt/shared-utils tests | 11/11 Pass |
| @cdt/api build | Pass |
| @cdt/web build | Pass |

## Remaining manual UAT

Run full UI catalog in `docs/15-testing/v1-catalog/12-ui-uat.md` against `pnpm dev` (web :5173 + api :3000) before production cutover.
