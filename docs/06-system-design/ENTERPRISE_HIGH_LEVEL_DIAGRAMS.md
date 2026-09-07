# Enterprise High-Level Diagrams — CDT

## Purpose

Clean enterprise diagram pack for architecture reviews, stakeholder decks, and design sign-off.

## Audience

Architects, tech leads, security, DevOps, senior stakeholders.

## Scope

MVP runtime topology and logical enterprise views. Cloud target architecture lives in `19-cloud` (Future).

## Definitions

| Term | Definition |
|------|------------|
| HLA | High-level architecture view |
| SoR | System of record |
| Control plane | Auth, RBAC, audit, config, observability |
| Data plane | Domain CRUD and calculations |

---

## Fig 1 — Context (enterprise)

```mermaid
C4Context
  title CDT System Context (MVP)
  Person(dm, "Delivery Manager", "Owns engagement health")
  Person(hr, "HR", "Candidate & leave ops")
  Person(admin, "Admin", "Users & masters")
  Person(im, "Internal Manager", "Oversight read")
  System(cdt, "CDT", "Post-placement delivery control")
  System_Ext(sst, "SST", "Upstream Joined candidates — Future sync")
  System_Ext(bill, "Billing Tracker", "Downstream presence — Future")
  System_Ext(smtp, "SMTP", "Optional mail")

  Rel(dm, cdt, "Uses")
  Rel(hr, cdt, "Uses")
  Rel(admin, cdt, "Uses")
  Rel(im, cdt, "Uses")
  Rel_Back(cdt, sst, "Import Joined", "Future")
  Rel(cdt, bill, "Export attendance", "Future")
  Rel(cdt, smtp, "Notify", "Optional")
```

## Fig 2 — Container HLA (main)

```mermaid
flowchart TB
  subgraph Users
    U[Authenticated users<br/>ADMIN · DM · HR · IM]
  end

  subgraph Edge
    SPA["apps/web<br/>React · Vite · ShadCN · TanStack Query"]
  end

  subgraph Platform["apps/api — Modular monolith"]
    CTRL[Controllers / OpenAPI]
    APP[Application services]
    DOM[Domain services + BR]
    PRISMA[Prisma repositories]
    XCUT[JWT · RBAC · Validation · Audit · Pino]
  end

  DB[("PostgreSQL SoR")]
  OBS["Prometheus · Grafana · Loki"]

  U --> SPA
  SPA -->|"HTTPS /api/v1 + Bearer"| CTRL
  CTRL --> APP
  APP --> DOM
  DOM --> PRISMA
  PRISMA --> DB
  XCUT -.-> CTRL
  XCUT -.-> APP
  OBS -.->|"/metrics · logs"| Platform
```

## Fig 3 — Domain capability map

```mermaid
mindmap
  root((CDT MVP))
    Identity
      Auth JWT+Refresh
      Users RBAC
      AuditLog
    Master
      Clients
      Lookups
      Candidates CD-
    Operations
      Leave LV-
      Timesheets TSH-
      DeliveryReviews DEL-
    Insights
      Dashboard
      Utilization
      Attendance %
```

## Fig 4 — Control vs data plane

```mermaid
flowchart LR
  subgraph ControlPlane
    A[AuthN]
    Z[AuthZ RBAC]
    V[Validation]
    L[Audit + Logs]
    H[Health / Metrics]
  end

  subgraph DataPlane
    C[Candidates]
    LV[Leave]
    TS[Timesheets]
    DR[Delivery Reviews]
    DA[Dashboard reads]
  end

  ControlPlane --> DataPlane
```

## Fig 5 — Deployment (local MVP)

```mermaid
flowchart TB
  subgraph Host["Developer / VM host"]
    WEB["web:5173"]
    API["api:3000"]
    PG["postgres:5432"]
    PROM["prometheus"]
    GRAF["grafana"]
    LOKI["loki"]
  end

  WEB --> API
  API --> PG
  PROM --> API
  GRAF --> PROM
  API --> LOKI
```

## Fig 6 — Security trust boundaries

```mermaid
flowchart TB
  subgraph BrowserTB["Trust boundary: Browser"]
    SPA[SPA]
    TOK[Access token in memory]
  end

  subgraph APITB["Trust boundary: API"]
    G[JWT Guard + Roles]
    S[Services]
  end

  subgraph DATATB["Trust boundary: Data"]
    DB[(Postgres)]
    HASH[Password hashes · refresh hashes]
  end

  SPA --> G
  TOK -.-> SPA
  G --> S
  S --> DB
  HASH --- DB
```

## MVP vs Future overlays

| Figure aspect | MVP | Future |
|------------|-----|--------|
| Containers | web + api + postgres | + Redis, object storage, workers |
| External systems | SMTP optional | SST sync, Billing, IdP SSO |
| Observability | Prom/Grafana/Loki local | Managed APM + centralized SIEM |
| Scale-out | Single API | N API replicas behind LB |

## Trade-offs

| View | Intentionally omits |
|------|---------------------|
| Fig 2 | Package-level folder trees (see monorepo docs) |
| Fig 5 | Production TLS termination / WAF |
| C4Context | Internal module edges (see C4 Container/Component) |

## Recommendations

- Use **Fig 2** as the default HLA slide in design reviews.
- Pair with [C4_MODEL.md](./C4_MODEL.md) when reviewers ask for formal C4 levels.
- Keep Future edges dashed until integration ADRs exist.

## References

- [HIGH_LEVEL_ARCHITECTURE.md](./HIGH_LEVEL_ARCHITECTURE.md)
- [C4_MODEL.md](./C4_MODEL.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [../11-security/AUTH_RBAC.md](../11-security/AUTH_RBAC.md)
