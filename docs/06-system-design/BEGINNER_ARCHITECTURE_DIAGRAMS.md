# Beginner Architecture Diagrams — CDT

## Purpose

Talk-track Mermaid diagrams for onboarding sessions and walkthroughs.

## Audience

New engineers, mentors running architecture intros, product partners.

## Scope

MVP diagrams only. Future systems drawn as dashed optional boxes.

## Definitions

| Term | Definition |
|------|------------|
| Talk-track | Diagram meant to be narrated live, not a formal C4 substitute |
| Domain chain | Candidate → Leave/Timesheet → Delivery Review → Dashboard |

---

## 1. Big picture (2 minutes)

```mermaid
flowchart TB
  subgraph People
    ADM[Admin]
    DM[Delivery Manager]
    HR[HR]
    IM[Internal Manager]
  end

  SPA[CDT Web App]
  API[CDT API]
  DB[(PostgreSQL)]

  ADM --> SPA
  DM --> SPA
  HR --> SPA
  IM --> SPA
  SPA --> API
  API --> DB
```

**Say:** Four roles, one SPA, one API, one database.

## 2. Domain chain (5 minutes)

```mermaid
flowchart LR
  C[Candidate CD-]
  L[Leave LV-]
  T[Timesheet TSH-]
  R[Delivery Review DEL-]
  D[Dashboard]

  C --> L
  C --> T
  L -.->|"approved only"| T
  T --> R
  R --> D
  C --> D
```

**Say:** Leave feeds timesheet attendance; timesheet + judgment become review; dashboard reads all.

## 3. Leave approval gate

```mermaid
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> PENDING: submit
  PENDING --> APPROVED: approve
  PENDING --> REJECTED: reject
  APPROVED --> [*]
  REJECTED --> [*]
  DRAFT --> CANCELLED: cancel
  PENDING --> CANCELLED: cancel
```

**Say:** Only APPROVED leave reduces available working presence for the month.

## 4. Monthly uniqueness

```mermaid
flowchart TB
  Cand[Candidate CD-00042]
  M[Month 2026-08]

  Cand --> M
  M --> TSH[Exactly one TSH-]
  M --> DEL[Exactly one DEL-]
  M --> LVs[Many LV- rows OK]
```

**Say:** Many leave rows; at most one timesheet and one review per candidate-month.

## 5. Soft release

```mermaid
flowchart LR
  Active[ACTIVE on client]
  Released[RELEASED soft]
  Hist[History + audit kept]

  Active -->|"release action"| Released
  Released --> Hist
```

**Say:** Released candidates disappear from “active bench” views but stay queryable for history.

## 6. Request path through the API

```mermaid
sequenceDiagram
  participant UI as Browser
  participant G as Guards
  participant C as Controller
  participant S as Service
  participant DB as Postgres

  UI->>G: Bearer JWT
  G->>C: role OK
  C->>S: DTO validated
  S->>DB: Prisma write/read
  S->>S: Audit log
  S-->>UI: JSON envelope
```

## 7. Future neighbors (optional slide)

```mermaid
flowchart LR
  SST[SST Joined]
  CDT[CDT]
  BILL[Billing Tracker]

  SST -.->|"Future sync"| CDT
  CDT -.->|"Future export"| BILL
```

## MVP vs Future

| Diagram topic | MVP | Future |
|---------------|-----|--------|
| People → SPA → API → DB | Yes | Same + SSO IdP |
| Domain chain | Yes | Multi-engagement edges |
| SST / Billing boxes | Shown dashed | Solid integrations |

## Trade-offs

| Diagram choice | Why |
|----------------|-----|
| Few boxes first | Avoid cognitive overload in onboarding |
| State diagram for leave | Approval is the hardest BR for juniors |
| Sequence for JWT path | Clarifies “UI is not trusted” |

## Recommendations

Use this pack for day-1; graduate to [C4_MODEL.md](./C4_MODEL.md) and [ENTERPRISE_HIGH_LEVEL_DIAGRAMS.md](./ENTERPRISE_HIGH_LEVEL_DIAGRAMS.md) for design reviews.

## References

- [BEGINNER_HIGH_LEVEL_ARCHITECTURE.md](./BEGINNER_HIGH_LEVEL_ARCHITECTURE.md)
- [SEQUENCE_DIAGRAMS.md](./SEQUENCE_DIAGRAMS.md)
- [C4_MODEL.md](./C4_MODEL.md)
