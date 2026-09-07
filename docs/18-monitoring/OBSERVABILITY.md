# Observability — CDT

## Purpose

Define logging, metrics, and tracing posture for the CDT modular monolith.

## Audience

Developers, ops.

## Scope

MVP: Pino logs, `/health`, `/metrics`, Compose Prometheus/Grafana/Loki. Distributed tracing is optional/Future.

## Definitions

| Term | Definition |
|------|------------|
| RED | Rate, Errors, Duration |
| Cardinality | Unique label combinations on metrics |

---

## 1. Logging (Pino)

| Field | Include |
|-------|---------|
| `level` | info default; debug local |
| `requestId` | per HTTP request |
| `actorId` | authenticated user id |
| `entityType` / `entityId` | on mutations |
| `publicId` | when available (`CD-…`) |

**Never log:** passwords, JWT, refresh tokens, full authorization headers.

Ship logs to stdout; Loki scrapes Compose logs in obs profile.

---

## 2. Health

`GET /health` → process up + optional DB ping.

`GET /health/ready` (planned) → DB migrate-ready.

---

## 3. Metrics

Prometheus scrape `/metrics` (internal network only).

Suggested metrics:

| Metric | Type | Notes |
|--------|------|-------|
| `http_request_duration_seconds` | histogram | path low-cardinality |
| `http_requests_total` | counter | status code |
| `cdt_leave_pending` | gauge | optional business |
| `cdt_timesheet_pending` | gauge | optional |
| `cdt_active_candidates` | gauge | optional |

Avoid high-cardinality labels (raw public IDs).

---

## 4. Dashboards

Grafana folders:

- API RED  
- Node/process  
- Business KPIs (optional gauges)  

---

## 5. Correlation

Pass `X-Request-Id` from Web → API; echo in responses for support.

---

## References

- [METRICS_AND_ALERTS.md](./METRICS_AND_ALERTS.md)
- [../17-local-deployment/DOCKER_COMPOSE.md](../17-local-deployment/DOCKER_COMPOSE.md)
