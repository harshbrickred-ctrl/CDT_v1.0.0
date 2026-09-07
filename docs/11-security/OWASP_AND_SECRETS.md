# OWASP & Secrets — CDT

## Purpose

Map CDT MVP controls to OWASP ASVS-inspired practices and define secrets handling.

## Audience

Security reviewers, backend/DevOps, tech leads.

## Scope

MVP web app + API + Postgres. Full ASVS certification is out of scope; this is an engineering checklist.

## Definitions

| Term | Definition |
|------|------------|
| Secret | Credential or key that grants access (DB URL, JWT secrets, SMTP) |
| PII | Personal data in candidates/users (name, email, mobile) |
| ASVS | OWASP Application Security Verification Standard |

---

## 1. OWASP Top 10 alignment (MVP)

| Risk | CDT control |
|------|-------------|
| A01 Broken Access Control | JWT + RolesGuard + service BR; deny by default |
| A02 Cryptographic Failures | TLS in non-local; hashed passwords; hashed refresh; no plaintext secrets in logs |
| A03 Injection | Prisma parameterized queries; allow-listed sort/filter |
| A04 Insecure Design | BR enforced server-side (leave approval, escalation notes, unique periods) |
| A05 Security Misconfiguration | Validated env boot; Helmet; CORS allowlist; Swagger locked in prod-like |
| A06 Vulnerable Components | pnpm audit in CI; pin versions |
| A07 Auth Failures | Rate-limit login; refresh rotation; disable inactive users |
| A08 Software/Data Integrity | Migrations reviewed; no unsigned remote plugins |
| A09 Logging/Monitoring Failures | Pino + requestId; audit log for mutations; `/metrics` |
| A10 SSRF | No user-controlled outbound URL fetch in MVP |

## 2. Input & output

| Area | Practice |
|------|----------|
| Validation | DTO whitelist; forbid unknown props |
| Output encoding | React default escaping; avoid `dangerouslySetInnerHTML` |
| File upload | Not in MVP |
| Mass assignment | Explicit DTO fields only |

## 3. Secrets management

### What is a secret

| Secret | Used by |
|--------|---------|
| `DATABASE_URL` | API |
| `JWT_ACCESS_SECRET` | API |
| `JWT_REFRESH_SECRET` | API |
| SMTP credentials | API optional |
| Grafana admin password | Compose optional |

### Rules

```mermaid
flowchart TB
  Dev[.env local gitignored] --> API
  CI[CI secrets store] --> Deploy
  Future[Vault / cloud SM] --> Prod
```

| Do | Don't |
|----|-------|
| Gitignore `.env*` except `.env.example` | Commit real secrets |
| Use different JWT secrets per environment | Reuse prod secrets in dev |
| Rotate after leak | Log Authorization headers |
| Seed demo passwords only locally | Ship default admin/admin to shared envs |

### `.env.example` (illustrative names only)

```text
DATABASE_URL=postgresql://cdt:cdt@localhost:5432/cdt
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
```

## 4. PII & data protection

| Data | Handling |
|------|----------|
| Candidate contact | RBAC limited; audit mutations |
| Passwords | Hash only |
| Audit JSON | Redact password hashes/tokens |
| Backups | Restrict access; encrypt at rest when cloud |

## 5. Security headers & browser

| Control | MVP |
|---------|-----|
| CORS | Explicit origin |
| Helmet | Enable in Nest |
| Cookies | `HttpOnly`, `Secure` (non-local), `SameSite=Lax` or `Strict` |
| CSP | Baseline Future hardening |

## 6. Dependency & supply chain

- Lockfile committed (`pnpm-lock.yaml`)
- CI: `pnpm audit --prod` (gate on high/critical policy)
- Avoid installing unknown CLI tools in Docker build as root when possible

## MVP vs Future

| Topic | MVP | Future |
|-------|-----|--------|
| TLS | Local http OK | Mandatory TLS |
| WAF / Attack Mode | No | Platform WAF |
| Secrets manager | Files/CI | Vault/cloud SM |
| Pen test | Informal | Scheduled |

## Trade-offs

| Decision | Why |
|----------|-----|
| Checklist over full ASVS evidence pack | Phase A docs; proportional effort |
| Prisma over raw SQL | Reduces injection class bugs |
| Coarse roles | Simpler correct AuthZ vs complex ABAC bugs |

## Recommendations

- Add a short security test pack: forbidden role → 403 for approve leave, upsert review, read audit.
- Rotate JWT secrets requires all users re-login; document maintenance window.

## References

- [AUTH_RBAC.md](./AUTH_RBAC.md)
- [AUDIT_LOGGING.md](./AUDIT_LOGGING.md)
- [../07-database/MIGRATION_AND_BACKUP.md](../07-database/MIGRATION_AND_BACKUP.md)
- OWASP ASVS / Top 10 (external)
