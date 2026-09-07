# Environment Variables & Versioning — CDT

## Purpose

Standardize environment configuration, secret handling, and application versioning for local, CI, and V1 deploy.

## Audience

Developers, DevOps, security reviewers.

## Scope

MVP Docker-first / on-prem style deploy. Cloud-specific secrets managers are covered at a high level in `19-cloud`.

## Definitions

| Term | Definition |
|------|------------|
| Build version | Semver or `YYYY.MM.DD+sha` stamped into API/Web |
| Runtime env | Process environment consumed by Nest / Vite |

---

## 1. `.env.example` (root) — planned keys

```bash
# Node
NODE_ENV=development

# Database
DATABASE_URL=postgresql://cdt:cdt@localhost:5434/cdt?schema=public

# Auth
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# API
API_PORT=3000
API_PREFIX=api/v1
CORS_ORIGIN=http://localhost:5173

# Seed
SEED_ADMIN_EMAIL=admin@sst.local
SEED_ADMIN_PASSWORD=Admin@123

# Optional SMTP (Future notifications still may use later)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Observability
LOG_LEVEL=info
METRICS_ENABLED=true

# Web (Vite) — only VITE_* exposed to browser
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

**Rules**

- Never commit real `.env`.
- Seed admin is **not** hardcoded in source; missing seed vars fail seed loudly.
- `VITE_*` must never contain secrets.

---

## 2. Per-package env usage

| Package | Reads |
|---------|-------|
| `@cdt/api` | `DATABASE_URL`, JWT_*, `API_*`, `CORS_ORIGIN`, seed, SMTP, LOG/METRICS |
| `@cdt/web` | `VITE_API_BASE_URL` only |
| shared packages | none |

---

## 3. Environment matrix

| Variable | Local | CI | V1 deploy |
|----------|-------|----|-----------|
| `DATABASE_URL` | Compose | service container | secret store / compose |
| JWT secrets | `.env` | CI secrets | secret store |
| `CORS_ORIGIN` | localhost:5173 | preview URL | production origin |
| `SEED_*` | required once | test DB only | disabled or one-time bootstrap |
| SMTP | optional | mock/off | optional (notifications Future) |

---

## 4. Versioning strategy

| Artifact | Scheme |
|----------|--------|
| Git tags | `v1.0.0`, `v1.0.1`, … |
| API response header | `X-CDT-Version: 1.0.0` |
| Web build banner | `import.meta.env.VITE_APP_VERSION` injected in CI |
| Prisma migrations | timestamped; never rewrite applied migrations |

### Semver guidance

| Change | Bump |
|--------|------|
| Bugfix, no API contract change | PATCH |
| Additive endpoint/field | MINOR |
| Breaking API / auth / calc formula change | MAJOR + ADR |

Attendance formula and uniqueness rules are **business contracts**. Changing them is MAJOR even if TypeScript types still compile.

---

## 5. Release version checklist

1. Update CHANGELOG (when introduced).
2. Tag release.
3. CI builds with `VITE_APP_VERSION` / `APP_VERSION`.
4. Deploy API then Web (or same compose stack).
5. Verify `/health` reports version.

---

## 6. Config vs secrets

| Config (ok in compose) | Secret (never in git) |
|------------------------|------------------------|
| Ports, log level, API prefix | JWT secrets, DB password, SMTP password |
| Feature flags (future) | Seed passwords in shared environments |

---

## References

- [MONOREPO_STRUCTURE.md](./MONOREPO_STRUCTURE.md)
- [../17-local-deployment/LOCAL_SETUP.md](../17-local-deployment/LOCAL_SETUP.md)
- [../16-cicd/RELEASE_AND_ROLLBACK.md](../16-cicd/RELEASE_AND_ROLLBACK.md)
- [../11-security/OWASP_AND_SECRETS.md](../11-security/OWASP_AND_SECRETS.md)
