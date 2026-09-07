# Monorepo Structure — CDT

## Purpose

Define the Turborepo + pnpm workspace layout for Client Delivery & Resource Tracker so the codebase is scalable from day one.

## Audience

All engineers, platform.

## Scope

Repository structural standard for MVP. Packages may start thin; folder names are fixed.

## Definitions

| Term | Definition |
|------|------------|
| Workspace package | pnpm package under `apps/` or `packages/` |
| Pipeline | Turbo task graph |

---

## 1. Target tree

```text
CDT_v1_monorepo/
├── apps/
│   ├── api/                    # NestJS REST API + Prisma  (@cdt/api)
│   └── web/                    # Vite React SPA            (@cdt/web)
│       # Alternate folder name allowed: DeliveryDashboard
│       # (package name remains @cdt/web)
├── packages/
│   ├── shared-types/           # Zod schemas, DTO types, Role enums  (@cdt/shared-types)
│   ├── shared-utils/           # date/overlap/attendance helpers     (@cdt/shared-utils)
│   ├── eslint-config/          # shared ESLint flat/legacy config
│   └── typescript-config/      # base tsconfig presets
├── docker/
│   ├── docker-compose.yml
│   ├── prometheus/
│   ├── grafana/
│   └── loki/
├── docs/                       # this documentation tree
├── .github/workflows/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── .env.example
```

**Web app naming:** Prefer `apps/web`. If product branding requires `apps/DeliveryDashboard`, keep the npm package name `@cdt/web` and document the folder alias in root README.

---

## 2. pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

---

## 3. turbo.json (sketch)

```json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "lint": {},
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

---

## 4. Package naming

| Package | Name |
|---------|------|
| API | `@cdt/api` |
| Web | `@cdt/web` |
| Shared types | `@cdt/shared-types` |
| Shared utils | `@cdt/shared-utils` |
| ESLint config | `@cdt/eslint-config` |
| TS config | `@cdt/typescript-config` |

---

## 5. Build strategy

1. Build `@cdt/shared-types` and `@cdt/shared-utils` first (emit `dist/`).
2. Run `prisma generate` for `@cdt/api` before Nest compile.
3. Build `@cdt/api` and `@cdt/web` (static assets).
4. Turbo `dependsOn: ["^build"]` enforces the graph.

---

## 6. App responsibilities

| App | Responsibility |
|-----|----------------|
| `@cdt/api` | Auth, RBAC, Candidate, Leave, Timesheet, Delivery Review, Dashboard aggregates, Audit, Import |
| `@cdt/web` | SPA screens: Login, Dashboard, Candidates, Leave, Timesheets, Delivery Reviews, Masters, Users, Audit |

No BFF and no microservices in MVP. Feature modules live inside the Nest modular monolith.

---

## 7. Domain module folders (planned API)

```text
apps/api/src/
  auth/
  users/
  master-data/          # clients, lookups
  candidates/
  leave/
  timesheets/
  delivery-reviews/
  dashboard/
  audit/
  import/
  health/
  common/               # guards, filters, interceptors
```

---

## 8. Local ports (convention)

| Service | Port |
|---------|------|
| Web (Vite) | 5173 |
| API | 3000 |
| Postgres (Compose host map) | 5434 → 5432 (SST uses 5433) |
| Prometheus | 9090 |
| Grafana | 3001 |

---

## References

- [PACKAGES_AND_SHARED_LIBS.md](./PACKAGES_AND_SHARED_LIBS.md)
- [ENV_AND_VERSIONING.md](./ENV_AND_VERSIONING.md)
- [../FLOW.md](../FLOW.md)
- [../14-standards/adr/0002-modular-monolith.md](../14-standards/adr/0002-modular-monolith.md)
