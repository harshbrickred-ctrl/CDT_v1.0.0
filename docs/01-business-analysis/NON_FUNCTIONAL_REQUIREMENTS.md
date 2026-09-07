# Non-Functional Requirements — CDT MVP

## Purpose

Define quality attributes for design and acceptance of CDT.

## Audience

Architects, engineers, QA, Ops.

## Scope

MVP runtime (local/Docker). Cloud NFRs deferred to future cloud docs.

## Definitions

| Term | Definition |
|------|------------|
| p95 | 95th percentile latency |
| RTO/RPO | Recovery time/point objectives |
| PII | Personally identifiable information (names, manager contacts) |

---

## Categories

### Performance

| ID | Requirement | Target | Label |
|----|-------------|--------|-------|
| NFR-PERF-01 | List endpoints (page size 50) p95 | < 300 ms local | MVP |
| NFR-PERF-02 | Dashboard aggregate p95 | < 500 ms with indexes | MVP |
| NFR-PERF-03 | SPA initial interactive (local) | < 3 s on mid hardware | MVP |
| NFR-PERF-04 | Leave-days recalculation on timesheet read/create | < 100 ms for typical overlap set | MVP |

### Scalability

| ID | Requirement | Target | Label |
|----|-------------|--------|-------|
| NFR-SCALE-01 | Concurrent internal users | 50 concurrent MVP | MVP |
| NFR-SCALE-02 | Data volume without redesign | 20k candidates, 200k leave, 100k timesheets/reviews | MVP |
| NFR-SCALE-03 | Stateless API containers | Horizontal scale ready | MVP |

### Availability

| ID | Requirement | Target | Label |
|----|-------------|--------|-------|
| NFR-AVL-01 | Local Compose healthchecks | api/web/db healthy | MVP |
| NFR-AVL-02 | Process crash restart | Compose `restart: unless-stopped` | MVP |

### Security

| ID | Requirement | Target | Label |
|----|-------------|--------|-------|
| NFR-SEC-01 | All mutable APIs authenticated | 100% | MVP |
| NFR-SEC-02 | RBAC enforced server-side for all roles | 100% | MVP |
| NFR-SEC-03 | TLS for non-local production | Required later | Future |
| NFR-SEC-04 | Secrets not in git | `.env` + CI secrets | MVP |
| NFR-SEC-05 | PII minimization in logs | Mask phones/emails if stored | MVP |
| NFR-SEC-06 | Audit logs tamper-evident (append-only application policy) | No user delete of audit | MVP |

### Reliability

| ID | Requirement | Target | Label |
|----|-------------|--------|-------|
| NFR-REL-01 | Derived Attendance / Leave Days consistent with BR formulas | Golden tests vs Excel examples | MVP |
| NFR-REL-02 | Unique constraints prevent duplicate month rows | DB-enforced | MVP |
| NFR-REL-03 | Soft release preserves referential history | No cascade hard-delete of children | MVP |

### Usability

| ID | Requirement | Target | Label |
|----|-------------|--------|-------|
| NFR-UX-01 | Dense table-first ops UI with health as first-class visual language | Design system compliance | MVP |
| NFR-UX-02 | Explicit empty/missing states (e.g. Timesheet missing) | No silent blanks for DR utilization | MVP |
| NFR-UX-03 | Accessible color is not sole health signal | Text labels + tokens | MVP |
| NFR-UX-04 | Visual identity distinct from SST (slate + amber, Fraunces/DM Sans) | Design system | MVP |

### Maintainability

| ID | Requirement | Target | Label |
|----|-------------|--------|-------|
| NFR-MAINT-01 | Modular NestJS feature modules aligned to domain | Catalogued modules | MVP |
| NFR-MAINT-02 | Shared Zod/DTO types across API boundary | packages/shared | MVP |
| NFR-MAINT-03 | ADRs for material architecture choices | docs/14-standards/adr | MVP |

### Observability

| ID | Requirement | Target | Label |
|----|-------------|--------|-------|
| NFR-OBS-01 | Structured API logs (Pino) with request id | Always-on local | MVP |
| NFR-OBS-02 | Prometheus `/metrics` | Compose stack | MVP |
| NFR-OBS-03 | Error tracking hooks documented | Local-friendly | MVP |

### Compliance / data

| ID | Requirement | Target | Label |
|----|-------------|--------|-------|
| NFR-DATA-01 | Treat candidate and manager contact fields as confidential | Access via RBAC | MVP |
| NFR-DATA-02 | Retention policy documented | Default 24 months TBD confirm | MVP |
| NFR-DATA-03 | Backup/restore runbook for Postgres | Local volume + dump | MVP |

### Localization / time

| ID | Requirement | Target | Label |
|----|-------------|--------|-------|
| NFR-I18N-01 | UI English | MVP | MVP |
| NFR-I18N-02 | Business dates as date-only in IST-primary ops | Documented TZ | MVP |

## Trade-offs

| Choice | Pros | Cons |
|--------|------|------|
| Local-first NFRs | Matches Phase 1 | Cloud SLOs deferred |
| Strict uniqueness at DB | Data integrity | Migration must reconcile Excel dupes |

## References

- [FUNCTIONAL_REQUIREMENTS.md](./FUNCTIONAL_REQUIREMENTS.md)  
- [../00-initiation/PROJECT_CHARTER.md](../00-initiation/PROJECT_CHARTER.md)  
- [../05-ux/DESIGN_SYSTEM.md](../05-ux/DESIGN_SYSTEM.md)  
- [../02-srs/SRS.md](../02-srs/SRS.md)  
